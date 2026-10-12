# VisionAttend (Cognizance) 👁️🎓

> **AI-Assisted Classroom Attendance System with Twin-Aware Identity Verification & Disambiguation**  
> Developed for Academic Institutions • High-Precision Face Recognition & Audit Compliance

---

## 🌟 Overview

**VisionAttend** is an enterprise-grade biometric attendance and video evidence management platform engineered for university lecture halls and laboratories. Utilizing deep convolutional neural networks (OpenCV YuNet & SFace), VisionAttend automatically detects, tracks, and verifies enrolled students in real-time video streams and recorded classroom footage.

It features an institutional **Twin-Aware Disambiguation Safeguard** that prevents accidental misidentification between identical twins and high-similarity lookalikes by comparing candidate score separation against configurable safety margins and enforcing human-in-the-loop secondary verification before finalizing attendance drafts.

---

## 🚀 Key Features

- **⚡ Real-Time Multi-Face Neural Detection**: OpenCV YuNet deep neural detector identifies multiple classroom faces simultaneously, filtering out background bystanders.
- **🧬 SFace 128-d Biometric Embeddings**: High-accuracy facial feature extraction with L2 normalization and cosine similarity matching.
- **👯 Twin-Aware Identity Verification**: Multi-candidate score separation analysis detects ambiguous matches between identical twins or lookalikes and flags them as `IDENTITY_VERIFICATION_REQUIRED`.
- **🛡️ Faculty Review Workspace**: Dedicated side-by-side interface comparing classroom scene video frames against aligned crops, showing candidate score deltas and supporting secondary physical credentials (e.g. Student ID Card inspection).
- **📝 Comprehensive Verification Audit Ledger**: Immutable audit trail recording original AI predictions, similarity scores, faculty decisions, secondary verification methods, and timestamps.
- **🏥 Integrated OD & Medical Leave Modules**: Seamlessly accounts for approved On-Duty (OD) and Medical Leave records during attendance draft generation.
- **🎥 Video Evidence Retention**: Secure storage and retention policy management for classroom evidence video recordings.
- **⚡ High-Concurrency SQLite WAL Mode & Fast Precomputed Vectors**: Precomputes and persists 128-d vectors at photo enrollment time for instantaneous matching without repetitive image decoding.

---

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Computer Vision**: OpenCV (YuNet DNN Face Detector & SFace Biometric Recognizer)
- **Database & ORM**: SQLAlchemy with SQLite (WAL mode) / PostgreSQL production support
- **Migration & Models**: Pydantic v2, Alembic

### Frontend
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: TailwindCSS with bespoke institutional design system
- **Icons**: Lucide React
- **Media**: HTML5 Canvas & MediaRecorder API for live camera scanning

---

## 📂 Project Structure

```
Cognizance/
├── backend/
│   ├── evidence/               # Storage directory for classroom evidence videos
│   ├── alembic/                # Database schema migration scripts
│   ├── database.py             # SQLAlchemy models & connection pool configuration
│   ├── models.py               # Pydantic schemas & request/response models
│   ├── vision_engine.py        # OpenCV YuNet & SFace neural recognition pipeline
│   ├── main.py                 # FastAPI application routes & endpoints
│   ├── yunet.onnx              # Pre-trained YuNet face detection neural network
│   └── sface.onnx              # Pre-trained SFace facial recognition neural network
├── frontend/
│   ├── src/
│   │   ├── components/         # React components (Dashboard, LiveAttendance, Review, etc.)
│   │   ├── api.ts              # Frontend API client
│   │   ├── types.ts            # TypeScript interfaces & data contracts
│   │   ├── App.tsx             # Root application component
│   │   └── main.tsx            # Application entry point
│   ├── package.json
│   └── vite.config.ts
├── .gitignore
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites
- **Python 3.10+**
- **Node.js 18+ & npm**

### 1. Backend Setup
```bash
cd backend

# Install Python dependencies
pip install fastapi uvicorn sqlalchemy opencv-python numpy pillow pydantic

# Run the backend server
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
The FastAPI backend will start at `http://127.0.0.1:8000`. API documentation is available at `http://127.0.0.1:8000/docs`.

### 2. Frontend Setup
```bash
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```
The application will be accessible at `http://localhost:5173`.

---

## 🔒 Biometric Security & Compliance

VisionAttend treats facial biometric embeddings as latent vector cosine similarity indices rather than calibrated probabilities. When candidate score separation drops below configured safety margins, the system refuses to award attendance automatically, upholding institutional academic integrity standards.

---

## 📄 License
This project is licensed under the MIT License.
