import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, User, Mail, Phone, MapPin, Globe, ChevronRight, ChevronLeft,
  Check, Sparkles, Layers, Settings, DollarSign, FileText, Zap, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { clientsApi } from '../api/clients';
import { projectsApi } from '../api/projects';
import { onboardingApi } from '../api/onboarding';

// ── Constants ─────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  { value: 'handwerk',    label: 'Handwerk' },
  { value: 'coaching',    label: 'Coaching' },
  { value: 'ecommerce',   label: 'E-Commerce' },
  { value: 'gastronomie', label: 'Gastronomie' },
  { value: 'immobilien',  label: 'Immobilien' },
  { value: 'medizin',     label: 'Medizin / Gesundheit' },
  { value: 'recht',       label: 'Recht / Kanzlei' },
  { value: 'it',          label: 'IT / Software' },
  { value: 'marketing',   label: 'Marketing / Agentur' },
  { value: 'bildung',     label: 'Bildung / Training' },
  { value: 'beauty',      label: 'Beauty / Wellness' },
  { value: 'sonstiges',   label: 'Sonstiges' },
];

const PROJECT_TYPES = [
  { value: 'website_code', label: 'Website (Code)',    desc: 'React, Next.js, HTML/CSS' },
  { value: 'website_wix',  label: 'Website (Wix)',     desc: 'Wix Editor / Wix Studio' },
  { value: 'webflow',      label: 'Website (Webflow)', desc: 'Webflow Designer' },
  { value: 'funnel',       label: 'Sales Funnel',      desc: 'Landing Page + Conversion' },
];

const GOALS = [
  { value: 'leads',     label: 'Leads generieren'  },
  { value: 'bookings',  label: 'Buchungen erhalten' },
  { value: 'sales',     label: 'Produkte verkaufen' },
  { value: 'branding',  label: 'Marke aufbauen'    },
  { value: 'portfolio', label: 'Portfolio zeigen'   },
];

const PAGES = [
  { value: 'home',       label: 'Startseite',    icon: '🏠' },
  { value: 'about',      label: 'Über uns',       icon: '👤' },
  { value: 'services',   label: 'Leistungen',     icon: '⚡' },
  { value: 'contact',    label: 'Kontakt',         icon: '✉️' },
  { value: 'blog',       label: 'Blog',            icon: '📝' },
  { value: 'faq',        label: 'FAQ',             icon: '❓' },
  { value: 'references', label: 'Referenzen',      icon: '⭐' },
  { value: 'shop',       label: 'Shop',            icon: '🛒' },
];

const FEATURES = [
  { value: 'contact_form',  label: 'Kontaktformular',  icon: '📩' },
  { value: 'booking',       label: 'Buchungssystem',   icon: '📅' },
  { value: 'whatsapp',      label: 'WhatsApp-Button',  icon: '💬' },
  { value: 'live_chat',     label: 'Live Chat',        icon: '🗨️' },
  { value: 'newsletter',    label: 'Newsletter',       icon: '📬' },
  { value: 'login',         label: 'Login-Bereich',    icon: '🔐' },
  { value: 'multilingual',  label: 'Mehrsprachig',     icon: '🌍' },
  { value: 'seo',           label: 'SEO',              icon: '🔍' },
  { value: 'tracking',      label: 'Analytics/Tracking',icon: '📊' },
  { value: 'dsgvo',         label: 'DSGVO-Paket',      icon: '🛡️' },
];

const BUILD_TYPES = [
  { value: 'claude_code',  label: 'Claude Code',  desc: 'KI-gestützte Entwicklung' },
  { value: 'manual_code',  label: 'Manual Code',  desc: 'Klassische Entwicklung' },
  { value: 'wix',          label: 'Wix',           desc: 'Wix Editor / Studio' },
  { value: 'webflow',      label: 'Webflow',       desc: 'Webflow Designer' },
];

const HOSTING_OPTIONS = [
  { value: 'vercel',     label: 'Vercel',      desc: 'Optimal für Code-Projekte' },
  { value: 'hostinger',  label: 'Hostinger',   desc: 'Günstig & zuverlässig' },
  { value: 'netlify',    label: 'Netlify',     desc: 'JAMstack & Serverless' },
  { value: 'client',     label: 'Beim Kunden', desc: 'Kundeneigenes Hosting' },
];

const TIMELINES = [
  { value: '1_week',   label: '1 Woche'    },
  { value: '2_weeks',  label: '2 Wochen'   },
  { value: '1_month',  label: '1 Monat'    },
  { value: '2_months', label: '2 Monate'   },
  { value: '3_months', label: '3+ Monate'  },
];

const STEPS = [
  { key: 'client',    label: 'Kunde',     icon: User     },
  { key: 'project',   label: 'Projekt',   icon: FileText },
  { key: 'structure', label: 'Seiten',    icon: Layers   },
  { key: 'features',  label: 'Features',  icon: Zap      },
  { key: 'tech',      label: 'Technik',   icon: Settings },
  { key: 'budget',    label: 'Budget',    icon: DollarSign },
];

// ── Task generation ────────────────────────────────────────────────────────────

function generateTasks(data) {
  const tasks = [];
  const add = (title) => tasks.push(title);

  // Always
  add('Kickoff-Meeting planen');
  add('Briefing & Anforderungen dokumentieren');

  // Build type
  if (data.build_type === 'claude_code' || data.build_type === 'manual_code') {
    add('GitHub Repository anlegen');
    add('Entwicklungsumgebung einrichten');
    add('Basis-Layout & Design entwickeln');
    add('Responsive Design implementieren');
    add('Staging-Deployment einrichten');
  }
  if (data.build_type === 'wix') {
    add('Wix-Konto einrichten');
    add('Template auswählen & anpassen');
    add('Wix Design konfigurieren');
  }
  if (data.build_type === 'webflow') {
    add('Webflow-Projekt anlegen');
    add('Webflow Design implementieren');
  }

  // Pages
  const pageLabels = {
    home: 'Startseite gestalten', about: 'Über-uns-Seite gestalten',
    services: 'Leistungsseite gestalten', contact: 'Kontaktseite gestalten',
    blog: 'Blog aufsetzen', faq: 'FAQ-Seite erstellen',
    references: 'Referenzen-Seite erstellen', shop: 'Shop-Seite einrichten',
  };
  (data.pages || []).forEach(p => { if (pageLabels[p]) add(pageLabels[p]); });

  // Features
  if (data.features?.includes('contact_form'))  add('Kontaktformular integrieren');
  if (data.features?.includes('booking'))        add('Buchungssystem integrieren');
  if (data.features?.includes('whatsapp'))       add('WhatsApp-Button einbinden');
  if (data.features?.includes('live_chat'))      add('Live-Chat einbinden');
  if (data.features?.includes('newsletter'))     add('Newsletter-System einbinden');
  if (data.features?.includes('login'))          add('Login-Bereich einrichten');
  if (data.features?.includes('multilingual'))   add('Mehrsprachigkeit konfigurieren');
  if (data.features?.includes('seo'))            add('On-Page SEO-Optimierung durchführen');
  if (data.features?.includes('tracking'))       add('Google Analytics / Tracking einrichten');
  if (data.features?.includes('dsgvo')) {
    add('Datenschutzerklärung erstellen');
    add('Impressum einpflegen');
    add('Cookie-Banner einbinden');
  }

  // Hosting
  if (data.hosting === 'vercel' || data.hosting === 'netlify') {
    add('Live-Deployment & Domain verknüpfen');
  }
  if (data.domain_new) add('Domain registrieren & konfigurieren');

  // Always at end
  add('Browser- & Gerätetest durchführen');
  add('Kundenabnahme & Feedback einarbeiten');
  add('Übergabe & Zugänge dokumentieren');

  return tasks;
}

// ── Onboarding step generation ────────────────────────────────────────────────

function generateOnboardingSteps(data) {
  const steps = [
    { type: 'text',  title: 'Über Ihr Unternehmen', description: 'Beschreiben Sie kurz, was Ihr Unternehmen macht und welche Probleme Sie lösen.' },
    { type: 'text',  title: 'Ihre Zielgruppe',      description: 'Wer sind Ihre idealen Kunden? Alter, Branche, Bedürfnisse.' },
    { type: 'file_upload',  title: 'Logo & Bilder',         description: 'Laden Sie Ihr Logo und Bilder hoch (PNG, JPG, SVG).' },
    { type: 'text',  title: 'Markenfarben',          description: 'Welche Farben sollen verwendet werden? (z.B. #FFFFFF, Dunkelblau, Grün)' },
    { type: 'text',  title: 'Wunsch-Websites',       description: 'Teilen Sie 2-3 Website-Links, die Ihnen gefallen.' },
  ];

  if (data.pages?.includes('services')) {
    steps.push({ type: 'text', title: 'Ihre Leistungen', description: 'Nennen Sie alle Leistungen, die auf der Website erscheinen sollen (Titel + kurze Beschreibung).' });
  }
  if (data.pages?.includes('about')) {
    steps.push({ type: 'text', title: 'Über Sie / Das Team', description: 'Wer steht hinter dem Unternehmen? Kurze Bio + ggf. Foto.' });
  }
  if (data.pages?.includes('references')) {
    steps.push({ type: 'text', title: 'Referenzen / Kundenstimmen', description: 'Haben Sie Kundenstimmen oder Projektreferenzen, die wir verwenden dürfen?' });
  }
  if (data.features?.includes('contact_form')) {
    steps.push({ type: 'text', title: 'Kontaktdaten', description: 'Welche E-Mail-Adresse, Telefonnummer und Adresse soll auf der Website erscheinen?' });
  }
  steps.push({ type: 'text', title: 'Besondere Wünsche', description: 'Gibt es spezielle Anforderungen oder Hinweise, die wir beachten sollen?' });

  return steps;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ToggleChip({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
        selected
          ? 'bg-gray-900 border-gray-900 text-white'
          : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'
      }`}
    >
      {children}
    </button>
  );
}

function CardOption({ selected, onClick, title, desc, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
        selected
          ? 'border-gray-900 bg-gray-50'
          : 'border-gray-100 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
        </div>
        <div className="flex items-center gap-2">
          {badge && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">{badge}</span>}
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
            selected ? 'border-gray-900 bg-gray-900' : 'border-gray-300'
          }`}>
            {selected && <Check size={10} className="text-white" strokeWidth={3} />}
          </div>
        </div>
      </div>
    </button>
  );
}

function FeatureChip({ value, label, icon, selected, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(value)}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
        selected
          ? 'border-gray-900 bg-gray-900 text-white'
          : 'border-gray-100 bg-white text-gray-700 hover:border-gray-300'
      }`}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}

function Input({ label, value, onChange, type = 'text', placeholder, required }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        className="input w-full"
        placeholder={placeholder}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

// ── Main Wizard ────────────────────────────────────────────────────────────────

const INITIAL = {
  // Step 1 - Client
  company_name: '', contact_person: '', email: '', phone: '',
  address: '', industry: '', company_size: '', has_website: null, website_url: '',
  // Step 2 - Project
  project_name: '', project_type: '', goal: '',
  // Step 3 - Structure
  pages: ['home', 'contact'],
  // Step 4 - Features
  features: ['contact_form', 'dsgvo'],
  // Step 5 - Tech
  build_type: '', hosting: '', domain_new: false,
  // Step 6 - Budget
  project_value: '', timeline: '',
};

export default function Wizard() {
  const navigate = useNavigate();
  const [step, setStep]     = useState(0);
  const [data, setData]     = useState(INITIAL);
  const [loading, setLoading] = useState(false);

  const set = (key) => (val) => setData(d => ({ ...d, [key]: val }));
  const toggleArr = (key, val) => setData(d => {
    const arr = d[key] || [];
    return { ...d, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] };
  });

  // Auto-generate project name when client name or type changes
  const autoProjectName = () => {
    if (!data.company_name) return '';
    const typeMap = { website_code: 'Website', website_wix: 'Website', webflow: 'Website', funnel: 'Funnel' };
    const typePart = typeMap[data.project_type] || 'Projekt';
    const year = new Date().getFullYear();
    return `${data.company_name} – ${typePart} ${year}`;
  };

  const canNext = () => {
    if (step === 0) return data.company_name.trim() && data.email.trim();
    if (step === 1) return data.project_type && data.goal;
    if (step === 2) return data.pages.length > 0;
    if (step === 3) return true;
    if (step === 4) return data.build_type && data.hosting;
    if (step === 5) return true;
    return true;
  };

  const next = () => {
    if (step === 1 && !data.project_name) {
      setData(d => ({ ...d, project_name: autoProjectName() }));
    }
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => setStep(s => Math.max(s - 1, 0));

  const handleCreate = async () => {
    if (!data.company_name.trim()) return toast.error('Unternehmensname fehlt');
    setLoading(true);
    try {
      // 1. Create client
      const clientRes = await clientsApi.create({
        company_name:   data.company_name.trim(),
        contact_person: data.contact_person.trim(),
        email:          data.email.trim(),
        phone:          data.phone.trim(),
        address:        data.address.trim(),
        industry:       data.industry,
        website:        data.website_url.trim() || null,
      });
      const client = clientRes.data;

      // 2. Create project
      const projectName = data.project_name || autoProjectName();
      const project = await projectsApi.create({
        client_id:    client.id,
        name:         projectName,
        type:         data.project_type || null,
        build_type:   data.build_type || null,
        hosting_provider: data.hosting || null,
        status:       'planned',
        budget:       data.project_value ? parseFloat(data.project_value) : null,
      });

      // 3. Generate & create tasks
      const taskTitles = generateTasks(data);
      for (const title of taskTitles) {
        await projectsApi.createTask(project.id, { title });
      }

      // 4. Create onboarding flow
      const obSteps = generateOnboardingSteps(data);
      const template = await onboardingApi.createTemplate({
        name:       `${data.company_name} – Onboarding`,
        brand_name: data.company_name,
      });
      for (let i = 0; i < obSteps.length; i++) {
        await onboardingApi.addStep(template.id, {
          ...obSteps[i],
          position: i,
          config: '{}',
        });
      }
      await onboardingApi.createFlow({
        template_id: template.id,
        client_id:   client.id,
        project_id:  project.id,
      });

      toast.success('Projekt erfolgreich erstellt!');
      navigate(`/projects/${project.id}`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Fehler beim Erstellen');
    } finally {
      setLoading(false);
    }
  };

  const progress = ((step) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-full bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Sparkles size={18} className="text-gray-700" />
          <span className="text-sm font-semibold text-gray-900">Neues Projekt einrichten</span>
        </div>
        <button onClick={() => navigate('/projects')} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-gray-100 shrink-0">
        <div
          className="h-full bg-gray-900 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="bg-white border-b border-gray-100 px-8 py-3 shrink-0">
        <div className="flex items-center gap-1 max-w-2xl mx-auto">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const active = i === step;
            return (
              <div key={s.key} className="flex items-center gap-1 flex-1">
                <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                  active ? 'text-gray-900' : done ? 'text-gray-500' : 'text-gray-300'
                }`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    done ? 'bg-gray-900' : active ? 'bg-gray-900' : 'bg-gray-100'
                  }`}>
                    {done
                      ? <Check size={10} className="text-white" strokeWidth={3} />
                      : <Icon size={10} className={active ? 'text-white' : 'text-gray-400'} />
                    }
                  </div>
                  <span className="hidden sm:block">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-1 ${i < step ? 'bg-gray-400' : 'bg-gray-100'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">

          {/* ── STEP 0: CLIENT ── */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Kundeninfo</h2>
                <p className="text-sm text-gray-400 mt-1">Grundlegende Daten zum neuen Kunden</p>
              </div>

              <div className="card space-y-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2"><Building2 size={12}/> Unternehmen</h3>
                <Input label="Unternehmensname" value={data.company_name} onChange={set('company_name')} placeholder="Muster GmbH" required />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Ansprechpartner" value={data.contact_person} onChange={set('contact_person')} placeholder="Max Mustermann" />
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Branche</label>
                    <select className="input w-full" value={data.industry} onChange={e => set('industry')(e.target.value)}>
                      <option value="">Branche wählen</option>
                      {INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Unternehmensgröße</label>
                    <select className="input w-full" value={data.company_size} onChange={e => set('company_size')(e.target.value)}>
                      <option value="">Größe wählen</option>
                      <option value="solo">Solopreneur</option>
                      <option value="small">1–10 Mitarbeiter</option>
                      <option value="medium">11–50 Mitarbeiter</option>
                      <option value="large">50+ Mitarbeiter</option>
                    </select>
                  </div>
                  <Input label="Adresse" value={data.address} onChange={set('address')} placeholder="Musterstraße 1, Berlin" />
                </div>
              </div>

              <div className="card space-y-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2"><Mail size={12}/> Kontakt</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="E-Mail" value={data.email} onChange={set('email')} type="email" placeholder="kontakt@firma.de" required />
                  <Input label="Telefon" value={data.phone} onChange={set('phone')} type="tel" placeholder="+49 30 123456" />
                </div>
              </div>

              <div className="card space-y-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2"><Globe size={12}/> Website</h3>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Hat der Kunde eine bestehende Website?</label>
                  <div className="flex gap-2">
                    <ToggleChip selected={data.has_website === true}  onClick={() => set('has_website')(true)}>Ja</ToggleChip>
                    <ToggleChip selected={data.has_website === false} onClick={() => set('has_website')(false)}>Nein</ToggleChip>
                  </div>
                </div>
                {data.has_website && (
                  <Input label="Website-URL" value={data.website_url} onChange={set('website_url')} placeholder="https://www.beispiel.de" />
                )}
              </div>
            </div>
          )}

          {/* ── STEP 1: PROJECT ── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Projektdetails</h2>
                <p className="text-sm text-gray-400 mt-1">Was soll gebaut werden?</p>
              </div>

              <div className="card space-y-4">
                <Input
                  label="Projektname"
                  value={data.project_name || autoProjectName()}
                  onChange={set('project_name')}
                  placeholder={autoProjectName() || 'z.B. Website Redesign 2026'}
                />
              </div>

              <div className="card space-y-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Projekttyp</h3>
                {PROJECT_TYPES.map(t => (
                  <CardOption
                    key={t.value}
                    selected={data.project_type === t.value}
                    onClick={() => set('project_type')(t.value)}
                    title={t.label}
                    desc={t.desc}
                  />
                ))}
              </div>

              <div className="card space-y-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Hauptziel</h3>
                <div className="flex flex-wrap gap-2">
                  {GOALS.map(g => (
                    <ToggleChip key={g.value} selected={data.goal === g.value} onClick={() => set('goal')(g.value)}>
                      {g.label}
                    </ToggleChip>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: STRUCTURE ── */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Website-Struktur</h2>
                <p className="text-sm text-gray-400 mt-1">Welche Seiten soll die Website haben?</p>
              </div>
              <div className="card">
                <div className="grid grid-cols-2 gap-2">
                  {PAGES.map(p => {
                    const sel = data.pages.includes(p.value);
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => toggleArr('pages', p.value)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                          sel
                            ? 'border-gray-900 bg-gray-900 text-white'
                            : 'border-gray-100 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <span>{p.icon}</span>
                        {p.label}
                        {sel && <Check size={13} className="ml-auto" strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-3 text-center">{data.pages.length} Seite{data.pages.length !== 1 ? 'n' : ''} ausgewählt</p>
              </div>
            </div>
          )}

          {/* ── STEP 3: FEATURES ── */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Features</h2>
                <p className="text-sm text-gray-400 mt-1">Welche Funktionen soll die Website haben?</p>
              </div>
              <div className="card">
                <div className="grid grid-cols-2 gap-2">
                  {FEATURES.map(f => (
                    <FeatureChip
                      key={f.value}
                      {...f}
                      selected={data.features.includes(f.value)}
                      onToggle={(v) => toggleArr('features', v)}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3 text-center">{data.features.length} Feature{data.features.length !== 1 ? 's' : ''} ausgewählt</p>
              </div>
            </div>
          )}

          {/* ── STEP 4: TECH ── */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Technisches Setup</h2>
                <p className="text-sm text-gray-400 mt-1">Wie wird die Website gebaut?</p>
              </div>

              <div className="card space-y-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Build-Methode</h3>
                {BUILD_TYPES.map(b => (
                  <CardOption
                    key={b.value}
                    selected={data.build_type === b.value}
                    onClick={() => set('build_type')(b.value)}
                    title={b.label}
                    desc={b.desc}
                    badge={b.value === 'claude_code' ? 'KI' : null}
                  />
                ))}
              </div>

              <div className="card space-y-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Hosting</h3>
                {HOSTING_OPTIONS.map(h => (
                  <CardOption
                    key={h.value}
                    selected={data.hosting === h.value}
                    onClick={() => set('hosting')(h.value)}
                    title={h.label}
                    desc={h.desc}
                  />
                ))}
              </div>

              <div className="card space-y-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Domain</h3>
                <div className="flex gap-2">
                  <ToggleChip selected={data.domain_new === false} onClick={() => set('domain_new')(false)}>Bestehende Domain</ToggleChip>
                  <ToggleChip selected={data.domain_new === true}  onClick={() => set('domain_new')(true)}>Neue Domain registrieren</ToggleChip>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 5: BUDGET ── */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Budget & Timeline</h2>
                <p className="text-sm text-gray-400 mt-1">Finanzieller Rahmen des Projekts</p>
              </div>

              <div className="card space-y-4">
                <Input
                  label="Projektwert (€)"
                  value={data.project_value}
                  onChange={set('project_value')}
                  type="number"
                  placeholder="z.B. 3500"
                />
              </div>

              <div className="card space-y-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Zeitrahmen</h3>
                <div className="flex flex-wrap gap-2">
                  {TIMELINES.map(t => (
                    <ToggleChip key={t.value} selected={data.timeline === t.value} onClick={() => set('timeline')(t.value)}>
                      {t.label}
                    </ToggleChip>
                  ))}
                </div>
              </div>

              {/* Summary preview */}
              <div className="card bg-gray-50 border border-gray-100 space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                  <Sparkles size={12} /> Wird erstellt
                </h3>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center"><Check size={9} className="text-emerald-600" strokeWidth={3}/></div>
                    Kunde: <span className="font-medium">{data.company_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center"><Check size={9} className="text-emerald-600" strokeWidth={3}/></div>
                    Projekt: <span className="font-medium">{data.project_name || autoProjectName()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center"><Check size={9} className="text-blue-600" strokeWidth={3}/></div>
                    <span className="font-medium">{generateTasks(data).length} Aufgaben</span> werden automatisch generiert
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <div className="w-4 h-4 rounded-full bg-violet-100 flex items-center justify-center"><Check size={9} className="text-violet-600" strokeWidth={3}/></div>
                    <span className="font-medium">Onboarding-Flow</span> mit {generateOnboardingSteps(data).length} Schritten
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Bottom nav */}
      <div className="bg-white border-t border-gray-100 px-8 py-4 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={back}
          disabled={step === 0}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} /> Zurück
        </button>

        <span className="text-xs text-gray-400">Schritt {step + 1} von {STEPS.length}</span>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={next}
            disabled={!canNext()}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Weiter <ChevronRight size={15} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCreate}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Erstelle…
              </>
            ) : (
              <>
                <Sparkles size={15} /> Projekt erstellen
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
