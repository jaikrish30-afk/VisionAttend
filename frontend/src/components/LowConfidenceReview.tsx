import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, XCircle, AlertTriangle, 
  ArrowLeft, ArrowRight, UserX, UserPlus, Check,
  ShieldAlert, ShieldCheck, Users, HelpCircle, FileText,
  BadgeAlert, Sliders, ExternalLink
} from 'lucide-react';
import { AttendanceSession, AttendanceRecord, Student } from '../types';
import { resolveReviewCase } from '../api';

interface LowConfidenceReviewProps {
  session: AttendanceSession;
  students: Student[];
  onReviewCompleted: (updatedSession: AttendanceSession) => void;
  onBackToDraft: () => void;
}

export const LowConfidenceReview: React.FC<LowConfidenceReviewProps> = ({
  session,
  students,
  onReviewCompleted,
  onBackToDraft
}) => {
  const [currentSession, setCurrentSession] = useState<AttendanceSession>(session);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  useEffect(() => {
    setCurrentSession(session);
    setCurrentIndex(0);
  }, [session.session_id, session.records]);

  const reviewRecords = (currentSession.records || []).filter(
    r => r.status === 'REVIEW' || 
         r.verification_status === 'PENDING_REVIEW' || 
         r.verification_status === 'IDENTITY_VERIFICATION_REQUIRED' ||
         r.ai_status === 'IDENTITY_VERIFICATION_REQUIRED'
  );
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [selectedReplacementStudentId, setSelectedReplacementStudentId] = useState<number>(0);
  
  // Secondary verification fields
  const [secondaryMethod, setSecondaryMethod] = useState<string>('STUDENT_ID_CARD');
  const [idReference, setIdReference] = useState<string>('');
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [reviewerName, setReviewerName] = useState<string>(session.faculty_name || 'Dr. S. Ramanathan, Associate Prof');
  const [showAuditNote, setShowAuditNote] = useState<boolean>(false);

  const activeRecord: AttendanceRecord | undefined = reviewRecords[currentIndex];

  // Parse candidate details for twin / lookalike comparison
  let candDetails: any = null;
  if (activeRecord?.candidate_details_json) {
    try {
      candDetails = typeof activeRecord.candidate_details_json === 'string' 
        ? JSON.parse(activeRecord.candidate_details_json) 
        : activeRecord.candidate_details_json;
    } catch {
      candDetails = null;
    }
  }

  const isTwinOrAmbiguous = 
    activeRecord?.ai_status === 'IDENTITY_VERIFICATION_REQUIRED' ||
    activeRecord?.verification_status === 'IDENTITY_VERIFICATION_REQUIRED' ||
    candDetails?.is_ambiguous ||
    candDetails?.is_twin_case;

  const currentStudent = students.find(s => s.student_id === activeRecord?.student_id);
  const candidate2Student = candDetails?.second_candidate?.student_id 
    ? students.find(s => s.student_id === candDetails.second_candidate.student_id) 
    : null;

  const handleAction = async (action: 'CONFIRM' | 'REJECT' | 'CHANGE_STUDENT' | 'MARK_ABSENT' | 'CONFIRM_CANDIDATE_2' | 'CONFIRM_BOTH') => {
    if (!activeRecord) return;
    setIsResolving(true);

    const fullNotes = [
      idReference ? `ID Ref: ${idReference}` : null,
      correctionReason ? `Reason: ${correctionReason}` : null
    ].filter(Boolean).join(' • ');

    let targetStudentId = undefined;
    if (action === 'CHANGE_STUDENT') {
      targetStudentId = selectedReplacementStudentId;
    } else if (action === 'CONFIRM_CANDIDATE_2') {
      targetStudentId = candDetails?.second_candidate?.student_id || selectedReplacementStudentId;
    } else if (action === 'CONFIRM_BOTH') {
      targetStudentId = candDetails?.second_candidate?.student_id || selectedReplacementStudentId;
    }

    try {
      const res = await resolveReviewCase(currentSession.session_id, {
        attendance_id: activeRecord.attendance_id,
        action: action,
        new_student_id: targetStudentId,
        secondary_verification_method: secondaryMethod,
        correction_reason: correctionReason || undefined,
        verified_by: reviewerName,
        notes: fullNotes || undefined
      });

      setCurrentSession(res.session);
      setCorrectionReason('');
      setIdReference('');
      setSelectedReplacementStudentId(0);
      if (currentIndex >= reviewRecords.length - 1) {
        setCurrentIndex(Math.max(0, reviewRecords.length - 2));
      }
    } catch (err: any) {
      alert("Error resolving review case: " + err.message);
    } finally {
      setIsResolving(false);
    }
  };

  // Check if all review cases are resolved
  const remainingReviews = (currentSession.records || []).filter(r => r.status === 'REVIEW');

  if (remainingReviews.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-2xl mx-auto shadow-sm text-center space-y-4 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">All Review Cases Successfully Resolved</h2>
          <p className="text-xs text-slate-500 mt-1">
            Every ambiguous match and low-confidence candidate has been verified by the faculty advisor with secondary credentials and recorded in the audit log.
          </p>
        </div>
        <div className="pt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => onReviewCompleted(currentSession)}
            className="va-btn-primary text-xs flex items-center gap-2"
          >
            <span>Proceed to Attendance Draft & Final Approval</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-16">
      
      {/* Top Header Card */}
      <div className={`text-white rounded-2xl p-5 shadow-lg border transition-all ${
        isTwinOrAmbiguous 
          ? 'bg-gradient-to-r from-[#171335] via-[#1e1b4b] to-[#0a2540] border-purple-800/60' 
          : 'bg-[#0a2540] border-blue-900/50'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              {isTwinOrAmbiguous ? (
                <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-400/40 flex items-center gap-1 animate-pulse">
                  <ShieldAlert className="w-3.5 h-3.5 text-purple-300" />
                  IDENTITY VERIFICATION REQUIRED
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  LOW CONFIDENCE REVIEW
                </span>
              )}
              <span className="text-xs text-blue-200 font-mono">
                Case {currentIndex + 1} of {reviewRecords.length}
              </span>
            </div>
            
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              {isTwinOrAmbiguous 
                ? "Twin-Aware Identity Verification & Disambiguation" 
                : "Low-Confidence Match Verification"}
            </h1>
            
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              {isTwinOrAmbiguous
                ? "Candidate score separation is below the institutional safety margin. Visual recognition alone cannot reliably distinguish identical twins or lookalikes. Secondary physical credential verification is required."
                : "Compare the recorded classroom scene against the extracted face profile to confirm or correct identity."}
            </p>
          </div>

          <button
            onClick={onBackToDraft}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-center"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Draft</span>
          </button>
        </div>
      </div>

      {activeRecord && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-6 p-6">
          
          {/* Candidate Ambiguity / Twin Warning Banner */}
          {isTwinOrAmbiguous && (
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-900 uppercase tracking-wider">
                  <BadgeAlert className="w-4 h-4 text-purple-600" />
                  <span>Ambiguous Face Match Detected: Multi-Candidate Separation Alert</span>
                </div>
                {candDetails?.score_separation !== undefined && (
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-purple-200 text-purple-900">
                    Candidate Score Delta: {candDetails.score_separation}% (Margin Threshold: {candDetails.required_margin}%)
                  </span>
                )}
              </div>
              <p className="text-xs text-purple-800 leading-relaxed">
                The deep neural vision engine detected high feature correlation with more than one registered student profile. 
                Under institutional policy, <strong>attendance must NOT be automatically awarded or marked absent</strong> without secondary verification.
              </p>
            </div>
          )}

          {/* Side-by-Side Visual Evidence: Classroom Context vs Aligned Face */}
          <div>
            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Section 1: Photographic Evidence Frames</span>
              <span className="text-slate-400 font-normal">Classroom Recording vs Biometric Aligned Crop</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Left: Video Frame from Classroom Recording */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>1. Classroom Scene Video Frame</span>
                  <span className="text-[10px] text-slate-500 font-normal">Recorded Context</span>
                </div>

                <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center border border-slate-300">
                  {activeRecord.video_frame_path ? (
                    <img
                      src={activeRecord.video_frame_path}
                      alt="Classroom Scene"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-4 text-xs text-slate-400">
                      Classroom video scene snapshot captured during session scan.
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Best Extracted Face Frame Used for Recognition */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>2. Extracted Aligned Face Frame</span>
                  <span className="text-[10px] text-slate-500 font-normal">Extracted Feature Crop</span>
                </div>

                <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center border border-slate-300">
                  {activeRecord.best_frame_path ? (
                    <img
                      src={activeRecord.best_frame_path}
                      alt="Best Face Frame"
                      className="max-h-full object-contain"
                    />
                  ) : (
                    <div className="text-center p-4 text-xs text-slate-400">
                      Best quality cropped face frame aligned by YuNet &amp; SFace.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Section 2: Candidate Identities and Recognition Scores */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Section 2: Plausible Candidate Profiles &amp; Biometric Scores</span>
              <span className="text-slate-400 font-normal">Latent Vector Cosine Correlation</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Candidate 1 (Top Prediction) */}
              <div className={`p-4 rounded-xl border space-y-3 ${
                isTwinOrAmbiguous ? 'bg-purple-50/50 border-purple-200' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    Candidate 1 (Primary AI Prediction)
                  </span>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Similarity Index</span>
                    <span className="text-base font-bold font-mono text-blue-700">
                      {candDetails?.top_candidate?.pct ?? activeRecord.confidence}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-200 overflow-hidden border border-slate-300 flex-shrink-0 flex items-center justify-center">
                    {currentStudent?.avatar_url || (currentStudent?.face_profiles?.[0]?.image_reference) ? (
                      <img
                        src={currentStudent?.avatar_url || currentStudent?.face_profiles?.[0]?.image_reference}
                        alt="Candidate 1 Enrolled"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {activeRecord.student_name || currentStudent?.name || "Candidate 1"}
                    </h3>
                    <p className="text-xs font-mono text-slate-600">
                      {activeRecord.register_number || currentStudent?.register_number}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {activeRecord.department || currentStudent?.department}
                    </p>
                    {currentStudent?.is_twin && (
                      <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        Enrolled Twin / Lookalike
                      </span>
                    )}
                  </div>
                </div>

                {candDetails?.top_candidate?.score !== undefined && (
                  <div className="text-[10px] text-slate-500 font-mono bg-white p-2 rounded-lg border border-slate-200">
                    Raw Centroid Cosine: {candDetails.top_candidate.score}
                  </div>
                )}
              </div>

              {/* Candidate 2 (Runner-Up / Sibling / Twin) */}
              {candDetails?.second_candidate ? (
                <div className="p-4 rounded-xl border bg-purple-50/50 border-purple-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                      Candidate 2 (Plausible Competitor)
                    </span>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Similarity Index</span>
                      <span className="text-base font-bold font-mono text-purple-700">
                        {candDetails.second_candidate.pct}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-200 overflow-hidden border border-slate-300 flex-shrink-0 flex items-center justify-center">
                      {candidate2Student?.avatar_url || (candidate2Student?.face_profiles?.[0]?.image_reference) ? (
                        <img
                          src={candidate2Student?.avatar_url || candidate2Student?.face_profiles?.[0]?.image_reference}
                          alt="Candidate 2 Enrolled"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users className="w-6 h-6 text-purple-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {candDetails.second_candidate.name}
                      </h3>
                      <p className="text-xs font-mono text-slate-600">
                        {candDetails.second_candidate.register_number}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {candDetails.second_candidate.department || candidate2Student?.department}
                      </p>
                      {candDetails.second_candidate.is_twin && (
                        <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                          Identical Twin Profile
                        </span>
                      )}
                    </div>
                  </div>

                  {candDetails.second_candidate.score !== undefined && (
                    <div className="text-[10px] text-slate-500 font-mono bg-white p-2 rounded-lg border border-slate-200">
                      Raw Centroid Cosine: {candDetails.second_candidate.score}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col justify-center text-center p-6 text-xs text-slate-500">
                  <p className="font-semibold text-slate-700">No close competitor candidate</p>
                  <p className="text-[11px] mt-1 text-slate-400">
                    Review required solely due to low illumination, pose angle, or camera blur (Match score &lt; 85%).
                  </p>
                </div>
              )}

            </div>
          </div>

          {/* Section 3: Institution-Approved Secondary Verification (Mandatory) */}
          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-4">
            <div className="flex items-center gap-2 border-b border-blue-100 pb-2">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                Section 3: Institution-Approved Secondary Identity Verification
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  1. Secondary Verification Method <span className="text-rose-500">*</span>
                </label>
                <select
                  value={secondaryMethod}
                  onChange={(e) => setSecondaryMethod(e.target.value)}
                  className="va-input text-xs font-semibold"
                >
                  <option value="STUDENT_ID_CARD">Physical Student ID Card Inspected (Recommended)</option>
                  <option value="FACULTY_AUTHENTICATED_CONFIRMATION">Authenticated In-Person Faculty Confirmation</option>
                  <option value="ROLL_CALL_AUTHENTICATION">Roll Call &amp; Register Number Verification</option>
                  <option value="SEATING_CHART_CONFIRMATION">Designated Seating Chart Verification</option>
                  <option value="BIOMETRIC_RESCAN_CONFIRMED">Supervised Biometric Re-Scan / Desk Check</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  2. Student ID Card / Ref # (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. ID Card Serial #710023104012"
                  value={idReference}
                  onChange={(e) => setIdReference(e.target.value)}
                  className="va-input text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  3. Correction Reason &amp; Audit Log Justification <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Verified physically via ID card in classroom; identical twin confirmed in different hall"
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="va-input text-xs"
                />
              </div>
            </div>
          </div>

          {/* Optional: Alternate Student Selector from Full Class Roster */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select Alternate Student from Class Roster (if completely different student detected)
            </label>
            <select
              value={selectedReplacementStudentId}
              onChange={(e) => setSelectedReplacementStudentId(Number(e.target.value))}
              className="va-input text-xs font-medium"
            >
              <option value={0}>-- Keep Candidate Selection Above --</option>
              {students.map(s => (
                <option key={s.student_id} value={s.student_id}>
                  {s.register_number} - {s.name} ({s.department}) {s.is_twin ? '• [Twin]' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons for Authorized Faculty Decision */}
          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            
            <div className="flex items-center gap-2">
              <button
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(prev => prev - 1)}
                className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold disabled:opacity-40"
              >
                Previous Case
              </button>
              <button
                disabled={currentIndex >= reviewRecords.length - 1}
                onClick={() => setCurrentIndex(prev => prev + 1)}
                className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold disabled:opacity-40"
              >
                Next Case
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              
              {/* Mark Absent */}
              <button
                onClick={() => handleAction('MARK_ABSENT')}
                disabled={isResolving}
                className="px-3.5 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1.5 transition-colors"
                title="Mark this unverified candidate absent"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Mark Unresolved / Absent</span>
              </button>

              {/* Reject Match */}
              <button
                onClick={() => handleAction('REJECT')}
                disabled={isResolving}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject Match</span>
              </button>

              {/* If Roster selection changed */}
              {selectedReplacementStudentId > 0 && (
                <button
                  onClick={() => handleAction('CHANGE_STUDENT')}
                  disabled={isResolving}
                  className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Assign Selected Roster Student</span>
                </button>
              )}

              {/* If Candidate 2 exists (Twin Disambiguation Option) */}
              {candDetails?.second_candidate && (
                <button
                  onClick={() => handleAction('CONFIRM_CANDIDATE_2')}
                  disabled={isResolving}
                  className="px-3.5 py-2 rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                  title="Assign attendance to Candidate 2 and keep Candidate 1 absent"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm Candidate 2 ({candDetails.second_candidate.name})</span>
                </button>
              )}

              {/* Confirm Candidate 1 Present */}
              <button
                onClick={() => handleAction('CONFIRM')}
                disabled={isResolving}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm Candidate 1 ({activeRecord.student_name}) Present</span>
              </button>

            </div>

          </div>

          {/* Institutional Compliance Policy & AI Limitation Notice (Requirement 10) */}
          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <HelpCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-slate-700">Institutional Compliance Policy &amp; Audit Integrity:</strong>
              <p>
                VisionAttend does not claim that facial recognition can reliably distinguish identical twins. 
                All ambiguous and twin cases require institution-approved secondary identity verification (e.g., student ID card inspection). 
                The original AI prediction, candidate scores, final faculty decision, reviewer name, timestamp, and correction reason are permanently recorded in the institutional audit log.
                Final attendance status is subject to faculty authorization.
              </p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
