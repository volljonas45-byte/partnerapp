import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, ClipboardList, Search, Trash2, Download, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { quotesApi } from '../api/quotes';
import { formatCurrency, formatDate } from '../utils/formatters';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { useConfirm } from '../hooks/useConfirm';

const STATUS_FILTERS = [
  { key: 'all',       label: 'Alle'        },
  { key: 'draft',     label: 'Entwurf'     },
  { key: 'sent',      label: 'Gesendet'    },
  { key: 'accepted',  label: 'Akzeptiert'  },
  { key: 'rejected',  label: 'Abgelehnt'   },
  { key: 'expired',   label: 'Abgelaufen'  },
  { key: 'converted', label: 'Umgewandelt' },
];

export default function Quotes() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { confirm, ConfirmDialogNode } = useConfirm();

  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('all');

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => quotesApi.list().then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: quotesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Angebot gelöscht');
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler beim Löschen'),
  });

  const filtered = useMemo(() => quotes.filter(q => {
    const s = search.toLowerCase();
    const matchSearch = !s
      || q.quote_number?.toLowerCase().includes(s)
      || q.client_name?.toLowerCase().includes(s);
    const matchStatus = statusFilter === 'all' || q.status === statusFilter;
    return matchSearch && matchStatus;
  }), [quotes, search, statusFilter]);

  const handleDelete = async (e, q) => {
    e.stopPropagation();
    const ok = await confirm(`Angebot ${q.quote_number} wird unwiderruflich gelöscht.`, { title: 'Angebot löschen' });
    if (!ok) return;
    deleteMutation.mutate(q.id);
  };

  const handleDownload = async (e, q) => {
    e.stopPropagation();
    try {
      await quotesApi.downloadPDF(q.id, q.quote_number);
    } catch {
      toast.error('PDF konnte nicht heruntergeladen werden');
    }
  };

  if (isLoading) return (
    <div className="p-8">
      <div className="page-header">
        <div>
          <div className="skeleton h-7 w-28 mb-2" />
          <div className="skeleton h-4 w-20" />
        </div>
        <div className="skeleton h-9 w-36 rounded-full" />
      </div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <div className="skeleton h-9 w-60 rounded-xl" />
        <div className="skeleton h-9 w-64 rounded-lg" />
      </div>
      <div className="card p-0 overflow-hidden">
        <div style={{ padding: '10px 18px', background: 'rgba(118,118,128,0.06)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="skeleton h-3 w-28" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 18px 12px 20px', borderBottom: i < 4 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
            <div className="skeleton h-4" style={{ width: '100px' }} />
            <div className="skeleton h-4" style={{ width: `${110 + i * 18}px` }} />
            <div className="skeleton h-4 hidden md:block" style={{ width: '80px' }} />
            <div className="skeleton h-5 rounded-full" style={{ width: '72px' }} />
            <div className="skeleton h-4 ml-auto" style={{ width: '64px' }} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Angebote</h1>
          <p className="text-sm text-gray-500 mt-0.5">{quotes.length} gesamt</p>
        </div>
        <button onClick={() => navigate('/quotes/new')} className="btn-primary">
          <Plus size={16} /> Neues Angebot
        </button>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 w-64"
            placeholder="Nach Nummer oder Kunde suchen…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 flex-wrap">
          {STATUS_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatus(key)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                statusFilter === key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-14">
          <ClipboardList size={32} className="mx-auto text-gray-200 mb-3" />
          <p className="text-sm text-gray-400">
            {search || statusFilter !== 'all'
              ? 'Keine Angebote gefunden.'
              : 'Noch keine Angebote.'}
          </p>
          {!search && statusFilter === 'all' && (
            <button onClick={() => navigate('/quotes/new')} className="btn-primary mt-4">
              <Plus size={16} /> Angebot erstellen
            </button>
          )}
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400">Nummer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400">Kunde</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400">Datum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400">Gültig bis</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400">Betrag</th>
                <th className="px-6 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(q => (
                <tr
                  key={q.id}
                  onClick={() => navigate(`/quotes/${q.id}`)}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-3 font-medium text-gray-900">{q.quote_number}</td>
                  <td className="px-6 py-3 text-gray-700">{q.client_name}</td>
                  <td className="px-6 py-3 text-gray-500">{formatDate(q.issue_date)}</td>
                  <td className="px-6 py-3 text-gray-500">{formatDate(q.valid_until)}</td>
                  <td className="px-6 py-3"><StatusBadge status={q.status} /></td>
                  <td className="px-6 py-3 text-right font-semibold text-gray-900">{formatCurrency(q.total)}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/quotes/${q.id}`)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                        title="Öffnen"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={e => handleDownload(e, q)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                        title="PDF herunterladen"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={e => handleDelete(e, q)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Löschen"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {ConfirmDialogNode}
    </div>
  );
}
