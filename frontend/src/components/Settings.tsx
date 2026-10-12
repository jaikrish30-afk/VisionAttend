import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, Sliders, Shield, Save, 
  RefreshCw, CheckCircle2, AlertTriangle, HardDrive,
  Users, Scale, AlertCircle, Info
} from 'lucide-react';
import { SystemConfigItem } from '../types';
import { fetchSettings, updateSettings } from '../api';

interface SettingsProps {
  onDatabaseReset?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onDatabaseReset }) => {
  const [configs, setConfigs] = useState<SystemConfigItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Form State
  const [confidenceThreshold, setConfidenceThreshold] = useState<string>('85.0');
  const [candidateSeparationMargin, setCandidateSeparationMargin] = useState<string>('8.0');
  const [twinSeparationMargin, setTwinSeparationMargin] = useState<string>('12.0');
  const [enableTwinAwareMode, setEnableTwinAwareMode] = useState<boolean>(true);
  const [retentionDays, setRetentionDays] = useState<string>('90');
  const [institutionName, setInstitutionName] = useState<string>('VisionAttend University');
  const [departmentName, setDepartmentName] = useState<string>('Department of Information Technology');

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await fetchSettings();
      setConfigs(data);

      data.forEach(item => {
        if (item.config_key === 'confidence_threshold') setConfidenceThreshold(item.config_value);
        if (item.config_key === 'candidate_separation_margin') setCandidateSeparationMargin(item.config_value);
        if (item.config_key === 'twin_separation_margin') setTwinSeparationMargin(item.config_value);
        if (item.config_key === 'enable_twin_aware_mode') setEnableTwinAwareMode(item.config_value !== 'false');
        if (item.config_key === 'retention_policy_days') setRetentionDays(item.config_value);
        if (item.config_key === 'institution_name') setInstitutionName(item.config_value);
        if (item.config_key === 'department_name') setDepartmentName(item.config_value);
      });
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      await updateSettings([
        { config_key: 'confidence_threshold', config_value: confidenceThreshold, description: 'Minimum confidence percentage for high-confidence match' },
        { config_key: 'candidate_separation_margin', config_value: candidateSeparationMargin, description: 'Candidate score separation margin (%) for ambiguous matches' },
        { config_key: 'twin_separation_margin', config_value: twinSeparationMargin, description: 'Elevated score separation margin (%) for identical twins and lookalikes' },
        { config_key: 'enable_twin_aware_mode', config_value: enableTwinAwareMode ? 'true' : 'false', description: 'Enable Twin-Aware Identity Verification and safeguards' },
        { config_key: 'retention_policy_days', config_value: retentionDays, description: 'Classroom video evidence retention policy in days' },
        { config_key: 'institution_name', config_value: institutionName, description: 'Institution Name' },
        { config_key: 'department_name', config_value: departmentName, description: 'Department Name' }
      ]);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert("Error updating settings: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 animate-fade-in">
      
      {/* Top Banner */}
      <div className="bg-[#0a2540] text-white rounded-2xl p-6 shadow-lg border border-blue-900/50">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
            SYSTEM PARAMETERS
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          SYSTEM SETTINGS & POLICIES
        </h1>
        <p className="text-xs text-slate-300 mt-1">
          Configure facial recognition thresholds, evidence video retention policies, and institutional scope.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* AI Facial Recognition Calibration Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <Sliders className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                AI Recognition Threshold Calibration
              </h2>
              <p className="text-xs text-slate-500">
                Determines the cut-off score between high-confidence automatic recognition and faculty review required.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Confidence Threshold (Prototype Default: 85%)
              </label>
              <span className="font-mono font-bold text-sm text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                {confidenceThreshold}%
              </span>
            </div>

            <input
              type="range"
              min="50"
              max="98"
              step="1"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(e.target.value)}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                <div className="font-bold text-[11px] uppercase">≥ {confidenceThreshold}% Score</div>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  High Confidence: Candidate automatically placed in Present attendance draft.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                <div className="font-bold text-[11px] uppercase">&lt; {confidenceThreshold}% Score</div>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Review Required: Flagged for side-by-side video frame review by faculty.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Twin-Aware Disambiguation & Separation Policy Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span>Twin-Aware Disambiguation Policy</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold uppercase tracking-normal">
                    Precision Safeguard
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Compare candidate score separation instead of blindly accepting top match. Flags ambiguous cases as IDENTITY VERIFICATION REQUIRED.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs font-semibold text-slate-700">Active Mode</span>
              <input
                type="checkbox"
                checked={enableTwinAwareMode}
                onChange={(e) => setEnableTwinAwareMode(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
            </label>
          </div>

          {/* Standard Candidate Separation Margin */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800">
                  Standard Candidate-Score Separation Margin
                </label>
                <p className="text-[11px] text-slate-500">
                  Minimum similarity margin required between Candidate 1 and Candidate 2.
                </p>
              </div>
              <span className="font-mono font-bold text-sm text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
                {candidateSeparationMargin}%
              </span>
            </div>

            <input
              type="range"
              min="3.0"
              max="20.0"
              step="0.5"
              value={candidateSeparationMargin}
              onChange={(e) => setCandidateSeparationMargin(e.target.value)}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          {/* Elevated Twin Separation Margin */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800">
                  Identical Twin / Lookalike Separation Margin
                </label>
                <p className="text-[11px] text-slate-500">
                  Elevated margin enforced when either candidate is flagged as an identical twin or lookalike sibling.
                </p>
              </div>
              <span className="font-mono font-bold text-sm text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded border border-purple-200">
                {twinSeparationMargin}%
              </span>
            </div>

            <input
              type="range"
              min="5.0"
              max="25.0"
              step="0.5"
              value={twinSeparationMargin}
              onChange={(e) => setTwinSeparationMargin(e.target.value)}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
          </div>

          {/* Policy Explainer Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800">
              <div className="flex items-center gap-1.5 font-bold text-[11px] uppercase text-indigo-700">
                <Scale className="w-3.5 h-3.5" />
                <span>Candidate Comparison Rule</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                If <span className="font-mono font-bold">(Score₁ - Score₂) &lt; Margin</span>, recognition is withheld. The student is neither marked present nor absent, but flagged for Faculty Secondary Verification.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900">
              <div className="flex items-center gap-1.5 font-bold text-[11px] uppercase text-amber-800">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Scientific Model Calibration Disclaimer</span>
              </div>
              <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                Biometric scores represent cosine similarity in a 128-d latent manifold, <strong>not calibrated probabilities</strong>. Facial recognition alone cannot reliably distinguish identical twins; final attendance remains subject to authorized faculty approval.
              </p>
            </div>
          </div>
        </div>

        {/* Video Evidence Retention Policy Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <HardDrive className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Video Evidence Retention Policy
              </h2>
              <p className="text-xs text-slate-500">
                Configure institutional data retention compliance for recorded classroom sessions.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { days: '30', label: '30 Days', desc: 'Standard monthly audit cycle' },
              { days: '90', label: '90 Days (Recommended)', desc: 'Full academic semester retention' },
              { days: '180', label: '180 Days', desc: 'Extended academic year audit' }
            ].map(item => (
              <div
                key={item.days}
                onClick={() => setRetentionDays(item.days)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  retentionDays === item.days
                    ? 'border-blue-600 bg-blue-50/70 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">{item.label}</span>
                  {retentionDays === item.days && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Institutional Branding Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <Shield className="w-5 h-5 text-blue-700" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Institutional Identification
              </h2>
              <p className="text-xs text-slate-500">
                Printed headers and formal report letterhead details.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Institution Name
              </label>
              <input
                type="text"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                className="va-input text-xs font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Department Name
              </label>
              <input
                type="text"
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                className="va-input text-xs font-semibold"
                required
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {savedSuccess && (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Settings updated successfully</span>
            </span>
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-900/30 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>

      </form>

    </div>
  );
};
