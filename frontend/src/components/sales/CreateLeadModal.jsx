import { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { LEAD_STATUSES } from './LeadStatusBadge';

const WEBSITE_STATUSES = [
  'Keine Website',
  'Veraltete Website',
  'Alte Website + nicht Resp.',
  'Website Fehler',
  'Website Branchenbuch',
];

export default function CreateLeadModal({ onClose, onCreate, isCreating }) {
  const [form, setForm] = useState({
    company_name: '', contact_person: '', phone: '', email: '',
    branch: '', city: '', website_status: '', domain: '',
    status: 'neu', priority: 0, notes: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.company_name.trim()) return;
    onCreate(form);
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 500, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.2)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,113,227,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserPlus size={17} color="#0071E3" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1D1D1F' }}>Neuer Lead</div>
              <div style={{ fontSize: 11.5, color: '#86868B' }}>Eigenständiger Lead ohne Kundenkonto</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#86868B', padding: 4 }}><X size={18} /></button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Company (required) */}
            <div>
              <label style={labelStyle}>Unternehmensname *</label>
              <input
                autoFocus required value={form.company_name} onChange={e => set('company_name', e.target.value)}
                placeholder="z.B. Müller Maschinenbau GmbH"
                style={inputStyle}
              />
            </div>

            {/* Contact + Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Kontaktperson</label>
                <input value={form.contact_person} onChange={e => set('contact_person', e.target.value)} placeholder="Max Mustermann" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Telefon</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="0711 123456" style={inputStyle} />
              </div>
            </div>

            {/* Email + City */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>E-Mail</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="info@firma.de" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Stadt</label>
                <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Stuttgart" style={inputStyle} />
              </div>
            </div>

            {/* Branch + Domain */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Branche</label>
                <input value={form.branch} onChange={e => set('branch', e.target.value)} placeholder="Maschinenbau" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Domain</label>
                <input value={form.domain} onChange={e => set('domain', e.target.value)} placeholder="firma.de" style={inputStyle} />
              </div>
            </div>

            {/* Website Status */}
            <div>
              <label style={labelStyle}>Website-Status</label>
              <select value={form.website_status} onChange={e => set('website_status', e.target.value)} style={inputStyle}>
                <option value="">Bitte wählen...</option>
                {WEBSITE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Status + Priority */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Status</label>
                <select value={form.status} onChange={e => set('status', e.target.value)} style={inputStyle}>
                  {Object.entries(LEAD_STATUSES).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Priorität</label>
                <select value={form.priority} onChange={e => set('priority', Number(e.target.value))} style={inputStyle}>
                  <option value={0}>Normal</option>
                  <option value={1}>Hoch</option>
                  <option value={2}>Dringend</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={labelStyle}>Notizen</label>
              <textarea
                value={form.notes} onChange={e => set('notes', e.target.value)}
                placeholder="Informationen zum Lead..."
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '10px 18px', borderRadius: 10, fontSize: 13.5, fontWeight: 600, background: 'rgba(0,0,0,0.05)', color: '#636366', border: 'none', cursor: 'pointer' }}>
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.company_name.trim() || isCreating}
            style={{
              padding: '10px 22px', borderRadius: 10, fontSize: 13.5, fontWeight: 600,
              background: form.company_name.trim() ? '#0071E3' : '#E5E5EA',
              color: form.company_name.trim() ? '#fff' : '#AEAEB2', border: 'none',
              cursor: form.company_name.trim() ? 'pointer' : 'not-allowed', opacity: isCreating ? 0.7 : 1,
            }}
          >
            {isCreating ? 'Erstellen...' : 'Lead erstellen'}
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle = { fontSize: 11.5, fontWeight: 600, color: '#86868B', display: 'block', marginBottom: 5 };
const inputStyle  = {
  width: '100%', padding: '9px 11px', borderRadius: 9, fontSize: 13.5,
  border: '1.5px solid #E5E5EA', outline: 'none', boxSizing: 'border-box',
  background: '#fff', color: '#1D1D1F',
};
