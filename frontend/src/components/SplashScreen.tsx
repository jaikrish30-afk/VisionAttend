import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Shield, Scan, CheckCircle2 } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('Initializing Biometric Neural Pipeline...');
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  useEffect(() => {
    const totalDuration = 2600; // 2.6s
    const intervalTime = 30;
    const increment = 100 / (totalDuration / intervalTime);

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(interval);
          setStatusText('VisionAttend Core Ready • Launching Portal');
          setTimeout(() => {
            setIsFadingOut(true);
            setTimeout(onComplete, 550);
          }, 250);
          return 100;
        }

        if (next > 75) {
          setStatusText('Syncing Classroom Biometric Registry & Evidence Vault...');
        } else if (next > 45) {
          setStatusText('Loading YuNet Deep Face & SFace Biometric Models...');
        } else if (next > 20) {
          setStatusText('Configuring Multi-Face Inference Pipeline...');
        }

        return next;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [onComplete]);

  const handleSkip = () => {
    setIsFadingOut(true);
    setTimeout(onComplete, 300);
  };

  return (
    <div 
      className={`fixed inset-0 z-[100] bg-[#142334] flex flex-col items-center justify-center p-6 text-white select-none transition-all duration-500 ease-out ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        background: 'radial-gradient(circle at center, #1b2e45 0%, #0f1c2b 70%, #0a131e 100%)'
      }}
    >
      {/* Ambient background glowing rings & grid */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-600/15 rounded-full blur-2xl" />
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `radial-gradient(rgba(34, 211, 238, 0.4) 1px, transparent 1px)`,
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      <div className="relative z-10 max-w-2xl w-full flex flex-col items-center text-center space-y-8 animate-fade-in">
        
        {/* Brand Tag Header */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold tracking-widest uppercase shadow-sm">
          <Scan className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span>INSTITUTIONAL AI ATTENDANCE PLATFORM</span>
        </div>

        {/* Central Official Brand Logo Graphic */}
        <div className="relative group max-w-xl w-full mx-auto px-4 py-2">
          {/* Glowing backdrop halo */}
          <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-teal-500/20 rounded-3xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-cyan-500/20 bg-[#16273b]/80 backdrop-blur-sm p-4 sm:p-6 flex items-center justify-center">
            <img
              src="/brand-logo.png"
              alt="VisionAttend - Smart Attendance & Inference"
              className="w-full max-h-56 sm:max-h-64 object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
              onError={(e) => {
                // Fallback to jpg if png not found
                const target = e.currentTarget;
                if (!target.src.endsWith('.jpg')) {
                  target.src = '/brand-logo.jpg';
                }
              }}
            />
          </div>
        </div>

        {/* Progress Bar & Telemetry Status */}
        <div className="w-full max-w-md space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-cyan-300 font-semibold flex items-center gap-1.5 truncate pr-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              {statusText}
            </span>
            <span className="text-cyan-400 font-bold">{Math.min(100, Math.floor(progress))}%</span>
          </div>

          <div className="w-full h-2 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-cyan-500/30 shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-400 rounded-full transition-all duration-100 ease-out shadow-[0_0_12px_rgba(34,211,238,0.7)]"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-cyan-400" />
              <span>Biometric Security • Team VisionRaiders</span>
            </span>
            <button
              onClick={handleSkip}
              className="text-cyan-400 hover:text-cyan-200 font-semibold flex items-center gap-1 hover:underline cursor-pointer transition-colors"
            >
              <span>Enter Portal</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

      </div>

      {/* Footer Credentials */}
      <div className="absolute bottom-5 text-center text-[11px] text-slate-500 font-mono tracking-wider">
        VISIONATTEND SYSTEM v3.0 • AI-ASSISTED FACIAL ATTENDANCE & VIDEO EVIDENCE
      </div>
    </div>
  );
};
