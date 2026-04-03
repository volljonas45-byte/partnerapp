import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Search, Trash2, Download, Eye, AlertTriangle, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { invoicesApi } from '../api/invoices';
import { formatCurrency, formatDate, isPast } from '../utils/formatters';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { useConfirm } from '../hooks/useConfirm';
import { useMobile } from '../hooks/useMobile';

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
  const isMobile = useMobile();

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

  if (isLoading) return (
    <div className={isMobile ? "p-4" : "p-8"}>
      <div className="page-header">
        <div>
          <div className="skeleton h-7 w-36 mb-2" />
          <div className="skeleton h-4 w-24" />
        </div>
        <div className="skeleton h-9 w-40 rounded-full" />
      </div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <div className="skeleton h-9 w-56 rounded-xl" />
        <div className="skeleton h-9 w-72 rounded-lg" />
      </div>
      <div className="card p-0 overflow-hidden">
        <div style={{ padding: '10px 18px', background: 'rgba(118,118,128,0.06)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="skeleton h-3 w-32" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 18px 12px 20px', borderBottom: i < 4 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
            <div className="skeleton h-4" style={{ width: '100px' }} />
            <div className="skeleton h-4" style={{ width: `${120 + i * 15}px` }} />
            <div className="skeleton h-4 hidden md:block" style={{ width: '80px' }} />
            <div className="skeleton h-5 rounded-full" style={{ width: '72px' }} />
            <div className="skeleton h-4 ml-auto" style={{ width: '64px' }} />
          </div>
        ))}
      </div>
    </div>
  );

  // ── Mobile layout ─────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ background: '#F5F5F7', minHeight: '100vh' }}>
        {/* Header */}
        <div style={{ padding: '20px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.4px', margin: 0 }}>Rechnungen</h1>
            <p style={{ fontSize: 13, color: '#86868B', margin: '2px 0 0' }}>
              {invoices.length} gesamt{overdueCount > 0 && <span style={{ color: '#FF3B30', marginLeft: 6 }}>· {overdueCount} überfällig</span>}
            </p>
          </div>
          <button
            onClick={() => navigate('/invoices/new')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 12, background: '#0071E3', color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            <Plus size={15} strokeWidth={2.5} />
            Neu
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '0 16px 10px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 28, top: '50%', transform: 'translateY(-50%)', color: '#86868B', pointerEvents: 'none' }} />
          <input
            style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
            placeholder="Suchen…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter scroll */}
        <div style={{ display: 'flex', gap: 8, padding: '0 16px 14px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {STATUS_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatus(key)}
              style={{
                flexShrink: 0, padding: '7px 14px', borderRadius: 99, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: statusFilter === key ? '#1D1D1F' : '#fff',
                color: statusFilter === key ? '#fff' : '#636366',
              }}
            >
              {label}
              {key === 'overdue' && overdueCount > 0 && (
                <span style={{ marginLeft: 5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', background: '#FF3B30', color: '#fff', fontSize: 9, fontWeight: 700 }}>
                  {overdueCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Card list */}
        <div style={{ padding: '0 16px' }}>
          {filtered.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 16, padding: '40px 20px', textAlign: 'center' }}>
              <FileText size={32} color="#D1D1D6" strokeWidth={1.25} style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: '#1D1D1F', margin: '0 0 4px' }}>
                {search || statusFilter !== 'all' ? 'Keine Rechnungen gefunden' : 'Noch keine Rechnungen'}
              </p>
              <p style={{ fontSize: 13, color: '#86868B', margin: 0 }}>
                {search ? `Keine Treffer für „${search}"` : 'Erstelle jetzt deine erste Rechnung.'}
              </p>
              {!search && statusFilter === 'all' && (
                <button onClick={() => navigate('/invoices/new')} style={{ marginTop: 16, padding: '10px 20px', borderRadius: 12, background: '#0071E3', color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Rechnung erstellen
                </button>
              )}
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
              {filtered.map((inv, idx) => {
                const isOverdue = inv.status === 'overdue' || (inv.due_date && isPast(inv.due_date) && inv.status !== 'paid' && inv.status !== 'cancelled');
                return (
                  <div
                    key={inv.id}
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', padding: '14px 16px', cursor: 'pointer',
                      borderBottom: idx < filtered.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: '#1D1D1F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {inv.client_name}
                        </span>
                        <StatusBadge status={inv.status} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, color: '#86868B', fontFamily: 'monospace' }}>{inv.invoice_number}</span>
                        {inv.due_date && (
                          <span style={{ fontSize: 12, color: isOverdue ? '#FF3B30' : '#86868B', display: 'flex', alignItems: 'center', gap: 3 }}>
                            {isOverdue && <AlertTriangle size={10} />}
                            Fällig {formatDate(inv.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: isOverdue ? '#FF3B30' : '#1D1D1F' }}>
                        {formatCurrency(inv.total)}
                      </span>
                      <ChevronRight size={16} color="#C7C7CC" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {ConfirmDialogNode}
      </div>
    );
  }

  // ── Desktop layout ─────────────────────────────────────────────
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
