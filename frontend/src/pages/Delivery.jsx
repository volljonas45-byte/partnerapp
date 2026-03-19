import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, X, Link2, Shield, Copy, Check,
  ExternalLink, FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { deliveryApi } from '../api/delivery';
import { projectsApi } from '../api/projects';
import { formatDate } from '../utils/formatters';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { useConfirm } from '../hooks/useConfirm';

// ── Badge helpers ─────────────────────────────────────────────────────────────

function TypeBadge({ type }) {
  if (type === 'retainer') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 ring-1 ring-purple-200">
        Retainer
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-blue-200">
      Einmalig
    </span>
  );
}

function StatusBadge({ status }) {
  if (status === 'sent') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
        Gesendet
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 ring-1 ring-gray-200">
      Entwurf
    </span>
  );
}

// ── Toggle button group ───────────────────────────────────────────────────────

function ToggleGroup({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-sm font-medium transition-colors ${
            value === opt.value
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Edit Panel ────────────────────────────────────────────────────────────────

function EditPanel({ doc, onClose, onSave, isSaving }) {
  const [activeTab, setActiveTab] = useState('inhalt');
  const [editData, setEditData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setEditData({
      type: doc.type || 'one_time',
      status: doc.status || 'draft',
      summary: doc.summary || '',
      instructions: doc.instructions || '',
      links: Array.isArray(doc.links) ? doc.links.map(l => ({ ...l })) : [],
      credentials: Array.isArray(doc.credentials) ? doc.credentials.map(c => ({ ...c })) : [],
    });
  }, [doc.id]);

  if (!editData) return null;

  const set = (field, value) => setEditData(prev => ({ ...prev, [field]: value }));

  const updateLink = (idx, field, value) => {
    const next = editData.links.map((l, i) => i === idx ? { ...l, [field]: value } : l);
    set('links', next);
  };
  const addLink = () => set('links', [...editData.links, { label: '', url: '' }]);
  const removeLink = idx => set('links', editData.links.filter((_, i) => i !== idx));

  const updateCredential = (idx, field, value) => {
    const next = editData.credentials.map((c, i) => i === idx ? { ...c, [field]: value } : c);
    set('credentials', next);
  };
  const addCredential = () => set('credentials', [...editData.credentials, { label: '', url: '' }]);
  const removeCredential = idx => set('credentials', editData.credentials.filter((_, i) => i !== idx));

  const publicUrl = `${window.location.origin}/delivery/view/${doc.token}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="w-96 border-l border-gray-100 bg-white flex flex-col h-full overflow-hidden flex-shrink-0">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900 truncate pr-2">{doc.title}</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 px-5">
        {[
          { key: 'inhalt', label: 'Inhalt' },
          { key: 'links',  label: 'Links & Zugänge' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`py-2.5 mr-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {activeTab === 'inhalt' && (
          <>
            {/* Type */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Typ</label>
              <ToggleGroup
                options={[
                  { value: 'one_time', label: 'Einmalig' },
                  { value: 'retainer', label: 'Retainer' },
                ]}
                value={editData.type}
                onChange={v => set('type', v)}
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
              <ToggleGroup
                options={[
                  { value: 'draft', label: 'Entwurf' },
                  { value: 'sent',  label: 'Gesendet' },
                ]}
                value={editData.status}
                onChange={v => set('status', v)}
              />
            </div>

            {/* Access type info */}
            {editData.type === 'one_time' ? (
              <div className="flex items-start gap-2 bg-blue-50 rounded-lg px-3 py-2.5 text-xs text-blue-700">
                <Check size={13} className="mt-0.5 flex-shrink-0" />
                <span>Vollzugang wird übergeben</span>
              </div>
            ) : (
              <div className="flex items-start gap-2 bg-purple-50 rounded-lg px-3 py-2.5 text-xs text-purple-700">
                <Check size={13} className="mt-0.5 flex-shrink-0" />
                <span>Eingeschränkter Zugang (laufender Service)</span>
              </div>
            )}

            {/* Summary */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Projektzusammenfassung
              </label>
              <textarea
                rows={4}
                value={editData.summary}
                onChange={e => set('summary', e.target.value)}
                placeholder="Kurze Beschreibung des Projekts…"
                className="w-full text-sm text-gray-900 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none placeholder-gray-300"
              />
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Anweisungen
              </label>
              <textarea
                rows={5}
                value={editData.instructions}
                onChange={e => set('instructions', e.target.value)}
                placeholder="Anweisungen und Hinweise für den Kunden…"
                className="w-full text-sm text-gray-900 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none placeholder-gray-300"
              />
            </div>
          </>
        )}

        {activeTab === 'links' && (
          <>
            {/* Links */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Links</label>
              <div className="space-y-2">
                {editData.links.map((link, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={link.label}
                      onChange={e => updateLink(idx, 'label', e.target.value)}
                      placeholder="Bezeichnung"
                      className="flex-1 min-w-0 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-300 placeholder-gray-300"
                    />
                    <input
                      type="text"
                      value={link.url}
                      onChange={e => updateLink(idx, 'url', e.target.value)}
                      placeholder="https://…"
                      className="flex-1 min-w-0 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-300 placeholder-gray-300"
                    />
                    <button
                      onClick={() => removeLink(idx)}
                      className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addLink}
                className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
              >
                <Plus size={13} /> Link hinzufügen
              </button>
            </div>

            {/* Credentials */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Zugänge</label>
              <div className="flex items-start gap-2 bg-amber-50 rounded-lg px-3 py-2 mb-3 text-xs text-amber-700">
                <Shield size={12} className="mt-0.5 flex-shrink-0" />
                <span>Keine Passwörter speichern — nur externe Links verwenden</span>
              </div>
              <div className="space-y-2">
                {editData.credentials.map((cred, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={cred.label}
                      onChange={e => updateCredential(idx, 'label', e.target.value)}
                      placeholder="Bezeichnung"
                      className="flex-1 min-w-0 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-300 placeholder-gray-300"
                    />
                    <input
                      type="text"
                      value={cred.url}
                      onChange={e => updateCredential(idx, 'url', e.target.value)}
                      placeholder="https://…"
                      className="flex-1 min-w-0 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-300 placeholder-gray-300"
                    />
                    <button
                      onClick={() => removeCredential(idx)}
                      className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addCredential}
                className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
              >
                <Plus size={13} /> Zugang hinzufügen
              </button>
            </div>
          </>
        )}
      </div>

      {/* Footer actions */}
      <div className="px-5 py-4 border-t border-gray-100 space-y-2.5 flex-shrink-0">
        <button
          onClick={() => onSave(doc.id, editData)}
          disabled={isSaving}
          className="w-full btn-primary text-sm py-2 disabled:opacity-60"
        >
          {isSaving ? 'Speichern…' : 'Speichern'}
        </button>
        {editData.status === 'sent' && doc.token && (
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            {copied ? 'Link kopiert!' : 'Öffentlichen Link kopieren'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── New Delivery Modal ────────────────────────────────────────────────────────

function NewDeliveryModal({ open, onClose, projects, onCreate, isCreating }) {
  const [data, setData] = useState({ project_id: '', type: 'one_time', title: '' });

  const selectedProject = projects.find(p => String(p.id) === String(data.project_id));

  const handleProjectChange = id => {
    const proj = projects.find(p => String(p.id) === String(id));
    setData(prev => ({
      ...prev,
      project_id: id,
      title: proj ? `${proj.name} – Übergabe` : prev.title,
    }));
  };

  const handleSubmit = () => {
    if (!data.project_id) { toast.error('Bitte ein Projekt auswählen'); return; }
    if (!data.title.trim()) { toast.error('Bitte einen Titel eingeben'); return; }
    onCreate(data, () => {
      setData({ project_id: '', type: 'one_time', title: '' });
      onClose();
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Neue Übergabe">
      <div className="space-y-4 pb-2">
        {/* Project select */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Projekt</label>
          <select
            value={data.project_id}
            onChange={e => handleProjectChange(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white text-gray-900"
          >
            <option value="">— Projekt wählen —</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Typ</label>
          <ToggleGroup
            options={[
              { value: 'one_time', label: 'Einmalig' },
              { value: 'retainer', label: 'Retainer' },
            ]}
            value={data.type}
            onChange={v => setData(prev => ({ ...prev, type: v }))}
          />
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Titel</label>
          <input
            type="text"
            value={data.title}
            onChange={e => setData(prev => ({ ...prev, title: e.target.value }))}
            placeholder={selectedProject ? `${selectedProject.name} – Übergabe` : 'Titel…'}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300 placeholder-gray-300"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={isCreating}
          className="w-full btn-primary text-sm py-2 disabled:opacity-60 mt-2"
        >
          {isCreating ? 'Erstellen…' : 'Übergabe erstellen'}
        </button>
      </div>
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Delivery() {
  const qc = useQueryClient();
  const { confirm, ConfirmDialogNode } = useConfirm();

  const [selected, setSelected]       = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['delivery'],
    queryFn: deliveryApi.getAll,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: deliveryApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery'] });
      toast.success('Übergabe erstellt');
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler beim Erstellen'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => deliveryApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery'] });
      toast.success('Gespeichert');
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler beim Speichern'),
  });

  const deleteMutation = useMutation({
    mutationFn: deliveryApi.delete,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['delivery'] });
      if (selected === id) setSelected(null);
      toast.success('Übergabe gelöscht');
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler beim Löschen'),
  });

  const handleCreate = (data, callback) => {
    createMutation.mutate(data, { onSuccess: callback });
  };

  const handleSave = (id, editData) => {
    updateMutation.mutate({ id, data: editData });
  };

  const handleDelete = async (e, doc) => {
    e.stopPropagation();
    const ok = await confirm(`„${doc.title}" wird unwiderruflich gelöscht.`, { title: 'Dokument löschen' });
    if (!ok) return;
    deleteMutation.mutate(doc.id);
  };

  const selectedDoc = docs.find(d => d.id === selected) || null;

  if (isLoading) return <LoadingSpinner className="h-64" />;

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className="flex-1 min-w-0 p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Übergabe</h1>
            <p className="text-sm text-gray-500 mt-0.5">{docs.length} Dokument{docs.length !== 1 ? 'e' : ''}</p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="btn-primary"
          >
            <Plus size={16} /> Neu
          </button>
        </div>

        {/* Table */}
        {docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText size={32} className="text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">Noch keine Übergabe-Dokumente vorhanden</p>
            <button
              onClick={() => setShowNewModal(true)}
              className="mt-4 text-sm text-gray-500 hover:text-gray-800 underline underline-offset-2 transition-colors"
            >
              Erste Übergabe erstellen
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">Titel</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">Projekt</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">Typ</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">Datum</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {docs.map(doc => (
                  <tr
                    key={doc.id}
                    onClick={() => setSelected(doc.id === selected ? null : doc.id)}
                    className={`cursor-pointer transition-colors group ${
                      doc.id === selected
                        ? 'bg-gray-50'
                        : 'hover:bg-gray-50/60'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className={`font-medium ${doc.id === selected ? 'text-gray-900' : 'text-gray-800'}`}>
                        {doc.title}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {doc.project_name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <TypeBadge type={doc.type} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {doc.created_at ? formatDate(doc.created_at) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={e => handleDelete(e, doc)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Right panel */}
      {selectedDoc && (
        <EditPanel
          key={selectedDoc.id}
          doc={selectedDoc}
          onClose={() => setSelected(null)}
          onSave={handleSave}
          isSaving={updateMutation.isPending}
        />
      )}

      {/* New modal */}
      <NewDeliveryModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        projects={projects}
        onCreate={handleCreate}
        isCreating={createMutation.isPending}
      />
      {ConfirmDialogNode}
    </div>
  );
}
