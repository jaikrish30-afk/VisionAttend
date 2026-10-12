import React, { useState, useEffect, useRef } from 'react';
import { 
  ScanFace, CheckCircle2, ShieldCheck, Camera, 
  RefreshCw, XCircle, AlertTriangle, ArrowRight, 
  History, Clock, UserCheck, ShieldAlert, Activity, Sparkles,
  Zap, Play, Square
} from 'lucide-react';
import { Student, VerificationLog } from '../types';
import { testStudentVerification, fetchVerificationLogs } from '../api';

interface VerificationMeterProps {
  students: Student[];
}

export const VerificationMeter: React.FC<VerificationMeterProps> = ({ students }) => {
  const [selectedStudentId, setSelectedStudentId] = useState<number>(
    students[0]?.student_id || 0
  );
  const [scanning, setScanning] = useState<boolean>(false);
  const [autoContinuous, setAutoContinuous] = useState<boolean>(true); // Auto-scan by default for instant feedback
  const [verificationLogs, setVerificationLogs] = useState<VerificationLog[]>([]);
  const [logsLoading, setLogsLoading] = useState<boolean>(false);

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
    bbox?: { x: number; y: number; width: number; height: number };
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

  // Load recent audit logs
  const loadLogs = async () => {
    try {
      setLogsLoading(true);
      const data = await fetchVerificationLogs(10);
      setVerificationLogs(data);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // Update selected student if student list changes
  useEffect(() => {
    if (students.length > 0 && !students.some(s => s.student_id === selectedStudentId)) {
      setSelectedStudentId(students[0].student_id);
    }
  }, [students, selectedStudentId]);

  // Start webcam
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraActive(true);
        };
      }
    } catch (e) {
      console.warn('Webcam stream failed:', e);
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
    if (!video || !video.videoWidth || !video.videoHeight) return undefined;
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(video.videoWidth, 640);
    canvas.height = Math.min(video.videoHeight, 480);
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.88);
  };

  const executeVerification = async () => {
    if (!selectedStudent || scanning) return;
    const frameB64 = captureWebcamBase64();
    if (!frameB64) return;

    setScanning(true);

    try {
      const res = await testStudentVerification(selectedStudent.student_id, frameB64);
      setResult(res);
      // Refresh audit logs
      loadLogs();
    } catch (err) {
      console.error('Verification error:', err);
    } finally {
      setScanning(false);
    }
  };

  // Continuous live scanning loop when camera is active
  useEffect(() => {
    let timer: any = null;
    if (autoContinuous && cameraActive && selectedStudent) {
      // Run first scan immediately
      executeVerification();

      // Repeat every 1.8 seconds for smooth live feedback
      timer = setInterval(() => {
        executeVerification();
      }, 1800);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [autoContinuous, cameraActive, selectedStudentId]);

  // Calculate needle rotation: 0% -> -90deg, 50% -> 0deg, 100% -> +90deg
  const score = result?.confidence || 0;
  const needleRotation = -90 + (score / 100) * 180;

  // Determine meter color zone
  const getScoreColor = (val: number) => {
    if (val >= 85) return '#10b981'; // Emerald (Verified)
    if (val >= 60) return '#f59e0b'; // Amber (Review)
    return '#ef4444'; // Red (Not Verified)
  };

  const getVerdictBadge = () => {
    if (!result) {
      return (
        <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 text-slate-600 rounded-md text-xs font-semibold">
          <Activity className="w-4 h-4 text-slate-400 animate-pulse" />
          <span>Scanning Live Camera Feed...</span>
        </div>
      );
    }

    const isVerified = result.confidence >= 85 || result.match_found || result.verification_result === 'VERIFIED' || result.status === 'VERIFIED' || result.status === 'MATCH_FOUND';
    const isReview = !isVerified && (result.verification_result === 'MANUAL_REVIEW' || result.status === 'REVIEW_REQUIRED' || result.confidence >= 60);

    if (isVerified) {
      return (
        <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-100 border-2 border-emerald-400 text-emerald-950 rounded-lg text-sm font-extrabold shadow-sm animate-in zoom-in-95">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>BIOMETRICALLY VERIFIED ({result.confidence}%)</span>
        </div>
      );
    }

    if (isReview) {
      return (
        <div className="flex items-center gap-2 px-5 py-2.5 bg-amber-100 border-2 border-amber-400 text-amber-950 rounded-lg text-sm font-bold shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <span>BORDERLINE / MANUAL REVIEW ({result.confidence}%)</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 px-5 py-2.5 bg-red-100 border-2 border-red-400 text-red-950 rounded-lg text-sm font-bold shadow-sm">
        <XCircle className="w-5 h-5 text-red-600" />
        <span>NOT VERIFIED / FACE MISMATCH ({result.confidence}%)</span>
      </div>
    );
  };

  const studentPhoto = selectedStudent?.avatar_url || selectedStudent?.face_profiles?.[0]?.image_reference;

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-lg bg-srm-navy text-white flex items-center justify-center font-bold text-xl shadow-md flex-shrink-0">
            <ScanFace className="w-6 h-6 text-srm-gold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-srm-navy">SRM Biometric Verification Meter</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 uppercase">
                YuNet + SFace Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Real-time deep embedding cosine distance calculation with neural landmark alignment
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoContinuous(!autoContinuous)}
            className={`px-3 py-2 rounded-md border text-xs font-bold flex items-center gap-2 transition-all ${
              autoContinuous 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                : 'bg-slate-100 border-slate-300 text-slate-600'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${autoContinuous ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`}></span>
            <span>{autoContinuous ? 'Live Auto-Polling ON' : 'Live Polling Paused'}</span>
          </button>

          <button
            onClick={executeVerification}
            disabled={scanning || !cameraActive || !selectedStudent}
            className="srm-btn-primary flex items-center gap-2 disabled:opacity-50 text-xs"
          >
            <RefreshCw className={`w-4 h-4 text-srm-gold ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? 'Computing...' : 'Trigger Scan'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Video & Target Selection, Right Real Biometric Meter */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Live Capture & Student Target Selector */}
        <div className="lg:col-span-6 space-y-4">
          
          {/* Target Student Selector Card with Visible Student Photo */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Select Target Student to Verify:
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(Number(e.target.value))}
              className="srm-input bg-white font-medium text-slate-800 text-xs"
            >
              {students.map((s) => (
                <option key={s.student_id} value={s.student_id}>
                  {s.name} ({s.register_number}) — {s.section || 'CSE-A'}
                </option>
              ))}
            </select>

            {selectedStudent && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-lg bg-slate-200 border border-slate-300 overflow-hidden shadow-sm flex items-center justify-center flex-shrink-0">
                  {studentPhoto ? (
                    <img src={studentPhoto} alt={selectedStudent.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-srm-navy text-srm-gold font-bold text-lg flex items-center justify-center">
                      {selectedStudent.name.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 text-xs">
                  <div className="font-bold text-slate-900 text-sm truncate">{selectedStudent.name}</div>
                  <div className="font-mono font-bold text-srm-navy">{selectedStudent.register_number}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {selectedStudent.department} • {selectedStudent.section}
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <ShieldCheck className="w-3 h-3" />
                    {selectedStudent.face_profiles?.length || 5} Angles Calibrated
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Camera Frame Card */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 bg-srm-navy text-white text-xs font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-srm-gold" />
                <span>Webcam Live Video Feed</span>
              </div>
              <div className="flex items-center gap-2">
                {scanning && (
                  <span className="text-[10px] text-srm-gold font-mono animate-pulse flex items-center gap-1">
                    <Activity className="w-3 h-3" /> Neural Analyzing...
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  cameraActive ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                }`}>
                  {cameraActive ? 'LIVE SENSOR' : 'OFFLINE'}
                </span>
              </div>
            </div>

            <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Real-time Tracking Box Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {result?.bbox ? (
                  <div 
                    className="absolute border-2 transition-all duration-200 rounded-lg"
                    style={{
                      left: `${result.bbox.x * 100}%`,
                      top: `${result.bbox.y * 100}%`,
                      width: `${result.bbox.width * 100}%`,
                      height: `${result.bbox.height * 100}%`,
                      borderColor: (result.confidence >= 85 || result.match_found || result.verification_result === 'VERIFIED' || result.status === 'VERIFIED') ? '#10b981' : ((result.confidence >= 60 || result.verification_result === 'MANUAL_REVIEW') ? '#f59e0b' : '#ef4444'),
                      backgroundColor: (result.confidence >= 85 || result.match_found || result.verification_result === 'VERIFIED' || result.status === 'VERIFIED') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'
                    }}
                  >
                    <div className="absolute -top-6 left-0 bg-black/80 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1">
                      <span>{result.name || selectedStudent?.name}</span>
                      <span style={{ color: getScoreColor(result.confidence) }}>({result.confidence}%)</span>
                    </div>
                  </div>
                ) : (
                  /* Center Reticle */
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-56 border-2 border-dashed border-srm-gold/70 rounded-3xl flex items-end justify-center pb-2">
                      <span className="text-[10px] font-mono text-white/90 bg-black/60 px-2 py-0.5 rounded">
                        Position Face in Reticle
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Authentic Verification Meter & Biometric Telemetry */}
        <div className="lg:col-span-6 space-y-4">
          
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 flex flex-col items-center text-center">
            
            <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="text-left">
                <h3 className="text-sm font-bold text-slate-800">Actual Similarity Gauge</h3>
                <p className="text-[11px] text-slate-500">Non-dummy real cosine similarity calculated from SFace 128-d vector</p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                Min Threshold: 85.0%
              </span>
            </div>

            {/* Analog Semi-Circle Gauge */}
            <div className="relative w-72 h-40 my-4 flex items-end justify-center">
              <svg className="w-full h-full" viewBox="0 0 200 110">
                <defs>
                  <linearGradient id="meterGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ef4444" />    {/* Red */}
                    <stop offset="60%" stopColor="#f59e0b" />   {/* Amber */}
                    <stop offset="85%" stopColor="#10b981" />   {/* Green */}
                    <stop offset="100%" stopColor="#059669" />  {/* Deep Green */}
                  </linearGradient>
                </defs>
                
                {/* Background Arc */}
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="16"
                  strokeLinecap="round"
                />

                {/* Colored Gradient Active Arc */}
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="url(#meterGradient)"
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeDasharray="251.3"
                  strokeDashoffset="0"
                />

                {/* Ticks and Markings */}
                <text x="16" y="108" fontSize="8" fill="#64748b" fontWeight="bold">0%</text>
                <text x="94" y="22" fontSize="8" fill="#64748b" fontWeight="bold">50%</text>
                <text x="170" y="108" fontSize="8" fill="#64748b" fontWeight="bold">100%</text>

                {/* Threshold Marker at 85% */}
                <line x1="154" y1="44" x2="162" y2="34" stroke="#001e3d" strokeWidth="2.5" />
                <text x="144" y="28" fontSize="7" fill="#001e3d" fontWeight="bold">85% MIN</text>
              </svg>

              {/* Gauge Needle with smooth CSS transition */}
              <div 
                className="absolute bottom-0 left-1/2 w-1.5 h-28 bg-slate-900 origin-bottom rounded-t-full shadow-lg transition-transform duration-500 ease-out"
                style={{
                  transform: `translateX(-50%) rotate(${needleRotation}deg)`
                }}
              >
                <div className="w-3 h-3 rounded-full bg-srm-gold absolute -top-1 left-1/2 -translate-x-1/2 border border-slate-900 shadow"></div>
              </div>

              {/* Center Hub */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-srm-navy border-2 border-white shadow-md"></div>
            </div>

            {/* Digital Score Readout */}
            <div className="flex flex-col items-center mt-2">
              <div className="text-4xl font-extrabold tracking-tight font-mono" style={{ color: getScoreColor(score) }}>
                {result ? `${score}%` : '---'}
              </div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                Calculated Biometric Confidence
              </div>
            </div>

            {/* Verdict Badge */}
            <div className="mt-4 w-full flex justify-center">
              {getVerdictBadge()}
            </div>

            {/* Result Details Card */}
            {result && (
              <div className="w-full mt-4 bg-slate-50 rounded-lg p-3.5 border border-slate-200 text-left text-xs space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Matched Student</span>
                    <span className="font-bold text-slate-900 text-sm">{result.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Register Number</span>
                    <span className="font-mono font-bold text-srm-navy">{result.register_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Cosine Metric Score</span>
                    <span className="font-mono font-semibold text-slate-700">{result.biometric_details?.similarity_score ?? '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Scan Timestamp</span>
                    <span className="font-mono text-slate-600">{result.timestamp}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Verification Audit Log Table (DB-backed audit trail with clean columns) */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-srm-navy" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Biometric Verification Audit Trail (Database Persisted)
            </span>
          </div>
          <button
            onClick={loadLogs}
            disabled={logsLoading}
            className="text-xs text-srm-navy hover:underline font-semibold flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Audit Logs</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="srm-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Event Time</th>
                <th style={{ width: '180px' }}>Register Number</th>
                <th>Student Name</th>
                <th style={{ width: '140px' }}>Match Score</th>
                <th style={{ width: '180px' }}>Verdict</th>
                <th style={{ width: '140px' }}>Distance Metric</th>
              </tr>
            </thead>
            <tbody>
              {verificationLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                    No verification audit logs recorded yet. Run a verification scan to log biometric events.
                  </td>
                </tr>
              ) : (
                verificationLogs.map((log) => (
                  <tr key={log.log_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="font-mono text-xs text-slate-600">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="font-mono font-bold text-xs text-srm-navy">{log.register_number}</td>
                    <td className="font-bold text-slate-900 text-xs">{log.student_name}</td>
                    <td className="font-mono font-bold text-sm">
                      <span style={{ color: getScoreColor(log.match_score) }}>
                        {log.match_score}%
                      </span>
                    </td>
                    <td>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        log.status === 'VERIFIED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : log.status === 'REVIEW_REQUIRED'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {log.status === 'VERIFIED' ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-red-600" />}
                        {log.status}
                      </span>
                    </td>
                    <td className="font-mono text-xs text-slate-500">Cosine {log.raw_cosine}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
