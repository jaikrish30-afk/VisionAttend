import React, { useState, useEffect } from 'react';
import { 
  X, Film, Download, FileText, FileSpreadsheet, 
  Printer, CheckCircle2, ShieldCheck, Clock, Calendar, 
  User, Play, RefreshCw
} from 'lucide-react';
import { AttendanceSession } from '../types';
import { fetchSession } from '../api';

interface SessionDetailModalProps {
  sessionId: number;
  onClose: () => void;
}

export const SessionDetailModal: React.FC<SessionDetailModalProps> = ({
  sessionId,
  onClose
}) => {
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [playingVideo, setPlayingVideo] = useState<boolean>(false);

  useEffect(() => {
    fetchSession(sessionId)
      .then(s => setSession(s))
      .catch(err => console.error("Error fetching session details:", err))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const handleDownloadEvidence = () => {
    window.open(`/api/evidence/${sessionId}/download`, '_blank');
  };

  const handleDownloadCSV = () => {
    window.location.href = `/api/reports/export-csv?session_id=${sessionId}`;
  };

  const handleDownloadXLSX = () => {
    window.location.href = `/api/reports/export-xlsx?session_id=${sessionId}`;
  };

  const handleDownloadPDF = () => {
    window.open(`/api/reports/export-pdf?session_id=${sessionId}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-[#0a2540] text-white px-6 py-4 flex items-center justify-between border-b border-blue-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
              VA
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-blue-300 font-bold">
                  {session?.session_code || `ATT-${String(sessionId).padStart(3, '0')}`}
                </span>
                <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                  session?.status === 'APPROVED' ? 'va-badge-present' : 'va-badge-review'
                }`}>
                  {session?.status === 'APPROVED' ? 'FACULTY APPROVED' : session?.status}
                </span>
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {session?.year_section} • {session?.subject}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <span>Loading session and evidence metadata...</span>
            </div>
          ) : session ? (
            <>
              {/* Session Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold block">Date & Time</span>
                  <span className="font-bold text-slate-900">{session.date} • {session.start_time}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Faculty In-Charge</span>
                  <span className="font-bold text-slate-900">{session.faculty_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Location</span>
                  <span className="font-bold text-slate-900">{session.room_number}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Retention Policy</span>
                  <span className="font-bold text-blue-700">{session.retention_days} Days Policy</span>
                </div>
              </div>

              {/* Description / Reminder */}
              {session.description_reminder && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                  <span className="font-bold">Session Reminder Note: </span>
                  <span>{session.description_reminder}</span>
                </div>
              )}

              {/* Summary Counters */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                  <div className="text-[10px] font-bold text-emerald-800 uppercase">Present</div>
                  <div className="text-lg font-bold text-emerald-800 font-mono">{session.present_count}</div>
                </div>
                <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                  <div className="text-[10px] font-bold text-rose-800 uppercase">Absent</div>
                  <div className="text-lg font-bold text-rose-800 font-mono">{session.absent_count}</div>
                </div>
                <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200">
                  <div className="text-[10px] font-bold text-blue-800 uppercase">On-Duty</div>
                  <div className="text-lg font-bold text-blue-800 font-mono">{session.od_count}</div>
                </div>
                <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  <div className="text-[10px] font-bold text-amber-800 uppercase">Medical Leave</div>
                  <div className="text-lg font-bold text-amber-800 font-mono">{session.ml_count}</div>
                </div>
              </div>

              {/* EVIDENCE SECTION */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-blue-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Recorded Classroom Session Evidence
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Duration: {session.video_duration || 45}s • Status: {session.evidence_status}
                  </span>
                </div>

                {playingVideo ? (
                  <div className="space-y-2">
                    <div className="aspect-video bg-black rounded-xl overflow-hidden border border-slate-300 relative shadow-inner flex items-center justify-center">
                      <video
                        key={`evidence-video-${sessionId}`}
                        controls
                        autoPlay
                        preload="auto"
                        playsInline
                        src={`/api/evidence/${sessionId}/stream`}
                        className="w-full h-full object-contain"
                      >
                        <source src={`/api/evidence/${sessionId}/stream`} type="video/webm" />
                        <source src={`/api/evidence/${sessionId}/stream`} type="video/mp4" />
                        Your browser does not support HTML5 video playback.
                      </video>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <span>Live Classroom Audit Video Stream</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleDownloadEvidence}
                          className="px-2.5 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download File</span>
                        </button>
                        <button
                          onClick={() => setPlayingVideo(false)}
                          className="px-2.5 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-[11px] cursor-pointer transition-colors"
                        >
                          Close Player
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-slate-900 text-white rounded-xl flex flex-col items-center justify-center text-center space-y-2 shadow-inner">
                    <Film className="w-10 h-10 text-blue-400 opacity-80" />
                    <div className="text-xs font-bold font-mono text-blue-200">
                      {session.video_filename || `session_${sessionId}_evidence.mp4`}
                    </div>
                    <p className="text-[11px] text-slate-400 max-w-sm">
                      Securely recorded and stored as institutional audit evidence linked directly to this session.
                    </p>
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => setPlayingVideo(true)}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-blue-950/40 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Play Full Video Evidence</span>
                      </button>
                      <button
                        onClick={handleDownloadEvidence}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Video</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* REPORT EXPORTS SECTION */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Export Academic Attendance Reports
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500">Real downloadable formats</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={handleDownloadPDF}
                    className="p-3 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 text-left transition-colors flex items-center gap-3 shadow-sm cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                      PDF
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Download PDF</div>
                      <div className="text-[10px] text-slate-500">Formal printable audit report</div>
                    </div>
                  </button>

                  <button
                    onClick={handleDownloadXLSX}
                    className="p-3 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 text-left transition-colors flex items-center gap-3 shadow-sm cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                      XLSX
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Download Excel</div>
                      <div className="text-[10px] text-slate-500">Spreadsheet with formatting</div>
                    </div>
                  </button>

                  <button
                    onClick={handleDownloadCSV}
                    className="p-3 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 text-left transition-colors flex items-center gap-3 shadow-sm cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                      CSV
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Download CSV</div>
                      <div className="text-[10px] text-slate-500">Standard registry data export</div>
                    </div>
                  </button>
                </div>
              </div>

            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="va-btn-secondary text-xs"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
