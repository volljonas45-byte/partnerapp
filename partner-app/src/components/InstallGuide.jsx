import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Smartphone } from 'lucide-react';

const D = {
  card: '#16161E', border: 'rgba(255,255,255,0.08)',
  text: '#F2F2F7', text2: '#AEAEB2', text3: '#636366',
  accent: '#FF9F0A', accentL: 'rgba(255,159,10,0.15)',
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

        <div style={{ height: 3, background: 'linear-gradient(90deg, #FF9F0A, #BF5AF2)' }} />

        <div style={{ padding: '24px 24px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: D.accentL,
                border: `1px solid rgba(255,159,10,0.3)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Smartphone size={18} color={D.accent} />
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
            {[
              {
                k: 'ios', l: 'iOS (iPhone/iPad)',
                icon: (
                  <svg viewBox="0 0 814 1000" width="13" height="13" fill="currentColor">
                    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105.3-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 71 0 130.5 46.4 174.9 46.4 42.7 0 109.2-49.5 189.2-49.5 30.6 0 130.1 2.6 198.3 99.3zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
                  </svg>
                ),
              },
              {
                k: 'android', l: 'Android',
                icon: (
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                    <path d="M17.523 15.341a.9.9 0 01-.9-.9.9.9 0 01.9-.9.9.9 0 01.9.9.9.9 0 01-.9.9m-11.046 0a.9.9 0 01-.9-.9.9.9 0 01.9-.9.9.9 0 01.9.9.9.9 0 01-.9.9m11.405-6.021l1.77-3.065a.366.366 0 00-.134-.501.366.366 0 00-.501.134l-1.793 3.106A10.95 10.95 0 0012 8.087c-1.67 0-3.247.382-4.652 1.052L5.555 6.033a.366.366 0 00-.501-.134.366.366 0 00-.134.501l1.77 3.065A10.86 10.86 0 001 18h22a10.86 10.86 0 00-5.118-8.68"/>
                  </svg>
                ),
              },
            ].map(({ k, l, icon }) => (
              <button key={k} onClick={() => setTab(k)} style={{
                flex: 1, padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: tab === k ? D.accent : 'transparent',
                color: tab === k ? '#fff' : D.text3, transition: 'all 0.2s',
              }}>{icon}{l}</button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {steps.map(({ n, title, text }) => (
              <div key={n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: D.accentL,
                  border: `1px solid rgba(255,159,10,0.3)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  fontSize: 12, fontWeight: 700, color: D.accent }}>
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
              Nach der Installation startet die App direkt vom Homescreen — wie eine native App, ohne Browser.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
