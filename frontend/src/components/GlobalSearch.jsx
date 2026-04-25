import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { clientsApi } from '../api/clients';
import { salesApi } from '../api/sales';
import { projectsApi } from '../api/projects';
import { invoicesApi } from '../api/invoices';
import { quotesApi } from '../api/quotes';
import {
  Building2, Flame, FolderKanban, FileText, Globe,
  Search, ArrowRight, Hash, Command,
} from 'lucide-react';

const GROUPS = [
  { key: 'clients',   label: 'Kunden',     icon: Building2,    color: '#5B8CF5' },
  { key: 'leads',     label: 'Leads',      icon: Flame,        color: '#FB923C' },
  { key: 'projects',  label: 'Projekte',   icon: FolderKanban, color: '#9B72F2' },
  { key: 'invoices',  label: 'Rechnungen', icon: FileText,     color: '#34D399' },
  { key: 'quotes',    label: 'Angebote',   icon: Hash,         color: '#FBBF24' },
];

function score(text, q) {
  if (!text) return 0;
  const t = text.toLowerCase();
  const s = q.toLowerCase();
  if (t.startsWith(s)) return 3;
  if (t.includes(s)) return 2;
  return 0;
}

function filterItems(items, query, fields) {
  if (!query.trim()) return items.slice(0, 5);
  return items
    .map(item => ({ item, s: Math.max(...fields.map(f => score(item[f], query))) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 6)
    .map(({ item }) => item);
}

function getRoute(item, key) {
  if (key === 'clients')  return `/clients/${item.id}`;
  if (key === 'leads')    return `/sales/leads/${item.id}`;
  if (key === 'projects') return item.project_type === 'website' ? `/websites/${item.id}` : `/projects/${item.id}`;
  if (key === 'invoices') return `/invoices/${item.id}`;
  if (key === 'quotes')   return `/quotes/${item.id}`;
  return '/';
}

function getLabel(item, key) {
  if (key === 'clients')  return item.company_name || item.contact_person || '—';
  if (key === 'leads')    return item.company || item.name || item.contact_name || '—';
  if (key === 'projects') return item.name || item.title || '—';
  if (key === 'invoices') return item.invoice_number || `Rechnung #${item.id}`;
  if (key === 'quotes')   return item.quote_number || `Angebot #${item.id}`;
  return '—';
}

function getSub(item, key) {
  if (key === 'clients')  return item.email || item.city || null;
  if (key === 'leads')    return item.email || item.status || null;
  if (key === 'projects') return item.status || item.client_name || null;
  if (key === 'invoices') return item.client_name || item.status || null;
  if (key === 'quotes')   return item.client_name || item.status || null;
  return null;
}

export default function GlobalSearch() {
  const { c } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);

  // Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Load data once on first open
  useEffect(() => {
    if (!open || data) return;
    setLoading(true);
    Promise.allSettled([
      clientsApi.list(),
      salesApi.listLeads(),
      projectsApi.list(),
      invoicesApi.list(),
      quotesApi.list(),
    ]).then(([cl, le, pr, inv, qu]) => {
      setData({
        clients:  cl.status === 'fulfilled'  ? (cl.value?.data  ?? cl.value  ?? []) : [],
        leads:    le.status === 'fulfilled'  ? (le.value?.data  ?? le.value  ?? []) : [],
        projects: pr.status === 'fulfilled'  ? (pr.value?.data  ?? pr.value  ?? []) : [],
        invoices: inv.status === 'fulfilled' ? (inv.value?.data ?? inv.value ?? []) : [],
        quotes:   qu.status === 'fulfilled'  ? (qu.value?.data  ?? qu.value  ?? []) : [],
      });
      setLoading(false);
    });
  }, [open]);

  // Reset query & index on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Build flat result list for keyboard nav
  const results = [];
  if (data) {
    const FIELDS = {
      clients:  ['company_name', 'contact_person', 'email'],
      leads:    ['company', 'name', 'contact_name', 'email'],
      projects: ['name', 'title'],
      invoices: ['invoice_number', 'client_name'],
      quotes:   ['quote_number', 'client_name'],
    };
    for (const g of GROUPS) {
      const items = filterItems(data[g.key] || [], query, FIELDS[g.key]);
      if (items.length) results.push({ group: g, items });
    }
  }

  const flatItems = results.flatMap(({ group, items }) =>
    items.map(item => ({ item, key: group.key }))
  );

  const go = useCallback((item, key) => {
    navigate(getRoute(item, key));
    setOpen(false);
  }, [navigate]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && flatItems[activeIdx]) {
      go(flatItems[activeIdx].item, flatItems[activeIdx].key);
    }
  };

  // Reset active index on query change
  useEffect(() => { setActiveIdx(0); }, [query]);

  if (!open) return null;

  let flatIdx = 0;

  return createPortal(
    <div
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 'clamp(60px, 12vh, 120px)',
        paddingLeft: 12, paddingRight: 12,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 620,
          background: c.card,
          border: `0.5px solid ${c.border}`,
          borderRadius: 16,
          boxShadow: '0 0 0 0.5px rgba(255,255,255,0.06), 0 24px 80px rgba(0,0,0,0.8)',
          overflow: 'hidden',
          animation: 'gsSlideIn 0.18s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        {/* Input row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px',
          borderBottom: results.length || loading ? `0.5px solid ${c.borderSubtle}` : 'none',
        }}>
          <Search size={18} color={c.textTertiary} strokeWidth={1.8} style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Suchen… Kunden, Leads, Projekte, Rechnungen"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: 15, color: c.text, fontFamily: 'inherit',
              caretColor: c.blue,
            }}
          />
          <kbd style={{
            display: 'flex', alignItems: 'center', gap: 2,
            padding: '3px 7px', borderRadius: 6,
            background: c.cardSecondary, border: `0.5px solid ${c.borderSubtle}`,
            fontSize: 11, color: c.textTertiary, fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        {loading && (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: c.textTertiary, fontSize: 13 }}>
            Laden…
          </div>
        )}

        {!loading && data && results.length === 0 && query && (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: c.textTertiary, fontSize: 13 }}>
            Keine Ergebnisse für „{query}"
          </div>
        )}

        {!loading && !query && !results.length && data && (
          <div style={{ padding: '20px 16px', color: c.textTertiary, fontSize: 13, textAlign: 'center' }}>
            Suchbegriff eingeben…
          </div>
        )}

        {results.length > 0 && (
          <div style={{ maxHeight: 420, overflowY: 'auto', padding: '6px 0 8px' }}>
            {results.map(({ group, items }) => {
              const Icon = group.icon;
              return (
                <div key={group.key}>
                  <div style={{
                    padding: '8px 16px 4px',
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: c.textTertiary,
                  }}>
                    {group.label}
                  </div>
                  {items.map(item => {
                    const isActive = flatIdx === activeIdx;
                    const thisIdx = flatIdx++;
                    const label = getLabel(item, group.key);
                    const sub = getSub(item, group.key);
                    return (
                      <div
                        key={item.id}
                        onClick={() => go(item, group.key)}
                        onMouseEnter={() => setActiveIdx(thisIdx)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '9px 16px', cursor: 'pointer',
                          background: isActive ? c.cardSecondary : 'transparent',
                          transition: 'background 0.1s',
                        }}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: `${group.color}18`,
                        }}>
                          <Icon size={15} color={group.color} strokeWidth={1.8} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13, fontWeight: 500, color: c.text,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {label}
                          </div>
                          {sub && (
                            <div style={{
                              fontSize: 11, color: c.textTertiary, marginTop: 1,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                              {sub}
                            </div>
                          )}
                        </div>
                        {isActive && (
                          <ArrowRight size={14} color={c.textTertiary} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer hint */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end',
          padding: '8px 16px',
          borderTop: `0.5px solid ${c.borderSubtle}`,
          fontSize: 11, color: c.textTertiary,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <kbd style={{ padding: '2px 5px', borderRadius: 4, background: c.cardSecondary, border: `0.5px solid ${c.borderSubtle}`, fontSize: 10 }}>↑↓</kbd>
            navigieren
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <kbd style={{ padding: '2px 5px', borderRadius: 4, background: c.cardSecondary, border: `0.5px solid ${c.borderSubtle}`, fontSize: 10 }}>↵</kbd>
            öffnen
          </span>
        </div>
      </div>

      <style>{`
        @keyframes gsSlideIn {
          from { opacity: 0; transform: translateY(-12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </div>,
    document.body
  );
}
