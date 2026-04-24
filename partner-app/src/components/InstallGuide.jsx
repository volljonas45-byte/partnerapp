import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Smartphone } from 'lucide-react';

const D = {
  card: '#16161E', border: 'rgba(255,255,255,0.08)',
  text: '#F2F2F7', text2: '#AEAEB2', text3: '#636366',
  blue: '#5B8CF5', blueL: 'rgba(91,140,245,0.15)',
  green: '#34D399', greenL: 'rgba(52,211,153,0.12)',
};

const IOS_STEPS = [
  { n: 1, title: 'Safari öffnen', text: 'Öffne die App-URL in Safari (nicht Chrome oder Firefox).' },
  { n: 2, title: 'Teilen-Icon tippen', text: 'Tippe unten in der Mitte auf das Teilen-Symbol (Quadrat mit Pfeil nach oben).' },
  { n: 3, title: '"Zum Home-Bildschirm"', text: 'Scrolle im Menü nach unten und tippe auf "Zum Home-Bildschirm".' },
  { n: 4, title: 'Hinzufügen bestätigen', text: 'Gib einen Namen ein und tippe oben rechts auf "Hinzufügen".' },
];

const ANDROID_STEPS = [
  { n: 1, title: 'Chrome öffnen', text: 'Öffne die App-URL in Google Chrome.' },
  { n: 2, title: '3-Punkte-Menü', text: 'Tippe oben rechts auf die drei Punkte (⋮).' },
  { n: 3, title: '"Zum Startbildschirm"', text: 'Tippe auf "Zum Startbildschirm hinzufügen".' },
  { n: 4, title: 'Hinzufügen bestätigen', text: 'Bestätige mit "Hinzufügen" — die App erscheint auf deinem Homescreen.' },
];

export default function InstallGuide({ onClose }) {
  const [tab, setTab] = useState('ios');
  const steps = tab === 'ios' ? IOS_STEPS : ANDROID_STEPS;

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 9500, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0 }} />

      <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
        style={{ position: 'relative', width: '100%', maxWidth: 440, margin: 16,
          background: D.card, borderRadius: 20, border: `1px solid ${D.border}`,
          boxShadow: '0 40px 80px rgba(0,0,0,0.6)', overflow: 'hidden' }}>

        <div style={{ height: 3, background: 'linear-gradient(90deg, #5B8CF5, #BF5AF2)' }} />

        <div style={{ padding: '24px 24px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: D.blueL,
                border: `1px solid rgba(91,140,245,0.3)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Smartphone size={18} color={D.blue} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: D.text }}>App installieren</h2>
                <p style={{ margin: 0, fontSize: 11.5, color: D.text3 }}>Füge die App zum Homescreen hinzu</p>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8,
              border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.04)',
              color: D.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={13} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 20,
            background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 4 }}>
            {[{ k: 'ios', l: '🍎 iOS (iPhone/iPad)' }, { k: 'android', l: '🤖 Android' }].map(({ k, l }) => (
              <button key={k} onClick={() => setTab(k)} style={{
                flex: 1, padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 12.5, fontWeight: 600,
                background: tab === k ? D.blue : 'transparent',
                color: tab === k ? '#fff' : D.text3, transition: 'all 0.2s',
              }}>{l}</button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {steps.map(({ n, title, text }) => (
              <div key={n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: D.blueL,
                  border: `1px solid rgba(91,140,245,0.3)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  fontSize: 12, fontWeight: 700, color: D.blue }}>
                  {n}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: D.text, marginBottom: 2 }}>{title}</div>
                  <div style={{ fontSize: 12.5, color: D.text2, lineHeight: 1.5 }}>{text}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, padding: '12px 14px', borderRadius: 10,
            background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
            <p style={{ margin: 0, fontSize: 12.5, color: D.green, lineHeight: 1.5 }}>
              ✓ Nach der Installation startet die App direkt vom Homescreen — wie eine native App, ohne Browser.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
