import React, { useState } from 'react';
import { 
  Scan, LayoutDashboard, Video, Users, UserPlus, 
  FileText, Settings as SettingsIcon, LogOut, Shield, 
  FileCheck, BookOpen, CheckCircle2, Menu, X
} from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User | null;
  onLogout: () => void;
  onOpenLogin: () => void;
  totalStudents: number;
  onStartAttendance: () => void;
  onReplaySplash?: () => void;
  pendingReviews?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
  onOpenLogin,
  totalStudents,
  onStartAttendance,
  onReplaySplash,
  pendingReviews = 0
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'enroll', label: 'Enrollment', icon: UserPlus },
    { id: 'sessions', label: 'Sessions', icon: Video, iconColor: 'text-cyan-400' },
    { id: 'review', label: 'Review', icon: CheckCircle2, iconColor: 'text-amber-400', badge: pendingReviews },
    { id: 'od-ml', label: 'OD / Leave', icon: FileCheck, iconColor: 'text-indigo-400' },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'classes', label: 'Classes', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0a2540] border-b border-[#1e3a8a]/40 shadow-md">
      
      {/* Institutional Top Bar */}
      <div className="bg-[#07192d] border-b border-[#132d4b] px-4 py-1.5 text-[11px] text-slate-300">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-blue-400 tracking-wider uppercase flex items-center gap-1.5">
              <Scan className="w-3.5 h-3.5 text-blue-400" />
              VISIONATTEND
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400 font-medium hidden sm:inline">
              AI-Assisted Classroom Attendance System • <span className="text-blue-300 font-semibold">TEAM: VISIONRAIDERS</span>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {onReplaySplash && (
              <button
                onClick={onReplaySplash}
                className="px-2 py-0.5 rounded bg-blue-950/60 hover:bg-blue-900 text-cyan-300 text-[10px] font-medium border border-cyan-800/40 transition-colors hidden md:inline-flex items-center gap-1 cursor-pointer"
                title="Replay Brand Intro Splash"
              >
                <span>Brand Intro</span>
              </button>
            )}

            {currentUser ? (
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${
                  currentUser.role === 'ADMIN'
                    ? 'bg-purple-900/60 text-purple-200 border-purple-700/50'
                    : 'bg-blue-900/60 text-blue-200 border-blue-700/50'
                }`}>
                  <Shield className="w-3 h-3 text-blue-400" />
                  {currentUser.role === 'ADMIN' ? 'ADMINISTRATOR' : `CLASS: ${currentUser.assigned_section || 'IT-2D'}`}
                </span>
                
                <span className="text-white font-semibold text-xs hidden md:inline truncate max-w-[140px]">
                  {currentUser.full_name}
                </span>

                <button
                  onClick={onOpenLogin}
                  className="px-2 py-0.5 rounded bg-blue-950/80 hover:bg-blue-900 text-blue-300 hover:text-white text-[10px] font-medium border border-blue-800 transition-colors cursor-pointer"
                  title="Switch to another class or admin account"
                >
                  Switch Class / Account
                </button>

                <button
                  onClick={onLogout}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-rose-900/80 text-slate-300 hover:text-rose-200 text-[10px] font-medium flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="px-3 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold tracking-wider transition-colors shadow-sm cursor-pointer"
              >
                SIGN IN / REGISTER
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 gap-3">
          
          {/* Brand Logo & Scope */}
          <div 
            className="flex items-center gap-2.5 cursor-pointer group shrink-0" 
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 p-0.5 shadow-sm group-hover:shadow-cyan-500/20 transition-all flex items-center justify-center">
              <div className="w-full h-full bg-[#0a2540] rounded-[6px] flex items-center justify-center">
                <Scan className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-sm font-extrabold text-white tracking-tight group-hover:text-cyan-300 transition-colors">
                  VisionAttend
                </span>
                <span className="text-[9px] px-1 py-0.2 rounded font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  AI
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium mt-0.5 whitespace-nowrap">
                {currentUser?.role === 'CLASS_USER' 
                  ? `${currentUser.assigned_section || 'IT-2D'} Scope` 
                  : `Registry (${totalStudents})`}
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-2.5 xl:px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-950/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${item.iconColor && !isActive ? item.iconColor : ''}`} />
                  <span>{item.label}</span>
                  {item.badge && item.badge > 0 ? (
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 font-mono animate-pulse">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          {/* Actions & Mobile Trigger */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onStartAttendance}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <Video className="w-3.5 h-3.5" />
              <span>START ATTENDANCE</span>
            </button>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white lg:hidden border border-slate-700 transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile / Tablet Responsive Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#132d4b] bg-[#07192d] px-4 py-3 space-y-1 shadow-xl">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
            Navigation Menu
          </div>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-3 py-2 rounded-lg flex items-center justify-between text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${item.iconColor && !isActive ? item.iconColor : ''}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 font-mono">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
