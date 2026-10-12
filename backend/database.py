import json
import os
from datetime import datetime, timedelta
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, event
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

# Database URL: uses environment variable for production (PostgreSQL), falls back to SQLite for local dev
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./visionattend.db")

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL, 
        connect_args={"check_same_thread": False, "timeout": 30}
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=30000")
        cursor.close()
else:
    # Production PostgreSQL configuration with connection pooling and auto-reconnect
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    password = Column(String(128), nullable=False)
    full_name = Column(String(128), nullable=False)
    email = Column(String(128), nullable=True)
    role = Column(String(32), default="CLASS_USER")  # "ADMIN" or "CLASS_USER"
    assigned_department = Column(String(64), default="Department of Information Technology")
    assigned_year = Column(String(16), default="II Year")
    assigned_section = Column(String(16), default="IT-2D")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Student(Base):
    __tablename__ = "students"

    student_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    visionattend_id = Column(String(64), unique=True, index=True, nullable=False)
    register_number = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(128), nullable=False)
    department = Column(String(64), nullable=False)
    year = Column(String(16), nullable=False)
    section = Column(String(16), nullable=False)
    email = Column(String(128), nullable=False)
    phone = Column(String(32), nullable=False)
    face_profile_status = Column(String(32), default="Ready")  # Not Registered, Processing, Ready, Needs More Images
    readiness_score = Column(Float, default=95.0)
    profile_quality = Column(String(32), default="Good")  # Good, Moderate, Poor
    avatar_url = Column(Text, nullable=True)
    is_twin = Column(Boolean, default=False)
    twin_sibling_id = Column(Integer, nullable=True)
    twin_notes = Column(String(256), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    face_profiles = relationship("FaceProfile", back_populates="student", cascade="all, delete-orphan", passive_deletes=True)
    attendance_records = relationship("AttendanceRecord", back_populates="student", cascade="all, delete-orphan", passive_deletes=True)
    od_records = relationship("ODRecord", back_populates="student", cascade="all, delete-orphan", passive_deletes=True)
    ml_records = relationship("MedicalLeaveRecord", back_populates="student", cascade="all, delete-orphan", passive_deletes=True)


class FaceProfile(Base):
    __tablename__ = "face_profiles"

    face_profile_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False)
    image_reference = Column(Text, nullable=False)  # file path or base64 data url
    photo_label = Column(String(32), default="Photo 1")
    embedding_json = Column(Text, nullable=True)  # 128-d deep neural embedding
    quality_score = Column(Float, default=96.0)
    lighting_score = Column(Float, default=94.0)
    sharpness_score = Column(Float, default=97.0)
    pose_angle = Column(String(32), default="Frontal")
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="face_profiles")


class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    session_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_code = Column(String(64), unique=True, index=True, nullable=True)  # e.g. ATT-2026-10-08-001
    faculty_name = Column(String(128), default="Dr. A. Sharma, Faculty In-Charge")
    subject = Column(String(128), nullable=False)
    department = Column(String(64), nullable=False)
    year_section = Column(String(32), nullable=False)
    room_number = Column(String(32), default="Room 304 / Vision Studio")
    description_reminder = Column(Text, nullable=True)
    date = Column(String(32), nullable=False)
    start_time = Column(String(32), nullable=False)
    end_time = Column(String(32), nullable=True)
    status = Column(String(32), default="DRAFT")  # LIVE, DRAFT, APPROVED, CANCELLED
    total_students = Column(Integer, default=0)
    present_count = Column(Integer, default=0)
    absent_count = Column(Integer, default=0)
    od_count = Column(Integer, default=0)
    ml_count = Column(Integer, default=0)
    review_count = Column(Integer, default=0)
    unknown_count = Column(Integer, default=0)
    
    # Video Evidence Storage metadata
    video_path = Column(String(256), nullable=True)
    video_filename = Column(String(128), nullable=True)
    video_duration = Column(Float, default=0.0)
    video_size_bytes = Column(Integer, default=0)
    evidence_status = Column(String(32), default="STORED")  # STORED, ARCHIVED, EXPIRED
    retention_days = Column(Integer, default=90)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    records = relationship("AttendanceRecord", back_populates="session", cascade="all, delete-orphan", passive_deletes=True)
    evidence_videos = relationship("EvidenceVideo", back_populates="session", cascade="all, delete-orphan", passive_deletes=True)


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    attendance_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("attendance_sessions.session_id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False)
    status = Column(String(32), default="ABSENT")  # PRESENT, ABSENT, OD, ML, REVIEW
    ai_status = Column(String(32), default="ABSENT") # AI prediction prior to faculty verification
    confidence = Column(Float, default=0.0)
    detection_count = Column(Integer, default=0)
    consecutive_frames = Column(Integer, default=0)
    last_detected_time = Column(String(32), nullable=True)
    
    # Best extracted frame & session video snapshot
    best_frame_path = Column(Text, nullable=True)  # Cropped high-quality best face frame
    video_frame_path = Column(Text, nullable=True) # Full context video scene frame
    candidate_details_json = Column(Text, nullable=True) # Candidate scores & separation details for twin/ambiguity review
    
    od_applied = Column(Boolean, default=False)
    ml_applied = Column(Boolean, default=False)
    
    verification_status = Column(String(32), default="PENDING")  # PENDING, APPROVED, REJECTED, MODIFIED, IDENTITY_VERIFICATION_REQUIRED
    secondary_verification_method = Column(String(64), nullable=True) # STUDENT_ID_CARD, FACULTY_AUTHENTICATED_CONFIRMATION, etc.
    correction_reason = Column(String(256), nullable=True)
    verified_by = Column(String(128), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)

    session = relationship("AttendanceSession", back_populates="records")
    student = relationship("Student", back_populates="attendance_records")


class EvidenceVideo(Base):
    __tablename__ = "evidence_videos"

    evidence_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("attendance_sessions.session_id", ondelete="CASCADE"), nullable=False)
    storage_path = Column(String(256), nullable=False)
    file_name = Column(String(128), nullable=False)
    duration_seconds = Column(Float, default=0.0)
    file_size_bytes = Column(Integer, default=0)
    mime_type = Column(String(64), default="video/mp4")
    recording_started_at = Column(DateTime, nullable=True)
    recording_ended_at = Column(DateTime, nullable=True)
    processing_status = Column(String(32), default="STORED")  # STORED, PROCESSED, ARCHIVED
    retention_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("AttendanceSession", back_populates="evidence_videos")


class ODRecord(Base):
    __tablename__ = "od_records"

    od_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False)
    date = Column(String(32), nullable=False)  # YYYY-MM-DD
    reason = Column(String(256), nullable=False)
    event_name = Column(String(128), default="National Technical Symposium")
    approval_status = Column(String(32), default="PENDING")  # PENDING, APPROVED, REJECTED
    approved_by = Column(String(128), default="Faculty In-Charge")
    decision_notes = Column(String(256), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="od_records")


class MedicalLeaveRecord(Base):
    __tablename__ = "medical_leave_records"

    ml_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False)
    date_from = Column(String(32), nullable=False)  # YYYY-MM-DD
    date_to = Column(String(32), nullable=False)    # YYYY-MM-DD
    reason = Column(String(256), nullable=False)
    hospital_name = Column(String(128), default="City Medical Center & Hospital")
    doctor_certificate_ref = Column(Text, nullable=True)
    approval_status = Column(String(32), default="PENDING")  # PENDING, APPROVED, REJECTED
    reviewed_by = Column(String(128), default="Faculty In-Charge")
    decision_notes = Column(String(256), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="ml_records")


class VerificationAuditLog(Base):
    __tablename__ = "verification_audit_logs"

    log_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(Integer, nullable=True)
    attendance_id = Column(Integer, nullable=True)
    student_id = Column(Integer, nullable=True)
    register_number = Column(String(64), nullable=False)
    student_name = Column(String(128), nullable=False)
    match_score = Column(Float, default=0.0)
    raw_cosine = Column(Float, default=0.0)
    status = Column(String(64), nullable=False)  # VERIFIED, IDENTITY_VERIFICATION_REQUIRED, REASSIGNED, REJECTED
    original_ai_prediction = Column(Text, nullable=True)
    final_decision = Column(String(128), nullable=True)
    secondary_verification_method = Column(String(64), nullable=True)  # STUDENT_ID_CARD, FACULTY_AUTHENTICATED_CONFIRMATION, etc.
    correction_reason = Column(Text, nullable=True)
    candidate_scores_json = Column(Text, nullable=True)
    verified_by = Column(String(128), nullable=True)
    notes = Column(Text, nullable=True)
    timestamp = Column(String(64), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class ClassSection(Base):
    __tablename__ = "class_sections"

    class_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(64), unique=True, index=True, nullable=False) # e.g. "IT - 2D"
    department = Column(String(64), nullable=False)
    year = Column(String(16), nullable=False)
    section = Column(String(16), nullable=False)
    default_room = Column(String(64), default="Room 304 / Vision Studio")
    default_reminder = Column(Text, default="Internal assessment discussion today. Students with approved OD should be considered accordingly.")
    created_at = Column(DateTime, default=datetime.utcnow)


class Subject(Base):
    __tablename__ = "subjects"

    subject_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code = Column(String(32), unique=True, index=True, nullable=False) # e.g. "IT204"
    name = Column(String(128), nullable=False) # e.g. "Computer Networks"
    department = Column(String(64), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class SystemConfig(Base):
    __tablename__ = "system_configs"

    config_key = Column(String(64), primary_key=True, index=True)
    config_value = Column(Text, nullable=False)
    description = Column(String(256), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Seed Users
        if db.query(User).count() == 0:
            users_to_seed = [
                User(
                    username="admin",
                    password="password123",
                    full_name="Institution Administrator",
                    email="admin@visionattend.internal",
                    role="ADMIN",
                    assigned_department="ALL DEPARTMENTS",
                    assigned_year="ALL",
                    assigned_section="ALL"
                ),
                User(
                    username="faculty_user",
                    password="password123",
                    full_name="Dr. S. Ramanathan (IT-2D Faculty)",
                    email="faculty_it2d@visionattend.internal",
                    role="CLASS_USER",
                    assigned_department="Department of Information Technology",
                    assigned_year="II Year",
                    assigned_section="IT-2D"
                ),
                User(
                    username="faculty_it2a",
                    password="password123",
                    full_name="Prof. K. Anitha (IT-2A Faculty)",
                    email="faculty_it2a@visionattend.internal",
                    role="CLASS_USER",
                    assigned_department="Department of Information Technology",
                    assigned_year="II Year",
                    assigned_section="IT-2A"
                ),
                User(
                    username="faculty_cse3a",
                    password="password123",
                    full_name="Dr. M. Vignesh (CSE-3A Faculty)",
                    email="faculty_cse3a@visionattend.internal",
                    role="CLASS_USER",
                    assigned_department="Department of Computer Science & Engineering",
                    assigned_year="III Year",
                    assigned_section="CSE-3A"
                ),
                User(
                    username="rep_it2d",
                    password="password123",
                    full_name="Prem Ranjan Kumar (IT-2D Class Representative)",
                    email="rep_it2d@visionattend.internal",
                    role="CLASS_USER",
                    assigned_department="Department of Information Technology",
                    assigned_year="II Year",
                    assigned_section="IT-2D"
                )
            ]
            db.add_all(users_to_seed)

        # 2. Seed Class Sections & Subjects
        if db.query(ClassSection).count() == 0:
            classes = [
                ClassSection(name="IT - 2D", department="Department of Information Technology", year="II Year", section="IT-2D", default_room="Room 304", default_reminder="Internal assessment discussion today. Students with approved OD should be considered accordingly."),
                ClassSection(name="IT - 2A", department="Department of Information Technology", year="II Year", section="IT-2A", default_room="Room 301", default_reminder="Standard lecture session on Computer Networks."),
                ClassSection(name="CSE - 3A", department="Department of Computer Science & Engineering", year="III Year", section="CSE-3A", default_room="Lab 402", default_reminder="Hands-on coding session on AI & Neural Nets."),
                ClassSection(name="ECE - 1B", department="Department of Electronics & Communication", year="I Year", section="ECE-1B", default_room="Room 108", default_reminder="Digital Signal Processing Lab.")
            ]
            db.add_all(classes)

        if db.query(Subject).count() == 0:
            subjects = [
                Subject(code="IT204", name="Computer Networks", department="Department of Information Technology"),
                Subject(code="IT205", name="Operating Systems & Architecture", department="Department of Information Technology"),
                Subject(code="IT206", name="Database Management Systems", department="Department of Information Technology"),
                Subject(code="CS301", name="Artificial Intelligence & Neural Nets", department="Department of Computer Science & Engineering")
            ]
            db.add_all(subjects)

        # 3. Seed System Configs (including Twin-Aware parameters)
        default_configs = [
            ("confidence_threshold", "85.0", "Minimum confidence percentage for high-confidence match (below this goes to Review Required)"),
            ("candidate_separation_margin", "8.0", "Safety separation margin (%) between top and runner-up candidate to rule out ambiguity"),
            ("twin_separation_margin", "12.0", "Elevated separation margin (%) enforced for registered identical twins"),
            ("enable_twin_aware_mode", "true", "Enforce twin-aware candidate comparison and identity verification safeguards"),
            ("retention_policy_days", "90", "Evidence classroom video retention policy duration in days"),
            ("institution_name", "VisionAttend University", "Configured Institution Name"),
            ("department_name", "Department of Information Technology", "Primary Department Name"),
            ("video_storage_backend", "Local Secure Object Storage", "Evidence video storage driver")
        ]
        for k, v, desc in default_configs:
            if not db.query(SystemConfig).filter(SystemConfig.config_key == k).first():
                db.add(SystemConfig(config_key=k, config_value=v, description=desc))

        db.commit()

        # 4. Safe Schema Migration for existing SQLite database
        try:
            with engine.connect() as conn:
                # Migrate students
                cols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(students)").fetchall()]
                if "is_twin" not in cols:
                    conn.exec_driver_sql("ALTER TABLE students ADD COLUMN is_twin BOOLEAN DEFAULT 0")
                if "twin_sibling_id" not in cols:
                    conn.exec_driver_sql("ALTER TABLE students ADD COLUMN twin_sibling_id INTEGER")
                if "twin_notes" not in cols:
                    conn.exec_driver_sql("ALTER TABLE students ADD COLUMN twin_notes VARCHAR(256)")

                # Migrate attendance_records
                cols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(attendance_records)").fetchall()]
                if "candidate_details_json" not in cols:
                    conn.exec_driver_sql("ALTER TABLE attendance_records ADD COLUMN candidate_details_json TEXT")
                if "secondary_verification_method" not in cols:
                    conn.exec_driver_sql("ALTER TABLE attendance_records ADD COLUMN secondary_verification_method VARCHAR(64)")
                if "correction_reason" not in cols:
                    conn.exec_driver_sql("ALTER TABLE attendance_records ADD COLUMN correction_reason VARCHAR(256)")

                # Migrate verification_audit_logs
                cols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(verification_audit_logs)").fetchall()]
                if "session_id" not in cols:
                    conn.exec_driver_sql("ALTER TABLE verification_audit_logs ADD COLUMN session_id INTEGER")
                if "attendance_id" not in cols:
                    conn.exec_driver_sql("ALTER TABLE verification_audit_logs ADD COLUMN attendance_id INTEGER")
                if "original_ai_prediction" not in cols:
                    conn.exec_driver_sql("ALTER TABLE verification_audit_logs ADD COLUMN original_ai_prediction TEXT")
                if "final_decision" not in cols:
                    conn.exec_driver_sql("ALTER TABLE verification_audit_logs ADD COLUMN final_decision VARCHAR(128)")
                if "secondary_verification_method" not in cols:
                    conn.exec_driver_sql("ALTER TABLE verification_audit_logs ADD COLUMN secondary_verification_method VARCHAR(64)")
                if "correction_reason" not in cols:
                    conn.exec_driver_sql("ALTER TABLE verification_audit_logs ADD COLUMN correction_reason TEXT")
                if "candidate_scores_json" not in cols:
                    conn.exec_driver_sql("ALTER TABLE verification_audit_logs ADD COLUMN candidate_scores_json TEXT")
                conn.commit()
        except Exception as mig_err:
            print("Schema migration note:", mig_err)

    except Exception as e:
        print("Error initializing seed database:", e)
        db.rollback()
    finally:
        db.close()


init_db()
