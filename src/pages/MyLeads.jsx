import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, Search, Plus, X, ChevronDown, MapPin, Mail, Globe,
  MousePointerClick, CalendarDays, Building2, CheckCircle2, PhoneCall, Camera, Inbox,
} from 'lucide-react';
import { partnerApi } from '../api/partner';

const D = {
  bg: '#0D0D12', text: '#F2F2F7', text2: '#AEAEB2', text3: '#636366',
  inputBg: 'rgba(255,255,255,0.04)',
  blue: '#5B8CF5', blueL: 'rgba(91,140,245,0.12)',
  green: '#34D399', greenL: 'rgba(52,211,153,0.12)',
  orange: '#FF9F0A', orangeL: 'rgba(255,159,10,0.12)',
  red: '#FF453A', redL: 'rgba(255,69,58,0.12)',
  purple: '#BF5AF2', purpleL: 'rgba(191,90,242,0.12)',
  border: 'rgba(255,255,255,0.06)',
  borderSubtle: 'rgba(255,255,255,0.04)',
};

const glass = {
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  background: 'rgba(255,255,255,0.025)',
  border: `1px solid ${D.border}`,
  borderRadius: 20,
};

const glassCard = {
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  background: 'rgba(255,255,255,0.02)',
  border: `1px solid ${D.border}`,
  borderRadius: 14,
};

const STATUSES = ['anrufen', 'kontaktiert', 'termin_gesetzt', 'gewonnen', 'verloren'];
const STATUS_LABEL = {
  anrufen: 'Anrufen', kontaktiert: 'Kontaktiert',
  termin_gesetzt: 'Termin gesetzt', gewonnen: 'Gewonnen', verloren: 'Verloren',
};
const STATUS_COLOR = {
  anrufen: D.blue, kontaktiert: D.orange,
  termin_gesetzt: D.purple, gewonnen: D.green, verloren: D.red,
};
const STATUS_BG = {
  anrufen: D.blueL, kontaktiert: D.orangeL,
  termin_gesetzt: D.purpleL, gewonnen: D.greenL, verloren: D.redL,
};

const OUTCOME_CFG = {
  reached:     { label: 'Erreicht',       color: '#34D399', bg: 'rgba(52,211,153,0.08)' },
  not_reached: { label: 'Nicht erreicht', color: D.text3,   bg: 'rgba(142,142,147,0.10)' },
  voicemail:   { label: 'Mailbox',        color: D.orange,  bg: D.orangeL },
  callback:    { label: 'Rückruf',        color: D.blue,    bg: D.blueL },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: i => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' } }),
};

function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) +
    ', ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
}

const modalBackdrop = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' };
const modalBox = {
  position: 'relative',
  backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
  background: 'rgba(22,22,30,0.95)',
  border: `1px solid ${D.border}`,
  borderRadius: 20,
  boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
};

// ── Screenshot Import Modal ───────────────────────────────────────────────────

function ScreenshotImportModal({ onClose, onCreate }) {
  const [preview, setPreview] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [extracted, setExtracted] = useState(null);
  const fileRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setImageData(ev.target.result); setPreview(ev.target.result); setExtracted(null); setError(''); };
    reader.readAsDataURL(file);
  }

  async function handleAnalyze() {
    if (!imageData) return;
    setLoading(true); setError('');
    try { setExtracted(await partnerApi.screenshotImport(imageData)); }
    catch (err) { setError(err.response?.data?.error || 'Analyse fehlgeschlagen'); }
    finally { setLoading(false); }
  }

  const f = (k, v) => setExtracted(p => ({ ...p, [k]: v }));

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={modalBackdrop} />
      <motion.div initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }}
        style={{ ...modalBox, padding: 26, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', margin: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: D.text, margin: 0 }}>Maps Screenshot importieren</h2>
            <p style={{ fontSize: 12, color: D.text3, margin: '4px 0 0' }}>Gemini AI extrahiert automatisch die Firmendaten</p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 99, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.04)', color: D.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>

        <div onClick={() => fileRef.current?.click()} style={{
          border: `1.5px dashed ${preview ? D.blue : D.border}`, borderRadius: 14,
          padding: preview ? 0 : '32px 0', cursor: 'pointer', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 14, background: preview ? 'none' : 'rgba(255,255,255,0.02)', transition: 'border-color 0.2s',
        }}>
          {preview ? (
            <img src={preview} alt="Screenshot" style={{ width: '100%', maxHeight: 260, objectFit: 'contain', display: 'block' }} />
          ) : (
            <div style={{ textAlign: 'center' }}>
              <Camera size={32} color={D.text3} style={{ display: 'block', margin: '0 auto 10px' }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: D.text2, margin: '0 0 4px' }}>Screenshot auswählen</p>
              <p style={{ fontSize: 11.5, color: D.text3, margin: 0 }}>PNG, JPG · Google Maps Screenshot</p>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: D.redL, border: `1px solid rgba(255,69,58,0.2)`, marginBottom: 14 }}>
            <p style={{ fontSize: 13, color: D.red, margin: 0 }}>{error}</p>
          </div>
        )}

        {preview && !extracted && (
          <button onClick={handleAnalyze} disabled={loading} style={{
            width: '100%', padding: '11px', borderRadius: 11, border: 'none',
            background: `linear-gradient(135deg, ${D.blue}, #7B9FF5)`,
            color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: 14, fontWeight: 700, marginBottom: 14, opacity: loading ? 0.7 : 1,
            boxShadow: '0 4px 20px rgba(91,140,245,0.3)',
          }}>
            {loading ? 'Analysiere...' : 'Daten extrahieren'}
          </button>
        )}

        {extracted && (
          <>
            <div style={{ fontSize: 11, fontWeight: 800, color: D.green, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              ✓ Erkannte Daten — bitte prüfen
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[
                { k: 'company', l: 'Firma *' }, { k: 'contact_person', l: 'Ansprechpartner' },
                { k: 'phone', l: 'Telefon' }, { k: 'email', l: 'E-Mail' },
                { k: 'industry', l: 'Branche' }, { k: 'city', l: 'Stadt' },
                { k: 'website', l: 'Website' }, { k: 'address', l: 'Adresse' },
              ].map(({ k, l }) => (
                <div key={k}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: D.text2, display: 'block', marginBottom: 4 }}>{l}</label>
                  <input value={extracted[k] || ''} onChange={e => f(k, e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 8, fontSize: 13, border: `1px solid ${extracted[k] ? D.blue + '60' : D.border}`, outline: 'none', boxSizing: 'border-box', background: D.inputBg, color: D.text }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setExtracted(null); setPreview(null); setImageData(null); }}
                style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${D.border}`, background: 'none', color: D.text2, cursor: 'pointer', fontSize: 13 }}>Neu</button>
              <button onClick={() => { onCreate(extracted); onClose(); }} disabled={!extracted.company}
                style={{ flex: 2, padding: 10, borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${D.green}, #22D37A)`, color: '#000', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                Lead anlegen
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>, document.body
  );
}

// ── Create / Edit Lead Modal ──────────────────────────────────────────────────

function LeadModal({ lead, onClose, onSave }) {
  const [form, setForm] = useState(lead || {
    company: '', contact_person: '', phone: '', email: '',
    website: '', city: '', industry: '', deal_value: '', notes: '',
  });
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const inp = (k, label, type = 'text') => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: D.text2 }}>{label}</label>
      <input value={form[k] || ''} onChange={e => f(k, e.target.value)} type={type}
        style={{ background: D.inputBg, border: `1px solid ${D.border}`, borderRadius: 9, padding: '9px 12px', fontSize: 14, color: D.text, outline: 'none' }} />
    </div>
  );
  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={modalBackdrop} />
      <motion.div initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }}
        style={{ ...modalBox, padding: 26, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', margin: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: D.text, margin: 0 }}>
            {lead ? 'Lead bearbeiten' : 'Eigenen Lead anlegen'}
          </h2>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 99, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.04)', color: D.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {inp('company', 'Firma *')} {inp('contact_person', 'Ansprechpartner')}
          {inp('phone', 'Telefon')} {inp('email', 'E-Mail', 'email')}
          {inp('website', 'Website')} {inp('city', 'Stadt')}
          {inp('industry', 'Branche')} {inp('deal_value', 'Deal-Wert (€)', 'number')}
        </div>
        <div style={{ marginTop: 10 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: D.text2 }}>Notizen</label>
          <textarea value={form.notes || ''} onChange={e => f('notes', e.target.value)} rows={3}
            style={{ width: '100%', marginTop: 5, background: D.inputBg, border: `1px solid ${D.border}`, borderRadius: 9, padding: '9px 12px', fontSize: 14, color: D.text, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 18, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 9, border: `1px solid ${D.border}`, background: 'none', color: D.text2, cursor: 'pointer', fontSize: 13 }}>Abbrechen</button>
          <button onClick={() => onSave(form)} style={{ padding: '8px 18px', borderRadius: 9, border: 'none', background: `linear-gradient(135deg, ${D.blue}, #7B9FF5)`, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(91,140,245,0.3)' }}>Speichern</button>
        </div>
      </motion.div>
    </motion.div>, document.body
  );
}

// ── Call Log Sheet ────────────────────────────────────────────────────────────

function CallLogSheet({ lead, onClose }) {
  const qc = useQueryClient();
  const [outcome, setOutcome] = useState('reached');
  const [notes, setNotes] = useState('');
  const [newStatus, setNewStatus] = useState(lead.status);
  const log = useMutation({
    mutationFn: () => partnerApi.addCallLog(lead.id, { outcome, notes, new_status: newStatus }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-leads'] }); qc.invalidateQueries({ queryKey: ['lead-calls', lead.id] }); onClose(); },
  });
  const OUTCOMES = [
    { v: 'reached', l: 'Erreicht' }, { v: 'not_reached', l: 'Nicht erreicht' },
    { v: 'voicemail', l: 'Mailbox' }, { v: 'callback', l: 'Rückruf' },
  ];
  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={onClose} style={modalBackdrop} />
      <motion.div initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
        style={{ ...modalBox, borderRadius: '24px 24px 0 0', padding: 24, width: '100%', maxWidth: 520 }}>
        <div style={{ width: 36, height: 4, background: D.border, borderRadius: 2, margin: '0 auto 20px' }} />
        <h3 style={{ fontSize: 16, fontWeight: 700, color: D.text, margin: '0 0 4px' }}>Anruf eintragen</h3>
        <p style={{ fontSize: 13, color: D.text3, margin: '0 0 18px' }}>{lead.company}</p>
        <p style={{ fontSize: 12, fontWeight: 600, color: D.text2, margin: '0 0 8px' }}>Ergebnis</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {OUTCOMES.map(o => (
            <button key={o.v} onClick={() => setOutcome(o.v)} style={{
              padding: 9, borderRadius: 10, fontSize: 13, cursor: 'pointer',
              fontWeight: outcome === o.v ? 600 : 400,
              border: `1px solid ${outcome === o.v ? D.blue : D.border}`,
              background: outcome === o.v ? D.blueL : 'rgba(255,255,255,0.02)',
              color: outcome === o.v ? D.blue : D.text2, transition: 'all 0.15s',
            }}>{o.l}</button>
          ))}
        </div>
        <p style={{ fontSize: 12, fontWeight: 600, color: D.text2, margin: '0 0 8px' }}>Status setzen</p>
        <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
          style={{ width: '100%', padding: '9px 12px', background: D.inputBg, border: `1px solid ${D.border}`, borderRadius: 9, color: D.text, fontSize: 14, marginBottom: 14, outline: 'none' }}>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notizen (optional)" rows={2}
          style={{ width: '100%', background: D.inputBg, border: `1px solid ${D.border}`, borderRadius: 9, padding: '9px 12px', fontSize: 14, color: D.text, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 16 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${D.border}`, background: 'none', color: D.text2, cursor: 'pointer', fontSize: 14 }}>Abbrechen</button>
          <button onClick={() => log.mutate()} disabled={log.isPending} style={{
            flex: 2, padding: 10, borderRadius: 10, border: 'none',
            background: `linear-gradient(135deg, ${D.blue}, #7B9FF5)`,
            color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700,
            boxShadow: '0 4px 16px rgba(91,140,245,0.3)',
          }}>
            {log.isPending ? 'Speichern...' : 'Eintragen'}
          </button>
        </div>
      </motion.div>
    </motion.div>, document.body
  );
}

// ── Appointment Modal ─────────────────────────────────────────────────────────

function AppointmentModal({ lead, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ lead_id: lead.id, scheduled_at: '', industry: lead.industry || '', demo_goal: '', google_meet_link: '' });
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const create = useMutation({
    mutationFn: () => partnerApi.createAppointment(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-leads'] }); qc.invalidateQueries({ queryKey: ['my-appts'] }); onClose(); },
  });
  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={modalBackdrop} />
      <motion.div initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }}
        style={{ ...modalBox, padding: 26, width: '100%', maxWidth: 440, margin: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: D.text, margin: 0 }}>Termin setzen</h2>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 99, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.04)', color: D.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>
        <p style={{ fontSize: 13, color: D.text3, margin: '0 0 16px' }}>{lead.company}</p>
        {[
          { k: 'scheduled_at', l: 'Datum & Uhrzeit', t: 'datetime-local' },
          { k: 'industry', l: 'Branche', t: 'text' },
          { k: 'google_meet_link', l: 'Google Meet Link (optional)', t: 'url' },
        ].map(({ k, l, t }) => (
          <div key={k} style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: D.text2, display: 'block', marginBottom: 5 }}>{l}</label>
            <input type={t} value={form[k] || ''} onChange={e => f(k, e.target.value)}
              style={{ width: '100%', background: D.inputBg, border: `1px solid ${D.border}`, borderRadius: 9, padding: '9px 12px', fontSize: 14, color: D.text, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        ))}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: D.text2, display: 'block', marginBottom: 5 }}>Demo-Ziel</label>
          <textarea value={form.demo_goal} onChange={e => f('demo_goal', e.target.value)} rows={2}
            placeholder="Was soll der Interessent nach dem Demo sagen/entscheiden?"
            style={{ width: '100%', background: D.inputBg, border: `1px solid ${D.border}`, borderRadius: 9, padding: '9px 12px', fontSize: 14, color: D.text, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${D.border}`, background: 'none', color: D.text2, cursor: 'pointer', fontSize: 14 }}>Abbrechen</button>
          <button onClick={() => create.mutate()} disabled={create.isPending} style={{
            flex: 2, padding: 10, borderRadius: 10, border: 'none',
            background: `linear-gradient(135deg, ${D.purple}, #D070FF)`,
            color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700,
            boxShadow: '0 4px 16px rgba(191,90,242,0.3)',
          }}>
            {create.isPending ? 'Speichern...' : 'Termin eintragen'}
          </button>
        </div>
      </motion.div>
    </motion.div>, document.body
  );
}

// ── Lead Row ──────────────────────────────────────────────────────────────────

function LeadRow({ lead, isSelected, onClick, onCall, index }) {
  const [hovered, setHovered] = useState(false);
  const sc = STATUS_COLOR[lead.status] || D.blue;
  const sb = STATUS_BG[lead.status] || D.blueL;
  return (
    <motion.div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px',
        borderBottom: `1px solid ${D.borderSubtle}`, cursor: 'pointer',
        background: isSelected ? 'rgba(91,140,245,0.08)' : hovered ? 'rgba(255,255,255,0.025)' : 'transparent',
        borderLeft: isSelected ? `3px solid ${D.blue}` : '3px solid transparent',
        transition: 'background 0.15s',
      }}
    >
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: sc, flexShrink: 0, boxShadow: `0 0 6px ${sc}80` }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: D.text, letterSpacing: '-0.1px', marginBottom: 3 }}>
          {lead.company}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ padding: '1px 6px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: sb, color: sc, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {STATUS_LABEL[lead.status]}
          </span>
          {(lead.contact_person || lead.city) && (
            <span style={{ fontSize: 10.5, color: D.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {[lead.contact_person, lead.city].filter(Boolean).join(' · ')}
            </span>
          )}
        </div>
      </div>
      {lead.deal_value && (
        <div style={{ fontSize: 11, fontWeight: 700, color: D.green, flexShrink: 0 }}>
          {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(lead.deal_value)}
        </div>
      )}
      <button
        onClick={e => { e.stopPropagation(); onCall(lead); }}
        disabled={!lead.phone}
        style={{
          width: 30, height: 30, borderRadius: 8, border: 'none', flexShrink: 0,
          background: lead.phone ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.03)',
          color: lead.phone ? '#34D399' : D.text3,
          cursor: lead.phone ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s',
        }}
      >
        <Phone size={13} />
      </button>
    </motion.div>
  );
}

// ── Empty Detail ──────────────────────────────────────────────────────────────

function EmptyDetail() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ ...glass, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
      <MousePointerClick size={36} strokeWidth={1.5} color={D.text3} />
      <div style={{ fontSize: 14, fontWeight: 600, color: D.text2 }}>Lead auswählen</div>
      <div style={{ fontSize: 12.5, color: D.text3 }}>Klicke einen Lead in der Liste an</div>
    </motion.div>
  );
}

// ── Lead Request Modal ────────────────────────────────────────────────────────

function LeadRequestModal({ onClose }) {
  const qc = useQueryClient();
  const [industry, setIndustry] = useState('');
  const [quantity, setQuantity] = useState(5);
  const [message, setMessage]   = useState('');
  const [success, setSuccess]   = useState(false);

  const submit = useMutation({
    mutationFn: () => partnerApi.createLeadRequest({ industry, quantity, message }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead-requests'] });
      setSuccess(true);
    },
  });

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={modalBackdrop} />
      <motion.div initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }}
        style={{ ...modalBox, padding: 28, width: '100%', maxWidth: 460, margin: 16 }}>

        {success ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle2 size={26} color={D.green} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: D.text, margin: '0 0 8px' }}>Anfrage gesendet!</h3>
            <p style={{ fontSize: 13, color: D.text3, margin: '0 0 24px', lineHeight: 1.5 }}>
              Wir wurden benachrichtigt und melden uns bei dir sobald Leads verfügbar sind.
            </p>
            <button onClick={onClose} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${D.green}, #22D37A)`, color: '#000', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              Schließen
            </button>
          </motion.div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: D.text, margin: '0 0 4px' }}>Leads anfragen</h2>
                <p style={{ fontSize: 12, color: D.text3, margin: 0 }}>Wir weisen dir passende Leads aus unserem Pool zu</p>
              </div>
              <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 99, border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.04)', color: D.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: D.text2, display: 'block', marginBottom: 6 }}>Branche *</label>
                <input
                  value={industry} onChange={e => setIndustry(e.target.value)}
                  placeholder="z.B. Gastronomie, Handwerk, Industrie..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 14, border: `1px solid ${industry ? D.blue + '60' : D.border}`, outline: 'none', boxSizing: 'border-box', background: D.inputBg, color: D.text, fontFamily: 'inherit', transition: 'border-color 0.15s' }}
                  onFocus={e => e.target.style.borderColor = D.blue}
                  onBlur={e => e.target.style.borderColor = industry ? D.blue + '60' : D.border}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: D.text2, display: 'block', marginBottom: 6 }}>
                  Anzahl gewünschter Leads: <span style={{ color: D.purple, fontWeight: 700 }}>{quantity}</span>
                </label>
                <input
                  type="range" min={1} max={50} step={1} value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                  style={{ width: '100%', accentColor: D.purple, cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: D.text3, marginTop: 4 }}>
                  <span>1</span><span>25</span><span>50</span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: D.text2, display: 'block', marginBottom: 6 }}>Nachricht (optional)</label>
                <textarea
                  value={message} onChange={e => setMessage(e.target.value)}
                  placeholder="z.B. bevorzugte Region, Unternehmensgröße, spezifische Anforderungen..."
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, border: `1px solid ${D.border}`, outline: 'none', boxSizing: 'border-box', background: D.inputBg, color: D.text, resize: 'none', fontFamily: 'inherit', lineHeight: 1.5 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${D.border}`, background: 'none', color: D.text2, cursor: 'pointer', fontSize: 13 }}>Abbrechen</button>
              <button
                onClick={() => submit.mutate()}
                disabled={!industry.trim() || submit.isPending}
                style={{
                  flex: 2, padding: 10, borderRadius: 10, border: 'none', cursor: industry.trim() ? 'pointer' : 'not-allowed',
                  background: industry.trim() ? `linear-gradient(135deg, ${D.purple}, #D070FF)` : 'rgba(255,255,255,0.05)',
                  color: industry.trim() ? '#fff' : D.text3, fontSize: 13, fontWeight: 600,
                  boxShadow: industry.trim() ? '0 4px 16px rgba(191,90,242,0.3)' : 'none',
                  opacity: submit.isPending ? 0.7 : 1,
                }}
              >
                {submit.isPending ? 'Senden...' : 'Anfrage senden'}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>, document.body
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function MyLeads() {
  const qc = useQueryClient();
  const [tab, setTab]                       = useState('alle');
  const [search, setSearch]                 = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [showAddLead, setShowAddLead]         = useState(false);
  const [showScreenshot, setShowScreenshot]   = useState(false);
  const [showLeadRequest, setShowLeadRequest] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [callLogLead, setCallLogLead]       = useState(null);
  const [apptLead, setApptLead]             = useState(null);
  const [notes, setNotes]                   = useState('');
  const prevLeadIdRef                       = useRef(null);

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['my-leads'], queryFn: partnerApi.listLeads, refetchInterval: 30000,
  });

  const selectedLead = useMemo(() => leads.find(l => l.id === selectedLeadId) || null, [leads, selectedLeadId]);

  const { data: leadCalls = [] } = useQuery({
    queryKey: ['lead-calls', selectedLeadId],
    queryFn: () => partnerApi.getCallLog(selectedLeadId),
    enabled: !!selectedLeadId,
  });

  useEffect(() => {
    if (selectedLead && selectedLead.id !== prevLeadIdRef.current) {
      setNotes(selectedLead.notes || '');
      prevLeadIdRef.current = selectedLead.id;
      setShowStatusMenu(false);
    }
  }, [selectedLead]);

  const createLead = useMutation({
    mutationFn: d => partnerApi.createLead(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-leads'] }); setShowAddLead(false); },
  });
  const updateLead = useMutation({
    mutationFn: ({ id, data }) => partnerApi.updateLead(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-leads'] }),
  });

  const filteredLeads = useMemo(() => {
    let list = tab === 'alle' ? leads : leads.filter(l => l.status === tab);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(l => (l.company || '').toLowerCase().includes(q) || (l.contact_person || '').toLowerCase().includes(q) || (l.city || '').toLowerCase().includes(q));
    }
    return list;
  }, [leads, tab, search]);

  const counts = useMemo(() => {
    const c = { alle: leads.length };
    STATUSES.forEach(s => { c[s] = leads.filter(l => l.status === s).length; });
    return c;
  }, [leads]);

  function handleCall(lead) {
    if (lead.phone) window.open('tel:' + lead.phone, '_self');
    setCallLogLead(lead);
  }
  function handleNotesBlur() {
    if (selectedLead && notes !== (selectedLead.notes || '')) updateLead.mutate({ id: selectedLeadId, data: { notes } });
  }
  function handleStatusChange(status) {
    updateLead.mutate({ id: selectedLeadId, data: { status } });
    setShowStatusMenu(false);
  }

  const TABS = [{ key: 'alle', label: 'Alle' }, ...STATUSES.map(s => ({ key: s, label: STATUS_LABEL[s] }))];

  const KPI_CARDS = [
    { label: 'Gesamt',          value: counts.alle,           color: D.blue,   glow: 'rgba(91,140,245,0.15)',   icon: PhoneCall },
    { label: 'Zu anrufen',      value: counts.anrufen,        color: D.orange, glow: 'rgba(255,159,10,0.15)',   icon: Phone },
    { label: 'Termine gesetzt', value: counts.termin_gesetzt, color: D.purple, glow: 'rgba(191,90,242,0.15)',   icon: CalendarDays },
    { label: 'Gewonnen',        value: counts.gewonnen,       color: D.green,  glow: 'rgba(52,211,153,0.15)',   icon: CheckCircle2 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px 28px 20px', boxSizing: 'border-box', gap: 16, overflow: 'hidden', position: 'relative' }}>

      {/* ambient glows */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-5%', left: '30%', width: 400, height: 400, background: 'rgba(91,140,245,0.06)', borderRadius: '50%', filter: 'blur(100px)' }} />
        <div style={{ position: 'absolute', bottom: '5%', right: '15%', width: 350, height: 350, background: 'rgba(191,90,242,0.05)', borderRadius: '50%', filter: 'blur(90px)' }} />
      </div>

      {/* ── Top bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, position: 'relative', zIndex: 1 }}>

        {/* Title */}
        <motion.div style={{ width: 360, flexShrink: 0 }} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 4px' }}>
            Vertrieb
          </p>
          <h1 style={{
            margin: '0 0 2px', fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.5) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>Meine Leads</h1>
          <p style={{ margin: 0, fontSize: 11.5, color: 'rgba(255,255,255,0.3)' }}>
            {counts.anrufen} zu anrufen · {counts.termin_gesetzt} Termine · {counts.gewonnen} gewonnen
          </p>
        </motion.div>

        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(110px, 170px))', gap: 10, flex: 1 }}>
          {KPI_CARDS.map(({ label, value, color, glow, icon: Icon }, i) => (
            <motion.div key={label} custom={i} variants={cardVariants} initial="hidden" animate="show"
              style={{ ...glass, padding: '12px 14px', boxShadow: `0 0 30px ${glow}`, display: 'flex', alignItems: 'center', gap: 10 }}
              whileHover={{ y: -2, boxShadow: `0 6px 30px ${glow}`, transition: { duration: 0.2 } }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${color}30` }}>
                <Icon size={15} color={color} />
              </div>
              <div>
                <div style={{
                  fontSize: 22, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.04em',
                  background: `linear-gradient(135deg, ${color} 0%, ${color}80 100%)`,
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>{value}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Action buttons */}
        <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 250, flexShrink: 0, alignItems: 'flex-end' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setShowLeadRequest(true)} style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8,
              fontSize: 11, fontWeight: 600, background: D.purpleL, color: D.purple,
              border: `1px solid rgba(191,90,242,0.2)`, cursor: 'pointer',
            }}>
              <Inbox size={12} /> Leads anfragen
            </button>
            <button onClick={() => setShowScreenshot(true)} style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8,
              fontSize: 11, fontWeight: 600, background: D.orangeL, color: D.orange,
              border: `1px solid rgba(255,159,10,0.2)`, cursor: 'pointer', lineHeight: 1,
            }}>
              <Camera size={12} /> Screenshot
            </button>
          </div>
          <button onClick={() => setShowAddLead(true)} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '7px 18px', borderRadius: 10,
            fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg, ${D.blue}, #7B9FF5)`,
            color: '#fff', boxShadow: '0 4px 16px rgba(91,140,245,0.3)',
          }}>
            <Plus size={14} /> Lead hinzufügen
          </button>
        </motion.div>
      </div>

      {/* ── 3-Panel Grid ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '360px 1fr 250px', gap: 12, position: 'relative', zIndex: 1 }}>

        {/* ════ LEFT: Lead List ════ */}
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15, duration: 0.4 }}
          style={{ ...glass, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Tabs + Search */}
          <div style={{ padding: '12px 14px 0', borderBottom: `1px solid ${D.borderSubtle}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 10 }}>
              {TABS.map(tb => {
                const isActive = tab === tb.key;
                return (
                  <button key={tb.key} onClick={() => { setTab(tb.key); setSelectedLeadId(null); }} style={{
                    padding: '5px 9px', fontSize: 12, fontWeight: isActive ? 600 : 400,
                    color: isActive ? D.text : D.text2, background: 'none', border: 'none',
                    borderBottom: isActive ? `2px solid ${D.blue}` : '2px solid transparent',
                    cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color 0.15s', flexShrink: 0,
                  }}>
                    {tb.label}
                    {counts[tb.key] > 0 && (
                      <span style={{ marginLeft: 4, fontSize: 10, color: isActive ? D.blue : D.text3 }}>{counts[tb.key]}</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <Search size={13} color={D.text3} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Suchen..."
                style={{ width: '100%', padding: '7px 9px 7px 28px', borderRadius: 8, fontSize: 12.5, border: `1px solid ${D.border}`, outline: 'none', boxSizing: 'border-box', background: D.inputBg, color: D.text }} />
            </div>
          </div>
          <div style={{ padding: '4px 14px', fontSize: 11, color: D.text3, flexShrink: 0, borderBottom: `1px solid ${D.borderSubtle}` }}>
            {leadsLoading ? 'Laden...' : `${filteredLeads.length} Lead${filteredLeads.length !== 1 ? 's' : ''}`}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {!leadsLoading && filteredLeads.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>📭</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: D.text }}>Keine Leads</div>
                <div style={{ fontSize: 12, color: D.text2, marginTop: 2 }}>Lege deinen ersten Lead an</div>
              </div>
            ) : filteredLeads.map((lead, i) => (
              <LeadRow key={lead.id} lead={lead} index={i}
                isSelected={lead.id === selectedLeadId}
                onClick={() => setSelectedLeadId(lead.id === selectedLeadId ? null : lead.id)}
                onCall={handleCall}
              />
            ))}
          </div>
        </motion.div>

        {/* ════ CENTER: Lead Detail ════ */}
        <AnimatePresence mode="wait">
          {!selectedLead ? (
            <EmptyDetail key="empty" />
          ) : (
            <motion.div key={selectedLead.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ ...glass, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              {/* Detail header */}
              <div style={{ padding: '16px 20px 14px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: D.text, letterSpacing: '-0.4px', marginBottom: 6 }}>
                      {selectedLead.company}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      {selectedLead.contact_person && <span style={{ fontSize: 12, color: D.text3 }}>{selectedLead.contact_person}</span>}
                      {selectedLead.city && <span style={{ fontSize: 12, color: D.text2, display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={11} />{selectedLead.city}</span>}
                      {selectedLead.phone && <a href={`tel:${selectedLead.phone}`} style={{ fontSize: 12, color: D.blue, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}><Phone size={11} />{selectedLead.phone}</a>}
                      {selectedLead.email && <a href={`mailto:${selectedLead.email}`} style={{ fontSize: 12, color: D.blue, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}><Mail size={11} />{selectedLead.email}</a>}
                      {selectedLead.website && <a href={selectedLead.website.startsWith('http') ? selectedLead.website : `https://${selectedLead.website}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: D.blue, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}><Globe size={11} />Website</a>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                    <button onClick={() => setApptLead(selectedLead)} style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 8,
                      fontSize: 11.5, fontWeight: 600, background: D.purpleL, color: D.purple,
                      border: `1px solid rgba(191,90,242,0.2)`, cursor: 'pointer',
                    }}>
                      <CalendarDays size={12} /> Termin
                    </button>
                    <button onClick={() => handleCall(selectedLead)} disabled={!selectedLead.phone} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9,
                      fontSize: 13, fontWeight: 600, border: 'none', cursor: selectedLead.phone ? 'pointer' : 'not-allowed',
                      background: selectedLead.phone ? `linear-gradient(135deg, ${D.green}, #22D37A)` : 'rgba(255,255,255,0.05)',
                      color: selectedLead.phone ? '#000' : D.text3,
                      boxShadow: selectedLead.phone ? '0 4px 16px rgba(52,211,153,0.3)' : 'none',
                    }}>
                      <Phone size={13} /> Anrufen
                    </button>
                  </div>
                </div>

                {/* Status row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative' }}>
                    <button onClick={() => setShowStatusMenu(v => !v)} style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99,
                      fontSize: 11.5, fontWeight: 600, cursor: 'pointer', border: 'none',
                      background: STATUS_BG[selectedLead.status] || D.blueL,
                      color: STATUS_COLOR[selectedLead.status] || D.blue,
                    }}>
                      {STATUS_LABEL[selectedLead.status]} <ChevronDown size={11} />
                    </button>
                    <AnimatePresence>
                      {showStatusMenu && (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                          style={{ position: 'absolute', left: 0, top: '100%', marginTop: 4, ...modalBox, padding: 5, minWidth: 160, zIndex: 50 }}>
                          {STATUSES.map(s => (
                            <button key={s} onClick={() => handleStatusChange(s)} style={{
                              display: 'block', width: '100%', padding: '7px 10px', fontSize: 12.5, fontWeight: 500,
                              color: selectedLead.status === s ? STATUS_COLOR[s] : D.text,
                              background: selectedLead.status === s ? STATUS_BG[s] : 'none',
                              border: 'none', borderRadius: 7, cursor: 'pointer', textAlign: 'left',
                            }}>{STATUS_LABEL[s]}</button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  {selectedLead.industry && <span style={{ fontSize: 11.5, color: D.text2, display: 'flex', alignItems: 'center', gap: 4 }}><Building2 size={11} />{selectedLead.industry}</span>}
                  {selectedLead.deal_value && (
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: D.green }}>
                      {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(selectedLead.deal_value)}
                    </span>
                  )}
                </div>
              </div>

              {/* Detail body */}
              <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 260px', overflow: 'hidden' }}>
                <div style={{ overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14, borderRight: `1px solid ${D.borderSubtle}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Notizen</div>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={handleNotesBlur}
                      placeholder="Notizen zum Lead..."
                      style={{ width: '100%', minHeight: 120, padding: '10px 12px', borderRadius: 10, fontSize: 13, border: `1px solid ${D.border}`, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.5, color: D.text, background: D.inputBg }}
                      onFocus={e => { e.target.style.borderColor = D.blue; }}
                      onBlurCapture={e => { e.target.style.borderColor = D.border; }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Details</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[
                        { k: 'contact_person', l: 'Kontaktperson', placeholder: 'Max Mustermann' },
                        { k: 'phone', l: 'Telefon', placeholder: '0711 123456' },
                        { k: 'email', l: 'E-Mail', placeholder: 'info@firma.de' },
                        { k: 'city', l: 'Stadt', placeholder: 'Stuttgart' },
                        { k: 'industry', l: 'Branche', placeholder: 'z.B. Handwerk' },
                        { k: 'website', l: 'Website', placeholder: 'firma.de' },
                      ].map(({ k, l, placeholder }) => (
                        <div key={k}>
                          <label style={{ fontSize: 11, fontWeight: 600, color: D.text3, display: 'block', marginBottom: 4 }}>{l}</label>
                          <input key={`${k}-${selectedLeadId}`} defaultValue={selectedLead[k] || ''}
                            onBlur={e => { if (e.target.value !== (selectedLead[k] || '')) updateLead.mutate({ id: selectedLeadId, data: { [k]: e.target.value } }); }}
                            placeholder={placeholder}
                            style={{ width: '100%', padding: '7px 8px', borderRadius: 8, fontSize: 12.5, border: `1px solid ${D.border}`, outline: 'none', boxSizing: 'border-box', background: D.inputBg, color: D.text }} />
                        </div>
                      ))}
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: D.text3, display: 'block', marginBottom: 4 }}>Deal-Wert (€)</label>
                        <input type="number" min={0} step={100} key={`dv-${selectedLeadId}`} defaultValue={selectedLead.deal_value || ''}
                          onBlur={e => { const v = parseFloat(e.target.value) || null; if (v !== selectedLead.deal_value) updateLead.mutate({ id: selectedLeadId, data: { deal_value: v } }); }}
                          placeholder="0"
                          style={{ width: '100%', padding: '7px 8px', borderRadius: 8, fontSize: 12.5, border: `1px solid ${D.border}`, outline: 'none', boxSizing: 'border-box', background: D.inputBg, color: D.text }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Call history */}
                <div style={{ overflowY: 'auto', padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Anrufe</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: D.text2, background: 'rgba(255,255,255,0.06)', padding: '2px 7px', borderRadius: 99 }}>{leadCalls.length}</span>
                  </div>
                  {leadCalls.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '28px 0', color: D.text3 }}>
                      <Phone size={22} strokeWidth={1.5} style={{ display: 'block', margin: '0 auto 8px' }} />
                      <div style={{ fontSize: 12.5 }}>Noch keine Anrufe</div>
                    </div>
                  ) : leadCalls.map(call => {
                    const o = OUTCOME_CFG[call.outcome] || OUTCOME_CFG.not_reached;
                    return (
                      <div key={call.id} style={{ padding: '10px 0', borderBottom: `1px solid ${D.borderSubtle}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: D.text }}>{fmtDateTime(call.called_at)}</span>
                          <span style={{ padding: '2px 6px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: o.bg, color: o.color }}>{o.label}</span>
                        </div>
                        {call.notes && <div style={{ fontSize: 11.5, color: D.text3, lineHeight: 1.4 }}>{call.notes}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ════ RIGHT: Pipeline ════ */}
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.4 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>

          <div style={{ ...glass, padding: '16px 18px', flexShrink: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 16, letterSpacing: '-0.01em' }}>
              Pipeline Übersicht
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {STATUSES.map((s, i) => {
                const cnt = counts[s] || 0;
                const pct = leads.length ? (cnt / leads.length) * 100 : 0;
                const sc = STATUS_COLOR[s];
                return (
                  <motion.div key={s} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.05 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{STATUS_LABEL[s]}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: sc }}>{cnt}</span>
                    </div>
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
                      <motion.div style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${sc}, ${sc}80)` }}
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.4 + i * 0.05, duration: 0.6, ease: 'easeOut' }} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div style={{ ...glass, padding: 16, flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>
              {selectedLead ? `Anrufe · ${selectedLead.company}` : 'Letzte Anrufe'}
            </div>
            {!selectedLead ? (
              <div style={{ fontSize: 12.5, color: D.text3, textAlign: 'center', padding: '20px 0' }}>Lead auswählen</div>
            ) : leadCalls.length === 0 ? (
              <div style={{ fontSize: 12.5, color: D.text3, textAlign: 'center', padding: '20px 0' }}>Noch keine Anrufe</div>
            ) : leadCalls.slice(0, 8).map(call => {
              const o = OUTCOME_CFG[call.outcome] || OUTCOME_CFG.not_reached;
              return (
                <div key={call.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${D.borderSubtle}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: D.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fmtDateTime(call.called_at)}</div>
                    {call.notes && <div style={{ fontSize: 10.5, color: D.text3 }}>{call.notes}</div>}
                  </div>
                  <span style={{ padding: '2px 6px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: o.bg, color: o.color, flexShrink: 0 }}>{o.label}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showLeadRequest && <LeadRequestModal onClose={() => setShowLeadRequest(false)} />}
        {showScreenshot && <ScreenshotImportModal onClose={() => setShowScreenshot(false)} onCreate={data => createLead.mutate(data)} />}
        {showAddLead && <LeadModal onClose={() => setShowAddLead(false)} onSave={data => createLead.mutate(data)} />}
        {callLogLead && <CallLogSheet lead={callLogLead} onClose={() => setCallLogLead(null)} />}
        {apptLead && <AppointmentModal lead={apptLead} onClose={() => setApptLead(null)} />}
      </AnimatePresence>
    </div>
  );
}
