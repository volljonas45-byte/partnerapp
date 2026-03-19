import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsApi } from '../api/projects';
import { clientsApi } from '../api/clients';
import LoadingSpinner from '../components/LoadingSpinner';

const STATUS_OPTIONS = [
  { value: 'planned',   label: 'Geplant'       },
  { value: 'active',    label: 'Aktiv'         },
  { value: 'waiting',   label: 'Wartend'       },
  { value: 'completed', label: 'Abgeschlossen' },
];

const TYPE_OPTIONS = [
  { value: '',              label: 'Typ auswählen…'   },
  { value: 'website_code',  label: 'Website (Code)'   },
  { value: 'website_wix',   label: 'Website (Wix)'    },
  { value: 'funnel',        label: 'Funnel'            },
  { value: 'video',         label: 'Video'             },
  { value: 'content',       label: 'Content'           },
  { value: 'seo',           label: 'SEO'               },
];

export default function NewProject() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [name,        setName]        = useState('');
  const [clientId,    setClientId]    = useState('');
  const [status,      setStatus]      = useState('planned');
  const [type,        setType]        = useState('');
  const [startDate,   setStartDate]   = useState('');
  const [deadline,    setDeadline]    = useState('');
  const [budget,      setBudget]      = useState('');
  const [description, setDescription] = useState('');

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Projekt erstellt');
      navigate(`/projects/${project.id}`);
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler beim Erstellen'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Projektname ist erforderlich');
    if (!clientId)    return toast.error('Bitte einen Kunden auswählen');

    createMutation.mutate({
      name:        name.trim(),
      client_id:   Number(clientId),
      status,
      type:        type || undefined,
      start_date:  startDate  || undefined,
      deadline:    deadline   || undefined,
      budget:      budget     ? Number(budget) : undefined,
      description: description.trim(),
    });
  };

  if (clientsLoading) return <LoadingSpinner className="h-64" />;

  return (
    <div className="min-h-full flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate('/projects')}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Neues Projekt</h1>
            <p className="text-sm text-gray-500 mt-0.5">Projektdetails eingeben</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name + Client */}
          <div className="card space-y-4">
            <h2 className="text-sm font-medium text-gray-700">Allgemein</h2>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Projektname *</label>
              <input
                className="input w-full"
                placeholder="z.B. Website Relaunch"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kunde *</label>
              <select
                className="input w-full"
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                required
              >
                <option value="">Kunde auswählen…</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.company_name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Projekttyp</label>
                <select className="input w-full" value={type} onChange={e => setType(e.target.value)}>
                  {TYPE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select className="input w-full" value={status} onChange={e => setStatus(e.target.value)}>
                  {STATUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Dates + Budget */}
          <div className="card space-y-4">
            <h2 className="text-sm font-medium text-gray-700">Zeitplan & Budget</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Startdatum</label>
                <input
                  type="date"
                  className="input w-full"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Deadline</label>
                <input
                  type="date"
                  className="input w-full"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Budget (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input w-full"
                placeholder="0,00"
                value={budget}
                onChange={e => setBudget(e.target.value)}
              />
            </div>
          </div>

          {/* Description */}
          <div className="card space-y-4">
            <h2 className="text-sm font-medium text-gray-700">Beschreibung</h2>
            <textarea
              className="input w-full resize-none"
              rows={4}
              placeholder="Optionale Projektbeschreibung…"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={() => navigate('/projects')} className="btn-secondary">
              Abbrechen
            </button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
              <Save size={16} />
              {createMutation.isPending ? 'Wird erstellt…' : 'Projekt erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
