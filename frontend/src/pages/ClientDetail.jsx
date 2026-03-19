import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Mail, Phone, MapPin, Building2, FileText, Plus, ShieldCheck, User, Pencil, X, Check } from 'lucide-react';
import { clientsApi } from '../api/clients';
import { legalApi } from '../api/legal';
import { formatCurrency, formatDate } from '../utils/formatters';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon size={14} className="text-gray-400 mt-0.5 shrink-0" />
      <div>
        <span className="text-gray-400 text-xs">{label}</span>
        <p className="text-gray-800">{value}</p>
      </div>
    </div>
  );
}

function ContactPersonWidget({ client, clientId }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  const saveMutation = useMutation({
    mutationFn: data => clientsApi.update(clientId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients', clientId] }); toast.success('Gespeichert'); setEditing(false); },
    onError: () => toast.error('Fehler beim Speichern'),
  });

  function startEdit() {
    setForm({ contact_person: client.contact_person || '', email: client.email || '', phone: client.phone || '' });
    setEditing(true);
  }

  return (
    <div className="card mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <User size={16} className="text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-900">Kontaktperson</h2>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600">Abbrechen</button>
            <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="btn-primary text-xs px-3 py-1.5">Speichern</button>
          </div>
        ) : (
          <button onClick={startEdit} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">Bearbeiten</button>
        )}
      </div>
      {editing ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[['Name', 'contact_person'], ['E-Mail', 'email'], ['Telefon', 'phone']].map(([label, key]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
              <input className="input w-full" value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-sm">
          <div className="flex items-start gap-2">
            <User size={14} className="text-gray-300 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Name</p>
              <p className="text-gray-800">{client.contact_person || <span className="text-gray-300">–</span>}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Mail size={14} className="text-gray-300 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-400 mb-0.5">E-Mail</p>
              <p className="text-gray-800 break-all">{client.email || <span className="text-gray-300">–</span>}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Phone size={14} className="text-gray-300 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Telefon</p>
              <p className="text-gray-800">{client.phone || <span className="text-gray-300">–</span>}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LegalSetup({ clientId }) {
  const qc = useQueryClient();
  const { data: legal } = useQuery({
    queryKey: ['legal', clientId],
    queryFn: () => legalApi.get(clientId),
  });

  const [form, setForm] = useState(null);
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: data => legalApi.save(clientId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['legal', clientId] }); toast.success('Legal Setup gespeichert'); setForm(null); },
    onError: () => toast.error('Fehler beim Speichern'),
  });

  const data = form ?? legal ?? {};

  return (
    <div className="card mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-900">Legal Setup</h2>
        </div>
        {form
          ? <div className="flex gap-2">
              <button onClick={() => setForm(null)} className="text-xs text-gray-400 hover:text-gray-600">Abbrechen</button>
              <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="btn-primary text-xs px-3 py-1.5">Speichern</button>
            </div>
          : <button onClick={() => setForm({ company_name: data.company_name||'', address: data.address||'', vat_id: data.vat_id||'', dsgvo_provider: data.dsgvo_provider||'' })} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">Bearbeiten</button>
        }
      </div>
      {form ? (
        <div className="grid grid-cols-2 gap-3">
          {[['Firmenname', 'company_name'], ['Adresse', 'address'], ['USt-IdNr.', 'vat_id'], ['DSGVO-Anbieter', 'dsgvo_provider']].map(([label, key]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
              <input className="input w-full" value={form[key] || ''} onChange={e => set(key)(e.target.value)} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm">
          {[['Firmenname', data.company_name], ['Adresse', data.address], ['USt-IdNr.', data.vat_id], ['DSGVO-Anbieter', data.dsgvo_provider]].map(([label, val]) => (
            <div key={label}>
              <span className="text-xs text-gray-400">{label}</span>
              <p className="text-gray-700">{val || <span className="text-gray-300">–</span>}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ['clients', id],
    queryFn: () => clientsApi.get(id).then(r => r.data),
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['clients', id, 'invoices'],
    queryFn: () => clientsApi.invoices(id).then(r => r.data),
  });

  if (clientLoading || invoicesLoading) return <LoadingSpinner className="h-64" />;
  if (!client) return <div className="p-8 text-gray-400">Kunde nicht gefunden.</div>;

  const address = [
    client.address,
    [client.postal_code, client.city].filter(Boolean).join(' '),
    client.country,
  ].filter(Boolean).join(', ');

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/clients')}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{client.company_name}</h1>
            {client.contact_person && (
              <p className="text-sm text-gray-500 mt-0.5">{client.contact_person}</p>
            )}
          </div>
        </div>

        <button onClick={() => navigate('/invoices/new')} className="btn-primary">
          <Plus size={16} /> Neue Rechnung
        </button>
      </div>

      {/* Statistiken + Kontakt */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card lg:col-span-2 grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Gesamtumsatz</p>
            <p className="text-2xl font-semibold text-gray-900">
              {formatCurrency(client.total_revenue || 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Bezahlter Umsatz</p>
            <p className="text-2xl font-semibold text-emerald-600">
              {formatCurrency(client.paid_revenue || 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Rechnungen gesamt</p>
            <p className="text-2xl font-semibold text-gray-900">{client.invoice_count || 0}</p>
            {client.last_invoice_date && (
              <p className="text-xs text-gray-400 mt-0.5">
                Letzte: {formatDate(client.last_invoice_date)}
              </p>
            )}
          </div>
        </div>

        <div className="card space-y-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Kontakt</p>
          <InfoRow icon={Mail}      label="E-Mail"     value={client.email} />
          <InfoRow icon={Phone}     label="Telefon"    value={client.phone} />
          <InfoRow icon={MapPin}    label="Adresse"    value={address} />
          <InfoRow icon={Building2} label="USt-IdNr."  value={client.vat_id} />
        </div>
      </div>

      {/* Kontaktperson */}
      <ContactPersonWidget client={client} clientId={id} />

      {/* Legal Setup */}
      <LegalSetup clientId={id} />

      {/* Rechnungsliste */}
      <div className="card p-0 overflow-hidden mt-6">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            Rechnungen
            <span className="ml-2 text-gray-400 font-normal">{invoices.length}</span>
          </h2>
        </div>

        {invoices.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FileText size={32} className="mx-auto text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">Noch keine Rechnungen für diesen Kunden.</p>
            <button onClick={() => navigate('/invoices/new')} className="btn-primary mt-4">
              <Plus size={16} /> Rechnung erstellen
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400">Nummer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400">Datum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400">Fällig</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400">Betrag</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr
                  key={inv.id}
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-3 font-medium text-gray-900">{inv.invoice_number}</td>
                  <td className="px-6 py-3 text-gray-500">{formatDate(inv.issue_date)}</td>
                  <td className="px-6 py-3 text-gray-500">{formatDate(inv.due_date)}</td>
                  <td className="px-6 py-3"><StatusBadge status={inv.status} /></td>
                  <td className="px-6 py-3 text-right font-semibold text-gray-900">
                    {formatCurrency(inv.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
