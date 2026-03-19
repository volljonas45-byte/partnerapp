import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Copy, Check, ArrowLeft, ExternalLink, Clock, CheckCircle, CircleDot, User } from 'lucide-react';
import { onboardingApi } from '../api/onboarding';
import { clientsApi } from '../api/clients';
import { useConfirm } from '../hooks/useConfirm';

const STATUS_CONFIG = {
  pending:     { label: 'Ausstehend',   icon: Clock,       color: 'text-gray-400 bg-gray-100'  },
  in_progress: { label: 'In Bearbeitung', icon: CircleDot, color: 'text-blue-600 bg-blue-50'  },
  completed:   { label: 'Abgeschlossen', icon: CheckCircle, color: 'text-green-600 bg-green-50' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      title="Link kopieren"
      className="p-1.5 text-gray-400 hover:text-gray-700 rounded transition-colors"
    >
      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
    </button>
  );
}

export default function OnboardingFlows() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { confirm, ConfirmDialogNode } = useConfirm();

  const { data: flows = [], isLoading: flowsLoading } = useQuery({
    queryKey: ['onboarding-flows'],
    queryFn: () => onboardingApi.listFlows().then(r => r.data),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['onboarding-templates'],
    queryFn: () => onboardingApi.listTemplates().then(r => r.data),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list().then(r => r.data),
  });

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ template_id: '', client_id: '', client_name: '', pin: '' });

  const deleteMutation = useMutation({
    mutationFn: (id) => onboardingApi.deleteFlow(id),
    onSuccess:  ()  => qc.invalidateQueries({ queryKey: ['onboarding-flows'] }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => onboardingApi.createFlow(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['onboarding-flows'] });
      setShowCreate(false);
      setForm({ template_id: '', client_id: '', client_name: '', pin: '' });
    },
  });

  const handleClientSelect = (clientId) => {
    if (!clientId) {
      setForm(f => ({ ...f, client_id: '', client_name: '' }));
    } else {
      const client = clients.find(c => String(c.id) === clientId);
      setForm(f => ({ ...f, client_id: clientId, client_name: client?.company_name || '' }));
    }
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.template_id) return;
    createMutation.mutate({
      template_id: Number(form.template_id),
      client_id:   form.client_id ? Number(form.client_id) : undefined,
      client_name: form.client_name,
      pin:         form.pin || undefined,
    });
  };

  const flowUrl = (token) => `${window.location.origin}/onboarding/${token}`;

  if (flowsLoading) return <div className="p-6 text-sm text-gray-500">Lädt…</div>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/onboarding')}
          className="p-1.5 text-gray-400 hover:text-gray-900 rounded"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-gray-900">Aktive Flows</h1>
          <p className="text-sm text-gray-500 mt-0.5">Versendete Onboarding-Links und deren Status</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800"
        >
          <Plus size={16} /> Flow erstellen
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Neuen Flow erstellen</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="config-label">Vorlage *</label>
              <select
                required
                value={form.template_id}
                onChange={e => setForm(f => ({ ...f, template_id: e.target.value }))}
                className="config-select w-full"
              >
                <option value="">Vorlage wählen…</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="config-label">Kunde</label>
              <select
                value={form.client_id}
                onChange={e => handleClientSelect(e.target.value)}
                className="config-select w-full"
              >
                <option value="">Kein Kunde (manuell eingeben)</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.company_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="config-label">
                {form.client_id ? 'Anzeigename (optional überschreiben)' : 'Kundenname'}
              </label>
              <input
                value={form.client_name}
                onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                placeholder="z.B. Müller GmbH"
                className="config-input"
              />
            </div>
            <div>
              <label className="config-label">PIN (optional)</label>
              <input
                value={form.pin}
                onChange={e => setForm(f => ({ ...f, pin: e.target.value }))}
                placeholder="Schutz-PIN für den Link"
                className="config-input"
              />
              <p className="text-xs text-gray-400 mt-1">Leer lassen für keinen Schutz</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createMutation.isPending || !form.template_id}
              className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              Erstellen &amp; Link generieren
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {flows.length === 0 ? (
        <div className="text-center py-16 text-gray-400 border border-dashed border-gray-200 rounded-xl">
          <p className="text-sm">Noch keine Flows erstellt.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {flows.map(flow => {
            const url = flowUrl(flow.link_token);
            const displayName = flow.client_name || flow.linked_client_name || '—';
            return (
              <div key={flow.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: flow.brand_color || '#111827' }}
                      />
                      <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                      <StatusBadge status={flow.status} />
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-gray-400">{flow.template_name}</p>
                      {flow.client_id && (
                        <button
                          onClick={() => navigate(`/clients/${flow.client_id}`)}
                          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700"
                        >
                          <User size={11} />
                          {flow.linked_client_name || 'Kunde ansehen'}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Erstellt: {new Date(flow.created_at).toLocaleDateString('de-DE')}
                      {flow.completed_at && (
                        <> · Abgeschlossen: {new Date(flow.completed_at).toLocaleDateString('de-DE')}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => window.open(url, '_blank')}
                      title="Flow öffnen"
                      className="p-1.5 text-gray-400 hover:text-gray-700 rounded"
                    >
                      <ExternalLink size={14} />
                    </button>
                    <CopyButton text={url} />
                    <button
                      onClick={async () => {
                        const ok = await confirm(`Flow für „${displayName}" löschen?`, { title: 'Flow löschen' });
                        if (ok) deleteMutation.mutate(flow.id);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded flex-1 truncate">
                      {url}
                    </code>
                    <CopyButton text={url} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {ConfirmDialogNode}
    </div>
  );
}
