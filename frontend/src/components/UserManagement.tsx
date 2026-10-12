import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Trash2, Shield, UserCheck, KeyRound, 
  CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react';
import { User } from '../types';
import { fetchUsers, createClassUser, deleteUser } from '../api';

interface UserManagementProps {
  currentUser: User;
}

export const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    password: '',
    role: 'CLASS_USER',
    assigned_department: 'Department of Information Technology',
    assigned_year: 'II Year',
    assigned_section: 'IT-2D'
  });

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await fetchUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load user accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!formData.username || !formData.password || !formData.full_name) {
      setError('Please fill in all required credentials.');
      return;
    }

    try {
      const newUser = await createClassUser(formData);
      setSuccessMsg(`User "${newUser.full_name}" (${newUser.username}) created successfully.`);
      setShowAddModal(false);
      setFormData({
        username: '',
        full_name: '',
        password: '',
        role: 'CLASS_USER',
        assigned_department: 'Department of Information Technology',
        assigned_year: 'II Year',
        assigned_section: 'IT-2D'
      });
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user.');
    }
  };

  const handleDelete = async (userId: number, name: string) => {
    if (confirm(`Are you sure you want to revoke account for "${name}"?`)) {
      try {
        await deleteUser(userId);
        loadUsers();
      } catch (err: any) {
        alert(err.message || 'Failed to delete user.');
      }
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in">
      
      {/* Top Banner */}
      <div className="bg-[#0a2540] text-white rounded-2xl p-6 shadow-lg border border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              ACCESS CONTROL
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            SYSTEM USERS & FACULTY ACCOUNTS
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Manage authenticated portal accounts and assigned departmental/class scopes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadUsers}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh Users"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-950/30 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Faculty Account</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="va-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Role</th>
                <th>Assigned Department</th>
                <th>Assigned Class</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.user_id}>
                  <td>
                    <div className="font-bold text-xs text-slate-900">{u.full_name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{u.username}</div>
                  </td>
                  <td>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-200">
                      {u.role}
                    </span>
                  </td>
                  <td className="text-xs text-slate-600">{u.assigned_department}</td>
                  <td className="text-xs font-semibold text-slate-800">{u.assigned_year} / {u.assigned_section}</td>
                  <td>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold va-badge-present">
                      Active
                    </span>
                  </td>
                  <td className="text-right">
                    {u.username !== 'admin' && (
                      <button
                        onClick={() => handleDelete(u.user_id, u.full_name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Create Faculty / User Account</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="va-input text-xs"
                  placeholder="e.g. Dr. A. Sharma"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="va-input text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="va-input text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Department</label>
                <input
                  type="text"
                  value={formData.assigned_department}
                  onChange={(e) => setFormData({ ...formData, assigned_department: e.target.value })}
                  className="va-input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Year</label>
                  <input
                    type="text"
                    value={formData.assigned_year}
                    onChange={(e) => setFormData({ ...formData, assigned_year: e.target.value })}
                    className="va-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Section</label>
                  <input
                    type="text"
                    value={formData.assigned_section}
                    onChange={(e) => setFormData({ ...formData, assigned_section: e.target.value })}
                    className="va-input text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddModal(false)} className="va-btn-secondary text-xs">Cancel</button>
                <button type="submit" className="va-btn-primary text-xs">Save Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
