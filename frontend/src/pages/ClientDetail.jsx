import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Mail, Phone, MapPin, Building2, FileText,
  Plus, ShieldCheck, User, Pencil, Globe, ChevronRight, Briefcase,
} from 'lucide-react';
import { clientsApi } from '../api/clients';
import { legalApi } from '../api/legal';
import { PHASE_ORDER, PHASES } from '../components/workflow/workflowConfig';
import { formatCurrency, formatDate } from '../utils/formatters';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';

// ── Shared styles ──────────────────────────────────────────────────────────────

const CARD = (c) => ({
  background: c.card,
  borderRadius: '16px',
  border: '1px solid var(--color-border-subtle)',
  boxShadow: '0 1px 4px var(--color-border-subtle)',
  padding: '20px',
});

const LABEL = { fontSize: '11px', color: 'var(--color-text-secondary)', letterSpacing: '0.02em', marginBottom: '4px', display: 'block' };
const VALUE = { fontSize: '14px', color: 'var(--color-text)', fontWeight: '500', margin: 0, letterSpacing: '-0.01em' };
const EMPTY = { fontSize: '14px', color: 'var(--color-text-tertiary)', margin: 0 };

// ── ContactPersonWidget ────────────────────────────────────────────────────────

function ContactPersonWidget({ client, clientId }) {
  const { c } = useTheme();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  const saveMutation = useMutation({
    mutationFn: data => clientsApi.update(clientId, {
      company_name: client.company_name,
      contact_person: data.contact_person,
      email: data.email,
      phone: data.phone,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients', clientId] });
      toast.success('Gespeichert');
      setEditing(false);
    },
    onError: () => toast.error('Fehler beim Speichern'),
  });

  function startEdit() {
    setForm({
      contact_person: client.contact_person || '',
      email: client.email || '',
      phone: client.phone || '',
    });
    setEditing(true);
  }

  return (
    <div style={CARD(c)}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(0,122,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={14} color="#007AFF" />
          </div>
          <span style={{ fontSize: '14px', fontWeight: '600', color: c.text, letterSpacing: '-0.01em' }}>Kontaktperson</span>
        </div>
        {editing ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setEditing(false)}
              style={{ fontSize: '12px', color: c.textSecondary, background: 'none', border: 'none', cursor: 'pointer', padding: '5px 10px', borderRadius: '8px' }}>
              Abbrechen
            </button>
            <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}
              style={{ fontSize: '12px', fontWeight: '600', color: '#fff', background: 'var(--color-blue)', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '5px 14px' }}>
              {saveMutation.isPending ? 'Speichern…' : 'Speichern'}
            </button>
          </div>
        ) : (
          <button onClick={startEdit}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: c.textSecondary, background: 'none', border: 'none', cursor: 'pointer', padding: '5px 10px', borderRadius: '8px' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-border-subtle)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            <Pencil size={12} /> Bearbeiten
          </button>
        )}
      </div>

      {editing ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[['Name', 'contact_person'], ['E-Mail', 'email'], ['Telefon', 'phone']].map(([label, key]) => (
            <div key={key}>
              <label style={LABEL}>{label.toUpperCase()}</label>
              <input className="input w-full"
                value={form[key] || ''}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {/* Name */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={14} color="#86868B" />
            </div>
            <div>
              <span style={LABEL}>NAME</span>
              {client.contact_person
                ? <p style={VALUE}>{client.contact_person}</p>
                : <p style={EMPTY}>–</p>}
            </div>
          </div>

          {/* E-Mail */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Mail size={14} color="#86868B" />
            </div>
            <div style={{ minWidth: 0 }}>
              <span style={LABEL}>E-MAIL</span>
              {client.email
                ? <p style={{ ...VALUE, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.email}</p>
                : <p style={EMPTY}>–</p>}
            </div>
          </div>

          {/* Telefon */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Phone size={14} color="#86868B" />
            </div>
            <div>
              <span style={LABEL}>TELEFON</span>
              {client.phone
                ? <p style={VALUE}>{client.phone}</p>
                : <p style={EMPTY}>–</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── LegalSetup ────────────────────────────────────────────────────────────────

function LegalSetup({ clientId }) {
  const { c } = useTheme();
  const qc = useQueryClient();
  const { data: legal } = useQuery({
    queryKey: ['legal', clientId],
    queryFn: () => legalApi.get(clientId),
  });

  const [form, setForm] = useState(null);
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: data => legalApi.save(clientId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['legal', clientId] });
      toast.success('Legal Setup gespeichert');
      setForm(null);
    },
    onError: () => toast.error('Fehler beim Speichern'),
  });

  const data = form ?? legal ?? {};

  return (
    <div style={CARD(c)}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(52,199,89,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={14} color="#34C759" />
          </div>
          <span style={{ fontSize: '14px', fontWeight: '600', color: c.text, letterSpacing: '-0.01em' }}>Legal Setup</span>
        </div>
        {form ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setForm(null)}
              style={{ fontSize: '12px', color: c.textSecondary, background: 'none', border: 'none', cursor: 'pointer', padding: '5px 10px', borderRadius: '8px' }}>
              Abbrechen
            </button>
            <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}
              style={{ fontSize: '12px', fontWeight: '600', color: '#fff', background: 'var(--color-blue)', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '5px 14px' }}>
              {saveMutation.isPending ? 'Speichern…' : 'Speichern'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setForm({ company_name: data.company_name || '', address: data.address || '', vat_id: data.vat_id || '', dsgvo_provider: data.dsgvo_provider || '' })}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: c.textSecondary, background: 'none', border: 'none', cursor: 'pointer', padding: '5px 10px', borderRadius: '8px' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-border-subtle)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            <Pencil size={12} /> Bearbeiten
          </button>
        )}
      </div>

      {form ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[['Firmenname', 'company_name'], ['Adresse', 'address'], ['USt-IdNr.', 'vat_id'], ['DSGVO-Anbieter', 'dsgvo_provider']].map(([label, key]) => (
            <div key={key}>
              <label style={LABEL}>{label.toUpperCase()}</label>
              <input className="input w-full" value={form[key] || ''} onChange={e => set(key)(e.target.value)} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
          {[
            ['Firmenname', data.company_name],
            ['Adresse',    data.address],
            ['USt-IdNr.',  data.vat_id],
            ['DSGVO-Anbieter', data.dsgvo_provider],
          ].map(([label, val]) => (
            <div key={label}>
              <span style={LABEL}>{label.toUpperCase()}</span>
              {val ? <p style={VALUE}>{val}</p> : <p style={EMPTY}>–</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ClientDetail() {
  const { c, isDark } = useTheme();
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

  const { data: clientProjects = [] } = useQuery({
    queryKey: ['projects', 'by-client', id],
    queryFn: () => clientsApi.projects(id).then(r => r.data),
  });

  if (clientLoading || invoicesLoading) return <LoadingSpinner className="h-64" />;
  if (!client) return <div style={{ padding: '32px', color: c.textSecondary }}>Kunde nicht gefunden.</div>;

  const address = [
    client.address,
    [client.postal_code, client.city].filter(Boolean).join(' '),
    client.country,
  ].filter(Boolean).join(', ');

  return (
    <div style={{ padding: '32px', maxWidth: '960px', margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate('/clients')}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--color-border-subtle)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.textSecondary }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-border-subtle)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--color-border-subtle)'}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '700', color: c.text, letterSpacing: '-0.03em', margin: 0 }}>{client.company_name}</h1>
            {client.contact_person && (
              <p style={{ fontSize: '13px', color: c.textSecondary, margin: '2px 0 0', letterSpacing: '-0.01em' }}>{client.contact_person}</p>
            )}
          </div>
        </div>
        <button onClick={() => navigate('/invoices/new')} className="btn-primary">
          <Plus size={16} /> Neue Rechnung
        </button>
      </div>

      {/* ── Branche + Website Chips ── */}
      {(client.industry || client.website) && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {client.industry && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: '99px', background: 'rgba(0,122,255,0.08)', color: 'var(--color-blue)', fontSize: '12px', fontWeight: 600 }}>
              <Briefcase size={11} /> {client.industry}
            </span>
          )}
          {client.website && (
            <a href={client.website.startsWith('http') ? client.website : `https://${client.website}`} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: '99px', background: 'rgba(52,199,89,0.08)', color: '#34C759', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>
              <Globe size={11} /> {client.website}
            </a>
          )}
        </div>
      )}

      {/* ── Stats + Adresse grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', marginBottom: '12px' }}>

        {/* Gesamtumsatz */}
        <div style={CARD(c)}>
          <span style={LABEL}>GESAMTUMSATZ</span>
          <p style={{ fontSize: '22px', fontWeight: '700', color: c.text, margin: 0, letterSpacing: '-0.03em' }}>
            {formatCurrency(client.total_revenue || 0)}
          </p>
        </div>

        {/* Bezahlter Umsatz */}
        <div style={CARD(c)}>
          <span style={LABEL}>BEZAHLTER UMSATZ</span>
          <p style={{ fontSize: '22px', fontWeight: '700', color: '#34C759', margin: 0, letterSpacing: '-0.03em' }}>
            {formatCurrency(client.paid_revenue || 0)}
          </p>
        </div>

        {/* Rechnungen */}
        <div style={CARD(c)}>
          <span style={LABEL}>RECHNUNGEN</span>
          <p style={{ fontSize: '22px', fontWeight: '700', color: c.text, margin: 0, letterSpacing: '-0.03em' }}>
            {client.invoice_count || 0}
          </p>
          {client.last_invoice_date && (
            <p style={{ fontSize: '11px', color: c.textSecondary, margin: '4px 0 0' }}>Letzte: {formatDate(client.last_invoice_date)}</p>
          )}
        </div>

        {/* Adresse / Kontakt */}
        <div style={{ ...CARD(c),minWidth: '180px' }}>
          <span style={LABEL}>ADRESSE</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {address && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <MapPin size={12} color="#86868B" style={{ marginTop: '2px', flexShrink: 0 }} />
                <p style={{ ...VALUE, fontSize: '12px', lineHeight: 1.4 }}>{address}</p>
              </div>
            )}
            {!address && <p style={EMPTY}>–</p>}
          </div>
        </div>
      </div>

      {/* ── Kontaktperson ── */}
      <div style={{ marginBottom: '12px' }}>
        <ContactPersonWidget client={client} clientId={id} />
      </div>

      {/* ── Legal Setup ── */}
      <div style={{ marginBottom: '12px' }}>
        <LegalSetup clientId={id} />
      </div>

      {/* ── Websites ── */}
      <div style={{ ...CARD(c),padding: 0, overflow: 'hidden', marginBottom: '12px' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${c.borderSubtle}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(0,122,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Globe size={14} color="#007AFF" />
            </div>
            <span style={{ fontSize: '14px', fontWeight: '600', color: c.text, letterSpacing: '-0.01em' }}>
              Websites
              <span style={{ marginLeft: '6px', fontSize: '13px', color: c.textSecondary, fontWeight: '400' }}>{clientProjects.length}</span>
            </span>
          </div>
          <button onClick={() => navigate('/websites/new')} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '600', color: 'var(--color-blue)', background: 'rgba(0,122,255,0.08)', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '5px 12px' }}>
            <Plus size={13} /> Neue Website
          </button>
        </div>

        {clientProjects.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <Globe size={28} color="#D1D1D6" style={{ margin: '0 auto 10px' }} />
            <p style={{ fontSize: '14px', color: c.textSecondary, margin: 0 }}>Noch keine Website für diesen Kunden.</p>
          </div>
        ) : (
          <div>
            {clientProjects.map((p, i) => {
              const phase = p.current_phase;
              const cfg = phase ? PHASES[phase] : null;
              const phaseIdx = phase ? PHASE_ORDER.indexOf(phase) : 0;
              const total = PHASE_ORDER.length;
              const pct = Math.round(((phaseIdx + 1) / total) * 100);
              const isLast = phase === PHASE_ORDER[PHASE_ORDER.length - 1];
              return (
                <div
                  key={p.id}
                  onClick={() => navigate(`/websites/${p.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '16px',
                    padding: '14px 20px',
                    borderBottom: i < clientProjects.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                    cursor: 'pointer', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-border-subtle)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  {/* Icon */}
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(0,122,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Globe size={16} color="#007AFF" />
                  </div>

                  {/* Name */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: c.text, margin: 0, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                    {p.deadline && <p style={{ fontSize: '11px', color: c.textSecondary, margin: '2px 0 0' }}>Deadline: {formatDate(p.deadline)}</p>}
                  </div>

                  {/* Phase badge */}
                  <span style={{
                    padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 600,
                    background: isLast ? 'rgba(52,199,89,0.12)' : 'rgba(0,122,255,0.10)',
                    color: isLast ? '#34C759' : 'var(--color-blue)',
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {cfg?.label || 'Start'}
                  </span>

                  {/* Progress bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <div style={{ width: '56px', height: '3px', background: c.cardSecondary, borderRadius: '2px' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: isLast ? '#34C759' : 'var(--color-blue)', borderRadius: '2px' }} />
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{phaseIdx + 1}/{total}</span>
                  </div>

                  <ChevronRight size={14} color="#C7C7CC" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Rechnungen ── */}
      <div style={{ ...CARD(c),padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${c.borderSubtle}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(0,122,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={14} color="#007AFF" />
            </div>
            <span style={{ fontSize: '14px', fontWeight: '600', color: c.text, letterSpacing: '-0.01em' }}>
              Rechnungen
              <span style={{ marginLeft: '6px', fontSize: '13px', color: c.textSecondary, fontWeight: '400' }}>{invoices.length}</span>
            </span>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <FileText size={32} color="#D1D1D6" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: '14px', color: c.textSecondary, margin: '0 0 16px' }}>Noch keine Rechnungen für diesen Kunden.</p>
            <button onClick={() => navigate('/invoices/new')} className="btn-primary">
              <Plus size={16} /> Rechnung erstellen
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${c.borderSubtle}` }}>
                {['Nummer', 'Datum', 'Fällig', 'Status', 'Betrag'].map((h, i) => (
                  <th key={h} style={{ padding: '10px 20px', textAlign: i === 4 ? 'right' : 'left', fontSize: '11px', fontWeight: '600', color: c.textSecondary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}
                  style={{ borderBottom: '1px solid var(--color-border-subtle)', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-border-subtle)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <td style={{ padding: '12px 20px', fontWeight: '600', color: c.text }}>{inv.invoice_number}</td>
                  <td style={{ padding: '12px 20px', color: c.textSecondary }}>{formatDate(inv.issue_date)}</td>
                  <td style={{ padding: '12px 20px', color: c.textSecondary }}>{formatDate(inv.due_date)}</td>
                  <td style={{ padding: '12px 20px' }}><StatusBadge status={inv.status} /></td>
                  <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: '700', color: c.text }}>{formatCurrency(inv.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
