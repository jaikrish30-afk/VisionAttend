import React, { useState, useRef } from 'react';
import { 
  UserPlus, Camera, Upload, CheckCircle2, 
  Sparkles, Trash2, Eye, Search, AlertCircle, RefreshCw,
  Users, ShieldAlert
} from 'lucide-react';
import { Student } from '../types';
import { createStudent } from '../api';

interface StudentRegistrationProps {
  students: Student[];
  onStudentRegistered: () => void;
  onViewStudentProfile: (studentId: number) => void;
}

interface PhotoSlot {
  label: string;
  pose: string;
  imageData: string | null;
}

const PHOTO_SLOTS_INITIAL: PhotoSlot[] = [
  { label: 'Photo 1', pose: 'Frontal (0°)', imageData: null },
  { label: 'Photo 2', pose: 'Yaw Left (-15°)', imageData: null },
  { label: 'Photo 3', pose: 'Yaw Right (+15°)', imageData: null },
  { label: 'Photo 4', pose: 'Pitch Up (+10°)', imageData: null },
  { label: 'Photo 5', pose: 'Pitch Down (-10°)', imageData: null },
];

export const StudentRegistration: React.FC<StudentRegistrationProps> = ({
  students,
  onStudentRegistered,
  onViewStudentProfile
}) => {
  // Form fields
  const [registerNumber, setRegisterNumber] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Department of Information Technology');
  const [year, setYear] = useState('II Year');
  const [section, setSection] = useState('IT-2D');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Twin & Resemblance Safeguards
  const [isTwin, setIsTwin] = useState(false);
  const [twinSiblingId, setTwinSiblingId] = useState<number | undefined>(undefined);
  const [twinNotes, setTwinNotes] = useState('');

  // Photos state
  const [photoSlots, setPhotoSlots] = useState<PhotoSlot[]>(PHOTO_SLOTS_INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Live Snapshot capture
  const [activeCameraSlot, setActiveCameraSlot] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const cleanReg = registerNumber.trim().toUpperCase().replace(/\s+/g, '');
  const uploadedCount = photoSlots.filter(p => p.imageData !== null).length;

  const handleFileUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPhotoSlots(prev => prev.map((slot, i) => i === index ? { ...slot, imageData: dataUrl } : slot));
    };
    reader.readAsDataURL(file);
  };

  const startSnapshotCamera = async (slotIndex: number) => {
    setActiveCameraSlot(slotIndex);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      alert("Camera access unavailable. You can use the Upload Image button.");
      setActiveCameraSlot(null);
    }
  };

  const captureSnapshot = (slotIndex: number) => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setPhotoSlots(prev => prev.map((slot, i) => i === slotIndex ? { ...slot, imageData: dataUrl } : slot));
    }
    if (videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
    setActiveCameraSlot(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!registerNumber || !name) {
      setErrorMsg("Please enter Student Name and Register Number.");
      return;
    }

    if (uploadedCount === 0) {
      setErrorMsg("Please capture or upload at least 1 facial photo for biometric calibration.");
      return;
    }

    setSubmitting(true);
    try {
      const photosPayload = photoSlots
        .filter(p => p.imageData !== null)
        .map(p => ({
          photo_label: p.label,
          image_data: p.imageData as string,
          pose_angle: p.pose
        }));

      await createStudent({
        register_number: cleanReg,
        name: name.trim(),
        department,
        year,
        section,
        email: email.trim() || `${cleanReg.toLowerCase()}@visionattend.internal`,
        phone: phone.trim() || '9876543210',
        avatar_url: photosPayload[0]?.image_data,
        is_twin: isTwin,
        twin_sibling_id: twinSiblingId,
        twin_notes: twinNotes.trim() || undefined,
        photos: photosPayload
      });

      setSuccessMsg(`Student "${name}" (${cleanReg}) enrolled successfully with ${photosPayload.length} biometric face profiles.`);
      
      setRegisterNumber('');
      setName('');
      setEmail('');
      setPhone('');
      setIsTwin(false);
      setTwinSiblingId(undefined);
      setTwinNotes('');
      setPhotoSlots(PHOTO_SLOTS_INITIAL);
      
      onStudentRegistered();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to register student");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in">
      
      {/* Top Banner */}
      <div className="bg-[#0a2540] text-white rounded-2xl p-6 shadow-lg border border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              FACIAL BIOMETRIC ENROLLMENT
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            STUDENT REGISTRATION & ENROLLMENT
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Register students with multi-angle photos for deep neural embedding extraction and high-precision verification.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-blue-200">
          <span>Enrolled Students:</span>
          <span className="text-white font-mono font-bold bg-blue-900/80 px-2.5 py-1 rounded-lg border border-blue-700">
            {students.length}
          </span>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Academic & Student Details */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3.5">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Student Information
            </h2>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Register Number *
              </label>
              <input
                type="text"
                value={registerNumber}
                onChange={(e) => setRegisterNumber(e.target.value)}
                placeholder="e.g. RA2511008020249"
                className="va-input font-mono uppercase text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Student Full Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jai Krish KR"
                className="va-input text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Year</label>
                <select value={year} onChange={(e) => setYear(e.target.value)} className="va-input text-xs">
                  <option value="I Year">I Year</option>
                  <option value="II Year">II Year</option>
                  <option value="III Year">III Year</option>
                  <option value="IV Year">IV Year</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Section</label>
                <input
                  type="text"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="va-input text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="va-input text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@visionattend.internal"
                  className="va-input text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  className="va-input text-xs"
                />
              </div>
            </div>

            {/* Twin & Lookalike Disambiguation Settings */}
            <div className="p-3.5 bg-gradient-to-br from-indigo-50/80 to-purple-50/50 border border-indigo-200/90 rounded-xl space-y-3">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="isTwinCheckbox"
                  checked={isTwin}
                  onChange={(e) => setIsTwin(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="isTwinCheckbox" className="text-xs font-bold text-indigo-950 cursor-pointer flex-1">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Twin / Lookalike Sibling Profile</span>
                  </div>
                  <p className="text-[11px] font-normal text-indigo-700/90 mt-0.5 leading-snug">
                    Flag this student as a twin or known lookalike. VisionAttend will apply elevated candidate-separation margins (12.0%) and mandate secondary verification if similarity ambiguity exists.
                  </p>
                </label>
              </div>

              {isTwin && (
                <div className="pt-2 border-t border-indigo-200/60 space-y-2.5 pl-6 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-900 uppercase mb-1">
                      Link Enrolled Twin Sibling (Optional)
                    </label>
                    <select
                      value={twinSiblingId || ''}
                      onChange={(e) => setTwinSiblingId(e.target.value ? Number(e.target.value) : undefined)}
                      className="va-input text-xs bg-white"
                    >
                      <option value="">-- No linked sibling / Enrolling first --</option>
                      {students.map((s) => (
                        <option key={s.student_id} value={s.student_id}>
                          {s.name} ({s.register_number}) - {s.section}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-indigo-900 uppercase mb-1">
                      Distinguishing Features / Twin Notes
                    </label>
                    <input
                      type="text"
                      value={twinNotes}
                      onChange={(e) => setTwinNotes(e.target.value)}
                      placeholder="e.g. Twin sibling of Jai. Mole near left jawline, distinct hairstyle."
                      className="va-input text-xs bg-white"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200/60">
                    <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" />
                    <span>Twin attendance requires faculty verification and will never be blindly auto-assigned.</span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-900/30 disabled:opacity-50 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>{submitting ? "Processing Face Biometrics..." : "Complete Student Enrollment"}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Multi-Angle Face Enrollment Slots */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Multi-Sample Biometric Capture ({uploadedCount}/5 Samples)
                </h2>
                <p className="text-xs text-slate-500">
                  Multiple face angles ensure high-accuracy tracking under classroom lighting conditions.
                </p>
              </div>
            </div>

            {/* Photo Slots Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photoSlots.map((slot, idx) => (
                <div
                  key={slot.label}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-center flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-800">{slot.label}</span>
                    <span className="text-[10px] text-slate-500">{slot.pose}</span>
                  </div>

                  {/* Image Preview / Capture View */}
                  <div className="aspect-square bg-slate-900 rounded-lg overflow-hidden relative flex items-center justify-center border border-slate-300">
                    {activeCameraSlot === idx ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    ) : slot.imageData ? (
                      <img
                        src={slot.imageData}
                        alt={slot.label}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera className="w-8 h-8 text-slate-600" />
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-1 pt-1">
                    {activeCameraSlot === idx ? (
                      <button
                        type="button"
                        onClick={() => captureSnapshot(idx)}
                        className="w-full py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px]"
                      >
                        Snap Photo
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => startSnapshotCamera(idx)}
                          className="py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[10px]"
                        >
                          Camera
                        </button>

                        <label className="py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-[10px] cursor-pointer block">
                          Upload
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(idx, e)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}

                    {slot.imageData && activeCameraSlot !== idx && (
                      <button
                        type="button"
                        onClick={() => setPhotoSlots(prev => prev.map((s, i) => i === idx ? { ...s, imageData: null } : s))}
                        className="text-[10px] text-rose-600 hover:underline block mx-auto"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

      </form>

    </div>
  );
};
