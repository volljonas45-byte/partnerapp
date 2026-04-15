import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, CheckCircle2, X, Loader2, AlertCircle, Edit3 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const FIELD_LABELS = {
  company_name:    'Firmenname',
  contact_person:  'Kontaktperson',
  phone:           'Telefon',
  email:           'E-Mail',
  branch:          'Branche',
  city:            'Stadt',
  domain:          'Domain',
  website_status:  'Website-Status',
  address:         'Adresse',
};

export default function ScreenshotImportModal({ onClose, onCreate, isCreating }) {
  const { c } = useTheme();
  const fileRef = useRef(null);

  const [step, setStep] = useState('upload'); // upload | analyzing | preview | error
  const [preview, setPreview] = useState(null); // base64 image
  const [extracted, setExtracted] = useState(null); // parsed data
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  // ── Image handling ──────────────────────────────────────────────────────

  const processFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Bitte ein Bild auswählen (PNG, JPG, etc.)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Bild zu groß (max. 10 MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result;
      setPreview(base64);
      setStep('analyzing');
      setError(null);

      try {
        const { salesApi } = await import('../../api/sales');
        const result = await salesApi.analyzeScreenshot(base64);
        setExtracted(result);
        setStep('preview');
      } catch (err) {
        const msg = err.response?.data?.error || 'Fehler bei der Analyse';
        setError(msg);
        setStep('error');
      }
    };
    reader.readAsDataURL(file);
  }, []);

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) processFile(file);
  }

  function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        processFile(item.getAsFile());
        break;
      }
    }
  }

  function handleFieldChange(key, value) {
    setExtracted(prev => ({ ...prev, [key]: value || null }));
  }

  function handleCreate() {
    if (!extracted?.company_name) return;
    const lead = {
      company_name:   extracted.company_name,
      contact_person: extracted.contact_person || '',
      phone:          extracted.phone || '',
      email:          extracted.email || '',
      branch:         extracted.branch || '',
      city:           extracted.city || '',
      domain:         extracted.domain || '',
      website_status: extracted.website_status || null,
      address:        extracted.address || '',
      status:         'neu',
    };
    onCreate(lead);
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        onPaste={handlePaste}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(6px)', zIndex: 200,
        }}
      />

      {/* Modal */}
      <div
        onPaste={handlePaste}
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '95%', maxWidth: 520,
          background: c.card, borderRadius: 16,
          boxShadow: c.shadowLg, zIndex: 201,
          display: 'flex', flexDirection: 'column',
          maxHeight: '90vh', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: `1px solid ${c.borderSubtle}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'rgba(0,122,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Camera size={16} color="#007AFF" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: c.text, letterSpacing: '-0.2px' }}>
                Screenshot Import
              </div>
              <div style={{ fontSize: 11.5, color: c.textSecondary }}>
                Google Maps Screenshot → Lead
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 99, border: 'none',
            background: c.inputBg, color: c.textSecondary, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>

          {/* ── Step: Upload ── */}
          {step === 'upload' && (
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragOver ? c.blue : c.border}`,
                borderRadius: 14, padding: '40px 24px', textAlign: 'center',
                cursor: 'pointer', transition: 'all 0.2s',
                background: dragOver ? `${c.blue}08` : c.cardSecondary,
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 14, margin: '0 auto 14px',
                background: 'rgba(0,122,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Upload size={22} color="#007AFF" />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: c.text, marginBottom: 6 }}>
                Screenshot hochladen
              </div>
              <div style={{ fontSize: 12.5, color: c.textSecondary, lineHeight: 1.5 }}>
                Ziehe einen Google Maps Screenshot hierher,<br />
                klicke zum Auswählen oder füge ihn mit <strong>Strg+V</strong> ein
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) processFile(e.target.files[0]); }}
              />
            </div>
          )}

          {/* ── Step: Analyzing ── */}
          {step === 'analyzing' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              {preview && (
                <img src={preview} alt="Screenshot" style={{
                  width: '100%', maxHeight: 180, objectFit: 'contain',
                  borderRadius: 10, marginBottom: 16, border: `1px solid ${c.borderSubtle}`,
                }} />
              )}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '14px 0',
              }}>
                <Loader2 size={18} color={c.blue} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: c.text }}>
                  Wird analysiert...
                </span>
              </div>
              <div style={{ fontSize: 12, color: c.textSecondary }}>
                Firmendaten werden aus dem Screenshot extrahiert
              </div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* ── Step: Error ── */}
          {step === 'error' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              {preview && (
                <img src={preview} alt="Screenshot" style={{
                  width: '100%', maxHeight: 140, objectFit: 'contain',
                  borderRadius: 10, marginBottom: 16, border: `1px solid ${c.borderSubtle}`,
                  opacity: 0.6,
                }} />
              )}
              <div style={{
                width: 40, height: 40, borderRadius: 12, margin: '0 auto 12px',
                background: 'rgba(255,59,48,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AlertCircle size={20} color="#FF3B30" />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: c.text, marginBottom: 4 }}>
                Analyse fehlgeschlagen
              </div>
              <div style={{ fontSize: 12.5, color: c.textSecondary, marginBottom: 16 }}>
                {error}
              </div>
              <button
                onClick={() => { setStep('upload'); setPreview(null); setError(null); }}
                style={{
                  padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                  background: c.blue, color: '#fff', border: 'none', cursor: 'pointer',
                }}
              >
                Nochmal versuchen
              </button>
            </div>
          )}

          {/* ── Step: Preview ── */}
          {step === 'preview' && extracted && (
            <div>
              {/* Thumbnail */}
              {preview && (
                <img src={preview} alt="Screenshot" style={{
                  width: '100%', maxHeight: 120, objectFit: 'contain',
                  borderRadius: 10, marginBottom: 16, border: `1px solid ${c.borderSubtle}`,
                }} />
              )}

              {/* Success banner */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                borderRadius: 10, marginBottom: 16,
                background: 'rgba(52,199,89,0.08)', border: '1px solid rgba(52,199,89,0.2)',
              }}>
                <CheckCircle2 size={15} color="#34C759" />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1A8F40' }}>
                  Daten erfolgreich erkannt
                </span>
                <span style={{ fontSize: 11, color: c.textSecondary, marginLeft: 'auto' }}>
                  <Edit3 size={10} style={{ marginRight: 3 }} />
                  Felder anpassbar
                </span>
              </div>

              {/* Editable fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(FIELD_LABELS).map(([key, label]) => {
                  const val = extracted[key];
                  if (val === null && key !== 'company_name' && key !== 'phone') return null;
                  return (
                    <div key={key}>
                      <label style={{
                        fontSize: 11, fontWeight: 600, color: c.textTertiary,
                        display: 'block', marginBottom: 3,
                      }}>
                        {label} {key === 'company_name' && '*'}
                      </label>
                      <input
                        value={val || ''}
                        onChange={e => handleFieldChange(key, e.target.value)}
                        placeholder={label}
                        style={{
                          width: '100%', padding: '8px 10px', borderRadius: 8,
                          fontSize: 13, border: `1.5px solid ${c.border}`, outline: 'none',
                          boxSizing: 'border-box', background: c.cardSecondary, color: c.text,
                          fontWeight: key === 'company_name' ? 600 : 400,
                        }}
                        onFocus={e => { e.target.style.borderColor = c.blue; }}
                        onBlur={e => { e.target.style.borderColor = c.border; }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'preview' && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', gap: 10,
            padding: '14px 20px', borderTop: `1px solid ${c.borderSubtle}`,
          }}>
            <button
              onClick={() => { setStep('upload'); setPreview(null); setExtracted(null); }}
              style={{
                padding: '9px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                background: c.inputBg, color: c.textSecondary, border: 'none', cursor: 'pointer',
              }}
            >
              Neuer Screenshot
            </button>
            <button
              onClick={handleCreate}
              disabled={!extracted?.company_name || isCreating}
              style={{
                padding: '9px 20px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                background: extracted?.company_name ? '#34C759' : c.border,
                color: '#fff', border: 'none',
                cursor: extracted?.company_name ? 'pointer' : 'not-allowed',
                opacity: isCreating ? 0.6 : 1,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <CheckCircle2 size={14} />
              {isCreating ? 'Wird erstellt...' : 'Lead erstellen'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
