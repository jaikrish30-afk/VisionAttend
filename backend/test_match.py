import os
import sys
import numpy as np
from database import SessionLocal, Student, FaceProfile
from vision_engine import vision_engine

def run_test():
    db = SessionLocal()
    students = db.query(Student).all()
    print(f"Total students in DB: {len(students)}")

    registered = []
    for s in students:
        photos = [fp.image_reference for fp in s.face_profiles if fp.image_reference]
        if not photos and s.avatar_url:
            photos.append(s.avatar_url)
        registered.append({
            "student_id": s.student_id,
            "visionattend_id": s.visionattend_id,
            "register_number": s.register_number,
            "name": s.name,
            "department": s.department,
            "photos": photos
        })

    # Precompute gallery features with center filter
    student_features = {}
    for s in registered:
        s_id = s["student_id"]
        feats = []
        for p_str in s.get("photos", []):
            p_bgr = vision_engine.decode_base64_image(p_str)
            if p_bgr is not None:
                p_faces = vision_engine.detect_raw_faces(p_bgr)
                p_primary = vision_engine.get_primary_face(p_faces, p_bgr.shape)
                feat = vision_engine.extract_deep_feature(p_bgr, p_primary)
                if feat is not None:
                    feats.append(feat)
        student_features[s_id] = feats
        print(f"Student: {s['name']} (ID: {s_id}) -> {len(feats)} features extracted")

    print("\n--- TESTING CROSS MATCHING ON ALL PHOTOS ---")
    mismatches = 0
    correct_matches = 0
    for s in registered:
        s_id = s["student_id"]
        for idx, p_str in enumerate(s.get("photos", [])):
            p_bgr = vision_engine.decode_base64_image(p_str)
            p_faces = vision_engine.detect_raw_faces(p_bgr)
            p_primary = vision_engine.get_primary_face(p_faces, p_bgr.shape)
            feat = vision_engine.extract_deep_feature(p_bgr, p_primary)
            
            best_student, pct, status, info = vision_engine.match_face_to_gallery(
                live_feat=feat,
                registered_students=registered,
                student_features=student_features,
                confidence_threshold=85.0
            )
            matched_name = best_student["name"] if best_student else "None"
            is_correct = (best_student and best_student["student_id"] == s_id)
            if is_correct:
                correct_matches += 1
                print(f"  [OK] {s['name']} Photo {idx+1} -> Matched: {matched_name} ({pct}%, {status})")
            else:
                mismatches += 1
                print(f"  [FAIL] {s['name']} Photo {idx+1} -> MISMATCHED TO: {matched_name} ({pct}%, {status}) details: {info}")

    print(f"\nFINAL TEST RESULTS: Correct Matches = {correct_matches}, Mismatches = {mismatches}")

if __name__ == "__main__":
    run_test()
