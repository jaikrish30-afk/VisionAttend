import React, { useState, useEffect } from 'react';
import { 
  Shield, User as UserIcon, Lock, 
  LogIn, UserPlus, CheckCircle2, AlertTriangle, 
  GraduationCap, Building2, Calendar, BookOpen,
  ArrowRight, Key, Sparkles, Check, School
} from 'lucide-react';
import { User, ClassSection } from '../types';
import { loginUser, registerUser, fetchClassUsers } from '../api';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLoginSuccess: (user: User) => void;
  isStandalone?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  isStandalone = false
}) => {
  // Mode: 'LOGIN' or 'REGISTER'
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login Subtab: 'CLASS' or 'ADMIN'
  const [loginSubtab, setLoginSubtab] = useState<'CLASS' | 'ADMIN'>('CLASS');

  // Form Fields - Login
  const [username, setUsername] = useState('faculty_user');
  const [password, setPassword] = useState('password123');

  // Form Fields - Register
  const [regRole, setRegRole] = useState<'CLASS_USER' | 'ADMIN'>('CLASS_USER');
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regDepartment, setRegDepartment] = useState('Department of Information Technology');
  const [regYear, setRegYear] = useState('II Year');
  const [regSection, setRegSection] = useState('IT-2D');
  const [isCustomClass, setIsCustomClass] = useState(false);
  const [customClassName, setCustomClassName] = useState('');

  // Available classes and users from backend
  const [availableClasses, setAvailableClasses] = useState<ClassSection[]>([]);
  const [classUsers, setClassUsers] = useState<User[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('IT - 2D');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load available classes & class-users
  useEffect(() => {
    fetchClassUsers()
      .then(data => {
        if (data.classes && data.classes.length > 0) {
          setAvailableClasses(data.classes);
        }
        if (data.users && data.users.length > 0) {
          setClassUsers(data.users);
        }
      })
      .catch(err => console.error("Failed to load class users:", err));
  }, [isOpen]);

  if (!isOpen && !isStandalone) return null;

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const user = await loginUser({ username, password });
      setSuccessMsg(`Welcome back, ${user.full_name}!`);
      setTimeout(() => {
        onLoginSuccess(user);
        if (onClose) onClose();
      }, 500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials. Please check your username and password.');
    } finally {
      setLoading(false);
    }
  };

  // Handle 1-Click Quick Login
  const handleQuickLogin = async (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setLoading(true);
    setError(null);

    try {
      const user = await loginUser({ username: u, password: p });
      setSuccessMsg(`Welcome back, ${user.full_name}!`);
      setTimeout(() => {
        onLoginSuccess(user);
        if (onClose) onClose();
      }, 400);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with selected account.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    const finalSection = isCustomClass ? customClassName.trim() : regSection;
    if (regRole === 'CLASS_USER' && !finalSection) {
      setError('Please specify the Class / Section');
      return;
    }

    setLoading(true);
    try {
      const newUser = await registerUser({
        username: regUsername.trim(),
        password: regPassword,
        full_name: regFullName.trim(),
        email: regEmail.trim() || undefined,
        role: regRole,
        assigned_department: regRole === 'ADMIN' ? 'ALL DEPARTMENTS' : regDepartment,
        assigned_year: regRole === 'ADMIN' ? 'ALL' : regYear,
        assigned_section: regRole === 'ADMIN' ? 'ALL' : finalSection
      });

      setSuccessMsg(`Account registered successfully for ${newUser.full_name}! Signing in...`);
      setTimeout(() => {
        onLoginSuccess(newUser);
        if (onClose) onClose();
      }, 600);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={isStandalone ? "min-h-screen bg-slate-900 flex items-center justify-center p-4" : "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in"}>
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header Banner */}
        <div className="bg-[#0a2540] p-6 text-white relative border-b border-blue-900/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20 border border-white/10">
                VA
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-white tracking-tight">VISIONATTEND</h2>
                  <span className="text-[10px] bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-blue-400/30">
                    PORTAL ACCESS
                  </span>
                </div>
                <p className="text-xs text-blue-200/90 font-medium mt-0.5">
                  Institutional AI Attendance Management System • Team VisionRaiders
                </p>
              </div>
            </div>

            {onClose && !isStandalone && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors text-sm"
              >
                ✕
              </button>
            )}
          </div>

          {/* Mode Switcher Tabs: Login vs Register */}
          <div className="mt-5 grid grid-cols-2 p-1 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
            <button
              type="button"
              onClick={() => { setAuthMode('LOGIN'); setError(null); setSuccessMsg(null); }}
              className={`py-2 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                authMode === 'LOGIN'
                  ? 'bg-white text-blue-950 shadow-md'
                  : 'text-blue-100 hover:text-white hover:bg-white/5'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In to Class / Admin</span>
            </button>

            <button
              type="button"
              onClick={() => { setAuthMode('REGISTER'); setError(null); setSuccessMsg(null); }}
              className={`py-2 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                authMode === 'REGISTER'
                  ? 'bg-white text-blue-950 shadow-md'
                  : 'text-blue-100 hover:text-white hover:bg-white/5'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Register New Class / User</span>
            </button>
          </div>
        </div>

        {/* Modal Body Container */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* Status Messages */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2.5 animate-shake">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 1: LOGIN MODE                                         */}
          {/* ========================================================= */}
          {authMode === 'LOGIN' && (
            <div className="space-y-5">
              
              {/* Login Subtab Selector */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <button
                  type="button"
                  onClick={() => { setLoginSubtab('CLASS'); setUsername('faculty_user'); setPassword('password123'); }}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    loginSubtab === 'CLASS'
                      ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  <span>Class Faculty / Representative Login</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setLoginSubtab('ADMIN'); setUsername('admin'); setPassword('password123'); }}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    loginSubtab === 'ADMIN'
                      ? 'bg-purple-50 border-purple-300 text-purple-900 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Shield className="w-4 h-4 text-purple-600" />
                  <span>Institution Admin Login</span>
                </button>
              </div>

              {/* Subtab A: CLASS-BASED QUICK LOGIN & CREDENTIALS */}
              {loginSubtab === 'CLASS' && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <School className="w-3.5 h-3.5 text-blue-600" />
                        <span>Select Your Class for Instant Access:</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium">Click card to quick sign in</span>
                    </div>

                    {/* Class Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      
                      {/* IT - 2D Faculty */}
                      <button
                        type="button"
                        onClick={() => handleQuickLogin('faculty_user', 'password123')}
                        className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                          username === 'faculty_user'
                            ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-sm'
                            : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/80 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
                            2D
                          </div>
                          <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                            FACULTY
                          </span>
                        </div>
                        <div className="mt-2 font-bold text-slate-900 text-xs">IT - 2D</div>
                        <div className="text-[11px] text-slate-600 font-medium truncate">Dr. S. Ramanathan</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">faculty_user / password123</div>
                      </button>

                      {/* IT - 2A Faculty */}
                      <button
                        type="button"
                        onClick={() => handleQuickLogin('faculty_it2a', 'password123')}
                        className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                          username === 'faculty_it2a'
                            ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-sm'
                            : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/80 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
                            2A
                          </div>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                            FACULTY
                          </span>
                        </div>
                        <div className="mt-2 font-bold text-slate-900 text-xs">IT - 2A</div>
                        <div className="text-[11px] text-slate-600 font-medium truncate">Prof. K. Anitha</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">faculty_it2a / password123</div>
                      </button>

                      {/* CSE - 3A Faculty */}
                      <button
                        type="button"
                        onClick={() => handleQuickLogin('faculty_cse3a', 'password123')}
                        className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                          username === 'faculty_cse3a'
                            ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-sm'
                            : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/80 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
                            3A
                          </div>
                          <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded">
                            FACULTY
                          </span>
                        </div>
                        <div className="mt-2 font-bold text-slate-900 text-xs">CSE - 3A</div>
                        <div className="text-[11px] text-slate-600 font-medium truncate">Dr. M. Vignesh</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">faculty_cse3a / password123</div>
                      </button>

                      {/* IT - 2D Class Representative */}
                      <button
                        type="button"
                        onClick={() => handleQuickLogin('rep_it2d', 'password123')}
                        className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                          username === 'rep_it2d'
                            ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-sm'
                            : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/80 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="w-8 h-8 rounded-lg bg-amber-600 text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
                            CR
                          </div>
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                            CLASS REP
                          </span>
                        </div>
                        <div className="mt-2 font-bold text-slate-900 text-xs">IT - 2D (Student Rep)</div>
                        <div className="text-[11px] text-slate-600 font-medium truncate">Prem Ranjan Kumar</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">rep_it2d / password123</div>
                      </button>

                    </div>
                  </div>
                </div>
              )}

              {/* Subtab B: ADMIN LOGIN */}
              {loginSubtab === 'ADMIN' && (
                <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-200 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center shadow-md">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-purple-950 text-xs">Institution Administrator Console</h4>
                      <p className="text-[11px] text-purple-700">Full control over all classes, system config, models, and audit logs.</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin', 'password123')}
                    className="w-full py-2 px-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>1-Click Sign In as System Admin (admin / password123)</span>
                  </button>
                </div>
              )}

              {/* Standard Username/Password Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-3 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Or enter credentials manually:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Username / Portal ID
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. faculty_user or admin"
                        className="va-input pl-9 text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="va-input pl-9 text-xs"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3">
                  <span className="text-[11px] text-slate-500">
                    Need an account for your class?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthMode('REGISTER')}
                      className="text-blue-600 font-bold hover:underline"
                    >
                      Register here
                    </button>
                  </span>

                  <div className="flex items-center gap-2">
                    {onClose && !isStandalone && (
                      <button
                        type="button"
                        onClick={onClose}
                        className="va-btn-secondary text-xs"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={loading}
                      className="va-btn-primary text-xs flex items-center gap-1.5 shadow-md"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>{loading ? 'Signing In...' : 'Sign In'}</span>
                    </button>
                  </div>
                </div>
              </form>

            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: REGISTER MODE                                      */}
          {/* ========================================================= */}
          {authMode === 'REGISTER' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              
              {/* Role Selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                  Account Type & Responsibility
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRegRole('CLASS_USER')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      regRole === 'CLASS_USER'
                        ? 'bg-blue-50 border-blue-500 text-blue-950 ring-2 ring-blue-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <GraduationCap className="w-4 h-4 text-blue-600" />
                      <span>Class Faculty / Representative</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Manage attendance for a specific class or section</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegRole('ADMIN')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      regRole === 'ADMIN'
                        ? 'bg-purple-50 border-purple-500 text-purple-950 ring-2 ring-purple-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <Shield className="w-4 h-4 text-purple-600" />
                      <span>Institution Administrator</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Full system management across all departments</p>
                  </button>
                </div>
              </div>

              {/* Class & Department Details (If Class User) */}
              {regRole === 'CLASS_USER' && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Class & Academic Assignment</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCustomClass(!isCustomClass)}
                      className="text-[11px] text-blue-600 font-bold hover:underline"
                    >
                      {isCustomClass ? "Select Existing Class" : "+ Add New Custom Class"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Academic Year
                      </label>
                      <select
                        value={regYear}
                        onChange={(e) => setRegYear(e.target.value)}
                        className="va-input text-xs"
                      >
                        <option value="I Year">I Year</option>
                        <option value="II Year">II Year</option>
                        <option value="III Year">III Year</option>
                        <option value="IV Year">IV Year</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Department
                      </label>
                      <select
                        value={regDepartment}
                        onChange={(e) => setRegDepartment(e.target.value)}
                        className="va-input text-xs"
                      >
                        <option value="Department of Information Technology">Department of Information Technology</option>
                        <option value="Department of Computer Science & Engineering">Department of Computer Science & Engineering</option>
                        <option value="Department of Electronics & Communication">Department of Electronics & Communication</option>
                        <option value="Department of Mechanical Engineering">Department of Mechanical Engineering</option>
                        <option value="Department of Civil Engineering">Department of Civil Engineering</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Class / Section
                      </label>
                      {isCustomClass ? (
                        <input
                          type="text"
                          value={customClassName}
                          onChange={(e) => setCustomClassName(e.target.value)}
                          placeholder="e.g. MECH - 4A or IT-2D"
                          className="va-input text-xs font-semibold"
                          required
                        />
                      ) : (
                        <select
                          value={regSection}
                          onChange={(e) => setRegSection(e.target.value)}
                          className="va-input text-xs font-semibold"
                        >
                          <option value="IT-2D">IT - 2D</option>
                          <option value="IT-2A">IT - 2A</option>
                          <option value="CSE-3A">CSE - 3A</option>
                          <option value="ECE-1B">ECE - 1B</option>
                          <option value="MECH-2A">MECH - 2A</option>
                          <option value="AIDS-3B">AIDS - 3B</option>
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Personal & Login Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Full Name (with Title)
                  </label>
                  <input
                    type="text"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="e.g. Prof. Rajesh Kumar or Prem Ranjan (CR)"
                    className="va-input text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Username / Portal ID
                  </label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="e.g. faculty_mech4a"
                    className="va-input text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Official Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="faculty@visionattend.internal"
                    className="va-input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Create Password
                  </label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="va-input text-xs"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="va-input text-xs"
                    required
                  />
                </div>
              </div>

              {/* Registration Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-[11px] text-slate-500">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode('LOGIN')}
                    className="text-blue-600 font-bold hover:underline"
                  >
                    Sign In
                  </button>
                </span>

                <div className="flex items-center gap-2">
                  {onClose && !isStandalone && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="va-btn-secondary text-xs"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="va-btn-primary text-xs flex items-center gap-1.5 shadow-md"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{loading ? 'Creating Account...' : 'Register & Enter Class'}</span>
                  </button>
                </div>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );
};
