import React, { useState, useEffect, useRef } from 'react';
import { 
  ScanFace, CheckCircle2, ShieldCheck, 
  Camera, Zap, RefreshCw, XCircle, AlertTriangle, ArrowRight
} from 'lucide-react';
import { Student } from '../types';
import { testStudentVerification } from '../api';

interface TestStudentDemoProps {
  students: Student[];
}

export const TestStudentDemo: React.FC<TestStudentDemoProps> = ({ students }) => {
  const [selectedStudentId, setSelectedStudentId] = useState<number>(
    students[0]?.student_id || 0
  );
  const [scanning, setScanning] = useState<boolean>(false);
  const [result, setResult] = useState<{
    success: boolean;
    match_found: boolean;
    has_face: boolean;
    name: string;
    visionattend_id: string;
    register_number: string;
    department: string;
    confidence: number;
    status: string;
    verification_result: string;
    timestamp: string;
    biometric_details: {
      embedding_dimensions: number;
      distance_metric: string;
      similarity_score: number;
      face_angle: string;
      lighting_lux: string;
      sharpness_index: string;
    };
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);

  const selectedStudent = students.find(s => s.student_id === selectedStudentId) || students[0];

  // Start webcam
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch {
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
    }
    setCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // Capture real frame from webcam
  const captureWebcamBase64 = (): string | undefined => {
    const video = videoRef.current;
    if (!video) return undefined;
    if (video.videoWidth === 0 || video.videoHeight === 0) return undefined;
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(video.videoWidth, 640);
    canvas.height = Math.min(video.videoHeight, 480);
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const handleRunVerification = async () => {
    if (!selectedStudent) return;
    setScanning(true);
    setResult(null);

    const frameB64 = captureWebcamBase64();

    try {
      const res = await testStudentVerification(selectedStudent.student_id, frameB64);
      setResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-semibold border border-cyan-500/20 mb-2">
              <ScanFace className="w-3.5 h-3.5" />
              <span>AUTHENTIC 1-on-1 BIOMETRIC VERIFICATION</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              STUDENT ID VERIFICATION TEST
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Real-time computer vision comparison. Select a registered student, stand before the webcam, and the AI will extract your facial feature vectors and verify whether your face matches the registered profile.
            </p>
          </div>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="p-8 text-center text-slate-400 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
          <p className="text-sm font-semibold text-white">No registered students found in database.</p>
          <p className="text-xs text-slate-400">Please register a student with face photos first using the "Register Student" tab.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* LEFT (5 COLS): Student Selector & Target Card */}
          <div className="md:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              1. Select Registered Student to Verify
            </h2>

            <div className="space-y-2">
              <label className="text-xs text-slate-400 block font-medium">Target Identity:</label>
              <select
                value={selectedStudentId}
                onChange={(e) => {
                  setSelectedStudentId(Number(e.target.value));
                  setResult(null);
                }}
                className="w-full px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {students.map(s => (
                  <option key={s.student_id} value={s.student_id}>
                    {s.name} ({s.visionattend_id})
                  </option>
                ))}
              </select>
            </div>

            {selectedStudent && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3 border-b border-slate-800/80 pb-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 overflow-hidden ring-2 ring-cyan-500/30">
                    <img
                      src={selectedStudent.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"}
                      alt={selectedStudent.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">{selectedStudent.name}</div>
                    <div className="text-[11px] font-mono text-cyan-400">{selectedStudent.visionattend_id}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Register Number</span>
                    <span className="font-mono text-slate-200">{selectedStudent.register_number}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Department</span>
                    <span className="text-slate-200">{selectedStudent.department.split('&')[0]}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Enrolled Status</span>
                    <span className="text-emerald-400 font-semibold">{selectedStudent.face_profile_status}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Readiness Gauge</span>
                    <span className="text-cyan-300 font-mono font-bold">{selectedStudent.readiness_score}%</span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleRunVerification}
              disabled={scanning}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 hover:from-blue-500 hover:to-teal-300 text-slate-950 font-bold text-xs tracking-wider uppercase shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
            >
              {scanning ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>COMPARING LIVE FACE VECTORS...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>CAPTURE WEBCAM & VERIFY FACE</span>
                </>
              )}
            </button>
          </div>

          {/* RIGHT (7 COLS): Camera View & Real Verification Result Card */}
          <div className="md:col-span-7 space-y-4">
            
            {/* Live Camera Viewport */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 aspect-[16/10] shadow-xl">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              />

              {!cameraActive && (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-950 to-indigo-950/60">
                  <Camera className="w-12 h-12 text-cyan-400/40 mb-2 animate-pulse" />
                  <span className="text-xs text-slate-300 font-semibold">Webcam Stream Connecting...</span>
                  <span className="text-[11px] text-slate-500 mt-1">Please allow camera permissions in browser</span>
                </div>
              )}

              {/* Target Reticle Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-48 h-60 rounded-3xl border-2 transition-all ${
                  scanning 
                    ? 'border-cyan-400 shadow-[0_0_30px_rgba(56,189,248,0.5)] animate-pulse' 
                    : result?.match_found 
                    ? 'border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.5)]'
                    : result && !result.match_found
                    ? 'border-rose-500 shadow-[0_0_30px_rgba(239,68,68,0.5)]'
                    : 'border-slate-600 border-dashed'
                }`}>
                  <div className="relative w-full h-full">
                    <div className="absolute top-2 left-2 text-[9px] font-mono text-cyan-400">TARGET: {selectedStudent?.name.split(' ')[0]}</div>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-slate-900/80 backdrop-blur-md text-[11px] font-mono text-slate-300 border border-slate-800">
                LIVE CAMERA ACTIVE
              </div>
            </div>

            {/* REAL VERIFICATION RESULT CARD */}
            {result && (
              <div className={`border rounded-2xl p-5 shadow-2xl relative overflow-hidden transition-all ${
                result.match_found
                  ? 'bg-slate-900/95 border-emerald-500/50 shadow-emerald-500/10'
                  : result.has_face === false
                  ? 'bg-slate-900/95 border-amber-500/50 shadow-amber-500/10'
                  : 'bg-slate-900/95 border-rose-500/50 shadow-rose-500/10'
              }`}>
                
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className={`flex items-center gap-2 font-bold text-sm ${
                    result.match_found
                      ? 'text-emerald-400'
                      : result.has_face === false
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}>
                    {result.match_found ? (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>MATCH FOUND — IDENTITY VERIFIED</span>
                      </>
                    ) : result.has_face === false ? (
                      <>
                        <AlertTriangle className="w-5 h-5" />
                        <span>NO FACE DETECTED</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5" />
                        <span>MISMATCH — IDENTITY NOT VERIFIED</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full font-bold text-xs font-mono ${
                      result.match_found
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : result.has_face === false
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}>
                      {result.confidence}% Match Score
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Target Student</span>
                    <span className="font-bold text-white text-sm">{result.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Verification Status</span>
                    <span className={`font-bold uppercase ${
                      result.match_found ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {result.verification_result}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">VisionAttend Student ID</span>
                    <span className="font-mono text-cyan-300 text-xs font-bold">{result.visionattend_id}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Register Number</span>
                    <span className="font-mono text-slate-300">{result.register_number}</span>
                  </div>
                </div>

                {/* Biometric Deep Dive details */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 bg-slate-950/60 p-3 rounded-xl">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    Real-Time Biometric Vector Analysis
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-300">
                    <div>Dimensions: <span className="text-cyan-400">128-d Vector</span></div>
                    <div>Distance: <span className="text-cyan-400">Cosine Metric</span></div>
                    <div>Similarity: <span className={result.match_found ? 'text-emerald-400' : 'text-rose-400'}>{result.biometric_details.similarity_score}</span></div>
                    <div>Lighting: <span className="text-slate-200">{result.biometric_details.lighting_lux}</span></div>
                    <div>Sharpness: <span className="text-slate-200">{result.biometric_details.sharpness_index}</span></div>
                    <div>Result: <span className={result.match_found ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{result.match_found ? 'VALIDATED' : 'REJECTED'}</span></div>
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
};
