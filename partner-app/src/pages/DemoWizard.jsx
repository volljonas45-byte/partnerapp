import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, Building2, User, Mail, Globe, MapPin, Briefcase,
  Calendar, Send, CheckCircle2, ChevronRight, ChevronLeft, ArrowLeft,
  Layout, Palette, Target, Users, Star, Image, ExternalLink,
} from 'lucide-react';
import { partnerApi } from '../api/partner';

const D = {
  bg: '#0D0D12', card: '#16161E', card2: '#1C1C26',
  border: 'rgba(255,255,255,0.07)', borderFocus: 'rgba(224,122,0,0.5)',
  text: '#F2F2F7', text2: '#AEAEB2', text3: '#636366',
  accent: '#E07A00', accentL: 'rgba(224,122,0,0.12)',
  green: '#34D399', greenL: 'rgba(52,211,153,0.12)',
  purple: '#BF5AF2', purpleL: 'rgba(191,90,242,0.12)',
  orange: '#E07A00', orangeL: 'rgba(224,122,0,0.12)',
  inputBg: 'rgba(255,255,255,0.04)',
};

const glass = {
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  background: 'rgba(255,255,255,0.025)', border: `1px solid ${D.border}`, borderRadius: 20,
};

function Field({ label, icon: Icon, value, onChange, placeholder, type = 'text', required }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
        color: D.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        {Icon && <Icon size={12} />} {label} {required && <span style={{ color: D.accent }}>*</span>}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ width: '100%', boxSizing: 'border-box', background: D.inputBg,
          border: `1px solid ${focused ? D.borderFocus : D.border}`, borderRadius: 10,
          padding: '10px 14px', fontSize: 14, color: D.text, outline: 'none', transition: 'border 0.15s' }} />
    </div>
  );
}

function TextArea({ label, icon: Icon, value, onChange, placeholder, rows = 3 }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
        color: D.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        {Icon && <Icon size={12} />} {label}
      </label>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ width: '100%', boxSizing: 'border-box', background: D.inputBg,
          border: `1px solid ${focused ? D.borderFocus : D.border}`, borderRadius: 10,
          padding: '10px 14px', fontSize: 14, color: D.text,
          outline: 'none', resize: 'vertical', transition: 'border 0.15s', fontFamily: 'inherit' }} />
    </div>
  );
}

function SectionLabel({ icon: Icon, children }) {
  return (
    <p style={{ margin: '4px 0 10px', fontSize: 12, fontWeight: 700, color: D.text2,
      textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: 6 }}>
      {Icon && <Icon size={13} color={D.text3} />} {children}
    </p>
  );
}

function Chip({ label, active, onClick, color }) {
  const c = color || D.accent;
  return (
    <button onClick={onClick} style={{
      padding: '5px 13px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
      border: `1px solid ${active ? c : D.border}`,
      background: active ? `${c}20` : 'transparent',
      color: active ? c : D.text3, transition: 'all 0.15s', whiteSpace: 'nowrap',
    }}>{label}</button>
  );
}

function Toggle({ value, onChange, labelOn, labelOff }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {[{ v: true, l: labelOn || 'Ja' }, { v: false, l: labelOff || 'Nein' }].map(({ v, l }) => (
        <button key={String(v)} onClick={() => onChange(v)} style={{
          flex: 1, padding: '8px', borderRadius: 10, fontSize: 13, cursor: 'pointer',
          border: `1px solid ${value === v ? D.green : D.border}`,
          background: value === v ? D.greenL : D.card,
          color: value === v ? D.green : D.text3, fontWeight: value === v ? 600 : 400,
          transition: 'all 0.15s',
        }}>{l}</button>
      ))}
    </div>
  );
}

const INDUSTRIES = [
  'Handwerk', 'Gastronomie', 'Einzelhandel', 'Dienstleistung', 'IT / Software',
  'Gesundheit', 'Immobilien', 'Bau', 'Logistik', 'Produktion', 'Sonstiges',
];

const PAGES = [
  'Startseite', 'Über uns', 'Leistungen', 'Referenzen', 'Galerie',
  'Kontakt', 'Blog / News', 'FAQ', 'Team', 'Onlineshop', 'Karriere', 'Impressum / Datenschutz',
];


const COLOR_PRESETS = [
  { id: 'blue-white', label: 'Blau & Weiß', colors: ['#1E3A8A', '#FFFFFF'] },
  { id: 'dark-gold', label: 'Dunkel & Gold', colors: ['#111111', '#D4AF37'] },
  { id: 'green-nature', label: 'Grün & Natur', colors: ['#166534', '#F0FDF4'] },
  { id: 'red-energy', label: 'Rot & Energie', colors: ['#DC2626', '#F9FAFB'] },
  { id: 'gray-neutral', label: 'Grau & Neutral', colors: ['#374151', '#F9FAFB'] },
  { id: 'purple-modern', label: 'Lila & Modern', colors: ['#7C3AED', '#FAF5FF'] },
  { id: 'orange-warm', label: 'Orange & Warm', colors: ['#EA580C', '#FFF7ED'] },
];

const STEPS = ['Firmendaten', 'Website-Brief', 'Nächster Schritt'];

const TIME_SLOTS = Array.from({ length: 37 }, (_, i) => {
  const m = i * 15;
  const h = Math.floor(m / 60) + 9;
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
});

const MONTH_NAMES = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const DAY_NAMES   = ['Mo','Di','Mi','Do','Fr','Sa','So'];

function CalendarPicker({ selectedDate, onDateChange, selectedTime, onTimeChange }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const initMonth = selectedDate
    ? (() => { const [y,m] = selectedDate.split('-'); return new Date(+y, +m-1, 1); })()
    : new Date(today.getFullYear(), today.getMonth(), 1);
  const [viewMonth, setViewMonth] = useState(initMonth);

  const year  = viewMonth.getFullYear();
  const month = viewMonth.getMonth();

  const firstDow   = new Date(year, month, 1).getDay();
  const startOffset = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  const selObj = selectedDate
    ? (() => { const [y,m,d] = selectedDate.split('-'); return new Date(+y, +m-1, +d); })()
    : null;

  function selectDay(d) {
    if (!d || d < today) return;
    onDateChange(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
  }

  const timeRef = { current: null };

  return (
    <div style={{ display: 'flex', borderRadius: 14, overflow: 'hidden', border: `1px solid ${D.border}`, background: D.card }}>

      {/* ── Calendar ── */}
      <div style={{ flex: 1, padding: '16px 14px', minWidth: 0 }}>
        {/* Nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button onClick={() => setViewMonth(new Date(year, month-1, 1))}
            style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${D.border}`, background: 'none',
              color: D.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: D.text }}>
            {MONTH_NAMES[month]} {year}
          </span>
          <button onClick={() => setViewMonth(new Date(year, month+1, 1))}
            style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${D.border}`, background: 'none',
              color: D.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Weekday headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
          {DAY_NAMES.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: D.text3 }}>{d}</div>
          ))}
        </div>

        {/* Day grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`} />;
            const isPast    = d < today;
            const isToday   = d.getTime() === today.getTime();
            const isSel     = selObj && d.getTime() === selObj.getTime();
            return (
              <button key={d.getTime()} onClick={() => selectDay(d)} disabled={isPast} style={{
                width: '100%', aspectRatio: '1', borderRadius: 8, border: 'none',
                fontSize: 12.5, cursor: isPast ? 'not-allowed' : 'pointer',
                fontWeight: isSel ? 700 : 400,
                background: isSel ? D.purple : isToday ? `${D.accent}25` : 'transparent',
                color: isSel ? '#fff' : isPast ? D.text3 : isToday ? D.accent : D.text,
                opacity: isPast ? 0.3 : 1, transition: 'background 0.1s, color 0.1s',
              }}>{d.getDate()}</button>
            );
          })}
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{ width: 1, background: D.border, flexShrink: 0 }} />

      {/* ── Time slots ── */}
      <div style={{ width: 100, overflowY: 'auto', maxHeight: 300, padding: '10px 8px',
        display: 'flex', flexDirection: 'column', gap: 4, scrollbarWidth: 'thin' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: D.text3, textTransform: 'uppercase',
          letterSpacing: '0.06em', padding: '0 4px', marginBottom: 4, flexShrink: 0 }}>Uhrzeit</div>
        {TIME_SLOTS.map(t => {
          const isSel = selectedTime === t;
          return (
            <button key={t} onClick={() => onTimeChange(t)} style={{
              padding: '6px 0', borderRadius: 7, flexShrink: 0,
              border: `1px solid ${isSel ? D.purple : D.border}`,
              background: isSel ? D.purpleL : 'transparent',
              color: isSel ? D.purple : D.text2,
              fontSize: 12, cursor: 'pointer', fontWeight: isSel ? 700 : 400,
              transition: 'all 0.1s', textAlign: 'center',
            }}>{t}</button>
          );
        })}
      </div>
    </div>
  );
}

function buildBrief({ websiteGoal, pages, colorPreset, customColors, targetGroup, usp, hasWebsite, currentWebsite, hasLogo, inspirations }) {
  const lines = [];
  if (websiteGoal) lines.push(`🎯 Ziel: ${websiteGoal}`);
  if (pages.length) lines.push(`📄 Seiten: ${pages.join(', ')}`);
  if (colorPreset || customColors) {
    const preset = COLOR_PRESETS.find(c => c.id === colorPreset);
    lines.push(`🎨 Farben: ${[preset?.label, customColors].filter(Boolean).join(' · ')}`);
  }
  if (targetGroup) lines.push(`👥 Zielgruppe: ${targetGroup}`);
  if (usp) lines.push(`⭐ USP: ${usp}`);
  lines.push(`🌐 Website vorhanden: ${hasWebsite ? `Ja${currentWebsite ? ` (${currentWebsite})` : ''}` : 'Nein'}`);
  lines.push(`🖼 Logo vorhanden: ${hasLogo ? 'Ja' : 'Nein'}`);
  if (inspirations) lines.push(`💡 Vorbilder: ${inspirations}`);
  return lines.join('\n');
}

export default function DemoWizard() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { state } = useLocation();
  const prefilled = state?.lead || {};

  const [step, setStep] = useState(0);
  const [done, setDone] = useState(null);

  // Step 0 — Firmendaten
  const [company, setCompany]             = useState(prefilled.company || '');
  const [contactPerson, setContactPerson] = useState(prefilled.contact_person || '');
  const [phone, setPhone]                 = useState(prefilled.phone || '');
  const [email, setEmail]                 = useState(prefilled.email || '');
  const [website, setWebsite]             = useState(prefilled.website || '');
  const [city, setCity]                   = useState(prefilled.city || '');
  const [industry, setIndustry]           = useState(prefilled.industry || '');
  const [notes, setNotes]                 = useState(prefilled.notes || '');

  // Step 1 — Website-Brief
  const [websiteGoal, setWebsiteGoal]     = useState('');
  const [pages, setPages]                 = useState(['Startseite', 'Über uns', 'Leistungen', 'Kontakt', 'Impressum / Datenschutz']);

  const [colorPreset, setColorPreset]     = useState('');
  const [customColors, setCustomColors]   = useState('');
  const [targetGroup, setTargetGroup]     = useState('');
  const [usp, setUsp]                     = useState('');
  const [hasWebsite, setHasWebsite]       = useState(null);
  const [currentWebsite, setCurrentWebsite] = useState(prefilled.website || '');
  const [hasLogo, setHasLogo]             = useState(null);
  const [inspirations, setInspirations]   = useState('');

  // Step 2 — Action
  const [action, setAction]               = useState(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [demoGoal, setDemoGoal]           = useState('');
  const [demoNotes, setDemoNotes]         = useState('');

  const wizard = useMutation({
    mutationFn: (d) => partnerApi.demoWizard(d),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['my-leads'] });
      qc.invalidateQueries({ queryKey: ['my-appts'] });
      setDone(data);
      setStep(3);
    },
  });

  function togglePage(p) {
    if (p === 'Impressum / Datenschutz') return;
    setPages(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  }

  function submit() {
    const brief = buildBrief({ websiteGoal, pages, colorPreset, customColors, targetGroup, usp, hasWebsite, currentWebsite, hasLogo, inspirations });
    const combinedNotes = [notes, brief ? `\n--- Website-Brief ---\n${brief}` : ''].filter(Boolean).join('\n');

    const payload = {
      company, contact_person: contactPerson, phone, email,
      website: website || currentWebsite, city, industry,
      notes: combinedNotes, action,
    };
    if (action === 'appointment') {
      payload.scheduled_at = `${scheduledDate}T${scheduledTime}:00`;
      payload.demo_goal = demoGoal;
    }
    if (action === 'email') payload.demo_notes = demoNotes;
    wizard.mutate(payload);
  }

  function reset() {
    setStep(0); setDone(null);
    setCompany(''); setContactPerson(''); setPhone(''); setEmail('');
    setWebsite(''); setCity(''); setIndustry(''); setNotes('');
    setWebsiteGoal(''); setPages(['Startseite', 'Über uns', 'Leistungen', 'Kontakt', 'Impressum / Datenschutz']);
    setColorPreset(''); setCustomColors('');
    setTargetGroup(''); setUsp(''); setHasWebsite(null); setCurrentWebsite('');
    setHasLogo(null); setInspirations('');
    setAction(null); setScheduledDate(''); setScheduledTime('');
    setDemoGoal(''); setDemoNotes('');
  }

  const canStep0 = company.trim().length > 0;
  const canStep2 = action && (
    action === 'none' ||
    (action === 'appointment' && scheduledDate && scheduledTime) ||
    (action === 'email' && email.trim().length > 0)
  );
  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div style={{ padding: '28px 28px 40px', maxWidth: 700, margin: '0 auto', overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        {prefilled.company && (
          <button onClick={() => navigate('/leads/mine')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14,
              background: 'none', border: 'none', color: D.text3, cursor: 'pointer', fontSize: 13, padding: 0 }}>
            <ArrowLeft size={14} /> Zurück zu Meine Leads
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: D.accentL,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Phone size={18} color={D.accent} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: D.text }}>Demo-Wizard</h1>
            {prefilled.company && <p style={{ margin: 0, fontSize: 12, color: D.accent }}>Daten von: {prefilled.company}</p>}
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: D.text3 }}>
          Alle relevanten Infos für eine perfekte Demo erfassen.
        </p>
      </div>

      {/* Step indicator */}
      {step < 3 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: i < step ? D.green : i === step ? D.accent : D.card2,
                  color: i <= step ? '#fff' : D.text3,
                }}>
                  {i < step ? <CheckCircle2 size={13} /> : i + 1}
                </div>
                <span style={{ fontSize: 12, color: i === step ? D.text : D.text3, fontWeight: i === step ? 600 : 400, whiteSpace: 'nowrap' }}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: i < step ? D.green : D.border, margin: '0 10px' }} />}
            </div>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">

        {/* ── STEP 0: Firmendaten ── */}
        {step === 0 && (
          <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
            <div style={{ ...glass, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SectionLabel icon={Building2}>Unternehmensdaten</SectionLabel>

              <Field label="Firmenname" icon={Building2} value={company} onChange={setCompany} placeholder="Mustermann GmbH" required />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Ansprechpartner" icon={User} value={contactPerson} onChange={setContactPerson} placeholder="Max Mustermann" />
                <Field label="Branche" value={industry} onChange={setIndustry} placeholder="" />
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {INDUSTRIES.map(ind => <Chip key={ind} label={ind} active={industry === ind} onClick={() => setIndustry(ind)} />)}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Telefon" icon={Phone} value={phone} onChange={setPhone} placeholder="+49 123 456789" />
                <Field label="E-Mail" icon={Mail} value={email} onChange={setEmail} placeholder="info@firma.de" type="email" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Website" icon={Globe} value={website} onChange={setWebsite} placeholder="www.firma.de" />
                <Field label="Stadt" icon={MapPin} value={city} onChange={setCity} placeholder="Stuttgart" />
              </div>

              <TextArea label="Erste Eindrücke / Notizen" value={notes} onChange={setNotes} placeholder="Bedarf, Besonderheiten, Stimmung im Gespräch..." rows={2} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
              <button onClick={() => setStep(1)} disabled={!canStep0}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 24px', borderRadius: 12,
                  fontSize: 14, fontWeight: 600, border: 'none', transition: 'all 0.15s', cursor: canStep0 ? 'pointer' : 'not-allowed',
                  background: canStep0 ? D.accent : D.card2, color: canStep0 ? '#fff' : D.text3 }}>
                Weiter <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 1: Website-Brief ── */}
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Ziel */}
              <div style={{ ...glass, padding: 20 }}>
                <SectionLabel icon={Target}>Ziel der Website</SectionLabel>
                <TextArea value={websiteGoal} onChange={setWebsiteGoal} rows={2}
                  placeholder="z.B. Mehr Neukunden gewinnen, Onlineshop aufbauen, Imageseite für Bewerbungen, lokale Sichtbarkeit stärken..." />
              </div>

              {/* Seiten */}
              <div style={{ ...glass, padding: 20 }}>
                <SectionLabel icon={Layout}>Welche Seiten soll die Website haben?</SectionLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {PAGES.map(p => {
                    const locked = p === 'Impressum / Datenschutz';
                    return (
                      <Chip key={p} label={locked ? `${p} ✓` : p}
                        active={pages.includes(p)}
                        onClick={() => !locked && togglePage(p)}
                        color={locked ? D.green : D.purple} />
                    );
                  })}
                </div>
                <p style={{ margin: '10px 0 0', fontSize: 11, color: D.text3 }}>
                  Impressum & Datenschutz sind gesetzlich vorgeschrieben und immer enthalten.
                </p>
              </div>

              {/* Farben */}
              <div style={{ ...glass, padding: 20 }}>
                <SectionLabel icon={Palette}>Farbwünsche</SectionLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {COLOR_PRESETS.map(cp => (
                    <button key={cp.id} onClick={() => setColorPreset(colorPreset === cp.id ? '' : cp.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 20,
                      cursor: 'pointer', border: `1px solid ${colorPreset === cp.id ? D.orange : D.border}`,
                      background: colorPreset === cp.id ? D.orangeL : D.card, transition: 'all 0.15s',
                    }}>
                      <div style={{ display: 'flex', gap: 3 }}>
                        {cp.colors.map((c, i) => (
                          <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: c, border: '1px solid rgba(255,255,255,0.1)' }} />
                        ))}
                      </div>
                      <span style={{ fontSize: 12, color: colorPreset === cp.id ? D.orange : D.text3 }}>{cp.label}</span>
                    </button>
                  ))}
                </div>
                <Field label="Eigene Farben / Firmen-CI" value={customColors} onChange={setCustomColors}
                  placeholder="z.B. Rot #CC0000, oder: Firmenfarben laut Logo" />
              </div>

              {/* Zielgruppe & USP */}
              <div style={{ ...glass, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <SectionLabel icon={Users}>Zielgruppe & Alleinstellungsmerkmal</SectionLabel>
                <TextArea label="Wer sind die Kunden?" icon={Users} value={targetGroup} onChange={setTargetGroup} rows={2}
                  placeholder="z.B. Privatpersonen in der Region, mittelständische Unternehmen, Familien mit Kindern..." />
                <TextArea label="Was macht das Unternehmen besonders? (USP)" icon={Star} value={usp} onChange={setUsp} rows={2}
                  placeholder="z.B. 20 Jahre Erfahrung, familiärer Betrieb, schnellste Lieferzeit in der Region..." />
              </div>

              {/* Website & Logo */}
              <div style={{ ...glass, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <SectionLabel icon={Globe}>Bestehende Website & Logo</SectionLabel>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: D.text3, textTransform: 'uppercase',
                    letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Gibt es bereits eine Website?</label>
                  <Toggle value={hasWebsite} onChange={setHasWebsite} />
                  {hasWebsite && (
                    <div style={{ marginTop: 10 }}>
                      <Field label="Aktuelle Website-URL" icon={ExternalLink} value={currentWebsite} onChange={setCurrentWebsite}
                        placeholder="www.aktuelle-seite.de" />
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: D.text3, textTransform: 'uppercase',
                    letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Ist ein Logo vorhanden?</label>
                  <Toggle value={hasLogo} onChange={setHasLogo} />
                </div>
              </div>

              {/* Vorbilder */}
              <div style={{ ...glass, padding: 20 }}>
                <SectionLabel icon={Image}>Vorbilder / Inspiration</SectionLabel>
                <Field label="Websites die gefallen (URLs oder Beschreibung)" icon={ExternalLink}
                  value={inspirations} onChange={setInspirations}
                  placeholder="z.B. apple.com, oder: 'die Website von Firma X sieht gut aus'" />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 16 }}>
              <button onClick={() => setStep(0)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 20px',
                borderRadius: 12, fontSize: 14, background: 'transparent', border: `1px solid ${D.border}`, color: D.text2, cursor: 'pointer' }}>
                <ChevronLeft size={16} /> Zurück
              </button>
              <button onClick={() => setStep(2)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 24px',
                borderRadius: 12, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: D.accent, color: '#fff' }}>
                Weiter <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: Action ── */}
        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>

            {/* Summary */}
            <div style={{ ...glass, padding: '12px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Building2 size={15} color={D.text3} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: D.text }}>{company}</p>
                <p style={{ margin: 0, fontSize: 12, color: D.text3 }}>
                  {[contactPerson, pages.length ? `${pages.length} Seiten` : ''].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>

            <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: D.text2,
              textTransform: 'uppercase', letterSpacing: '0.06em' }}>Wie weiter?</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
              {[
                { id: 'appointment', icon: Calendar, color: D.purple, colorL: D.purpleL,
                  label: 'Termin vereinbaren', desc: 'Datum & Uhrzeit für die Demo festlegen' },
                { id: 'email', icon: Mail, color: D.accent, colorL: D.accentL,
                  label: 'Demo per E-Mail zusenden', desc: 'Kein Termin möglich — Demo direkt per Mail schicken' },
                { id: 'none', icon: Briefcase, color: D.orange, colorL: D.orangeL,
                  label: 'Nur Lead & Brief speichern', desc: 'Kunde braucht Bedenkzeit — kein weiterer Schritt' },
              ].map(({ id, icon: Icon, color, colorL, label, desc }) => (
                <button key={id} onClick={() => setAction(id)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 13,
                  border: `1px solid ${action === id ? color : D.border}`,
                  background: action === id ? colorL : D.card,
                  cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s',
                }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: colorL,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={17} color={color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: D.text }}>{label}</p>
                    <p style={{ margin: 0, fontSize: 12, color: D.text3 }}>{desc}</p>
                  </div>
                  {action === id && <CheckCircle2 size={16} color={color} />}
                </button>
              ))}
            </div>

            <AnimatePresence>
              {action === 'appointment' && (
                <motion.div key="appt" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ ...glass, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <p style={{ margin: 0, fontSize: 13, color: D.text2, fontWeight: 600 }}>Termin-Details</p>

                    <CalendarPicker
                      selectedDate={scheduledDate}
                      onDateChange={setScheduledDate}
                      selectedTime={scheduledTime}
                      onTimeChange={setScheduledTime}
                    />

                    {scheduledDate && scheduledTime && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                        borderRadius: 10, background: D.purpleL, border: `1px solid rgba(191,90,242,0.25)` }}>
                        <Calendar size={14} color={D.purple} />
                        <span style={{ fontSize: 13, color: D.purple, fontWeight: 600 }}>
                          {(() => {
                            const [y,m,d] = scheduledDate.split('-');
                            return new Date(+y, +m-1, +d).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' });
                          })()} um {scheduledTime} Uhr
                        </span>
                      </div>
                    )}

                    <TextArea label="Demo-Ziel / Fokus" value={demoGoal} onChange={setDemoGoal}
                      placeholder="Was soll in der Demo gezeigt werden?" rows={2} />
                  </div>
                </motion.div>
              )}

              {action === 'email' && (
                <motion.div key="mail" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ ...glass, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <p style={{ margin: 0, fontSize: 13, color: D.text2, fontWeight: 600 }}>Demo-Mail</p>
                    {email ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
                        background: D.accentL, borderRadius: 9, border: `1px solid ${D.accent}30` }}>
                        <Mail size={13} color={D.accent} />
                        <span style={{ fontSize: 13, color: D.accent, fontWeight: 500 }}>{email}</span>
                      </div>
                    ) : (
                      <Field label="E-Mail-Adresse" icon={Mail} value={email} onChange={setEmail}
                        placeholder="info@firma.de" type="email" required />
                    )}
                    <TextArea label="Zusätzlicher Text für die Mail" value={demoNotes} onChange={setDemoNotes}
                      placeholder="z.B. 'Wie besprochen sende ich Ihnen hier...'" rows={2} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {wizard.isError && (
              <p style={{ margin: '0 0 10px', fontSize: 13, color: '#FF453A' }}>
                Fehler: {wizard.error?.response?.data?.error || wizard.error?.message}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 20px',
                borderRadius: 12, fontSize: 14, background: 'transparent', border: `1px solid ${D.border}`, color: D.text2, cursor: 'pointer' }}>
                <ChevronLeft size={16} /> Zurück
              </button>
              <button onClick={submit} disabled={!canStep2 || wizard.isPending} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '11px 24px', borderRadius: 12,
                fontSize: 14, fontWeight: 600, border: 'none', transition: 'all 0.15s',
                cursor: canStep2 && !wizard.isPending ? 'pointer' : 'not-allowed',
                background: canStep2 && !wizard.isPending ? D.accent : D.card2,
                color: canStep2 && !wizard.isPending ? '#fff' : D.text3,
              }}>
                {wizard.isPending ? 'Wird gespeichert...' : action === 'email'
                  ? <><Send size={15} /> Mail senden & speichern</>
                  : <><CheckCircle2 size={15} /> Abschließen</>}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: Erfolg ── */}
        {step === 3 && done && (
          <motion.div key="s3" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}>
            <div style={{ ...glass, padding: 40, textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: D.greenL,
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <CheckCircle2 size={32} color={D.green} />
              </div>
              <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: D.text }}>
                Erfolgreich gespeichert!
              </h2>
              <p style={{ margin: '0 0 24px', fontSize: 14, color: D.text3 }}>
                {done.action === 'appointment' && 'Lead, Website-Brief und Demo-Termin wurden angelegt.'}
                {done.action === 'email' && (done.emailSent
                  ? 'Lead & Website-Brief angelegt, Demo-Mail gesendet.'
                  : `Lead angelegt. E-Mail fehlgeschlagen: ${done.emailError}`)}
                {done.action === 'none' && 'Lead und Website-Brief wurden gespeichert.'}
              </p>

              <div style={{ background: D.card2, borderRadius: 14, padding: '16px 20px', textAlign: 'left', marginBottom: 28 }}>
                <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: D.text }}>{done.lead?.company}</p>
                {done.lead?.contact_person && <p style={{ margin: '0 0 6px', fontSize: 13, color: D.text3 }}>{done.lead.contact_person}</p>}
                {done.appointment && (
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: D.purple }}>
                    <Calendar size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    {new Date(done.appointment.scheduled_at).toLocaleString('de-DE', {
                      weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                )}
                {done.action === 'email' && done.emailSent && (
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: D.accent }}>
                    <Mail size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    Demo-Mail gesendet an {done.lead?.email}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={() => navigate('/leads/mine')} style={{ padding: '11px 20px', borderRadius: 12, fontSize: 14,
                  background: 'transparent', border: `1px solid ${D.border}`, color: D.text2, cursor: 'pointer' }}>
                  Zu Meine Leads
                </button>
                <button onClick={reset} style={{ padding: '11px 24px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                  background: D.accent, color: '#fff', border: 'none', cursor: 'pointer' }}>
                  Neuen Call starten
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
