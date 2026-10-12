import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, Download, Printer, Search, 
  CheckCircle2, XCircle, BarChart3, Calendar, 
  Layers, Sparkles, RefreshCw, FileText,
  ShieldCheck, Users, Eye, AlertCircle, History
} from 'lucide-react';
import { fetchReports, fetchVerificationLogs } from '../api';
import { VerificationLog } from '../types';

export const Reports: React.FC = () => {
  const [reportsData, setReportsData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [reportTab, setReportTab] = useState<'student' | 'audit_log'>('student');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [auditLogs, setAuditLogs] = useState<VerificationLog[]>([]);
  const [auditLoading, setAuditLoading] = useState<boolean>(false);

  const loadData = () => {
    setLoading(true);
    fetchReports()
      .then(data => setReportsData(data))
      .catch(err => console.error("Error loading reports data:", err))
      .finally(() => setLoading(false));
  };

  const loadAuditLogs = () => {
    setAuditLoading(true);
    fetchVerificationLogs({ limit: 100 })
      .then(logs => setAuditLogs(logs))
      .catch(err => console.error("Error loading audit logs:", err))
      .finally(() => setAuditLoading(false));
  };

  useEffect(() => {
    loadData();
    loadAuditLogs();
  }, []);

  const handleDownloadPDF = () => {
    window.open('/api/reports/export-pdf', '_blank');
  };

  const handleDownloadXLSX = () => {
    window.location.href = '/api/reports/export-xlsx';
  };

  const handleDownloadCSV = () => {
    window.location.href = '/api/reports/export-csv';
  };

  const studentStats = reportsData?.student_stats || [];

  const filteredStudentStats = studentStats.filter((s: any) => 
    (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.visionattend_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.register_number || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAuditLogs = auditLogs.filter((log: VerificationLog) =>
    (log.student_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.register_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.verified_by || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.original_ai_prediction || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.final_decision || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.correction_reason || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in">
      
      {/* Top Banner */}
      <div className="bg-[#0a2540] text-white rounded-2xl p-6 shadow-lg border border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              OFFICIAL ACADEMIC REGISTRY
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            ATTENDANCE REPORTS & AUDIT TRAIL
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Generate institutional attendance exports and review tamper-proof twin & verification audit logs.
          </p>
        </div>

        {/* Real Download Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDownloadPDF}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-950/30 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>DOWNLOAD PDF</span>
          </button>

          <button
            onClick={handleDownloadXLSX}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/30 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>DOWNLOAD EXCEL (XLSX)</span>
          </button>

          <button
            onClick={handleDownloadCSV}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-950/30 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>DOWNLOAD CSV</span>
          </button>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
        
        {/* Sub Navigation Tabs */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReportTab('student')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                reportTab === 'student'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
              }`}
            >
              Student Attendance Cumulative
            </button>

            <button
              onClick={() => { setReportTab('audit_log'); loadAuditLogs(); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                reportTab === 'audit_log'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Twin & Verification Audit Trail ({auditLogs.length})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={reportTab === 'student' ? "Search student or register no..." : "Search audit log, reviewer, decision..."}
              className="va-input pl-8 text-xs bg-white"
            />
          </div>

        </div>

        {/* Table View */}
        {reportTab === 'student' ? (
          <div className="overflow-x-auto">
            <table className="va-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>VisionAttend ID</th>
                  <th>Register No</th>
                  <th>Student Name</th>
                  <th>Department / Class</th>
                  <th>Total Classes</th>
                  <th>Attended</th>
                  <th>OD / ML Count</th>
                  <th>Attendance %</th>
                  <th>Biometric Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudentStats.length > 0 ? (
                  filteredStudentStats.map((s: any, idx: number) => {
                    const pct = s.attendance_percentage || 0;
                    const isLow = pct < 75;

                    return (
                      <tr key={s.student_id}>
                        <td className="text-slate-400 font-mono text-xs">{idx + 1}</td>
                        <td className="font-mono text-xs font-semibold text-blue-900">{s.visionattend_id}</td>
                        <td className="font-mono font-bold text-xs text-slate-900">{s.register_number}</td>
                        <td className="font-semibold text-xs text-slate-900">{s.name}</td>
                        <td className="text-xs text-slate-500">{s.department} • {s.year_section}</td>
                        <td className="text-xs font-mono">{s.total_classes}</td>
                        <td className="text-xs font-mono font-bold text-emerald-700">{s.attended}</td>
                        <td>
                          <div className="flex items-center gap-1 text-[11px] font-mono">
                            {s.od_count > 0 && <span className="px-1.5 py-0.2 rounded va-badge-od">OD: {s.od_count}</span>}
                            {s.ml_count > 0 && <span className="px-1.5 py-0.2 rounded va-badge-ml">ML: {s.ml_count}</span>}
                            {s.od_count === 0 && s.ml_count === 0 && <span className="text-slate-400">—</span>}
                          </div>
                        </td>
                        <td>
                          <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                            isLow ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {pct}%
                          </span>
                        </td>
                        <td>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold va-badge-present">
                            {s.profile_quality || 'Ready'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-xs text-slate-400">
                      {loading ? 'Loading report data...' : 'No student records found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="va-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Session #</th>
                  <th>Target Student</th>
                  <th>Original AI Prediction</th>
                  <th>Final Faculty Decision</th>
                  <th>Secondary Verification</th>
                  <th>Authorized Reviewer</th>
                  <th>Correction Reason & Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredAuditLogs.length > 0 ? (
                  filteredAuditLogs.map((log: VerificationLog) => {
                    const timeFormatted = log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A';
                    return (
                      <tr key={log.log_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {timeFormatted}
                        </td>
                        <td className="font-mono text-xs font-bold text-slate-700">
                          #{log.session_id || 'N/A'}
                        </td>
                        <td>
                          <div className="font-semibold text-xs text-slate-900">{log.student_name || 'N/A'}</div>
                          <div className="font-mono text-[10px] text-slate-500">{log.register_number || ''}</div>
                        </td>
                        <td>
                          <div className="text-xs font-medium text-slate-800">
                            {log.original_ai_prediction || 'N/A'}
                          </div>
                          <div className="text-[10px] font-mono text-indigo-600">
                            Sim: {log.match_score ? `${log.match_score}%` : 'N/A'}
                          </div>
                        </td>
                        <td>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.final_decision?.includes('CONFIRMED')
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : log.final_decision === 'MARKED_ABSENT'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                          }`}>
                            {log.final_decision || log.status || 'RESOLVED'}
                          </span>
                        </td>
                        <td>
                          <div className="text-[11px] font-semibold text-slate-700">
                            {log.secondary_verification_method?.replace(/_/g, ' ') || 'FACULTY REVIEW'}
                          </div>
                        </td>
                        <td className="text-xs text-slate-700 font-medium">
                          {log.verified_by || 'Faculty'}
                        </td>
                        <td className="text-xs text-slate-600 max-w-xs">
                          {log.correction_reason || log.notes || 'Routine faculty validation'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                      {auditLoading ? 'Loading verification audit logs...' : 'No verification audit entries recorded yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
};
