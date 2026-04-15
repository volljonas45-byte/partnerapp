import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { teamApi } from '../api/team';
import {
  User, Check, Sparkles, X,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { clientsApi } from '../api/clients';
import { projectsApi } from '../api/projects';

// ── Constants ──────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  'App-Entwicklung', 'Apotheke', 'Architekt', 'Arztpraxis / Medizin', 'Autohandel', 'Automobilindustrie',
  'Bank / Finanzdienstleistung', 'Bar / Cocktailbar', 'Barber / Herrenfriseur', 'Baugewerbe', 'Beauty / Kosmetik', 'Beratung / Consulting', 'Buchhaltung / Steuerberatung',
  'Café', 'Catering', 'Chemieindustrie', 'Cloud-Services', 'Coaching / Mentoring', 'Cybersecurity',
  'Dachdecker', 'Data Science / KI', 'Dentist / Zahnarzt', 'Druck / Print',
  'E-Commerce / Online-Shop', 'E-Learning / Online-Kurse', 'Einzelhandel', 'Elektriker', 'Energieversorgung', 'Ernährungsberatung', 'Event-Management',
  'Facility Management', 'Fahrschule', 'Film & Video', 'Fintech', 'Fitnessstudio / Personal Training', 'Fliesenleger', 'Fotografie', 'Friseur / Salon',
  'Gärtner / Gartenbau', 'Gastronomie', 'Gemeinnützige Organisation / NGO', 'Grafik-Design', 'Großhandel',
  'Handwerk', 'Hebamme', 'Heizung & Sanitär', 'Hotel / Unterkunft', 'HR / Personalwesen',
  'Illustration', 'Imbiss / Schnellrestaurant', 'Immobilien', 'Innenarchitektur', 'IT / Software', 'IT-Support / Managed Services',
  'Journalismus / Redaktion',
  'Kindergarten / Kita', 'Kirche / Religionsgemeinschaft', 'Krankenhaus / Klinik', 'Kreditvermittlung',
  'Landwirtschaft', 'Lebensmittelhandel', 'Logistik / Transport', 'Luxusgüter',
  'Maler & Lackierer', 'Marketing / Agentur', 'Maschinenbau', 'Massage / Körpertherapie', 'Medienproduktion', 'Metallverarbeitung', 'Mode & Bekleidung', 'Musik / Band', 'Musikschule',
  'Nachhilfe / Tutoring', 'Nagel-Studio',
  'Online-Shop', 'Optiker',
  'Pharmaindustrie', 'Physiotherapie', 'Podcast', 'Psychologie / Therapie',
  'Recht / Kanzlei', 'Reinigungsservice', 'Reisebüro / Tourismus', 'Restaurant',
  'SaaS / Software', 'Schreiner / Tischler', 'Schule / Akademie', 'Sicherheitsdienst', 'Social Media Management', 'Soziale Einrichtung', 'Spa & Wellness', 'Sportartikel', 'Sprachschule', 'Steuerberatung / Wirtschaftsprüfung', 'Stiftung',
  'Tattoo & Piercing', 'Technik & Elektronik', 'Textilproduktion', 'Tiermedizin / Tierarzt', 'Tierschutz', 'Trainer / Dozent',
  'Umzugsunternehmen', 'Unternehmensberatung', 'Übersetzung / Dolmetscher',
  'Verein / Club', 'Versicherungsagentur', 'Vermögensverwaltung',
  'Webdesign / Webentwicklung', 'Weinhandel / Winzer', 'Wohlfahrtsverband',
  'Yoga / Meditation',
  'Zimmerer',
  'Sonstiges',
];

const LEISTUNGEN_OPTIONS = [
  { value: 'logo',            label: 'Logo Design' },
  { value: 'ci',              label: 'Corporate Identity' },
  { value: 'visitenkarten',   label: 'Visitenkarten' },
  { value: 'social_branding', label: 'Social Media Kit' },
  { value: 'brand_guidelines',label: 'Brand Guidelines' },
  { value: 'komplett',        label: 'Komplettpaket' },
];

const STIL_OPTIONS = [
  { value: 'modern',         label: 'Modern & Clean' },
  { value: 'premium',        label: 'Premium & Elegant' },
  { value: 'bold',           label: 'Bold & Auffällig' },
  { value: 'freundlich',     label: 'Freundlich & Warm' },
  { value: 'minimalistisch', label: 'Minimalistisch' },
  { value: 'klassisch',      label: 'Klassisch & Seriös' },
];

const STEPS = [
  { key: 'client',   label: 'Kunde',    icon: User },
  { key: 'branding', label: 'Branding', icon: Sparkles },
  { key: 'setup',    label: 'Setup',    icon: Check },
];

const INITIAL = {
  company_name: '', contact_person: '', email: '', phone: '', industry: '',
  leistungen: [],
  stil: '',
  first_notes: '',
  project_name: '',
  project_value: '',
  assignee_id: null,
  notes: '',
};

// ── Sub-components (copied from Wizard.jsx) ────────────────────────────────────

function Label({ children, required }) {
  return (
    <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-tertiary)', marginBottom: '5px' }}>
      {children}{required && <span style={{ color: '#FF3B30', marginLeft: '2px' }}>*</span>}
    </label>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      {label && <Label required={required}>{label}</Label>}
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', boxSizing: 'border-box',
        padding: '9px 12px',
        border: '1.5px solid #E5E5EA',
        borderRadius: '10px',
        fontSize: '14px',
        outline: 'none',
        background: 'var(--color-card)',
        color: 'var(--color-text)',
        fontFamily: 'inherit',
        transition: 'border-color 0.15s',
      }}
      onFocus={e => e.target.style.borderColor = 'var(--color-blue)'}
      onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
    />
  );
}

function BrancheSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = search.length === 0
    ? INDUSTRIES
    : INDUSTRIES.filter(i => i.toLowerCase().includes(search.toLowerCase()));

  function select(val) { onChange(val); setOpen(false); setSearch(''); }
  function handleKeyDown(e) {
    if (!open && e.key.length === 1 && /[a-zA-ZäöüÄÖÜß]/.test(e.key)) {
      setSearch(e.key); setOpen(true);
    }
  }
  return (
    <div style={{ position: 'relative' }} onKeyDown={handleKeyDown}>
      <button type="button" onClick={() => { setOpen(o => !o); setSearch(''); }}
        style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: `1.5px solid ${open ? 'var(--color-blue)' : 'var(--color-border)'}`, borderRadius: '10px', fontSize: '14px', background: 'var(--color-card)', cursor: 'pointer', textAlign: 'left', color: value ? 'var(--color-text)' : 'var(--color-text-secondary)', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'border-color 0.15s' }}>
        <span>{value || 'Branche wählen'}</span>
        <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginLeft: '6px' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => { setOpen(false); setSearch(''); }} />
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--color-card)', borderRadius: '12px', zIndex: 50, border: '1.5px solid #E5E5EA', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
            <div style={{ padding: '8px 8px 4px' }}>
              <input autoFocus type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Suchen…"
                style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px', border: '1.5px solid #E5E5EA', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#F5F5F7', fontFamily: 'inherit', color: 'var(--color-text)' }}
                onFocus={e => e.target.style.borderColor = 'var(--color-blue)'} onBlur={e => e.target.style.borderColor = 'var(--color-border)'} />
            </div>
            <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
              {filtered.map(industry => (
                <button key={industry} type="button" onClick={() => select(industry)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '13px', border: 'none', background: industry === value ? 'rgba(0,122,255,0.07)' : 'transparent', color: industry === value ? 'var(--color-blue)' : 'var(--color-text)', fontWeight: industry === value ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit' }}
                  onMouseEnter={e => { if (industry !== value) e.currentTarget.style.background = '#F5F5F7'; }}
                  onMouseLeave={e => { if (industry !== value) e.currentTarget.style.background = 'transparent'; }}>
                  {industry}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MultiChipGroup({ options, value = [], onChange }) {
  function toggle(v) { onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]); }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {options.map(opt => {
        const sel = value.includes(opt.value);
        return (
          <button key={opt.value} type="button" onClick={() => toggle(opt.value)}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 13px', borderRadius: '99px', border: `2px solid ${sel ? 'var(--color-blue)' : 'var(--color-border)'}`, background: sel ? 'var(--color-blue)' : '#fff', color: sel ? '#fff' : 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function ChipGroup({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {options.map(opt => {
        const sel = value === opt.value;
        return (
          <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
            style={{ padding: '7px 14px', borderRadius: '99px', border: `2px solid ${sel ? 'var(--color-blue)' : 'var(--color-border)'}`, background: sel ? 'var(--color-blue)' : '#fff', color: sel ? '#fff' : 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div style={{ background: 'var(--color-card)', borderRadius: '16px', border: '1px solid #F2F2F7', padding: '20px', boxShadow: '0 1px 4px var(--color-border-subtle)' }}>
      {title && (
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
          {title}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>{children}</div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function BrandingWizard() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const prefill = location.state?.prefill || {};
  const [step,    setStep]    = useState(0);
  const [data,    setData]    = useState({ ...INITIAL, ...prefill });
  const [loading, setLoading] = useState(false);

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamApi.list().then(r => r.data),
  });

  const set = (key) => (val) => setData(d => ({ ...d, [key]: val }));

  const autoProjectName = () =>
    data.company_name
      ? `${data.company_name} – Branding ${new Date().getFullYear()}`
      : '';

  const canNext = () => {
    if (step === 0) return data.company_name.trim() && data.email.trim();
    return true;
  };

  const next = () => {
    if (step === 1 && !data.project_name) {
      setData(d => ({ ...d, project_name: autoProjectName() }));
    }
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const handleCreate = async () => {
    if (!data.company_name.trim()) return toast.error('Unternehmensname fehlt');
    setLoading(true);
    try {
      const client = await clientsApi.create({
        company_name:   data.company_name.trim(),
        contact_person: data.contact_person.trim(),
        email:          data.email.trim(),
        phone:          data.phone.trim(),
        industry:       data.industry || '',
      });

      const projectName = data.project_name || autoProjectName();

      const descParts = [];
      if (data.leistungen?.length) {
        const labels = data.leistungen.map(v => LEISTUNGEN_OPTIONS.find(o => o.value === v)?.label || v);
        descParts.push(`Gewünschte Leistungen: ${labels.join(', ')}`);
      }
      if (data.stil) {
        const stilLabel = STIL_OPTIONS.find(o => o.value === data.stil)?.label || data.stil;
        descParts.push(`Gewünschter Stil: ${stilLabel}`);
      }
      if (data.first_notes?.trim()) descParts.push(data.first_notes.trim());
      if (data.notes?.trim())       descParts.push(data.notes.trim());

      await projectsApi.create({
        client_id:    client.id,
        name:         projectName,
        type:         'branding',
        project_type: 'branding',
        status:       'planned',
        budget:       data.project_value ? parseFloat(data.project_value) : null,
        description:  descParts.join('\n\n'),
        assignee_id:  data.assignee_id || null,
      });

      toast.success(`${projectName} wurde erstellt!`);
      navigate(`/clients/${client.id}`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Fehler beim Erstellen');
    } finally {
      setLoading(false);
    }
  };

  const progress = (step / (STEPS.length - 1)) * 100;
  const isLastStep = step === STEPS.length - 1;

  return (
    <div style={{ minHeight: '100%', background: '#F5F5F7', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ background: 'var(--color-card)', borderBottom: '1px solid #F2F2F7', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={17} color="#F59E0B" />
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)' }}>Branding-Projekt einrichten</span>
        </div>
        <button onClick={() => navigate('/clients')}
          style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--color-card-secondary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}>
          <X size={15} />
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: '2px', background: 'var(--color-card-secondary)', flexShrink: 0 }}>
        <div style={{ height: '100%', width: `${progress}%`, background: '#F59E0B', transition: 'width 0.4s ease' }} />
      </div>

      {/* Step indicators */}
      <div style={{ background: 'var(--color-card)', borderBottom: '1px solid #F2F2F7', padding: '12px 32px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', maxWidth: '600px', margin: '0 auto' }}>
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step, active = i === step;
            return (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: active ? 600 : 400, color: done ? '#34C759' : active ? '#F59E0B' : 'var(--color-text-tertiary)' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? '#34C759' : active ? '#F59E0B' : 'var(--color-card-secondary)', flexShrink: 0 }}>
                    {done ? <Check size={11} color="#fff" strokeWidth={3} /> : <Icon size={11} color={active ? '#fff' : 'var(--color-text-tertiary)'} />}
                  </div>
                  <span style={{ whiteSpace: 'nowrap' }}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: '1px', margin: '0 8px', background: i < step ? '#34C759' : 'var(--color-border)' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 24px 48px' }}>

          {/* STEP 0: Kunde */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Kundeninformationen</h2>
                <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>Nur Name und E-Mail sind Pflicht — der Rest kann später ergänzt werden.</p>
              </div>
              <SectionCard title="UNTERNEHMEN">
                <Field label="Unternehmensname" required>
                  <TextInput value={data.company_name} onChange={set('company_name')} placeholder="Muster GmbH" />
                </Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <Field label="Ansprechpartner">
                    <TextInput value={data.contact_person} onChange={set('contact_person')} placeholder="Max Mustermann" />
                  </Field>
                  <Field label="Branche">
                    <BrancheSelect value={data.industry} onChange={set('industry')} />
                  </Field>
                </div>
              </SectionCard>
              <SectionCard title="KONTAKT">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <Field label="E-Mail" required>
                    <TextInput value={data.email} onChange={set('email')} type="email" placeholder="kontakt@firma.de" />
                  </Field>
                  <Field label="Telefon">
                    <TextInput value={data.phone} onChange={set('phone')} type="tel" placeholder="+49 30 123456" />
                  </Field>
                </div>
              </SectionCard>
            </div>
          )}

          {/* STEP 1: Branding-Details */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Branding-Details</h2>
                <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>Alles optional — kann im Projekt jederzeit ergänzt werden.</p>
              </div>
              <SectionCard title="GEWÜNSCHTE LEISTUNGEN">
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '-4px 0 4px' }}>Mehrfachauswahl möglich</p>
                <MultiChipGroup options={LEISTUNGEN_OPTIONS} value={data.leistungen} onChange={set('leistungen')} />
              </SectionCard>
              <SectionCard title="GEWÜNSCHTER STIL">
                <ChipGroup options={STIL_OPTIONS} value={data.stil} onChange={set('stil')} />
              </SectionCard>
              <SectionCard title="ERSTE HINWEISE & WÜNSCHE">
                <Field label="Was hat der Kunde sonst noch erwähnt?">
                  <textarea
                    value={data.first_notes || ''}
                    onChange={e => set('first_notes')(e.target.value)}
                    placeholder="z.B. Farben, Referenzen, bestehende Materialien, Deadlines…"
                    rows={4}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1.5px solid #E5E5EA', borderRadius: '10px', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', color: 'var(--color-text)', lineHeight: 1.5 }}
                    onFocus={e => e.target.style.borderColor = 'var(--color-blue)'}
                    onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                  />
                </Field>
              </SectionCard>
            </div>
          )}

          {/* STEP 2: Setup */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Projekt-Setup</h2>
                <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>Alles optional — kann jederzeit angepasst werden.</p>
              </div>
              <SectionCard title="PROJEKTNAME">
                <Field label="Name des Projekts">
                  <TextInput value={data.project_name || autoProjectName()} onChange={set('project_name')} placeholder={autoProjectName() || 'z.B. Muster GmbH – Branding 2026'} />
                </Field>
              </SectionCard>
              <SectionCard title="BUDGET & NOTIZEN">
                <Field label="Projektwert (€) — optional">
                  <TextInput value={data.project_value} onChange={set('project_value')} type="number" placeholder="z.B. 2500" />
                </Field>
                <Field label="Notizen / Besonderes">
                  <textarea
                    value={data.notes || ''}
                    onChange={e => set('notes')(e.target.value)}
                    placeholder="Besondere Anforderungen, Hinweise…"
                    rows={3}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1.5px solid #E5E5EA', borderRadius: '10px', fontSize: '14px', outline: 'none', resize: 'none', fontFamily: 'inherit', color: 'var(--color-text)' }}
                    onFocus={e => e.target.style.borderColor = 'var(--color-blue)'}
                    onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                  />
                </Field>
              </SectionCard>
              {teamMembers.length > 0 && (
                <SectionCard title="ANSPRECHPARTNER">
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {teamMembers.map(m => {
                      const initials = (m.name || m.email).trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
                      const active = data.assignee_id === m.id;
                      return (
                        <button key={m.id} type="button" onClick={() => set('assignee_id')(active ? null : m.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '99px', border: `2px solid ${active ? m.color || '#F59E0B' : 'var(--color-border)'}`, background: active ? (m.color || '#F59E0B') + '18' : '#fff', cursor: 'pointer', transition: 'all 0.15s' }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: m.color || '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>{initials}</div>
                          <span style={{ fontSize: '13px', fontWeight: active ? '600' : '400', color: 'var(--color-text)' }}>{m.name || m.email}</span>
                        </button>
                      );
                    })}
                  </div>
                </SectionCard>
              )}
              {/* Summary */}
              <div style={{ padding: '16px', borderRadius: '14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#D97706', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Wird erstellt</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    { label: 'Kunde',      value: data.company_name },
                    { label: 'Projekt',    value: data.project_name || autoProjectName() },
                    data.leistungen?.length > 0 && { label: 'Leistungen', value: `${data.leistungen.length} ausgewählt` },
                    data.stil && { label: 'Stil', value: STIL_OPTIONS.find(o => o.value === data.stil)?.label || data.stil },
                    data.project_value && { label: 'Budget', value: `${Number(data.project_value).toLocaleString('de-DE')} €` },
                  ].filter(Boolean).map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#34C759', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Check size={9} color="#fff" strokeWidth={3} />
                      </div>
                      <span style={{ color: 'var(--color-text-tertiary)' }}>{item.label}:</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Bottom nav */}
      <div style={{ background: 'var(--color-card)', borderTop: '1px solid #F2F2F7', paddingTop: 16, paddingLeft: isMobile ? 20 : 32, paddingRight: isMobile ? 20 : 32, paddingBottom: isMobile ? 'calc(env(safe-area-inset-bottom) + 86px)' : 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <button type="button" onClick={() => setStep(s => Math.max(s - 1, 0))} disabled={step === 0}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '10px', border: '1.5px solid #E5E5EA', background: 'var(--color-card)', fontSize: '14px', fontWeight: 500, color: step === 0 ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)', cursor: step === 0 ? 'not-allowed' : 'pointer' }}>
          <ChevronLeft size={16} /> Zurück
        </button>

        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Schritt {step + 1} von {STEPS.length}</span>

        {!isLastStep ? (
          <button type="button" onClick={next} disabled={!canNext()}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 20px', borderRadius: '10px', border: 'none', background: canNext() ? '#F59E0B' : 'var(--color-border)', color: canNext() ? '#fff' : 'var(--color-text-secondary)', fontSize: '14px', fontWeight: 600, cursor: canNext() ? 'pointer' : 'not-allowed', transition: 'background 0.15s' }}>
            Weiter <ChevronRight size={16} />
          </button>
        ) : (
          <button type="button" onClick={handleCreate} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 20px', borderRadius: '10px', border: 'none', background: loading ? 'var(--color-border)' : '#F59E0B', color: loading ? 'var(--color-text-secondary)' : '#fff', fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? (
              <>
                <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Erstelle…
              </>
            ) : (
              <><Sparkles size={15} /> Projekt erstellen</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
