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
import { teamApi } from '../api/team';
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

const PRIORITY_ORDER  = ['kritisch', 'hoch', 'mittel', 'niedrig'];
const PRIORITY_CONFIG = {
  kritisch: { label: 'Kritisch', color: '#EF4444' },
  hoch:     { label: 'Hoch',     color: '#F59E0B' },
  mittel:   { label: 'Mittel',   color: '#EAB308' },
  niedrig:  { label: 'Niedrig',  color: '#6B7280' },
};
const CHANGE_TYPE_CONFIG = {
  bug:    { label: 'Bug',    bg: '#FEE2E2', color: '#DC2626' },
  kunde:  { label: 'Kunde',  bg: '#DBEAFE', color: '#2563EB' },
  intern: { label: 'Intern', bg: '#EDE9FE', color: '#7C3AED' },
};
const CHANGE_STATUS_CYCLE = ['offen', 'in_bearbeitung', 'erledigt'];
const CHANGE_STATUS_CONFIG = {
  offen:          { label: 'Offen',          bg: '#F2F2F7', color: '#6E6E73' },
  in_bearbeitung: { label: 'In Bearbeitung', bg: '#E8F1FF', color: '#0071E3' },
  erledigt:       { label: 'Erledigt',       bg: '#D1FAE5', color: '#059669' },
};

const CHECKLIST_LABELS = {
  domain_connected:    'Domain verbunden',
  imprint_added:       'Impressum eingetragen',
  privacy_policy_added:'Datenschutz eingetragen',
  mobile_optimized:    'Mobile optimiert',
  tracking_installed:  'Tracking installiert',
  client_access_given: 'Kundenzugang übergeben',
};

const TABS = [
  { key: 'dashboard', label: 'Dashboard'      },
  { key: 'workflow',  label: 'Workflow'       },
  { key: 'tasks',     label: 'Aufgaben'      },
  { key: 'changes',   label: 'Änderungen'    },
  { key: 'notes',     label: 'Notizen'       },
  { key: 'finance',   label: 'Finanzen'      },
  { key: 'access',    label: 'Zugang'        },
  { key: 'overview',  label: 'Einstellungen' },
  { key: 'setup',     label: 'Setup'         },
  { key: 'activity',  label: 'Aktivität'     },
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

  const [activeTab,         setActiveTab]         = useState('dashboard');
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

  // Changes state
  const [changeTypeFilter,   setChangeTypeFilter]   = useState('all');
  const [changeStatusFilter, setChangeStatusFilter] = useState('all');
  const [changeForm,         setChangeForm]         = useState({ title: '', type: 'intern', priority: 'mittel', description: '' });
  const [expandedChangeId,   setExpandedChangeId]   = useState(null);
  const [editingChangeId,    setEditingChangeId]    = useState(null);
  const [editChangeForm,     setEditChangeForm]     = useState({});

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

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamApi.list().then(r => r.data),
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
    enabled: activeTab === 'finance' || activeTab === 'dashboard',
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['projects', id, 'quotes'],
    queryFn: () => projectsApi.getQuotes(id).then(r => r.data),
    enabled: activeTab === 'finance' || activeTab === 'dashboard',
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
    enabled: activeTab === 'activity' || activeTab === 'dashboard',
  });

  const { data: changes = [] } = useQuery({
    queryKey: ['projects', id, 'changes'],
    queryFn: () => projectsApi.getChanges(id),
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

  const createChangeMutation = useMutation({
    mutationFn: (data) => projectsApi.createChange(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', id, 'changes'] });
      setChangeForm({ title: '', type: 'intern', priority: 'mittel', description: '' });
      toast.success('Änderung angelegt');
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler'),
  });

  const updateChangeMutation = useMutation({
    mutationFn: ({ cid, data }) => projectsApi.updateChange(id, cid, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', id, 'changes'] });
      setEditingChangeId(null);
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler'),
  });

  const deleteChangeMutation = useMutation({
    mutationFn: (cid) => projectsApi.deleteChange(id, cid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', id, 'changes'] });
      toast.success('Gelöscht');
    },
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

  // ── Sidebar computed values ─────────────────────────────────────────────────
  const phaseIdx   = workflow?.current_phase ? PHASE_ORDER.indexOf(workflow.current_phase) : 0;
  const phaseCfg   = workflow?.current_phase ? PHASES[workflow.current_phase] : null;
  const isLastPhase = workflow?.current_phase === PHASE_ORDER[PHASE_ORDER.length - 1];
  const openChanges = changes.filter(c => c.status !== 'erledigt').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F5F5F7', overflow: 'hidden' }}>

      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '0 28px', height: '60px', flexShrink: 0,
        background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)',
      }}>
        <button
          onClick={() => navigate('/websites')}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '5px 10px', borderRadius: '8px', border: 'none',
            background: 'transparent', color: '#86868B', fontSize: '13px',
            cursor: 'pointer', transition: 'background 0.12s, color 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = '#1D1D1F'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#86868B'; }}
        >
          <ArrowLeft size={14} /> Websites
        </button>
        <span style={{ color: '#D1D1D6', fontSize: '14px' }}>/</span>
        <h1 style={{ fontSize: '16px', fontWeight: '700', color: '#1D1D1F', letterSpacing: '-0.02em', margin: 0 }}>
          {project.name}
        </h1>
        {project.type && (
          <span style={{ fontSize: '11px', fontWeight: '500', color: '#6E6E73', background: '#F2F2F7', padding: '2px 8px', borderRadius: '6px' }}>
            {TYPE_LABELS[project.type] || project.type}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <HeaderStatusDropdown status={project.status} onSelect={(s) => updateMutation.mutate({ status: s })} />
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px',
            borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)',
            background: 'transparent', color: '#424245', fontSize: '13px', fontWeight: '500',
            cursor: 'pointer', transition: 'background 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <Pencil size={13} /> Bearbeiten
        </button>
      </div>

      {/* ── TAB BAR ──────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 0, background: '#fff',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        padding: '0 28px', flexShrink: 0, overflowX: 'auto',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '14px 16px', fontSize: '13px',
              fontWeight: activeTab === tab.key ? '600' : '400',
              color: activeTab === tab.key ? '#1D1D1F' : '#86868B',
              background: 'transparent', border: 'none',
              borderBottom: `2px solid ${activeTab === tab.key ? '#1D1D1F' : 'transparent'}`,
              cursor: 'pointer', transition: 'color 0.12s',
              display: 'flex', alignItems: 'center', gap: '6px',
              whiteSpace: 'nowrap', marginBottom: '-1px', letterSpacing: '-0.01em',
            }}
            onMouseEnter={e => { if (activeTab !== tab.key) e.currentTarget.style.color = '#3C3C43'; }}
            onMouseLeave={e => { if (activeTab !== tab.key) e.currentTarget.style.color = '#86868B'; }}
          >
            {tab.label}
            {tab.key === 'tasks' && tasks.length > 0 && (
              <span style={{ fontSize: '10px', fontWeight: '600', background: '#F2F2F7', color: '#6E6E73', padding: '1px 6px', borderRadius: '99px' }}>
                {doneTasks}/{tasks.length}
              </span>
            )}
            {tab.key === 'changes' && openChanges > 0 && (
              <span style={{ fontSize: '10px', fontWeight: '700', background: 'rgba(245,158,11,0.15)', color: '#F59E0B', padding: '1px 6px', borderRadius: '99px' }}>
                {openChanges}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── CONTENT ──────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

      {/* ── DASHBOARD ────────────────────────────────────────────────────────── */}
      {activeTab === 'dashboard' && (() => {
        const daysLeft = project.deadline
          ? Math.floor((new Date(project.deadline) - new Date()) / 86400000)
          : null;
        const openCh = changes.filter(c => c.status !== 'erledigt');
        const urgentCh = openCh.filter(c => c.priority === 'kritisch' || c.priority === 'hoch');
        const taskPct = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;

        // Top 4 open tasks: doing first, then todo
        const topTasks = [...tasks]
          .filter(t => t.status !== 'done')
          .sort((a, b) => (a.status === 'doing' ? -1 : b.status === 'doing' ? 1 : 0))
          .slice(0, 4);

        // Top 4 changes by priority
        const topChanges = [...openCh]
          .sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority))
          .slice(0, 4);

        // Finanzen inbox
        const pendingInvoices = invoices.filter(i => i.status !== 'paid');
        const pendingQuotes   = quotes.filter(q => q.status !== 'accepted' && q.status !== 'rejected');

        // Client + Budget progress
        const client        = clients.find(c => c.id === project.client_id);
        const totalBudget   = Number(project.budget) || 0;
        const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
        const invoicePct    = totalBudget > 0 ? Math.min(100, Math.round((totalInvoiced / totalBudget) * 100)) : 0;
        const openTaskCount = tasks.filter(t => t.status !== 'done').length;

        const card = { background: '#fff', borderRadius: '16px', padding: '22px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' };
        const sectionTitle = { fontSize: '11px', fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.05em' };
        const linkBtn = { fontSize: '12px', color: '#0071E3', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' };

        return (
          <div>
            {/* ── Summary Bar ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px', padding: '11px 18px', background: '#fff', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              {/* Health chip */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 10px', borderRadius: '8px', flexShrink: 0,
                background: health === 'good' ? 'rgba(52,199,89,0.1)' : health === 'warning' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${health === 'good' ? 'rgba(52,199,89,0.22)' : health === 'warning' ? 'rgba(245,158,11,0.22)' : 'rgba(239,68,68,0.22)'}` }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: health === 'good' ? '#34C759' : health === 'warning' ? '#F59E0B' : '#EF4444' }} />
                <span style={{ fontSize: '12px', fontWeight: '600', color: health === 'good' ? '#34C759' : health === 'warning' ? '#F59E0B' : '#EF4444' }}>{healthCfg.label}</span>
              </div>
              {/* Client */}
              {client && (
                <>
                  <div style={{ width: '1px', height: '14px', background: '#E5E5EA', flexShrink: 0 }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={12} color="#8E8E93" />
                    <span style={{ fontSize: '13px', fontWeight: '500', color: '#3C3C43' }}>{client.company_name || client.name}</span>
                  </div>
                </>
              )}
              {/* Project type */}
              {project.type && (
                <>
                  <div style={{ width: '1px', height: '14px', background: '#E5E5EA', flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: '#8E8E93' }}>{TYPE_LABELS[project.type] || project.type}</span>
                </>
              )}
              <div style={{ flex: 1 }} />
              {/* Open items */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {openTaskCount > 0 && (
                  <button onClick={() => setActiveTab('tasks')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '12px', color: '#6E6E73' }}>
                    <span style={{ fontWeight: '700', color: '#1D1D1F' }}>{openTaskCount}</span> Aufgaben
                  </button>
                )}
                {openCh.length > 0 && (
                  <button onClick={() => setActiveTab('changes')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '12px', color: '#6E6E73' }}>
                    <span style={{ fontWeight: '700', color: urgentCh.length > 0 ? '#EF4444' : '#1D1D1F' }}>{openCh.length}</span> Änderungen
                    {urgentCh.length > 0 && <span style={{ fontSize: '10px', fontWeight: '700', background: 'rgba(239,68,68,0.1)', color: '#EF4444', padding: '1px 5px', borderRadius: '5px', marginLeft: '5px' }}>{urgentCh.length} dringend</span>}
                  </button>
                )}
                {pendingInvoices.length > 0 && (
                  <button onClick={() => setActiveTab('finance')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '12px', color: '#6E6E73' }}>
                    <span style={{ fontWeight: '700', color: '#F59E0B' }}>{pendingInvoices.length}</span> {pendingInvoices.length === 1 ? 'Rechnung' : 'Rechnungen'}
                  </button>
                )}
                {openTaskCount === 0 && openCh.length === 0 && pendingInvoices.length === 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <CheckCircle2 size={13} color="#34C759" />
                    <span style={{ fontSize: '12px', color: '#34C759', fontWeight: '500' }}>Alles aktuell</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── KPI Row (4 cols) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>

              {/* Klient */}
              <div
                style={{ ...card, cursor: client ? 'pointer' : 'default', transition: 'box-shadow 0.15s' }}
                onClick={() => client && navigate(`/clients/${client.id}`)}
                onMouseEnter={e => { if (client) e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'}
              >
                <p style={{ ...sectionTitle, marginBottom: '10px' }}>Klient</p>
                {client ? (
                  <>
                    <p style={{ fontSize: '15px', fontWeight: '700', color: '#1D1D1F', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {client.company_name || client.name}
                    </p>
                    <p style={{ fontSize: '11px', color: '#8E8E93', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {client.email || TYPE_LABELS[project.type] || '—'}
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: '15px', fontWeight: '700', color: '#C7C7CC', marginBottom: '4px' }}>—</p>
                    <button onClick={e => { e.stopPropagation(); setActiveTab('overview'); }} style={{ fontSize: '11px', color: '#0071E3', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      Klient zuweisen →
                    </button>
                  </>
                )}
              </div>

              {/* Budget */}
              <div style={card}>
                <p style={{ ...sectionTitle, marginBottom: '10px' }}>Budget</p>
                <p style={{ fontSize: '26px', fontWeight: '700', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: totalBudget > 0 ? '9px' : '4px', color: '#1D1D1F' }}>
                  {project.budget ? `${Number(project.budget).toLocaleString('de-DE')} €` : '—'}
                </p>
                {totalBudget > 0 ? (
                  <>
                    <div style={{ height: '3px', background: '#F2F2F7', borderRadius: '2px', marginBottom: '5px' }}>
                      <div style={{ height: '100%', borderRadius: '2px', width: `${invoicePct}%`, background: invoicePct >= 100 ? '#34C759' : '#0071E3', transition: 'width 0.4s ease' }} />
                    </div>
                    <p style={{ fontSize: '11px', color: '#8E8E93' }}>{formatCurrency(totalInvoiced)} fakturiert · {invoicePct}%</p>
                  </>
                ) : (
                  <p style={{ fontSize: '11px', color: '#8E8E93' }}>{BILLING_LABELS[project.billing_type] || 'Einmalig'}</p>
                )}
              </div>

              {/* Deadline */}
              <div style={{ ...card, background: daysLeft !== null && daysLeft < 0 ? 'rgba(239,68,68,0.03)' : daysLeft !== null && daysLeft <= 7 ? 'rgba(245,158,11,0.03)' : '#fff', border: `1px solid ${daysLeft !== null && daysLeft < 0 ? 'rgba(239,68,68,0.18)' : daysLeft !== null && daysLeft <= 7 ? 'rgba(245,158,11,0.18)' : 'rgba(0,0,0,0.06)'}` }}>
                <p style={{ ...sectionTitle, marginBottom: '10px' }}>Deadline</p>
                {daysLeft !== null ? (
                  <>
                    <p style={{ fontSize: '26px', fontWeight: '700', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '4px', color: daysLeft < 0 ? '#EF4444' : daysLeft <= 7 ? '#F59E0B' : '#1D1D1F' }}>
                      {daysLeft < 0 ? `+${Math.abs(daysLeft)}` : daysLeft}
                      <span style={{ fontSize: '13px', fontWeight: '400', color: '#8E8E93', marginLeft: '4px' }}>Tage</span>
                    </p>
                    <p style={{ fontSize: '11px', color: '#8E8E93' }}>
                      {new Date(project.deadline).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {daysLeft < 0 && <span style={{ color: '#EF4444', fontWeight: '600' }}> · überfällig</span>}
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: '26px', fontWeight: '700', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '4px', color: '#C7C7CC' }}>—</p>
                    <p style={{ fontSize: '11px', color: '#8E8E93' }}>kein Datum</p>
                  </>
                )}
              </div>

              {/* Live-Website */}
              <div
                style={{ ...card, cursor: project.live_url ? 'pointer' : 'default', transition: 'box-shadow 0.15s' }}
                onClick={() => project.live_url && window.open(project.live_url, '_blank')}
                onMouseEnter={e => { if (project.live_url) e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,113,227,0.12)'; }}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'}
              >
                <p style={{ ...sectionTitle, marginBottom: '10px' }}>Live-Website</p>
                {project.live_url ? (
                  <>
                    <p style={{ fontSize: '14px', fontWeight: '700', color: '#0071E3', letterSpacing: '-0.01em', lineHeight: 1.3, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {project.live_url.replace(/^https?:\/\//, '')}
                    </p>
                    <p style={{ fontSize: '11px', color: '#8E8E93', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <ExternalLink size={10} /> öffnen
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: '26px', fontWeight: '700', color: '#C7C7CC', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '4px' }}>—</p>
                    <button onClick={e => { e.stopPropagation(); setActiveTab('setup'); }} style={{ fontSize: '11px', color: '#0071E3', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      URL eintragen →
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* ── Row 2: Aktuelle Phase + Änderungen ── */}
            {(() => {
              const curPhaseKey   = workflow?.current_phase;
              const curPhase      = curPhaseKey ? PHASES[curPhaseKey] : null;
              const curPhaseIdx   = curPhaseKey ? PHASE_ORDER.indexOf(curPhaseKey) : 0;
              const phaseTaskDefs = curPhase?.tasks || [];
              const phaseTaskData = workflow?.phase_data?.[curPhaseKey]?.tasks || {};
              const completedCnt  = phaseTaskDefs.filter(t => phaseTaskData[t.key]).length;
              const phasePct      = phaseTaskDefs.length > 0 ? Math.round((completedCnt / phaseTaskDefs.length) * 100) : 0;
              const isLastPh      = curPhaseIdx === PHASE_ORDER.length - 1;
              const nextPhaseKey  = PHASE_ORDER[curPhaseIdx + 1];
              const nextPhaseLabel = nextPhaseKey ? PHASES[nextPhaseKey]?.label : null;
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '14px', marginBottom: '14px' }}>

                  {/* Aktuelle Phase Widget */}
                  <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>{curPhase?.emoji || '📋'}</span>
                        <div>
                          <p style={sectionTitle}>Aktuelle Phase</p>
                          <p style={{ fontSize: '15px', fontWeight: '700', color: '#1D1D1F', letterSpacing: '-0.02em' }}>{curPhase?.label || '—'}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: completedCnt === phaseTaskDefs.length && phaseTaskDefs.length > 0 ? '#34C759' : '#8E8E93' }}>
                          {completedCnt}/{phaseTaskDefs.length}
                        </span>
                        <button onClick={() => setActiveTab('workflow')} style={linkBtn}>Workflow →</button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ height: '4px', background: '#F2F2F7', borderRadius: '2px', marginBottom: '16px' }}>
                      <div style={{ height: '100%', borderRadius: '2px', background: phasePct === 100 ? '#34C759' : '#0071E3', width: `${phasePct}%`, transition: 'width 0.4s' }} />
                    </div>

                    {curPhase ? (
                      <>
                        {/* Task list */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                          {phaseTaskDefs.map(t => {
                            const done = phaseTaskData[t.key];
                            return (
                              <div
                                key={t.key}
                                onClick={() => toggleWorkflowTask(curPhaseKey, t.key, done)}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '10px', background: done ? 'rgba(52,199,89,0.05)' : '#FAFAFA', border: `1px solid ${done ? 'rgba(52,199,89,0.18)' : '#F0F0F5'}`, cursor: 'pointer', transition: 'background 0.12s' }}
                                onMouseEnter={e => e.currentTarget.style.background = done ? 'rgba(52,199,89,0.09)' : '#F2F2F7'}
                                onMouseLeave={e => e.currentTarget.style.background = done ? 'rgba(52,199,89,0.05)' : '#FAFAFA'}
                              >
                                <div style={{ width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0, border: `2px solid ${done ? '#34C759' : '#C7C7CC'}`, background: done ? '#34C759' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {done && <Check size={10} color="#fff" strokeWidth={3} />}
                                </div>
                                <span style={{ flex: 1, fontSize: '13px', color: done ? '#8E8E93' : '#1D1D1F', textDecoration: done ? 'line-through' : 'none' }}>{t.label}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Advance phase button */}
                        {!isLastPh ? (
                          <button
                            onClick={() => workflowUpdateMutation.mutate({ current_phase: nextPhaseKey })}
                            disabled={workflowUpdateMutation.isPending}
                            style={{ width: '100%', padding: '11px', borderRadius: '10px', background: '#0071E3', color: '#fff', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                          >
                            <Check size={14} strokeWidth={3} /> Phase abschließen → {nextPhaseLabel}
                          </button>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '11px', background: 'rgba(52,199,89,0.08)', borderRadius: '10px', border: '1px solid rgba(52,199,89,0.2)' }}>
                            <CheckCircle2 size={14} color="#34C759" />
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#34C759' }}>Projekt abgeschlossen 🎉</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <p style={{ fontSize: '13px', color: '#8E8E93' }}>Kein Workflow gestartet.</p>
                        <button onClick={() => setActiveTab('workflow')} style={{ ...linkBtn, marginTop: '8px' }}>Jetzt starten →</button>
                      </div>
                    )}
                  </div>

                  {/* Änderungen */}
                  <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <p style={sectionTitle}>Änderungen</p>
                      <button onClick={() => setActiveTab('changes')} style={linkBtn}>Alle →</button>
                    </div>

                    {/* Quick-add form */}
                    <form onSubmit={e => { e.preventDefault(); if (!changeForm.title.trim()) return; createChangeMutation.mutate({ ...changeForm }); }} style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '7px' }}>
                        <input
                          value={changeForm.title}
                          onChange={e => setChangeForm(f => ({ ...f, title: e.target.value }))}
                          placeholder="Neue Änderung..."
                          style={{ flex: 1, fontSize: '12px', padding: '7px 10px', borderRadius: '8px', border: '1px solid #E5E5EA', outline: 'none', background: '#FAFAFA', color: '#1D1D1F' }}
                        />
                        <button type="submit" disabled={!changeForm.title.trim() || createChangeMutation.isPending}
                          style={{ padding: '7px 11px', borderRadius: '8px', background: changeForm.title.trim() ? '#0071E3' : '#E5E5EA', border: 'none', color: changeForm.title.trim() ? '#fff' : '#8E8E93', cursor: changeForm.title.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', transition: 'background 0.12s' }}>
                          <Plus size={14} />
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        {Object.entries(CHANGE_TYPE_CONFIG).map(([key, tc]) => (
                          <button key={key} type="button"
                            onClick={() => setChangeForm(f => ({ ...f, type: key }))}
                            style={{ fontSize: '11px', fontWeight: '600', padding: '3px 9px', borderRadius: '6px', cursor: 'pointer',
                              background: changeForm.type === key ? tc.bg : '#F2F2F7',
                              color: changeForm.type === key ? tc.color : '#8E8E93',
                              border: `1px solid ${changeForm.type === key ? tc.color + '40' : 'transparent'}`,
                              transition: 'all 0.1s' }}>
                            {tc.label}
                          </button>
                        ))}
                      </div>
                    </form>

                    {topChanges.length === 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px', background: 'rgba(52,199,89,0.06)', borderRadius: '10px', border: '1px solid rgba(52,199,89,0.15)' }}>
                        <CheckCircle2 size={13} color="#34C759" />
                        <p style={{ fontSize: '12px', color: '#34C759', fontWeight: '500' }}>Alle erledigt</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {topChanges.map(ch => {
                          const tc = CHANGE_TYPE_CONFIG[ch.type] || CHANGE_TYPE_CONFIG.intern;
                          const pc = PRIORITY_CONFIG[ch.priority] || PRIORITY_CONFIG.mittel;
                          return (
                            <div key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '10px', border: '1px solid #F2F2F7', background: '#FAFAFA' }}>
                              <div style={{ width: '3px', alignSelf: 'stretch', borderRadius: '2px', background: pc.color, flexShrink: 0 }} />
                              <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '5px', background: tc.bg, color: tc.color, flexShrink: 0 }}>{tc.label}</span>
                              <span style={{ flex: 1, fontSize: '12px', color: '#1D1D1F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.title}</span>
                              <button
                                onClick={() => updateChangeMutation.mutate({ cid: ch.id, data: { status: 'erledigt' } })}
                                title="Als erledigt markieren"
                                style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1.5px solid #D1D1D6', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.12s' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = '#34C759'; e.currentTarget.style.background = 'rgba(52,199,89,0.1)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = '#D1D1D6'; e.currentTarget.style.background = 'transparent'; }}
                              >
                                <Check size={10} color="#8E8E93" strokeWidth={3} />
                              </button>
                            </div>
                          );
                        })}
                        {openCh.length > 4 && (
                          <button onClick={() => setActiveTab('changes')} style={{ fontSize: '12px', color: '#8E8E93', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}>
                            +{openCh.length - 4} weitere
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              );
            })()}

            {/* ── Row 3: Aufgaben + Quick Links + Finanzen ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>

              {/* Aufgaben */}
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <p style={sectionTitle}>Aufgaben</p>
                  <button onClick={() => setActiveTab('tasks')} style={linkBtn}>Alle →</button>
                </div>
                {/* Quick-add */}
                <form onSubmit={e => { e.preventDefault(); if (!newTask.trim()) return; createTaskMutation.mutate(newTask.trim()); }} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      value={newTask}
                      onChange={e => setNewTask(e.target.value)}
                      placeholder="Neue Aufgabe..."
                      style={{ flex: 1, fontSize: '12px', padding: '7px 10px', borderRadius: '8px', border: '1px solid #E5E5EA', outline: 'none', background: '#FAFAFA', color: '#1D1D1F' }}
                    />
                    <button type="submit" disabled={!newTask.trim() || createTaskMutation.isPending}
                      style={{ padding: '7px 11px', borderRadius: '8px', background: newTask.trim() ? '#0071E3' : '#E5E5EA', border: 'none', color: newTask.trim() ? '#fff' : '#8E8E93', cursor: newTask.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', transition: 'background 0.12s' }}>
                      <Plus size={14} />
                    </button>
                  </div>
                </form>
                {topTasks.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px', background: 'rgba(52,199,89,0.06)', borderRadius: '10px', border: '1px solid rgba(52,199,89,0.15)' }}>
                    <CheckCircle2 size={13} color="#34C759" />
                    <p style={{ fontSize: '12px', color: '#34C759', fontWeight: '500' }}>Alle erledigt</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {topTasks.map(task => {
                      const isDoing = task.status === 'doing';
                      return (
                        <div key={task.id}
                          onClick={() => cycleTask(task)}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', border: `1px solid ${isDoing ? 'rgba(0,113,227,0.18)' : '#F2F2F7'}`, background: isDoing ? 'rgba(0,113,227,0.03)' : '#FAFAFA', cursor: 'pointer', transition: 'background 0.12s' }}
                          onMouseEnter={e => e.currentTarget.style.background = isDoing ? 'rgba(0,113,227,0.07)' : '#F2F2F7'}
                          onMouseLeave={e => e.currentTarget.style.background = isDoing ? 'rgba(0,113,227,0.03)' : '#FAFAFA'}
                        >
                          <div style={{ width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0, border: `2px solid ${isDoing ? '#0071E3' : '#D1D1D6'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {isDoing && <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#0071E3' }} />}
                          </div>
                          <span style={{ flex: 1, fontSize: '12px', color: '#1D1D1F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
                          {isDoing && <span style={{ fontSize: '9px', fontWeight: '700', background: '#0071E3', color: '#fff', padding: '1px 5px', borderRadius: '4px', flexShrink: 0 }}>Aktiv</span>}
                        </div>
                      );
                    })}
                    {openTaskCount > 4 && (
                      <button onClick={() => setActiveTab('tasks')} style={{ fontSize: '11px', color: '#8E8E93', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 0', textAlign: 'left' }}>
                        +{openTaskCount - 4} weitere
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Links */}
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <p style={sectionTitle}>Quick Links</p>
                  <button onClick={() => setActiveTab('setup')} style={linkBtn}>Setup →</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Live URL */}
                  {project.live_url ? (
                    <a href={project.live_url} target="_blank" rel="noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(0,113,227,0.04)', border: '1px solid rgba(0,113,227,0.12)', textDecoration: 'none', transition: 'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,113,227,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,113,227,0.04)'}
                    >
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(0,113,227,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Globe size={13} color="#0071E3" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '12px', fontWeight: '600', color: '#0071E3' }}>Live-Website</p>
                        <p style={{ fontSize: '11px', color: '#86868B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.live_url.replace(/^https?:\/\//, '')}</p>
                      </div>
                      <ExternalLink size={12} color="#0071E3" style={{ flexShrink: 0 }} />
                    </a>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', background: '#FAFAFA', border: '1px dashed #E5E5EA' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Globe size={13} color="#C7C7CC" />
                      </div>
                      <p style={{ fontSize: '12px', color: '#C7C7CC' }}>Live-URL noch nicht eingetragen</p>
                    </div>
                  )}

                  {/* Domain */}
                  {project.domain_name && (
                    <a href={`https://${project.domain_name}`} target="_blank" rel="noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(52,199,89,0.04)', border: '1px solid rgba(52,199,89,0.12)', textDecoration: 'none', transition: 'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(52,199,89,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(52,199,89,0.04)'}
                    >
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(52,199,89,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <LinkIcon size={13} color="#34C759" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '12px', fontWeight: '600', color: '#059669' }}>Domain</p>
                        <p style={{ fontSize: '11px', color: '#86868B' }}>{project.domain_name}</p>
                      </div>
                      <ExternalLink size={12} color="#34C759" style={{ flexShrink: 0 }} />
                    </a>
                  )}

                  {/* Repository */}
                  {project.repository_url && (
                    <a href={project.repository_url} target="_blank" rel="noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(88,86,214,0.04)', border: '1px solid rgba(88,86,214,0.12)', textDecoration: 'none', transition: 'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(88,86,214,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(88,86,214,0.04)'}
                    >
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(88,86,214,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <GitBranch size={13} color="#5856D6" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '12px', fontWeight: '600', color: '#5856D6' }}>Repository</p>
                        <p style={{ fontSize: '11px', color: '#86868B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.repository_url.replace(/^https?:\/\//, '')}</p>
                      </div>
                      <ExternalLink size={12} color="#5856D6" style={{ flexShrink: 0 }} />
                    </a>
                  )}

                  {/* Tech summary */}
                  {(project.build_type || project.hosting_provider || project.frontend) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', paddingTop: '4px' }}>
                      {project.build_type && <span style={{ fontSize: '11px', fontWeight: '500', padding: '3px 8px', borderRadius: '6px', background: '#F2F2F7', color: '#6E6E73' }}>{BUILD_TYPE_LABELS[project.build_type] || project.build_type}</span>}
                      {project.frontend && <span style={{ fontSize: '11px', fontWeight: '500', padding: '3px 8px', borderRadius: '6px', background: '#F2F2F7', color: '#6E6E73' }}>{FRONTEND_LABELS[project.frontend] || project.frontend}</span>}
                      {project.hosting_provider && <span style={{ fontSize: '11px', fontWeight: '500', padding: '3px 8px', borderRadius: '6px', background: '#F2F2F7', color: '#6E6E73' }}>{HOSTING_LABELS[project.hosting_provider] || project.hosting_provider}</span>}
                    </div>
                  )}

                  {!project.live_url && !project.domain_name && !project.repository_url && !project.build_type && (
                    <button onClick={() => setActiveTab('setup')} style={{ ...linkBtn, color: '#8E8E93', fontSize: '13px', padding: '6px 0', textAlign: 'left', display: 'block' }}>
                      Setup einrichten →
                    </button>
                  )}
                </div>
              </div>

              {/* Finanzen Inbox */}
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <p style={sectionTitle}>Finanzen</p>
                  <button onClick={() => setActiveTab('finance')} style={linkBtn}>Alle →</button>
                </div>
                {pendingInvoices.length === 0 && pendingQuotes.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '13px', background: 'rgba(52,199,89,0.06)', borderRadius: '10px', border: '1px solid rgba(52,199,89,0.15)' }}>
                    <CheckCircle2 size={14} color="#34C759" />
                    <p style={{ fontSize: '13px', color: '#34C759', fontWeight: '500' }}>Alles beglichen</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {pendingQuotes.slice(0, 2).map(q => (
                      <div
                        key={q.id}
                        onClick={() => navigate(`/quotes/${q.id}`)}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 11px', borderRadius: '10px', background: 'rgba(0,113,227,0.03)', border: '1px solid rgba(0,113,227,0.12)', cursor: 'pointer', transition: 'background 0.12s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,113,227,0.07)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,113,227,0.03)'}
                      >
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(0,113,227,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <ClipboardList size={13} color="#0071E3" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '12px', fontWeight: '600', color: '#1D1D1F' }}>{q.quote_number}</p>
                          <p style={{ fontSize: '11px', color: '#8E8E93' }}>Angebot · {formatCurrency(q.total)}</p>
                        </div>
                        <StatusBadge status={q.status} />
                      </div>
                    ))}
                    {pendingInvoices.slice(0, 2).map(inv => (
                      <div
                        key={inv.id}
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 11px', borderRadius: '10px', background: 'rgba(245,158,11,0.03)', border: '1px solid rgba(245,158,11,0.15)', cursor: 'pointer', transition: 'background 0.12s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,158,11,0.07)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(245,158,11,0.03)'}
                      >
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Euro size={13} color="#F59E0B" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '12px', fontWeight: '600', color: '#1D1D1F' }}>{inv.invoice_number}</p>
                          <p style={{ fontSize: '11px', color: '#8E8E93' }}>Rechnung · {formatCurrency(inv.total)}</p>
                        </div>
                        <StatusBadge status={inv.status} />
                      </div>
                    ))}
                    {(pendingInvoices.length + pendingQuotes.length) > 4 && (
                      <button onClick={() => setActiveTab('finance')} style={{ ...linkBtn, fontSize: '12px', color: '#8E8E93', padding: '4px 0', textAlign: 'left' }}>
                        +{pendingInvoices.length + pendingQuotes.length - 4} weitere
                      </button>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })()}

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
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Zuständig</label>
                  <select className="input w-full text-sm" value={editForm.assignee_id || ''} onChange={e => set('assignee_id')(e.target.value ? Number(e.target.value) : null)}>
                    <option value="">— Niemand —</option>
                    {teamMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.name || m.email}</option>
                    ))}
                  </select>
                </div>
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
                {(project.assignee_name || project.assignee) && (
                  <div>
                    <dt className="flex items-center gap-1 text-xs text-gray-400 mb-0.5"><User size={11}/>Zuständig</dt>
                    <dd>
                      {project.assignee_name ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: '50%',
                            background: project.assignee_color || '#6366f1',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '9px', fontWeight: '700', color: '#fff', flexShrink: 0,
                          }}>
                            {(project.assignee_name).trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-gray-700 text-sm">{project.assignee_name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-700">{project.assignee}</span>
                      )}
                    </dd>
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
      {/* ── CHANGES ───────────────────────────────────────────────────────── */}
      {activeTab === 'changes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Open changes banner */}
          {(() => {
            const open    = changes.filter(c => c.status === 'offen').length;
            const inProg  = changes.filter(c => c.status === 'in_bearbeitung').length;
            const critical = changes.filter(c => c.status !== 'erledigt' && c.priority === 'kritisch').length;
            const high     = changes.filter(c => c.status !== 'erledigt' && c.priority === 'hoch').length;
            if (open + inProg === 0) return null;
            return (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px',
                background: critical > 0 ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)',
                border: `1px solid ${critical > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'}`,
                borderRadius: '12px',
              }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                  background: critical > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <AlertTriangle size={15} color={critical > 0 ? '#EF4444' : '#F59E0B'} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#1D1D1F', marginBottom: '2px' }}>
                    {open + inProg} offene {open + inProg === 1 ? 'Änderung' : 'Änderungen'}
                  </p>
                  <p style={{ fontSize: '12px', color: '#86868B' }}>
                    {[
                      open > 0 && `${open} offen`,
                      inProg > 0 && `${inProg} in Bearbeitung`,
                      critical > 0 && `${critical} kritisch`,
                      high > 0 && `${high} hoch`,
                    ].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Quick-add form */}
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #E5E5EA', padding: '20px' }}>
            <form
              onSubmit={e => {
                e.preventDefault();
                if (!changeForm.title.trim()) return toast.error('Titel ist erforderlich');
                createChangeMutation.mutate(changeForm);
              }}
            >
              <input
                className="input w-full"
                placeholder="Was soll geändert oder behoben werden?"
                value={changeForm.title}
                onChange={e => setChangeForm(f => ({ ...f, title: e.target.value }))}
                style={{ fontSize: '14px', marginBottom: '14px', borderRadius: '10px' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
                {/* Type */}
                <div>
                  <p style={{ fontSize: '11px', fontWeight: '600', color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '7px' }}>Typ</p>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {Object.entries(CHANGE_TYPE_CONFIG).map(([k, v]) => (
                      <button key={k} type="button"
                        onClick={() => setChangeForm(f => ({ ...f, type: k }))}
                        style={{
                          flex: 1, padding: '6px 4px', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
                          border: `1.5px solid ${changeForm.type === k ? v.color : '#E5E5EA'}`,
                          background: changeForm.type === k ? v.bg : '#FAFAFA',
                          color: changeForm.type === k ? v.color : '#8E8E93',
                          cursor: 'pointer', transition: 'all 0.12s',
                        }}
                      >{v.label}</button>
                    ))}
                  </div>
                </div>
                {/* Priority */}
                <div>
                  <p style={{ fontSize: '11px', fontWeight: '600', color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '7px' }}>Priorität</p>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {PRIORITY_ORDER.map(k => {
                      const v = PRIORITY_CONFIG[k];
                      const active = changeForm.priority === k;
                      return (
                        <button key={k} type="button"
                          onClick={() => setChangeForm(f => ({ ...f, priority: k }))}
                          style={{
                            flex: 1, padding: '6px 4px', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
                            border: `1.5px solid ${active ? v.color : '#E5E5EA'}`,
                            background: active ? v.color + '15' : '#FAFAFA',
                            color: active ? v.color : '#8E8E93',
                            cursor: 'pointer', transition: 'all 0.12s',
                          }}
                        >
                          <span style={{ display: 'block', width: '6px', height: '6px', borderRadius: '50%', background: v.color, margin: '0 auto 3px' }} />
                          {v.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={!changeForm.title.trim() || createChangeMutation.isPending}
                  className="btn-primary"
                  style={{ fontSize: '13px', padding: '8px 18px' }}
                >
                  <Plus size={13}/> Änderung anlegen
                </button>
              </div>
            </form>
          </div>

          {/* Filter + count bar */}
          {changes.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Type filter pills */}
              <div style={{ display: 'flex', gap: '4px', background: '#F2F2F7', borderRadius: '10px', padding: '3px' }}>
                {[['all','Alle'], ['bug','Bug'], ['kunde','Kunde'], ['intern','Intern']].map(([k, label]) => (
                  <button key={k} type="button"
                    onClick={() => setChangeTypeFilter(k)}
                    style={{
                      padding: '4px 12px', borderRadius: '7px', fontSize: '12px', fontWeight: '500',
                      border: 'none', cursor: 'pointer', transition: 'all 0.12s',
                      background: changeTypeFilter === k ? '#fff' : 'transparent',
                      color: changeTypeFilter === k ? '#1D1D1F' : '#86868B',
                      boxShadow: changeTypeFilter === k ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >{label}</button>
                ))}
              </div>
              {/* Status filter pills */}
              <div style={{ display: 'flex', gap: '4px', background: '#F2F2F7', borderRadius: '10px', padding: '3px' }}>
                {[['all','Alle'], ['offen','Offen'], ['in_bearbeitung','In Arbeit'], ['erledigt','Erledigt']].map(([k, label]) => (
                  <button key={k} type="button"
                    onClick={() => setChangeStatusFilter(k)}
                    style={{
                      padding: '4px 12px', borderRadius: '7px', fontSize: '12px', fontWeight: '500',
                      border: 'none', cursor: 'pointer', transition: 'all 0.12s',
                      background: changeStatusFilter === k ? '#fff' : 'transparent',
                      color: changeStatusFilter === k ? '#1D1D1F' : '#86868B',
                      boxShadow: changeStatusFilter === k ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >{label}</button>
                ))}
              </div>
              <span style={{ fontSize: '12px', color: '#C7C7CC', marginLeft: 'auto' }}>
                {changes.filter(c =>
                  (changeTypeFilter === 'all' || c.type === changeTypeFilter) &&
                  (changeStatusFilter === 'all' || c.status === changeStatusFilter)
                ).length} von {changes.length}
              </span>
            </div>
          )}

          {/* List */}
          {(() => {
            const filtered = changes
              .filter(c =>
                (changeTypeFilter === 'all' || c.type === changeTypeFilter) &&
                (changeStatusFilter === 'all' || c.status === changeStatusFilter)
              )
              .sort((a, b) => {
                if (a.status === 'erledigt' && b.status !== 'erledigt') return 1;
                if (b.status === 'erledigt' && a.status !== 'erledigt') return -1;
                return PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
              });

            if (filtered.length === 0) {
              return (
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #E5E5EA', padding: '48px', textAlign: 'center' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <CheckSquare size={18} color="#C7C7CC" />
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#3C3C43', marginBottom: '4px' }}>
                    {changes.length === 0 ? 'Noch keine Änderungen' : 'Keine Einträge'}
                  </p>
                  <p style={{ fontSize: '13px', color: '#8E8E93' }}>
                    {changes.length === 0 ? 'Leg die erste Änderung oben an.' : 'Passe den Filter an.'}
                  </p>
                </div>
              );
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {filtered.map(ch => {
                  const priCfg = PRIORITY_CONFIG[ch.priority] || PRIORITY_CONFIG.mittel;
                  const typCfg = CHANGE_TYPE_CONFIG[ch.type]  || CHANGE_TYPE_CONFIG.intern;
                  const staCfg = CHANGE_STATUS_CONFIG[ch.status] || CHANGE_STATUS_CONFIG.offen;
                  const isExpanded = expandedChangeId === ch.id;
                  const isEditing  = editingChangeId  === ch.id;
                  const isDone     = ch.status === 'erledigt';

                  return (
                    <div key={ch.id} style={{
                      background: isDone ? '#FAFAFA' : '#fff',
                      borderRadius: '14px',
                      border: '1px solid #E5E5EA',
                      borderLeft: `3px solid ${isDone ? '#D1FAE5' : priCfg.color}`,
                      overflow: 'hidden',
                      transition: 'box-shadow 0.15s',
                    }}
                      onMouseEnter={e => { if (!isDone) e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                    >
                      {/* Card header */}
                      <div
                        style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => setExpandedChangeId(isExpanded ? null : ch.id)}
                      >
                        {/* Priority dot + label */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: '68px', flexShrink: 0 }}>
                          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: isDone ? '#34C759' : priCfg.color }} />
                          <span style={{ fontSize: '11px', fontWeight: '600', color: isDone ? '#34C759' : priCfg.color }}>
                            {isDone ? 'Erledigt' : priCfg.label}
                          </span>
                        </div>

                        {/* Title */}
                        <span style={{
                          flex: 1, fontSize: '13.5px', fontWeight: '500',
                          color: isDone ? '#8E8E93' : '#1D1D1F',
                          textDecoration: isDone ? 'line-through' : 'none',
                          letterSpacing: '-0.01em',
                        }}>
                          {ch.title}
                        </span>

                        {/* Type badge */}
                        <span style={{
                          fontSize: '11px', fontWeight: '600', padding: '3px 9px', borderRadius: '6px',
                          background: typCfg.bg, color: typCfg.color, flexShrink: 0, letterSpacing: '0.01em',
                        }}>
                          {typCfg.label}
                        </span>

                        {/* Status chip */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            const next = CHANGE_STATUS_CYCLE[(CHANGE_STATUS_CYCLE.indexOf(ch.status) + 1) % CHANGE_STATUS_CYCLE.length];
                            updateChangeMutation.mutate({ cid: ch.id, data: { status: next } });
                          }}
                          style={{
                            fontSize: '11px', fontWeight: '600', padding: '4px 10px', borderRadius: '99px',
                            background: staCfg.bg, color: staCfg.color,
                            border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'filter 0.12s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.93)'}
                          onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                          title="Status wechseln"
                        >
                          {staCfg.label}
                        </button>

                        {/* Assignee avatar */}
                        {ch.assignee_name && (
                          <div style={{
                            width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                            background: ch.assignee_color || '#6366f1',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '9px', fontWeight: '700', color: '#fff',
                            border: '2px solid #fff', boxShadow: '0 0 0 1px #E5E5EA',
                          }} title={ch.assignee_name}>
                            {ch.assignee_name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                        )}

                        <ChevronDown size={14} color="#C7C7CC"
                          style={{ flexShrink: 0, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                        />
                      </div>

                      {/* Expanded section */}
                      {isExpanded && (
                        <div style={{ borderTop: '1px solid #F2F2F7', padding: '16px', background: '#FAFAFA' }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <input
                                className="input w-full"
                                value={editChangeForm.title || ''}
                                onChange={e => setEditChangeForm(f => ({ ...f, title: e.target.value }))}
                                placeholder="Titel"
                                style={{ fontSize: '14px' }}
                              />
                              <textarea
                                className="input w-full resize-none"
                                rows={3}
                                value={editChangeForm.description || ''}
                                onChange={e => setEditChangeForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="Beschreibung (optional)"
                                style={{ fontSize: '13px' }}
                              />
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                  <p style={{ fontSize: '11px', fontWeight: '600', color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Typ</p>
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    {Object.entries(CHANGE_TYPE_CONFIG).map(([k, v]) => (
                                      <button key={k} type="button"
                                        onClick={() => setEditChangeForm(f => ({ ...f, type: k }))}
                                        style={{
                                          flex: 1, padding: '5px 4px', borderRadius: '7px', fontSize: '12px', fontWeight: '600',
                                          border: `1.5px solid ${editChangeForm.type === k ? v.color : '#E5E5EA'}`,
                                          background: editChangeForm.type === k ? v.bg : '#fff',
                                          color: editChangeForm.type === k ? v.color : '#8E8E93', cursor: 'pointer',
                                        }}
                                      >{v.label}</button>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <p style={{ fontSize: '11px', fontWeight: '600', color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Priorität</p>
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    {PRIORITY_ORDER.map(k => {
                                      const v = PRIORITY_CONFIG[k];
                                      const active = editChangeForm.priority === k;
                                      return (
                                        <button key={k} type="button"
                                          onClick={() => setEditChangeForm(f => ({ ...f, priority: k }))}
                                          style={{
                                            flex: 1, padding: '5px 4px', borderRadius: '7px', fontSize: '12px', fontWeight: '600',
                                            border: `1.5px solid ${active ? v.color : '#E5E5EA'}`,
                                            background: active ? v.color + '15' : '#fff',
                                            color: active ? v.color : '#8E8E93', cursor: 'pointer',
                                          }}
                                        >{v.label}</button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                              <div>
                                <p style={{ fontSize: '11px', fontWeight: '600', color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Zuständig</p>
                                <select
                                  className="input"
                                  value={editChangeForm.assignee_id || ''}
                                  onChange={e => setEditChangeForm(f => ({ ...f, assignee_id: e.target.value ? Number(e.target.value) : null }))}
                                  style={{ fontSize: '13px', width: '100%' }}
                                >
                                  <option value="">— Niemand —</option>
                                  {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}
                                </select>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '4px' }}>
                                <button className="btn-secondary" style={{ fontSize: '13px' }} onClick={() => setEditingChangeId(null)}>
                                  <X size={13}/> Abbrechen
                                </button>
                                <button className="btn-primary" style={{ fontSize: '13px' }}
                                  disabled={updateChangeMutation.isPending}
                                  onClick={() => {
                                    if (!editChangeForm.title?.trim()) return toast.error('Titel erforderlich');
                                    updateChangeMutation.mutate({ cid: ch.id, data: editChangeForm });
                                  }}
                                >
                                  <Save size={13}/> Speichern
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              {ch.description ? (
                                <p style={{ fontSize: '13px', color: '#3C3C43', marginBottom: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                  {ch.description}
                                </p>
                              ) : (
                                <p style={{ fontSize: '13px', color: '#C7C7CC', marginBottom: '14px', fontStyle: 'italic' }}>Keine Beschreibung</p>
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                                {ch.assignee_name && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <div style={{
                                      width: '18px', height: '18px', borderRadius: '50%',
                                      background: ch.assignee_color || '#6366f1',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: '8px', fontWeight: '700', color: '#fff',
                                    }}>
                                      {ch.assignee_name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                    <span style={{ fontSize: '12px', color: '#3C3C43', fontWeight: '500' }}>{ch.assignee_name}</span>
                                  </div>
                                )}
                                <span style={{ fontSize: '11px', color: '#C7C7CC' }}>·</span>
                                <span style={{ fontSize: '12px', color: '#8E8E93' }}>
                                  {new Date(ch.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button className="btn-secondary" style={{ fontSize: '12px', padding: '5px 12px' }}
                                  onClick={() => {
                                    setEditChangeForm({ title: ch.title, description: ch.description || '', type: ch.type, priority: ch.priority, assignee_id: ch.assignee_id });
                                    setEditingChangeId(ch.id);
                                  }}
                                >
                                  <Pencil size={12}/> Bearbeiten
                                </button>
                                <button
                                  style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', padding: '5px 12px', background: 'none', border: '1px solid #FFE5E5', borderRadius: '8px', color: '#EF4444', cursor: 'pointer' }}
                                  onClick={async () => {
                                    const ok = await confirm(`„${ch.title}" wird gelöscht.`, { title: 'Änderung löschen' });
                                    if (ok) deleteChangeMutation.mutate(ch.id);
                                  }}
                                >
                                  <Trash2 size={12}/> Löschen
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {ConfirmDialogNode}
      </div>
    </div>
  );
}
