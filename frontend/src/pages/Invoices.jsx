import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Search, Trash2, Download, Eye, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { invoicesApi } from '../api/invoices';
import { formatCurrency, formatDate, isPast } from '../utils/formatters';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { useConfirm } from '../hooks/useConfirm';

const STATUS_FILTERS = [
  { key: 'all',       label: 'Alle'       },
  { key: 'draft',     label: 'Entwurf'    },
  { key: 'sent',      label: 'Gesendet'   },
  { key: 'paid',      label: 'Bezahlt'    },
  { key: 'overdue',   label: 'Überfällig' },
  { key: 'cancelled', label: 'Storniert'  },
];

export default function Invoices() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('all');
  const { confirm, ConfirmDialogNode } = useConfirm();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoicesApi.list().then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: invoicesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Rechnung gelöscht');
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler beim Löschen'),
  });

  const filtered = useMemo(() => invoices.filter(inv => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || inv.invoice_number.toLowerCase().includes(q)
      || inv.client_name?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  }), [invoices, search, statusFilter]);

  const handleDelete = async (e, inv) => {
    e.stopPropagation();
    const ok = await confirm(`Rechnung ${inv.invoice_number} wird unwiderruflich gelöscht.`, { title: 'Rechnung löschen' });
    if (!ok) return;
    deleteMutation.mutate(inv.id);
  };

  const handleDownload = async (e, inv) => {
    e.stopPropagation();
    try {
      await invoicesApi.downloadPDF(inv.id, inv.invoice_number);
    } catch {
      toast.error('PDF konnte nicht heruntergeladen werden');
    }
  };

  // Stats
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;
  const openCount    = invoices.filter(i => ['sent', 'unpaid'].includes(i.status)).length;

  if (isLoading) return <LoadingSpinner className="h-64" />;

  return (
    <div className="p-8 animate-fade-in">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Rechnungen</h1>
          <p className="page-subtitle">
            {invoices.length} gesamt
            {overdueCount > 0 && (
              <span className="ml-2 text-red-500 font-medium">
                · {overdueCount} überfällig
              </span>
            )}
          </p>
        </div>
        <button onClick={() => navigate('/invoices/new')} className="btn-primary">
          <Plus size={15} /> Neue Rechnung
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            className="input pl-9 w-60"
            placeholder="Suchen…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Segmented control */}
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-1">
          {STATUS_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatus(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                statusFilter === key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
              {key === 'overdue' && overdueCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold">
                  {overdueCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText size={20} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">
            {search || statusFilter !== 'all' ? 'Keine Rechnungen gefunden' : 'Noch keine Rechnungen'}
          </p>
          <p className="text-xs text-gray-400 mb-5">
            {search ? `Keine Treffer für „${search}"` : statusFilter !== 'all' ? 'Keine Rechnungen mit diesem Status.' : 'Erstellen Sie Ihre erste Rechnung.'}
          </p>
          {!search && statusFilter === 'all' && (
            <button onClick={() => navigate('/invoices/new')} className="btn-primary mx-auto">
              <Plus size={15} /> Rechnung erstellen
            </button>
          )}
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="table-header-cell pl-5">Nummer</th>
                <th className="table-header-cell">Kunde</th>
                <th className="table-header-cell hidden md:table-cell">Datum</th>
                <th className="table-header-cell hidden sm:table-cell">Fällig</th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell text-right">Betrag</th>
                <th className="table-header-cell w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => {
                const isOverdue = inv.status === 'overdue' || (inv.due_date && isPast(inv.due_date) && inv.status !== 'paid' && inv.status !== 'cancelled');
                return (
                  <tr
                    key={inv.id}
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    className="group table-row border-b border-gray-50 last:border-0"
                  >
                    <td className="table-cell pl-5">
                      <span className="font-mono font-medium text-gray-900 text-xs">{inv.invoice_number}</span>
                    </td>
                    <td className="table-cell">
                      <span className="font-medium text-gray-800">{inv.client_name}</span>
                    </td>
                    <td className="table-cell text-gray-500 text-xs hidden md:table-cell">
                      {formatDate(inv.issue_date)}
                    </td>
                    <td className="table-cell hidden sm:table-cell">
                      <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {isOverdue && <AlertTriangle size={11} />}
                        {formatDate(inv.due_date)}
                      </span>
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="table-cell text-right">
                      <span className={`font-semibold tabular-nums ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                        {formatCurrency(inv.total)}
                      </span>
                    </td>
                    <td className="table-cell pr-4">
                      <div
                        className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={e => handleDownload(e, inv)}
                          title="PDF herunterladen"
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                        >
                          <Download size={13} />
                        </button>
                        <button
                          onClick={e => handleDelete(e, inv)}
                          title="Löschen"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {ConfirmDialogNode}
    </div>
  );
}
