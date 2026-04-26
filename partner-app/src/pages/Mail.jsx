import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Send, Inbox, RefreshCw, Plus, X,
  ArrowLeft, Clock, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { partnerApi } from '../api/partner';

const D = {
  text: '#F2F2F7', text2: '#AEAEB2', text3: '#636366',
  accent: '#3B82F6', accentL: 'rgba(59,130,246,0.12)',
  green: '#34D399', greenL: 'rgba(52,211,153,0.12)',
  red: '#F87171', redL: 'rgba(248,113,113,0.12)',
  border: 'rgba(255,255,255,0.06)',
  inputBg: 'rgba(255,255,255,0.04)',
};

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (now - d < 86400000) return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
}

// Baut die Signatur automatisch aus den Partner-Profildaten
function buildSignature(me) {
  if (!me) return '';
  const name    = [me.name, me.last_name].filter(Boolean).join(' ');
  const company = me.ws_company || '';
  const alias   = me.email_alias || me.ws_email || '';
  const phone   = me.phone || me.ws_phone || '';
  const website = me.ws_website || '';

  const lines = [];
  if (name)    lines.push(name);
  if (company) lines.push(company);
  lines.push('');  // leerzeile
  if (alias)   lines.push(alias);
  if (phone)   lines.push(phone);
  if (website) lines.push(website.replace(/^https?:\/\//, ''));

  return lines.join('\n');
}

// ── Compose Modal ─────────────────────────────────────────────────────────────

function ComposeModal({ alias, me, onClose, onSent }) {
  const signature = buildSignature(me);
  const initialBody = signature ? `\n\n--\n${signature}` : '';

  const [to, setTo]           = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody]       = useState(initialBody);
  const [error, setError]     = useState('');

  const mutation = useMutation({
    mutationFn: () => partnerApi.sendMail({ to, subject, body }),
    onSuccess:  () => { onSent(); onClose(); },
    onError:    (e) => setError(e?.response?.data?.error || 'Fehler beim Senden.'),
  });

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    padding: '9px 12px', background: D.inputBg,
    border: `1px solid ${D.border}`, borderRadius: 9,
    color: D.text, fontSize: 13, outline: 'none',
  };

  const messageLines  = body.split('\n');
  const sigSepIdx     = messageLines.findIndex(l => l === '--');
  const messageOnly   = sigSepIdx > -1 ? messageLines.slice(0, sigSepIdx).join('\n') : body;
  const sigBlock      = sigSepIdx > -1 ? messageLines.slice(sigSepIdx).join('\n') : '';

  function handleBodyChange(e) {
    // Keep the signature intact — only update the message part above the separator
    const newMessage = e.target.value;
    if (sigBlock) {
      const cursorAtSig = newMessage.includes('\n--\n') || newMessage.endsWith('\n--');
      setBody(sigBlock ? newMessage.split('\n--\n')[0] + '\n\n--\n' + signature : newMessage);
    } else {
      setBody(newMessage);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        style={{
          width: '100%', maxWidth: 580,
          background: '#0D1525', border: `1px solid ${D.border}`,
          borderRadius: 18, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          display: 'flex', flexDirection: 'column', maxHeight: '90vh',
        }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${D.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <span style={{ fontSize: 15, fontWeight: 700, color: D.text }}>Neue E-Mail</span>
            {alias && <span style={{ fontSize: 11, color: D.text3, marginLeft: 10 }}>Von: {alias}</span>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.text3, display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
          <div>
            <label style={{ fontSize: 11, color: D.text3, display: 'block', marginBottom: 4 }}>An</label>
            <input value={to} onChange={e => setTo(e.target.value)}
              placeholder="empfaenger@beispiel.de" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: D.text3, display: 'block', marginBottom: 4 }}>Betreff</label>
            <input value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="Betreff" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: D.text3, display: 'block', marginBottom: 4 }}>Nachricht</label>
            {/* Message area — editable part above the separator */}
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={10}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit' }}
            />
          </div>

          {/* Signature preview */}
          {signature && (
            <div style={{ padding: '10px 12px', borderRadius: 9,
              background: 'rgba(255,255,255,0.02)', border: `1px solid ${D.border}` }}>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: D.text3,
                textTransform: 'uppercase', letterSpacing: '0.08em' }}>Signatur (automatisch)</p>
              <pre style={{ margin: 0, fontSize: 12, color: D.text2, fontFamily: 'inherit',
                lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{signature}</pre>
            </div>
          )}

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
              background: D.redL, borderRadius: 8, border: `1px solid rgba(248,113,113,0.2)` }}>
              <AlertCircle size={13} color={D.red} />
              <span style={{ fontSize: 12.5, color: D.red }}>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <button onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: 9, background: 'none',
                border: `1px solid ${D.border}`, color: D.text2, fontSize: 13, cursor: 'pointer' }}>
              Abbrechen
            </button>
            <button onClick={() => mutation.mutate()}
              disabled={!to || !subject || !body || mutation.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 9, background: D.accent,
                border: 'none', color: '#fff', fontSize: 13, fontWeight: 600,
                cursor: !to || !subject || !body || mutation.isPending ? 'not-allowed' : 'pointer',
                opacity: !to || !subject || !body || mutation.isPending ? 0.6 : 1 }}>
              <Send size={13} />
              {mutation.isPending ? 'Sende…' : 'Senden'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Mail Detail ───────────────────────────────────────────────────────────────

function MailDetail({ mail, onBack }) {
  const isOut = mail.direction === 'out';
  return (
    <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
      <button onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none',
          border: 'none', cursor: 'pointer', color: D.text3, fontSize: 13, marginBottom: 20, padding: 0 }}>
        <ArrowLeft size={14} /> Zurück
      </button>
      <div style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${D.border}`, borderRadius: 14 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: D.text }}>{mail.subject}</h2>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, color: D.text3 }}><span style={{ color: D.text2 }}>Von:</span> {mail.from_address}</div>
          <div style={{ fontSize: 12, color: D.text3 }}><span style={{ color: D.text2 }}>An:</span> {mail.to_address}</div>
          <div style={{ fontSize: 12, color: D.text3 }}>
            <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />
            {new Date(mail.sent_at).toLocaleString('de-DE')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px',
            borderRadius: 6, background: isOut ? D.accentL : D.greenL,
            fontSize: 11, fontWeight: 600, color: isOut ? D.accent : D.green }}>
            {isOut ? <><Send size={10} /> Gesendet</> : <><Inbox size={10} /> Empfangen</>}
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${D.border}`, paddingTop: 16,
          fontSize: 14, color: D.text2, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
          {mail.body}
        </div>
      </div>
    </motion.div>
  );
}

// ── Mail Row ──────────────────────────────────────────────────────────────────

function MailRow({ mail, onClick }) {
  const isOut = mail.direction === 'out';
  return (
    <button onClick={onClick}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${D.border}`, borderRadius: 12, cursor: 'pointer',
        textAlign: 'left', transition: 'background 0.15s', marginBottom: 6 }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}>
      <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0,
        background: isOut ? D.accentL : D.greenL,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isOut ? <Send size={13} color={D.accent} /> : <Inbox size={13} color={D.green} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: D.text,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {isOut ? mail.to_address : mail.from_address}
          </span>
          <span style={{ fontSize: 11, color: D.text3, flexShrink: 0 }}>{fmtDate(mail.sent_at)}</span>
        </div>
        <div style={{ fontSize: 12.5, color: D.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {mail.subject}
        </div>
        <div style={{ fontSize: 11.5, color: D.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
          {mail.body?.slice(0, 80)}
        </div>
      </div>
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MailPage() {
  const [tab, setTab]         = useState('all');
  const [compose, setCompose] = useState(false);
  const [selected, setSelected] = useState(null);
  const qc = useQueryClient();

  const { data: mails = [], isLoading } = useQuery({
    queryKey: ['partner-mails'],
    queryFn:  partnerApi.listMails,
    refetchInterval: 60000,
  });

  const { data: me } = useQuery({
    queryKey: ['partner-me'],
    queryFn:  partnerApi.me,
  });

  const { data: aliasData } = useQuery({
    queryKey: ['partner-mail-alias'],
    queryFn:  partnerApi.getMailAlias,
  });

  const syncMutation = useMutation({
    mutationFn: partnerApi.syncMails,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['partner-mails'] }),
  });

  const filtered = useMemo(() => {
    if (tab === 'in')  return mails.filter(m => m.direction === 'in');
    if (tab === 'out') return mails.filter(m => m.direction === 'out');
    return mails;
  }, [mails, tab]);

  const alias    = aliasData?.alias || me?.email_alias || '';
  const hasAlias = !!alias;

  const tabStyle = (t) => ({
    padding: '6px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
    cursor: 'pointer', border: 'none',
    background: tab === t ? D.accentL : 'none',
    color: tab === t ? D.accent : D.text3,
  });

  if (selected) {
    return (
      <div style={{ padding: '28px 32px', maxWidth: 760, margin: '0 auto', boxSizing: 'border-box' }}>
        <MailDetail mail={selected} onBack={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 760, margin: '0 auto', boxSizing: 'border-box' }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 6px' }}>
          Kommunikation
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{
              margin: '0 0 4px', fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.5) 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>E-Mails</h1>
            {alias
              ? <p style={{ margin: 0, fontSize: 13, color: D.text3 }}>Deine Adresse: <span style={{ color: D.accent }}>{alias}</span></p>
              : <p style={{ margin: 0, fontSize: 13, color: D.red }}>Noch kein E-Mail-Alias gesetzt — wende dich an den Administrator.</p>
            }
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                borderRadius: 9, background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${D.border}`, color: D.text2, fontSize: 13,
                cursor: 'pointer', fontWeight: 500 }}>
              <RefreshCw size={13} style={{ animation: syncMutation.isPending ? 'spin 1s linear infinite' : 'none' }} />
              {syncMutation.isPending ? 'Sync…' : 'Aktualisieren'}
            </button>
            <button onClick={() => setCompose(true)} disabled={!hasAlias}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                borderRadius: 9, background: hasAlias ? D.accent : 'rgba(255,255,255,0.06)',
                border: 'none', color: hasAlias ? '#fff' : D.text3, fontSize: 13,
                fontWeight: 600, cursor: hasAlias ? 'pointer' : 'not-allowed' }}>
              <Plus size={14} /> Neue E-Mail
            </button>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        <button style={tabStyle('all')} onClick={() => setTab('all')}>Alle ({mails.length})</button>
        <button style={tabStyle('in')}  onClick={() => setTab('in')}>Eingang ({mails.filter(m => m.direction === 'in').length})</button>
        <button style={tabStyle('out')} onClick={() => setTab('out')}>Gesendet ({mails.filter(m => m.direction === 'out').length})</button>
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: D.text3 }}>Laden…</div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ textAlign: 'center', padding: '64px 24px',
            background: 'rgba(255,255,255,0.02)', border: `1px solid ${D.border}`, borderRadius: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: D.accentL,
            border: `1px solid rgba(59,130,246,0.3)`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 14px' }}>
            <Mail size={22} color={D.accent} />
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: D.text, margin: '0 0 6px' }}>
            {tab === 'in' ? 'Kein Eingang' : tab === 'out' ? 'Noch nichts gesendet' : 'Noch keine E-Mails'}
          </h3>
          <p style={{ fontSize: 13, color: D.text3, margin: 0 }}>
            {hasAlias ? 'Schreibe deine erste E-Mail oder klicke auf Aktualisieren.' : 'Bitte warte bis dein Alias eingerichtet wurde.'}
          </p>
        </motion.div>
      ) : (
        <div>
          {filtered.map((m, i) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <MailRow mail={m} onClick={() => setSelected(m)} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Sync toast */}
      <AnimatePresence>
        {syncMutation.isSuccess && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', borderRadius: 10, background: D.greenL,
              border: `1px solid rgba(52,211,153,0.3)`, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
            <CheckCircle2 size={14} color={D.green} />
            <span style={{ fontSize: 13, color: D.green, fontWeight: 600 }}>
              {syncMutation.data?.synced > 0 ? `${syncMutation.data.synced} neue Mail(s)` : 'Alles aktuell'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compose */}
      {compose && (
        <ComposeModal
          alias={alias}
          me={me}
          onClose={() => setCompose(false)}
          onSent={() => qc.invalidateQueries({ queryKey: ['partner-mails'] })}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
