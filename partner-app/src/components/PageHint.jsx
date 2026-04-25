import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, X } from 'lucide-react';
import { useOnboarding } from '../context/OnboardingContext';

const HINTS = {
  '/': {
    title: 'Dashboard',
    text: 'Hier siehst du alle wichtigen Zahlen auf einen Blick — offene Leads, anstehende Termine und deinen Gesamtverdienst.',
  },
  '/demo-wizard': {
    title: 'Demo-Wizard',
    text: 'Nutze diesen Wizard während eines Anrufs. Schritt für Schritt: Firmendaten → Website-Wünsche → Termin buchen oder Demo per Mail senden.',
  },
  '/leads/mine': {
    title: 'Meine Leads',
    text: 'Klicke auf einen Lead für alle Details. Trage Anrufe ein, ändere den Status und starte den Demo-Wizard direkt aus dem Lead heraus.',
  },
  '/leads/pool': {
    title: 'Lead-Pool',
    text: 'Hier liegen offene Leads ohne Zuweisung. Mit einem Klick auf "Übernehmen" landet ein Lead in deiner Liste.',
  },
  '/appointments': {
    title: 'Termine',
    text: 'Alle geplanten Demo-Termine im Überblick. Nach dem Gespräch markierst du den Termin als abgeschlossen oder abgesagt.',
  },
  '/earnings': {
    title: 'Verdienste',
    text: 'Hier siehst du all deine Provisionen — offen, ausgezahlt und die Gesamtsumme.',
  },
  '/ai-chat': {
    title: 'KI-Assistent',
    text: 'Stelle Fragen zu deinen Leads, lass dir Tipps für das nächste Gespräch geben oder frage nach der besten Strategie für einen Deal.',
  },
  '/customers': {
    title: 'Meine Kunden',
    text: 'Hier siehst du alle Leads die du über den Demo-Wizard eingereicht hast — mit aktuellem Status und deiner Provision bei Abschluss.',
  },
};

export default function PageHint() {
  const { pathname } = useLocation();
  const { welcomeSeen, isPageSeen, markPageSeen } = useOnboarding();
  const [visible, setVisible] = useState(false);

  const hint = HINTS[pathname];

  useEffect(() => {
    if (!hint || !welcomeSeen || isPageSeen(pathname)) {
      setVisible(false);
      return;
    }
    // Small delay so the page content loads first
    const t = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(t);
  }, [pathname, welcomeSeen, hint, isPageSeen]);

  function dismiss() {
    setVisible(false);
    markPageSeen(pathname);
  }

  if (!hint) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          style={{
            position: 'fixed', bottom: 28, left: 240,
            zIndex: 8000, width: 300,
          }}>
          <div style={{
            background: '#1C1C28',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16,
            boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
            overflow: 'hidden',
          }}>
            {/* Top accent line */}
            <div style={{ height: 3, background: 'linear-gradient(90deg, #4F6EF7, #BF5AF2)' }} />

            <div style={{ padding: '14px 16px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(79,110,247,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Lightbulb size={13} color="#4F6EF7" />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#F2F2F7' }}>{hint.title}</span>
                </div>
                <button onClick={dismiss}
                  style={{ width: 22, height: 22, borderRadius: 6, border: 'none',
                    background: 'rgba(255,255,255,0.06)', color: '#636366',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0 }}>
                  <X size={11} />
                </button>
              </div>

              <p style={{ margin: '0 0 14px', fontSize: 12.5, color: '#AEAEB2', lineHeight: 1.6 }}>
                {hint.text}
              </p>

              <button onClick={dismiss}
                style={{
                  width: '100%', padding: '8px', borderRadius: 9, border: 'none',
                  background: 'rgba(79,110,247,0.12)', color: '#4F6EF7',
                  fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                  transition: 'background 0.15s',
                }}>
                Verstanden ✓
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
