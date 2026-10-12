import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { LiveAttendance } from './components/LiveAttendance';
import { FacultyVerification } from './components/FacultyVerification';
import { LowConfidenceReview } from './components/LowConfidenceReview';
import { StudentRegistration } from './components/StudentRegistration';
import { StudentDirectory } from './components/StudentDirectory';
import { ODManagement } from './components/ODManagement';
import { AttendanceHistory } from './components/AttendanceHistory';
import { Reports } from './components/Reports';
import { ClassManagement } from './components/ClassManagement';
import { Settings } from './components/Settings';
import { StudentProfileModal } from './components/StudentProfileModal';
import { SessionDetailModal } from './components/SessionDetailModal';
import { StartSessionModal } from './components/StartSessionModal';
import { LoginModal } from './components/LoginModal';
import { SplashScreen } from './components/SplashScreen';

import { Student, AttendanceSession, DashboardStats, User } from './types';
import { fetchDashboardStats, fetchStudents, fetchSession, fetchSessions } from './api';

const DEFAULT_USER: User = {
  user_id: 2,
  username: 'faculty_user',
  full_name: 'Dr. S. Ramanathan',
  role: 'CLASS_USER',
  assigned_department: 'Department of Information Technology',
  assigned_year: 'II Year',
  assigned_section: 'IT-2D',
  is_active: true,
  created_at: new Date().toISOString()
};

export function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Splash Screen State
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('visionattend_user');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return DEFAULT_USER;
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Active Live Camera Session state
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [sessionCaptureMode, setSessionCaptureMode] = useState<'CAMERA' | 'UPLOAD'>('CAMERA');

  // Verification Draft Session state
  const [draftSession, setDraftSession] = useState<AttendanceSession | null>(null);

  // Modals state
  const [startSessionModalOpen, setStartSessionModalOpen] = useState<boolean>(false);
  const [studentProfileModalId, setStudentProfileModalId] = useState<number | null>(null);
  const [sessionDetailModalId, setSessionDetailModalId] = useState<number | null>(null);

  // Refresh master data
  const refreshData = async () => {
    try {
      const [statsData, studentsData] = await Promise.all([
        fetchDashboardStats(),
        fetchStudents()
      ]);
      setStats(statsData);
      setStudents(studentsData);
    } catch (err) {
      console.error("Failed to load initial data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('visionattend_user', JSON.stringify(user));
    setIsLoginModalOpen(false);
  };

  const handleLogout = () => {
    setCurrentUser(DEFAULT_USER);
    localStorage.setItem('visionattend_user', JSON.stringify(DEFAULT_USER));
    setActiveTab('dashboard');
  };

  // Start live attendance trigger
  const handleStartAttendance = () => {
    setStartSessionModalOpen(true);
  };

  const handleSessionStarted = (newSession: AttendanceSession, mode: 'CAMERA' | 'UPLOAD') => {
    setActiveSession(newSession);
    setSessionCaptureMode(mode);
    setStartSessionModalOpen(false);
    setActiveTab('live');
  };

  // Stop live session -> Open Verification Draft
  const handleStopLiveSession = async (sessionId: number) => {
    try {
      const sessionData = await fetchSession(sessionId);
      setDraftSession(sessionData);
      setActiveSession(null);
      refreshData();
      setActiveTab('verify');
    } catch (err) {
      console.error("Error transitioning to draft:", err);
    }
  };

  // Faculty approved verification
  const handleVerificationApproved = (updatedSession: AttendanceSession) => {
    setDraftSession(null);
    refreshData();
    setActiveTab('sessions');
  };

  // Open review workspace with target session
  const handleOpenReview = async (sessionId?: number) => {
    try {
      const targetId = sessionId || stats?.pending_review_session_id;
      if (targetId) {
        const s = await fetchSession(targetId);
        setDraftSession(s);
        setActiveTab('review');
        return;
      }

      // Check all sessions to find one with pending reviews
      const allSessions = await fetchSessions();
      const sWithReview = allSessions.find(
        s => s.review_count > 0 || (s.records || []).some(r => r.status === 'REVIEW')
      );
      if (sWithReview) {
        const fullS = await fetchSession(sWithReview.session_id);
        setDraftSession(fullS);
        setActiveTab('review');
        return;
      }

      if (draftSession) {
        setActiveTab('review');
        return;
      }

      if (allSessions.length > 0) {
        const fullS = await fetchSession(allSessions[0].session_id);
        setDraftSession(fullS);
        setActiveTab('review');
        return;
      }
    } catch (err) {
      console.error("Error opening review session:", err);
    }
    setActiveTab('review');
  };

  // Automatically fetch pending session if review tab opened directly
  useEffect(() => {
    if (activeTab === 'review' && !draftSession) {
      handleOpenReview();
    }
  }, [activeTab]);
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Brand Intro Splash Screen on Startup */}
      {showSplash && (
        <SplashScreen onComplete={() => setShowSplash(false)} />
      )}

      {/* Institutional Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'live' && !activeSession) {
            setStartSessionModalOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        totalStudents={students.length}
        onStartAttendance={handleStartAttendance}
        onReplaySplash={() => setShowSplash(true)}
        pendingReviews={stats?.pending_reviews_count || 0}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-blue-200 rounded-full animate-spin" />
            <span className="text-xs font-bold font-mono text-blue-900 uppercase tracking-wider">
              CONNECTING TO VISIONATTEND PORTAL...
            </span>
          </div>
        ) : (
          <>
            {/* 1. Dashboard */}
            {activeTab === 'dashboard' && (
              <Dashboard
                stats={stats}
                currentUser={currentUser}
                onStartLive={handleStartAttendance}
                onNavigate={(tab, sessionId) => {
                  if (tab === 'live') handleStartAttendance();
                  else if (tab === 'review') handleOpenReview(sessionId);
                  else setActiveTab(tab);
                }}
                onViewSession={(id) => setSessionDetailModalId(id)}
              />
            )}

            {/* 2. Live Smartphone Camera Classroom Attendance */}
            {activeTab === 'live' && activeSession && (
              <LiveAttendance
                session={activeSession}
                students={students}
                initialMode={sessionCaptureMode}
                onStopSession={handleStopLiveSession}
                onCancel={() => {
                  setActiveSession(null);
                  setActiveTab('dashboard');
                }}
              />
            )}

            {/* 3. Faculty Verification Draft */}
            {activeTab === 'verify' && draftSession && (
              <FacultyVerification
                session={draftSession}
                onApproved={handleVerificationApproved}
                onOpenReview={() => setActiveTab('review')}
                onBack={() => {
                  setDraftSession(null);
                  setActiveTab('dashboard');
                }}
              />
            )}

            {/* 4. Dedicated Low-Confidence Review Workspace */}
            {activeTab === 'review' && (
              draftSession ? (
                <LowConfidenceReview
                  session={draftSession}
                  students={students}
                  onReviewCompleted={(updatedSession) => {
                    setDraftSession(updatedSession);
                    refreshData();
                    setActiveTab('verify');
                  }}
                  onBackToDraft={() => {
                    refreshData();
                    setActiveTab('dashboard');
                  }}
                />
              ) : (
                <div className="py-24 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="font-semibold text-slate-700">Loading pending review workspace...</span>
                </div>
              )
            )}

            {/* 5. Student Directory */}
            {activeTab === 'students' && (
              <StudentDirectory
                students={students}
                onRefresh={refreshData}
                onRegisterClick={() => setActiveTab('enroll')}
                onViewProfile={(id) => setStudentProfileModalId(id)}
              />
            )}

            {/* 6. Face Enrollment */}
            {activeTab === 'enroll' && (
              <StudentRegistration
                students={students}
                onStudentRegistered={refreshData}
                onViewStudentProfile={(id) => setStudentProfileModalId(id)}
              />
            )}

            {/* 7. Attendance Sessions & Evidence Ledger */}
            {activeTab === 'sessions' && (
              <AttendanceHistory
                onViewSessionDetails={(id) => setSessionDetailModalId(id)}
                onStartAttendance={handleStartAttendance}
              />
            )}

            {/* 8. On-Duty (OD) & Medical Leave (ML) Module */}
            {(activeTab === 'od-ml' || activeTab === 'od' || activeTab === 'ml') && (
              <ODManagement
                currentUser={currentUser}
                students={students}
                onRefresh={refreshData}
              />
            )}

            {/* 9. Real Reports & Exports */}
            {activeTab === 'reports' && (
              <Reports />
            )}

            {/* 10. Class & Subject Management */}
            {activeTab === 'classes' && (
              <ClassManagement
                students={students}
                onViewStudentProfile={(id) => setStudentProfileModalId(id)}
                onStartAttendanceForClass={(classSec) => {
                  handleStartAttendance();
                }}
                onNavigateToEnroll={() => setActiveTab('enroll')}
              />
            )}

            {/* 11. Settings & Policies */}
            {activeTab === 'settings' && (
              <Settings
                onDatabaseReset={refreshData}
              />
            )}
          </>
        )}
      </main>

      {/* Institutional Footer */}
      <footer className="bg-[#0a2540] text-white text-xs py-4 border-t border-blue-900/40 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-blue-400">VISIONATTEND</span>
            <span className="text-slate-400">| AI-Assisted Classroom Attendance System</span>
          </div>
          <div className="text-slate-400 text-[11px]">
            Engineered by <strong className="text-white">TEAM: VISIONRAIDERS</strong> • Secure Video Evidence & Faculty Verification
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      {startSessionModalOpen && (
        <StartSessionModal
          onClose={() => setStartSessionModalOpen(false)}
          onSessionStarted={handleSessionStarted}
          currentUser={currentUser}
        />
      )}

      {studentProfileModalId !== null && (
        <StudentProfileModal
          studentId={studentProfileModalId}
          onClose={() => setStudentProfileModalId(null)}
        />
      )}

      {sessionDetailModalId !== null && (
        <SessionDetailModal
          sessionId={sessionDetailModalId}
          onClose={() => setSessionDetailModalId(null)}
        />
      )}

      {isLoginModalOpen && (
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

    </div>
  );
}

export default App;
