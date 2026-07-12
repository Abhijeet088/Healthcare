import React, { useState, useEffect } from 'react';
import { 
  Heart, ShieldAlert, Thermometer, TrendingUp, CheckCircle, 
  Activity, Users, FileText, Phone, MessageSquare, PlusCircle 
} from 'lucide-react';

export default function CaregiverPortal({ 
  profile, 
  vitals, 
  medications, 
  documents, 
  contacts, 
  alertsHistory, 
  onResolveAlert, 
  onDispatchAlert 
}) {
  const [resolutionNote, setResolutionNote] = useState('');
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [hrHistory, setHrHistory] = useState([]);
  const [spo2History, setSpo2History] = useState([]);

  // Mock polling of active alerts
  useEffect(() => {
    const fetchActiveAlerts = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/alerts/active');
        if (res.ok) {
          const data = await res.json();
          setActiveAlerts(data);
        }
      } catch (err) {
        console.error('Caregiver failed to poll active alerts:', err);
      }
    };

    fetchActiveAlerts();
    const interval = setInterval(fetchActiveAlerts, 2000);
    return () => clearInterval(interval);
  }, []);

  // Update caregiver portal vitals history arrays for charting
  useEffect(() => {
    if (vitals.heartRate) {
      setHrHistory(prev => {
        const next = [...prev, vitals.heartRate];
        if (next.length > 30) next.shift();
        return next;
      });
    }
    if (vitals.spo2) {
      setSpo2History(prev => {
        const next = [...prev, vitals.spo2];
        if (next.length > 30) next.shift();
        return next;
      });
    }
  }, [vitals]);

  // Render SVG Sparkline
  const renderSparkline = (data, minVal, maxVal, color) => {
    if (data.length < 2) return <div className="text-xs text-slate-500 font-mono">Calibrating sensors...</div>;
    
    const svgWidth = 400;
    const svgHeight = 80;
    
    const padding = 10;
    const chartWidth = svgWidth - padding * 2;
    const chartHeight = svgHeight - padding * 2;

    const dataMin = Math.min(...data, minVal);
    const dataMax = Math.max(...data, maxVal);
    const range = dataMax - dataMin || 1;

    const points = data.map((val, idx) => {
      const x = padding + (idx / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((val - dataMin) / range) * chartHeight;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg className="w-full h-20 bg-slate-950 rounded-xl border border-white/5 mt-2" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
        {/* Grid lines */}
        <line x1="0" y1={svgHeight/2} x2={svgWidth} y2={svgHeight/2} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {/* Glow */}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeOpacity="0.15"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  return (
    <div className="flex-1 bg-slate-950/20 p-6 flex flex-col gap-6 text-left w-full max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div>
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Clinical Care Center</span>
          <h1 className="text-2xl font-black text-slate-100 mt-1">Your Health Will Partner Caregiver Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-xs text-slate-300 font-bold bg-slate-900 border border-white/5 px-3 py-1.5 rounded-full">
            Monitoring: {profile.fullName || 'Patient Companion App'}
          </span>
        </div>
      </div>

      {/* EMERGENCY ALERTS PANEL (Flashing Warning Banner) */}
      {activeAlerts.length > 0 && (
        <div className="bg-red-950/60 border border-red-500/30 rounded-2xl p-5 flex flex-col gap-4 urgent-glow">
          <div className="flex items-center gap-2 text-red-500">
            <ShieldAlert size={20} className="animate-bounce" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider">Critical Patient Emergency Alarm</h3>
          </div>
          
          {activeAlerts.map(alert => (
            <div key={alert.id} className="flex flex-col md:flex-row justify-between items-start md:items-center bg-black/40 border border-red-500/25 rounded-xl p-4 gap-4">
              <div className="flex-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-100 text-sm">{alert.user_name}</span>
                  <span className="bg-red-800 text-white font-bold text-[9px] px-2 py-0.5 rounded uppercase">
                    {alert.anomaly_type}
                  </span>
                </div>
                <p className="text-red-200 mt-1.5">Reading: <strong className="text-white text-sm">{alert.reading_value}</strong></p>
                <p className="text-[10px] text-slate-400 mt-1">Reason: {alert.threshold_rule}</p>
                <p className="text-[9px] text-slate-500 mt-1">Countdown Started: {new Date(alert.countdown_started_at).toLocaleTimeString()}</p>
                <p className="text-[9px] text-yellow-400 mt-1 font-bold">
                  Status: {alert.status === 'triggered' ? 'User Countdown (60s timer active)...' : 'Emergency Contacts Dispatched!'}
                </p>
              </div>

              {/* Action Tools */}
              <div className="flex flex-col gap-2 w-full md:w-auto">
                <div className="flex gap-2">
                  <input 
                    placeholder="Resolution notes (e.g. Checked in, patient ok)" 
                    value={resolutionNote} onChange={(e) => setResolutionNote(e.target.value)}
                    className="glass-input text-[11px] py-1.5 px-3 min-w-[200px]"
                  />
                  <button 
                    onClick={() => {
                      onResolveAlert(alert.id, resolutionNote || 'Resolved by physician.');
                      setResolutionNote('');
                    }}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-4 py-1.5 rounded-lg cursor-pointer"
                  >
                    Resolve
                  </button>
                </div>
                {alert.status === 'triggered' && (
                  <button 
                    onClick={() => onDispatchAlert(alert.id)}
                    className="btn-danger py-1.5 text-xs font-bold"
                  >
                    Force Immediate Dispatch (Twilio Call/SMS)
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Grid: Vitals Charting & Clinical Vault */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Live Health Graphs */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="glass-panel p-5 flex flex-col gap-3">
            <h3 className="text-base font-bold text-slate-200 flex items-center gap-1.5">
              <Activity size={18} className="text-cyan-400" />
              Live Sensor Channels
            </h3>
            
            {/* HR Sparkline */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-baseline px-1">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <Heart size={12} className="text-red-500 animate-pulse" /> Heart Rate Trend
                </span>
                <span className="text-sm font-black text-red-500 font-mono">{vitals.heartRate || '--'} bpm</span>
              </div>
              {renderSparkline(hrHistory, 50, 100, '#ff3366')}
            </div>

            {/* SpO2 Sparkline */}
            <div className="flex flex-col gap-1 mt-3">
              <div className="flex justify-between items-baseline px-1">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <TrendingUp size={12} className="text-cyan-400" /> Oxygen Saturation (SpO2)
                </span>
                <span className="text-sm font-black text-cyan-400 font-mono">{vitals.spo2 || '--'} %</span>
              </div>
              {renderSparkline(spo2History, 90, 100, '#00f5d4')}
            </div>
          </div>

          {/* Historical Logs */}
          <div className="glass-panel p-5 flex flex-col gap-3">
            <h3 className="text-base font-bold text-slate-200">Alert Audit History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-slate-400 font-bold">
                    <th className="pb-2">Time</th>
                    <th className="pb-2">Incident</th>
                    <th className="pb-2">Value</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {alertsHistory.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-4 text-center text-slate-500">No alert history logs.</td>
                    </tr>
                  ) : (
                    alertsHistory.map(log => (
                      <tr key={log.id} className="border-b border-white/5 text-slate-300">
                        <td className="py-2.5 font-mono text-[10px]">
                          {new Date(log.countdown_started_at).toLocaleString()}
                        </td>
                        <td className="py-2.5">
                          <span className="font-bold text-slate-200">{log.anomaly_type}</span>
                        </td>
                        <td className="py-2.5 font-mono font-bold text-cyan-400">{log.reading_value}</td>
                        <td className="py-2.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            log.status === 'resolved' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : log.status === 'user_dismissed'
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-red-900/10 text-red-500 border border-red-500/25 animate-pulse'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-400 text-[10px] max-w-[200px] truncate" title={log.notes}>
                          {log.notes || '--'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: Encrypted Clinical Data */}
        <div className="flex flex-col gap-6">
          {/* PHR summary card */}
          <div className="glass-panel p-5 flex flex-col gap-3.5">
            <h3 className="text-base font-bold text-slate-200 flex items-center gap-1.5">
              <Users size={18} className="text-cyan-400" />
              Patient Health Record
            </h3>
            
            <div className="grid grid-cols-2 gap-3 text-xs bg-black/20 p-3 rounded-xl border border-white/5">
              <div>
                <p className="text-slate-500">Gender</p>
                <p className="font-bold text-slate-200 capitalize">{profile.gender || '--'}</p>
              </div>
              <div>
                <p className="text-slate-500">Blood Group</p>
                <p className="font-bold text-red-400">{profile.bloodGroup || '--'}</p>
              </div>
              <div>
                <p className="text-slate-500">Height</p>
                <p className="font-bold text-slate-200">{profile.height ? `${profile.height} cm` : '--'}</p>
              </div>
              <div>
                <p className="text-slate-500">Weight</p>
                <p className="font-bold text-slate-200">{profile.weight ? `${profile.weight} kg` : '--'}</p>
              </div>
            </div>

            <div className="text-xs">
              <p className="text-slate-500 font-bold">Chronic Conditions (Decrypted)</p>
              <p className="font-semibold text-slate-200 bg-slate-900 border border-white/5 rounded-lg p-2.5 mt-1 leading-relaxed">
                {profile.chronicConditions || 'None registered.'}
              </p>
            </div>

            <div className="text-xs">
              <p className="text-slate-500 font-bold">Allergies (Decrypted)</p>
              <p className="font-semibold text-red-200 bg-red-950/20 border border-red-500/10 rounded-lg p-2.5 mt-1 leading-relaxed">
                {profile.allergies || 'No known allergies.'}
              </p>
            </div>
          </div>

          {/* Active Medications list */}
          <div className="glass-panel p-5 flex flex-col gap-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
              <PlusCircle size={15} className="text-cyan-400" />
              Active Prescriptions
            </h3>
            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
              {medications.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-2">No medications logged.</p>
              ) : (
                medications.map(m => (
                  <div key={m.id} className="p-2.5 bg-slate-900 rounded-lg border border-white/5 text-xs">
                    <p className="font-bold text-slate-200">{m.name}</p>
                    <p className="text-[10px] text-slate-400">{m.dosage} — {m.frequency}</p>
                    <p className="text-[9px] text-slate-500 mt-1">Prescribing Doctor: Dr. {m.prescribing_doctor}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Uploaded lab reports */}
          <div className="glass-panel p-5 flex flex-col gap-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
              <FileText size={15} className="text-cyan-400" />
              Uploaded Reports
            </h3>
            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
              {documents.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-2">No reports uploaded.</p>
              ) : (
                documents.map(d => (
                  <div key={d.id} className="p-2.5 bg-slate-900 rounded-lg border border-white/5 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-200 truncate max-w-[150px]">{d.file_name}</p>
                      <p className="text-[9px] text-slate-500">{new Date(d.uploaded_at).toLocaleDateString()}</p>
                    </div>
                    <a 
                      href={`http://localhost:5000${d.file_path}`} target="_blank" rel="noreferrer"
                      className="text-[9px] font-bold text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 rounded hover:bg-cyan-400 hover:text-slate-950 transition-colors"
                    >
                      View Link
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Emergency contacts list */}
          <div className="glass-panel p-5 flex flex-col gap-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
              <Users size={15} className="text-cyan-400" />
              Emergency Contacts
            </h3>
            <div className="flex flex-col gap-2">
              {contacts.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-2">No emergency contacts listed.</p>
              ) : (
                contacts.map(c => (
                  <div key={c.id} className="p-2.5 bg-slate-900 rounded-lg border border-white/5 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-200">{c.name} ({c.relationship})</p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone size={8} /> {c.phone_number}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <span className="text-[8px] font-bold bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                        Priority {c.priority_order}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
