import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';

// ── Column mapping from Excel header → lead field ─────────────────────────────

const HEADER_MAP = {
  'unternehmensname': 'company_name',
  'firma':            'company_name',
  'company':          'company_name',
  'branche':          'branch',
  'industrie':        'branch',
  'stadt':            'city',
  'ort':              'city',
  'notizen':          'notes',
  'notiz':            'notes',
  'kontaktperson':    'contact_person',
  'ansprechpartner':  'contact_person',
  'kontakt':          'contact_person',
  'e-mail':           'email',
  'email':            'email',
  'mail':             'email',
  'telefonnummer':    'phone',
  'telefon':          'phone',
  'tel':              'phone',
  'deal status':      'status',
  'dealstatus':       'status',
  'status':           'status',
  'priorität':        'priority',
  'prioritaet':       'priority',
  'prio':             'priority',
  'fällig':           'next_followup_date',
  'fälligkeitsdatum': 'next_followup_date',
  'nächstes kontaktdatum': 'next_followup_date',
  'website status':   'website_status',
  'websitestatus':    'website_status',
  'domain':           'domain',
  'website':          'domain',
};

const STATUS_MAP = {
  'verloren':          'verloren',
  'anrufen':           'anrufen',
  'follow up':         'follow_up',
  'follow up 1':       'follow_up',
  'follow up 2':       'follow_up',
  'follow-up':         'follow_up',
  'follow_up':         'follow_up',
  'interessiert':      'interessiert',
  'gewonnen':          'gewonnen',
  'termin vereinbart': 'demo',
  'demo':              'demo',
  'kein interesse':    'kein_interesse',
  'kein_interesse':    'kein_interesse',
  'später':            'spaeter',
  'spaeter':           'spaeter',
  'neu':               'neu',
};

const PRIORITY_MAP = {
  'tier 1': 2, 'tier1': 2, '1': 2,
  'tier 2': 1, 'tier2': 1, '2': 1,
  'tier 3': 0, 'tier3': 0, '3': 0,
};

function normalizeStatus(raw) {
  if (!raw) return 'neu';
  return STATUS_MAP[String(raw).toLowerCase().trim()] || 'neu';
}

function normalizePriority(raw) {
  if (raw === undefined || raw === null || raw === '') return 0;
  const key = String(raw).toLowerCase().trim();
  return PRIORITY_MAP[key] ?? 0;
}

function normalizeDate(raw) {
  if (!raw) return null;
  // Excel serial number
  if (typeof raw === 'number') {
    const date = XLSX.SSF.parse_date_code(raw);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }
  // String date
  const s = String(raw).trim();
  if (!s) return null;
  // dd.mm.yyyy
  const de = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (de) return `${de[3]}-${de[2].padStart(2, '0')}-${de[1].padStart(2, '0')}`;
  // yyyy-mm-dd
  const iso = s.match(/^\d{4}-\d{2}-\d{2}/);
  if (iso) return s.slice(0, 10);
  return null;
}

function parseSheet(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (rows.length < 2) return [];

  // Map headers
  const headers = rows[0].map(h => String(h).toLowerCase().trim());
  const fieldMap = headers.map(h => HEADER_MAP[h] || null);

  const leads = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const lead = {};
    fieldMap.forEach((field, idx) => {
      if (!field) return;
      const val = row[idx];
      if (field === 'status')             lead[field] = normalizeStatus(val);
      else if (field === 'priority')      lead[field] = normalizePriority(val);
      else if (field === 'next_followup_date') lead[field] = normalizeDate(val);
      else                                lead[field] = val !== undefined && val !== '' ? String(val).trim() : null;
    });
    // Skip empty rows
    if (!lead.company_name) continue;
    leads.push(lead);
  }
  return leads;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExcelImportModal({ onClose, onImport, isImporting }) {
  const [step, setStep]         = useState('upload'); // upload | preview | done
  const [leads, setLeads]       = useState([]);
  const [result, setResult]     = useState(null);
  const [fileName, setFileName] = useState('');
  const fileRef                 = useRef();

  function handleFile(file) {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: false });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const parsed = parseSheet(sheet);
        setLeads(parsed);
        setStep('preview');
      } catch (err) {
        alert('Fehler beim Lesen der Datei: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleImport() {
    const res = await onImport(leads);
    setResult(res);
    setStep('done');
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.2)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(52,199,89,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileSpreadsheet size={17} color="#34C759" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1D1D1F' }}>Excel Import</div>
              <div style={{ fontSize: 11.5, color: '#86868B' }}>Leads aus Tabelle importieren</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#86868B', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>

          {/* STEP: upload */}
          {step === 'upload' && (
            <div>
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#0071E3'; }}
                onDragLeave={e => { e.currentTarget.style.borderColor = '#E5E5EA'; }}
                onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#E5E5EA'; handleFile(e.dataTransfer.files[0]); }}
                style={{
                  border: '2px dashed #E5E5EA', borderRadius: 14, padding: '48px 24px',
                  textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#0071E3'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#E5E5EA'}
              >
                <Upload size={32} color="#AEAEB2" style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1D1D1F', marginBottom: 4 }}>
                  Excel-Datei hierher ziehen
                </div>
                <div style={{ fontSize: 13, color: '#86868B', marginBottom: 16 }}>oder klicken zum Auswählen (.xlsx, .xls)</div>
                <div style={{ display: 'inline-block', padding: '8px 20px', borderRadius: 10, background: 'rgba(0,113,227,0.1)', color: '#0071E3', fontSize: 13, fontWeight: 600 }}>
                  Datei wählen
                </div>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />

              <div style={{ marginTop: 20, padding: '14px 16px', background: '#F5F5F7', borderRadius: 12 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1D1D1F', marginBottom: 8 }}>Erwartete Spalten</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['Unternehmensname', 'Branche', 'Stadt', 'Kontaktperson', 'E-Mail', 'Telefonnummer', 'Deal Status', 'Priorität', 'Nächstes Kontaktdatum', 'Website Status', 'Domain', 'Notizen'].map(c => (
                    <span key={c} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: '#E5E5EA', color: '#636366' }}>{c}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP: preview */}
          {step === 'preview' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <CheckCircle2 size={16} color="#34C759" />
                <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1D1D1F' }}>
                  {leads.length} Leads gefunden in <span style={{ color: '#0071E3' }}>{fileName}</span>
                </span>
              </div>

              {/* Preview table */}
              <div style={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ overflowX: 'auto', maxHeight: 300, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#F5F5F7', position: 'sticky', top: 0 }}>
                        {['Unternehmen', 'Branche', 'Stadt', 'Telefon', 'Status', 'Priorität'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#86868B', fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {leads.slice(0, 50).map((l, i) => (
                        <tr key={i} style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1D1D1F', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.company_name}</td>
                          <td style={{ padding: '8px 12px', color: '#86868B' }}>{l.branch || '—'}</td>
                          <td style={{ padding: '8px 12px', color: '#86868B' }}>{l.city || '—'}</td>
                          <td style={{ padding: '8px 12px', color: '#86868B' }}>{l.phone || '—'}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{ fontSize: 10.5, padding: '2px 6px', borderRadius: 99, background: 'rgba(0,113,227,0.1)', color: '#0071E3', fontWeight: 600 }}>{l.status}</span>
                          </td>
                          <td style={{ padding: '8px 12px', color: '#86868B' }}>{['Normal', 'Hoch', 'Dringend'][l.priority ?? 0]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {leads.length > 50 && (
                  <div style={{ padding: '8px 12px', background: '#F5F5F7', fontSize: 12, color: '#86868B', textAlign: 'center' }}>
                    + {leads.length - 50} weitere Zeilen
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: 'rgba(255,149,0,0.08)', borderRadius: 10, marginBottom: 4 }}>
                <AlertCircle size={14} color="#FF9500" />
                <span style={{ fontSize: 12.5, color: '#B35A00' }}>
                  Duplikate (gleicher Unternehmensname) werden automatisch übersprungen.
                </span>
              </div>
            </div>
          )}

          {/* STEP: done */}
          {step === 'done' && result && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ width: 60, height: 60, borderRadius: 99, background: 'rgba(52,199,89,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle2 size={28} color="#34C759" />
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1D1D1F', marginBottom: 6 }}>Import abgeschlossen</div>
              <div style={{ fontSize: 14, color: '#86868B' }}>
                <span style={{ fontWeight: 700, color: '#34C759', fontSize: 18 }}>{result.imported}</span> Leads importiert
                {result.skipped > 0 && <span>, {result.skipped} übersprungen (Duplikate)</span>}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          {step === 'done' ? (
            <button
              onClick={onClose}
              style={{ padding: '10px 24px', borderRadius: 10, fontSize: 14, fontWeight: 600, background: '#0071E3', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              Fertig
            </button>
          ) : (
            <>
              <button
                onClick={step === 'preview' ? () => setStep('upload') : onClose}
                style={{ padding: '10px 18px', borderRadius: 10, fontSize: 13.5, fontWeight: 600, background: 'rgba(0,0,0,0.05)', color: '#636366', border: 'none', cursor: 'pointer' }}
              >
                {step === 'preview' ? 'Zurück' : 'Abbrechen'}
              </button>
              {step === 'preview' && (
                <button
                  onClick={handleImport}
                  disabled={isImporting || leads.length === 0}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10,
                    fontSize: 13.5, fontWeight: 600,
                    background: leads.length > 0 ? '#0071E3' : '#E5E5EA',
                    color: leads.length > 0 ? '#fff' : '#AEAEB2', border: 'none',
                    cursor: leads.length > 0 ? 'pointer' : 'not-allowed', opacity: isImporting ? 0.7 : 1,
                  }}
                >
                  {isImporting ? 'Importieren...' : `${leads.length} Leads importieren`}
                  {!isImporting && <ChevronRight size={15} />}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
