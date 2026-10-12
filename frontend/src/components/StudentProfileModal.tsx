import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, CheckCircle2, XCircle, ShieldAlert, 
  Calendar, Clock, Sparkles, X, ShieldCheck, Mail, Phone
} from 'lucide-react';
import { fetchStudentById } from '../api';

interface StudentProfileModalProps {
  studentId: number | null;
  onClose: () => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  studentId,
  onClose
}) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    fetchStudentById(studentId)
      .then((data: any) => setProfile(data))
      .catch((err: any) => console.error(err))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (!studentId) return null;

  const mainPhoto = profile?.avatar_url || profile?.face_profiles?.[0]?.image_reference;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            Loading student biometric attendance profile...
          </div>
        ) : profile ? (
          <>
            {/* Student Header Card */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 border-b border-slate-200 pb-5">
              <div className="w-24 h-24 rounded-xl bg-slate-100 border border-slate-200 shadow-md overflow-hidden flex items-center justify-center flex-shrink-0">
                {mainPhoto ? (
                  <img
                    src={mainPhoto}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#0a2540] text-white font-bold text-3xl flex items-center justify-center">
                    {profile.name?.charAt(0) || 'S'}
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-center sm:text-left flex-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <h2 className="text-xl font-bold text-slate-900">{profile.name}</h2>
                  <span className="font-mono text-xs px-2.5 py-1 rounded bg-blue-50 text-blue-900 font-bold border border-blue-200">
                    {profile.register_number}
                  </span>
                </div>

                <div className="text-xs text-slate-500 font-medium">
                  {profile.department} • {profile.section} ({profile.year})
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-600 pt-1">
                  <span className="flex items-center gap-1.5 font-mono">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {profile.email}
                  </span>
                  <span className="flex items-center gap-1.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {profile.phone}
                  </span>
                </div>
              </div>
            </div>

            {/* Biometric Status Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Profile Readiness</div>
                <div className="text-xl font-bold text-emerald-700 font-mono mt-0.5">
                  {profile.readiness_score || 96.8}%
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Profile Quality</div>
                <div className="text-xl font-bold text-blue-700 font-mono mt-0.5">
                  {profile.profile_quality || 'Good'}
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Registered Angles</div>
                <div className="text-xl font-bold text-slate-800 font-mono mt-0.5">
                  {profile.face_profiles?.length || 5} Samples
                </div>
              </div>
            </div>

            {/* Registered Biometric Angles Photo Gallery */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Multi-Sample Biometric Embeddings</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {(profile.face_profiles || []).map((fp: any, idx: number) => (
                  <div
                    key={fp.face_profile_id || idx}
                    className="p-2 rounded-xl border border-slate-200 bg-slate-50 space-y-1 text-center"
                  >
                    <div className="aspect-square bg-slate-900 rounded-lg overflow-hidden border border-slate-300">
                      <img
                        src={fp.image_reference}
                        alt={fp.photo_label}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-[11px] font-bold text-slate-800 truncate">{fp.photo_label}</div>
                    <div className="text-[10px] text-slate-500">{fp.pose_angle}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}

        <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="va-btn-secondary text-xs"
          >
            Close Profile
          </button>
        </div>

      </div>
    </div>
  );
};
