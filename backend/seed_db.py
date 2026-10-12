import os
from datetime import date, datetime, timedelta
from database import (
    Base, engine, SessionLocal, User, Student, FaceProfile,
    ClassSection, Subject, SystemConfig, ODRecord, MedicalLeaveRecord
)

# Drop and recreate all tables
try:
    Base.metadata.drop_all(bind=engine)
except Exception as e:
    print("Notice on drop_all:", e)

Base.metadata.create_all(bind=engine)
db = SessionLocal()

try:
    # 3. Seed Users for multiple classes and admin
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

    # 4. Seed Classes & Subjects
    classes = [
        ClassSection(name="IT - 2D", department="Department of Information Technology", year="II Year", section="IT-2D", default_room="Room 304", default_reminder="Internal assessment discussion today. Students with approved OD should be considered accordingly."),
        ClassSection(name="IT - 2A", department="Department of Information Technology", year="II Year", section="IT-2A", default_room="Room 301", default_reminder="Standard lecture session on Computer Networks."),
        ClassSection(name="CSE - 3A", department="Department of Computer Science & Engineering", year="III Year", section="CSE-3A", default_room="Lab 402", default_reminder="Hands-on coding session on AI & Neural Nets."),
        ClassSection(name="ECE - 1B", department="Department of Electronics & Communication", year="I Year", section="ECE-1B", default_room="Room 108", default_reminder="Digital Signal Processing Lab.")
    ]
    db.add_all(classes)

    subjects = [
        Subject(code="IT204", name="Computer Networks", department="Department of Information Technology"),
        Subject(code="IT205", name="Operating Systems & Architecture", department="Department of Information Technology"),
        Subject(code="IT206", name="Database Management Systems", department="Department of Information Technology"),
        Subject(code="CS301", name="Artificial Intelligence & Neural Nets", department="Department of Computer Science & Engineering")
    ]
    db.add_all(subjects)

    # 5. Seed Students (from prompt: Jeffry, Prem, Pratyush, Jai Krish, etc.)
    seed_students_data = [
        {"name": "Jai Krish KR", "reg": "RA2511008020249", "dept": "Department of Information Technology", "year": "II Year", "sec": "IT-2D", "phone": "9840112233"},
        {"name": "Jeffry Stephenraj", "reg": "RA2511008020199", "dept": "Department of Information Technology", "year": "II Year", "sec": "IT-2D", "phone": "9840223344"},
        {"name": "Prem Ranjan Kumar", "reg": "RA2511008020228", "dept": "Department of Information Technology", "year": "II Year", "sec": "IT-2D", "phone": "9840334455"},
        {"name": "Pratyush Verma", "reg": "RA2511008020238", "dept": "Department of Information Technology", "year": "II Year", "sec": "IT-2D", "phone": "9840445566"},
        {"name": "Ananya Sharma", "reg": "RA2511008020201", "dept": "Department of Information Technology", "year": "II Year", "sec": "IT-2D", "phone": "9840556677"},
        {"name": "Rohan Gupta", "reg": "RA2511008020215", "dept": "Department of Information Technology", "year": "II Year", "sec": "IT-2D", "phone": "9840667788"},
        {"name": "Sneha Patel", "reg": "RA2511008020222", "dept": "Department of Information Technology", "year": "II Year", "sec": "IT-2D", "phone": "9840778899"},
        {"name": "Vikas Krishnan", "reg": "RA2511008020240", "dept": "Department of Information Technology", "year": "II Year", "sec": "IT-2D", "phone": "9840889900"},
        {"name": "Meera Sundaram", "reg": "RA2511008020245", "dept": "Department of Information Technology", "year": "II Year", "sec": "IT-2D", "phone": "9840990011"},
        {"name": "Aditya Rao", "reg": "RA2511008020250", "dept": "Department of Information Technology", "year": "II Year", "sec": "IT-2D", "phone": "9840110022"}
    ]

    student_objs = []
    for s_data in seed_students_data:
        st = Student(
            visionattend_id=f"VA-{s_data['reg']}",
            register_number=s_data["reg"],
            name=s_data["name"],
            department=s_data["dept"],
            year=s_data["year"],
            section=s_data["sec"],
            email=f"{s_data['reg'].lower()}@visionattend.internal",
            phone=s_data["phone"],
            face_profile_status="Ready",
            readiness_score=96.5,
            profile_quality="Good"
        )
        db.add(st)
        student_objs.append(st)

    db.commit()

    # 6. Seed System Configs
    default_configs = [
        ("confidence_threshold", "85.0", "Minimum confidence percentage for high-confidence match"),
        ("retention_policy_days", "90", "Evidence classroom video retention policy duration in days"),
        ("institution_name", "VisionAttend University", "Configured Institution Name"),
        ("department_name", "Department of Information Technology", "Primary Department Name"),
        ("video_storage_backend", "Local Secure Object Storage", "Evidence video storage driver")
    ]
    for k, v, desc in default_configs:
        db.add(SystemConfig(config_key=k, config_value=v, description=desc))

    # 7. Seed Initial Approved OD & Medical Leave records
    today_str = date.today().isoformat()
    # Jeffry has approved OD
    jeffry = db.query(Student).filter(Student.register_number == "RA2511008020199").first()
    if jeffry:
        od = ODRecord(
            student_id=jeffry.student_id,
            date=today_str,
            event_name="National Technical Paper Presentation",
            reason="Representing Department at TechMatrix National Symposium",
            approval_status="APPROVED",
            approved_by="Dr. S. Ramanathan, Faculty Advisor",
            decision_notes="Approved official academic duty representation"
        )
        db.add(od)

    # Ananya has approved ML
    ananya = db.query(Student).filter(Student.register_number == "RA2511008020201").first()
    if ananya:
        ml = MedicalLeaveRecord(
            student_id=ananya.student_id,
            date_from=(date.today() - timedelta(days=1)).isoformat(),
            date_to=(date.today() + timedelta(days=2)).isoformat(),
            hospital_name="City Medical Center & Hospital",
            reason="Acute viral fever and medical observation under physician",
            approval_status="APPROVED",
            reviewed_by="Dr. S. Ramanathan, Faculty Advisor",
            decision_notes="Valid medical certificate submitted"
        )
        db.add(ml)

    db.commit()
    print("Database successfully seeded with clean schema, classes, students, OD, and ML records!")
except Exception as e:
    print("Error seeding database:", e)
    db.rollback()
finally:
    db.close()
