"""
VisionAttend - SQLite to PostgreSQL Data Migration Utility
----------------------------------------------------------
Transfers all relational models and audit records from local SQLite (development)
to PostgreSQL (production) with transactional integrity and foreign-key preservation.

Usage:
    export DATABASE_URL=sqlite:///./visionattend.db
    export TARGET_POSTGRES_URL=postgresql+psycopg2://user:password@host:5432/visionattend_prod
    py migrate_to_postgres.py
"""

import os
import sys
import json
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import (
    Base, User, Student, FaceProfile, AttendanceSession, 
    AttendanceRecord, EvidenceVideo, ODRecord, MedicalLeaveRecord, 
    VerificationAuditLog, ClassSection, Subject, SystemConfig
)

TABLES = [
    User,
    ClassSection,
    Subject,
    SystemConfig,
    Student,
    FaceProfile,
    AttendanceSession,
    EvidenceVideo,
    ODRecord,
    MedicalLeaveRecord,
    AttendanceRecord,
    VerificationAuditLog,
]

def dump_sqlite_to_json(sqlite_session, output_file="sqlite_export.json"):
    data = {}
    print(f"[*] Exporting SQLite database tables...")
    for model in TABLES:
        table_name = model.__tablename__
        records = sqlite_session.query(model).all()
        row_list = []
        for r in records:
            d = {}
            for col in model.__table__.columns:
                val = getattr(r, col.name)
                if isinstance(val, datetime):
                    val = val.isoformat()
                d[col.name] = val
            row_list.append(d)
        data[table_name] = row_list
        print(f"    - {table_name}: {len(row_list)} records extracted")
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"[+] Exported SQLite data to {output_file}")
    return data

def migrate_to_postgres(source_sqlite_url=None, target_postgres_url=None):
    source_url = source_sqlite_url or os.getenv("DATABASE_URL", "sqlite:///./visionattend.db")
    target_url = target_postgres_url or os.getenv("TARGET_POSTGRES_URL")

    if not target_url:
        print("[!] No TARGET_POSTGRES_URL specified.")
        print("    Running offline export of SQLite data...")
        src_engine = create_engine(source_url, connect_args={"check_same_thread": False})
        SrcSession = sessionmaker(bind=src_engine)
        with SrcSession() as s:
            dump_sqlite_to_json(s)
        print("\nTo load into PostgreSQL:")
        print("1. Set TARGET_POSTGRES_URL=postgresql+psycopg2://<user>:<password>@<host>:<port>/<db>")
        print("2. Run: py migrate_to_postgres.py")
        return

    print(f"[*] Source Database: {source_url}")
    print(f"[*] Target PostgreSQL: {target_url.split('@')[-1] if '@' in target_url else target_url}")

    src_engine = create_engine(source_url, connect_args={"check_same_thread": False})
    dest_engine = create_engine(target_url, pool_pre_ping=True)

    # 1. Initialize PostgreSQL tables
    print("[*] Creating PostgreSQL schema tables...")
    Base.metadata.create_all(dest_engine)

    SrcSession = sessionmaker(bind=src_engine)
    DestSession = sessionmaker(bind=dest_engine)

    with SrcSession() as src_db, DestSession() as dest_db:
        for model in TABLES:
            table_name = model.__tablename__
            rows = src_db.query(model).all()
            print(f"[*] Migrating {len(rows)} records into table '{table_name}'...")
            for r in rows:
                col_data = {c.name: getattr(r, c.name) for c in model.__table__.columns}
                new_obj = model(**col_data)
                dest_db.merge(new_obj)
            dest_db.commit()

    print("[+] Migration to PostgreSQL completed successfully!")

if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else None
    dest = sys.argv[2] if len(sys.argv) > 2 else None
    migrate_to_postgres(src, dest)
