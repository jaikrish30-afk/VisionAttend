import React, { useState, useEffect } from 'react';
import { 
  FileCheck, Stethoscope, Clock, CheckCircle2, XCircle, Search, 
  Filter, Plus, Calendar, AlertCircle, RefreshCw, Trash2, Shield
} from 'lucide-react';
import { ODRecord, MedicalLeaveRecord, Student, User } from '../types';
import { 
  fetchODRecords, createODRecord, reviewODRecord, deleteODRecord,
  fetchMedicalLeaves, createMedicalLeave, reviewMedicalLeave, deleteMedicalLeave
} from '../api';

interface ODManagementProps {
  students: Student[];
  currentUser: User | null;
  onRefresh?: () => void;
}

export const ODManagement: React.FC<ODManagementProps> = ({
  students,
  currentUser,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'OD' | 'ML'>('OD');
  
  // OD state
  const [odRecords, setOdRecords] = useState<ODRecord[]>([]);
  const [mlRecords, setMlRecords] = useState<MedicalLeaveRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Review Modal State
  const [selectedOD, setSelectedOD] = useState<ODRecord | null>(null);
  const [selectedML, setSelectedML] = useState<MedicalLeaveRecord | null>(null);
  const [decisionNotes, setDecisionNotes] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // New Request Form State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newStudentId, setNewStudentId] = useState<number>(students[0]?.student_id || 0);
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newDateTo, setNewDateTo] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newReason, setNewReason] = useState<string>('Paper Presentation at National Technical Symposium');
  const [newEventName, setNewEventName] = useState<string>('National Tech Fest 2026');
  const [newHospital, setNewHospital] = useState<string>('City Medical Center & Hospital');

  const loadData = async () => {
    try {
      setLoading(true);
      const [ods, mls] = await Promise.all([
        fetchODRecords(),
        fetchMedicalLeaves()
      ]);
      setOdRecords(ods);
      setMlRecords(mls);
    } catch (err) {
      console.error('Failed to load OD/ML records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (students.length > 0 && !newStudentId) {
      setNewStudentId(students[0].student_id);
    }
  }, [students, newStudentId]);

  const handleReviewOD = async (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedOD) return;
    setActionLoading(true);
    try {
      await reviewODRecord(selectedOD.od_id, {
        approval_status: status,
        reviewed_by: currentUser?.full_name || 'Faculty Advisor',
        decision_notes: decisionNotes
      });
      setSelectedOD(null);
      setDecisionNotes('');
      loadData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error processing OD review');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviewML = async (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedML) return;
    setActionLoading(true);
    try {
      await reviewMedicalLeave(selectedML.ml_id, {
        approval_status: status,
        reviewed_by: currentUser?.full_name || 'Faculty Advisor',
        decision_notes: decisionNotes
      });
      setSelectedML(null);
      setDecisionNotes('');
      loadData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error processing Medical Leave review');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentId) {
      alert('Please select a student');
      return;
    }
    setActionLoading(true);
    try {
      if (activeTab === 'OD') {
        await createODRecord({
          student_id: Number(newStudentId),
          date: newDate,
          event_name: newEventName,
          reason: newReason,
          approved_by: currentUser?.full_name || 'Faculty In-Charge'
        });
      } else {
        await createMedicalLeave({
          student_id: Number(newStudentId),
          date_from: newDate,
          date_to: newDateTo,
          hospital_name: newHospital,
          reason: newReason,
          reviewed_by: currentUser?.full_name || 'Faculty In-Charge'
        });
      }
      setShowCreateModal(false);
      loadData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error submitting request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteOD = async (odId: number) => {
    if (!window.confirm('Delete this On-Duty record?')) return;
    try {
      await deleteODRecord(odId);
      loadData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error deleting OD');
    }
  };

  const handleDeleteML = async (mlId: number) => {
    if (!window.confirm('Delete this Medical Leave record?')) return;
    try {
      await deleteMedicalLeave(mlId);
      loadData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error deleting Medical Leave');
    }
  };

  // Filtered lists
  const filteredODs = odRecords.filter(od => {
    const matchStatus = statusFilter === 'ALL' || od.approval_status === statusFilter;
    const matchSearch = 
      (od.student_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (od.register_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      od.reason.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const filteredMLs = mlRecords.filter(ml => {
    const matchStatus = statusFilter === 'ALL' || ml.approval_status === statusFilter;
    const matchSearch = 
      (ml.student_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ml.register_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      ml.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ml.hospital_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16 animate-fade-in">
      
      {/* Top Banner */}
      <div className="bg-[#0a2540] text-white rounded-2xl p-6 shadow-lg border border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              ACADEMIC EXEMPTIONS
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            ON-DUTY (OD) & MEDICAL LEAVE (ML)
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Approved OD and Medical Leave records automatically apply to classroom attendance sessions on matching dates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-900/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Apply {activeTab === 'OD' ? 'On-Duty' : 'Medical Leave'}</span>
          </button>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('OD')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'OD'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>On-Duty (OD) Records ({odRecords.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ML')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'ML'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Medical Leave (ML) Records ({mlRecords.length})</span>
          </button>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Table Container Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Table Filters Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="flex flex-wrap items-center gap-1.5">
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab === 'OD' ? 'OD' : 'Medical Leave'} records...`}
              className="va-input pl-8 text-xs bg-white"
            />
          </div>

        </div>

        {/* OD Table View */}
        {activeTab === 'OD' && (
          <div className="overflow-x-auto">
            <table className="va-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Register No</th>
                  <th>Student Name</th>
                  <th>Date</th>
                  <th>Event / Activity</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Approved By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredODs.length > 0 ? (
                  filteredODs.map((od, idx) => (
                    <tr key={od.od_id}>
                      <td className="text-slate-400 font-mono text-xs">{idx + 1}</td>
                      <td className="font-mono font-bold text-xs text-slate-900">{od.register_number}</td>
                      <td>
                        <div className="font-semibold text-slate-900">{od.student_name}</div>
                        <div className="text-[11px] text-slate-400">{od.year_section}</div>
                      </td>
                      <td className="font-mono text-xs font-semibold text-blue-900">{od.date}</td>
                      <td className="font-medium text-xs text-slate-800">{od.event_name}</td>
                      <td className="text-xs text-slate-600 max-w-xs truncate" title={od.reason}>{od.reason}</td>
                      <td>
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                          od.approval_status === 'APPROVED' ? 'va-badge-present' : (od.approval_status === 'REJECTED' ? 'va-badge-absent' : 'va-badge-review')
                        }`}>
                          {od.approval_status}
                        </span>
                      </td>
                      <td className="text-xs text-slate-500">{od.approved_by}</td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedOD(od)}
                            className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 transition-colors cursor-pointer"
                          >
                            Review
                          </button>
                          <button
                            onClick={() => handleDeleteOD(od.od_id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete OD"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-xs text-slate-400">
                      No On-Duty records found matching current criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Medical Leave Table View */}
        {activeTab === 'ML' && (
          <div className="overflow-x-auto">
            <table className="va-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Register No</th>
                  <th>Student Name</th>
                  <th>Leave Dates</th>
                  <th>Hospital / Clinic</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Reviewed By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMLs.length > 0 ? (
                  filteredMLs.map((ml, idx) => (
                    <tr key={ml.ml_id}>
                      <td className="text-slate-400 font-mono text-xs">{idx + 1}</td>
                      <td className="font-mono font-bold text-xs text-slate-900">{ml.register_number}</td>
                      <td>
                        <div className="font-semibold text-slate-900">{ml.student_name}</div>
                        <div className="text-[11px] text-slate-400">{ml.year_section}</div>
                      </td>
                      <td className="font-mono text-xs font-semibold text-amber-900">
                        {ml.date_from} → {ml.date_to}
                      </td>
                      <td className="font-medium text-xs text-slate-800">{ml.hospital_name}</td>
                      <td className="text-xs text-slate-600 max-w-xs truncate" title={ml.reason}>{ml.reason}</td>
                      <td>
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                          ml.approval_status === 'APPROVED' ? 'va-badge-present' : (ml.approval_status === 'REJECTED' ? 'va-badge-absent' : 'va-badge-review')
                        }`}>
                          {ml.approval_status}
                        </span>
                      </td>
                      <td className="text-xs text-slate-500">{ml.reviewed_by}</td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedML(ml)}
                            className="px-2.5 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-200 transition-colors cursor-pointer"
                          >
                            Review
                          </button>
                          <button
                            onClick={() => handleDeleteML(ml.ml_id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Medical Leave"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-xs text-slate-400">
                      No Medical Leave records found matching current criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Apply OD / ML Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-[#0a2540] text-white px-5 py-4 flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-tight">
                Apply {activeTab === 'OD' ? 'On-Duty (OD) Exemption' : 'Medical Leave (ML)'}
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-5 space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Select Student
                </label>
                <select
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(Number(e.target.value))}
                  className="va-input text-xs"
                  required
                >
                  {students.map(s => (
                    <option key={s.student_id} value={s.student_id}>
                      {s.register_number} - {s.name} ({s.department})
                    </option>
                  ))}
                </select>
              </div>

              {activeTab === 'OD' ? (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Event / Activity Name
                    </label>
                    <input
                      type="text"
                      value={newEventName}
                      onChange={(e) => setNewEventName(e.target.value)}
                      className="va-input text-xs"
                      placeholder="e.g. National Technical Symposium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="va-input text-xs"
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Date From
                      </label>
                      <input
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className="va-input text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Date To
                      </label>
                      <input
                        type="date"
                        value={newDateTo}
                        onChange={(e) => setNewDateTo(e.target.value)}
                        className="va-input text-xs"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Hospital / Clinic Name
                    </label>
                    <input
                      type="text"
                      value={newHospital}
                      onChange={(e) => setNewHospital(e.target.value)}
                      className="va-input text-xs"
                      required
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Reason / Description
                </label>
                <textarea
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  rows={2}
                  className="va-input text-xs"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="va-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="va-btn-primary text-xs"
                >
                  {actionLoading ? 'Saving...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal for OD */}
      {selectedOD && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Review On-Duty Request</h3>
            <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1">
              <div><span className="font-bold">Student:</span> {selectedOD.student_name} ({selectedOD.register_number})</div>
              <div><span className="font-bold">Event:</span> {selectedOD.event_name}</div>
              <div><span className="font-bold">Date:</span> {selectedOD.date}</div>
              <div><span className="font-bold">Reason:</span> {selectedOD.reason}</div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Decision Notes</label>
              <input
                type="text"
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder="Optional decision remarks..."
                className="va-input text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setSelectedOD(null)} className="va-btn-secondary text-xs">Cancel</button>
              <button
                onClick={() => handleReviewOD('REJECTED')}
                disabled={actionLoading}
                className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
              >
                Reject
              </button>
              <button
                onClick={() => handleReviewOD('APPROVED')}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                Approve OD
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal for ML */}
      {selectedML && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Review Medical Leave Request</h3>
            <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1">
              <div><span className="font-bold">Student:</span> {selectedML.student_name} ({selectedML.register_number})</div>
              <div><span className="font-bold">Hospital:</span> {selectedML.hospital_name}</div>
              <div><span className="font-bold">Dates:</span> {selectedML.date_from} → {selectedML.date_to}</div>
              <div><span className="font-bold">Reason:</span> {selectedML.reason}</div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Decision Notes</label>
              <input
                type="text"
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder="Optional medical verification notes..."
                className="va-input text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setSelectedML(null)} className="va-btn-secondary text-xs">Cancel</button>
              <button
                onClick={() => handleReviewML('REJECTED')}
                disabled={actionLoading}
                className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
              >
                Reject
              </button>
              <button
                onClick={() => handleReviewML('APPROVED')}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                Approve ML
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
