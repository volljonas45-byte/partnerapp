import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Pencil, Save, X, Plus, Trash2, Check,
  ExternalLink, CheckSquare, FileText, ClipboardList,
  CalendarDays, Euro, Building2, Globe, Server, Shield,
  CreditCard, Lock, Link as LinkIcon, MessageSquare,
  Activity, User, AlertTriangle, CheckCircle2, Clock,
  ChevronRight, Send, ChevronDown, GitBranch,
  Mail, Phone, MapPin,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsApi } from '../api/projects';
import { clientsApi } from '../api/clients';
import { legalApi } from '../api/legal';
import { workflowApi } from '../api/workflow';
import { PHASE_ORDER, PHASES } from '../components/workflow/workflowConfig';
import { formatCurrency, formatDate, isPast } from '../utils/formatters';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { useConfirm } from '../hooks/useConfirm';
import WorkflowPanel from '../components/workflow/WorkflowPanel';

// ── Health + Next Step ────────────────────────────────────────────────────────

function computeHealth(project) {
  if (project.status === 'completed') return 'good';
  if (project.deadline && isPast(project.deadline)) return 'critical';
  if (project.deadline) {
    const daysLeft = Math.floor((new Date(project.deadline) - new Date()) / 86400000);
    if (daysLeft <= 5) return 'warning';
  }
  if (project.status === 'waiting_for_client') return 'warning';
  return 'good';
}

const HEALTH_CONFIG = {
  good:     { label: 'Gut',      cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  warning:  { label: 'Achtung',  cls: 'bg-amber-50 text-amber-700 ring-amber-200',       dot: 'bg-amber-500'   },
  critical: { label: 'Kritisch', cls: 'bg-red-50 text-red-700 ring-red-200',             dot: 'bg-red-500'     },
};

const NEXT_STEP = {
  planned:            'Projekt starten und erste Aufgaben anlegen',
  active:             'Demo vorbereiten und beim Kunden einreichen',
  waiting_for_client: 'Auf Kundenfeedback warten',
  feedback:           'Kundenfeedback einarbeiten und überarbeiten',
  waiting:            'Abnahme abwarten und Rechnung vorbereiten',
  completed:          'Rechnung erstellen',
};

// ── Inline status dropdown ────────────────────────────────────────────────────

const STATUS_CFG = {
  planned:            { label: 'Geplant',        dot: 'bg-gray-400',  chip: 'bg-gray-100 text-gray-600'   },
  active:             { label: 'Demo',            dot: 'bg-blue-500',  chip: 'bg-blue-50 text-blue-700'    },
  waiting_for_client: { label: 'Überarbeitung',   dot: 'bg-amber-400', chip: 'bg-amber-50 text-amber-700'  },
  feedback:           { label: 'Überarbeitung',   dot: 'bg-amber-400', chip: 'bg-amber-50 text-amber-700'  },
  waiting:            { label: 'Fertigstellung',  dot: 'bg-amber-400', chip: 'bg-amber-50 text-amber-700'  },
  completed:          { label: 'Abgeschlossen',   dot: 'bg-green-500', chip: 'bg-green-50 text-green-700'  },
};
const STATUS_DROPDOWN_OPTIONS = ['planned','active','waiting_for_client','feedback','waiting','completed'];

function HeaderStatusDropdown({ status, onSelect }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CFG[status] || STATUS_CFG.planned;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.chip} hover:opacity-80 transition-opacity`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
        <ChevronDown size={11} className="opacity-60" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 text-sm">
            {STATUS_DROPDOWN_OPTIONS.map(key => {
              const c = STATUS_CFG[key];
              const isActive = status === key;
              return (
                <button
                  key={key}
                  onClick={() => { onSelect(key); setOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 transition-colors ${isActive ? 'font-medium' : ''}`}
                >
                  <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                  <span className={isActive ? 'text-gray-900' : 'text-gray-600'}>{c.label}</span>
                  {isActive && <span className="ml-auto text-gray-400">✓</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Option maps ───────────────────────────────────────────────────────────────
const TYPE_LABELS = {
  unternehmenswebsite: 'Unternehmenswebsite',
  portfolio:           'Portfolio',
  funnel:              'Sales Funnel',
  shop:                'Online-Shop',
  buchung:             'Buchungswebsite',
  blog:                'Blog / Magazine',
  community:           'Community / Verein',
  // legacy
  website_code: 'Website (Code)', website_wix: 'Website (Wix)',
  video: 'Video', content: 'Content', seo: 'SEO',
};
const BUILD_TYPE_LABELS    = { claude_code:'Claude Code', manual_code:'Manual Code', wix:'Wix', webflow:'Webflow' };
const FRONTEND_LABELS      = { nextjs:'Next.js', react:'React', html:'HTML' };
const HOSTING_LABELS       = { vercel:'Vercel', hostinger:'Hostinger', netlify:'Netlify' };
const HOSTING_OWNER_LABELS = { client:'Kunde', agency:'Agentur', mixed:'Gemischt' };
const DOMAIN_LABELS        = { namecheap:'Namecheap', godaddy:'GoDaddy', ionos:'IONOS', internal:'Intern' };
const DSGVO_LABELS         = { self_written:'Selbst geschrieben', it_kanzlei:'IT-Kanzlei', erecht24:'eRecht24' };
const BILLING_LABELS       = { one_time:'Einmalig', recurring:'Wiederkehrend' };
const PAYMENT_LABELS       = { unpaid:'Offen', partial:'Teilweise', paid:'Bezahlt' };
const CRED_TYPE_LABELS     = { password:'Passwort', guide:'Anleitung', other:'Sonstiges' };
const CRED_TYPE_STYLES     = {
  password: 'bg-red-50 text-red-600',
  guide:    'bg-blue-50 text-blue-600',
  other:    'bg-gray-100 text-gray-500',
};

const STATUS_OPTIONS        = ['planned','active','waiting','completed'];
const TYPE_OPTIONS          = ['','unternehmenswebsite','portfolio','funnel','shop','buchung','blog','community'];
const BUILD_OPTIONS         = ['','claude_code','manual_code','wix','webflow'];
const FRONTEND_OPTIONS      = ['','nextjs','react','html'];
const HOSTING_OPTIONS       = ['','vercel','hostinger','netlify'];
const HOSTING_OWNER_OPTIONS = ['','client','agency','mixed'];
const DOMAIN_OPTIONS        = ['','namecheap','godaddy','ionos','internal'];
const DSGVO_OPTIONS         = ['','self_written','it_kanzlei','erecht24'];
const BILLING_OPTIONS       = ['','one_time','recurring'];
const PAYMENT_OPTIONS       = ['','unpaid','partial','paid'];
const CRED_TYPE_OPTIONS     = ['password','guide','other'];

const TASK_STATUSES = ['todo','doing','done'];
const TASK_LABELS   = { todo:'Offen', doing:'In Arbeit', done:'Fertig' };

const CHECKLIST_LABELS = {
  domain_connected:    'Domain verbunden',
  imprint_added:       'Impressum eingetragen',
  privacy_policy_added:'Datenschutz eingetragen',
  mobile_optimized:    'Mobile optimiert',
  tracking_installed:  'Tracking installiert',
  client_access_given: 'Kundenzugang übergeben',
};

const TABS = [
  { key: 'workflow',  label: 'Workflow',  icon: GitBranch },
  { key: 'overview',  label: 'Übersicht' },
  { key: 'setup',     label: 'Setup'     },
  { key: 'tasks',     label: 'Aufgaben'  },
  { key: 'notes',     label: 'Notizen'   },
  { key: 'finance',   label: 'Finanzen'  },
  { key: 'access',    label: 'Zugang'    },
  { key: 'activity',  label: 'Aktivität' },
];

// ── Field components ──────────────────────────────────────────────────────────
function SelectField({ label, value, options, labelMap, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <select className="input w-full text-sm" value={value || ''} onChange={e => onChange(e.target.value)}>
        <option value="">—</option>
        {options.filter(Boolean).map(o => (
          <option key={o} value={o}>{labelMap[o] || o}</option>
        ))}
      </select>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder = '', type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        className="input w-full text-sm"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function TextAreaField({ label, value, onChange, placeholder = '', rows = 3 }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <textarea
        className="input w-full text-sm resize-none"
        rows={rows}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 w-40 shrink-0">{label}</span>
      <span className="text-sm text-gray-700 text-right break-all">{value}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ProjectDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const qc       = useQueryClient();
  const { confirm, ConfirmDialogNode } = useConfirm();

  const [activeTab,         setActiveTab]         = useState('workflow');
  const [newTask,           setNewTask]           = useState('');
  const [newNote,           setNewNote]           = useState('');
  const [newChecklistItem,  setNewChecklistItem]  = useState('');

  // Per-section edit state
  const [editSection, setEditSection] = useState(null);
  const [editForm,    setEditForm]    = useState({});

  // New credential form state
  const [showCredForm,  setShowCredForm]  = useState(false);
  const [credForm,      setCredForm]      = useState({ label: '', type: 'password', link: '', note: '' });
  const [editingCredId, setEditingCredId] = useState(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: project, isLoading } = useQuery({
    queryKey: ['projects', id],
    queryFn: () => projectsApi.get(id).then(r => r.data),
  });

  const { data: workflow } = useQuery({
    queryKey: ['workflow', id],
    queryFn: () => workflowApi.get(id).then(r => r.data),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list().then(r => r.data),
  });

  const clientDbId = project?.client_id;
  const { data: clientLegal } = useQuery({
    queryKey: ['legal', clientDbId],
    queryFn: () => legalApi.get(clientDbId),
    enabled: !!clientDbId,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['projects', id, 'invoices'],
    queryFn: () => projectsApi.getInvoices(id).then(r => r.data),
    enabled: activeTab === 'finance',
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['projects', id, 'quotes'],
    queryFn: () => projectsApi.getQuotes(id).then(r => r.data),
    enabled: activeTab === 'finance',
  });

  const { data: credentials = [] } = useQuery({
    queryKey: ['projects', id, 'credentials'],
    queryFn: () => projectsApi.getCredentials(id).then(r => r.data),
    enabled: activeTab === 'access',
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['projects', id, 'notes'],
    queryFn: () => projectsApi.getNotes(id).then(r => r.data),
    enabled: activeTab === 'notes',
  });

  const { data: activity = [] } = useQuery({
    queryKey: ['projects', id, 'activity'],
    queryFn: () => projectsApi.getActivity(id).then(r => r.data),
    enabled: activeTab === 'activity',
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: (data) => projectsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', id] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      setEditSection(null);
      toast.success('Gespeichert');
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler'),
  });

  const checklistMutation = useMutation({
    mutationFn: ({ key, checked }) => projectsApi.toggleChecklist(id, key, checked),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', id] }),
  });

  const addChecklistMutation = useMutation({
    mutationFn: (label) => projectsApi.addChecklist(id, label),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects', id] }); setNewChecklistItem(''); },
    onError: () => toast.error('Fehler beim Hinzufügen'),
  });

  const deleteChecklistMutation = useMutation({
    mutationFn: (key) => projectsApi.deleteChecklist(id, key),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', id] }),
  });

  const workflowUpdateMutation = useMutation({
    mutationFn: (data) => workflowApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow', id] }),
  });

  function toggleWorkflowTask(phaseKey, taskKey, currentVal) {
    const pd = workflow?.phase_data || {};
    workflowUpdateMutation.mutate({
      phase_data: {
        ...pd,
        [phaseKey]: { ...pd[phaseKey], tasks: { ...(pd[phaseKey]?.tasks || {}), [taskKey]: !currentVal } },
      },
    });
  }

  const createTaskMutation = useMutation({
    mutationFn: (title) => projectsApi.createTask(id, { title }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects', id] }); setNewTask(''); },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }) => projectsApi.updateTask(id, taskId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', id] }),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId) => projectsApi.deleteTask(id, taskId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', id] }),
  });

  const createCredMutation = useMutation({
    mutationFn: (data) => projectsApi.createCredential(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', id, 'credentials'] });
      setCredForm({ label: '', type: 'password', link: '', note: '' });
      setShowCredForm(false);
      toast.success('Eintrag hinzugefügt');
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler'),
  });

  const updateCredMutation = useMutation({
    mutationFn: ({ credId, data }) => projectsApi.updateCredential(id, credId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', id, 'credentials'] });
      setEditingCredId(null);
      toast.success('Gespeichert');
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler'),
  });

  const deleteCredMutation = useMutation({
    mutationFn: (credId) => projectsApi.deleteCredential(id, credId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', id, 'credentials'] });
      toast.success('Eintrag gelöscht');
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: (content) => projectsApi.addNote(id, { content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', id, 'notes'] });
      qc.invalidateQueries({ queryKey: ['projects', id, 'activity'] });
      setNewNote('');
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler'),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (nId) => projectsApi.deleteNote(id, nId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', id, 'notes'] }),
  });

  // ── Handlers ─────────────────────────────────────────────────────────────
  const startEdit = (section) => {
    if (!project) return;
    setEditForm({
      ...project,
      client_id: project.client_id ?? '',
    });
    setEditSection(section);
  };

  const saveSection = () => updateMutation.mutate(editForm);
  const cancelEdit  = () => setEditSection(null);
  const set = (key) => (val) => setEditForm(f => ({ ...f, [key]: val }));

  const cycleTask = (task) => {
    const next = TASK_STATUSES[(TASK_STATUSES.indexOf(task.status) + 1) % TASK_STATUSES.length];
    updateTaskMutation.mutate({ taskId: task.id, data: { status: next } });
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    createTaskMutation.mutate(newTask.trim());
  };

  const handleAddCred = (e) => {
    e.preventDefault();
    if (!credForm.label.trim()) return toast.error('Bezeichnung ist erforderlich');
    if (!credForm.link.trim()) return toast.error('Sicherer Link ist erforderlich');
    createCredMutation.mutate(credForm);
  };

  const startEditCred = (cred) => {
    setEditingCredId(cred.id);
    setCredForm({ label: cred.label, type: cred.type, link: cred.link || '', note: cred.note || '' });
  };

  const saveEditCred = () => {
    if (!credForm.label.trim()) return toast.error('Bezeichnung ist erforderlich');
    updateCredMutation.mutate({ credId: editingCredId, data: credForm });
  };

  const cancelEditCred = () => { setEditingCredId(null); setCredForm({ label: '', type: 'password', link: '', note: '' }); };

  if (isLoading) return <LoadingSpinner className="h-64" />;
  if (!project)  return <div className="p-8 text-sm text-gray-500">Projekt nicht gefunden.</div>;

  const tasks     = project.tasks     || [];
  const checklist = project.checklist || [];
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const checkMap  = Object.fromEntries(checklist.map(c => [c.key, c.checked]));

  const health    = computeHealth(project);
  const healthCfg = HEALTH_CONFIG[health];
  const nextStep  = project.deadline && isPast(project.deadline)
    ? { text: 'Deadline überschritten – dringend klären', urgent: true }
    : { text: NEXT_STEP[project.status] || 'Status aktualisieren', urgent: false };

  const EditBar = ({ section }) => editSection === section ? (
    <div className="flex gap-2">
      <button onClick={cancelEdit} className="btn-secondary py-1 px-3 text-xs"><X size={13}/> Abbrechen</button>
      <button onClick={saveSection} disabled={updateMutation.isPending} className="btn-primary py-1 px-3 text-xs">
        <Save size={13}/> Speichern
      </button>
    </div>
  ) : (
    <button onClick={() => startEdit(section)} className="btn-secondary py-1 px-3 text-xs">
      <Pencil size={13}/> Bearbeiten
    </button>
  );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/websites')} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-gray-900">{project.name}</h1>
              {project.type && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                  {TYPE_LABELS[project.type] || project.type}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{project.client_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(() => {
            const phase = workflow?.current_phase;
            const cfg = phase ? PHASES[phase] : null;
            const isLast = phase === PHASE_ORDER[PHASE_ORDER.length - 1];
            return (
              <span style={{
                padding: '3px 10px',
                borderRadius: '99px',
                fontSize: '12px',
                fontWeight: 600,
                background: isLast ? 'rgba(52,199,89,0.12)' : 'rgba(0,113,227,0.10)',
                color: isLast ? '#34C759' : '#0071E3',
              }}>
                {cfg?.label || 'Start'}
              </span>
            );
          })()}
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ring-1 ${healthCfg.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${healthCfg.dot}`} />
            {healthCfg.label}
          </span>
        </div>
      </div>

      {/* Next step banner */}
      <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl mb-5 text-sm ${nextStep.urgent ? 'bg-red-50 border border-red-100' : 'bg-gray-50 border border-gray-100'}`}>
        {nextStep.urgent
          ? <AlertTriangle size={14} className="text-red-500 shrink-0" />
          : <ChevronRight size={14} className="text-gray-400 shrink-0" />
        }
        <span className={nextStep.urgent ? 'text-red-700 font-medium' : 'text-gray-600'}>
          <span className="font-semibold text-gray-500 text-xs uppercase tracking-wide mr-2">Nächster Schritt</span>
          {nextStep.text}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200 mb-6">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${
              activeTab === tab.key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon && <tab.icon size={13} />}
            {tab.label}
            {tab.key === 'tasks' && tasks.length > 0 && (
              <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                {doneTasks}/{tasks.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── WORKFLOW ──────────────────────────────────────────────────────── */}
      {activeTab === 'workflow' && (
        <WorkflowPanel projectId={id} projectName={project?.name} />
      )}

      {/* ── OVERVIEW ──────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Projektinfo</h2>
              <EditBar section="overview" />
            </div>

            {editSection === 'overview' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Projektname</label>
                    <input className="input w-full text-sm" value={editForm.name || ''} onChange={e => set('name')(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Kunde</label>
                    <select className="input w-full text-sm" value={editForm.client_id || ''} onChange={e => set('client_id')(e.target.value ? Number(e.target.value) : null)}>
                      <option value="">— Kein Kunde</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <SelectField label="Status" value={editForm.status} options={STATUS_OPTIONS} labelMap={{planned:'Geplant',active:'Aktiv',waiting:'Wartend',completed:'Abgeschlossen'}} onChange={set('status')} />
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Projekttyp</label>
                    <select className="input w-full text-sm" value={editForm.type || ''} onChange={e => set('type')(e.target.value || null)}>
                      <option value="">—</option>
                      {TYPE_OPTIONS.filter(Boolean).map(o => (
                        <option key={o} value={o}>{TYPE_LABELS[o] || o}</option>
                      ))}
                      {/* custom type not in list */}
                      {editForm.type && !TYPE_OPTIONS.includes(editForm.type) && (
                        <option value={editForm.type}>{editForm.type}</option>
                      )}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <TextField label="Startdatum" value={editForm.start_date} onChange={set('start_date')} type="date" />
                  <TextField label="Deadline"   value={editForm.deadline}   onChange={set('deadline')}   type="date" />
                </div>
                <TextField label="Budget (€)" value={editForm.budget} onChange={set('budget')} type="number" placeholder="0.00" />
                <TextField label="Zuständig" value={editForm.assignee} onChange={set('assignee')} placeholder="Name der zuständigen Person" />
                <TextAreaField label="Beschreibung" value={editForm.description} onChange={set('description')} />
              </div>
            ) : (
              <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div>
                  <dt className="flex items-center gap-1 text-xs text-gray-400 mb-0.5"><Building2 size={11}/>Kunde</dt>
                  <dd className="text-gray-900 font-medium">{project.client_name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5">Workflow-Phase</dt>
                  <dd>
                    {(() => {
                      const phase = workflow?.current_phase;
                      const phaseIdx = phase ? PHASE_ORDER.indexOf(phase) : 0;
                      const total = PHASE_ORDER.length;
                      const cfg = phase ? PHASES[phase] : null;
                      return (
                        <div>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '2px 10px', borderRadius: '99px',
                            background: phase === 'abgeschlossen' ? 'rgba(52,199,89,0.12)' : 'rgba(0,113,227,0.10)',
                            color: phase === 'abgeschlossen' ? '#34C759' : '#0071E3',
                            fontSize: '12px', fontWeight: 600,
                          }}>
                            {cfg?.label || 'Demo'}
                          </span>
                          <div style={{ marginTop: '5px', height: '3px', background: '#F2F2F7', borderRadius: '2px', width: '100px' }}>
                            <div style={{
                              height: '100%', borderRadius: '2px',
                              background: phase === 'abgeschlossen' ? '#34C759' : '#0071E3',
                              width: `${Math.round(((phaseIdx + 1) / total) * 100)}%`,
                              transition: 'width 0.3s',
                            }} />
                          </div>
                          <span style={{ fontSize: '10px', color: '#8E8E93', marginTop: '2px', display: 'block' }}>
                            Schritt {phaseIdx + 1} von {total}
                          </span>
                        </div>
                      );
                    })()}
                  </dd>
                </div>
                {project.start_date && (
                  <div>
                    <dt className="flex items-center gap-1 text-xs text-gray-400 mb-0.5"><CalendarDays size={11}/>Startdatum</dt>
                    <dd className="text-gray-700">{formatDate(project.start_date)}</dd>
                  </div>
                )}
                {project.deadline && (
                  <div>
                    <dt className="flex items-center gap-1 text-xs text-gray-400 mb-0.5"><CalendarDays size={11}/>Deadline</dt>
                    <dd className="text-gray-700">{formatDate(project.deadline)}</dd>
                  </div>
                )}
                {project.budget != null && (
                  <div>
                    <dt className="flex items-center gap-1 text-xs text-gray-400 mb-0.5"><Euro size={11}/>Budget</dt>
                    <dd className="text-gray-700">{formatCurrency(project.budget)}</dd>
                  </div>
                )}
                {project.assignee && (
                  <div>
                    <dt className="flex items-center gap-1 text-xs text-gray-400 mb-0.5"><User size={11}/>Zuständig</dt>
                    <dd className="text-gray-700">{project.assignee}</dd>
                  </div>
                )}
                {project.description && (
                  <div className="col-span-2">
                    <dt className="text-xs text-gray-400 mb-0.5">Beschreibung</dt>
                    <dd className="text-gray-700 whitespace-pre-wrap">{project.description}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>

          {/* Client info card */}
          {project.client_id && (
            <div className="card" style={{ background: '#F9FAFB' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'rgba(0,113,227,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={13} color="#0071E3" />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#1D1D1F', letterSpacing: '-0.01em' }}>
                    {project.client_name}
                  </span>
                </div>
                <button
                  onClick={() => navigate(`/clients/${project.client_id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#0071E3', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,113,227,0.07)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  Kundenprofil <ChevronRight size={11} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {/* Kontakt */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <User size={13} color="#86868B" style={{ marginTop: '1px', flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: '10px', color: '#86868B', display: 'block', marginBottom: '2px' }}>ANSPRECHPARTNER</span>
                    <span style={{ fontSize: '13px', color: '#1D1D1F', fontWeight: '500' }}>{project.contact_person || '–'}</span>
                  </div>
                </div>
                {/* E-Mail */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <Mail size={13} color="#86868B" style={{ marginTop: '1px', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '10px', color: '#86868B', display: 'block', marginBottom: '2px' }}>E-MAIL</span>
                    {project.client_email
                      ? <a href={`mailto:${project.client_email}`} style={{ fontSize: '13px', color: '#0071E3', fontWeight: '500', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{project.client_email}</a>
                      : <span style={{ fontSize: '13px', color: '#C7C7CC' }}>–</span>}
                  </div>
                </div>
                {/* Telefon */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <Phone size={13} color="#86868B" style={{ marginTop: '1px', flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: '10px', color: '#86868B', display: 'block', marginBottom: '2px' }}>TELEFON</span>
                    {project.client_phone
                      ? <a href={`tel:${project.client_phone}`} style={{ fontSize: '13px', color: '#1D1D1F', fontWeight: '500', textDecoration: 'none' }}>{project.client_phone}</a>
                      : <span style={{ fontSize: '13px', color: '#C7C7CC' }}>–</span>}
                  </div>
                </div>
                {/* Adresse */}
                {(project.client_city || project.client_address) && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <MapPin size={13} color="#86868B" style={{ marginTop: '1px', flexShrink: 0 }} />
                    <div>
                      <span style={{ fontSize: '10px', color: '#86868B', display: 'block', marginBottom: '2px' }}>ADRESSE</span>
                      <span style={{ fontSize: '13px', color: '#1D1D1F', fontWeight: '500', lineHeight: 1.4 }}>
                        {[project.client_address, [project.client_postal_code, project.client_city].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  </div>
                )}
                {/* USt-IdNr */}
                {clientLegal?.vat_id && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <Shield size={13} color="#86868B" style={{ marginTop: '1px', flexShrink: 0 }} />
                    <div>
                      <span style={{ fontSize: '10px', color: '#86868B', display: 'block', marginBottom: '2px' }}>UST-IDNR</span>
                      <span style={{ fontSize: '13px', color: '#1D1D1F', fontWeight: '500' }}>{clientLegal.vat_id}</span>
                    </div>
                  </div>
                )}
                {/* DSGVO */}
                {clientLegal?.dsgvo_provider && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <Shield size={13} color="#86868B" style={{ marginTop: '1px', flexShrink: 0 }} />
                    <div>
                      <span style={{ fontSize: '10px', color: '#86868B', display: 'block', marginBottom: '2px' }}>DSGVO</span>
                      <span style={{ fontSize: '13px', color: '#1D1D1F', fontWeight: '500' }}>{clientLegal.dsgvo_provider}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Aufgaben',   value: tasks.length          },
              { label: 'Erledigt',   value: doneTasks             },
              { label: 'Rechnungen', value: project.invoice_count },
              { label: 'Angebote',   value: project.quote_count   },
            ].map(s => (
              <div key={s.label} className="card text-center py-3">
                <p className="text-xl font-semibold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SETUP ─────────────────────────────────────────────────────────── */}
      {activeTab === 'setup' && (
        <div className="space-y-4">
          {/* Technical */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <Server size={13}/> Technisches Setup
              </h2>
              <EditBar section="setup" />
            </div>

            {editSection === 'setup' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <SelectField label="Build-Typ" value={editForm.build_type}       options={BUILD_OPTIONS}         labelMap={BUILD_TYPE_LABELS}    onChange={set('build_type')} />
                  <SelectField label="Frontend"  value={editForm.frontend}         options={FRONTEND_OPTIONS}      labelMap={FRONTEND_LABELS}       onChange={set('frontend')} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <SelectField label="Hosting-Provider" value={editForm.hosting_provider} options={HOSTING_OPTIONS}       labelMap={HOSTING_LABELS}        onChange={set('hosting_provider')} />
                  <SelectField label="Hosting-Inhaber"  value={editForm.hosting_owner}    options={HOSTING_OWNER_OPTIONS} labelMap={HOSTING_OWNER_LABELS}  onChange={set('hosting_owner')} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <SelectField label="Domain-Provider" value={editForm.domain_provider} options={DOMAIN_OPTIONS} labelMap={DOMAIN_LABELS} onChange={set('domain_provider')} />
                  <TextField   label="Domain"          value={editForm.domain_name}     onChange={set('domain_name')}     placeholder="example.com" />
                </div>
                <TextField label="Repository URL" value={editForm.repository_url} onChange={set('repository_url')} placeholder="https://github.com/…" />
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                <InfoRow label="Build-Typ"        value={BUILD_TYPE_LABELS[project.build_type]} />
                <InfoRow label="Frontend"         value={FRONTEND_LABELS[project.frontend]} />
                <InfoRow label="Hosting-Provider" value={HOSTING_LABELS[project.hosting_provider]} />
                <InfoRow label="Hosting-Inhaber"  value={HOSTING_OWNER_LABELS[project.hosting_owner]} />
                <InfoRow label="Domain-Provider"  value={DOMAIN_LABELS[project.domain_provider]} />
                <InfoRow label="Domain"           value={project.domain_name} />
                <InfoRow label="Repository"       value={project.repository_url} />
                {!project.build_type && !project.frontend && !project.hosting_provider && (
                  <p className="text-sm text-gray-400 py-2">Noch kein Setup eingetragen.</p>
                )}
              </div>
            )}
          </div>

          {/* Deployment */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <Globe size={13}/> Deployment
              </h2>
              {editSection !== 'setup' && <EditBar section="setup" />}
            </div>

            {editSection === 'setup' ? (
              <TextField label="Live-URL" value={editForm.live_url} onChange={set('live_url')} placeholder="https://example.com" />
            ) : (
              <div>
                {project.live_url ? (
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-xs text-gray-400 w-40 shrink-0">Live-URL</span>
                    <a href={project.live_url} target="_blank" rel="noreferrer"
                       className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                      {project.live_url} <ExternalLink size={11}/>
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 py-2">Noch kein Deployment eingetragen.</p>
                )}
              </div>
            )}
          </div>

          {/* Legal */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <Shield size={13}/> Rechtliches
              </h2>
              {editSection !== 'setup' && <EditBar section="setup" />}
            </div>
            {editSection === 'setup' ? (
              <SelectField label="DSGVO-Typ" value={editForm.dsgvo_type} options={DSGVO_OPTIONS} labelMap={DSGVO_LABELS} onChange={set('dsgvo_type')} />
            ) : (
              <div>
                <InfoRow label="DSGVO-Typ" value={DSGVO_LABELS[project.dsgvo_type]} />
                {!project.dsgvo_type && <p className="text-sm text-gray-400 py-2">Noch kein Rechtssetup eingetragen.</p>}
              </div>
            )}
          </div>

          {/* Checklist */}
        </div>
      )}

      {/* ── TASKS ─────────────────────────────────────────────────────────── */}
      {activeTab === 'tasks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Workflow-Aufgaben je Phase */}
          {PHASE_ORDER.map(phaseKey => {
            const phase = PHASES[phaseKey];
            if (!phase?.tasks?.length) return null;
            const phaseTasks = workflow?.phase_data?.[phaseKey]?.tasks || {};
            const decisions  = workflow?.decisions || {};
            const visibleTasks = phase.tasks.filter(t => !t.condition || t.condition(decisions));
            if (!visibleTasks.length) return null;
            const doneCount = visibleTasks.filter(t => phaseTasks[t.key]).length;
            const isCurrent = workflow?.current_phase === phaseKey;
            const phaseIdx  = PHASE_ORDER.indexOf(phaseKey);
            const currentIdx = PHASE_ORDER.indexOf(workflow?.current_phase);
            const isDone    = phaseIdx < currentIdx;

            return (
              <div key={phaseKey} style={{
                background: '#fff', borderRadius: '14px',
                border: `1px solid ${isCurrent ? '#C8DEFF' : '#F2F2F7'}`,
                borderLeft: `3px solid ${isDone ? '#34C759' : isCurrent ? '#0071E3' : '#E5E5EA'}`,
                overflow: 'hidden',
                opacity: phaseIdx > currentIdx ? 0.55 : 1,
              }}>
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: isDone ? '#34C759' : isCurrent ? '#0071E3' : '#8E8E93', flex: 1 }}>
                    {phase.label}
                  </span>
                  <span style={{ fontSize: '11px', color: '#8E8E93' }}>{doneCount}/{visibleTasks.length}</span>
                  {isDone && <Check size={13} color="#34C759" strokeWidth={2.5} />}
                </div>
                <div style={{ borderTop: '1px solid #F2F2F7' }}>
                  {visibleTasks.map(task => {
                    const checked = !!phaseTasks[task.key];
                    return (
                      <div key={task.key} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 16px',
                        borderBottom: '1px solid #F9F9F9',
                      }}>
                        <button
                          onClick={() => toggleWorkflowTask(phaseKey, task.key, checked)}
                          style={{
                            width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
                            border: `2px solid ${checked ? '#34C759' : '#D1D1D6'}`,
                            background: checked ? '#34C759' : '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}
                        >
                          {checked && <Check size={11} color="#fff" strokeWidth={3} />}
                        </button>
                        <span style={{ flex: 1, fontSize: '13px', color: checked ? '#8E8E93' : '#1D1D1F', textDecoration: checked ? 'line-through' : 'none' }}>
                          {task.label}
                        </span>
                        {task.decision && (
                          <span style={{
                            fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
                            background: decisions[task.decision] ? 'rgba(0,113,227,0.08)' : '#F2F2F7',
                            color: decisions[task.decision] ? '#0071E3' : '#8E8E93', fontWeight: 500,
                          }}>
                            {decisions[task.decision] || 'Offen'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Eigene Aufgaben */}
          <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #F2F2F7', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #F2F2F7', fontSize: '13px', fontWeight: 600, color: '#1D1D1F' }}>
              Eigene Aufgaben
            </div>
            <div style={{ padding: '12px 16px' }}>
              <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '8px', marginBottom: tasks.length ? '12px' : 0 }}>
                <input
                  className="input flex-1"
                  placeholder="Eigene Aufgabe hinzufügen…"
                  value={newTask}
                  onChange={e => setNewTask(e.target.value)}
                  style={{ fontSize: '13px' }}
                />
                <button type="submit" disabled={!newTask.trim()} className="btn-primary" style={{ fontSize: '13px' }}>
                  <Plus size={13}/> Hinzufügen
                </button>
              </form>
              {tasks.map(task => (
                <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #F9F9F9' }} className="group">
                  <button
                    onClick={() => cycleTask(task)}
                    className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-colors ${
                      task.status === 'done'  ? 'bg-emerald-500 border-emerald-500' :
                      task.status === 'doing' ? 'bg-blue-500 border-blue-500' :
                      'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {task.status === 'done'  && <Check size={11} className="text-white" strokeWidth={3}/>}
                    {task.status === 'doing' && <div className="w-2 h-2 rounded-full bg-white"/>}
                  </button>
                  <span className={`flex-1 text-sm ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {task.title}
                  </span>
                  <button onClick={() => deleteTaskMutation.mutate(task.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all rounded">
                    <Trash2 size={13}/>
                  </button>
                </div>
              ))}
              {tasks.length === 0 && (
                <p style={{ fontSize: '13px', color: '#8E8E93', marginTop: '8px' }}>Noch keine eigenen Aufgaben.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── NOTES ─────────────────────────────────────────────────────────── */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          {/* Add note */}
          <div className="card">
            <h2 className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              <MessageSquare size={13}/> Neue Notiz
            </h2>
            <textarea
              className="input w-full text-sm resize-none mb-3"
              rows={3}
              placeholder="Notiz hinzufügen… (z.B. Kundenfeedback, interne Hinweise, nächste Schritte)"
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && e.ctrlKey && newNote.trim()) {
                  addNoteMutation.mutate(newNote.trim());
                }
              }}
            />
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-gray-400">Strg+Enter zum Speichern</p>
              <button
                onClick={() => { if (newNote.trim()) addNoteMutation.mutate(newNote.trim()); }}
                disabled={!newNote.trim() || addNoteMutation.isPending}
                className="btn-primary py-1.5 px-3 text-xs"
              >
                <Send size={12}/> Hinzufügen
              </button>
            </div>
          </div>

          {/* Notes list */}
          {notes.length === 0 ? (
            <div className="card text-center py-10">
              <MessageSquare size={28} className="mx-auto text-gray-200 mb-2"/>
              <p className="text-sm text-gray-400">Noch keine Notizen.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map(note => (
                <div key={note.id} className="card group">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap flex-1 leading-relaxed">{note.content}</p>
                    <button
                      onClick={async () => { const ok = await confirm('Diese Notiz wird gelöscht.', { title: 'Notiz löschen' }); if (ok) deleteNoteMutation.mutate(note.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 rounded transition-all shrink-0"
                    >
                      <Trash2 size={13}/>
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2">
                    {new Date(note.created_at).toLocaleString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FINANCE ───────────────────────────────────────────────────────── */}
      {activeTab === 'finance' && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <CreditCard size={13}/> Abrechnung
              </h2>
              <EditBar section="finance" />
            </div>

            {editSection === 'finance' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <SelectField label="Abrechnungsart" value={editForm.billing_type}   options={BILLING_OPTIONS} labelMap={BILLING_LABELS} onChange={set('billing_type')} />
                  <SelectField label="Zahlungsstatus" value={editForm.payment_status} options={PAYMENT_OPTIONS} labelMap={PAYMENT_LABELS} onChange={set('payment_status')} />
                </div>
                <TextField label="Preis (€)" value={editForm.price} onChange={set('price')} type="number" placeholder="0.00" />
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                <InfoRow label="Abrechnungsart" value={BILLING_LABELS[project.billing_type]} />
                <InfoRow label="Preis"          value={project.price != null ? formatCurrency(project.price) : null} />
                <InfoRow label="Zahlungsstatus" value={PAYMENT_LABELS[project.payment_status]} />
                {!project.billing_type && <p className="text-sm text-gray-400 py-2">Noch keine Finanzdaten eingetragen.</p>}
              </div>
            )}
          </div>

          {/* Invoices */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <FileText size={13}/> Rechnungen
              </h2>
              <button onClick={() => navigate(`/invoices/new?project_id=${id}&client_id=${project.client_id}`)} className="btn-primary py-1 px-3 text-xs">
                <Plus size={13}/> Rechnung erstellen
              </button>
            </div>
            {invoices.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">Noch keine Rechnungen.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-2 text-left text-xs font-medium text-gray-400">Nummer</th>
                    <th className="pb-2 text-left text-xs font-medium text-gray-400">Datum</th>
                    <th className="pb-2 text-left text-xs font-medium text-gray-400">Status</th>
                    <th className="pb-2 text-right text-xs font-medium text-gray-400">Betrag</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors">
                      <td className="py-2 font-medium text-gray-900">{inv.invoice_number}</td>
                      <td className="py-2 text-gray-500">{formatDate(inv.issue_date)}</td>
                      <td className="py-2"><StatusBadge status={inv.status}/></td>
                      <td className="py-2 text-right font-semibold">{formatCurrency(inv.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Quotes */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <ClipboardList size={13}/> Angebote
              </h2>
              <button onClick={() => navigate(`/quotes/new?project_id=${id}&client_id=${project.client_id}`)} className="btn-primary py-1 px-3 text-xs">
                <Plus size={13}/> Angebot erstellen
              </button>
            </div>
            {quotes.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">Noch keine Angebote.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-2 text-left text-xs font-medium text-gray-400">Nummer</th>
                    <th className="pb-2 text-left text-xs font-medium text-gray-400">Datum</th>
                    <th className="pb-2 text-left text-xs font-medium text-gray-400">Status</th>
                    <th className="pb-2 text-right text-xs font-medium text-gray-400">Betrag</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map(q => (
                    <tr key={q.id} onClick={() => navigate(`/quotes/${q.id}`)} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors">
                      <td className="py-2 font-medium text-gray-900">{q.quote_number}</td>
                      <td className="py-2 text-gray-500">{formatDate(q.issue_date)}</td>
                      <td className="py-2"><StatusBadge status={q.status}/></td>
                      <td className="py-2 text-right font-semibold">{formatCurrency(q.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── ACTIVITY ──────────────────────────────────────────────────────── */}
      {activeTab === 'activity' && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
            <Activity size={13} className="text-gray-400"/>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Aktivitätslog</h2>
          </div>
          {activity.length === 0 ? (
            <div className="py-12 text-center">
              <Activity size={28} className="mx-auto text-gray-200 mb-2"/>
              <p className="text-sm text-gray-400">Noch keine Aktivitäten.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {activity.map(entry => (
                <div key={entry.id} className="flex items-start gap-3 px-5 py-3">
                  <div className={`mt-0.5 p-1.5 rounded-full shrink-0 ${
                    entry.type === 'status_change' ? 'bg-blue-50' :
                    entry.type === 'note_added'   ? 'bg-violet-50' :
                    entry.type === 'created'      ? 'bg-emerald-50' : 'bg-gray-50'
                  }`}>
                    {entry.type === 'status_change' && <Activity size={11} className="text-blue-500"/>}
                    {entry.type === 'note_added'    && <MessageSquare size={11} className="text-violet-500"/>}
                    {entry.type === 'created'       && <CheckCircle2 size={11} className="text-emerald-500"/>}
                    {!['status_change','note_added','created'].includes(entry.type) && <Clock size={11} className="text-gray-400"/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{entry.message}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {new Date(entry.created_at).toLocaleString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ACCESS ────────────────────────────────────────────────────────── */}
      {activeTab === 'access' && (
        <div className="space-y-4">
          {/* Security notice */}
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <Lock size={14} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Hier werden <strong>keine Passwörter</strong> gespeichert. Verwende externe sichere Tools wie <strong>Bitwarden Send</strong> oder <strong>Google Drive</strong> und füge nur den sicheren Link ein.
            </p>
          </div>

          {/* Credential list */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <Lock size={13}/> Zugangsdaten
              </h2>
              {!showCredForm && (
                <button onClick={() => setShowCredForm(true)} className="btn-primary py-1 px-3 text-xs">
                  <Plus size={13}/> Eintrag hinzufügen
                </button>
              )}
            </div>

            {/* Add / Edit form */}
            {(showCredForm || editingCredId) && (
              <form
                onSubmit={editingCredId ? (e) => { e.preventDefault(); saveEditCred(); } : handleAddCred}
                className="mb-4 p-4 bg-gray-50 rounded-xl space-y-3 border border-gray-100"
              >
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {editingCredId ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Bezeichnung *</label>
                    <input
                      className="input w-full text-sm"
                      placeholder="z.B. Hosting Login"
                      value={credForm.label}
                      onChange={e => setCredForm(f => ({ ...f, label: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Typ</label>
                    <select
                      className="input w-full text-sm"
                      value={credForm.type}
                      onChange={e => setCredForm(f => ({ ...f, type: e.target.value }))}
                    >
                      {CRED_TYPE_OPTIONS.map(o => (
                        <option key={o} value={o}>{CRED_TYPE_LABELS[o]}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Sicherer externer Link *</label>
                  <input
                    className="input w-full text-sm"
                    placeholder="https://bitwarden.com/send/… oder ähnlich"
                    value={credForm.link}
                    onChange={e => setCredForm(f => ({ ...f, link: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Notiz (optional)</label>
                  <input
                    className="input w-full text-sm"
                    placeholder="z.B. Link läuft am 01.04. ab"
                    value={credForm.note}
                    onChange={e => setCredForm(f => ({ ...f, note: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => { setShowCredForm(false); cancelEditCred(); }}
                    className="btn-secondary py-1 px-3 text-xs"
                  >
                    <X size={13}/> Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={createCredMutation.isPending || updateCredMutation.isPending}
                    className="btn-primary py-1 px-3 text-xs"
                  >
                    <Save size={13}/> {editingCredId ? 'Speichern' : 'Hinzufügen'}
                  </button>
                </div>
              </form>
            )}

            {/* List */}
            {credentials.length === 0 && !showCredForm ? (
              <div className="text-center py-10">
                <Lock size={28} className="mx-auto text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">Noch keine Zugangsdaten hinterlegt.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {credentials.map(cred => (
                  editingCredId === cred.id ? null : (
                    <div key={cred.id} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors group">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 mt-0.5 ${CRED_TYPE_STYLES[cred.type] || CRED_TYPE_STYLES.other}`}>
                          {CRED_TYPE_LABELS[cred.type] || cred.type}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">{cred.label}</p>
                          {cred.note && <p className="text-xs text-gray-400 mt-0.5">{cred.note}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {cred.link && (
                          <a
                            href={cred.link}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
                          >
                            <LinkIcon size={11}/> Link öffnen
                          </a>
                        )}
                        <button
                          onClick={() => startEditCred(cred)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                          title="Bearbeiten"
                        >
                          <Pencil size={12}/>
                        </button>
                        <button
                          onClick={async () => { const ok = await confirm(`Eintrag „${cred.label}" wird gelöscht.`, { title: 'Zugangsdaten löschen' }); if (ok) deleteCredMutation.mutate(cred.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Löschen"
                        >
                          <Trash2 size={12}/>
                        </button>
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {ConfirmDialogNode}
    </div>
  );
}
