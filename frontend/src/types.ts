export interface User {
  user_id: number;
  username: string;
  full_name: string;
  email?: string;
  role: 'ADMIN' | 'CLASS_USER' | string;
  assigned_department?: string;
  assigned_year?: string;
  assigned_section?: string;
  is_active: boolean;
  created_at: string;
}

export interface FaceProfile {
  face_profile_id: number;
  student_id: number;
  image_reference: string;
  photo_label: string;
  quality_score: number;
  lighting_score: number;
  sharpness_score: number;
  pose_angle: string;
  created_at: string;
}

export interface Student {
  student_id: number;
  visionattend_id: string;
  register_number: string;
  name: string;
  department: string;
  year: string;
  section: string;
  email: string;
  phone: string;
  face_profile_status: 'Not Registered' | 'Processing' | 'Ready' | 'Needs More Images' | string;
  readiness_score: number;
  profile_quality: 'Good' | 'Moderate' | 'Poor' | string;
  avatar_url?: string;
  is_twin?: boolean;
  twin_sibling_id?: number;
  twin_notes?: string;
  created_at: string;
  face_profiles?: FaceProfile[];
}

export interface ODRecord {
  od_id: number;
  student_id: number;
  student_name?: string;
  visionattend_id?: string;
  register_number?: string;
  department?: string;
  year_section?: string;
  date: string;
  reason: string;
  event_name: string;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  approved_by: string;
  decision_notes?: string;
  created_at: string;
}

export interface MedicalLeaveRecord {
  ml_id: number;
  student_id: number;
  student_name?: string;
  visionattend_id?: string;
  register_number?: string;
  department?: string;
  year_section?: string;
  date_from: string;
  date_to: string;
  reason: string;
  hospital_name: string;
  doctor_certificate_ref?: string;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  reviewed_by: string;
  decision_notes?: string;
  created_at: string;
}

export interface EvidenceVideo {
  evidence_id: number;
  session_id: number;
  file_name: string;
  storage_path: string;
  duration_seconds: number;
  file_size_bytes: number;
  mime_type: string;
  recording_started_at?: string;
  recording_ended_at?: string;
  processing_status: string;
  created_at: string;
}

export interface AttendanceRecord {
  attendance_id: number;
  session_id: number;
  student_id: number;
  student_name?: string;
  visionattend_id?: string;
  register_number?: string;
  department?: string;
  year_section?: string;
  avatar_url?: string;
  is_twin?: boolean;
  status: 'PRESENT' | 'ABSENT' | 'OD' | 'ML' | 'REVIEW' | string;
  ai_status?: string;
  confidence: number;
  detection_count: number;
  consecutive_frames: number;
  last_detected_time?: string;
  best_frame_path?: string;
  video_frame_path?: string;
  candidate_details_json?: string;
  od_applied: boolean;
  ml_applied: boolean;
  verification_status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CONFIRMED' | 'OVERRIDDEN' | 'MODIFIED' | 'IDENTITY_VERIFICATION_REQUIRED' | string;
  secondary_verification_method?: string;
  correction_reason?: string;
  verified_by?: string;
  verified_at?: string;
  notes?: string;
}

export interface AttendanceSession {
  session_id: number;
  session_code?: string;
  faculty_name: string;
  subject: string;
  department: string;
  year_section: string;
  room_number: string;
  description_reminder?: string;
  date: string;
  start_time: string;
  end_time?: string;
  status: 'LIVE' | 'DRAFT' | 'APPROVED' | 'CANCELLED' | string;
  total_students: number;
  present_count: number;
  absent_count: number;
  od_count: number;
  ml_count: number;
  review_count: number;
  unknown_count: number;
  video_path?: string;
  video_filename?: string;
  video_duration: number;
  video_size_bytes: number;
  evidence_status: string;
  retention_days: number;
  created_at: string;
  records?: AttendanceRecord[];
  evidence_videos?: EvidenceVideo[];
}

export interface FrameDetectionBox {
  box_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  matched_student_id?: number;
  visionattend_id?: string;
  student_name?: string;
  register_number?: string;
  confidence: number;
  status: 'MATCH_FOUND' | 'REVIEW_REQUIRED' | 'IDENTITY_VERIFICATION_REQUIRED' | 'UNKNOWN' | string;
  frame_observations?: number;
  runner_up_name?: string;
  score_separation?: number;
  is_twin_case?: boolean;
}

export interface AttendanceCandidate {
  student_id: number;
  student_name: string;
  visionattend_id: string;
  register_number: string;
  department: string;
  status: 'PRESENT' | 'OD' | 'ML' | 'REVIEW' | string;
  ai_status?: string;
  confidence: number;
  detection_count: number;
  consecutive_frames: number;
  best_frame_b64?: string;
  scene_frame_b64?: string;
  twin_alert?: boolean;
  candidate_details?: any;
  last_detected: string;
}

export interface VerificationLog {
  log_id: number;
  session_id?: number;
  attendance_id?: number;
  student_id?: number;
  register_number: string;
  student_name: string;
  match_score: number;
  raw_cosine: number;
  status: string;
  original_ai_prediction?: string;
  final_decision?: string;
  secondary_verification_method?: string;
  correction_reason?: string;
  candidate_scores_json?: string;
  verified_by?: string;
  notes?: string;
  timestamp: string;
  created_at: string;
}

export interface ClassSection {
  class_id: number;
  name: string;
  department: string;
  year: string;
  section: string;
  default_room: string;
  default_reminder?: string;
  created_at: string;
}

export interface Subject {
  subject_id: number;
  code: string;
  name: string;
  department: string;
  created_at: string;
}

export interface SystemConfigItem {
  config_key: string;
  config_value: string;
  description?: string;
  updated_at?: string;
}

export interface DashboardStats {
  total_students: number;
  enrolled_biometrics: number;
  total_sessions: number;
  pending_reviews_count: number;
  pending_review_session_id?: number | null;
  active_od_today: number;
  pending_od_requests: number;
  pending_ml_requests: number;
  recent_sessions: AttendanceSession[];
}

export interface VerificationAction {
  attendance_id: number;
  status: string;
  notes?: string;
}
