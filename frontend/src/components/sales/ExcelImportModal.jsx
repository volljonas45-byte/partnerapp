import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ChevronRight, Layers } from 'lucide-react';

// ── Column mapping from Excel header → lead field ─────────────────────────────

const HEADER_MAP = {
  // Unternehmensname (+ typo variant from HubSpot template)
  'unternehmensname':    'company_name',
  'unternehemnsname':    'company_name',   // typo in HubSpot template
  'unternehmesname':     'company_name',
  'firma':               'company_name',
  'company':             'company_name',
  'company name':        'company_name',
  'unternehmen':         'company_name',

  'branche':             'branch',
  'industrie':           'branch',
  'industry':            'branch',

  'stadt':               'city',
  'ort':                 'city',
  'city':                'city',

  'notizen':             'notes',
  'notiz':               'notes',
  'notes':               'notes',

  'kontaktperson':       'contact_person',
  'ansprechpartner':     'contact_person',
  'kontakt':             'contact_person',
  'first name':          'contact_person',
  'vorname':             'contact_person',

  'e-mail':              'email',
  'email':               'email',
  'mail':                'email',
  'e-mail-adresse':      'email',

  'telefonnummer':       'phone',
  'telefon':             'phone',
  'tel':                 'phone',
  'phone':               'phone',
  'phone number':        'phone',

  'deal status':         'status',
  'dealstatus':          'status',
  'status':              'status',

  'priorität':           'priority',
  'prioritaet':          'priority',
  'priority':            'priority',
  'prio':                'priority',

  'fällig':              'next_followup_date',
  'fälligkeitsdatum':    'next_followup_date',
  'nächstes kontaktdatum': 'next_followup_date',
  'next contact date':   'next_followup_date',
  'follow-up date':      'next_followup_date',

  'website status':      'website_status',
  'websitestatus':       'website_status',

  'domain':              'domain',
  'website':             'domain',
};

const STATUS_MAP = {
  'verloren':            'verloren',
  'anrufen':             'anrufen',
  'follow up':           'follow_up',
  'follow up 1':         'follow_up',
  'follow up 2':         'follow_up',
  'follow-up':           'follow_up',
  'follow_up':           'follow_up',
  'interessiert':        'interessiert',
  'gewonnen':            'gewonnen',
  'won':                 'gewonnen',
  'termin vereinbart':   'demo',
  'demo':                'demo',
  'kein interesse':      'kein_interesse',
  'kein_interesse':      'kein_interesse',
  'not interested':      'kein_interesse',
  'später':              'spaeter',
  'spaeter':             'spaeter',
  'neu':                 'neu',
  'new':                 'neu',
};

const PRIORITY_MAP = {
  'tier 1': 2, 'tier1': 2, '1': 2, 'hoch': 1, 'dringend': 2,
  'tier 2': 1, 'tier2': 1, '2': 1, 'mittel': 1,
  'tier 3': 0, 'tier3': 0, '3': 0, 'normal': 0, 'niedrig': 0,
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
  const s = String(raw).trim();
  if (!s || s === '-' || s.toLowerCase() === 'überfällig') return null;
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

  const headers = rows[0].map(h => String(h).toLowerCase().trim());
  const fieldMap = headers.map(h => HEADER_MAP[h] || null);

  const leads = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const lead = {};
    fieldMap.forEach((field, idx) => {
      if (!field) return;
      const val = row[idx];
      if (field === 'status')                  lead[field] = normalizeStatus(val);
      else if (field === 'priority')           lead[field] = normalizePriority(val);
      else if (field === 'next_followup_date') lead[field] = normalizeDate(val);
      else                                     lead[field] = val !== undefined && val !== '' ? String(val).trim() : null;
    });
    if (!lead.company_name) continue;
    leads.push(lead);
  }
  return leads;
}

// ── Sheet label helper ─────────────────────────────────────────────────────────
const SHEET_COLORS = [
  { bg: 'rgba(0,122,255,0.1)',  text: 'var(--color-blue)' },
  { bg: 'rgba(52,199,89,0.1)', text: '#1A8F40' },
  { bg: 'rgba(255,149,0,0.1)', text: '#B35A00' },
  { bg: 'rgba(175,82,222,0.1)','text': '#7B2D9E' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExcelImportModal({ onClose, onImport, isImporting }) {
  const [step, setStep]               = useState('upload'); // upload | sheets | preview | done
  const [sheetNames, setSheetNames]   = useState([]);
  const [selectedSheets, setSelected] = useState([]);
  const [workbook, setWorkbook]       = useState(null);
  const [leads, setLeads]             = useState([]);
  const [result, setResult]           = useState(null);
  const [fileName, setFileName]       = useState('');
  const fileRef                       = useRef();

  function handleFile(file) {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: false });
        setWorkbook(wb);
        if (wb.SheetNames.length === 1) {
          // Only one sheet → parse directly
          const parsed = parseSheet(wb.Sheets[wb.SheetNames[0]]);
          setLeads(parsed);
          setStep('preview');
        } else {
          // Multiple sheets → let user choose
          setSheetNames(wb.SheetNames);
          setSelected(wb.SheetNames); // all selected by default
          setStep('sheets');
        }
      } catch (err) {
        alert('Fehler beim Lesen der Datei: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleSheetConfirm() {
    const all = [];
    selectedSheets.forEach(name => {
      const sheet = workbook.Sheets[name];
      if (sheet) all.push(...parseSheet(sheet));
    });
    // Deduplicate by company_name (case-insensitive) within the parsed batch
    const seen = new Set();
    const deduped = all.filter(l => {
      const key = l.company_name.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    setLeads(deduped);
    setStep('preview');
  }

  function toggleSheet(name) {
    setSelected(prev =>
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    );
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
        style={{ background: 'var(--color-card)', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.2)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--color-border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(52,199,89,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileSpreadsheet size={17} color="#34C759" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>Excel Import</div>
              <div style={{ fontSize: 11.5, color: 'var(--color-text-secondary)' }}>Leads aus Tabelle importieren</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4 }}>
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
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--color-blue)'; }}
                onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--color-border)'; handleFile(e.dataTransfer.files[0]); }}
                style={{
                  border: '2px dashed #E5E5EA', borderRadius: 14, padding: '48px 24px',
                  textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-blue)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
              >
                <Upload size={32} color="#AEAEB2" style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>
                  Excel-Datei hierher ziehen
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>oder klicken zum Auswählen (.xlsx, .xls)</div>
                <div style={{ display: 'inline-block', padding: '8px 20px', borderRadius: 10, background: 'rgba(0,122,255,0.1)', color: 'var(--color-blue)', fontSize: 13, fontWeight: 600 }}>
                  Datei wählen
                </div>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />

              <div style={{ marginTop: 20, padding: '14px 16px', background: '#F5F5F7', borderRadius: 12 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>Erkannte Spalten</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['Unternehmensname', 'Branche', 'Stadt', 'Kontaktperson', 'E-Mail', 'Telefonnummer', 'Deal Status', 'Priorität', 'Nächstes Kontaktdatum', 'Website Status', 'Domain', 'Notizen'].map(c => (
                    <span key={c} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'var(--color-border)', color: 'var(--color-text-tertiary)' }}>{c}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP: sheets — multi-sheet selector */}
          {step === 'sheets' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Layers size={16} color="#007AFF" />
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-text)' }}>
                  {sheetNames.length} Blätter in <span style={{ color: 'var(--color-blue)' }}>{fileName}</span>
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                Wähle welche Blätter importiert werden sollen:
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sheetNames.map((name, idx) => {
                  const color = SHEET_COLORS[idx % SHEET_COLORS.length];
                  const sheetLeads = workbook ? parseSheet(workbook.Sheets[name]) : [];
                  const checked = selectedSheets.includes(name);
                  return (
                    <div
                      key={name}
                      onClick={() => toggleSheet(name)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                        border: `2px solid ${checked ? color.text : 'var(--color-border)'}`,
                        background: checked ? color.bg : '#fff',
                        transition: 'all 0.12s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: 6, border: `2px solid ${checked ? color.text : 'var(--color-text-tertiary)'}`,
                          background: checked ? color.text : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          {checked && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{name}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                            {sheetLeads.length} Leads gefunden
                          </div>
                        </div>
                      </div>
                      <span style={{
                        fontSize: 11.5, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
                        background: color.bg, color: color.text,
                      }}>
                        {sheetLeads.length}
                      </span>
                    </div>
                  );
                })}
              </div>

              {selectedSheets.length === 0 && (
                <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(255,59,48,0.08)', borderRadius: 10, fontSize: 12.5, color: '#C0392B' }}>
                  Bitte mindestens ein Blatt auswählen.
                </div>
              )}
            </div>
          )}

          {/* STEP: preview */}
          {step === 'preview' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <CheckCircle2 size={16} color="#34C759" />
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-text)' }}>
                  {leads.length} Leads gefunden in <span style={{ color: 'var(--color-blue)' }}>{fileName}</span>
                </span>
              </div>

              <div style={{ border: '1px solid var(--color-border-subtle)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ overflowX: 'auto', maxHeight: 300, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#F5F5F7', position: 'sticky', top: 0 }}>
                        {['Unternehmen', 'Branche', 'Stadt', 'Telefon', 'Status', 'Priorität'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {leads.slice(0, 50).map((l, i) => (
                        <tr key={i} style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--color-text)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.company_name}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)' }}>{l.branch || '—'}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)' }}>{l.city || '—'}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)' }}>{l.phone || '—'}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{ fontSize: 10.5, padding: '2px 6px', borderRadius: 99, background: 'rgba(0,122,255,0.1)', color: 'var(--color-blue)', fontWeight: 600 }}>{l.status}</span>
                          </td>
                          <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)' }}>{['Normal', 'Hoch', 'Dringend'][l.priority ?? 0]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {leads.length > 50 && (
                  <div style={{ padding: '8px 12px', background: '#F5F5F7', fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                    + {leads.length - 50} weitere Zeilen
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: 'rgba(255,149,0,0.08)', borderRadius: 10 }}>
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
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>Import abgeschlossen</div>
              <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
                <span style={{ fontWeight: 700, color: '#34C759', fontSize: 18 }}>{result.imported}</span> Leads importiert
                {result.skipped > 0 && <span>, {result.skipped} übersprungen (Duplikate)</span>}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          {step === 'done' ? (
            <button
              onClick={onClose}
              style={{ padding: '10px 24px', borderRadius: 10, fontSize: 14, fontWeight: 600, background: 'var(--color-blue)', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              Fertig
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  if (step === 'preview') setStep(sheetNames.length > 1 ? 'sheets' : 'upload');
                  else if (step === 'sheets') setStep('upload');
                  else onClose();
                }}
                style={{ padding: '10px 18px', borderRadius: 10, fontSize: 13.5, fontWeight: 600, background: 'var(--color-border-subtle)', color: 'var(--color-text-tertiary)', border: 'none', cursor: 'pointer' }}
              >
                {step === 'upload' ? 'Abbrechen' : 'Zurück'}
              </button>

              {step === 'sheets' && (
                <button
                  onClick={handleSheetConfirm}
                  disabled={selectedSheets.length === 0}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10,
                    fontSize: 13.5, fontWeight: 600,
                    background: selectedSheets.length > 0 ? 'var(--color-blue)' : 'var(--color-border)',
                    color: selectedSheets.length > 0 ? '#fff' : 'var(--color-text-tertiary)',
                    border: 'none', cursor: selectedSheets.length > 0 ? 'pointer' : 'not-allowed',
                  }}
                >
                  Weiter <ChevronRight size={15} />
                </button>
              )}

              {step === 'preview' && (
                <button
                  onClick={handleImport}
                  disabled={isImporting || leads.length === 0}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10,
                    fontSize: 13.5, fontWeight: 600,
                    background: leads.length > 0 ? 'var(--color-blue)' : 'var(--color-border)',
                    color: leads.length > 0 ? '#fff' : 'var(--color-text-tertiary)', border: 'none',
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
