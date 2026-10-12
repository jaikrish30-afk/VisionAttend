import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, CameraOff, Square, RefreshCw, Eye, 
  Volume2, VolumeX, Shield, Sparkles, CheckCircle2, 
  AlertTriangle, Upload, Film, FileText, Check, Clock
} from 'lucide-react';
import { AttendanceSession, FrameDetectionBox, AttendanceCandidate, Student } from '../types';
import { processLiveFrame, stopAttendanceSession, uploadSessionEvidence } from '../api';

interface LiveAttendanceProps {
  session: AttendanceSession;
  students: Student[];
  initialMode?: 'CAMERA' | 'UPLOAD';
  onStopSession: (sessionId: number) => void;
  onCancel: () => void;
}

export const LiveAttendance: React.FC<LiveAttendanceProps> = ({
  session,
  students,
  initialMode = 'CAMERA',
  onStopSession,
  onCancel
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [mode, setMode] = useState<'CAMERA' | 'UPLOAD'>(initialMode);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Live recording telemetry
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [boxes, setBoxes] = useState<FrameDetectionBox[]>([]);
  const [candidates, setCandidates] = useState<AttendanceCandidate[]>([]);
  const [facesDetected, setFacesDetected] = useState<number>(0);
  const [recognizedCount, setRecognizedCount] = useState<number>(0);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [unknownCount, setUnknownCount] = useState<number>(0);
  const [presentCandidatesCount, setPresentCandidatesCount] = useState<number>(0);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isStopping, setIsStopping] = useState<boolean>(false);

  // Video Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isSimulatingProcessing, setIsSimulatingProcessing] = useState<boolean>(false);

  // Format Timer HH:MM:SS
  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs > 0 ? `${hrs.toString().padStart(2, '0')}:` : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Sound chime
  const playChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {}
  }, [soundEnabled]);

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }

      // Initialize MediaRecorder for Video Evidence Storage
      recordedChunksRef.current = [];
      try {
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : (MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4');
        const recorder = new MediaRecorder(stream, { mimeType });
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunksRef.current.push(e.data);
        };
        recorder.start(1000); // 1s slice
        mediaRecorderRef.current = recorder;
      } catch (recErr) {
        console.warn("MediaRecorder initialization warning:", recErr);
      }
    } catch (err: any) {
      console.warn("Camera permission denied or camera unavailable:", err);
      setCameraActive(false);
      setCameraError("Camera permission was not granted or camera is not available. Please allow camera access or use the Upload Video mode.");
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Start on Mount if Camera Mode
  useEffect(() => {
    if (mode === 'CAMERA') {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [mode]);

  // Timer Tick
  useEffect(() => {
    const interval = setInterval(() => {
      setDurationSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Frame Capture & Processing Loop
  useEffect(() => {
    if (!cameraActive) return;

    const frameInterval = setInterval(async () => {
      if (isProcessing || isStopping) return;
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frameBase64 = canvas.toDataURL('image/jpeg', 0.85);

      try {
        setIsProcessing(true);
        const res = await processLiveFrame(session.session_id, { image_base64: frameBase64 });
        if (res.success) {
          setBoxes(res.boxes || []);
          setFacesDetected(res.faces_detected || 0);
          setRecognizedCount(res.recognized_count || 0);
          setReviewCount(res.review_count || 0);
          setUnknownCount(res.unknown_count || 0);
          setPresentCandidatesCount(res.present_candidates_count || 0);
          setCandidates(res.candidates || []);

          if (res.recognized_count > 0 && res.recognized_count > recognizedCount) {
            playChime();
          }
        }
      } catch (err) {
        console.error("Frame processing error:", err);
      } finally {
        setIsProcessing(false);
      }
    }, 600); // Sample frame every 600ms

    return () => clearInterval(frameInterval);
  }, [cameraActive, isProcessing, isStopping, session.session_id, recognizedCount, playChime]);

  // Stop Attendance Session Handler
  const handleStopAttendance = async () => {
    setIsStopping(true);
    try {
      // 1. Stop MediaRecorder and package video
      let videoBlob: Blob | null = null;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        await new Promise(r => setTimeout(r, 400));
      }
      if (recordedChunksRef.current.length > 0) {
        videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      }

      // 2. Upload video as session evidence if recorded
      if (videoBlob && videoBlob.size > 0) {
        try {
          await uploadSessionEvidence(session.session_id, videoBlob, durationSeconds);
        } catch (uploadErr) {
          console.warn("Evidence upload note:", uploadErr);
        }
      }

      // 3. Stop session and generate Attendance Draft
      stopCamera();
      await stopAttendanceSession(session.session_id, { duration_seconds: durationSeconds });
      onStopSession(session.session_id);
    } catch (err: any) {
      alert("Error stopping attendance session: " + err.message);
      setIsStopping(false);
    }
  };

  // Video File Upload Handler
  const handleUploadAndProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsSimulatingProcessing(true);
    setUploadProgress(15);

    try {
      // 1. Upload evidence video and run backend neural recognition pipeline
      setUploadProgress(40);
      const uploadRes = await uploadSessionEvidence(session.session_id, uploadFile, 45.0);
      setUploadProgress(75);

      const videoDuration = uploadRes.duration || 45.0;

      // 2. Stop session and generate verification draft
      await stopAttendanceSession(session.session_id, { duration_seconds: videoDuration });
      setUploadProgress(100);

      // 3. Hand over to Faculty Verification view
      onStopSession(session.session_id);
    } catch (err: any) {
      console.error("Video processing error:", err);
      alert("Video upload or processing failed: " + (err.message || err));
      setIsSimulatingProcessing(false);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12">
      
      {/* Top Header Card */}
      <div className="bg-[#0a2540] text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-blue-900/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                VISIONATTEND
              </span>
              <span className="text-xs text-blue-200 font-mono">
                {session.session_code || `ATT-${String(session.session_id).padStart(3, '0')}`}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <span>{session.year_section}</span>
              <span className="text-slate-400 font-normal">•</span>
              <span className="text-blue-300">{session.subject}</span>
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Faculty: <span className="font-semibold text-white">{session.faculty_name}</span> | Date: <span className="font-mono text-blue-200">{session.date}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
              title={soundEnabled ? "Mute audio cues" : "Unmute audio cues"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-blue-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel Session
            </button>
          </div>

        </div>

        {/* Description / Reminder Box */}
        {session.description_reminder && (
          <div className="mt-3 p-2.5 rounded-xl bg-blue-950/60 border border-blue-800/50 flex items-start gap-2 text-xs text-blue-200">
            <FileText className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-blue-300">Session Reminder: </span>
              <span>{session.description_reminder}</span>
            </div>
          </div>
        )}
      </div>

      {/* Mode View: Camera or Upload */}
      {mode === 'CAMERA' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Main Video Viewport (2 Cols on Large Screens) */}
          <div className="lg:col-span-2 space-y-3">
            
            <div className="relative rounded-2xl bg-black overflow-hidden shadow-xl aspect-video border-2 border-slate-800 flex items-center justify-center">
              
              {/* HTML5 Video Element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Bounding Boxes Overlay */}
              {boxes.map(box => {
                const isMatch = box.status === 'MATCH_FOUND';
                const isReview = box.status === 'REVIEW_REQUIRED';
                const borderColor = isMatch ? 'border-emerald-500 bg-emerald-500/10' : (isReview ? 'border-amber-400 bg-amber-400/10' : 'border-slate-400 bg-slate-500/10');
                const badgeColor = isMatch ? 'bg-emerald-600' : (isReview ? 'bg-amber-600' : 'bg-slate-700');

                return (
                  <div
                    key={box.box_id}
                    className={`absolute border-2 rounded-lg transition-all duration-150 pointer-events-none ${borderColor}`}
                    style={{
                      left: `${box.x * 100}%`,
                      top: `${box.y * 100}%`,
                      width: `${box.width * 100}%`,
                      height: `${box.height * 100}%`,
                    }}
                  >
                    <div className={`absolute -top-6 left-0 px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow flex items-center gap-1 whitespace-nowrap ${badgeColor}`}>
                      <span>{box.student_name || 'Detecting...'}</span>
                      <span className="font-mono opacity-90">{box.confidence}%</span>
                    </div>
                  </div>
                );
              })}

              {/* Top Video Overlay Telemetry */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-2">
                  <div className="px-2.5 py-1 rounded-full bg-rose-600 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-md animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-white"></span>
                    <span>LIVE</span>
                  </div>
                  <div className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-sm text-white text-[11px] font-mono font-bold border border-slate-700 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-400" />
                    <span>{formatTimer(durationSeconds)}</span>
                  </div>
                </div>

                <div className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-sm text-blue-300 text-[11px] font-semibold border border-slate-700">
                  Evidence Recording Active
                </div>
              </div>

              {/* Camera Error Message */}
              {cameraError && (
                <div className="absolute inset-0 bg-slate-900/90 p-6 flex flex-col items-center justify-center text-center">
                  <CameraOff className="w-12 h-12 text-rose-400 mb-2" />
                  <h3 className="text-base font-bold text-white mb-1">Camera Inactive</h3>
                  <p className="text-xs text-slate-300 max-w-sm mb-4">{cameraError}</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={startCamera}
                      className="va-btn-primary text-xs flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry Camera</span>
                    </button>
                    <button
                      onClick={() => setMode('UPLOAD')}
                      className="va-btn-secondary text-xs"
                    >
                      Switch to Upload Mode
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Actions Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-600">
                <span>The smartphone camera scans the classroom. All video frames are processed and stored as session audit evidence.</span>
              </div>

              <button
                onClick={handleStopAttendance}
                disabled={isStopping}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-900/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isStopping ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing & Storing Evidence...</span>
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4 fill-white" />
                    <span>STOP ATTENDANCE</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Real-Time Telemetry & Recognized Students Sidebar */}
          <div className="space-y-3">
            
            {/* Real-Time Metrics Card */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Live AI Telemetry</span>
              </h3>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-center">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Faces</div>
                  <div className="text-lg font-bold text-slate-800">{facesDetected}</div>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-100 text-center">
                  <div className="text-[10px] text-emerald-700 font-semibold uppercase">Recognized</div>
                  <div className="text-lg font-bold text-emerald-700">{recognizedCount}</div>
                </div>
                <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-100 text-center">
                  <div className="text-[10px] text-amber-700 font-semibold uppercase">Review</div>
                  <div className="text-lg font-bold text-amber-700">{reviewCount}</div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>Present in Draft:</span>
                <span className="font-bold text-emerald-700 font-mono">{presentCandidatesCount} students</span>
              </div>
            </div>

            {/* Recognized Feed */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Recognized Students
                </h3>
                <span className="text-[10px] text-slate-500">{candidates.length} tracked</span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {candidates.length > 0 ? (
                  candidates.map((c) => (
                    <div
                      key={c.student_id}
                      className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {c.best_frame_b64 ? (
                          <img
                            src={c.best_frame_b64}
                            alt={c.student_name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-300"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center justify-center">
                            {c.student_name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-slate-900 leading-tight">{c.student_name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{c.register_number}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.status === 'OD' ? 'va-badge-od' : (c.status === 'ML' ? 'va-badge-ml' : (c.status === 'REVIEW' ? 'va-badge-review' : 'va-badge-present'))
                        }`}>
                          {c.status}
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{c.confidence}%</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400">
                    Awaiting face detections from camera stream...
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* Video File Upload Mode */
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Upload Classroom Attendance Video</h2>
            <p className="text-xs text-slate-500">
              Select a 30-60 second recorded classroom scan video to extract frames, recognize students, and store as session evidence.
            </p>
          </div>

          <form onSubmit={handleUploadAndProcess} className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-8 text-center cursor-pointer transition-colors bg-slate-50">
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setUploadFile(e.target.files[0]);
                  }
                }}
                className="hidden"
                id="classroom-video-input"
              />
              <label htmlFor="classroom-video-input" className="cursor-pointer block space-y-2">
                <Film className="w-10 h-10 text-blue-600 mx-auto" />
                <div className="text-xs font-semibold text-slate-800">
                  {uploadFile ? uploadFile.name : "Click or drag classroom video here (MP4, WebM)"}
                </div>
                <div className="text-[11px] text-slate-400">
                  {uploadFile ? `${(uploadFile.size / (1024 * 1024)).toFixed(2)} MB` : "Recommended resolution: 720p or 1080p"}
                </div>
              </label>
            </div>

            {isSimulatingProcessing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Processing Video & Running AI Face Recognition...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMode('CAMERA')}
                className="va-btn-secondary text-xs"
              >
                Switch to Live Camera
              </button>
              <button
                type="submit"
                disabled={!uploadFile || isSimulatingProcessing}
                className="va-btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSimulatingProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Process & Generate Draft</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
