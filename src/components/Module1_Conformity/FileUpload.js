import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import ComplianceChecker from './ComplianceChecker';

/* ══════════════════════════════════════════════
   STYLES
══════════════════════════════════════════════ */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
  @keyframes fu-up   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fu-spin { to{transform:rotate(360deg)} }
  @keyframes fu-pulse{ 0%,100%{opacity:.4;transform:scale(1)} 50%{opacity:1;transform:scale(1.06)} }
  @keyframes fu-scan {
    0%   { top:-4px; opacity:.8 }
    100% { top:100%; opacity:0 }
  }
  .fu-root * { box-sizing:border-box; margin:0; padding:0; }
  .fu-root { font-family:'DM Sans',sans-serif; }
  .fu-zone {
    border:2px dashed rgba(99,210,190,.3);
    border-radius:16px;
    padding:40px 30px;
    text-align:center;
    background:rgba(99,210,190,.03);
    transition:border-color .25s, background .25s;
    cursor:pointer;
  }
  .fu-zone:hover { border-color:rgba(99,210,190,.6); background:rgba(99,210,190,.06); }
  .fu-zone.has-file { border-color:rgba(99,210,190,.5); border-style:solid; }
  .fu-btn {
    padding:12px 28px; border-radius:12px; border:none;
    font-family:'DM Sans',sans-serif; font-weight:700; font-size:14px;
    cursor:pointer; transition:all .2s; letter-spacing:.3px;
    display:inline-flex; align-items:center; gap:8px;
  }
  .fu-btn:disabled { opacity:.4; cursor:not-allowed; transform:none !important; }
  .fu-btn-primary { background:linear-gradient(135deg,#2dd4bf,#0d9488); color:#fff; }
  .fu-btn-primary:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 20px rgba(45,212,191,.3); }
  .fu-btn-secondary { background:rgba(99,210,190,.1); color:#63d2be; border:1px solid rgba(99,210,190,.25); }
  .fu-btn-secondary:hover:not(:disabled) { background:rgba(99,210,190,.18); }
  .fu-anim { animation:fu-up .5s ease both; }
`;

function injectCSS() {
  if (document.getElementById('fu-css')) return;
  const s = document.createElement('style');
  s.id = 'fu-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

injectCSS();

const TEAL  = '#63d2be';
const GREEN = '#4ade80';
const RED   = '#f87171';

export default function FileUpload() {
  const navigate = useNavigate();

  const [file,             setFile]             = useState(null);
  const [uploadStatus,     setUploadStatus]     = useState('');
  const [uploading,        setUploading]        = useState(false);
  const [showChecker,      setShowChecker]      = useState(false);
  const [validationDone,   setValidationDone]   = useState(false);
  const [complianceScore,  setComplianceScore]  = useState(null);
  const [dragOver,         setDragOver]         = useState(false);

  const userStr = localStorage.getItem('user');
  const user    = userStr ? JSON.parse(userStr) : null;

  /* ── FILE SELECTION ── */
  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setShowChecker(false);
    setValidationDone(false);
    setUploadStatus('');
    setComplianceScore(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setShowChecker(false); setValidationDone(false); setUploadStatus(''); }
  };

  /* ── COMPLIANCE RESULT CALLBACK ── */
  const handleComplianceResult = (results) => {
    const score = results?.global?.score || 0;
    setComplianceScore(score);
    setValidationDone(true);
  };

  /* ── UPLOAD REPORT ── */
  const handleUpload = async () => {
    if (!file) { setUploadStatus('Veuillez sélectionner un fichier'); return; }
    if (!validationDone) { setUploadStatus('Veuillez d\'abord vérifier la conformité du fichier'); return; }

    setUploading(true);
    setUploadStatus('Envoi du rapport...');

    try {
      // Build organism info from user profile
      const organismName   = user?.company_name || 'Organisme inconnu';
      const organismSector = user?.sector        || 'Non défini';
      const isCompliant    = (complianceScore || 0) >= 75;

      const response = await API.post('/reports/upload', {
        filename:         file.name,
        compliance_score: complianceScore || 0,
        is_compliant:     isCompliant,
        organism_name:    organismName,
        organism_sector:  organismSector,
        extracted_data: {
          company: {
            name:   organismName,
            sector: organismSector,
          },
          file_name:        file.name,
          compliance_score: complianceScore,
          submitted_at:     new Date().toISOString(),
        },
      });

      localStorage.setItem('extractedData', JSON.stringify(response.data.report));
      setUploadStatus('✅ Rapport soumis avec succès !');

    } catch (err) {
      console.error('Erreur upload:', err);
      const msg = err.response?.data?.error || err.message;
      setUploadStatus(`❌ Erreur: ${msg}`);
    } finally {
      setUploading(false);
    }
  };

  const goToAnalysis = () => navigate('/client/dashboard?tab=analyse');

  /* ── RENDER ── */
  return (
    <div className="fu-root fu-anim" style={{ padding: '24px', maxWidth: 760, margin: '0 auto' }}>

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: '#d4e8ff', marginBottom: 4 }}>
          Module 1 — Vérification de conformité
        </h2>
        <p style={{ fontSize: 13, color: '#3d607a' }}>
          Déposez votre rapport d'audit SSI pour vérification et soumission à l'ANCS
        </p>
      </div>

      {/* ── DROP ZONE ── */}
      <div
        className={`fu-zone${file ? ' has-file' : ''}${dragOver ? ' has-file' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{ marginBottom: 20 }}
      >
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileChange}
          disabled={uploading}
          style={{ display: 'none' }}
          id="fu-input"
        />
        <label htmlFor="fu-input" style={{ cursor: 'pointer', display: 'block' }}>
          {file ? (
            <div>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: TEAL, marginBottom: 4 }}>
                {file.name}
              </div>
              <div style={{ fontSize: 11, color: '#3d607a' }}>
                {(file.size / 1024).toFixed(1)} Ko · Cliquer pour changer
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 40, marginBottom: 12, opacity: .5 }}>📁</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#4a6a88', marginBottom: 6 }}>
                Glissez votre fichier ici ou cliquez pour parcourir
              </div>
              <div style={{ fontSize: 12, color: '#2a4a62' }}>PDF ou DOCX acceptés</div>
            </div>
          )}
        </label>
      </div>

      {/* ── ACTIONS ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          className="fu-btn fu-btn-secondary"
          onClick={() => setShowChecker(true)}
          disabled={!file || uploading || validationDone}
        >
          🔍 Vérifier la conformité
        </button>

        <button
          className="fu-btn fu-btn-primary"
          onClick={handleUpload}
          disabled={!file || uploading || !validationDone}
        >
          {uploading
            ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'fu-spin 1s linear infinite' }} />Envoi...</>
            : <>📤 Soumettre à l'ANCS</>
          }
        </button>
      </div>

      {/* ── STATUS MESSAGE ── */}
      {uploadStatus && (
        <div style={{
          padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 600,
          background: uploadStatus.includes('✅') ? 'rgba(74,222,128,.08)' : uploadStatus.includes('❌') ? 'rgba(248,113,113,.08)' : 'rgba(255,255,255,.04)',
          border: `1px solid ${uploadStatus.includes('✅') ? 'rgba(74,222,128,.25)' : uploadStatus.includes('❌') ? 'rgba(248,113,113,.25)' : 'rgba(255,255,255,.08)'}`,
          color: uploadStatus.includes('✅') ? GREEN : uploadStatus.includes('❌') ? RED : '#94a3b8',
        }}>
          {uploadStatus}
        </div>
      )}

      {/* ── COMPLIANCE CHECKER ── */}
      {showChecker && file && !validationDone && (
        <ComplianceChecker file={file} onComplianceResult={handleComplianceResult} />
      )}

      {/* ── SUCCESS STATE ── */}
      {validationDone && (
        <div style={{
          background: complianceScore >= 75 ? 'rgba(74,222,128,.06)' : 'rgba(248,113,113,.06)',
          border: `1px solid ${complianceScore >= 75 ? 'rgba(74,222,128,.2)' : 'rgba(248,113,113,.2)'}`,
          borderRadius: 14, padding: '18px 20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 800, color: complianceScore >= 75 ? GREEN : RED, marginBottom: 3 }}>
                {complianceScore >= 75 ? '✅ Rapport conforme' : '❌ Rapport non conforme'}
              </div>
              <div style={{ fontSize: 12, color: '#3d607a' }}>
                {complianceScore >= 75
                  ? 'Vous pouvez soumettre le rapport à l\'ANCS.'
                  : 'Corrigez les annexes non conformes avant de soumettre.'}
              </div>
            </div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 28, fontWeight: 900, color: complianceScore >= 75 ? GREEN : RED }}>
              {complianceScore}%
            </div>
          </div>

          {uploadStatus.includes('✅') && (
            <button className="fu-btn fu-btn-primary" onClick={goToAnalysis} style={{ marginTop: 4 }}>
              📊 Voir les données extraites
            </button>
          )}
        </div>
      )}

    </div>
  );
}