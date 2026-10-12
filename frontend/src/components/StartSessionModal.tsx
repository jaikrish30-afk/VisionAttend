import React, { useState, useEffect } from 'react';
import { 
  X, Video, BookOpen, Calendar, MapPin, 
  FileText, ShieldCheck, Sparkles, Camera, Upload
} from 'lucide-react';
import { AttendanceSession, ClassSection, Subject, User } from '../types';
import { createAttendanceSession, fetchClasses, fetchSubjects } from '../api';

interface StartSessionModalProps {
  onClose: () => void;
  onSessionStarted: (session: AttendanceSession, mode: 'CAMERA' | 'UPLOAD') => void;
  currentUser?: User | null;
}

export const StartSessionModal: React.FC<StartSessionModalProps> = ({
  onClose,
  onSessionStarted,
  currentUser
}) => {
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  const [selectedClass, setSelectedClass] = useState<string>('IT - 2D');
  const [selectedSubject, setSelectedSubject] = useState<string>('Computer Networks');
  const [department, setDepartment] = useState<string>('Department of Information Technology');
  const [roomNumber, setRoomNumber] = useState<string>('Room 304 / Vision Studio');
  const [sessionDate, setSessionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [facultyName, setFacultyName] = useState<string>(currentUser?.full_name || 'Dr. S. Ramanathan, Faculty Advisor');
  const [descriptionReminder, setDescriptionReminder] = useState<string>(
    'Internal assessment discussion today. Students with approved OD should be considered accordingly.'
  );
  const [mode, setMode] = useState<'CAMERA' | 'UPLOAD'>('CAMERA');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (currentUser?.full_name) {
      setFacultyName(currentUser.full_name);
    }
  }, [currentUser]);

  useEffect(() => {
    Promise.all([fetchClasses(), fetchSubjects()])
      .then(([cls, subjs]) => {
        if (cls.length > 0) {
          setClasses(cls);
          // If current user is assigned to a section, find matching class
          const assignedClass = currentUser?.assigned_section 
            ? cls.find(c => c.name.includes(currentUser.assigned_section!) || c.section === currentUser.assigned_section)
            : null;
          
          const initialClass = assignedClass || cls[0];
          setSelectedClass(initialClass.name);
          setDepartment(initialClass.department);
          if (initialClass.default_room) setRoomNumber(initialClass.default_room);
          if (initialClass.default_reminder) setDescriptionReminder(initialClass.default_reminder);
        }
        if (subjs.length > 0) {
          setSubjects(subjs);
          setSelectedSubject(subjs[0].name);
        }
      })
      .catch(err => console.error("Error loading classes/subjects:", err));
  }, [currentUser]);

  const handleClassChange = (className: string) => {
    setSelectedClass(className);
    const found = classes.find(c => c.name === className);
    if (found) {
      setDepartment(found.department);
      if (found.default_room) setRoomNumber(found.default_room);
      if (found.default_reminder) setDescriptionReminder(found.default_reminder);
    }
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const session = await createAttendanceSession({
        subject: selectedSubject,
        department: department,
        year_section: selectedClass,
        room_number: roomNumber,
        description_reminder: descriptionReminder,
        date: sessionDate,
        faculty_name: facultyName
      });
      onSessionStarted(session, mode);
    } catch (err: any) {
      alert(err.message || "Failed to initialize attendance session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-[#0a2540] px-6 py-4 flex items-center justify-between border-b border-blue-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                START ATTENDANCE SESSION
              </h2>
              <p className="text-[11px] text-blue-200">
                Live Classroom Camera & AI Recognition Session
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleStart} className="p-6 space-y-4">
          
          {/* Mode Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setMode('CAMERA')}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                mode === 'CAMERA'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Live Smartphone Camera</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('UPLOAD')}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                mode === 'UPLOAD'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Classroom Video</span>
            </button>
          </div>

          {/* Class / Section & Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Class / Section
              </label>
              <select
                value={selectedClass}
                onChange={(e) => handleClassChange(e.target.value)}
                className="va-input text-xs font-semibold text-slate-800"
                required
              >
                {classes.length > 0 ? (
                  classes.map(c => (
                    <option key={c.class_id} value={c.name}>{c.name} ({c.department})</option>
                  ))
                ) : (
                  <>
                    <option value="IT - 2D">IT - 2D (Information Technology)</option>
                    <option value="IT - 2A">IT - 2A (Information Technology)</option>
                    <option value="CSE - 3A">CSE - 3A (Computer Science)</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="va-input text-xs font-semibold text-slate-800"
                required
              >
                {subjects.length > 0 ? (
                  subjects.map(s => (
                    <option key={s.subject_id} value={s.name}>{s.code} - {s.name}</option>
                  ))
                ) : (
                  <>
                    <option value="Computer Networks">IT204 - Computer Networks</option>
                    <option value="Operating Systems">IT205 - Operating Systems</option>
                    <option value="Database Management Systems">IT206 - Database Management Systems</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Date & Room Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="va-input text-xs font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Classroom / Studio
              </label>
              <input
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                className="va-input text-xs font-medium"
                placeholder="e.g. Room 304 / Vision Studio"
              />
            </div>
          </div>

          {/* Description / Reminder Box */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Description / Reminder Note
              </label>
              <span className="text-[10px] text-slate-500 font-medium">Associated with this session</span>
            </div>
            <textarea
              value={descriptionReminder}
              onChange={(e) => setDescriptionReminder(e.target.value)}
              rows={3}
              className="va-input text-xs leading-relaxed"
              placeholder="e.g. Internal assessment discussion today. Students with approved OD should be considered accordingly."
            />
          </div>

          {/* Faculty In-Charge */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Faculty In-Charge
            </label>
            <input
              type="text"
              value={facultyName}
              onChange={(e) => setFacultyName(e.target.value)}
              className="va-input text-xs font-medium"
            />
          </div>

          {/* Modal Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="va-btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-900/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <span>Initializing...</span>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  <span>START ATTENDANCE</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
