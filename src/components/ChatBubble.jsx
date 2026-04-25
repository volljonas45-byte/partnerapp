import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import { partnerApi } from '../api/partner';

const D = {
  bg: '#0D0D12', card: '#16161E', card2: '#1E1E28',
  accent: '#FF9F0A', accentL: 'rgba(255,159,10,0.12)',
  text: '#F2F2F7', text2: '#AEAEB2', text3: '#636366',
  border: 'rgba(255,255,255,0.07)',
};

export default function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([
    { role: 'model', text: 'Hallo! Ich bin dein Vecturo-Assistent. Wie kann ich dir helfen?' },
  ]);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', text };
    const newHistory = [...history, userMsg];
    setHistory(newHistory);
    setInput('');
    setLoading(true);

    // Build Gemini-format messages (only user/model turns)
    const geminiMessages = newHistory
      .filter(m => m.role === 'user' || m.role === 'model')
      .map(m => ({ role: m.role, parts: [{ text: m.text }] }));

    try {
      const { reply } = await partnerApi.aiChat(geminiMessages);
      setHistory(h => [...h, { role: 'model', text: reply }]);
    } catch {
      setHistory(h => [...h, { role: 'model', text: 'Fehler beim Laden der Antwort. Bitte versuche es erneut.' }]);
    } finally {
      setLoading(false);
    }
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>

      {open && (
        <div style={{
          width: 340, height: 480, background: D.card, borderRadius: 16,
          border: `1px solid ${D.border}`, display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
            borderBottom: `1px solid ${D.border}`, background: D.card2,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 9, background: D.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Bot size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: D.text }}>Vecturo Assistent</div>
              <div style={{ fontSize: 11, color: D.text3 }}>KI-Hilfe für dein Portal</div>
            </div>
            <button onClick={() => setOpen(false)} style={{
              marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
              color: D.text3, display: 'flex', padding: 4, borderRadius: 6,
            }}>
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {history.map((m, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '82%', padding: '8px 11px', borderRadius: m.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  background: m.role === 'user' ? D.accent : D.card2,
                  color: D.text, fontSize: 13, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '8px 12px', borderRadius: '12px 12px 12px 4px', background: D.card2, display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0, 1, 2].map(j => (
                    <div key={j} style={{
                      width: 6, height: 6, borderRadius: '50%', background: D.text3,
                      animation: 'bounce 1.2s infinite', animationDelay: `${j * 0.2}s`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 14px 14px', borderTop: `1px solid ${D.border}`, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Frag mich etwas…"
              rows={1}
              style={{
                flex: 1, background: D.card2, border: `1px solid ${D.border}`, borderRadius: 10,
                color: D.text, fontSize: 13, padding: '8px 10px', resize: 'none',
                outline: 'none', fontFamily: 'inherit', lineHeight: 1.4,
                maxHeight: 80, overflowY: 'auto',
              }}
            />
            <button onClick={send} disabled={!input.trim() || loading} style={{
              width: 36, height: 36, borderRadius: 10, background: input.trim() && !loading ? D.accent : D.card2,
              border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              transition: 'background 0.15s',
            }}>
              <Send size={15} color={input.trim() && !loading ? '#fff' : D.text3} />
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button onClick={() => setOpen(o => !o)} style={{
        width: 52, height: 52, borderRadius: '50%', background: D.accent,
        border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(255,159,10,0.4)', transition: 'transform 0.15s, box-shadow 0.15s',
      }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {open ? <X size={22} color="#fff" /> : <MessageCircle size={22} color="#fff" />}
      </button>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
