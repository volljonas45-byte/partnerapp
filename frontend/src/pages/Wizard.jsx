import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { teamApi } from '../api/team';
import {
  User, Globe, Check, Sparkles, X, Plus,
  ChevronLeft, ChevronRight,
  Building2, Target, ShoppingBag, Calendar,
  Newspaper, Users, Camera, Star, Image, Info,
  Mail, Cloud,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { clientsApi } from '../api/clients';
import { projectsApi } from '../api/projects';
import { workflowApi } from '../api/workflow';

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

const PROJECT_TYPES = [
  { value: 'unternehmenswebsite', label: 'Unternehmenswebsite', desc: 'Professionelle Online-Präsenz',  icon: Building2 },
  { value: 'portfolio',           label: 'Portfolio',           desc: 'Arbeiten & Projekte präsentieren', icon: Camera },
  { value: 'funnel',              label: 'Sales Funnel',        desc: 'Landing Page & Conversion',       icon: Target },
  { value: 'shop',                label: 'Online-Shop',         desc: 'E-Commerce & Produktseiten',      icon: ShoppingBag },
  { value: 'buchung',             label: 'Buchungswebsite',     desc: 'Termine & Reservierungen',        icon: Calendar },
  { value: 'blog',                label: 'Blog / Magazine',     desc: 'Content, Artikel & News',         icon: Newspaper },
  { value: 'community',           label: 'Community / Verein',  desc: 'Mitglieder & Gruppen',            icon: Users },
];

const GOALS = [
  { value: 'leads',       label: 'Leads generieren',  icon: Mail },
  { value: 'bookings',    label: 'Buchungen erhalten', icon: Calendar },
  { value: 'sales',       label: 'Produkte verkaufen', icon: ShoppingBag },
  { value: 'branding',    label: 'Marke aufbauen',     icon: Star },
  { value: 'portfolio',   label: 'Portfolio zeigen',   icon: Image },
  { value: 'information', label: 'Informieren',        icon: Info },
];

const BUILD_TYPES = [
  { value: 'gecodet',  label: 'Gecodet',        desc: 'React / Next.js / HTML',        badge: null },
  { value: 'wix',      label: 'Wix',            desc: 'Wix Editor / Studio',           badge: null },
  { value: 'beide',    label: 'Beide',           desc: 'Wix Demo + Coded Version',      badge: null },
];

const HOSTING_OPTIONS = [
  { value: 'vercel',    label: 'Vercel',    desc: 'Empfohlen für Code',   icon: Cloud },
  { value: 'netlify',   label: 'Netlify',   desc: 'JAMstack / Static',    icon: Cloud },
  { value: 'hostinger', label: 'Hostinger', desc: 'Günstig & zuverlässig', icon: Cloud },
  { value: 'wix',       label: 'Wix',       desc: 'Wix eigenes Hosting',  icon: Globe },
];

const STEPS = [
  { key: 'client',  label: 'Kunde',   icon: User },
  { key: 'project', label: 'Projekt', icon: Sparkles },
  { key: 'tech',    label: 'Technik', icon: Globe },
];

const COMMON_PAGES = [
  { value: 'startseite',  label: 'Startseite'  },
  { value: 'ueber_uns',   label: 'Über uns'    },
  { value: 'leistungen',  label: 'Leistungen'  },
  { value: 'portfolio',   label: 'Portfolio'   },
  { value: 'referenzen',  label: 'Referenzen'  },
  { value: 'blog',        label: 'Blog'        },
  { value: 'shop',        label: 'Shop'        },
  { value: 'kontakt',     label: 'Kontakt'     },
  { value: 'impressum',   label: 'Impressum'   },
  { value: 'datenschutz', label: 'Datenschutz' },
  { value: 'faq',         label: 'FAQ'         },
  { value: 'karriere',    label: 'Karriere'    },
];

const INITIAL = {
  // Step 1 – Client (required: company_name, email)
  company_name: '', contact_person: '', email: '', phone: '',
  address: '', industry: '', has_website: null, website_url: '',
  // Step 1 – erste Projektinfos
  pages: [],           // Array der gewählten Seiten-Keys (MultiChip)
  pages_custom: '',    // freie Seiten-Eingabe
  first_notes: '',     // erste Hinweise / Wünsche
  // Step 2 – Project
  project_name: '', project_type: '', project_type_custom: '',
  goal: '', goal_custom: '',
  // Step 3 – Tech (all optional)
  build_type: '', hosting: '', domain_new: null, domain_url: '',
  project_value: '', notes: '',
  // Assignee
  assignee_id: null,
};

// ── Sub-components ──────────────────────────────────────────────────────────────

function Label({ children, required }) {
  return (
    <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6E6E73', marginBottom: '5px' }}>
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

function TextInput({ value, onChange, placeholder, type = 'text', required }) {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      style={{
        width: '100%', boxSizing: 'border-box',
        padding: '9px 12px',
        border: '1.5px solid #E5E5EA',
        borderRadius: '10px',
        fontSize: '14px',
        outline: 'none',
        background: '#fff',
        color: '#1D1D1F',
        fontFamily: 'inherit',
        transition: 'border-color 0.15s',
      }}
      onFocus={e => e.target.style.borderColor = '#0071E3'}
      onBlur={e => e.target.style.borderColor = '#E5E5EA'}
    />
  );
}

function SelectInput({ value, onChange, children }) {
  return (
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', boxSizing: 'border-box',
        padding: '9px 12px',
        border: '1.5px solid #E5E5EA',
        borderRadius: '10px',
        fontSize: '14px',
        outline: 'none',
        background: '#fff',
        color: value ? '#1D1D1F' : '#8E8E93',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </select>
  );
}

function BrancheSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = search.length === 0
    ? INDUSTRIES
    : INDUSTRIES.filter(i => i.toLowerCase().includes(search.toLowerCase()));

  function select(val) {
    onChange(val);
    setOpen(false);
    setSearch('');
  }

  function handleKeyDown(e) {
    if (!open) {
      // Single letter press opens and filters
      if (e.key.length === 1 && /[a-zA-ZäöüÄÖÜß]/.test(e.key)) {
        setSearch(e.key);
        setOpen(true);
      }
    }
  }

  return (
    <div style={{ position: 'relative' }} onKeyDown={handleKeyDown}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch(''); }}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '9px 12px',
          border: `1.5px solid ${open ? '#0071E3' : '#E5E5EA'}`,
          borderRadius: '10px', fontSize: '14px',
          background: '#fff', cursor: 'pointer', textAlign: 'left',
          color: value ? '#1D1D1F' : '#8E8E93',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          transition: 'border-color 0.15s',
        }}
      >
        <span>{value || 'Branche wählen'}</span>
        <span style={{ fontSize: '10px', color: '#8E8E93', marginLeft: '6px' }}>{open ? '▲' : '▼'}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => { setOpen(false); setSearch(''); }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            background: '#fff', borderRadius: '12px', zIndex: 50,
            border: '1.5px solid #E5E5EA',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            overflow: 'hidden',
          }}>
            {/* Search box */}
            <div style={{ padding: '8px 8px 4px' }}>
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Suchen oder Buchstabe tippen…"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '7px 10px', border: '1.5px solid #E5E5EA',
                  borderRadius: '8px', fontSize: '13px', outline: 'none',
                  background: '#F5F5F7', fontFamily: 'inherit', color: '#1D1D1F',
                }}
                onFocus={e => e.target.style.borderColor = '#0071E3'}
                onBlur={e => e.target.style.borderColor = '#E5E5EA'}
              />
            </div>

            {/* Letter hint */}
            {search.length === 0 && (
              <div style={{ padding: '2px 12px 6px', fontSize: '11px', color: '#8E8E93' }}>
                Buchstabe tippen zum Filtern
              </div>
            )}

            {/* List */}
            <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '16px 12px', fontSize: '13px', color: '#8E8E93', textAlign: 'center' }}>
                  Keine Branche gefunden
                </div>
              ) : (
                filtered.map(industry => (
                  <button
                    key={industry}
                    type="button"
                    onClick={() => select(industry)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '8px 12px', fontSize: '13px', border: 'none',
                      background: industry === value ? 'rgba(0,113,227,0.07)' : 'transparent',
                      color: industry === value ? '#0071E3' : '#1D1D1F',
                      fontWeight: industry === value ? 600 : 400,
                      cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (industry !== value) e.currentTarget.style.background = '#F5F5F7'; }}
                    onMouseLeave={e => { if (industry !== value) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {industry}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CardSelect({ options, value, onChange, showCustom, customValue, onCustomChange }) {
  const [adding, setAdding] = useState(false);
  const [custom, setCustom] = useState('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {options.map(opt => {
        const isSelected = value === opt.value;
        const OptIcon = opt.icon || null;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 14px',
              borderRadius: '12px',
              border: `2px solid ${isSelected ? '#0071E3' : '#F2F2F7'}`,
              background: isSelected ? 'rgba(0,113,227,0.05)' : '#F9F9F9',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
            }}
          >
            {OptIcon && <OptIcon size={16} color={isSelected ? '#0071E3' : '#8E8E93'} strokeWidth={1.8} style={{ flexShrink: 0 }} />}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: isSelected ? '#0071E3' : '#1D1D1F' }}>
                {opt.label}
                {opt.badge && (
                  <span style={{
                    marginLeft: '8px', fontSize: '10px', fontWeight: 600,
                    background: '#0071E3', color: '#fff',
                    padding: '1px 7px', borderRadius: '20px',
                  }}>{opt.badge}</span>
                )}
              </div>
              {opt.desc && <div style={{ fontSize: '12px', color: '#8E8E93', marginTop: '1px' }}>{opt.desc}</div>}
            </div>
            {isSelected && (
              <div style={{
                width: '20px', height: '20px', borderRadius: '50%',
                background: '#0071E3',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Check size={12} color="#fff" strokeWidth={3} />
              </div>
            )}
          </button>
        );
      })}

      {/* Custom option */}
      {showCustom && (
        <>
          {!adding ? (
            <button
              type="button"
              onClick={() => setAdding(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '2px dashed #E5E5EA',
                background: 'transparent',
                cursor: 'pointer',
                color: '#8E8E93',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'all 0.15s',
              }}
            >
              <Plus size={14} /> Eigene Option hinzufügen
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                autoFocus
                value={custom}
                onChange={e => setCustom(e.target.value)}
                placeholder="Eigene Option eingeben…"
                onKeyDown={e => {
                  if (e.key === 'Enter' && custom.trim()) {
                    onChange('custom');
                    onCustomChange(custom.trim());
                    setAdding(false);
                  }
                  if (e.key === 'Escape') setAdding(false);
                }}
                style={{
                  flex: 1, padding: '9px 12px', borderRadius: '10px',
                  border: '1.5px solid #0071E3', fontSize: '13px',
                  outline: 'none', fontFamily: 'inherit',
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (custom.trim()) {
                    onChange('custom');
                    onCustomChange(custom.trim());
                  }
                  setAdding(false);
                }}
                style={{
                  padding: '0 14px', borderRadius: '10px',
                  border: 'none', background: '#0071E3', color: '#fff',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                OK
              </button>
            </div>
          )}
          {value === 'custom' && customValue && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 14px', borderRadius: '12px',
              border: '2px solid #0071E3', background: 'rgba(0,113,227,0.05)',
            }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#0071E3', flex: 1 }}>
                {customValue}
              </span>
              <button
                type="button"
                onClick={() => { onChange(''); onCustomChange(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8E8E93' }}
              >
                <X size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ChipGroup({ options, value, onChange, showCustom, customValue, onCustomChange }) {
  const [adding, setAdding] = useState(false);
  const [custom, setCustom] = useState('');

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
      {options.map(opt => {
        const isSelected = value === opt.value;
        const OptIcon = opt.icon || null;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '7px 14px',
              borderRadius: '99px',
              border: `2px solid ${isSelected ? '#0071E3' : '#E5E5EA'}`,
              background: isSelected ? '#0071E3' : '#fff',
              color: isSelected ? '#fff' : '#3C3C43',
              fontSize: '13px', fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {OptIcon && <OptIcon size={13} strokeWidth={1.8} />}
            {opt.label}
          </button>
        );
      })}

      {/* Custom chip */}
      {showCustom && (
        <>
          {value === 'custom' && customValue ? (
            <button
              type="button"
              onClick={() => { onChange(''); onCustomChange(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '7px 14px',
                borderRadius: '99px',
                border: '2px solid #0071E3',
                background: '#0071E3', color: '#fff',
                fontSize: '13px', fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {customValue} <X size={12} />
            </button>
          ) : !adding ? (
            <button
              type="button"
              onClick={() => setAdding(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '7px 12px',
                borderRadius: '99px',
                border: '2px dashed #D1D1D6',
                background: 'transparent',
                color: '#8E8E93',
                fontSize: '13px', fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <Plus size={12} /> Eigenes
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <input
                autoFocus
                value={custom}
                onChange={e => setCustom(e.target.value)}
                placeholder="Ziel eingeben…"
                onKeyDown={e => {
                  if (e.key === 'Enter' && custom.trim()) {
                    onChange('custom'); onCustomChange(custom.trim()); setAdding(false);
                  }
                  if (e.key === 'Escape') setAdding(false);
                }}
                style={{
                  padding: '5px 10px', borderRadius: '99px',
                  border: '2px solid #0071E3', fontSize: '13px',
                  outline: 'none', width: '140px', fontFamily: 'inherit',
                }}
              />
              <button type="button"
                onClick={() => { if (custom.trim()) { onChange('custom'); onCustomChange(custom.trim()); } setAdding(false); }}
                style={{ padding: '4px 10px', borderRadius: '99px', border: 'none', background: '#0071E3', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >OK</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Multi-Auswahl Chips (mehrere gleichzeitig wählbar)
function MultiChipGroup({ options, value = [], onChange }) {
  const [adding, setAdding] = useState(false);
  const [custom, setCustom] = useState('');

  function toggle(v) {
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  }

  function addCustom() {
    const trimmed = custom.trim();
    if (!trimmed) return;
    const key = `custom_${trimmed}`;
    if (!value.includes(key)) onChange([...value, key]);
    setCustom('');
    setAdding(false);
  }

  // Zeige Standard-Chips + evtl. vorhandene Custom-Einträge
  const customEntries = value.filter(v => v.startsWith('custom_'));

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
      {options.map(opt => {
        const sel = value.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '7px 13px', borderRadius: '99px',
              border: `2px solid ${sel ? '#0071E3' : '#E5E5EA'}`,
              background: sel ? '#0071E3' : '#fff',
              color: sel ? '#fff' : '#3C3C43',
              fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {opt.label}
          </button>
        );
      })}

      {/* Custom Einträge */}
      {customEntries.map(v => {
        const label = v.replace('custom_', '');
        return (
          <button key={v} type="button" onClick={() => toggle(v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '7px 13px', borderRadius: '99px',
              border: '2px solid #0071E3', background: '#0071E3',
              color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            }}
          >
            {label} <X size={12} />
          </button>
        );
      })}

      {/* Eigene Seite hinzufügen */}
      {!adding ? (
        <button type="button" onClick={() => setAdding(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '7px 12px', borderRadius: '99px',
            border: '2px dashed #D1D1D6', background: 'transparent',
            color: '#8E8E93', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
          }}
        >
          <Plus size={12} /> Eigene
        </button>
      ) : (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <input
            autoFocus value={custom} onChange={e => setCustom(e.target.value)}
            placeholder="Seitenname…"
            onKeyDown={e => { if (e.key === 'Enter') addCustom(); if (e.key === 'Escape') { setAdding(false); setCustom(''); } }}
            style={{
              padding: '5px 10px', borderRadius: '99px',
              border: '2px solid #0071E3', fontSize: '13px',
              outline: 'none', width: '130px', fontFamily: 'inherit',
            }}
          />
          <button type="button" onClick={addCustom}
            style={{ padding: '4px 10px', borderRadius: '99px', border: 'none', background: '#0071E3', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >OK</button>
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: '16px',
      border: '1px solid #F2F2F7',
      padding: '20px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      {title && (
        <div style={{
          fontSize: '11px', fontWeight: 600,
          color: '#8E8E93', textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: '16px',
        }}>
          {title}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {children}
      </div>
    </div>
  );
}

function TogglePair({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          style={{
            padding: '7px 16px',
            borderRadius: '99px',
            border: `2px solid ${value === opt.value ? '#0071E3' : '#E5E5EA'}`,
            background: value === opt.value ? '#0071E3' : '#fff',
            color: value === opt.value ? '#fff' : '#3C3C43',
            fontSize: '13px', fontWeight: 500,
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Main Wizard ─────────────────────────────────────────────────────────────────

export default function Wizard() {
  const navigate = useNavigate();
  const [step,    setStep]    = useState(0);
  const [data,    setData]    = useState(INITIAL);
  const [loading, setLoading] = useState(false);

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamApi.list().then(r => r.data),
  });

  const set = (key) => (val) => setData(d => ({ ...d, [key]: val }));

  const autoProjectName = () => {
    if (!data.company_name) return '';
    const typeMap = {
      unternehmenswebsite: 'Website', portfolio: 'Portfolio',
      funnel: 'Funnel', shop: 'Shop', buchung: 'Buchungsseite',
      blog: 'Blog', community: 'Website', custom: data.project_type_custom || 'Projekt',
    };
    return `${data.company_name} – ${typeMap[data.project_type] || 'Projekt'} ${new Date().getFullYear()}`;
  };

  const canNext = () => {
    if (step === 0) return data.company_name.trim() && data.email.trim();
    return true; // steps 1 and 2 are optional
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
      // 1. Create client
      const client = await clientsApi.create({
        company_name:   data.company_name.trim(),
        contact_person: data.contact_person.trim(),
        email:          data.email.trim(),
        phone:          data.phone.trim(),
        address:        data.address.trim(),
        industry:       data.industry || '',
        website:        data.website_url.trim() || null,
      });

      // 2. Create website project
      const projectName = data.project_name || autoProjectName();
      const projectType = data.project_type === 'custom'
        ? data.project_type_custom || 'Sonstiges'
        : data.project_type || null;

      // Beschreibung aus allen relevanten Infos zusammenbauen
      const descParts = [];
      if (data.pages?.length) {
        const pageLabels = data.pages.map(v => {
          if (v.startsWith('custom_')) return v.replace('custom_', '');
          return COMMON_PAGES.find(p => p.value === v)?.label || v;
        });
        descParts.push(`Gewünschte Seiten: ${pageLabels.join(', ')}`);
      }
      if (data.first_notes?.trim()) descParts.push(data.first_notes.trim());
      if (data.notes?.trim())       descParts.push(data.notes.trim());

      const project = await projectsApi.create({
        client_id:        client.id,
        name:             projectName,
        type:             projectType,
        build_type:       data.build_type || null,
        hosting_provider: data.hosting    || null,
        status:           'planned',
        budget:           data.project_value ? parseFloat(data.project_value) : null,
        description:      descParts.join('\n\n'),
        project_type:     'website',
        assignee_id:      data.assignee_id || null,
      });

      // 3. Set workflow decisions (build_type + goal)
      const wfDecisions = {};
      if (data.build_type) wfDecisions.build_type = data.build_type;
      if (data.goal) {
        wfDecisions.goal = data.goal === 'custom' ? data.goal_custom : data.goal;
      }
      if (Object.keys(wfDecisions).length > 0) {
        try {
          await workflowApi.update(project.id, { decisions: wfDecisions });
        } catch (_) {}
      }

      toast.success(`${projectName} wurde erstellt!`);
      navigate(`/websites/${project.id}`);
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
    <div style={{
      minHeight: '100%',
      background: '#F5F5F7',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* ── Top bar ── */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #F2F2F7',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={17} color="#0071E3" />
          <span style={{ fontSize: '15px', fontWeight: 600, color: '#1D1D1F' }}>
            Neues Projekt einrichten
          </span>
        </div>
        <button
          onClick={() => navigate('/websites')}
          style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: '#F2F2F7', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#6E6E73',
          }}
        >
          <X size={15} />
        </button>
      </div>

      {/* ── Progress bar ── */}
      <div style={{ height: '2px', background: '#F2F2F7', flexShrink: 0 }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: '#0071E3',
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* ── Step indicators ── */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #F2F2F7',
        padding: '12px 32px',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          maxWidth: '600px', margin: '0 auto',
        }}>
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done   = i < step;
            const active = i === step;
            return (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  fontSize: '12px', fontWeight: active ? 600 : 400,
                  color: done ? '#34C759' : active ? '#0071E3' : '#C7C7CC',
                }}>
                  <div style={{
                    width: '22px', height: '22px',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: done ? '#34C759' : active ? '#0071E3' : '#F2F2F7',
                    flexShrink: 0,
                  }}>
                    {done
                      ? <Check size={11} color="#fff" strokeWidth={3} />
                      : <Icon size={11} color={active ? '#fff' : '#C7C7CC'} />
                    }
                  </div>
                  <span style={{ whiteSpace: 'nowrap' }}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{
                    flex: 1, height: '1px', margin: '0 8px',
                    background: i < step ? '#34C759' : '#E5E5EA',
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 24px 48px' }}>

          {/* ── SCHRITT 1: KUNDE ── */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1D1D1F', margin: 0 }}>
                  Kundeninformationen
                </h2>
                <p style={{ fontSize: '14px', color: '#8E8E93', marginTop: '4px' }}>
                  Nur Name und E-Mail sind Pflicht — der Rest kann später ergänzt werden.
                </p>
              </div>

              <SectionCard title="UNTERNEHMEN">
                <Field label="Unternehmensname" required>
                  <TextInput
                    value={data.company_name}
                    onChange={set('company_name')}
                    placeholder="Muster GmbH"
                  />
                </Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <Field label="Ansprechpartner">
                    <TextInput value={data.contact_person} onChange={set('contact_person')} placeholder="Max Mustermann" />
                  </Field>
                  <Field label="Branche">
                    <BrancheSelect value={data.industry} onChange={set('industry')} />
                  </Field>
                </div>
                <Field label="Adresse (optional)">
                  <TextInput value={data.address} onChange={set('address')} placeholder="Musterstraße 1, 10115 Berlin" />
                </Field>
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

              <SectionCard title="BESTEHENDE WEBSITE">
                <Field label="Hat der Kunde eine bestehende Website?">
                  <TogglePair
                    options={[{ value: 'ja', label: 'Ja' }, { value: 'nein', label: 'Nein' }]}
                    value={data.has_website === true ? 'ja' : data.has_website === false ? 'nein' : ''}
                    onChange={v => set('has_website')(v === 'ja')}
                  />
                </Field>
                {data.has_website === true && (
                  <Field label="URL der bestehenden Website">
                    <TextInput value={data.website_url} onChange={set('website_url')} placeholder="https://www.beispiel.de" />
                  </Field>
                )}
              </SectionCard>

              <SectionCard title="GEWÜNSCHTE SEITEN">
                <p style={{ fontSize: '12px', color: '#8E8E93', margin: '-4px 0 4px', lineHeight: 1.5 }}>
                  Welche Seiten soll die Website haben? (Mehrfachauswahl)
                </p>
                <MultiChipGroup
                  options={COMMON_PAGES}
                  value={data.pages}
                  onChange={set('pages')}
                />
              </SectionCard>

              <SectionCard title="ERSTE HINWEISE & WÜNSCHE">
                <Field label="Was hat der Kunde sonst noch erwähnt?">
                  <textarea
                    value={data.first_notes || ''}
                    onChange={e => set('first_notes')(e.target.value)}
                    placeholder="z.B. Farben, Stil, Konkurrenz, besondere Wünsche, Deadlines…"
                    rows={4}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '9px 12px',
                      border: '1.5px solid #E5E5EA',
                      borderRadius: '10px',
                      fontSize: '14px', outline: 'none',
                      resize: 'vertical', fontFamily: 'inherit',
                      color: '#1D1D1F', lineHeight: 1.5,
                    }}
                    onFocus={e => e.target.style.borderColor = '#0071E3'}
                    onBlur={e => e.target.style.borderColor = '#E5E5EA'}
                  />
                </Field>
              </SectionCard>
            </div>
          )}

          {/* ── SCHRITT 2: PROJEKT ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1D1D1F', margin: 0 }}>
                  Projektdetails
                </h2>
                <p style={{ fontSize: '14px', color: '#8E8E93', marginTop: '4px' }}>
                  Alles optional — kann im Workflow-Tab jederzeit ergänzt werden.
                </p>
              </div>

              <SectionCard title="PROJEKTNAME">
                <Field label="Name des Projekts">
                  <TextInput
                    value={data.project_name || autoProjectName()}
                    onChange={set('project_name')}
                    placeholder={autoProjectName() || 'z.B. Website Redesign 2026'}
                  />
                </Field>
              </SectionCard>

              <SectionCard title="PROJEKTTYP">
                <CardSelect
                  options={PROJECT_TYPES}
                  value={data.project_type}
                  onChange={set('project_type')}
                  showCustom
                  customValue={data.project_type_custom}
                  onCustomChange={set('project_type_custom')}
                />
              </SectionCard>

              <SectionCard title="HAUPTZIEL DES PROJEKTS">
                <ChipGroup
                  options={GOALS}
                  value={data.goal}
                  onChange={set('goal')}
                  showCustom
                  customValue={data.goal_custom}
                  onCustomChange={set('goal_custom')}
                />
              </SectionCard>

              {teamMembers.length > 0 && (
                <SectionCard title="ANSPRECHPARTNER">
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {teamMembers.map(m => {
                      const initials = (m.name || m.email).trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
                      const active = data.assignee_id === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => set('assignee_id')(active ? null : m.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '8px 14px', borderRadius: '99px',
                            border: `2px solid ${active ? m.color || '#0071E3' : '#E5E7EB'}`,
                            background: active ? (m.color || '#0071E3') + '18' : '#fff',
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}
                        >
                          <div style={{
                            width: 26, height: 26, borderRadius: '50%',
                            background: m.color || '#6366f1',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '10px', fontWeight: '700', color: '#fff', flexShrink: 0,
                          }}>{initials}</div>
                          <span style={{ fontSize: '13px', fontWeight: active ? '600' : '400', color: '#1D1D1F' }}>
                            {m.name || m.email}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </SectionCard>
              )}
            </div>
          )}

          {/* ── SCHRITT 3: TECHNIK (alles optional) ── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1D1D1F', margin: 0 }}>
                  Technisches Setup
                </h2>
                <p style={{ fontSize: '14px', color: '#8E8E93', marginTop: '4px' }}>
                  Alles optional — kann im Workflow jederzeit angepasst werden.
                </p>
              </div>

              <SectionCard title="BUILD-METHODE">
                <CardSelect
                  options={BUILD_TYPES}
                  value={data.build_type}
                  onChange={set('build_type')}
                  showCustom
                  customValue={data.build_type_custom}
                  onCustomChange={set('build_type_custom')}
                />
              </SectionCard>

              <SectionCard title="HOSTING">
                <CardSelect
                  options={HOSTING_OPTIONS}
                  value={data.hosting}
                  onChange={set('hosting')}
                  showCustom
                  customValue={data.hosting_custom}
                  onCustomChange={set('hosting_custom')}
                />
              </SectionCard>

              <SectionCard title="DOMAIN">
                <Field label="Domain-Situation">
                  <TogglePair
                    options={[
                      { value: false, label: 'Bestehende Domain' },
                      { value: true,  label: 'Neue Domain registrieren' },
                    ]}
                    value={data.domain_new}
                    onChange={set('domain_new')}
                  />
                </Field>
                {data.domain_new === false && (
                  <Field label="Domain-URL">
                    <TextInput
                      value={data.domain_url}
                      onChange={set('domain_url')}
                      placeholder="www.beispiel.de"
                    />
                  </Field>
                )}
              </SectionCard>

              <SectionCard title="BUDGET & NOTIZEN">
                <Field label="Projektwert (€) — optional">
                  <TextInput value={data.project_value} onChange={set('project_value')} type="number" placeholder="z.B. 3500" />
                </Field>
                <Field label="Notizen / Besonderes">
                  <textarea
                    value={data.notes || ''}
                    onChange={e => set('notes')(e.target.value)}
                    placeholder="Besondere Anforderungen, Hinweise…"
                    rows={3}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '9px 12px',
                      border: '1.5px solid #E5E5EA',
                      borderRadius: '10px',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'none',
                      fontFamily: 'inherit',
                      color: '#1D1D1F',
                    }}
                    onFocus={e => e.target.style.borderColor = '#0071E3'}
                    onBlur={e => e.target.style.borderColor = '#E5E5EA'}
                  />
                </Field>
              </SectionCard>

              {/* Summary */}
              <div style={{
                padding: '16px',
                borderRadius: '14px',
                background: 'rgba(0,113,227,0.05)',
                border: '1px solid rgba(0,113,227,0.15)',
              }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#0071E3', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Wird erstellt
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    { label: 'Kunde', value: data.company_name },
                    { label: 'Projekt', value: data.project_name || autoProjectName() },
                    data.project_type && { label: 'Typ', value: data.project_type === 'custom' ? data.project_type_custom : PROJECT_TYPES.find(t => t.value === data.project_type)?.label },
                    data.pages?.length > 0 && { label: 'Seiten', value: `${data.pages.length} ausgewählt` },
                    data.build_type && { label: 'Build', value: BUILD_TYPES.find(b => b.value === data.build_type)?.label || data.build_type },
                    data.project_value && { label: 'Budget', value: `${Number(data.project_value).toLocaleString('de-DE')} €` },
                  ].filter(Boolean).map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      <div style={{
                        width: '16px', height: '16px', borderRadius: '50%',
                        background: '#34C759',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Check size={9} color="#fff" strokeWidth={3} />
                      </div>
                      <span style={{ color: '#6E6E73' }}>{item.label}:</span>
                      <span style={{ fontWeight: 600, color: '#1D1D1F' }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Bottom nav ── */}
      <div style={{
        background: '#fff',
        borderTop: '1px solid #F2F2F7',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <button
          type="button"
          onClick={() => setStep(s => Math.max(s - 1, 0))}
          disabled={step === 0}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '9px 16px',
            borderRadius: '10px',
            border: '1.5px solid #E5E5EA',
            background: '#fff',
            fontSize: '14px', fontWeight: 500,
            color: step === 0 ? '#C7C7CC' : '#3C3C43',
            cursor: step === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          <ChevronLeft size={16} /> Zurück
        </button>

        <span style={{ fontSize: '12px', color: '#8E8E93' }}>
          Schritt {step + 1} von {STEPS.length}
        </span>

        {!isLastStep ? (
          <button
            type="button"
            onClick={next}
            disabled={!canNext()}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '9px 20px',
              borderRadius: '10px',
              border: 'none',
              background: canNext() ? '#0071E3' : '#E5E5EA',
              color: canNext() ? '#fff' : '#8E8E93',
              fontSize: '14px', fontWeight: 600,
              cursor: canNext() ? 'pointer' : 'not-allowed',
              transition: 'background 0.15s',
            }}
          >
            Weiter <ChevronRight size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCreate}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '9px 20px',
              borderRadius: '10px',
              border: 'none',
              background: loading ? '#E5E5EA' : '#0071E3',
              color: loading ? '#8E8E93' : '#fff',
              fontSize: '14px', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
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
