import React, { useState, useEffect } from 'react';
import { 
  Video, Film, Calendar, FileText, Download, 
  Search, Filter, RefreshCw, CheckCircle2, AlertTriangle, 
  Play, FileSpreadsheet, Printer, ChevronRight
} from 'lucide-react';
import { AttendanceSession } from '../types';
import { fetchSessions } from '../api';

interface AttendanceHistoryProps {
  onViewSessionDetails: (sessionId: number) => void;
  onStartAttendance?: () => void;
}

export const AttendanceHistory: React.FC<AttendanceHistoryProps> = ({
  onViewSessionDetails,
  onStartAttendance
}) => {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await fetchSessions();
      setSessions(data);
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const filteredSessions = sessions.filter(s => {
    const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
    const matchSearch = 
      (s.session_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.year_section.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.faculty_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.date.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16 animate-fade-in">
      
      {/* Top Banner */}
      <div className="bg-[#0a2540] text-white rounded-2xl p-6 shadow-lg border border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              AUDIT TRAIL & EVIDENCE
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            ATTENDANCE SESSIONS & VIDEO EVIDENCE
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Every recorded classroom attendance session is linked with secure video evidence and faculty verification audit records.
          </p>
        </div>

        {onStartAttendance && (
          <button
            onClick={onStartAttendance}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-950/30 transition-all cursor-pointer whitespace-nowrap"
          >
            <Video className="w-4 h-4" />
            <span>START NEW SESSION</span>
          </button>
        )}
      </div>

      {/* Table Container Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="flex flex-wrap items-center gap-1.5">
            {['ALL', 'APPROVED', 'DRAFT', 'LIVE'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                {st === 'APPROVED' ? 'APPROVED' : st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search session code, subject, class..."
                className="va-input pl-8 text-xs bg-white"
              />
            </div>

            <button
              onClick={loadSessions}
              disabled={loading}
              className="p-2 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
              title="Refresh sessions"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

        </div>

        {/* Sessions Table */}
        <div className="overflow-x-auto">
          <table className="va-table">
            <thead>
              <tr>
                <th>Session Code</th>
                <th>Class / Section</th>
                <th>Subject</th>
                <th>Date & Time</th>
                <th>Faculty In-Charge</th>
                <th>Present / Total</th>
                <th>OD / ML</th>
                <th>Evidence Video</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.length > 0 ? (
                filteredSessions.map((s) => (
                  <tr key={s.session_id}>
                    <td className="font-mono font-bold text-xs text-blue-900">
                      {s.session_code || `ATT-${String(s.session_id).padStart(3, '0')}`}
                    </td>

                    <td className="font-semibold text-xs text-slate-900">{s.year_section}</td>
                    
                    <td>
                      <div className="font-medium text-slate-900 text-xs">{s.subject}</div>
                      <div className="text-[11px] text-slate-400">{s.room_number}</div>
                    </td>

                    <td className="text-xs text-slate-500 font-mono">
                      {s.date} • {s.start_time}
                    </td>

                    <td className="text-xs text-slate-700">{s.faculty_name}</td>

                    <td>
                      <span className="font-mono font-bold text-xs text-emerald-700">
                        {s.present_count} / {s.total_students}
                      </span>
                    </td>

                    <td>
                      <div className="flex items-center gap-1 font-mono text-[11px]">
                        {s.od_count > 0 && <span className="px-1.5 py-0.2 rounded va-badge-od">OD: {s.od_count}</span>}
                        {s.ml_count > 0 && <span className="px-1.5 py-0.2 rounded va-badge-ml">ML: {s.ml_count}</span>}
                        {s.od_count === 0 && s.ml_count === 0 && <span className="text-slate-400">—</span>}
                      </div>
                    </td>

                    <td>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                        <Film className="w-3.5 h-3.5" />
                        <span>Available ({s.video_duration || 45}s)</span>
                      </span>
                    </td>

                    <td>
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                        s.status === 'APPROVED' ? 'va-badge-present' : (s.status === 'LIVE' ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse' : 'va-badge-review')
                      }`}>
                        {s.status === 'APPROVED' ? 'APPROVED' : s.status}
                      </span>
                    </td>

                    <td>
                      <button
                        onClick={() => onViewSessionDetails(s.session_id)}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-xs text-slate-400">
                    No attendance sessions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
