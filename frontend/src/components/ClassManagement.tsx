import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Plus, Layers, MapPin, FileText, 
  Trash2, RefreshCw, CheckCircle2, Shield,
  Users, ArrowRight, ArrowLeft, Search, Camera,
  Sparkles, ExternalLink, Mail, Phone, UserCheck, AlertCircle
} from 'lucide-react';
import { ClassSection, Subject, Student } from '../types';
import { fetchClasses, createClass, fetchSubjects, createSubject, fetchStudents } from '../api';

interface ClassManagementProps {
  students?: Student[];
  onStartAttendanceForClass?: (classSection: ClassSection) => void;
  onViewStudentProfile?: (studentId: number) => void;
  onNavigateToEnroll?: () => void;
}

export const ClassManagement: React.FC<ClassManagementProps> = ({
  students: propStudents,
  onStartAttendanceForClass,
  onViewStudentProfile,
  onNavigateToEnroll
}) => {
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>(propStudents || []);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Selected classroom to view details
  const [selectedClass, setSelectedClass] = useState<ClassSection | null>(null);
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [filterBiometric, setFilterBiometric] = useState<string>('ALL');

  // New Class Form
  const [newClassName, setNewClassName] = useState<string>('IT - 2D');
  const [newDept, setNewDept] = useState<string>('Department of Information Technology');
  const [newYear, setNewYear] = useState<string>('II Year');
  const [newSection, setNewSection] = useState<string>('IT-2D');
  const [newRoom, setNewRoom] = useState<string>('Room 304');
  const [newReminder, setNewReminder] = useState<string>(
    'Internal assessment discussion today. Students with approved OD should be considered accordingly.'
  );

  // New Subject Form
  const [newSubjCode, setNewSubjCode] = useState<string>('IT204');
  const [newSubjName, setNewSubjName] = useState<string>('Computer Networks');

  const [showClassModal, setShowClassModal] = useState<boolean>(false);
  const [showSubjectModal, setShowSubjectModal] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cData, sData, studData] = await Promise.all([
        fetchClasses(),
        fetchSubjects(),
        fetchStudents()
      ]);
      setClasses(cData);
      setSubjects(sData);
      setAllStudents(studData);
      
      // If a class was previously selected, update its reference
      if (selectedClass) {
        const found = cData.find(c => c.class_id === selectedClass.class_id || c.name === selectedClass.name);
        if (found) setSelectedClass(found);
      }
    } catch (err) {
      console.error("Failed to load class/subject data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update students if props change
  useEffect(() => {
    if (propStudents && propStudents.length > 0) {
      setAllStudents(propStudents);
    }
  }, [propStudents]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createClass({
        name: newClassName,
        department: newDept,
        year: newYear,
        section: newSection,
        default_room: newRoom,
        default_reminder: newReminder
      });
      setShowClassModal(false);
      loadData();
    } catch (err: any) {
      alert("Error creating class: " + err.message);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSubject({
        code: newSubjCode,
        name: newSubjName,
        department: newDept
      });
      setShowSubjectModal(false);
      loadData();
    } catch (err: any) {
      alert("Error adding subject: " + err.message);
    }
  };

  // Helper to find students belonging to a class
  const getStudentsForClass = (cls: ClassSection) => {
    return allStudents.filter(s => {
      const matchSec = s.section && cls.section && s.section.toLowerCase().trim() === cls.section.toLowerCase().trim();
      const matchName = s.section && cls.name && cls.name.toLowerCase().includes(s.section.toLowerCase().trim());
      const matchYear = !cls.year || cls.year === 'ALL' || (s.year && s.year.toLowerCase().trim() === cls.year.toLowerCase().trim());
      return (matchSec || matchName) && matchYear;
    });
  };

  // Filter students within the selected classroom
  const filteredClassStudents = selectedClass ? getStudentsForClass(selectedClass).filter(s => {
    const matchesQuery = !studentSearch.trim() || 
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.register_number.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.visionattend_id.toLowerCase().includes(studentSearch.toLowerCase());
    
    const matchesBio = filterBiometric === 'ALL' || 
      (filterBiometric === 'READY' && s.face_profile_status === 'Ready') ||
      (filterBiometric === 'PENDING' && s.face_profile_status !== 'Ready');

    return matchesQuery && matchesBio;
  }) : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in">
      
      {/* Top Banner */}
      <div className="bg-[#0a2540] text-white rounded-2xl p-6 shadow-lg border border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              ACADEMIC CONFIGURATION & CLASSROOMS
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {selectedClass ? `CLASSROOM: ${selectedClass.name}` : 'CLASS & SUBJECT MANAGEMENT'}
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            {selectedClass 
              ? `Inspect enrolled students, biometric verification status, and room settings for ${selectedClass.name}.`
              : 'Configure institutional classes, enter classrooms to view student details, and manage curriculum subjects.'
            }
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {selectedClass ? (
            <>
              <button
                onClick={() => setSelectedClass(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>All Classrooms</span>
              </button>
              {onStartAttendanceForClass && (
                <button
                  onClick={() => onStartAttendanceForClass(selectedClass)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/30 transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Launch Attendance</span>
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => setShowClassModal(true)}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-950/30 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Class Section</span>
              </button>

              <button
                onClick={() => setShowSubjectModal(true)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-950/30 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Subject</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* SELECTED CLASSROOM DETAILED VIEW */}
      {selectedClass ? (
        <div className="space-y-6">
          
          {/* Classroom Overview Metadata Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-slate-900">{selectedClass.name}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {selectedClass.department}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700">
                    {selectedClass.year} • Section {selectedClass.section}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <strong>Default Room:</strong> {selectedClass.default_room || 'Room 304'}
                  </span>
                </div>
              </div>

              {/* Classroom Stats */}
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center min-w-[100px]">
                  <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Enrolled Students</div>
                  <div className="text-xl font-extrabold text-blue-900 font-mono">
                    {getStudentsForClass(selectedClass).length}
                  </div>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center min-w-[100px]">
                  <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Face AI Ready</div>
                  <div className="text-xl font-extrabold text-emerald-900 font-mono">
                    {getStudentsForClass(selectedClass).filter(s => s.face_profile_status === 'Ready').length}
                  </div>
                </div>
              </div>
            </div>

            {/* Default Session Reminder */}
            {selectedClass.default_reminder && (
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-950">Standard Session Reminder: </span>
                  <span>{selectedClass.default_reminder}</span>
                </div>
              </div>
            )}
          </div>

          {/* Student Search & Filters */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search students in this class by name or register no..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50/50"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterBiometric}
                onChange={(e) => setFilterBiometric(e.target.value)}
                className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="ALL">All Biometric Statuses</option>
                <option value="READY">Biometrics Ready (95%+)</option>
                <option value="PENDING">Needs Registration</option>
              </select>

              {onNavigateToEnroll && (
                <button
                  onClick={onNavigateToEnroll}
                  className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1.5 border border-blue-200 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Enroll New Student</span>
                </button>
              )}
            </div>
          </div>

          {/* Enrolled Students Table / Cards */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Classroom Roster ({filteredClassStudents.length} Students)</span>
              </h3>
              <span className="text-[11px] text-slate-500">
                Click any student card to view biometric face embedding details
              </span>
            </div>

            {filteredClassStudents.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {filteredClassStudents.map(student => {
                  const isReady = student.face_profile_status === 'Ready';
                  const isNeedsMore = student.face_profile_status === 'Needs More Images';
                  const avatar = student.avatar_url || (student.face_profiles && student.face_profiles[0]?.image_reference);

                  return (
                    <div 
                      key={student.student_id}
                      className="p-4 hover:bg-blue-50/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5">
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={student.name}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-sm"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-[#0a2540] text-blue-300 font-extrabold text-sm flex items-center justify-center shadow-sm">
                            {student.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">{student.name}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                              {student.register_number}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3 flex-wrap">
                            <span className="font-mono text-blue-700">{student.visionattend_id}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {student.email}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {student.phone}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <div className="text-right">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                            isReady ? 'bg-emerald-100 text-emerald-800' : (isNeedsMore ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700')
                          }`}>
                            {isReady && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                            {student.face_profile_status || 'Ready'}
                          </span>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Quality: {student.profile_quality || 'Good'} • {student.readiness_score || 96.5}%
                          </div>
                        </div>

                        {onViewStudentProfile && (
                          <button
                            onClick={() => onViewStudentProfile(student.student_id)}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title="View Student Face Profile & Attendance Records"
                          >
                            <span>Profile</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center space-y-3">
                <Users className="w-12 h-12 text-slate-300 mx-auto" />
                <div className="text-sm font-bold text-slate-700">No students found matching this criteria</div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Enroll students into {selectedClass.name} to see their details and manage their face recognition profiles.
                </p>
                {onNavigateToEnroll && (
                  <button
                    onClick={onNavigateToEnroll}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Enroll Student in this Class</span>
                  </button>
                )}
              </div>
            )}
          </div>

        </div>
      ) : (
        /* ALL CLASSES AND CURRICULUM OVERVIEW */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Classes Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>Registered Class Sections ({classes.length})</span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Click on any classroom card to enter and view full student rosters.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {classes.map(c => {
                const classStudents = getStudentsForClass(c);
                const readyCount = classStudents.filter(s => s.face_profile_status === 'Ready').length;

                return (
                  <div 
                    key={c.class_id}
                    onClick={() => setSelectedClass(c)}
                    className="p-4 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 transition-all cursor-pointer group shadow-sm hover:shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 group-hover:text-blue-700 transition-colors">
                          {c.name}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                          {c.default_room}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                        <span>Enter Classroom</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                      <span>{c.department} • {c.year}</span>
                      <span className="font-mono text-slate-600 font-semibold">
                        {classStudents.length} Students ({readyCount} AI Ready)
                      </span>
                    </div>

                    {c.default_reminder && (
                      <div className="mt-2.5 p-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 italic">
                        <span className="font-bold text-blue-900 not-italic">Reminder: </span>
                        "{c.default_reminder}"
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Subjects Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>Curriculum Subjects ({subjects.length})</span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Academic subject codes and mapped departments.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {subjects.map(s => (
                <div key={s.subject_id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {s.code}
                      </span>
                      <span className="font-bold text-xs text-slate-900">{s.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">{s.department}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Add Class Modal */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add Class Section</h3>
            <form onSubmit={handleCreateClass} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Class Display Name</label>
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="va-input text-xs"
                  placeholder="e.g. IT - 2D"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Department</label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="va-input text-xs"
                >
                  <option value="Department of Information Technology">Department of Information Technology</option>
                  <option value="Department of Computer Science & Engineering">Department of Computer Science & Engineering</option>
                  <option value="Department of Electronics & Communication">Department of Electronics & Communication</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Year</label>
                  <select
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    className="va-input text-xs"
                  >
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
                    value={newSection}
                    onChange={(e) => setNewSection(e.target.value)}
                    className="va-input text-xs"
                    placeholder="e.g. IT-2D"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Default Room</label>
                <input
                  type="text"
                  value={newRoom}
                  onChange={(e) => setNewRoom(e.target.value)}
                  className="va-input text-xs"
                  placeholder="e.g. Room 304"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Session Reminder Note</label>
                <textarea
                  value={newReminder}
                  onChange={(e) => setNewReminder(e.target.value)}
                  className="va-input text-xs h-20"
                  placeholder="Default reminder shown to faculty during attendance taking"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="va-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="va-btn-primary text-xs"
                >
                  Create Class Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Subject Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add Curriculum Subject</h3>
            <form onSubmit={handleCreateSubject} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Subject Code</label>
                <input
                  type="text"
                  value={newSubjCode}
                  onChange={(e) => setNewSubjCode(e.target.value)}
                  className="va-input text-xs uppercase"
                  placeholder="e.g. IT204"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Subject Name</label>
                <input
                  type="text"
                  value={newSubjName}
                  onChange={(e) => setNewSubjName(e.target.value)}
                  className="va-input text-xs"
                  placeholder="e.g. Computer Networks"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Department</label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="va-input text-xs"
                >
                  <option value="Department of Information Technology">Department of Information Technology</option>
                  <option value="Department of Computer Science & Engineering">Department of Computer Science & Engineering</option>
                  <option value="Department of Electronics & Communication">Department of Electronics & Communication</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="va-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="va-btn-primary text-xs"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
