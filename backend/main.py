import csv
import io
import json
import os
import re
import shutil
import uuid
from datetime import datetime, date, timedelta
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, Query, Request, Response, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import (
    Base, engine, get_db, SessionLocal, 
    User, Student, FaceProfile, AttendanceSession, AttendanceRecord, 
    EvidenceVideo, ODRecord, MedicalLeaveRecord, VerificationAuditLog, 
    ClassSection, Subject, SystemConfig, init_db
)
from models import (
    UserLogin, UserCreate, UserUpdate, UserOut,
    StudentCreate, StudentUpdate, StudentOut, FaceProfileOut,
    ODCreate, ODReviewRequest, ODOut,
    MedicalLeaveCreate, MedicalLeaveReview, MedicalLeaveOut,
    VerificationLogCreate, VerificationLogOut, TestVerificationRequest,
    AttendanceSessionCreate, AttendanceSessionOut, AttendanceRecordOut,
    EvidenceVideoOut, BatchVerifyRequest, ReviewResolution,
    ClassSectionCreate, ClassSectionOut, SubjectCreate, SubjectOut,
    SystemConfigItem
)
from vision_engine import vision_engine

# Ensure tables and seed database are initialized
init_db()

# Evidence storage directory
EVIDENCE_DIR = os.path.join(os.path.dirname(__file__), "evidence")
os.makedirs(EVIDENCE_DIR, exist_ok=True)

app = FastAPI(
    title="VisionAttend Portal API",
    description="VisionAttend - AI-Assisted Mobile Classroom Attendance & Video Evidence System (Team VisionRaiders)",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_confidence_threshold(db: Session) -> float:
    cfg = db.query(SystemConfig).filter(SystemConfig.config_key == "confidence_threshold").first()
    if cfg:
        try:
            return float(cfg.config_value)
        except ValueError:
            pass
    return 85.0


def get_candidate_separation_margin(db: Session) -> float:
    cfg = db.query(SystemConfig).filter(SystemConfig.config_key == "candidate_separation_margin").first()
    if cfg:
        try:
            return float(cfg.config_value)
        except ValueError:
            pass
    return 8.0


def get_twin_separation_margin(db: Session) -> float:
    cfg = db.query(SystemConfig).filter(SystemConfig.config_key == "twin_separation_margin").first()
    if cfg:
        try:
            return float(cfg.config_value)
        except ValueError:
            pass
    return 12.0


def format_session_response(session: AttendanceSession, db: Session) -> AttendanceSessionOut:
    records_out = []
    for r in session.records:
        student = r.student or db.query(Student).filter(Student.student_id == r.student_id).first()
        records_out.append(
            AttendanceRecordOut(
                attendance_id=r.attendance_id,
                session_id=r.session_id,
                student_id=r.student_id,
                student_name=student.name if student else "Unknown Student",
                visionattend_id=student.visionattend_id if student else "N/A",
                register_number=student.register_number if student else "N/A",
                department=student.department if student else session.department,
                year_section=f"{student.year} / {student.section}" if student else session.year_section,
                avatar_url=student.avatar_url if student else None,
                is_twin=student.is_twin if student else False,
                status=r.status,
                ai_status=r.ai_status or r.status,
                confidence=r.confidence,
                detection_count=r.detection_count,
                consecutive_frames=r.consecutive_frames,
                last_detected_time=r.last_detected_time,
                best_frame_path=r.best_frame_path,
                video_frame_path=r.video_frame_path,
                candidate_details_json=r.candidate_details_json,
                od_applied=r.od_applied,
                ml_applied=r.ml_applied,
                verification_status=r.verification_status,
                secondary_verification_method=r.secondary_verification_method,
                correction_reason=r.correction_reason,
                verified_by=r.verified_by,
                verified_at=r.verified_at,
                notes=r.notes
            )
        )

    evidence_out = []
    for ev in session.evidence_videos:
        evidence_out.append(
            EvidenceVideoOut(
                evidence_id=ev.evidence_id,
                session_id=ev.session_id,
                file_name=ev.file_name,
                storage_path=ev.storage_path,
                duration_seconds=ev.duration_seconds,
                file_size_bytes=ev.file_size_bytes,
                mime_type=ev.mime_type,
                recording_started_at=ev.recording_started_at,
                recording_ended_at=ev.recording_ended_at,
                processing_status=ev.processing_status,
                created_at=ev.created_at
            )
        )

    return AttendanceSessionOut(
        session_id=session.session_id,
        session_code=session.session_code or f"ATT-{session.date.replace('-', '')}-{session.session_id:03d}",
        faculty_name=session.faculty_name,
        subject=session.subject,
        department=session.department,
        year_section=session.year_section,
        room_number=session.room_number,
        description_reminder=session.description_reminder,
        date=session.date,
        start_time=session.start_time,
        end_time=session.end_time,
        status=session.status,
        total_students=session.total_students,
        present_count=session.present_count,
        absent_count=session.absent_count,
        od_count=session.od_count,
        ml_count=session.ml_count,
        review_count=session.review_count,
        unknown_count=session.unknown_count,
        video_path=session.video_path,
        video_filename=session.video_filename,
        video_duration=session.video_duration,
        video_size_bytes=session.video_size_bytes,
        evidence_status=session.evidence_status,
        retention_days=session.retention_days,
        created_at=session.created_at,
        records=records_out,
        evidence_videos=evidence_out
    )


# ==========================================
# 1. AUTHENTICATION & USERS
# ==========================================

@app.post("/api/auth/login", response_model=UserOut)
def login_user(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.username == payload.username.strip(),
        User.password == payload.password
    ).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    return user


@app.post("/api/auth/register", response_model=UserOut)
def register_user(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == payload.username.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered. Please choose a different username.")
    
    # Auto-create class section if not exists and provided
    if payload.assigned_section and payload.assigned_section != "ALL":
        existing_cls = db.query(ClassSection).filter(
            (ClassSection.section == payload.assigned_section) | (ClassSection.name == payload.assigned_section)
        ).first()
        if not existing_cls:
            new_cls = ClassSection(
                name=payload.assigned_section,
                department=payload.assigned_department or "Department of Information Technology",
                year=payload.assigned_year or "II Year",
                section=payload.assigned_section,
                default_room="Room 304",
                default_reminder=f"Session reminder for {payload.assigned_section}"
            )
            db.add(new_cls)
            db.commit()

    user = User(
        username=payload.username.strip(),
        password=payload.password,
        full_name=payload.full_name.strip(),
        email=payload.email,
        role=payload.role or "CLASS_USER",
        assigned_department=payload.assigned_department or "Department of Information Technology",
        assigned_year=payload.assigned_year or "II Year",
        assigned_section=payload.assigned_section or "IT-2D",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.get("/api/auth/class-users")
def get_class_users(db: Session = Depends(get_db)):
    """Returns available class users and admin accounts for login selection."""
    users = db.query(User).filter(User.is_active == True).all()
    classes = db.query(ClassSection).all()
    
    return {
        "users": [
            {
                "user_id": u.user_id,
                "username": u.username,
                "full_name": u.full_name,
                "role": u.role,
                "assigned_department": u.assigned_department,
                "assigned_year": u.assigned_year,
                "assigned_section": u.assigned_section
            }
            for u in users
        ],
        "classes": [
            {
                "class_id": c.class_id,
                "name": c.name,
                "department": c.department,
                "year": c.year,
                "section": c.section,
                "default_room": c.default_room,
                "default_reminder": c.default_reminder
            }
            for c in classes
        ]
    }


@app.get("/api/users", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).all()


@app.post("/api/users", response_model=UserOut)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    return register_user(payload, db)


@app.delete("/api/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}


@app.get("/api/classes", response_model=List[ClassSectionOut])
def get_classes(db: Session = Depends(get_db)):
    return db.query(ClassSection).order_by(ClassSection.name.asc()).all()


@app.post("/api/classes", response_model=ClassSectionOut)
def create_class_section(payload: ClassSectionCreate, db: Session = Depends(get_db)):
    existing = db.query(ClassSection).filter(ClassSection.name == payload.name.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Class with this name already exists")
    cs = ClassSection(
        name=payload.name.strip(),
        department=payload.department.strip(),
        year=payload.year.strip(),
        section=payload.section.strip(),
        default_room=payload.default_room or "Room 304",
        default_reminder=payload.default_reminder
    )
    db.add(cs)
    db.commit()
    db.refresh(cs)
    return cs


@app.get("/api/subjects", response_model=List[SubjectOut])
def get_subjects(department: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Subject)
    if department and department != "ALL" and department != "ALL DEPARTMENTS":
        q = q.filter(Subject.department == department)
    return q.order_by(Subject.code.asc()).all()


@app.post("/api/subjects", response_model=SubjectOut)
def create_subject(payload: SubjectCreate, db: Session = Depends(get_db)):
    existing = db.query(Subject).filter(Subject.code == payload.code.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Subject code already exists")
    sub = Subject(
        code=payload.code.strip().upper(),
        name=payload.name.strip(),
        department=payload.department.strip()
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


# ==========================================
# 2. STUDENTS & FACE PROFILES
# ==========================================

@app.get("/api/students", response_model=List[StudentOut])
def get_students(
    search: Optional[str] = None,
    department: Optional[str] = None,
    year: Optional[str] = None,
    section: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Student).order_by(Student.register_number.asc())
    if search:
        s = f"%{search.strip()}%"
        query = query.filter((Student.name.ilike(s)) | (Student.register_number.ilike(s)) | (Student.visionattend_id.ilike(s)))
    if department and department != "ALL" and department != "ALL DEPARTMENTS":
        query = query.filter(Student.department == department)
    if year and year != "ALL":
        query = query.filter(Student.year == year)
    if section and section != "ALL":
        query = query.filter(Student.section == section)
    return query.all()


@app.get("/api/students/{student_id}", response_model=StudentOut)
def get_student(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@app.post("/api/students", response_model=StudentOut)
def create_student(payload: StudentCreate, db: Session = Depends(get_db)):
    reg = payload.register_number.strip().upper()
    if db.query(Student).filter(Student.register_number == reg).first():
        raise HTTPException(status_code=400, detail="Student with this Register Number already exists")

    visionattend_id = f"VA-{reg}"
    photo_count = len(payload.photos) if payload.photos else 0
    q_assessment = vision_engine.assess_face_quality(photo_count)

    primary_avatar = payload.avatar_url
    if not primary_avatar and payload.photos and len(payload.photos) > 0:
        primary_avatar = payload.photos[0].image_data

    student = Student(
        visionattend_id=visionattend_id,
        register_number=reg,
        name=payload.name.strip(),
        department=payload.department,
        year=payload.year,
        section=payload.section,
        email=payload.email.strip(),
        phone=payload.phone.strip(),
        face_profile_status=q_assessment["status"],
        readiness_score=q_assessment["readiness_score"],
        profile_quality=q_assessment["profile_quality"],
        avatar_url=primary_avatar,
        is_twin=bool(payload.is_twin),
        twin_sibling_id=payload.twin_sibling_id,
        twin_notes=payload.twin_notes
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    if payload.photos:
        for idx, p in enumerate(payload.photos):
            emb_list = vision_engine.compute_embedding_from_b64(p.image_data)
            fp = FaceProfile(
                student_id=student.student_id,
                image_reference=p.image_data,
                photo_label=p.photo_label or f"Photo {idx + 1}",
                pose_angle=p.pose_angle or "Frontal",
                embedding_json=json.dumps(emb_list) if emb_list else None,
                quality_score=96.0,
                lighting_score=94.0,
                sharpness_score=97.0
            )
            db.add(fp)
        db.commit()
        db.refresh(student)

    vision_engine.invalidate_student_cache(student.student_id)
    return student


@app.put("/api/students/{student_id}", response_model=StudentOut)
def update_student(student_id: int, payload: StudentUpdate, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if payload.name is not None:
        student.name = payload.name.strip()
    if payload.department is not None:
        student.department = payload.department
    if payload.year is not None:
        student.year = payload.year
    if payload.section is not None:
        student.section = payload.section
    if payload.email is not None:
        student.email = payload.email.strip()
    if payload.phone is not None:
        student.phone = payload.phone.strip()
    if payload.is_twin is not None:
        student.is_twin = payload.is_twin
    if payload.twin_sibling_id is not None:
        student.twin_sibling_id = payload.twin_sibling_id
    if payload.twin_notes is not None:
        student.twin_notes = payload.twin_notes

    db.commit()
    db.refresh(student)
    vision_engine.invalidate_student_cache(student_id)
    return student


@app.delete("/api/students/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    db.delete(student)
    db.commit()
    vision_engine.invalidate_student_cache(student_id)
    return {"message": "Student record removed"}


# ==========================================
# 3. ON-DUTY (OD) MODULE
# ==========================================

@app.get("/api/od", response_model=List[ODOut])
def get_od_records(
    department: Optional[str] = None,
    section: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ODRecord).order_by(ODRecord.od_id.desc())
    if status and status != "ALL":
        query = query.filter(ODRecord.approval_status == status)

    ods = query.all()
    stud_map = {s.student_id: s for s in db.query(Student).all()}

    res = []
    for od in ods:
        s = stud_map.get(od.student_id)
        if s:
            if department and department != "ALL" and department != "ALL DEPARTMENTS" and s.department != department:
                continue
            if section and section != "ALL" and s.section != section:
                continue

        res.append(
            ODOut(
                od_id=od.od_id,
                student_id=od.student_id,
                student_name=s.name if s else "Unknown",
                visionattend_id=s.visionattend_id if s else "N/A",
                register_number=s.register_number if s else "N/A",
                department=s.department if s else "N/A",
                year_section=f"{s.year} / {s.section}" if s else "N/A",
                date=od.date,
                reason=od.reason,
                event_name=od.event_name,
                approval_status=od.approval_status,
                approved_by=od.approved_by,
                decision_notes=od.decision_notes,
                created_at=od.created_at
            )
        )
    return res


@app.post("/api/od", response_model=ODOut)
def create_od_record(payload: ODCreate, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.student_id == payload.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    od = ODRecord(
        student_id=payload.student_id,
        date=payload.date,
        reason=payload.reason.strip(),
        event_name=payload.event_name or "Official University Event",
        approval_status=payload.approval_status or "PENDING",
        approved_by=payload.approved_by or "Faculty In-Charge",
        created_at=datetime.utcnow()
    )
    db.add(od)
    db.commit()
    db.refresh(od)

    return ODOut(
        od_id=od.od_id,
        student_id=od.student_id,
        student_name=student.name,
        visionattend_id=student.visionattend_id,
        register_number=student.register_number,
        department=student.department,
        year_section=f"{student.year} / {student.section}",
        date=od.date,
        reason=od.reason,
        event_name=od.event_name,
        approval_status=od.approval_status,
        approved_by=od.approved_by,
        decision_notes=od.decision_notes,
        created_at=od.created_at
    )


@app.put("/api/od/{od_id}/review", response_model=ODOut)
def review_od_record(od_id: int, payload: ODReviewRequest, db: Session = Depends(get_db)):
    od = db.query(ODRecord).filter(ODRecord.od_id == od_id).first()
    if not od:
        raise HTTPException(status_code=404, detail="OD Record not found")

    od.approval_status = payload.approval_status.upper()
    od.approved_by = payload.reviewed_by
    if payload.decision_notes:
        od.decision_notes = payload.decision_notes
    
    db.commit()
    db.refresh(od)

    student = db.query(Student).filter(Student.student_id == od.student_id).first()
    return ODOut(
        od_id=od.od_id,
        student_id=od.student_id,
        student_name=student.name if student else "Unknown",
        visionattend_id=student.visionattend_id if student else "N/A",
        register_number=student.register_number if student else "N/A",
        department=student.department if student else "N/A",
        year_section=f"{student.year} / {student.section}" if student else "N/A",
        date=od.date,
        reason=od.reason,
        event_name=od.event_name,
        approval_status=od.approval_status,
        approved_by=od.approved_by,
        decision_notes=od.decision_notes,
        created_at=od.created_at
    )


@app.delete("/api/od/{od_id}")
def delete_od_record(od_id: int, db: Session = Depends(get_db)):
    od = db.query(ODRecord).filter(ODRecord.od_id == od_id).first()
    if not od:
        raise HTTPException(status_code=404, detail="OD Record not found")
    db.delete(od)
    db.commit()
    return {"message": "OD record removed successfully."}


# ==========================================
# 4. MEDICAL LEAVE (ML) MODULE
# ==========================================

@app.get("/api/medical-leave", response_model=List[MedicalLeaveOut])
def get_medical_leaves(
    department: Optional[str] = None,
    section: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(MedicalLeaveRecord).order_by(MedicalLeaveRecord.ml_id.desc())
    if status and status != "ALL":
        query = query.filter(MedicalLeaveRecord.approval_status == status)

    mls = query.all()
    stud_map = {s.student_id: s for s in db.query(Student).all()}

    res = []
    for ml in mls:
        s = stud_map.get(ml.student_id)
        if s:
            if department and department != "ALL" and department != "ALL DEPARTMENTS" and s.department != department:
                continue
            if section and section != "ALL" and s.section != section:
                continue

        res.append(
            MedicalLeaveOut(
                ml_id=ml.ml_id,
                student_id=ml.student_id,
                student_name=s.name if s else "Unknown",
                visionattend_id=s.visionattend_id if s else "N/A",
                register_number=s.register_number if s else "N/A",
                department=s.department if s else "N/A",
                year_section=f"{s.year} / {s.section}" if s else "N/A",
                date_from=ml.date_from,
                date_to=ml.date_to,
                reason=ml.reason,
                hospital_name=ml.hospital_name,
                doctor_certificate_ref=ml.doctor_certificate_ref,
                approval_status=ml.approval_status,
                reviewed_by=ml.reviewed_by,
                decision_notes=ml.decision_notes,
                created_at=ml.created_at
            )
        )
    return res


@app.post("/api/medical-leave", response_model=MedicalLeaveOut)
def create_medical_leave(payload: MedicalLeaveCreate, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.student_id == payload.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    ml = MedicalLeaveRecord(
        student_id=payload.student_id,
        date_from=payload.date_from,
        date_to=payload.date_to,
        reason=payload.reason.strip(),
        hospital_name=payload.hospital_name or "City Medical Center & Hospital",
        doctor_certificate_ref=payload.doctor_certificate_ref,
        approval_status=payload.approval_status or "PENDING",
        reviewed_by=payload.reviewed_by or "Faculty In-Charge",
        created_at=datetime.utcnow()
    )
    db.add(ml)
    db.commit()
    db.refresh(ml)

    return MedicalLeaveOut(
        ml_id=ml.ml_id,
        student_id=ml.student_id,
        student_name=student.name,
        visionattend_id=student.visionattend_id,
        register_number=student.register_number,
        department=student.department,
        year_section=f"{student.year} / {student.section}",
        date_from=ml.date_from,
        date_to=ml.date_to,
        reason=ml.reason,
        hospital_name=ml.hospital_name,
        doctor_certificate_ref=ml.doctor_certificate_ref,
        approval_status=ml.approval_status,
        reviewed_by=ml.reviewed_by,
        decision_notes=ml.decision_notes,
        created_at=ml.created_at
    )


@app.put("/api/medical-leave/{ml_id}/review", response_model=MedicalLeaveOut)
def review_medical_leave(ml_id: int, payload: MedicalLeaveReview, db: Session = Depends(get_db)):
    ml = db.query(MedicalLeaveRecord).filter(MedicalLeaveRecord.ml_id == ml_id).first()
    if not ml:
        raise HTTPException(status_code=404, detail="Medical Leave record not found")

    ml.approval_status = payload.approval_status.upper()
    ml.reviewed_by = payload.reviewed_by
    if payload.decision_notes:
        ml.decision_notes = payload.decision_notes
    
    db.commit()
    db.refresh(ml)

    student = db.query(Student).filter(Student.student_id == ml.student_id).first()
    return MedicalLeaveOut(
        ml_id=ml.ml_id,
        student_id=ml.student_id,
        student_name=student.name if student else "Unknown",
        visionattend_id=student.visionattend_id if student else "N/A",
        register_number=student.register_number if student else "N/A",
        department=student.department if student else "N/A",
        year_section=f"{student.year} / {student.section}" if student else "N/A",
        date_from=ml.date_from,
        date_to=ml.date_to,
        reason=ml.reason,
        hospital_name=ml.hospital_name,
        doctor_certificate_ref=ml.doctor_certificate_ref,
        approval_status=ml.approval_status,
        reviewed_by=ml.reviewed_by,
        decision_notes=ml.decision_notes,
        created_at=ml.created_at
    )


@app.delete("/api/medical-leave/{ml_id}")
def delete_medical_leave(ml_id: int, db: Session = Depends(get_db)):
    ml = db.query(MedicalLeaveRecord).filter(MedicalLeaveRecord.ml_id == ml_id).first()
    if not ml:
        raise HTTPException(status_code=404, detail="Medical Leave record not found")
    db.delete(ml)
    db.commit()
    return {"message": "Medical Leave record removed successfully."}


# ==========================================
# 5. ATTENDANCE SESSIONS & VIDEO EVIDENCE
# ==========================================

@app.get("/api/sessions", response_model=List[AttendanceSessionOut])
def get_sessions(
    department: Optional[str] = None,
    year_section: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(AttendanceSession).order_by(AttendanceSession.session_id.desc())
    if department and department != "ALL" and department != "ALL DEPARTMENTS":
        query = query.filter(AttendanceSession.department == department)
    if year_section and year_section != "ALL":
        query = query.filter(AttendanceSession.year_section == year_section)
    sessions = query.limit(limit).all()
    return [format_session_response(s, db) for s in sessions]


@app.get("/api/sessions/{session_id}", response_model=AttendanceSessionOut)
def get_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(AttendanceSession).filter(AttendanceSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return format_session_response(session, db)


@app.post("/api/sessions", response_model=AttendanceSessionOut)
def create_session(payload: AttendanceSessionCreate, db: Session = Depends(get_db)):
    s_date = payload.date or date.today().isoformat()
    now_str = datetime.now().strftime("%I:%M %p")

    # Generate unique session code ATT-YYYYMMDD-XXX
    day_count = db.query(AttendanceSession).filter(AttendanceSession.date == s_date).count() + 1
    clean_date = s_date.replace("-", "")
    session_code = f"ATT-{clean_date}-{day_count:03d}"

    # Scope students to the session's department and section (fallback to all if generic)
    stud_query = db.query(Student)
    if payload.department and payload.department not in ["ALL", "ALL DEPARTMENTS"]:
        stud_query = stud_query.filter(Student.department == payload.department)
    if payload.year_section and payload.year_section not in ["ALL", "ALL SECTIONS"]:
        sec_token = payload.year_section.split("/")[-1].strip()
        stud_query = stud_query.filter(
            (Student.section == sec_token) | 
            (Student.section == payload.year_section) |
            ((Student.year + " / " + Student.section) == payload.year_section)
        )
    students = stud_query.all()
    if not students:
        students = db.query(Student).all()
    total = len(students)

    new_session = AttendanceSession(
        session_code=session_code,
        faculty_name=payload.faculty_name or "Dr. S. Ramanathan, Faculty Advisor",
        subject=payload.subject,
        department=payload.department,
        year_section=payload.year_section,
        room_number=payload.room_number or "Room 304 / Vision Studio",
        description_reminder=payload.description_reminder or "Internal assessment discussion today. Students with approved OD should be considered accordingly.",
        date=s_date,
        start_time=now_str,
        status="LIVE",
        total_students=total,
        present_count=0,
        absent_count=total,
        od_count=0,
        ml_count=0,
        review_count=0,
        unknown_count=0
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    # Active ODs for date
    active_ods = {
        od.student_id: od for od in db.query(ODRecord).filter(
            ODRecord.date == s_date,
            ODRecord.approval_status == "APPROVED"
        ).all()
    }

    # Active Medical Leaves for date range
    active_mls = {}
    all_mls = db.query(MedicalLeaveRecord).filter(MedicalLeaveRecord.approval_status == "APPROVED").all()
    for ml in all_mls:
        if ml.date_from <= s_date <= ml.date_to:
            active_mls[ml.student_id] = ml

    od_count = 0
    ml_count = 0

    for stud in students:
        is_od = stud.student_id in active_ods
        is_ml = stud.student_id in active_mls

        if is_od:
            od_count += 1
            rec_status = "OD"
            ai_st = "OD"
            v_status = "APPROVED_OD"
            notes = f"Approved OD: {active_ods[stud.student_id].reason}"
        elif is_ml:
            ml_count += 1
            rec_status = "ML"
            ai_st = "ML"
            v_status = "APPROVED_ML"
            notes = f"Approved Medical Leave: {active_mls[stud.student_id].reason}"
        else:
            rec_status = "ABSENT"
            ai_st = "ABSENT"
            v_status = "PENDING"
            notes = "Awaiting Live Camera Verification"

        rec = AttendanceRecord(
            session_id=new_session.session_id,
            student_id=stud.student_id,
            status=rec_status,
            ai_status=ai_st,
            confidence=0.0,
            detection_count=0,
            consecutive_frames=0,
            od_applied=is_od,
            ml_applied=is_ml,
            verification_status=v_status,
            notes=notes
        )
        db.add(rec)

    new_session.od_count = od_count
    new_session.ml_count = ml_count
    new_session.absent_count = max(0, total - (od_count + ml_count))

    db.commit()
    db.refresh(new_session)
    vision_engine.reset_session(new_session.session_id)
    return format_session_response(new_session, db)


@app.post("/api/sessions/{session_id}/process-frame")
def process_live_frame(session_id: int, payload: dict, db: Session = Depends(get_db)):
    session = db.query(AttendanceSession).filter(AttendanceSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    students = db.query(Student).all()
    students_dicts = []
    for s in students:
        photos_data = [fp.image_reference for fp in s.face_profiles if fp.image_reference]
        embs_data = [fp.embedding_json for fp in s.face_profiles if fp.embedding_json]
        if not photos_data and s.avatar_url:
            photos_data.append(s.avatar_url)
        students_dicts.append({
            "student_id": s.student_id,
            "visionattend_id": s.visionattend_id,
            "register_number": s.register_number,
            "name": s.name,
            "department": s.department,
            "avatar_url": s.avatar_url,
            "is_twin": s.is_twin,
            "twin_sibling_id": s.twin_sibling_id,
            "twin_notes": s.twin_notes,
            "photos": photos_data,
            "embeddings": embs_data
        })

    active_ods = [
        od.student_id for od in db.query(ODRecord).filter(
            ODRecord.date == session.date,
            ODRecord.approval_status == "APPROVED"
        ).all()
    ]

    active_mls = []
    all_mls = db.query(MedicalLeaveRecord).filter(MedicalLeaveRecord.approval_status == "APPROVED").all()
    for ml in all_mls:
        if ml.date_from <= session.date <= ml.date_to:
            active_mls.append(ml.student_id)

    threshold = get_confidence_threshold(db)
    cand_margin = get_candidate_separation_margin(db)
    twin_margin = get_twin_separation_margin(db)
    webcam_b64 = payload.get("image_base64")

    result = vision_engine.process_camera_frame(
        session_id=session_id,
        registered_students=students_dicts,
        active_od_student_ids=active_ods,
        active_ml_student_ids=active_mls,
        webcam_image_base64=webcam_b64,
        confidence_threshold=threshold,
        candidate_separation_margin=cand_margin,
        twin_separation_margin=twin_margin
    )

    candidates = result["candidates"]
    present_c = len([c for c in candidates if c["status"] == "PRESENT"])
    review_c = len([c for c in candidates if c["status"] == "REVIEW"])
    od_c = len(active_ods)
    ml_c = len(active_mls)
    absent_c = max(0, session.total_students - (present_c + od_c + ml_c + review_c))

    session.present_count = present_c
    session.review_count = review_c
    session.od_count = od_c
    session.ml_count = ml_c
    session.absent_count = absent_c
    session.unknown_count = result["unknown_count"]
    db.commit()

    return {
        "success": True,
        "session_id": session_id,
        "timestamp": result["timestamp"],
        "boxes": result["boxes"],
        "faces_detected": result["faces_detected"],
        "recognized_count": result["recognized_count"],
        "review_count": result["review_count"],
        "unknown_count": result["unknown_count"],
        "present_candidates_count": present_c,
        "candidates": candidates
    }


@app.post("/api/sessions/{session_id}/stop")
def stop_session(session_id: int, payload: Optional[dict] = None, db: Session = Depends(get_db)):
    session = db.query(AttendanceSession).filter(AttendanceSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.status = "DRAFT"
    session.end_time = datetime.now().strftime("%I:%M %p")
    if payload and "duration_seconds" in payload:
        session.video_duration = float(payload["duration_seconds"])

    candidates = vision_engine.session_candidates.get(session_id, {})
    records = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session_id).all()

    present_count = 0
    review_count = 0
    od_count = 0
    ml_count = 0
    absent_count = 0

    for r in records:
        # 1. If student was recognized during attendance session, they are physically PRESENT (or held in REVIEW if ambiguous/twin)
        if r.student_id in candidates:
            c = candidates[r.student_id]
            r.status = c["status"]  # "PRESENT" or "REVIEW"
            r.ai_status = c.get("ai_status", c["status"])
            r.confidence = c["confidence"]
            r.detection_count = c["detection_count"]
            r.consecutive_frames = c["consecutive_frames"]
            r.last_detected_time = c.get("last_detected", datetime.now().strftime("%I:%M:%S %p"))
            
            # Save extracted best frame thumbnail & full scene snapshot
            if c.get("best_frame_b64"):
                r.best_frame_path = c["best_frame_b64"]
            if c.get("scene_frame_b64"):
                r.video_frame_path = c["scene_frame_b64"]
            if c.get("candidate_details"):
                r.candidate_details_json = json.dumps(c["candidate_details"])

            if r.status == "REVIEW" and r.ai_status == "IDENTITY_VERIFICATION_REQUIRED":
                r.verification_status = "IDENTITY_VERIFICATION_REQUIRED"
                r.notes = "Twin / High-Similarity Ambiguity: Candidate separation within margin threshold. Secondary verification required."
            elif r.status == "PRESENT":
                r.verification_status = "PENDING"
                r.notes = f"AI Vision Detection ({c['confidence']}% Match Score - Verified Present)"
            else:
                r.verification_status = "PENDING_REVIEW"
                r.notes = f"Low Confidence ({c['confidence']}%) - Faculty Review Required"

            if r.status == "PRESENT":
                present_count += 1
            elif r.status == "REVIEW":
                review_count += 1
        # 2. Only if NOT detected in class, check if they have approved OD or Medical Leave
        elif r.od_applied:
            r.status = "OD"
            r.ai_status = "OD"
            r.verification_status = "APPROVED_OD"
            r.confidence = 0.0
            r.notes = "Absent in class - Approved OD on file applied"
            od_count += 1
        elif r.ml_applied:
            r.status = "ML"
            r.ai_status = "ML"
            r.verification_status = "APPROVED_ML"
            r.confidence = 0.0
            r.notes = "Absent in class - Approved Medical Leave applied"
            ml_count += 1
        else:
            r.status = "ABSENT"
            r.ai_status = "ABSENT"
            r.confidence = 0.0
            r.notes = "Not detected in recorded classroom session"
            absent_count += 1

    session.present_count = present_count
    session.review_count = review_count
    session.od_count = od_count
    session.ml_count = ml_count
    session.absent_count = absent_count

    db.commit()
    return {"message": "Attendance session stopped. Attendance Draft ready for Faculty Review.", "session": format_session_response(session, db)}


@app.post("/api/sessions/{session_id}/upload-evidence")
def upload_session_evidence(
    session_id: int,
    video_file: UploadFile = File(...),
    duration: float = Form(0.0),
    db: Session = Depends(get_db)
):
    session = db.query(AttendanceSession).filter(AttendanceSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    file_ext = os.path.splitext(video_file.filename or "")[1].lower()
    if not file_ext or file_ext not in [".mp4", ".webm", ".mkv", ".avi", ".mov"]:
        file_ext = ".webm" if "webm" in (video_file.content_type or "") else ".mp4"

    saved_filename = f"evidence_session_{session.session_id}_{uuid.uuid4().hex[:8]}{file_ext}"
    saved_path = os.path.join(EVIDENCE_DIR, saved_filename)

    with open(saved_path, "wb") as f:
        shutil.copyfileobj(video_file.file, f)

    file_size = os.path.getsize(saved_path)

    # 1. Prepare registered students for deep recognition
    students = db.query(Student).all()
    students_dicts = []
    for s in students:
        photos_data = [fp.image_reference for fp in s.face_profiles if fp.image_reference]
        embs_data = [fp.embedding_json for fp in s.face_profiles if fp.embedding_json]
        if not photos_data and s.avatar_url:
            photos_data.append(s.avatar_url)
        students_dicts.append({
            "student_id": s.student_id,
            "visionattend_id": s.visionattend_id,
            "register_number": s.register_number,
            "name": s.name,
            "department": s.department,
            "avatar_url": s.avatar_url,
            "is_twin": s.is_twin,
            "twin_sibling_id": s.twin_sibling_id,
            "twin_notes": s.twin_notes,
            "photos": photos_data,
            "embeddings": embs_data
        })

    threshold = get_confidence_threshold(db)
    cand_margin = get_candidate_separation_margin(db)
    twin_margin = get_twin_separation_margin(db)

    # 2. Process video frames through Deep Neural Vision Engine
    proc_result = vision_engine.process_video_file(
        session_id=session.session_id,
        video_path=saved_path,
        registered_students=students_dicts,
        confidence_threshold=threshold,
        candidate_separation_margin=cand_margin,
        twin_separation_margin=twin_margin,
        sample_fps=2.0
    )

    actual_duration = proc_result.get("duration_seconds") or duration or session.video_duration or 45.0

    # 3. Save Evidence record
    detected_mime = "video/webm" if file_ext == ".webm" else "video/mp4"
    ev_video = EvidenceVideo(
        session_id=session.session_id,
        storage_path=saved_path,
        file_name=saved_filename,
        duration_seconds=actual_duration,
        file_size_bytes=file_size,
        mime_type=video_file.content_type or detected_mime,
        recording_started_at=datetime.utcnow() - timedelta(seconds=actual_duration),
        recording_ended_at=datetime.utcnow(),
        processing_status="PROCESSED",
        retention_expires_at=datetime.utcnow() + timedelta(days=session.retention_days)
    )
    db.add(ev_video)

    session.video_path = saved_path
    session.video_filename = saved_filename
    session.video_duration = actual_duration
    session.video_size_bytes = file_size
    session.evidence_status = "STORED"
    session.present_count = proc_result.get("present_count", 0)
    session.review_count = proc_result.get("review_count", 0)
    session.unknown_count = proc_result.get("unknown_count", 0)

    # Update session attendance records with recognized candidates
    candidates = vision_engine.session_candidates.get(session.session_id, {})
    records = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session.session_id).all()
    for r in records:
        if r.student_id in candidates:
            c = candidates[r.student_id]
            r.status = c["status"]
            r.ai_status = c.get("ai_status", c["status"])
            r.confidence = c["confidence"]
            r.detection_count = c["detection_count"]
            r.consecutive_frames = c["consecutive_frames"]
            r.last_detected_time = c.get("last_detected")
            if c.get("best_frame_b64"):
                r.best_frame_path = c["best_frame_b64"]
            if c.get("scene_frame_b64"):
                r.video_frame_path = c["scene_frame_b64"]
            if c.get("candidate_details"):
                r.candidate_details_json = json.dumps(c["candidate_details"])

            if r.status == "REVIEW" and r.ai_status == "IDENTITY_VERIFICATION_REQUIRED":
                r.verification_status = "IDENTITY_VERIFICATION_REQUIRED"
                r.notes = "Twin / Lookalike Ambiguity: Candidate separation within margin threshold. Secondary verification required."
            elif r.status == "PRESENT":
                r.verification_status = "PENDING"
                r.notes = f"AI Vision Detection ({c['confidence']}% Match Score - Verified Present)"
            else:
                r.verification_status = "PENDING_REVIEW"
                r.notes = f"Low Confidence ({c['confidence']}%) - Faculty Review Required"

    db.commit()

    return {
        "success": True,
        "message": f"Classroom video processed. Detected {proc_result.get('faces_detected', 0)} face instances, recognized {proc_result.get('recognized_count', 0)} students.",
        "filename": saved_filename,
        "duration": actual_duration,
        "size_bytes": file_size,
        "proc_result": proc_result
    }


@app.get("/api/evidence/{session_id}/stream")
def stream_evidence_video(session_id: int, request: Request, db: Session = Depends(get_db)):
    session = db.query(AttendanceSession).filter(AttendanceSession.session_id == session_id).first()
    if not session or not session.video_path or not os.path.exists(session.video_path):
        raise HTTPException(status_code=404, detail="Evidence video not found for this session")

    video_path = session.video_path
    file_size = os.path.getsize(video_path)

    mime_type = "video/mp4"
    if video_path.lower().endswith(".webm"):
        mime_type = "video/webm"
    elif video_path.lower().endswith(".ogg"):
        mime_type = "video/ogg"
    elif video_path.lower().endswith(".mov"):
        mime_type = "video/quicktime"

    range_header = request.headers.get("range")
    if not range_header:
        def iter_full():
            with open(video_path, "rb") as f:
                while chunk := f.read(1024 * 512):
                    yield chunk
        return StreamingResponse(
            iter_full(),
            media_type=mime_type,
            headers={
                "Accept-Ranges": "bytes",
                "Content-Length": str(file_size),
                "Content-Disposition": f"inline; filename={os.path.basename(video_path)}"
            }
        )

    # Parse HTTP Range header (e.g. bytes=0- or bytes=1024-2048)
    range_match = re.match(r"bytes=(\d+)-(\d*)", range_header)
    if not range_match:
        raise HTTPException(status_code=416, detail="Invalid Range Header")

    start = int(range_match.group(1))
    end_str = range_match.group(2)
    end = int(end_str) if end_str else file_size - 1
    if start >= file_size or end >= file_size or start > end:
        raise HTTPException(status_code=416, detail="Range Not Satisfiable")

    chunk_size = end - start + 1

    def iter_range(start_byte: int, length: int):
        with open(video_path, "rb") as f:
            f.seek(start_byte)
            remaining = length
            while remaining > 0:
                read_size = min(remaining, 1024 * 256)
                data = f.read(read_size)
                if not data:
                    break
                remaining -= len(data)
                yield data

    return StreamingResponse(
        iter_range(start, chunk_size),
        status_code=206,
        media_type=mime_type,
        headers={
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(chunk_size),
            "Content-Disposition": f"inline; filename={os.path.basename(video_path)}"
        }
    )


@app.get("/api/evidence/{session_id}/download")
def download_evidence_video(session_id: int, db: Session = Depends(get_db)):
    session = db.query(AttendanceSession).filter(AttendanceSession.session_id == session_id).first()
    if not session or not session.video_path or not os.path.exists(session.video_path):
        raise HTTPException(status_code=404, detail="Evidence video file not found")

    file_ext = os.path.splitext(session.video_path)[1] or ".mp4"
    return FileResponse(
        path=session.video_path,
        media_type="application/octet-stream",
        filename=session.video_filename or f"visionattend_evidence_{session.session_code or session.session_id}{file_ext}"
    )


@app.post("/api/sessions/{session_id}/resolve-review")
def resolve_review_case(session_id: int, payload: ReviewResolution, db: Session = Depends(get_db)):
    rec = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session_id,
        AttendanceRecord.attendance_id == payload.attendance_id
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    session = db.query(AttendanceSession).filter(AttendanceSession.session_id == session_id).first()
    orig_student = db.query(Student).filter(Student.student_id == rec.student_id).first()

    cand_info = {}
    if rec.candidate_details_json:
        try:
            cand_info = json.loads(rec.candidate_details_json)
        except Exception:
            pass

    orig_pred = f"{rec.ai_status or 'REVIEW'} ({rec.confidence}%) for {orig_student.name if orig_student else 'Candidate'}"
    if cand_info.get("second_candidate"):
        runner_up = cand_info["second_candidate"]
        orig_pred += f" [Competitor: {runner_up.get('name')} ({runner_up.get('pct')}%), Margin: {cand_info.get('score_separation')}%]"

    final_student_id = rec.student_id
    final_status = "PRESENT"
    action_desc = ""

    sec_method = payload.secondary_verification_method or "FACULTY_AUTHENTICATED_CONFIRMATION"
    reason = payload.correction_reason or payload.notes or "Faculty verification review"
    reviewer = payload.verified_by or (session.faculty_name if session else "Faculty In-Charge")

    rec.secondary_verification_method = sec_method
    rec.correction_reason = reason
    rec.verified_by = reviewer
    rec.verified_at = datetime.utcnow()

    if payload.action == "CONFIRM":
        rec.status = "PRESENT"
        rec.verification_status = "CONFIRMED"
        rec.notes = payload.notes or f"Faculty verified identity via {sec_method}. Notes: {reason}"
        final_status = "PRESENT"
        final_student_id = rec.student_id
        action_desc = f"Confirmed Candidate Present ({orig_student.name if orig_student else ''}) via {sec_method}"

    elif payload.action in ["CHANGE_STUDENT", "CONFIRM_CANDIDATE_2"] and payload.new_student_id:
        target_student = db.query(Student).filter(Student.student_id == payload.new_student_id).first()
        target_rec = db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id == session_id,
            AttendanceRecord.student_id == payload.new_student_id
        ).first()
        if target_rec:
            target_rec.status = "PRESENT"
            target_rec.verification_status = "OVERRIDDEN"
            target_rec.secondary_verification_method = sec_method
            target_rec.correction_reason = reason
            target_rec.verified_by = reviewer
            target_rec.verified_at = datetime.utcnow()
            target_rec.best_frame_path = rec.best_frame_path
            target_rec.video_frame_path = rec.video_frame_path
            target_rec.notes = f"Reassigned to {target_student.name if target_student else 'student'} via {sec_method}. Reason: {reason}"

        rec.status = "ABSENT"
        rec.verification_status = "REASSIGNED"
        rec.notes = f"Identity corrected: attendance reassigned to {target_student.name if target_student else 'alternate candidate'}"
        final_status = "REASSIGNED_TO_STUDENT"
        final_student_id = payload.new_student_id
        action_desc = f"Corrected identity: {orig_student.name if orig_student else ''} marked ABSENT; {target_student.name if target_student else ''} marked PRESENT via {sec_method}"

    elif payload.action == "CONFIRM_BOTH":
        # In case both twins were present in the classroom
        target_student_id = payload.new_student_id or (cand_info.get("second_candidate", {}).get("student_id"))
        rec.status = "PRESENT"
        rec.verification_status = "CONFIRMED"
        rec.notes = f"Verified present via {sec_method}"

        if target_student_id:
            target_student = db.query(Student).filter(Student.student_id == target_student_id).first()
            target_rec = db.query(AttendanceRecord).filter(
                AttendanceRecord.session_id == session_id,
                AttendanceRecord.student_id == target_student_id
            ).first()
            if target_rec:
                target_rec.status = "PRESENT"
                target_rec.verification_status = "CONFIRMED"
                target_rec.secondary_verification_method = sec_method
                target_rec.correction_reason = reason
                target_rec.verified_by = reviewer
                target_rec.verified_at = datetime.utcnow()
                target_rec.notes = f"Both twins verified physically present via {sec_method}"
        final_status = "PRESENT_BOTH"
        action_desc = f"Both candidates verified physically present via {sec_method}"

    elif payload.action in ["REJECT", "MARK_ABSENT"]:
        rec.status = "ABSENT"
        rec.verification_status = "REJECTED"
        rec.notes = payload.notes or f"Faculty rejected match or student unverified; marked absent via {sec_method}"
        final_status = "ABSENT"
        action_desc = f"Marked ABSENT: unverified match rejected via {sec_method}"

    # Preserve detailed audit log (Requirement 8)
    chosen_student = db.query(Student).filter(Student.student_id == final_student_id).first() or orig_student
    audit_log = VerificationAuditLog(
        session_id=session.session_id,
        attendance_id=rec.attendance_id,
        student_id=chosen_student.student_id if chosen_student else None,
        register_number=chosen_student.register_number if chosen_student else "N/A",
        student_name=chosen_student.name if chosen_student else "Unknown",
        match_score=rec.confidence,
        raw_cosine=0.0,
        status=f"RESOLVED_{final_status}",
        original_ai_prediction=orig_pred,
        final_decision=action_desc or f"Marked {final_status}",
        secondary_verification_method=sec_method,
        correction_reason=reason,
        candidate_scores_json=rec.candidate_details_json,
        verified_by=reviewer,
        notes=rec.notes,
        timestamp=datetime.now().strftime("%Y-%m-%d %I:%M:%S %p"),
        created_at=datetime.utcnow()
    )
    db.add(audit_log)

    # Recalculate session counts
    all_recs = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session_id).all()
    session.present_count = len([r for r in all_recs if r.status == "PRESENT"])
    session.review_count = len([r for r in all_recs if r.status == "REVIEW"])
    session.absent_count = len([r for r in all_recs if r.status == "ABSENT"])
    session.od_count = len([r for r in all_recs if r.status == "OD"])
    session.ml_count = len([r for r in all_recs if r.status == "ML"])

    db.commit()
    return {"message": "Review decision applied and recorded into audit ledger", "session": format_session_response(session, db)}


@app.post("/api/sessions/{session_id}/verify")
def verify_and_approve_attendance(session_id: int, payload: BatchVerifyRequest, db: Session = Depends(get_db)):
    session = db.query(AttendanceSession).filter(AttendanceSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    action_map = {a.attendance_id: a for a in payload.actions}
    records = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session_id).all()

    present_count = 0
    absent_count = 0
    od_count = 0
    ml_count = 0
    review_count = 0

    for r in records:
        if r.attendance_id in action_map:
            act = action_map[r.attendance_id]
            r.status = act.status
            r.verification_status = "APPROVED"
            r.verified_by = payload.faculty_name
            r.verified_at = datetime.utcnow()
            if act.notes:
                r.notes = act.notes

        if r.status == "PRESENT":
            present_count += 1
        elif r.status == "OD":
            od_count += 1
        elif r.status == "ML":
            ml_count += 1
        elif r.status == "REVIEW":
            review_count += 1
        else:
            absent_count += 1

    session.status = "APPROVED"
    session.present_count = present_count
    session.absent_count = absent_count
    session.od_count = od_count
    session.ml_count = ml_count
    session.review_count = review_count

    db.commit()

    # Free in-memory tracking and thumbnail resources
    vision_engine.reset_session(session_id)

    return {
        "message": "Attendance officially approved and recorded into institutional registry.",
        "session": format_session_response(session, db)
    }


# ==========================================
# 6. VERIFICATION METER & AUDIT LOGS
# ==========================================

@app.post("/api/test-student")
def test_student(payload: TestVerificationRequest, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.student_id == payload.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    photos_b64 = [fp.image_reference for fp in student.face_profiles if fp.image_reference]
    if not photos_b64 and student.avatar_url:
        photos_b64.append(student.avatar_url)

    threshold = get_confidence_threshold(db)
    result = vision_engine.verify_single_face(payload.image_base64, photos_b64, threshold)

    if payload.log_audit:
        log = VerificationAuditLog(
            student_id=student.student_id,
            register_number=student.register_number,
            student_name=student.name,
            match_score=result["confidence"],
            raw_cosine=result["similarity_score"],
            status=result["status"],
            verified_by=payload.verified_by or "Faculty In-Charge",
            notes=result["message"],
            timestamp=datetime.now().strftime("%Y-%m-%d %I:%M:%S %p")
        )
        db.add(log)
        db.commit()

    return {
        **result,
        "student_id": student.student_id,
        "register_number": student.register_number,
        "student_name": student.name,
        "department": student.department,
        "year_section": f"{student.year} / {student.section}"
    }


@app.get("/api/verification/logs", response_model=List[VerificationLogOut])
@app.get("/api/verification/audit-logs", response_model=List[VerificationLogOut])
def get_verification_logs(
    session_id: Optional[int] = None,
    student_id: Optional[int] = None,
    search: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(VerificationAuditLog).order_by(VerificationAuditLog.log_id.desc())
    if session_id:
        query = query.filter(VerificationAuditLog.session_id == session_id)
    if student_id:
        query = query.filter(VerificationAuditLog.student_id == student_id)
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            (VerificationAuditLog.student_name.ilike(search_fmt)) |
            (VerificationAuditLog.register_number.ilike(search_fmt)) |
            (VerificationAuditLog.final_decision.ilike(search_fmt)) |
            (VerificationAuditLog.notes.ilike(search_fmt))
        )
    return query.limit(limit).all()


# ==========================================
# 7. REAL REPORT EXPORTS (CSV, XLSX, PDF)
# ==========================================

@app.get("/api/reports/dashboard-stats")
def get_reports_summary(db: Session = Depends(get_db)):
    students = db.query(Student).all()
    sessions = db.query(AttendanceSession).order_by(AttendanceSession.session_id.desc()).all()
    records = db.query(AttendanceRecord).all()

    student_stats = []
    for s in students:
        s_recs = [r for r in records if r.student_id == s.student_id]
        total = len(s_recs)
        present = len([r for r in s_recs if r.status == "PRESENT"])
        od = len([r for r in s_recs if r.status == "OD"])
        ml = len([r for r in s_recs if r.status == "ML"])
        pct = round(((present + od + ml) / total) * 100.0, 1) if total > 0 else 100.0

        student_stats.append({
            "student_id": s.student_id,
            "visionattend_id": s.visionattend_id,
            "register_number": s.register_number,
            "name": s.name,
            "department": s.department,
            "year_section": f"{s.year} / {s.section}",
            "total_classes": total,
            "attended": present,
            "od_count": od,
            "ml_count": ml,
            "attendance_percentage": pct,
            "profile_quality": s.profile_quality
        })

    return {
        "generated_at": datetime.now().strftime("%Y-%m-%d %I:%M %p"),
        "total_sessions": len(sessions),
        "total_students": len(students),
        "student_stats": student_stats
    }


@app.get("/api/reports/export-csv")
def export_csv_report(session_id: Optional[int] = None, db: Session = Depends(get_db)):
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["VISIONATTEND - INSTITUTIONAL ATTENDANCE REPORT"])
    writer.writerow([f"Generated At: {datetime.now().strftime('%Y-%m-%d %I:%M %p')}"])
    writer.writerow([])

    if session_id:
        session = db.query(AttendanceSession).filter(AttendanceSession.session_id == session_id).first()
        if session:
            writer.writerow(["Session Code", session.session_code or f"ATT-{session.session_id:03d}"])
            writer.writerow(["Class / Section", session.year_section])
            writer.writerow(["Subject", session.subject])
            writer.writerow(["Date", session.date])
            writer.writerow(["Faculty In-Charge", session.faculty_name])
            writer.writerow(["Evidence Reference", session.video_filename or "Classroom Session Video Stored"])
            writer.writerow(["Status", session.status])
            writer.writerow([])
            writer.writerow(["Register No", "Student Name", "Department", "Status", "AI Match %", "Verification Status", "Best Frame Note", "Verified By"])
            for r in session.records:
                s = db.query(Student).filter(Student.student_id == r.student_id).first()
                writer.writerow([
                    s.register_number if s else "N/A",
                    s.name if s else "Unknown",
                    s.department if s else session.department,
                    r.status,
                    f"{r.confidence}%",
                    r.verification_status,
                    "Best Frame Captured" if r.best_frame_path else "Standard",
                    r.verified_by or session.faculty_name
                ])
    else:
        writer.writerow(["Session ID", "Session Code", "Date", "Subject", "Section", "Register No", "Student Name", "Status", "Confidence %", "Verification", "Verified By"])
        records = db.query(AttendanceRecord).order_by(AttendanceRecord.attendance_id.desc()).limit(500).all()
        for r in records:
            s = db.query(Student).filter(Student.student_id == r.student_id).first()
            sess = db.query(AttendanceSession).filter(AttendanceSession.session_id == r.session_id).first()
            writer.writerow([
                r.session_id,
                sess.session_code if sess else "N/A",
                sess.date if sess else "N/A",
                sess.subject if sess else "N/A",
                sess.year_section if sess else "N/A",
                s.register_number if s else "N/A",
                s.name if s else "Unknown",
                r.status,
                f"{r.confidence}%",
                r.verification_status,
                r.verified_by or "Faculty In-Charge"
            ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=visionattend_report_{date.today().isoformat()}.csv",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )


@app.get("/api/reports/export-xlsx")
def export_xlsx_report(session_id: Optional[int] = None, db: Session = Depends(get_db)):
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Attendance Report"

    # Theme colors (Neutral Professional Deep Blue)
    header_fill = PatternFill(start_color="0A2540", end_color="0A2540", fill_type="solid")
    sub_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    present_fill = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid")
    absent_fill = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
    od_fill = PatternFill(start_color="DBEAFE", end_color="DBEAFE", fill_type="solid")
    ml_fill = PatternFill(start_color="FFEDD5", end_color="FFEDD5", fill_type="solid")

    ws.merge_cells("A1:G1")
    ws["A1"] = "VISIONATTEND ACADEMIC ATTENDANCE AUDIT REPORT"
    ws["A1"].font = Font(size=14, bold=True, color="FFFFFF")
    ws["A1"].fill = header_fill
    ws["A1"].alignment = Alignment(horizontal="center", vertical="center")

    curr_row = 3
    if session_id:
        session = db.query(AttendanceSession).filter(AttendanceSession.session_id == session_id).first()
        if session:
            ws[f"A{curr_row}"] = "Session Code:"
            ws[f"B{curr_row}"] = session.session_code or f"ATT-{session.session_id:03d}"
            ws[f"D{curr_row}"] = "Date:"
            ws[f"E{curr_row}"] = session.date
            curr_row += 1

            ws[f"A{curr_row}"] = "Class / Section:"
            ws[f"B{curr_row}"] = session.year_section
            ws[f"D{curr_row}"] = "Subject:"
            ws[f"E{curr_row}"] = session.subject
            curr_row += 1

            ws[f"A{curr_row}"] = "Faculty In-Charge:"
            ws[f"B{curr_row}"] = session.faculty_name
            ws[f"D{curr_row}"] = "Evidence Reference:"
            ws[f"E{curr_row}"] = session.video_filename or "Classroom Session Video Stored"
            curr_row += 2

            headers = ["Register No", "Student Name", "Department", "Final Status", "AI Confidence", "Verification", "Best Frame Note"]
            for col_idx, h in enumerate(headers, start=1):
                cell = ws.cell(row=curr_row, column=col_idx, value=h)
                cell.font = Font(bold=True, color="FFFFFF")
                cell.fill = sub_fill
                cell.alignment = Alignment(horizontal="center")
            curr_row += 1

            for r in session.records:
                s = db.query(Student).filter(Student.student_id == r.student_id).first()
                ws.cell(row=curr_row, column=1, value=s.register_number if s else "N/A")
                ws.cell(row=curr_row, column=2, value=s.name if s else "Unknown")
                ws.cell(row=curr_row, column=3, value=s.department if s else session.department)
                
                st_cell = ws.cell(row=curr_row, column=4, value=r.status)
                if r.status == "PRESENT":
                    st_cell.fill = present_fill
                elif r.status == "ABSENT":
                    st_cell.fill = absent_fill
                elif r.status == "OD":
                    st_cell.fill = od_fill
                elif r.status == "ML":
                    st_cell.fill = ml_fill

                ws.cell(row=curr_row, column=5, value=f"{r.confidence}%")
                ws.cell(row=curr_row, column=6, value=r.verification_status)
                ws.cell(row=curr_row, column=7, value="Best Frame Extracted" if r.best_frame_path else "Standard")
                curr_row += 1
    else:
        headers = ["Session ID", "Date", "Class", "Subject", "Register No", "Student Name", "Status", "Confidence %", "Verified By"]
        for col_idx, h in enumerate(headers, start=1):
            cell = ws.cell(row=curr_row, column=col_idx, value=h)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = sub_fill
        curr_row += 1

        records = db.query(AttendanceRecord).order_by(AttendanceRecord.attendance_id.desc()).limit(300).all()
        for r in records:
            s = db.query(Student).filter(Student.student_id == r.student_id).first()
            sess = db.query(AttendanceSession).filter(AttendanceSession.session_id == r.session_id).first()
            ws.cell(row=curr_row, column=1, value=sess.session_code if sess else f"ATT-{r.session_id}")
            ws.cell(row=curr_row, column=2, value=sess.date if sess else "N/A")
            ws.cell(row=curr_row, column=3, value=sess.year_section if sess else "N/A")
            ws.cell(row=curr_row, column=4, value=sess.subject if sess else "N/A")
            ws.cell(row=curr_row, column=5, value=s.register_number if s else "N/A")
            ws.cell(row=curr_row, column=6, value=s.name if s else "Unknown")
            ws.cell(row=curr_row, column=7, value=r.status)
            ws.cell(row=curr_row, column=8, value=f"{r.confidence}%")
            ws.cell(row=curr_row, column=9, value=r.verified_by or "Faculty In-Charge")
            curr_row += 1

    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename=visionattend_report_{date.today().isoformat()}.xlsx",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )


@app.get("/api/reports/export-pdf")
def export_pdf_report(session_id: Optional[int] = None, db: Session = Depends(get_db)):
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    story = []
    styles = getSampleStyleSheet()

    # Title Style
    title_style = ParagraphStyle(
        'MainTitle',
        parent=styles['Heading1'],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0A2540'),
        alignment=1, # Center
        spaceAfter=6
    )
    sub_style = ParagraphStyle(
        'SubTitle',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#475569'),
        alignment=1,
        spaceAfter=15
    )

    story.append(Paragraph("<b>VISIONATTEND ACADEMIC ATTENDANCE REPORT</b>", title_style))
    story.append(Paragraph("AI-Assisted Facial Attendance & Evidence Verification System (Team VisionRaiders)", sub_style))

    if session_id:
        session = db.query(AttendanceSession).filter(AttendanceSession.session_id == session_id).first()
        if session:
            meta_data = [
                [Paragraph("<b>Session Code:</b>", styles['Normal']), session.session_code or f"ATT-{session.session_id:03d}",
                 Paragraph("<b>Date:</b>", styles['Normal']), session.date],
                [Paragraph("<b>Class / Section:</b>", styles['Normal']), session.year_section,
                 Paragraph("<b>Subject:</b>", styles['Normal']), session.subject],
                [Paragraph("<b>Faculty In-Charge:</b>", styles['Normal']), session.faculty_name,
                 Paragraph("<b>Evidence Video:</b>", styles['Normal']), session.video_filename or "Classroom Session Video Stored"],
                [Paragraph("<b>Summary:</b>", styles['Normal']), f"Present: {session.present_count} | Absent: {session.absent_count} | OD: {session.od_count} | ML: {session.ml_count}",
                 Paragraph("<b>Status:</b>", styles['Normal']), session.status]
            ]
            t_meta = Table(meta_data, colWidths=[100, 175, 100, 175])
            t_meta.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#CBD5E1')),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(t_meta)
            story.append(Spacer(1, 15))

            # Table Records
            records_data = [["Reg Number", "Student Name", "Status", "AI Match %", "Verification", "Notes"]]
            for r in session.records:
                s = db.query(Student).filter(Student.student_id == r.student_id).first()
                records_data.append([
                    s.register_number if s else "N/A",
                    s.name if s else "Unknown",
                    r.status,
                    f"{r.confidence}%",
                    r.verification_status,
                    (r.notes or "")[:35]
                ])

            t_records = Table(records_data, colWidths=[90, 135, 65, 75, 85, 100])
            t_records.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0A2540')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('TOPPADDING', (0, 1), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 3),
            ]))
            story.append(t_records)
    else:
        story.append(Paragraph("Master Institutional Attendance Registry Report", styles['Heading2']))
        records_data = [["Session", "Date", "Class", "Subject", "Reg Number", "Student Name", "Status", "Match %"]]
        records = db.query(AttendanceRecord).order_by(AttendanceRecord.attendance_id.desc()).limit(150).all()
        for r in records:
            s = db.query(Student).filter(Student.student_id == r.student_id).first()
            sess = db.query(AttendanceSession).filter(AttendanceSession.session_id == r.session_id).first()
            records_data.append([
                sess.session_code if sess else f"ATT-{r.session_id}",
                sess.date if sess else "N/A",
                sess.year_section if sess else "N/A",
                (sess.subject if sess else "N/A")[:18],
                s.register_number if s else "N/A",
                (s.name if s else "Unknown")[:18],
                r.status,
                f"{r.confidence}%"
            ])

        t_records = Table(records_data, colWidths=[65, 60, 55, 100, 85, 105, 45, 45])
        t_records.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0A2540')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('FONTSIZE', (0, 1), (-1, -1), 7),
        ]))
        story.append(t_records)

    doc.build(story)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=visionattend_report_{date.today().isoformat()}.pdf",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )


# ==========================================
# 8. CLASSES, SUBJECTS & SETTINGS
# ==========================================

@app.get("/api/classes", response_model=List[ClassSectionOut])
def get_classes(db: Session = Depends(get_db)):
    return db.query(ClassSection).all()


@app.post("/api/classes", response_model=ClassSectionOut)
def create_class(payload: ClassSectionCreate, db: Session = Depends(get_db)):
    cls = ClassSection(
        name=payload.name.strip(),
        department=payload.department,
        year=payload.year,
        section=payload.section,
        default_room=payload.default_room or "Room 304",
        default_reminder=payload.default_reminder or "Standard lecture session."
    )
    db.add(cls)
    db.commit()
    db.refresh(cls)
    return cls


@app.get("/api/subjects", response_model=List[SubjectOut])
def get_subjects(db: Session = Depends(get_db)):
    return db.query(Subject).all()


@app.post("/api/subjects", response_model=SubjectOut)
def create_subject(payload: SubjectCreate, db: Session = Depends(get_db)):
    subj = Subject(
        code=payload.code.strip().upper(),
        name=payload.name.strip(),
        department=payload.department
    )
    db.add(subj)
    db.commit()
    db.refresh(subj)
    return subj


@app.get("/api/settings", response_model=List[SystemConfigItem])
def get_settings(db: Session = Depends(get_db)):
    return db.query(SystemConfig).all()


@app.post("/api/settings")
def update_settings(payload: List[SystemConfigItem], db: Session = Depends(get_db)):
    for item in payload:
        cfg = db.query(SystemConfig).filter(SystemConfig.config_key == item.config_key).first()
        if cfg:
            cfg.config_value = item.config_value
            cfg.updated_at = datetime.utcnow()
        else:
            db.add(SystemConfig(config_key=item.config_key, config_value=item.config_value, description=item.description))
    db.commit()
    return {"message": "Settings updated successfully"}


# ==========================================
# 9. DASHBOARD STATS
# ==========================================

@app.get("/api/dashboard/stats")
def get_dashboard_stats(
    department: Optional[str] = None,
    year: Optional[str] = None,
    section: Optional[str] = None,
    db: Session = Depends(get_db)
):
    stud_query = db.query(Student)
    if department and department != "ALL" and department != "ALL DEPARTMENTS":
        stud_query = stud_query.filter(Student.department == department)
    if year and year != "ALL":
        stud_query = stud_query.filter(Student.year == year)
    if section and section != "ALL":
        stud_query = stud_query.filter(Student.section == section)

    students = stud_query.all()
    total_students = len(students)
    enrolled_count = len([s for s in students if s.face_profile_status == "Ready"])

    sessions = db.query(AttendanceSession).order_by(AttendanceSession.session_id.desc()).all()
    recent_sessions = [format_session_response(s, db) for s in sessions[:5]]

    # Pending reviews count across draft sessions
    draft_sessions = [s for s in sessions if s.status == "DRAFT"]
    pending_reviews_count = sum(s.review_count for s in draft_sessions)
    pending_session = next((s for s in draft_sessions if s.review_count > 0), None)
    if not pending_session:
        pending_session = next((s for s in sessions if s.review_count > 0), None)
    pending_review_session_id = pending_session.session_id if pending_session else None

    # Active OD / ML count
    today_str = date.today().isoformat()
    active_od_count = db.query(ODRecord).filter(ODRecord.date == today_str, ODRecord.approval_status == "APPROVED").count()
    pending_od_count = db.query(ODRecord).filter(ODRecord.approval_status == "PENDING").count()
    pending_ml_count = db.query(MedicalLeaveRecord).filter(MedicalLeaveRecord.approval_status == "PENDING").count()

    return {
        "total_students": total_students,
        "enrolled_biometrics": enrolled_count,
        "total_sessions": len(sessions),
        "pending_reviews_count": pending_reviews_count,
        "pending_review_session_id": pending_review_session_id,
        "active_od_today": active_od_count,
        "pending_od_requests": pending_od_count,
        "pending_ml_requests": pending_ml_count,
        "recent_sessions": recent_sessions
    }


# ==========================================
# 10. SYSTEM RESET / SEED
# ==========================================

@app.post("/api/seed/clean")
def clean_all_data(db: Session = Depends(get_db)):
    """Wipes student attendance records and resets seed users."""
    Base.metadata.drop_all(bind=engine)
    init_db()
    return {"message": "All student and attendance records cleanly wiped. Admin & Faculty accounts re-initialized."}
