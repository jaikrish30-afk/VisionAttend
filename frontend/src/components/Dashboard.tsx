import React from 'react';
import { 
  Video, Users, UserCheck, Clock, FileCheck, Stethoscope, 
  AlertTriangle, ArrowRight, ShieldCheck, Film, Download, 
  Layers, CheckCircle2, ChevronRight, BookOpen
} from 'lucide-react';
import { DashboardStats, User } from '../types';

interface DashboardProps {
  stats: DashboardStats | null;
  currentUser: User | null;
  onStartLive: () => void;
  onNavigate: (tab: string, sessionId?: number) => void;
  onViewSession: (sessionId: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  stats,
  currentUser,
  onStartLive,
  onNavigate,
  onViewSession
}) => {
  const pendingReviews = stats?.pending_reviews_count || 0;
  const recentSessions = stats?.recent_sessions || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in">
      
      {/* Hero Banner with Primary Action */}
      <div className="bg-[#0a2540] text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-blue-900/50 relative overflow-hidden">
        
        {/* Background glow styling */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>VISIONATTEND • AI-ASSISTED CLASSROOM SYSTEM</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Classroom Video Attendance & Evidence Verification
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Scan the classroom using a smartphone camera. AI generates an Attendance Draft with multi-frame face tracking and best-frame selection, retained alongside secure video evidence.
            </p>
          </div>

          <div className="flex-shrink-0">
            <button
              onClick={onStartLive}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-950/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Video className="w-5 h-5" />
              <span>START ATTENDANCE</span>
            </button>
          </div>

        </div>

      </div>

      {/* Pending Reviews Alert Banner (if pending review cases exist) */}
      {pendingReviews > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                {pendingReviews} Student(s) Require Review
              </h3>
              <p className="text-xs text-amber-700 mt-0.5">
                Unresolved low-confidence facial matches are awaiting faculty review before attendance drafts can be finalized.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('review', stats?.pending_review_session_id || undefined)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all whitespace-nowrap cursor-pointer"
          >
            <span>REVIEW CASES</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Real Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Students</div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{stats?.total_students || 0}</div>
          <div className="text-[10px] text-slate-400">Classroom scope</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Enrolled Profiles</div>
          <div className="text-2xl font-bold text-emerald-700 font-mono">{stats?.enrolled_biometrics || 0}</div>
          <div className="text-[10px] text-emerald-600">Multi-angle ready</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Sessions</div>
          <div className="text-2xl font-bold text-blue-700 font-mono">{stats?.total_sessions || 0}</div>
          <div className="text-[10px] text-blue-600">With video evidence</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Active OD Today</div>
          <div className="text-2xl font-bold text-indigo-700 font-mono">{stats?.active_od_today || 0}</div>
          <div className="text-[10px] text-indigo-600">{stats?.pending_od_requests || 0} pending</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Pending ML</div>
          <div className="text-2xl font-bold text-amber-700 font-mono">{stats?.pending_ml_requests || 0}</div>
          <div className="text-[10px] text-amber-600">Medical leaves</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Pending Reviews</div>
          <div className="text-2xl font-bold text-amber-600 font-mono">{pendingReviews}</div>
          <div className="text-[10px] text-amber-500">Uncertain matches</div>
        </div>

      </div>

      {/* Active Class & Subjects Quick Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Class Schedule & Active Reminders
            </h3>
          </div>
          <button
            onClick={() => onNavigate('classes')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>Manage Classes</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">IT - 2D (Information Technology)</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                Primary Scope
              </span>
            </div>
            <div className="text-xs text-slate-600">
              <span className="font-semibold text-slate-700">Subject:</span> IT204 - Computer Networks • Room 304
            </div>
            <div className="p-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 italic">
              "Internal assessment discussion today. Students with approved OD should be considered accordingly."
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">IT - 2A (Information Technology)</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                Secondary Scope
              </span>
            </div>
            <div className="text-xs text-slate-600">
              <span className="font-semibold text-slate-700">Subject:</span> IT205 - Operating Systems • Room 301
            </div>
            <div className="p-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 italic">
              "Standard lecture session and lab practical verification."
            </div>
          </div>

        </div>
      </div>

      {/* Recent Attendance Sessions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
        
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Recent Attendance Sessions & Evidence
            </h3>
          </div>

          <button
            onClick={() => onNavigate('sessions')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>View All Sessions</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="va-table">
            <thead>
              <tr>
                <th>Session Code</th>
                <th>Class / Section</th>
                <th>Subject</th>
                <th>Date & Time</th>
                <th>Present / Total</th>
                <th>OD / ML</th>
                <th>Evidence Status</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentSessions.length > 0 ? (
                recentSessions.map((s) => (
                  <tr key={s.session_id}>
                    <td className="font-mono font-bold text-xs text-blue-900">
                      {s.session_code || `ATT-${String(s.session_id).padStart(3, '0')}`}
                    </td>
                    <td className="font-semibold text-xs text-slate-900">{s.year_section}</td>
                    <td className="text-xs text-slate-800">{s.subject}</td>
                    <td className="text-xs text-slate-500 font-mono">
                      {s.date} • {s.start_time}
                    </td>
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
                        <span>Stored ({s.video_duration || 45}s)</span>
                      </span>
                    </td>
                    <td>
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                        s.status === 'APPROVED' ? 'va-badge-present' : (s.status === 'LIVE' ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse' : 'va-badge-review')
                      }`}>
                        {s.status === 'APPROVED' ? 'FACULTY APPROVED' : s.status}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => onViewSession(s.session_id)}
                        className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 transition-colors cursor-pointer"
                      >
                        View & Reports
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-slate-400">
                    No attendance sessions recorded yet. Click [START ATTENDANCE] above to begin.
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
