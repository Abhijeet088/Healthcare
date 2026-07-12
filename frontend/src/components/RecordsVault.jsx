import React, { useState } from 'react';
import {
  FileText, Upload, Search, Plus,
  Shield, Eye, Calendar
} from 'lucide-react';

export default function RecordsVault({
  profile,
  setProfile,
  medications,
  setMedications,
  documents,
  setDocuments,
  onSaveProfile,
  onAddMedication,
  onUploadDocument
}) {
  const [activeTab, setActiveTab] = useState('profile');
  const [searchTerm, setSearchTerm] = useState('');
  const [newMed, setNewMed] = useState({ name: '', dosage: '', frequency: '', prescribingDoctor: '' });
  const [uploadState, setUploadState] = useState({ file: null, docType: 'Prescription', uploading: false, error: null, success: null });
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [saving, setSaving] = useState(false);

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
    boxShadow: '0 4px 14px rgba(22,163,74,0.35)',
    width: '100%'
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleMedSubmit = (e) => {
    e.preventDefault();
    if (!newMed.name) return;
    onAddMedication(newMed);
    setNewMed({ name: '', dosage: '', frequency: '', prescribingDoctor: '' });
  };

  const handleFileChange = (e) => {
    setUploadState(prev => ({ ...prev, file: e.target.files[0], error: null, success: null }));
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadState.file) return;
    setUploadState(prev => ({ ...prev, uploading: true, error: null, success: null }));
    try {
      await onUploadDocument(uploadState.file, uploadState.docType);
      setUploadState({ file: null, docType: 'Prescription', uploading: false, error: null, success: 'File uploaded & OCR text extracted!' });
    } catch (err) {
      setUploadState(prev => ({ ...prev, uploading: false, error: 'Upload failed. Try again.' }));
    }
  };

  const handleSaveProfileClick = async () => {
    setSaving(true);
    await onSaveProfile(profile);
    setSaving(false);
  };

  const filteredDocs = documents.filter(doc =>
    doc.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.ocr_text && doc.ocr_text.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const tabs = ['profile', 'meds', 'docs'];
  const tabLabel = { profile: 'Profile', meds: 'Medications', docs: 'Documents' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Your Health Will Partner</div>
        <h2 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 18, fontWeight: 900, color: '#14532d', margin: '2px 0 0' }}>Records Vault</h2>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#f0fdf4', padding: 4, borderRadius: 12, border: '1px solid #d1fae5', gap: 4 }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              fontSize: 11,
              fontWeight: 700,
              padding: '8px 4px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              background: activeTab === tab ? '#16a34a' : 'transparent',
              color: activeTab === tab ? '#fff' : '#6b7280',
              transition: 'all 0.18s ease',
              boxShadow: activeTab === tab ? '0 2px 8px rgba(22,163,74,0.30)' : 'none'
            }}
          >
            {tabLabel[tab]}
          </button>
        ))}
      </div>

      {/* ── Profile Section ── */}
      {activeTab === 'profile' && (
        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(22,163,74,0.12)', paddingBottom: 8 }}>
            <Shield size={14} color="#16a34a" />
            <h3 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 12, fontWeight: 800, color: '#14532d', margin: 0 }}>Personal Health Profile</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280' }}>Full Name</label>
              <input
                name="fullName" value={profile.fullName || ''} onChange={handleProfileChange}
                className="glass-input" style={{ fontSize: 11, padding: '8px 10px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280' }}>Blood Group</label>
              <select
                name="bloodGroup" value={profile.bloodGroup || ''} onChange={handleProfileChange}
                className="glass-input" style={{ fontSize: 11, padding: '8px 10px' }}
              >
                <option value="">Select</option>
                {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280' }}>Height (cm)</label>
              <input
                name="height" type="number" value={profile.height || ''} onChange={handleProfileChange}
                className="glass-input" style={{ fontSize: 11, padding: '8px 10px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280' }}>Weight (kg)</label>
              <input
                name="weight" type="number" value={profile.weight || ''} onChange={handleProfileChange}
                className="glass-input" style={{ fontSize: 11, padding: '8px 10px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280' }}>Chronic Medical Conditions</label>
            <textarea
              name="chronicConditions" value={profile.chronicConditions || ''} onChange={handleProfileChange}
              rows={2} className="glass-input" style={{ fontSize: 11, resize: 'vertical' }}
              placeholder="e.g. Hypertension, Type 2 Diabetes"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#dc2626' }}>⚠ Known Allergies</label>
            <textarea
              name="allergies" value={profile.allergies || ''} onChange={handleProfileChange}
              rows={2} className="glass-input" style={{ fontSize: 11, borderColor: 'rgba(239,68,68,0.30)', resize: 'vertical' }}
              placeholder="e.g. Penicillin, Peanuts"
            />
          </div>

          <button onClick={handleSaveProfileClick} disabled={saving} style={{ ...greenBtn, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : '💾 Save Health Profile'}
          </button>
        </div>
      )}

      {/* ── Medications Section ── */}
      {activeTab === 'meds' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <form onSubmit={handleMedSubmit} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Log Current Medication</div>
            <input
              placeholder="Medication Name (e.g. Metformin) *"
              value={newMed.name} onChange={(e) => setNewMed(prev => ({ ...prev, name: e.target.value }))}
              className="glass-input" style={{ fontSize: 11 }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input
                placeholder="Dosage (e.g. 500mg)"
                value={newMed.dosage} onChange={(e) => setNewMed(prev => ({ ...prev, dosage: e.target.value }))}
                className="glass-input" style={{ fontSize: 11 }}
              />
              <input
                placeholder="Frequency (e.g. Twice Daily)"
                value={newMed.frequency} onChange={(e) => setNewMed(prev => ({ ...prev, frequency: e.target.value }))}
                className="glass-input" style={{ fontSize: 11 }}
              />
            </div>
            <input
              placeholder="Prescribing Physician"
              value={newMed.prescribingDoctor} onChange={(e) => setNewMed(prev => ({ ...prev, prescribingDoctor: e.target.value }))}
              className="glass-input" style={{ fontSize: 11 }}
            />
            <button type="submit" style={greenBtn}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Plus size={12} /> Add Medication
              </span>
            </button>
          </form>

          <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', paddingLeft: 2 }}>Active List</div>

          {medications.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', color: '#9ca3af', fontSize: 12, padding: 24 }}>
              No active medications logged.
            </div>
          ) : (
            medications.map(med => (
              <div key={med.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#14532d' }}>{med.name}</div>
                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{med.dosage} — {med.frequency}</div>
                  {med.prescribing_doctor && (
                    <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 1 }}>Dr. {med.prescribing_doctor}</div>
                  )}
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#16a34a', background: '#d1fae5', border: '1px solid #a7f3d0', padding: '3px 8px', borderRadius: 20 }}>
                  Active
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Documents & OCR Section ── */}
      {activeTab === 'docs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <form onSubmit={handleUploadSubmit} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Upload Health File (OCR)
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <select
                value={uploadState.docType}
                onChange={(e) => setUploadState(prev => ({ ...prev, docType: e.target.value }))}
                className="glass-input" style={{ fontSize: 11, padding: '8px 10px', flex: '0 0 auto', width: 'auto' }}
              >
                <option value="Prescription">Prescription</option>
                <option value="Lab Report">Lab Report</option>
                <option value="Scan">Scan/X-ray</option>
              </select>

              <input
                type="file"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="phr-file-upload"
                accept="image/*,application/pdf"
              />
              <label
                htmlFor="phr-file-upload"
                style={{
                  flex: 1,
                  background: '#f8fffe',
                  border: '1.5px dashed rgba(22,163,74,0.40)',
                  borderRadius: 10,
                  padding: '8px 10px',
                  fontSize: 10,
                  color: '#6b7280',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  fontWeight: 600
                }}
              >
                <Upload size={12} color="#16a34a" />
                {uploadState.file ? uploadState.file.name.substring(0, 18) + (uploadState.file.name.length > 18 ? '...' : '') : 'Select Report / Image'}
              </label>
            </div>

            {uploadState.error && (
              <div style={{ fontSize: 10, color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 10px' }}>
                ❌ {uploadState.error}
              </div>
            )}
            {uploadState.success && (
              <div style={{ fontSize: 10, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '6px 10px' }}>
                ✅ {uploadState.success}
              </div>
            )}

            <button
              type="submit"
              disabled={!uploadState.file || uploadState.uploading}
              style={{ ...greenBtn, opacity: !uploadState.file || uploadState.uploading ? 0.6 : 1 }}
            >
              {uploadState.uploading ? '⏳ Extracting text (OCR)...' : '📤 Upload & Extract Text'}
            </button>
          </form>

          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              placeholder="Search reports or OCR text..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input" style={{ fontSize: 11, paddingLeft: 28 }}
            />
          </div>

          {/* Document list */}
          {filteredDocs.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', color: '#9ca3af', fontSize: 12, padding: 24 }}>
              No health documents uploaded yet.
            </div>
          ) : (
            filteredDocs.map(doc => (
              <div key={doc.id} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={14} color="#16a34a" />
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#14532d' }}>{doc.file_name}</div>
                      <div style={{ fontSize: 9, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}>
                        <Calendar size={8} /> {new Date(doc.uploaded_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#16a34a', border: '1px solid rgba(22,163,74,0.25)', padding: '2px 7px', borderRadius: 20, background: 'rgba(22,163,74,0.06)', textTransform: 'uppercase' }}>
                    {doc.doc_type}
                  </span>
                </div>

                {/* OCR Extraction Output */}
                <button
                  onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 700, color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
                >
                  <Eye size={10} />
                  {expandedDoc === doc.id ? 'Hide OCR text' : 'Show OCR text results'}
                </button>
                {expandedDoc === doc.id && (
                  <div style={{
                    padding: '8px 10px',
                    background: '#0a1a0e',
                    border: '1px solid rgba(22,163,74,0.15)',
                    borderRadius: 8,
                    fontSize: 9,
                    color: '#86efac',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.6,
                    maxHeight: 140,
                    overflowY: 'auto'
                  }}>
                    {doc.ocr_text || 'OCR process empty or pending text...'}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
