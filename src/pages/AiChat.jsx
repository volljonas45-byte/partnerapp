import { useState, useRef, useEffect, useCallback } from 'react';
import { SendIcon, LoaderIcon, Sparkles, ImageIcon, MonitorIcon, Command } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { partnerApi } from '../api/partner';

/* ── auto-resize textarea ────────────────────────────────────────── */
function useAutoResize(minH = 60, maxH = 200) {
  const ref = useRef(null);
  const adjust = useCallback((reset) => {
    const el = ref.current;
    if (!el) return;
    el.style.height = `${minH}px`;
    if (!reset) el.style.height = `${Math.min(el.scrollHeight, maxH)}px`;
  }, [minH, maxH]);
  useEffect(() => { if (ref.current) ref.current.style.height = `${minH}px`; }, [minH]);
  return { ref, adjust };
}

/* ── typing indicator ────────────────────────────────────────────── */
function TypingDots() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 4 }}>
      {[1, 2, 3].map(d => (
        <motion.span key={d}
          style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.8)', margin: '0 2px', boxShadow: '0 0 4px rgba(255,255,255,0.3)' }}
          animate={{ opacity: [0.3, 0.9, 0.3], scale: [0.85, 1.1, 0.85] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: d * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </span>
  );
}

/* ── suggestion chips ────────────────────────────────────────────── */
const CHIPS = [
  { icon: <ImageIcon size={14} />,   label: 'Provisionen erklären',  q: 'Wie funktionieren Provisionen?' },
  { icon: <Sparkles size={14} />,    label: 'Eigene vs. Pool-Leads',  q: 'Was ist der Unterschied zwischen eigenen Leads und Pool-Leads?' },
  { icon: <MonitorIcon size={14} />, label: 'Lead eintragen',         q: 'Wie trage ich einen neuen Lead ein?' },
  { icon: <Command size={14} />,     label: 'Auszahlung',             q: 'Wann werden Provisionen ausgezahlt?' },
];

/* ── styles ──────────────────────────────────────────────────────── */
const S = {
  glass: {
    backdropFilter: 'blur(40px)',
    WebkitBackdropFilter: 'blur(40px)',
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 16,
    boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
  },
  chip: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 14px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 10,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  sendActive: {
    background: '#ffffff',
    color: '#0A0A0B',
    border: 'none',
    borderRadius: 10,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 6,
    boxShadow: '0 4px 20px rgba(255,255,255,0.12)',
    transition: 'all 0.15s',
  },
  sendInactive: {
    background: 'rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.3)',
    border: 'none',
    borderRadius: 10,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'default',
    display: 'flex', alignItems: 'center', gap: 6,
  },
};

/* ─────────────────────────────────────────────────────────────────── */
export default function AiChat() {
  const [messages, setMessages]    = useState([]);
  const [input, setInput]          = useState('');
  const [loading, setLoading]      = useState(false);
  const [mousePos, setMousePos]    = useState({ x: 0, y: 0 });
  const [focused, setFocused]      = useState(false);
  const [chipHover, setChipHover]  = useState(-1);
  const { ref: taRef, adjust }     = useAutoResize();
  const bottomRef                  = useRef(null);
  const hasMessages                = messages.length > 0;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => {
    const fn = e => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', fn);
    return () => window.removeEventListener('mousemove', fn);
  }, []);

  async function send(text) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const next = [...messages, { role: 'user', text: msg }];
    setMessages(next);
    setInput('');
    if (taRef.current) taRef.current.style.height = '60px';
    setLoading(true);

    const history = [
      ...messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
      { role: 'user', parts: [{ text: msg }] },
    ];

    try {
      const { reply } = await partnerApi.aiChat(history);
      setMessages(p => [...p, { role: 'model', text: reply }]);
    } catch {
      setMessages(p => [...p, { role: 'model', text: 'Fehler beim Laden der Antwort. Bitte versuche es erneut.' }]);
    } finally {
      setLoading(false);
    }
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', background: '#070C15', color: '#F2F2F7' }}>

      {/* ambient glows */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: 0, left: '25%', width: 384, height: 384, background: 'rgba(139,92,246,0.12)', borderRadius: '50%', filter: 'blur(128px)' }} />
        <div style={{ position: 'absolute', bottom: 0, right: '25%', width: 384, height: 384, background: 'rgba(99,102,241,0.10)', borderRadius: '50%', filter: 'blur(128px)' }} />
        <div style={{ position: 'absolute', top: '25%', right: '33%', width: 256, height: 256, background: 'rgba(217,70,239,0.08)', borderRadius: '50%', filter: 'blur(96px)' }} />
      </div>

      {/* message list */}
      <AnimatePresence>
        {hasMessages && (
          <motion.div key="msgs"
            style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px 24px 8px', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', zIndex: 10 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, opacity: 0.35, fontSize: 11 }}>
              <Sparkles size={11} /><span>Vecturo KI-Assistent</span>
            </div>

            {messages.map((m, i) => (
              <motion.div key={i}
                style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}
              >
                <div style={{
                  maxWidth: '76%', padding: '10px 14px', fontSize: 13, lineHeight: 1.55,
                  color: 'rgba(255,255,255,0.85)',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: m.role === 'user' ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.025)',
                  border: `1px solid ${m.role === 'user' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)'}`,
                }}>
                  {m.text}
                </div>
              </motion.div>
            ))}

            {loading && (
              <motion.div style={{ display: 'flex', justifyContent: 'flex-start' }}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{ padding: '10px 14px', borderRadius: '14px 14px 14px 4px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <TypingDots />
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* center area (empty state grows, chat state shrinks) */}
      <div style={{
        position: 'relative', zIndex: 10,
        flex: hasMessages ? '0 0 auto' : 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: hasMessages ? 'flex-end' : 'center',
        padding: hasMessages ? '8px 24px 24px' : '0 24px 40px',
      }}>
        <div style={{ width: '100%', maxWidth: 640 }}>

          {/* heading (empty state only) */}
          <AnimatePresence>
            {!hasMessages && (
              <motion.div key="heading" style={{ textAlign: 'center', marginBottom: 40 }}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10, scale: 0.97 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                <motion.div style={{ display: 'inline-block', marginBottom: 12 }}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.5 }}
                >
                  <h1 style={{
                    margin: 0, fontSize: 36, fontWeight: 500, letterSpacing: '-0.02em',
                    background: 'linear-gradient(to right, rgba(255,255,255,0.92), rgba(255,255,255,0.38))',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text', paddingBottom: 4,
                  }}>
                    Wie kann ich dir helfen?
                  </h1>
                  <motion.div
                    style={{ height: 1, background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.18), transparent)' }}
                    initial={{ width: 0, opacity: 0 }} animate={{ width: '100%', opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                  />
                </motion.div>
                <motion.p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.38)' }}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                >
                  Stell mir eine Frage zu deinem Partner-Portal
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* glass input card */}
          <motion.div style={S.glass}
            initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <div style={{ padding: 16 }}>
              <textarea
                ref={taRef}
                value={input}
                onChange={e => { setInput(e.target.value); adjust(); }}
                onKeyDown={onKey}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Stell mir eine Frage…"
                style={{
                  width: '100%', minHeight: 60, maxHeight: 200,
                  background: 'transparent', border: 'none', outline: 'none',
                  resize: 'none', overflow: 'hidden',
                  color: 'rgba(255,255,255,0.88)', fontSize: 14, lineHeight: 1.55,
                  fontFamily: 'inherit', padding: '4px 8px',
                }}
                // placeholder color via CSS var
                className="ai-textarea"
              />
            </div>

            <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>Enter zum Senden · Shift+Enter neue Zeile</span>
              <motion.button
                onClick={() => send()}
                disabled={loading || !input.trim()}
                whileHover={input.trim() && !loading ? { scale: 1.02 } : {}}
                whileTap={input.trim() && !loading ? { scale: 0.97 } : {}}
                style={input.trim() && !loading ? S.sendActive : S.sendInactive}
              >
                {loading ? <LoaderIcon size={14} style={{ animation: 'ai-spin 1.4s linear infinite' }} /> : <SendIcon size={14} />}
                <span>Senden</span>
              </motion.button>
            </div>
          </motion.div>

          {/* chips (empty state only) */}
          <AnimatePresence>
            {!hasMessages && (
              <motion.div key="chips"
                style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 20 }}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }} transition={{ delay: 0.3 }}
              >
                {CHIPS.map((c, i) => (
                  <motion.button key={c.label}
                    onClick={() => send(c.q)}
                    onMouseEnter={() => setChipHover(i)}
                    onMouseLeave={() => setChipHover(-1)}
                    style={{
                      ...S.chip,
                      background: chipHover === i ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                      color: chipHover === i ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.55)',
                    }}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.32 + i * 0.07 }}
                    whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                  >
                    {c.icon}<span>{c.label}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      {/* "Denkt nach" toast */}
      <AnimatePresence>
        {loading && (
          <motion.div
            style={{
              position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
              ...S.glass, padding: '8px 18px', zIndex: 50, display: 'flex', alignItems: 'center', gap: 10,
            }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
          >
            <div style={{ width: 28, height: 24, borderRadius: 20, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>KI</span>
            </div>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>Denkt nach</span>
            <TypingDots />
          </motion.div>
        )}
      </AnimatePresence>

      {/* mouse-follow glow */}
      {focused && (
        <motion.div
          style={{
            position: 'fixed', width: 800, height: 800, borderRadius: '50%',
            pointerEvents: 'none', zIndex: 0,
            background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, rgba(99,102,241,0.1) 40%, transparent 70%)',
            filter: 'blur(60px)',
            top: -400, left: -400,
          }}
          animate={{ x: mousePos.x, y: mousePos.y }}
          transition={{ type: 'spring', damping: 30, stiffness: 120, mass: 0.8 }}
        />
      )}

      <style>{`
        .ai-textarea::placeholder { color: rgba(255,255,255,0.2); }
        @keyframes ai-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
