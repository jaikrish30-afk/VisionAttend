import {
  User, Student, AttendanceSession, ODRecord, MedicalLeaveRecord,
  VerificationLog, DashboardStats, VerificationAction, ClassSection,
  Subject, SystemConfigItem
} from './types';

const API_BASE = '/api';

// ==========================================
// 1. AUTH & USER MANAGEMENT
// ==========================================

export async function loginUser(credentials: { username: string; password: string }): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Invalid username or password');
  }
  return res.json();
}

export async function registerUser(data: {
  username: string;
  password: string;
  full_name: string;
  email?: string;
  role: string;
  assigned_department: string;
  assigned_year: string;
  assigned_section: string;
}): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Registration failed');
  }
  return res.json();
}

export async function fetchClassUsers(): Promise<{ users: User[]; classes: ClassSection[] }> {
  const res = await fetch(`${API_BASE}/auth/class-users`);
  if (!res.ok) throw new Error('Failed to load class users');
  return res.json();
}

export async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/users`);
  if (!res.ok) throw new Error('Failed to load user accounts');
  return res.json();
}

export async function createClassUser(data: {
  username: string;
  password: string;
  full_name: string;
  email?: string;
  role: string;
  assigned_department: string;
  assigned_year: string;
  assigned_section: string;
}): Promise<User> {
  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create user account');
  }
  return res.json();
}

export async function deleteUser(userId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/users/${userId}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to delete user');
  }
}

// ==========================================
// 2. DASHBOARD & STATS
// ==========================================

export async function fetchDashboardStats(department?: string, year?: string, section?: string): Promise<DashboardStats> {
  const params = new URLSearchParams();
  if (department && department !== 'ALL') params.append('department', department);
  if (year && year !== 'ALL') params.append('year', year);
  if (section && section !== 'ALL') params.append('section', section);
  
  const res = await fetch(`${API_BASE}/dashboard/stats?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load dashboard stats');
  return res.json();
}

// ==========================================
// 3. STUDENTS & BIOMETRICS
// ==========================================

export async function fetchStudents(search?: string, department?: string, year?: string, section?: string): Promise<Student[]> {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (department && department !== 'ALL') params.append('department', department);
  if (year && year !== 'ALL') params.append('year', year);
  if (section && section !== 'ALL') params.append('section', section);
  
  const res = await fetch(`${API_BASE}/students?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load students');
  return res.json();
}

export async function fetchStudentById(studentId: number): Promise<Student> {
  const res = await fetch(`${API_BASE}/students/${studentId}`);
  if (!res.ok) throw new Error('Failed to load student details');
  return res.json();
}

export async function createStudent(data: {
  register_number: string;
  name: string;
  department: string;
  year: string;
  section: string;
  email: string;
  phone: string;
  avatar_url?: string;
  is_twin?: boolean;
  twin_sibling_id?: number;
  twin_notes?: string;
  photos: Array<{ photo_label: string; image_data: string; pose_angle?: string }>;
}): Promise<Student> {
  const res = await fetch(`${API_BASE}/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to register student');
  }
  return res.json();
}

export async function deleteStudent(studentId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/students/${studentId}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to delete student');
  }
}

// ==========================================
// 4. ON-DUTY (OD) MODULE
// ==========================================

export async function fetchODRecords(department?: string, section?: string, status?: string): Promise<ODRecord[]> {
  const params = new URLSearchParams();
  if (department && department !== 'ALL') params.append('department', department);
  if (section && section !== 'ALL') params.append('section', section);
  if (status && status !== 'ALL') params.append('status', status);

  const res = await fetch(`${API_BASE}/od?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load OD records');
  return res.json();
}

export async function createODRecord(data: {
  student_id: number;
  date: string;
  reason: string;
  event_name?: string;
  approval_status?: string;
  approved_by?: string;
}): Promise<ODRecord> {
  const res = await fetch(`${API_BASE}/od`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to record OD');
  }
  return res.json();
}

export async function reviewODRecord(odId: number, data: {
  approval_status: 'APPROVED' | 'REJECTED';
  reviewed_by: string;
  decision_notes?: string;
}): Promise<ODRecord> {
  const res = await fetch(`${API_BASE}/od/${odId}/review`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to review OD request');
  }
  return res.json();
}

export async function deleteODRecord(odId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/od/${odId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete OD record');
}

// ==========================================
// 5. MEDICAL LEAVE (ML) MODULE
// ==========================================

export async function fetchMedicalLeaves(department?: string, section?: string, status?: string): Promise<MedicalLeaveRecord[]> {
  const params = new URLSearchParams();
  if (department && department !== 'ALL') params.append('department', department);
  if (section && section !== 'ALL') params.append('section', section);
  if (status && status !== 'ALL') params.append('status', status);

  const res = await fetch(`${API_BASE}/medical-leave?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load Medical Leave records');
  return res.json();
}

export async function createMedicalLeave(data: {
  student_id: number;
  date_from: string;
  date_to: string;
  reason: string;
  hospital_name?: string;
  doctor_certificate_ref?: string;
  approval_status?: string;
  reviewed_by?: string;
}): Promise<MedicalLeaveRecord> {
  const res = await fetch(`${API_BASE}/medical-leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to submit Medical Leave');
  }
  return res.json();
}

export async function reviewMedicalLeave(mlId: number, data: {
  approval_status: 'APPROVED' | 'REJECTED';
  reviewed_by: string;
  decision_notes?: string;
}): Promise<MedicalLeaveRecord> {
  const res = await fetch(`${API_BASE}/medical-leave/${mlId}/review`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update Medical Leave decision');
  }
  return res.json();
}

export async function deleteMedicalLeave(mlId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/medical-leave/${mlId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete Medical Leave record');
}

// ==========================================
// 6. SESSIONS & VIDEO EVIDENCE
// ==========================================

export async function fetchSessions(department?: string, year_section?: string): Promise<AttendanceSession[]> {
  const params = new URLSearchParams();
  if (department && department !== 'ALL') params.append('department', department);
  if (year_section && year_section !== 'ALL') params.append('year_section', year_section);

  const res = await fetch(`${API_BASE}/sessions?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load attendance sessions');
  return res.json();
}

export async function createAttendanceSession(data: {
  subject: string;
  department: string;
  year_section: string;
  room_number?: string;
  description_reminder?: string;
  faculty_name?: string;
  date?: string;
}): Promise<AttendanceSession> {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to initialize attendance session');
  }
  return res.json();
}

export async function fetchSession(sessionId: number): Promise<AttendanceSession> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}`);
  if (!res.ok) throw new Error('Failed to load session');
  return res.json();
}

export async function processLiveFrame(sessionId: number, payload: { image_base64?: string }) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/process-frame`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Frame processing failed');
  return res.json();
}

export async function stopAttendanceSession(sessionId: number, data?: { duration_seconds?: number }) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data || {})
  });
  if (!res.ok) throw new Error('Failed to stop session');
  return res.json();
}

export async function uploadSessionEvidence(sessionId: number, file: Blob, duration: number) {
  const formData = new FormData();
  formData.append('video_file', file, `session_${sessionId}_evidence.mp4`);
  formData.append('duration', duration.toString());

  const res = await fetch(`${API_BASE}/sessions/${sessionId}/upload-evidence`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error('Failed to upload classroom video evidence');
  return res.json();
}

export async function updateStudent(studentId: number, data: Partial<Student>): Promise<Student> {
  const res = await fetch(`${API_BASE}/students/${studentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update student profile');
  }
  return res.json();
}

export async function resolveReviewCase(sessionId: number, payload: {
  attendance_id: number;
  action: 'CONFIRM' | 'REJECT' | 'CHANGE_STUDENT' | 'MARK_ABSENT' | 'CONFIRM_CANDIDATE_2' | 'CONFIRM_BOTH' | string;
  new_student_id?: number;
  secondary_verification_method?: string;
  correction_reason?: string;
  verified_by?: string;
  notes?: string;
}): Promise<{ message: string; session: AttendanceSession }> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/resolve-review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to resolve review item');
  }
  return res.json();
}

export async function verifyAndApproveAttendance(sessionId: number, data: {
  session_id: number;
  faculty_name: string;
  actions: VerificationAction[];
}): Promise<{ message: string; session: AttendanceSession }> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to approve attendance');
  }
  return res.json();
}

// ==========================================
// 7. VERIFICATION AUDIT & TESTING
// ==========================================

export async function testStudentVerification(studentId: number, imageBase64?: string, verifiedBy?: string) {
  const res = await fetch(`${API_BASE}/test-student`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      student_id: studentId,
      image_base64: imageBase64,
      verified_by: verifiedBy || 'Faculty In-Charge',
      log_audit: true
    })
  });
  if (!res.ok) throw new Error('Verification test failed');
  return res.json();
}

export async function fetchVerificationLogs(options?: {
  limit?: number;
  session_id?: number;
  student_id?: number;
  search?: string;
} | number): Promise<VerificationLog[]> {
  const params = new URLSearchParams();
  if (typeof options === 'number') {
    params.append('limit', options.toString());
  } else if (options) {
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.session_id) params.append('session_id', options.session_id.toString());
    if (options.student_id) params.append('student_id', options.student_id.toString());
    if (options.search) params.append('search', options.search);
  }
  const res = await fetch(`${API_BASE}/verification/audit-logs?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load verification logs');
  return res.json();
}

// ==========================================
// 8. CLASSES, SUBJECTS & SETTINGS
// ==========================================

export async function fetchClasses(): Promise<ClassSection[]> {
  const res = await fetch(`${API_BASE}/classes`);
  if (!res.ok) throw new Error('Failed to load class sections');
  return res.json();
}

export async function createClass(data: {
  name: string;
  department: string;
  year: string;
  section: string;
  default_room?: string;
  default_reminder?: string;
}): Promise<ClassSection> {
  const res = await fetch(`${API_BASE}/classes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create class section');
  return res.json();
}

export async function fetchSubjects(): Promise<Subject[]> {
  const res = await fetch(`${API_BASE}/subjects`);
  if (!res.ok) throw new Error('Failed to load subjects');
  return res.json();
}

export async function createSubject(data: {
  code: string;
  name: string;
  department: string;
}): Promise<Subject> {
  const res = await fetch(`${API_BASE}/subjects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to add subject');
  return res.json();
}

export async function fetchSettings(): Promise<SystemConfigItem[]> {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error('Failed to load system settings');
  return res.json();
}

export async function updateSettings(configs: SystemConfigItem[]): Promise<void> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(configs)
  });
  if (!res.ok) throw new Error('Failed to update system settings');
}

export async function fetchReports() {
  const res = await fetch(`${API_BASE}/reports/dashboard-stats`);
  if (!res.ok) throw new Error('Failed to load reports');
  return res.json();
}
