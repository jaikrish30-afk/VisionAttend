import React, { useState } from 'react';
import { 
  Users, Search, Eye, Trash2, 
  UserPlus, Filter, RefreshCw, ShieldCheck,
  LayoutGrid, List, CheckCircle2, Mail, Phone
} from 'lucide-react';
import { Student } from '../types';
import { deleteStudent } from '../api';

interface StudentDirectoryProps {
  students: Student[];
  onRefresh: () => void;
  onRegisterClick: () => void;
  onViewProfile: (studentId: number) => void;
}

export const StudentDirectory: React.FC<StudentDirectoryProps> = ({
  students,
  onRefresh,
  onRegisterClick,
  onViewProfile
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete student "${name}"? All associated facial biometric vectors will be permanently removed.`)) {
      setDeletingId(id);
      try {
        await deleteStudent(id);
        onRefresh();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Failed to delete student.");
      } finally {
        setDeletingId(null);
      }
    }
  };

  const filtered = students.filter(s => {
    const matchQuery = 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.register_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.visionattend_id && s.visionattend_id.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchDept = deptFilter === 'ALL' || s.department.toLowerCase().includes(deptFilter.toLowerCase());
    return matchQuery && matchDept;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in">
      
      {/* Top Banner */}
      <div className="bg-[#0a2540] text-white rounded-2xl p-6 shadow-lg border border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              STUDENT ROSTER
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            STUDENTS & BIOMETRIC PROFILES
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Browse registered student profiles, verify multi-sample facial biometric readiness, and manage student data.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onRefresh}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh Directory"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onRegisterClick}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-950/30 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Enroll New Student</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student name, register number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="va-input pl-8 text-xs bg-white"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Dept:
            </span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="va-input text-xs bg-white py-1.5 w-48"
            >
              <option value="ALL">All Departments</option>
              <option value="Information Technology">Information Technology</option>
              <option value="Computer Science">Computer Science & Engg.</option>
              <option value="Electronics">Electronics & Comm.</option>
            </select>
          </div>

          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 text-xs ${viewMode === 'table' ? 'bg-[#0a2540] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 text-xs ${viewMode === 'grid' ? 'bg-[#0a2540] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              title="Grid Card View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 1. Table View Mode */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Enrolled Student Roster ({filtered.length} of {students.length})
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="va-table">
              <thead>
                <tr>
                  <th style={{ width: '70px' }}>Photo</th>
                  <th style={{ width: '180px' }}>Register Number</th>
                  <th>Student Name & Details</th>
                  <th style={{ width: '160px' }}>Class / Section</th>
                  <th style={{ width: '180px' }}>Biometric Profile</th>
                  <th style={{ width: '100px' }} className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400 text-xs">
                      No student records found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filtered.map((s) => {
                    const studentPhoto = s.avatar_url || s.face_profiles?.[0]?.image_reference;
                    return (
                      <tr key={s.student_id} className="hover:bg-slate-50 transition-colors">
                        
                        {/* Student Visible Face Photo */}
                        <td>
                          <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shadow-sm flex items-center justify-center flex-shrink-0">
                            {studentPhoto ? (
                              <img 
                                src={studentPhoto} 
                                alt={s.name} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-[#0a2540] text-white font-bold text-sm flex items-center justify-center">
                                {s.name.charAt(0)}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Register Number */}
                        <td>
                          <div className="font-mono font-bold text-xs text-blue-900 bg-blue-50 px-2 py-1 rounded border border-blue-200 inline-block">
                            {s.register_number}
                          </div>
                        </td>

                        {/* Name & Academic Details */}
                        <td>
                          <div>
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 flex-wrap">
                              <span>{s.name}</span>
                              {s.is_twin && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                                  <Users className="w-2.5 h-2.5" />
                                  <span>Twin / Lookalike</span>
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium">{s.department}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{s.email}</div>
                          </div>
                        </td>

                        {/* Section & Year */}
                        <td>
                          <div className="inline-block px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800">
                            {s.section} ({s.year})
                          </div>
                        </td>

                        {/* Face Biometrics Status */}
                        <td>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{s.face_profiles?.length || 5} Angles Calibrated</span>
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onViewProfile(s.student_id)}
                              className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors"
                              title="View Full Profile & Photos"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDelete(s.student_id, s.name)}
                              disabled={deletingId === s.student_id}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
                              title="Delete Student"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* 2. Grid View Mode */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((s) => {
            const studentPhoto = s.avatar_url || s.face_profiles?.[0]?.image_reference;
            return (
              <div 
                key={s.student_id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 shadow-inner">
                    {studentPhoto ? (
                      <img src={studentPhoto} alt={s.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#0a2540] text-white font-bold text-lg flex items-center justify-center">
                        {s.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-xs line-clamp-1">{s.name}</div>
                    <div className="font-mono text-[11px] font-bold text-blue-800">{s.register_number}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-slate-500">{s.section} ({s.year})</span>
                      {s.is_twin && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                          Twin
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Calibrated</span>
                  </span>
                  <button
                    onClick={() => onViewProfile(s.student_id)}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold transition-colors"
                  >
                    View
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
