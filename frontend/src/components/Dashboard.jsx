import React, { useEffect, useRef } from 'react';
import {
  Heart, Activity, TrendingUp, Compass,
  Moon, Thermometer, Radio, RefreshCw, AlertTriangle, Zap
} from 'lucide-react';

export default function Dashboard({
  vitals,
  simulationMode,
  setSimulationMode,
  pairingType,
  setPairingType,
  onTriggerSOS,
  vitalsHistory
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Real-time scrolling ECG line generator
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width = canvas.width = canvas.parentElement.clientWidth;
    let height = canvas.height = 72;

    let x = 0;
    const points = new Array(width).fill(height / 2);

    let hr = vitals.heartRate || 75;
    let period = Math.floor((60 / hr) * 60);
    let frame = 0;

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        width = canvas.width = entry.contentRect.width;
        height = canvas.height = 72;
      }
    });
    resizeObserver.observe(canvas.parentElement);

    const draw = () => {
      hr = vitals.heartRate || 75;
      period = Math.floor((60 / hr) * 60);
      frame++;

      let offset = frame % period;
      let waveVal = height / 2;

      if (offset > 10 && offset < 15) {
        waveVal -= Math.sin((offset - 10) * Math.PI / 5) * 4;
      } else if (offset >= 16 && offset <= 18) {
        waveVal += 3;
      } else if (offset > 18 && offset <= 21) {
        waveVal -= (offset - 18) * 12;
      } else if (offset > 21 && offset <= 24) {
        waveVal += 15 - (offset - 21) * 8;
      } else if (offset > 24 && offset < 32) {
        waveVal -= Math.sin((offset - 24) * Math.PI / 8) * 6;
      }

      waveVal += (Math.random() - 0.5) * 1.5;

      points.shift();
      points.push(waveVal);

      // Dark canvas background with subtle green grid
      ctx.fillStyle = '#0a1a0e';
      ctx.fillRect(0, 0, width, height);

      // Medical ECG grid
      ctx.strokeStyle = 'rgba(22,163,74,0.08)';
      ctx.lineWidth = 1;
      for (let i = 0; i < width; i += 16) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
      }
      for (let j = 0; j < height; j += 16) {
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(width, j); ctx.stroke();
      }

      const isAnomaly = vitals.heartRate > 120 || vitals.heartRate < 45;
      ctx.strokeStyle = isAnomaly ? '#ef4444' : '#22c55e';
      ctx.lineWidth = 2;
      ctx.shadowBlur = isAnomaly ? 6 : 4;
      ctx.shadowColor = isAnomaly ? '#ef4444' : '#22c55e';
      ctx.beginPath();
      ctx.moveTo(0, points[0]);
      for (let i = 1; i < width; i++) {
        ctx.lineTo(i, points[i]);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
      resizeObserver.disconnect();
    };
  }, [vitals.heartRate]);

  const vitalCard = (label, value, unit, icon, accent, sub) => (
    <div style={{
      background: 'rgba(255,255,255,0.95)',
      border: '1.5px solid rgba(22,163,74,0.15)',
      borderRadius: 14,
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      boxShadow: '0 2px 12px rgba(22,163,74,0.07)',
      transition: 'box-shadow 0.2s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 4 }}>
        <span style={{ fontSize: 22, fontWeight: 900, color: '#14532d', fontFamily: 'Outfit, sans-serif' }}>{value}</span>
        <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>{unit}</span>
      </div>
      <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 2 }}>{sub}</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '2px 0' }}>

      {/* Branding + SOS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Your Health Will Partner
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: '#14532d', margin: 0, fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em' }}>
            Live Status
          </h2>
        </div>

        <button
          onClick={onTriggerSOS}
          style={{
            background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
            color: '#fff',
            fontWeight: 900,
            fontSize: 11,
            letterSpacing: '0.04em',
            padding: '8px 14px',
            borderRadius: 20,
            border: '1.5px solid rgba(239,68,68,0.40)',
            boxShadow: '0 4px 16px rgba(239,68,68,0.45)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            animation: 'urgent-glow 1.5s infinite ease-in-out'
          }}
        >
          <AlertTriangle size={12} />
          SOS
        </button>
      </div>

      {/* ECG Canvas */}
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        border: '1.5px solid rgba(22,163,74,0.18)',
        borderRadius: 14,
        padding: '10px 12px 8px',
        boxShadow: '0 2px 12px rgba(22,163,74,0.08)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <Activity size={10} style={{ color: '#22c55e' }} />
            Live ECG · Lead II
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, color: vitals.heartRate > 120 || vitals.heartRate < 45 ? '#ef4444' : '#16a34a' }}>
            {pairingType ? '● Streaming' : '○ Disconnected'}
          </span>
        </div>
        <div style={{ width: '100%', height: 72, background: '#0a1a0e', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(22,163,74,0.15)' }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>
      </div>

      {/* Device Pairing Panel */}
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        border: '1.5px solid rgba(22,163,74,0.18)',
        borderRadius: 14,
        padding: '10px 12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        boxShadow: '0 2px 12px rgba(22,163,74,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, background: pairingType ? 'rgba(22,163,74,0.12)' : '#f3f4f6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Radio size={13} style={{ color: pairingType ? '#16a34a' : '#9ca3af' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#14532d' }}>
              {pairingType ? `${pairingType}` : 'No device paired'}
            </div>
            <div style={{ fontSize: 9, color: '#9ca3af' }}>
              {pairingType ? 'Background sync active' : 'Manual mode'}
            </div>
          </div>
        </div>
        <select
          value={pairingType}
          onChange={(e) => setPairingType(e.target.value)}
          style={{
            background: '#f0fdf4',
            border: '1.5px solid #d1fae5',
            borderRadius: 8,
            padding: '5px 8px',
            color: '#14532d',
            fontSize: 10,
            fontFamily: 'inherit',
            fontWeight: 700,
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="">Manual Entry</option>
          <option value="Google Fit API">Google Fit API</option>
          <option value="Health Connect">Health Connect</option>
          <option value="Apple Health">Apple HealthKit</option>
          <option value="Fitbit">Fitbit Sync</option>
          <option value="BLE Band">BLE Smartband</option>
        </select>
      </div>

      {/* Google Fit connect banner */}
      {pairingType === 'Google Fit API' && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(22,163,74,0.07), rgba(22,163,74,0.03))',
          border: '1.5px solid rgba(22,163,74,0.25)',
          borderRadius: 14,
          padding: '10px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
        }}>
          <div style={{ fontSize: 10, color: '#6b7280', lineHeight: 1.5, flex: 1 }}>
            Sync your Google Fit profile — steps, heart rate, and sleep data.
          </div>
          <button
            onClick={() => {
              const userId = localStorage.getItem('hg_user_id') || 1;
              const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
              window.location.href = `${apiBase}/fit/auth?userId=${userId}`;
            }}
            style={{
              background: 'linear-gradient(135deg, #22c55e, #15803d)',
              color: '#fff',
              fontWeight: 800,
              fontSize: 10,
              padding: '7px 12px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 3px 10px rgba(22,163,74,0.35)',
              fontFamily: 'inherit',
            }}
          >
            Connect Google Fit
          </button>
        </div>
      )}

      {/* Vitals Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {vitalCard('Heart Rate', vitals.heartRate || '--', 'bpm',
          <Heart size={13} style={{ animation: 'heart-pulse 1.2s infinite' }} />,
          '#ef4444', 'Resting avg: 68 bpm')}

        {vitalCard('Oxygen (SpO₂)', vitals.spo2 || '--', '%',
          <TrendingUp size={13} />,
          vitals.spo2 < 90 ? '#ef4444' : '#0ea5e9',
          vitals.spo2 >= 95 ? 'Normal — Healthy' : vitals.spo2 >= 90 ? 'Acceptable' : '⚠ Hypoxic Danger!')}

        {vitalCard('Blood Pressure',
          vitals.bpSystolic && vitals.bpDiastolic ? `${vitals.bpSystolic}/${vitals.bpDiastolic}` : '120/80',
          'mmHg',
          <Activity size={13} />,
          '#6366f1', 'Status: Optimal')}

        {vitalCard('Body Temp', vitals.temperature || '36.6', '°C',
          <Thermometer size={13} />,
          '#f59e0b', 'Skin contact: Stable')}

        {/* Steps with progress bar */}
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          border: '1.5px solid rgba(22,163,74,0.15)',
          borderRadius: 14,
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          boxShadow: '0 2px 12px rgba(22,163,74,0.07)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Steps</span>
            <Compass size={13} style={{ color: '#f97316' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#14532d', fontFamily: 'Outfit, sans-serif', marginTop: 4 }}>
            {vitals.steps?.toLocaleString() || '4,520'}
          </div>
          <div style={{ width: '100%', background: '#d1fae5', height: 4, borderRadius: 4, overflow: 'hidden', marginTop: 4 }}>
            <div style={{ background: 'linear-gradient(90deg, #22c55e, #16a34a)', height: '100%', borderRadius: 4, width: `${Math.min(((vitals.steps || 4520) / 10000) * 100, 100)}%`, transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 2 }}>Goal: 10,000 steps</div>
        </div>

        {vitalCard('Sleep', vitals.sleepDuration || '7.2', 'hrs',
          <Moon size={13} />,
          '#8b5cf6', 'Deep sleep: 2.1 hrs')}
      </div>

      {/* Simulation Controller */}
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        border: '1.5px dashed rgba(22,163,74,0.30)',
        borderRadius: 14,
        padding: '12px 14px',
        marginTop: 2,
      }}>
        <h3 style={{ fontSize: 10, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Zap size={11} />
          Wearable Sensor Simulator
        </h3>
        <p style={{ fontSize: 10, color: '#9ca3af', marginBottom: 10, marginTop: 0, lineHeight: 1.5 }}>
          Override sensor values to test the real-time anomaly detection engine:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[
            { id: 'stable',      label: 'Stable Sinus',        active: '#16a34a' },
            { id: 'tachycardia', label: 'Tachycardia >150',    active: '#ef4444' },
            { id: 'bradycardia', label: 'Bradycardia <40',     active: '#ef4444' },
            { id: 'hypoxia',     label: 'Hypoxia <90% SpO₂',  active: '#f59e0b' },
            { id: 'fall',        label: 'Simulate Fall',        active: '#ef4444' },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setSimulationMode(mode.id)}
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '6px 10px',
                borderRadius: 8,
                border: simulationMode === mode.id
                  ? `1.5px solid ${mode.active}`
                  : '1.5px solid #d1fae5',
                background: simulationMode === mode.id
                  ? `rgba(${mode.active === '#16a34a' ? '22,163,74' : mode.active === '#f59e0b' ? '245,158,11' : '239,68,68'},0.10)`
                  : '#f0fdf4',
                color: simulationMode === mode.id ? mode.active : '#6b7280',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.18s ease',
              }}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
