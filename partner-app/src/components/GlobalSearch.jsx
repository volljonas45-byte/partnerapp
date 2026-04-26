import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, X, Building2, Briefcase, Phone, MapPin } from 'lucide-react';
import { partnerApi } from '../api/partner';

const D = {
  bg: '#070C15', card: '#0D1525',
  text: '#F2F2F7', text2: '#AEAEB2', text3: '#636366',
  accent: '#3B82F6', accentL: 'rgba(59,130,246,0.12)',
  green: '#34D399', greenL: 'rgba(52,211,153,0.12)',
  border: 'rgba(255,255,255,0.07)',
};

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const overlayRef = useRef(null);
  const navigate = useNavigate();

  const { data: leads = [] }     = useQuery({ queryKey: ['my-leads'],     queryFn: partnerApi.listLeads });
  const { data: customers = [] } = useQuery({ queryKey: ['my-customers'], queryFn: partnerApi.listCustomers });

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { leads: [], customers: [] };

    const matchedLeads = leads.filter(l =>
      (l.company || '').toLowerCase().includes(q) ||
      (l.contact_person || '').toLowerCase().includes(q) ||
      (l.phone || '').toLowerCase().includes(q) ||
      (l.city || '').toLowerCase().includes(q)
    ).slice(0, 5);

    const matchedCustomers = customers.filter(c =>
      (c.company || '').toLowerCase().includes(q) ||
      (c.contact_person || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.city || '').toLowerCase().includes(q)
    ).slice(0, 5);

    return { leads: matchedLeads, customers: matchedCustomers };
  }, [query, leads, customers]);

  const hasResults = results.leads.length > 0 || results.customers.length > 0;
  const showDropdown = open && query.trim().length > 0;

  useEffect(() => {
    function handleKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setQuery('');
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (overlayRef.current && !overlayRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (showDropdown) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDropdown]);

  function go(path) {
    setQuery('');
    setOpen(false);
    navigate(path);
  }

  function highlight(text, q) {
    if (!q || !text) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: D.accentL, color: D.accent, borderRadius: 3, padding: '0 2px' }}>
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    );
  }

  return (
    <div ref={overlayRef} style={{ position: 'relative', padding: '6px 10px 4px' }}>
      {/* Input */}
      <div style={{ position: 'relative' }}>
        <Search size={13} color={D.text3} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Suchen…"
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '7px 28px 7px 28px',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${open && query ? 'rgba(59,130,246,0.3)' : D.border}`,
            borderRadius: 9, color: D.text, fontSize: 12.5,
            outline: 'none', transition: 'border-color 0.2s',
          }}
        />
        {query ? (
          <button onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: D.text3, display: 'flex', padding: 2 }}>
            <X size={12} />
          </button>
        ) : (
          <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            fontSize: 10, color: D.text3, pointerEvents: 'none', letterSpacing: '0.02em' }}>⌘K</span>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 10, right: 10,
          background: '#0F1826',
          border: `1px solid ${D.border}`,
          borderRadius: 12, zIndex: 9999,
          boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          maxHeight: 360, overflowY: 'auto',
        }}>
          {!hasResults ? (
            <div style={{ padding: '16px 14px', fontSize: 12.5, color: D.text3, textAlign: 'center' }}>
              Keine Ergebnisse für „{query}"
            </div>
          ) : (
            <>
              {results.leads.length > 0 && (
                <div>
                  <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, color: D.text3,
                    textTransform: 'uppercase', letterSpacing: '0.1em' }}>Leads</div>
                  {results.leads.map(l => (
                    <button key={l.id} onClick={() => go('/leads/mine')}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer',
                        textAlign: 'left', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: D.accentL,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Briefcase size={13} color={D.accent} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: D.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {highlight(l.company || '—', query)}
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 1 }}>
                          {l.contact_person && <span style={{ fontSize: 11, color: D.text3 }}>{highlight(l.contact_person, query)}</span>}
                          {l.city && <span style={{ fontSize: 11, color: D.text3, display: 'flex', alignItems: 'center', gap: 2 }}><MapPin size={9} />{highlight(l.city, query)}</span>}
                        </div>
                      </div>
                      {l.phone && (
                        <a href={`tel:${l.phone}`} onClick={e => e.stopPropagation()}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5,
                            color: D.accent, textDecoration: 'none', flexShrink: 0,
                            padding: '4px 8px', borderRadius: 7, background: D.accentL }}>
                          <Phone size={11} /> {highlight(l.phone, query)}
                        </a>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {results.customers.length > 0 && (
                <div style={{ borderTop: results.leads.length > 0 ? `1px solid ${D.border}` : 'none' }}>
                  <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, color: D.text3,
                    textTransform: 'uppercase', letterSpacing: '0.1em' }}>Kunden</div>
                  {results.customers.map(c => (
                    <button key={c.id} onClick={() => go('/customers')}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer',
                        textAlign: 'left', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: D.greenL,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Building2 size={13} color={D.green} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: D.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {highlight(c.company || '—', query)}
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 1 }}>
                          {c.contact_person && <span style={{ fontSize: 11, color: D.text3 }}>{highlight(c.contact_person, query)}</span>}
                          {c.city && <span style={{ fontSize: 11, color: D.text3, display: 'flex', alignItems: 'center', gap: 2 }}><MapPin size={9} />{highlight(c.city, query)}</span>}
                        </div>
                      </div>
                      {c.phone && (
                        <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5,
                            color: D.green, textDecoration: 'none', flexShrink: 0,
                            padding: '4px 8px', borderRadius: 7, background: D.greenL }}>
                          <Phone size={11} /> {highlight(c.phone, query)}
                        </a>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
