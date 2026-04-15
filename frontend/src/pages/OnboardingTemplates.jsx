import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, Trash2, Layers } from 'lucide-react';
import { onboardingApi } from '../api/onboarding';
import { useConfirm } from '../hooks/useConfirm';

export default function OnboardingTemplates() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { confirm, ConfirmDialogNode } = useConfirm();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['onboarding-templates'],
    queryFn: () => onboardingApi.listTemplates().then(r => r.data),
  });

  const [creating, setCreating] = useState(false);
  const [newName,  setNewName]  = useState('');

  const createMutation = useMutation({
    mutationFn: (name) => onboardingApi.createTemplate({ name }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['onboarding-templates'] });
      navigate(`/onboarding/templates/${data.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => onboardingApi.deleteTemplate(id),
    onSuccess:  ()  => qc.invalidateQueries({ queryKey: ['onboarding-templates'] }),
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createMutation.mutate(newName.trim());
  };

  if (isLoading) return <div className="p-6 text-sm text-gray-500">Lädt…</div>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Onboarding-Vorlagen</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Erstelle wiederverwendbare Formulare für neue Kunden
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/onboarding/flows')}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Aktive Flows
          </button>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800"
          >
            <Plus size={16} /> Neue Vorlage
          </button>
        </div>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="mb-4 p-4 bg-white border border-gray-200 rounded-xl">
          <label className="text-sm font-medium text-gray-700 block mb-2">Name der Vorlage</label>
          <div className="flex gap-2">
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="z.B. Website-Onboarding"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              Erstellen
            </button>
            <button
              type="button"
              onClick={() => { setCreating(false); setNewName(''); }}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {templates.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Layers size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Noch keine Vorlagen. Erstelle deine erste Vorlage.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map(t => (
            <div
              key={t.id}
              className="group flex items-center bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-gray-300 cursor-pointer transition-colors"
              onClick={() => navigate(`/onboarding/templates/${t.id}`)}
            >
              <div
                className="w-3 h-3 rounded-full mr-4 shrink-0"
                style={{ backgroundColor: t.brand_color || 'var(--color-text)' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{t.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {t.step_count} Schritt{t.step_count !== 1 ? 'e' : ''}
                  {' · '}
                  {t.flow_count} {t.flow_count !== 1 ? 'Flows' : 'Flow'}
                </p>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={async e => {
                    e.stopPropagation();
                    const ok = await confirm(`„${t.name}" wirklich löschen?`, { title: 'Vorlage löschen' });
                    if (ok) deleteMutation.mutate(t.id);
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                >
                  <Trash2 size={15} />
                </button>
                <ChevronRight size={16} className="text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      )}
      {ConfirmDialogNode}
    </div>
  );
}
