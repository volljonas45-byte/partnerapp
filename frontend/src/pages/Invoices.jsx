import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Search, Trash2, Download, AlertTriangle, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { invoicesApi } from '../api/invoices';
import { formatCurrency, formatDate, isPast } from '../utils/formatters';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { useConfirm } from '../hooks/useConfirm';
import { useMobile } from '../hooks/useMobile';
import { useTheme } from '../context/ThemeContext';

const STATUS_FILTERS = [
  { key: 'all',       label: 'Alle'       },
  { key: 'draft',     label: 'Entwurf'    },
  { key: 'sent',      label: 'Gesendet'   },
  { key: 'paid',      label: 'Bezahlt'    },
  { key: 'overdue',   label: 'Überfällig' },
  { key: 'cancelled', label: 'Storniert'  },
];

export default function Invoices() {
  const { c, isDark } = useTheme();
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

  const overdueCount = invoices.filter(i => i.status === 'overdue').length;

  const cardStyle = {
    background: c.card,
    borderRadius: 12,
    border: `0.5px solid ${c.borderSubtle}`,
    boxShadow: isDark
      ? '0 0 0 0.5px rgba(255,255,255,0.04), 0 1px 3px rgba(0,0,0,0.2), 0 6px 20px rgba(0,0,0,0.25)'
      : '0 0 0 0.5px var(--color-border-subtle), 0 1px 3px var(--color-border-subtle), 0 6px 20px var(--color-border-subtle)',
  };

  if (isLoading) return (
    <div style={{ padding: isMobile ? 16 : '28px 32px' }}>
      <div className="page-header">
        <div>
          <div className="skeleton h-7 w-36 mb-2" />
          <div className="skeleton h-4 w-24" />
        </div>
        <div className="skeleton h-9 w-40 rounded-lg" />
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <div className="skeleton h-9 w-56 rounded-xl" />
        <div className="skeleton h-9 w-72 rounded-lg" />
      </div>
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px', borderBottom: i < 4 ? `0.5px solid ${c.borderSubtle}` : 'none' }}>
            <div className="skeleton h-4" style={{ width: 100 }} />
            <div className="skeleton h-4" style={{ width: `${120 + i * 15}px` }} />
            <div className="skeleton h-5 rounded-md" style={{ width: 72 }} />
            <div className="skeleton h-4 ml-auto" style={{ width: 64 }} />
          </div>
        ))}
      </div>
    </div>
  );

  // ── Mobile layout ─────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ background: c.bg, minHeight: '100vh' }}>
        <div style={{ padding: '20px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: c.text, letterSpacing: '-0.032em', margin: 0 }}>Rechnungen</h1>
            <p style={{ fontSize: 13, color: c.textSecondary, margin: '4px 0 0', letterSpacing: '-0.006em' }}>
              {invoices.length} gesamt{overdueCount > 0 && <span style={{ color: c.red, marginLeft: 6 }}> · {overdueCount} überfällig</span>}
            </p>
          </div>
          <button onClick={() => navigate('/invoices/new')} className="btn-primary">
            <Plus size={15} strokeWidth={2} /> Neu
          </button>
        </div>

        <div style={{ padding: '0 16px 10px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 28, top: '50%', transform: 'translateY(-50%)', color: c.textTertiary, pointerEvents: 'none' }} />
          <input className="input" style={{ paddingLeft: 36 }} placeholder="Suchen..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 6, padding: '0 16px 14px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {STATUS_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatus(key)}
              style={{
                flexShrink: 0, padding: '6px 14px', borderRadius: 8, border: 'none',
                fontSize: 13, fontWeight: 500, cursor: 'pointer', letterSpacing: '-0.006em',
                background: statusFilter === key ? (isDark ? c.card : c.text) : c.cardSecondary,
                color: statusFilter === key ? (isDark ? c.text : '#fff') : c.textSecondary,
                transition: 'all 0.15s cubic-bezier(0.22,1,0.36,1)',
              }}
            >
              {label}
              {key === 'overdue' && overdueCount > 0 && (
                <span style={{
                  marginLeft: 5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 16, height: 16, borderRadius: '50%', background: c.red, color: '#fff',
                  fontSize: 9, fontWeight: 700,
                }}>{overdueCount}</span>
              )}
            </button>
          ))}
        </div>

        <div style={{ padding: '0 16px' }}>
          {filtered.length === 0 ? (
            <div style={{ ...cardStyle, padding: '40px 20px', textAlign: 'center' }}>
              <FileText size={28} color={c.border} strokeWidth={1.25} style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: c.text, margin: '0 0 4px' }}>
                {search || statusFilter !== 'all' ? 'Keine Rechnungen gefunden' : 'Noch keine Rechnungen'}
              </p>
              <p style={{ fontSize: 13, color: c.textSecondary, margin: 0 }}>
                {search ? `Keine Treffer für "${search}"` : 'Erstelle jetzt deine erste Rechnung.'}
              </p>
              {!search && statusFilter === 'all' && (
                <button onClick={() => navigate('/invoices/new')} className="btn-primary" style={{ marginTop: 16 }}>
                  Rechnung erstellen
                </button>
              )}
            </div>
          ) : (
            <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
              {filtered.map((inv, idx) => {
                const isOverdue = inv.status === 'overdue' || (inv.due_date && isPast(inv.due_date) && inv.status !== 'paid' && inv.status !== 'cancelled');
                return (
                  <div
                    key={inv.id}
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer',
                      borderBottom: idx < filtered.length - 1 ? `0.5px solid ${c.borderSubtle}` : 'none',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 500, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.009em' }}>
                          {inv.client_name}
                        </span>
                        <StatusBadge status={inv.status} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, color: c.textTertiary, fontFamily: 'monospace' }}>{inv.invoice_number}</span>
                        {inv.due_date && (
                          <span style={{ fontSize: 12, color: isOverdue ? c.red : c.textTertiary, display: 'flex', alignItems: 'center', gap: 3 }}>
                            {isOverdue && <AlertTriangle size={10} />}
                            Fällig {formatDate(inv.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 16, fontWeight: 600, color: isOverdue ? c.red : c.text, letterSpacing: '-0.01em' }}>
                        {formatCurrency(inv.total)}
                      </span>
                      <ChevronRight size={14} color={c.border} strokeWidth={2} />
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
    <div className="animate-fade-in" style={{ padding: '28px 32px' }}>

      <div className="page-header">
        <div>
          <h1 className="page-title">Rechnungen</h1>
          <p className="page-subtitle">
            {invoices.length} gesamt
            {overdueCount > 0 && (
              <span style={{ color: c.red, marginLeft: 8, fontWeight: 500 }}>
                · {overdueCount} überfällig
              </span>
            )}
          </p>
        </div>
        <button onClick={() => navigate('/invoices/new')} className="btn-primary">
          <Plus size={15} strokeWidth={2} /> Neue Rechnung
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: c.textTertiary }} />
          <input className="input w-60" style={{ paddingLeft: 36 }} placeholder="Suchen..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Segmented control */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 2,
          background: c.inputBg, borderRadius: 8, padding: 3,
        }}>
          {STATUS_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatus(key)}
              style={{
                padding: '5px 12px', borderRadius: 6, border: 'none',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                letterSpacing: '-0.006em',
                background: statusFilter === key ? c.card : 'transparent',
                color: statusFilter === key ? c.text : c.textSecondary,
                boxShadow: statusFilter === key ? (isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px var(--color-border-subtle)') : 'none',
                transition: 'all 0.15s cubic-bezier(0.22,1,0.36,1)',
              }}
            >
              {label}
              {key === 'overdue' && overdueCount > 0 && (
                <span style={{
                  marginLeft: 5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 16, height: 16, borderRadius: '50%', background: c.red, color: '#fff',
                  fontSize: 9, fontWeight: 700,
                }}>{overdueCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ ...cardStyle, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', background: c.cardSecondary,
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
          }}>
            <FileText size={20} color={c.textTertiary} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: c.text, marginBottom: 4 }}>
            {search || statusFilter !== 'all' ? 'Keine Rechnungen gefunden' : 'Noch keine Rechnungen'}
          </p>
          <p style={{ fontSize: 13, color: c.textSecondary, marginBottom: 16 }}>
            {search ? `Keine Treffer für "${search}"` : statusFilter !== 'all' ? 'Keine Rechnungen mit diesem Status.' : 'Erstellen Sie Ihre erste Rechnung.'}
          </p>
          {!search && statusFilter === 'all' && (
            <button onClick={() => navigate('/invoices/new')} className="btn-primary mx-auto">
              <Plus size={15} /> Rechnung erstellen
            </button>
          )}
        </div>
      ) : (
        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `0.5px solid ${c.borderSubtle}` }}>
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
                    className="group"
                    style={{
                      borderBottom: `0.5px solid ${c.borderSubtle}`,
                      cursor: 'pointer',
                      transition: 'background 0.12s cubic-bezier(0.22,1,0.36,1)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = c.blueLight}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td className="table-cell pl-5">
                      <span style={{ fontFamily: 'monospace', fontWeight: 500, color: c.text, fontSize: 12 }}>{inv.invoice_number}</span>
                    </td>
                    <td className="table-cell">
                      <span style={{ fontWeight: 500, color: c.text, fontSize: 13 }}>{inv.client_name}</span>
                    </td>
                    <td className="table-cell hidden md:table-cell" style={{ color: c.textSecondary, fontSize: 13 }}>
                      {formatDate(inv.issue_date)}
                    </td>
                    <td className="table-cell hidden sm:table-cell">
                      <span style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, color: isOverdue ? c.red : c.textSecondary, fontWeight: isOverdue ? 500 : 400 }}>
                        {isOverdue && <AlertTriangle size={11} />}
                        {formatDate(inv.due_date)}
                      </span>
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="table-cell text-right">
                      <span style={{ fontWeight: 600, color: isOverdue ? c.red : c.text, fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>
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
                          style={{
                            padding: 6, borderRadius: 6, border: 'none',
                            background: 'transparent', cursor: 'pointer', color: c.textTertiary,
                            transition: 'background 0.12s, color 0.12s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = c.cardSecondary; e.currentTarget.style.color = c.text; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = c.textTertiary; }}
                        >
                          <Download size={13} />
                        </button>
                        <button
                          onClick={e => handleDelete(e, inv)}
                          title="Löschen"
                          style={{
                            padding: 6, borderRadius: 6, border: 'none',
                            background: 'transparent', cursor: 'pointer', color: c.textTertiary,
                            transition: 'background 0.12s, color 0.12s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = c.redLight; e.currentTarget.style.color = c.red; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = c.textTertiary; }}
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
