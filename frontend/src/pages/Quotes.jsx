import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, ClipboardList, Search, Trash2, Download, Eye, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { quotesApi } from '../api/quotes';
import { formatCurrency, formatDate } from '../utils/formatters';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { useConfirm } from '../hooks/useConfirm';
import { useMobile } from '../hooks/useMobile';
import { useTheme } from '../context/ThemeContext';

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
  const { c, isDark } = useTheme();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isMobile = useMobile();
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
          <div className="skeleton h-7 w-28 mb-2" />
          <div className="skeleton h-4 w-20" />
        </div>
        <div className="skeleton h-9 w-36 rounded-lg" />
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <div className="skeleton h-9 w-60 rounded-xl" />
        <div className="skeleton h-9 w-64 rounded-lg" />
      </div>
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px', borderBottom: i < 4 ? `0.5px solid ${c.borderSubtle}` : 'none' }}>
            <div className="skeleton h-4" style={{ width: 100 }} />
            <div className="skeleton h-4" style={{ width: `${110 + i * 18}px` }} />
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
            <h1 style={{ fontSize: 28, fontWeight: 700, color: c.text, letterSpacing: '-0.032em', margin: 0 }}>Angebote</h1>
            <p style={{ fontSize: 13, color: c.textSecondary, margin: '4px 0 0', letterSpacing: '-0.006em' }}>{quotes.length} gesamt</p>
          </div>
          <button onClick={() => navigate('/quotes/new')} className="btn-primary">
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
            </button>
          ))}
        </div>

        <div style={{ padding: '0 16px' }}>
          {filtered.length === 0 ? (
            <div style={{ ...cardStyle, padding: '40px 20px', textAlign: 'center' }}>
              <ClipboardList size={28} color={c.border} strokeWidth={1.25} style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: c.text, margin: '0 0 4px' }}>
                {search || statusFilter !== 'all' ? 'Keine Angebote gefunden' : 'Noch keine Angebote'}
              </p>
              {!search && statusFilter === 'all' && (
                <button onClick={() => navigate('/quotes/new')} className="btn-primary" style={{ marginTop: 16 }}>
                  Angebot erstellen
                </button>
              )}
            </div>
          ) : (
            <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
              {filtered.map((q, idx) => (
                <div
                  key={q.id}
                  onClick={() => navigate(`/quotes/${q.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer',
                    borderBottom: idx < filtered.length - 1 ? `0.5px solid ${c.borderSubtle}` : 'none',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 500, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.009em' }}>
                        {q.client_name}
                      </span>
                      <StatusBadge status={q.status} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: c.textTertiary, fontFamily: 'monospace' }}>{q.quote_number}</span>
                      {q.valid_until && (
                        <span style={{ fontSize: 12, color: c.textTertiary }}>· Gültig bis {formatDate(q.valid_until)}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: c.text, letterSpacing: '-0.01em' }}>
                      {formatCurrency(q.total)}
                    </span>
                    <ChevronRight size={14} color={c.border} strokeWidth={2} />
                  </div>
                </div>
              ))}
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
          <h1 className="page-title">Angebote</h1>
          <p className="page-subtitle">{quotes.length} gesamt</p>
        </div>
        <button onClick={() => navigate('/quotes/new')} className="btn-primary">
          <Plus size={15} strokeWidth={2} /> Neues Angebot
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: c.textTertiary }} />
          <input className="input w-64" style={{ paddingLeft: 36 }} placeholder="Suchen..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

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
                fontSize: 12, fontWeight: 500, cursor: 'pointer', letterSpacing: '-0.006em',
                background: statusFilter === key ? c.card : 'transparent',
                color: statusFilter === key ? c.text : c.textSecondary,
                boxShadow: statusFilter === key ? (isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px var(--color-border-subtle)') : 'none',
                transition: 'all 0.15s cubic-bezier(0.22,1,0.36,1)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ ...cardStyle, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', background: c.cardSecondary,
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
          }}>
            <ClipboardList size={20} color={c.textTertiary} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: c.text, marginBottom: 4 }}>
            {search || statusFilter !== 'all' ? 'Keine Angebote gefunden' : 'Noch keine Angebote'}
          </p>
          <p style={{ fontSize: 13, color: c.textSecondary, marginBottom: 16 }}>
            {search ? `Keine Treffer für "${search}"` : 'Erstellen Sie Ihr erstes Angebot.'}
          </p>
          {!search && statusFilter === 'all' && (
            <button onClick={() => navigate('/quotes/new')} className="btn-primary">
              <Plus size={15} /> Angebot erstellen
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
                <th className="table-header-cell hidden sm:table-cell">Gültig bis</th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell text-right">Betrag</th>
                <th className="table-header-cell w-24" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(q => (
                <tr
                  key={q.id}
                  onClick={() => navigate(`/quotes/${q.id}`)}
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
                    <span style={{ fontFamily: 'monospace', fontWeight: 500, color: c.text, fontSize: 12 }}>{q.quote_number}</span>
                  </td>
                  <td className="table-cell">
                    <span style={{ fontWeight: 500, color: c.text, fontSize: 13 }}>{q.client_name}</span>
                  </td>
                  <td className="table-cell hidden md:table-cell" style={{ color: c.textSecondary, fontSize: 13 }}>{formatDate(q.issue_date)}</td>
                  <td className="table-cell hidden sm:table-cell" style={{ color: c.textSecondary, fontSize: 13 }}>{formatDate(q.valid_until)}</td>
                  <td className="table-cell"><StatusBadge status={q.status} /></td>
                  <td className="table-cell text-right">
                    <span style={{ fontWeight: 600, color: c.text, fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>{formatCurrency(q.total)}</span>
                  </td>
                  <td className="table-cell pr-4">
                    <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/quotes/${q.id}`)}
                        title="Öffnen"
                        style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: c.textTertiary, transition: 'background 0.12s, color 0.12s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = c.cardSecondary; e.currentTarget.style.color = c.text; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = c.textTertiary; }}
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        onClick={e => handleDownload(e, q)}
                        title="PDF"
                        style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: c.textTertiary, transition: 'background 0.12s, color 0.12s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = c.cardSecondary; e.currentTarget.style.color = c.text; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = c.textTertiary; }}
                      >
                        <Download size={13} />
                      </button>
                      <button
                        onClick={e => handleDelete(e, q)}
                        title="Löschen"
                        style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: c.textTertiary, transition: 'background 0.12s, color 0.12s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = c.redLight; e.currentTarget.style.color = c.red; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = c.textTertiary; }}
                      >
                        <Trash2 size={13} />
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
