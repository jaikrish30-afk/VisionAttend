from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime


# ==========================================
# AUTH & USERS
# ==========================================

class UserLogin(BaseModel):
    username: str
    password: str


class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    email: Optional[str] = None
    role: str = "CLASS_USER"  # "ADMIN" or "CLASS_USER"
    assigned_department: Optional[str] = "Department of Information Technology"
    assigned_year: Optional[str] = "II Year"
    assigned_section: Optional[str] = "IT-2D"


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    assigned_department: Optional[str] = None
    assigned_year: Optional[str] = None
    assigned_section: Optional[str] = None
    password: Optional[str] = None


class UserOut(BaseModel):
    user_id: int
    username: str
    full_name: str
    email: Optional[str] = None
    role: str
    assigned_department: Optional[str] = None
    assigned_year: Optional[str] = None
    assigned_section: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# STUDENTS & FACE PROFILES
# ==========================================

class FacePhotoUpload(BaseModel):
    photo_label: str
    image_data: str  # Base64 data URL
    pose_angle: Optional[str] = "Frontal"


class StudentCreate(BaseModel):
    register_number: str
    name: str
    department: str
    year: str
    section: str
    email: str
    phone: str
    avatar_url: Optional[str] = None
    is_twin: Optional[bool] = False
    twin_sibling_id: Optional[int] = None
    twin_notes: Optional[str] = None
    photos: Optional[List[FacePhotoUpload]] = []


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    year: Optional[str] = None
    section: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    is_twin: Optional[bool] = None
    twin_sibling_id: Optional[int] = None
    twin_notes: Optional[str] = None


class FaceProfileOut(BaseModel):
    face_profile_id: int
    student_id: int
    image_reference: str
    photo_label: str
    quality_score: float
    lighting_score: float
    sharpness_score: float
    pose_angle: str
    created_at: datetime

    class Config:
        from_attributes = True


class StudentOut(BaseModel):
    student_id: int
    visionattend_id: str
    register_number: str
    name: str
    department: str
    year: str
    section: str
    email: str
    phone: str
    face_profile_status: str
    readiness_score: float
    profile_quality: str
    avatar_url: Optional[str]
    is_twin: bool = False
    twin_sibling_id: Optional[int] = None
    twin_notes: Optional[str] = None
    created_at: datetime
    face_profiles: List[FaceProfileOut] = []

    class Config:
        from_attributes = True


# ==========================================
# ON-DUTY (OD) MODULE
# ==========================================

class ODCreate(BaseModel):
    student_id: int
    date: str
    reason: str
    event_name: Optional[str] = "National Technical Symposium"
    approval_status: Optional[str] = "PENDING"
    approved_by: Optional[str] = "Faculty In-Charge"


class ODReviewRequest(BaseModel):
    approval_status: str  # "APPROVED" or "REJECTED"
    reviewed_by: str
    decision_notes: Optional[str] = None


class ODOut(BaseModel):
    od_id: int
    student_id: int
    student_name: Optional[str] = None
    visionattend_id: Optional[str] = None
    register_number: Optional[str] = None
    department: Optional[str] = None
    year_section: Optional[str] = None
    date: str
    reason: str
    event_name: str
    approval_status: str
    approved_by: str
    decision_notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# MEDICAL LEAVE (ML) MODULE
# ==========================================

class MedicalLeaveCreate(BaseModel):
    student_id: int
    date_from: str
    date_to: str
    reason: str
    hospital_name: Optional[str] = "City Medical Center & Hospital"
    doctor_certificate_ref: Optional[str] = None
    approval_status: Optional[str] = "PENDING"
    reviewed_by: Optional[str] = "Faculty In-Charge"


class MedicalLeaveReview(BaseModel):
    approval_status: str  # "APPROVED" or "REJECTED"
    reviewed_by: str
    decision_notes: Optional[str] = None


class MedicalLeaveOut(BaseModel):
    ml_id: int
    student_id: int
    student_name: Optional[str] = None
    visionattend_id: Optional[str] = None
    register_number: Optional[str] = None
    department: Optional[str] = None
    year_section: Optional[str] = None
    date_from: str
    date_to: str
    reason: str
    hospital_name: str
    doctor_certificate_ref: Optional[str] = None
    approval_status: str
    reviewed_by: str
    decision_notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# VERIFICATION AUDIT & METER
# ==========================================

class VerificationLogCreate(BaseModel):
    session_id: Optional[int] = None
    attendance_id: Optional[int] = None
    student_id: Optional[int] = None
    register_number: str
    student_name: str
    match_score: float
    raw_cosine: float
    status: str
    original_ai_prediction: Optional[str] = None
    final_decision: Optional[str] = None
    secondary_verification_method: Optional[str] = None
    correction_reason: Optional[str] = None
    candidate_scores_json: Optional[str] = None
    verified_by: Optional[str] = "Faculty In-Charge"
    notes: Optional[str] = None
    timestamp: str


class VerificationLogOut(BaseModel):
    log_id: int
    session_id: Optional[int] = None
    attendance_id: Optional[int] = None
    student_id: Optional[int] = None
    register_number: str
    student_name: str
    match_score: float
    raw_cosine: float
    status: str
    original_ai_prediction: Optional[str] = None
    final_decision: Optional[str] = None
    secondary_verification_method: Optional[str] = None
    correction_reason: Optional[str] = None
    candidate_scores_json: Optional[str] = None
    verified_by: Optional[str] = None
    notes: Optional[str] = None
    timestamp: str
    created_at: datetime

    class Config:
        from_attributes = True


class TestVerificationRequest(BaseModel):
    student_id: int
    image_base64: Optional[str] = None
    log_audit: Optional[bool] = True
    verified_by: Optional[str] = "Faculty In-Charge"


# ==========================================
# ATTENDANCE SESSIONS & RECORDS
# ==========================================

class AttendanceRecordOut(BaseModel):
    attendance_id: int
    session_id: int
    student_id: int
    student_name: Optional[str] = None
    visionattend_id: Optional[str] = None
    register_number: Optional[str] = None
    department: Optional[str] = None
    year_section: Optional[str] = None
    avatar_url: Optional[str] = None
    is_twin: bool = False
    status: str
    ai_status: Optional[str] = "ABSENT"
    confidence: float
    detection_count: int
    consecutive_frames: int
    last_detected_time: Optional[str] = None
    best_frame_path: Optional[str] = None
    video_frame_path: Optional[str] = None
    candidate_details_json: Optional[str] = None
    od_applied: bool = False
    ml_applied: bool = False
    verification_status: str
    secondary_verification_method: Optional[str] = None
    correction_reason: Optional[str] = None
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class AttendanceSessionCreate(BaseModel):
    subject: str
    department: str
    year_section: str
    room_number: Optional[str] = "Room 304 / Vision Studio"
    description_reminder: Optional[str] = "Internal assessment discussion today. Students with approved OD should be considered accordingly."
    date: Optional[str] = None
    faculty_name: Optional[str] = "Dr. S. Ramanathan, Associate Prof"


class EvidenceVideoOut(BaseModel):
    evidence_id: int
    session_id: int
    file_name: str
    storage_path: str
    duration_seconds: float
    file_size_bytes: int
    mime_type: str
    recording_started_at: Optional[datetime] = None
    recording_ended_at: Optional[datetime] = None
    processing_status: str
    created_at: datetime

    class Config:
        from_attributes = True


class AttendanceSessionOut(BaseModel):
    session_id: int
    session_code: Optional[str] = None
    faculty_name: str
    subject: str
    department: str
    year_section: str
    room_number: str
    description_reminder: Optional[str] = None
    date: str
    start_time: str
    end_time: Optional[str]
    status: str
    total_students: int
    present_count: int
    absent_count: int
    od_count: int
    ml_count: int
    review_count: int
    unknown_count: int
    video_path: Optional[str] = None
    video_filename: Optional[str] = None
    video_duration: float = 0.0
    video_size_bytes: int = 0
    evidence_status: str = "STORED"
    retention_days: int = 90
    created_at: datetime
    records: List[AttendanceRecordOut] = []
    evidence_videos: List[EvidenceVideoOut] = []

    class Config:
        from_attributes = True


class VerificationAction(BaseModel):
    attendance_id: int
    status: str
    notes: Optional[str] = None


class BatchVerifyRequest(BaseModel):
    session_id: int
    faculty_name: str
    actions: List[VerificationAction]


class ReviewResolution(BaseModel):
    attendance_id: int
    action: str  # "CONFIRM", "REJECT", "CHANGE_STUDENT", "MARK_ABSENT", "CONFIRM_CANDIDATE_2", "CONFIRM_BOTH"
    new_student_id: Optional[int] = None
    secondary_verification_method: Optional[str] = "FACULTY_AUTHENTICATED_CONFIRMATION"  # STUDENT_ID_CARD, FACULTY_AUTHENTICATED_CONFIRMATION, ROLL_CALL_AUTHENTICATION, etc.
    correction_reason: Optional[str] = None
    verified_by: Optional[str] = "Dr. S. Ramanathan, Associate Prof"
    notes: Optional[str] = None


# ==========================================
# CLASSES, SUBJECTS & SYSTEM CONFIGS
# ==========================================

class ClassSectionCreate(BaseModel):
    name: str
    department: str
    year: str
    section: str
    default_room: Optional[str] = "Room 304"
    default_reminder: Optional[str] = None


class ClassSectionOut(BaseModel):
    class_id: int
    name: str
    department: str
    year: str
    section: str
    default_room: str
    default_reminder: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SubjectCreate(BaseModel):
    code: str
    name: str
    department: str


class SubjectOut(BaseModel):
    subject_id: int
    code: str
    name: str
    department: str
    created_at: datetime

    class Config:
        from_attributes = True


class SystemConfigItem(BaseModel):
    config_key: str
    config_value: str
    description: Optional[str] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
