import React, { useState } from 'react';
import { 
  CheckCircle2, AlertTriangle, FileText, Download, 
  ArrowLeft, ShieldCheck, Sparkles, Filter, Search,
  RefreshCw, Check, Clock, Film
} from 'lucide-react';
import { AttendanceSession, AttendanceRecord, VerificationAction } from '../types';
import { verifyAndApproveAttendance } from '../api';

interface FacultyVerificationProps {
  session: AttendanceSession;
  onApproved: (updatedSession: AttendanceSession) => void;
  onOpenReview: () => void;
  onBack: () => void;
}

export const FacultyVerification: React.FC<FacultyVerificationProps> = ({
  session,
  onApproved,
  onOpenReview,
  onBack
}) => {
  const [records, setRecords] = useState<AttendanceRecord[]>(session.records || []);
  const [facultyName, setFacultyName] = useState<string>(session.faculty_name || 'Dr. S. Ramanathan');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Compute live draft stats
  const presentCount = records.filter(r => r.status === 'PRESENT').length;
  const absentCount = records.filter(r => r.status === 'ABSENT').length;
  const odCount = records.filter(r => r.status === 'OD').length;
  const mlCount = records.filter(r => r.status === 'ML').length;
  const reviewCount = records.filter(r => r.status === 'REVIEW').length;

  const handleStatusChange = (attendanceId: number, newStatus: string) => {
    setRecords(prev => prev.map(r => {
      if (r.attendance_id === attendanceId) {
        return {
          ...r,
          status: newStatus,
          verification_status: 'MODIFIED',
          notes: `Faculty manually marked as ${newStatus}`
        };
      }
      return r;
    }));
  };

  const handleFinalApprove = async () => {
    if (reviewCount > 0) {
      const confirmProceed = window.confirm(
        `${reviewCount} student(s) still require review. Do you want to review them first? Click Cancel to review or OK to approve with current statuses.`
      );
      if (!confirmProceed) {
        onOpenReview();
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const actions: VerificationAction[] = records.map(r => ({
        attendance_id: r.attendance_id,
        status: r.status,
        notes: r.notes
      }));

      const res = await verifyAndApproveAttendance(session.session_id, {
        session_id: session.session_id,
        faculty_name: facultyName,
        actions: actions
      });

      alert("Attendance officially approved and saved to institutional registry!");
      onApproved(res.session);
    } catch (err: any) {
      alert("Error approving attendance: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRecords = records.filter(r => {
    const matchStatus = filterStatus === 'ALL' || r.status === filterStatus;
    const matchSearch = 
      (r.student_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.register_number || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 animate-fade-in">
      
      {/* Top Header Card */}
      <div className="bg-[#0a2540] text-white rounded-2xl p-5 shadow-lg border border-blue-900/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                ATTENDANCE DRAFT
              </span>
              <span className="text-xs text-blue-200 font-mono">
                {session.session_code || `ATT-${String(session.session_id).padStart(3, '0')}`}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {session.year_section} • {session.subject}
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              Faculty: <span className="font-semibold text-white">{session.faculty_name}</span> | Date: <span className="font-mono text-blue-200">{session.date}</span> | Room: {session.room_number}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              onClick={handleFinalApprove}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/30 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <span>Approving...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>APPROVE ATTENDANCE</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* Evidence Reference Banner */}
        <div className="mt-4 pt-3 border-t border-blue-900/60 flex flex-wrap items-center justify-between gap-3 text-xs text-blue-200">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-blue-400" />
            <span>Classroom Recording Evidence: </span>
            <span className="font-mono font-semibold text-white">
              {session.video_filename || `session_${session.session_id}_evidence.mp4`} ({session.video_duration || 45}s)
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
            <ShieldCheck className="w-4 h-4" />
            <span>Stored in Secure Institutional Storage</span>
          </div>
        </div>
      </div>

      {/* Unresolved Review Alert Banner (if review items exist) */}
      {reviewCount > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                {reviewCount} Student(s) Require Review
              </h3>
              <p className="text-xs text-amber-700">
                Low-confidence matches detected below the {85}% threshold. Review side-by-side frames before final approval.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenReview}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap cursor-pointer"
          >
            <span>REVIEW NOW ({reviewCount})</span>
          </button>
        </div>
      )}

      {/* Summary Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Present</div>
          <div className="text-xl font-bold text-emerald-700 font-mono mt-0.5">{presentCount}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Absent</div>
          <div className="text-xl font-bold text-rose-700 font-mono mt-0.5">{absentCount}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">On-Duty (OD)</div>
          <div className="text-xl font-bold text-blue-700 font-mono mt-0.5">{odCount}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Medical Leave (ML)</div>
          <div className="text-xl font-bold text-amber-700 font-mono mt-0.5">{mlCount}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-center col-span-2 sm:col-span-1">
          <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Review Required</div>
          <div className="text-xl font-bold text-amber-600 font-mono mt-0.5">{reviewCount}</div>
        </div>
      </div>

      {/* Table & Controls Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Table Filters Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Status Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {['ALL', 'PRESENT', 'ABSENT', 'OD', 'ML', 'REVIEW'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  filterStatus === st
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student or reg no..."
              className="va-input pl-8 text-xs bg-white"
            />
          </div>

        </div>

        {/* Draft Table */}
        <div className="overflow-x-auto">
          <table className="va-table">
            <thead>
              <tr>
                <th className="w-12">#</th>
                <th className="w-16">Best Frame</th>
                <th>Register No</th>
                <th>Student Name</th>
                <th>AI Confidence</th>
                <th>AI Prediction</th>
                <th>OD / ML Note</th>
                <th>Final Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r, idx) => {
                const isPresent = r.status === 'PRESENT';
                const isAbsent = r.status === 'ABSENT';
                const isOD = r.status === 'OD';
                const isML = r.status === 'ML';
                const isReview = r.status === 'REVIEW';

                return (
                  <tr key={r.attendance_id} className={isReview ? 'bg-amber-50/50' : ''}>
                    <td className="text-slate-400 font-mono text-xs">{idx + 1}</td>
                    
                    {/* Best Quality Frame Thumbnail */}
                    <td>
                      {r.best_frame_path ? (
                        <img
                          src={r.best_frame_path}
                          alt={r.student_name || "Best Frame"}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-300 shadow-sm"
                          title="Best quality frame extracted from live video"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-400 font-bold text-[10px] flex items-center justify-center border border-slate-200">
                          N/A
                        </div>
                      )}
                    </td>

                    <td className="font-mono font-bold text-xs text-slate-900">
                      {r.register_number}
                    </td>

                    <td>
                      <div className="font-semibold text-slate-900">{r.student_name}</div>
                      <div className="text-[11px] text-slate-400">{r.department}</div>
                    </td>

                    <td>
                      <div className="font-mono text-xs font-bold text-slate-800">
                        {r.confidence > 0 ? `${r.confidence}%` : '—'}
                      </div>
                      {r.detection_count > 0 && (
                        <div className="text-[10px] text-slate-400">
                          {r.detection_count} frames tracked
                        </div>
                      )}
                    </td>

                    <td>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.ai_status === 'PRESENT' ? 'va-badge-present' : (r.ai_status === 'REVIEW' ? 'va-badge-review' : (r.ai_status === 'OD' ? 'va-badge-od' : (r.ai_status === 'ML' ? 'va-badge-ml' : 'va-badge-absent')))
                      }`}>
                        {r.ai_status || r.status}
                      </span>
                    </td>

                    <td>
                      {r.od_applied ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold va-badge-od">
                          Approved OD
                        </span>
                      ) : (r.ml_applied ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold va-badge-ml">
                          Approved ML
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      ))}
                    </td>

                    {/* Final Status Editable Select */}
                    <td>
                      <select
                        value={r.status}
                        onChange={(e) => handleStatusChange(r.attendance_id, e.target.value)}
                        className={`text-xs font-bold px-2 py-1 rounded-lg border outline-none cursor-pointer ${
                          isPresent ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                          (isAbsent ? 'bg-rose-50 text-rose-800 border-rose-300' :
                          (isOD ? 'bg-blue-50 text-blue-800 border-blue-300' :
                          (isML ? 'bg-amber-50 text-amber-800 border-amber-300' :
                          'bg-yellow-50 text-yellow-800 border-yellow-300')))
                        }`}
                      >
                        <option value="PRESENT">PRESENT</option>
                        <option value="ABSENT">ABSENT</option>
                        <option value="OD">ON DUTY (OD)</option>
                        <option value="ML">MEDICAL LEAVE (ML)</option>
                        <option value="REVIEW">REVIEW REQUIRED</option>
                      </select>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Showing {filteredRecords.length} of {records.length} students. AI predictions are pending faculty sign-off.
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleFinalApprove}
              disabled={isSubmitting}
              className="va-btn-primary text-xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approve & Finalize Attendance</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
