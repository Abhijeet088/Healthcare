import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertOctagon, Volume2, ShieldCheck, MapPin } from 'lucide-react';

export default function AlertOverlay({ 
  activeAlert, 
  onDismissAlert, 
  onDispatchAlert 
}) {
  const [secondsLeft, setSecondsLeft] = useState(60);

  useEffect(() => {
    if (!activeAlert) return;
    setSecondsLeft(60);

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDispatchAlert(activeAlert.id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeAlert, onDispatchAlert]);

  if (!activeAlert) return null;

  return (
    <div className="absolute inset-0 z-50 bg-red-950/95 flex flex-col p-6 critical-glow text-left overflow-y-auto">
      {/* Notch compensation spacer */}
      <div className="h-4"></div>

      {/* Pulsing Alarm Icon */}
      <div className="flex flex-col items-center justify-center my-6 gap-2 text-center">
        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white border-4 border-red-400 shadow-lg shadow-red-900/50 animate-bounce">
          <ShieldAlert size={36} />
        </div>
        <h2 className="text-xl font-black text-white tracking-wide uppercase">Critical Warning</h2>
        <div className="text-[10px] bg-red-800/80 border border-red-500 text-red-100 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <Volume2 size={10} className="animate-pulse" />
          Alarm Activated
        </div>
      </div>

      {/* Warning Info */}
      <div className="bg-black/40 border border-red-500/20 rounded-2xl p-4 flex flex-col gap-2">
        <h3 className="text-xs font-black text-red-400 uppercase tracking-widest flex items-center gap-1.5">
          <AlertOctagon size={14} />
          {activeAlert.anomalyType} Detected
        </h3>
        
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black text-white">{activeAlert.readingValue}</span>
          <span className="text-xs text-red-300 font-medium">Value Registered</span>
        </div>
        
        <p className="text-[10px] text-red-200 leading-relaxed">
          {activeAlert.rule}
        </p>

        <div className="flex items-center gap-1 text-[9px] text-red-300/80 border-t border-white/5 pt-2 mt-1">
          <MapPin size={10} className="text-red-400" />
          Location: Lat 37.7749, Long -122.4194 (Home)
        </div>
      </div>

      {/* Large Timer Visual */}
      <div className="my-6 text-center flex flex-col items-center justify-center">
        <div className="relative w-28 h-28 flex items-center justify-center">
          {/* Circular SVG Progress */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="56"
              cy="56"
              r="48"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="56"
              cy="56"
              r="48"
              stroke="#ff3366"
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={301.6}
              strokeDashoffset={301.6 - (301.6 * secondsLeft) / 60}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-white">{secondsLeft}</span>
            <span className="text-[8px] font-bold text-red-300 uppercase tracking-widest">Seconds</span>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-2.5 mt-auto">
        <button
          onClick={() => onDismissAlert(activeAlert.id)}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-950/40 flex justify-center items-center gap-1.5 cursor-pointer"
        >
          <ShieldCheck size={16} />
          I AM OK — DISMISS ALARM
        </button>

        <button
          onClick={() => onDispatchAlert(activeAlert.id)}
          className="w-full bg-transparent hover:bg-white/5 border border-red-500/30 hover:border-red-500 text-red-200 hover:text-white font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer"
        >
          BYPASS TIMER & DISPATCH SOS
        </button>
      </div>

      {/* What happens text */}
      <div className="text-center mt-4">
        <p className="text-[8px] text-red-300/60 leading-normal uppercase tracking-wider">
          If you don't respond, emergency contacts will be immediately alerted with your live location.
        </p>
      </div>
    </div>
  );
}
