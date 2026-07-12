// Medical Theme — Green & White — Final
import React, { useState, useEffect, useCallback } from 'react';
import MobileDevice from './components/MobileDevice';
import Dashboard from './components/Dashboard';
import RecordsVault from './components/RecordsVault';
import AlertOverlay from './components/AlertOverlay';
import CaregiverPortal from './components/CaregiverPortal';
import {
  Heart, Shield, ShieldAlert, Users,
  Clock, UserCheck, AlertOctagon, Activity
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function App() {
  const [appView, setAppView] = useState('patient');
  const [patientTab, setPatientTab] = useState('home');
  const [token, setToken] = useState(localStorage.getItem('hg_token') || '');
  const [userId, setUserId] = useState(parseInt(localStorage.getItem('hg_user_id')) || 0);
  const [profile, setProfile] = useState({});
  const [consentSigned, setConsentSigned] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '', fullName: '', dateOfBirth: '1980-01-01', gender: 'male' });
  const [errorMsg, setErrorMsg] = useState('');
  const [pairingType, setPairingType] = useState('Health Connect');
  const [simulationMode, setSimulationMode] = useState('stable');
  const [vitals, setVitals] = useState({ heartRate: 72, spo2: 98, bpSystolic: 120, bpDiastolic: 80, steps: 4520, sleepDuration: 7.2, temperature: 36.6 });
  const [medications, setMedications] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [alertsHistory, setAlertsHistory] = useState([]);
  const [vitalsHistory, setVitalsHistory] = useState([]);
  const [activeAlert, setActiveAlert] = useState(null);
  const [newContact, setNewContact] = useState({ name: '', relationship: '', phoneNumber: '', email: '', priorityOrder: 1, notifySms: true, notifyCall: false });

  // Google Fit callback detector
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'google-fit') {
      window.history.replaceState({}, document.title, window.location.pathname);
      setPairingType('Google Fit API');
    }
  }, []);

  // ── Fetch all user data ──
  const fetchAllData = useCallback(async () => {
    if (!userId) return;
    const headers = { 'x-user-id': userId };
    try {
      const [pRes, mRes, dRes, cRes, aRes, vRes] = await Promise.all([
        fetch(`${API_BASE}/profile`, { headers }),
        fetch(`${API_BASE}/medications`, { headers }),
        fetch(`${API_BASE}/documents`, { headers }),
        fetch(`${API_BASE}/contacts`, { headers }),
        fetch(`${API_BASE}/alerts/active`),
        fetch(`${API_BASE}/vitals?limit=30`, { headers }),
      ]);

      if (pRes.ok) {
        const d = await pRes.json();
        setProfile(d);
        setConsentSigned(!!d.consentTimestamp);
      }
      if (mRes.ok) setMedications(await mRes.json());
      if (dRes.ok) setDocuments(await dRes.json());
      if (cRes.ok) setContacts(await cRes.json());
      if (aRes.ok) {
        const all = await aRes.json();
        const userAlerts = all.filter(a => a.user_id === userId);
        setAlertsHistory(userAlerts);
        const active = userAlerts.find(a => a.status === 'triggered' || a.status === 'contact_notified');
        if (active) {
          setActiveAlert(prev => {
            if (prev && prev.id === active.id) return prev; // don't reset if same alert
            return { id: active.id, anomalyType: active.anomaly_type, readingValue: active.reading_value, rule: active.threshold_rule };
          });
        } else {
          setActiveAlert(null);
        }
      }
      if (vRes.ok) setVitalsHistory(await vRes.json());
    } catch (err) { console.error('Fetch error:', err); }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchAllData();
    const interval = setInterval(fetchAllData, 4000);
    return () => clearInterval(interval);
  }, [userId, fetchAllData]);

  // ── Vitals simulation / Google Fit sync loop ──
  useEffect(() => {
    if (!userId || !pairingType) return;
    const postVitals = async () => {
      if (pairingType === 'Google Fit API') {
        try {
          const res = await fetch(`${API_BASE}/fit/sync`, { method: 'POST', headers: { 'x-user-id': userId } });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.count > 0) {
              const m = data.metrics[0];
              setVitals(prev => ({ ...prev, heartRate: m.heartRate || prev.heartRate, steps: prev.steps + (m.steps || 0), sourceDevice: 'Google Fit' }));
            }
          }
        } catch (e) { console.error('Fit sync error:', e); }
        return;
      }
      let hr = 72, ox = 98, bpSys = 120, bpDia = 80, temp = 36.6, fall = false;
      const v = () => (Math.random() - 0.5) * 3;
      if (simulationMode === 'stable') {
        hr = Math.round(70 + v()); ox = Math.round(97 + Math.random() * 2);
        bpSys = Math.round(118 + v()); bpDia = Math.round(78 + v());
        temp = parseFloat((36.5 + (Math.random() - 0.5) * 0.2).toFixed(1));
      } else if (simulationMode === 'tachycardia') { hr = Math.round(154 + v()); ox = 98; }
      else if (simulationMode === 'bradycardia') { hr = Math.round(34 + v()); ox = 97; }
      else if (simulationMode === 'hypoxia') { hr = Math.round(84 + v()); ox = Math.round(84 + Math.random() * 2); }
      else if (simulationMode === 'fall') {
        hr = Math.round(115 + v()); ox = 96; fall = true;
        setTimeout(() => setSimulationMode('stable'), 2000);
      }

      setVitals(prev => {
        const newVitals = {
          heartRate: hr, spo2: ox, bpSystolic: bpSys, bpDiastolic: bpDia,
          steps: prev.steps + Math.floor(Math.random() * 5),
          sleepDuration: prev.sleepDuration, temperature: temp,
          fall_detected: fall, sourceDevice: pairingType
        };
        // Post to backend asynchronously
        fetch(`${API_BASE}/vitals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
          body: JSON.stringify(newVitals)
        }).then(res => {
          if (res.ok) res.json().then(rd => {
            if (rd.anomalyDetected && rd.alert) {
              setActiveAlert(rd.alert);
            }
          });
        }).catch(e => console.error('Vitals post error:', e));
        return newVitals;
      });
    };
    const interval = setInterval(postVitals, 3500);
    return () => clearInterval(interval);
  }, [userId, pairingType, simulationMode]);

  // ── Auth ──
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const endpoint = isRegistering ? '/auth/register' : '/auth/login';
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || 'Authentication failed.'); return; }
      localStorage.setItem('hg_token', data.token);
      localStorage.setItem('hg_user_id', data.userId);
      setToken(data.token);
      setUserId(data.userId);
      setConsentSigned(!!data.consentSigned);
    } catch (err) { setErrorMsg('Cannot connect to server. Is the backend running on port 5000?'); }
  };

  // ── Consent — fixed endpoint ──
  const handleConsentSign = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/consent`, {
        method: 'POST',
        headers: { 'x-user-id': userId }
      });
      if (res.ok) setConsentSigned(true);
      else setConsentSigned(true); // allow locally even if server hiccups
    } catch (err) { setConsentSigned(true); }
  };

  const handleLogout = () => {
    localStorage.removeItem('hg_token');
    localStorage.removeItem('hg_user_id');
    setToken(''); setUserId(0); setProfile({}); setConsentSigned(false);
    setActiveAlert(null); setMedications([]); setDocuments([]); setContacts([]);
  };

  // ── Profile Save — pass full profile object ──
  const handleSaveProfile = async (updatedProfile) => {
    try {
      const res = await fetch(`${API_BASE}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify(updatedProfile)
      });
      if (res.ok) setProfile(updatedProfile);
    } catch (err) { console.error('Profile save error:', err); }
  };

  // ── Add Medication — fix to re-fetch after add ──
  const handleAddMedication = async (med) => {
    try {
      const res = await fetch(`${API_BASE}/medications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify(med)
      });
      if (res.ok) {
        // Re-fetch medications list so we get the properly formatted object with decrypted fields
        const listRes = await fetch(`${API_BASE}/medications`, { headers: { 'x-user-id': userId } });
        if (listRes.ok) setMedications(await listRes.json());
      }
    } catch (err) { console.error('Add medication error:', err); }
  };

  // ── Upload Document — fixed signature: receives (file, docType) ──
  const handleUploadDocument = async (file, docType) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', docType || 'Prescription');
    try {
      const res = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        headers: { 'x-user-id': userId },
        body: formData
      });
      if (res.ok) {
        const newDoc = await res.json();
        setDocuments(prev => [newDoc, ...prev]);
        // Refresh medications in case OCR auto-detected some
        const mRes = await fetch(`${API_BASE}/medications`, { headers: { 'x-user-id': userId } });
        if (mRes.ok) setMedications(await mRes.json());
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      throw err;
    }
  };

  // ── Add Emergency Contact ──
  const handleAddContactSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify(newContact)
      });
      if (res.ok) {
        // Refresh full contacts list
        const cRes = await fetch(`${API_BASE}/contacts`, { headers: { 'x-user-id': userId } });
        if (cRes.ok) setContacts(await cRes.json());
        setNewContact({ name: '', relationship: '', phoneNumber: '', email: '', priorityOrder: 1, notifySms: true, notifyCall: false });
      }
    } catch (err) { console.error('Add contact error:', err); }
  };

  // ── Test Alert Dispatch ──
  const handleTestAlert = async () => {
    try {
      const res = await fetch(`${API_BASE}/contacts/test-alert`, {
        method: 'POST',
        headers: { 'x-user-id': userId }
      });
      const data = await res.json();
      alert(`Test alert fired!\n${JSON.stringify(data.details, null, 2)}`);
    } catch (err) { console.error('Test alert error:', err); }
  };

  // ── Manual SOS Trigger ──
  const handleTriggerSOS = async () => {
    try {
      await fetch(`${API_BASE}/alerts/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId }
      });
    } catch (err) { console.error('SOS trigger error:', err); }
  };

  // ── Dismiss Alert (User is OK) ──
  const handleDismissAlert = async () => {
    if (!activeAlert) return;
    try {
      await fetch(`${API_BASE}/alerts/${activeAlert.id}/dismiss`, {
        method: 'POST',
        headers: { 'x-user-id': userId }
      });
    } catch (err) { console.error('Dismiss error:', err); }
    setActiveAlert(null);
  };

  // ── Dispatch Alert (Bypass timer / Force SOS dispatch) ──
  const handleDispatchAlert = async () => {
    if (!activeAlert) return;
    try {
      await fetch(`${API_BASE}/alerts/${activeAlert.id}/dispatch`, {
        method: 'POST',
        headers: { 'x-user-id': userId }
      });
    } catch (err) { console.error('Dispatch error:', err); }
    setActiveAlert(null);
  };

  // ── Resolve Alert (Caregiver) ──
  const handleResolveAlertCaregiver = async (alertId, notes) => {
    try {
      await fetch(`${API_BASE}/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ notes: notes || 'Resolved by caregiver.' })
      });
      setAlertsHistory(prev => prev.filter(a => a.id !== alertId));
    } catch (err) { console.error('Resolve error:', err); }
  };

  // ── Delete Contact ──
  const handleDeleteContact = async (contactId) => {
    try {
      await fetch(`${API_BASE}/contacts/${contactId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': userId }
      });
      setContacts(prev => prev.filter(c => c.id !== contactId));
    } catch (err) { console.error('Delete contact error:', err); }
  };

  // ─── Shared inline styles ───
  const card = {
    background: 'rgba(255,255,255,0.97)',
    border: '1.5px solid rgba(22,163,74,0.18)',
    borderRadius: 14,
    padding: '12px 14px',
    boxShadow: '0 2px 12px rgba(22,163,74,0.07)'
  };
  const greenBtn = {
    background: 'linear-gradient(135deg,#22c55e,#15803d)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '10px 16px',
    fontWeight: 700,
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: '0 4px 14px rgba(22,163,74,0.35)'
  };
  const redBtn = {
    background: 'linear-gradient(135deg,#dc2626,#b91c1c)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '6px 10px',
    fontWeight: 700,
    fontSize: 10,
    cursor: 'pointer',
    fontFamily: 'inherit'
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(160deg,#f0fdf4 0%,#fafffe 100%)' }}>

      {/* ── Header ── */}
      <header style={{ background: 'linear-gradient(135deg,#14532d 0%,#15803d 100%)', boxShadow: '0 2px 20px rgba(20,83,45,0.30)', padding: '0 24px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, background: 'rgba(255,255,255,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.25)' }}>
            <ShieldAlert size={18} color="#86efac" />
          </div>
          <div>
            <div style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 800, fontSize: 14, color: '#f0fdf4', letterSpacing: '-0.01em' }}>Your Health Will Partner</div>
            <div style={{ fontSize: 10, color: 'rgba(240,253,244,0.55)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Medical Vault &amp; SOS Monitor</div>
          </div>
        </div>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.10)', padding: 4, borderRadius: 14, border: '1px solid rgba(255,255,255,0.18)', gap: 4 }}>
          {['patient', 'caregiver'].map(view => (
            <button key={view} onClick={() => setAppView(view)} style={{ fontSize: 12, fontWeight: 700, padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: appView === view ? '#22c55e' : 'transparent', color: appView === view ? '#14532d' : 'rgba(240,253,244,0.70)', boxShadow: appView === view ? '0 3px 12px rgba(34,197,94,0.40)' : 'none' }}>
              {view === 'patient' ? 'Patient Mobile App' : 'Caregiver Console'}
            </button>
          ))}
        </div>
      </header>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>

        {/* Caregiver Console */}
        {appView === 'caregiver' && (
          <CaregiverPortal
            profile={profile}
            vitals={vitals}
            medications={medications}
            documents={documents}
            contacts={contacts}
            alertsHistory={alertsHistory}
            onResolveAlert={handleResolveAlertCaregiver}
            onDispatchAlert={handleDispatchAlert}
          />
        )}

        {/* Patient — Login Screen */}
        {appView === 'patient' && !userId && (
          <div className="login-fullscreen">
            <div className="login-orb login-orb-1" />
            <div className="login-orb login-orb-2" />
            <div className="login-orb login-orb-3" />
            <div className="login-card">
              <div className="login-logo">
                <div className="login-logo-icon"><Shield size={28} color="#ffffff" /></div>
                <h1 className="login-title">Your Health Will Partner</h1>
                <p className="login-subtitle">Secure Medical Vault &amp; Real-Time Health Monitor</p>
              </div>
              <div className="login-tabs">
                <button onClick={() => setIsRegistering(false)} className={`login-tab${!isRegistering ? ' active' : ''}`}>Sign In</button>
                <button onClick={() => setIsRegistering(true)}  className={`login-tab${isRegistering  ? ' active' : ''}`}>Register</button>
              </div>
              <form onSubmit={handleAuthSubmit} className="login-form">
                {errorMsg && <div className="login-error"><AlertOctagon size={14} />{errorMsg}</div>}
                <div className="login-field">
                  <label>Email Address</label>
                  <input type="email" required placeholder="you@example.com" value={authForm.email} onChange={e => setAuthForm(p => ({ ...p, email: e.target.value }))} className="login-input" />
                </div>
                <div className="login-field">
                  <label>Password</label>
                  <input type="password" required placeholder="••••••••" value={authForm.password} onChange={e => setAuthForm(p => ({ ...p, password: e.target.value }))} className="login-input" />
                </div>
                {isRegistering && (
                  <>
                    <div className="login-field">
                      <label>Full Name</label>
                      <input type="text" required placeholder="John Doe" value={authForm.fullName} onChange={e => setAuthForm(p => ({ ...p, fullName: e.target.value }))} className="login-input" />
                    </div>
                    <div className="login-field">
                      <label>Date of Birth</label>
                      <input type="date" required value={authForm.dateOfBirth} onChange={e => setAuthForm(p => ({ ...p, dateOfBirth: e.target.value }))} className="login-input" />
                    </div>
                  </>
                )}
                <button type="submit" className="login-btn">{isRegistering ? 'Create Secure Account' : 'Sign In Securely'}</button>
              </form>
              <div className="login-divider"><span>or use demo credentials</span></div>
              <div className="login-sandbox">
                <div className="login-sandbox-row">
                  <span className="login-sandbox-label">Email</span>
                  <code className="login-sandbox-value">demo@healthguard.com</code>
                </div>
                <div className="login-sandbox-row">
                  <span className="login-sandbox-label">Password</span>
                  <code className="login-sandbox-value">password123</code>
                </div>
                <button type="button" className="login-sandbox-btn" onClick={() => {
                  setAuthForm(p => ({ ...p, email: 'demo@healthguard.com', password: 'password123' }));
                  setIsRegistering(false);
                  setTimeout(() => {
                    const f = document.querySelector('form');
                    if (f) f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                  }, 150);
                }}>
                  <UserCheck size={14} /> Auto-Fill &amp; Login Instantly
                </button>
              </div>
              <div className="login-badges">
                <div className="login-badge"><Shield size={11} /> AES-256 Encrypted</div>
                <div className="login-badge"><Activity size={11} /> Live ECG</div>
                <div className="login-badge"><ShieldAlert size={11} /> SOS Alerts</div>
              </div>
            </div>
          </div>
        )}

        {/* Patient — Mobile App (authenticated) */}
        {appView === 'patient' && userId > 0 && (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 32, width: '100%', maxWidth: 900 }}>
            <MobileDevice>
              {activeAlert && <AlertOverlay activeAlert={activeAlert} onDismissAlert={handleDismissAlert} onDispatchAlert={handleDispatchAlert} />}

              {/* Consent Screen */}
              {!consentSigned && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 8, gap: 12 }}>
                  <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(22,163,74,0.12)', paddingBottom: 10 }}>
                      <Shield size={18} color="#16a34a" />
                      <h3 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 13, fontWeight: 800, color: '#14532d', margin: 0 }}>Privacy &amp; HIPAA Consent</h3>
                    </div>
                    <p style={{ fontSize: 11, color: '#374151', lineHeight: 1.6, margin: 0 }}>To connect your wearables and store health records, your consent is required:</p>
                    <ul style={{ fontSize: 10, color: '#6b7280', paddingLeft: 14, margin: 0, lineHeight: 1.7 }}>
                      <li>Vitals encrypted at rest (AES-256-GCM)</li>
                      <li>Anomalies trigger Twilio SMS/call dispatch</li>
                      <li>This is a monitoring aid, NOT a medical device</li>
                      <li>You can withdraw consent and delete your data at any time</li>
                    </ul>
                    <button onClick={handleConsentSign} style={greenBtn}>AGREE &amp; SIGN CONSENT</button>
                  </div>
                </div>
              )}

              {/* Main App */}
              {consentSigned && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', color: '#14532d' }}>
                  <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
                    {patientTab === 'home' && (
                      <Dashboard
                        vitals={vitals}
                        simulationMode={simulationMode}
                        setSimulationMode={setSimulationMode}
                        pairingType={pairingType}
                        setPairingType={setPairingType}
                        onTriggerSOS={handleTriggerSOS}
                        vitalsHistory={vitalsHistory}
                      />
                    )}

                    {patientTab === 'vault' && (
                      <RecordsVault
                        profile={profile}
                        setProfile={setProfile}
                        medications={medications}
                        setMedications={setMedications}
                        documents={documents}
                        setDocuments={setDocuments}
                        onSaveProfile={handleSaveProfile}
                        onAddMedication={handleAddMedication}
                        onUploadDocument={handleUploadDocument}
                      />
                    )}

                    {patientTab === 'contacts' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <h2 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 18, fontWeight: 900, color: '#14532d', margin: 0 }}>Emergency Contacts</h2>

                        <form onSubmit={handleAddContactSubmit} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ fontSize: 10, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Add New Contact</div>
                          <input placeholder="Full Name *" required value={newContact.name} onChange={e => setNewContact(p => ({ ...p, name: e.target.value }))} className="glass-input" style={{ fontSize: 12 }} />
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <input placeholder="Relationship" value={newContact.relationship} onChange={e => setNewContact(p => ({ ...p, relationship: e.target.value }))} className="glass-input" style={{ fontSize: 11 }} />
                            <input placeholder="+91 XXXXX *" required value={newContact.phoneNumber} onChange={e => setNewContact(p => ({ ...p, phoneNumber: e.target.value }))} className="glass-input" style={{ fontSize: 11 }} />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: '#374151' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                              <input type="checkbox" checked={newContact.notifySms} onChange={e => setNewContact(p => ({ ...p, notifySms: e.target.checked }))} />
                              SMS Alert
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                              <input type="checkbox" checked={newContact.notifyCall} onChange={e => setNewContact(p => ({ ...p, notifyCall: e.target.checked }))} />
                              Voice Call
                            </label>
                          </div>
                          <button type="submit" style={greenBtn}>Add Emergency Contact</button>
                        </form>

                        {/* Test Alert Button */}
                        <button onClick={handleTestAlert} style={{ ...card, border: '1.5px dashed rgba(239,68,68,0.35)', cursor: 'pointer', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#dc2626', background: 'rgba(254,242,242,0.8)' }}>
                          🧪 Execute Test Alert (Sandbox SMS/Call)
                        </button>

                        {contacts.map(c => (
                          <div key={c.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#14532d' }}>{c.name}</div>
                              <div style={{ fontSize: 10, color: '#6b7280' }}>{c.relationship} · {c.phone_number}</div>
                              <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 2 }}>
                                {c.notify_sms ? '📱 SMS ' : ''}{c.notify_call ? '📞 Call' : ''}
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                              <span style={{ fontSize: 10, background: '#d1fae5', color: '#16a34a', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>#{c.priority_order}</span>
                              <button onClick={() => handleDeleteContact(c.id)} style={{ ...redBtn, padding: '3px 8px', fontSize: 9 }}>Remove</button>
                            </div>
                          </div>
                        ))}

                        {contacts.length === 0 && (
                          <div style={{ ...card, textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>No emergency contacts added yet.</div>
                        )}
                      </div>
                    )}

                    {patientTab === 'history' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <h2 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 18, fontWeight: 900, color: '#14532d', margin: 0 }}>Alert History</h2>
                        {alertsHistory.length === 0
                          ? <div style={{ ...card, textAlign: 'center', color: '#9ca3af', padding: 32, fontSize: 12 }}>No anomalies recorded. All vitals normal. ✅</div>
                          : alertsHistory.map(a => (
                            <div key={a.id} style={{ ...card, borderColor: a.status === 'resolved' || a.status === 'user_dismissed' ? 'rgba(22,163,74,0.2)' : 'rgba(239,68,68,0.25)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: a.status === 'resolved' ? '#16a34a' : '#ef4444' }}>{a.anomaly_type}</div>
                                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: a.status === 'resolved' ? '#d1fae5' : a.status === 'user_dismissed' ? '#f3f4f6' : 'rgba(239,68,68,0.1)', color: a.status === 'resolved' ? '#16a34a' : a.status === 'user_dismissed' ? '#6b7280' : '#ef4444' }}>
                                  {a.status}
                                </span>
                              </div>
                              <div style={{ fontSize: 10, color: '#6b7280', marginTop: 3 }}>{new Date(a.countdown_started_at || a.created_at).toLocaleString()}</div>
                              <div style={{ fontSize: 10, color: '#374151', marginTop: 2 }}>Reading: <strong>{a.reading_value}</strong></div>
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>

                  {/* Bottom Nav */}
                  <div style={{ borderTop: '1.5px solid rgba(22,163,74,0.15)', paddingTop: 8, display: 'flex', justifyContent: 'space-around', background: 'rgba(255,255,255,0.97)' }}>
                    {[
                      { id: 'home', label: 'Home', Icon: Heart },
                      { id: 'vault', label: 'Vault', Icon: Shield },
                      { id: 'contacts', label: 'Alerts', Icon: Users },
                      { id: 'history', label: 'Logs', Icon: Clock },
                    ].map(({ id, label, Icon }) => (
                      <button key={id} onClick={() => setPatientTab(id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700, flex: 1, cursor: 'pointer', background: 'none', border: 'none', padding: '4px 0', color: patientTab === id ? '#16a34a' : '#9ca3af', fontFamily: 'inherit' }}>
                        <Icon size={16} />{label}
                      </button>
                    ))}
                    <button onClick={handleLogout} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700, flex: 1, cursor: 'pointer', background: 'none', border: 'none', padding: '4px 0', color: '#9ca3af', fontFamily: 'inherit' }}>
                      <UserCheck size={16} />Logout
                    </button>
                  </div>
                </div>
              )}
            </MobileDevice>
          </div>
        )}

      </main>
    </div>
  );
}