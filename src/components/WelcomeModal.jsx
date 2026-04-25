import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Briefcase, Users, Sparkles, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
import { useOnboarding } from '../context/OnboardingContext';

const D = {
  bg: 'rgba(13,13,18,0.85)',
  card: '#16161E',
  border: 'rgba(255,255,255,0.08)',
  text: '#F2F2F7', text2: '#AEAEB2', text3: '#636366',
  blue: '#5B8CF5', blueL: 'rgba(91,140,245,0.15)',
  green: '#34D399', greenL: 'rgba(52,211,153,0.15)',
  orange: '#FF9F0A', orangeL: 'rgba(255,159,10,0.15)',
  purple: '#BF5AF2', purpleL: 'rgba(191,90,242,0.15)',
};

const STEPS = [
  {
    icon: Sparkles,
    color: D.blue, colorL: D.blueL,
    title: 'Willkommen im Partner-Portal',
    text: 'Schön, dass du dabei bist! Wir zeigen dir in wenigen Schritten die wichtigsten Funktionen — dauert nur eine Minute.',
  },
  {
    icon: Briefcase,
    color: D.orange, colorL: D.orangeL,
    title: 'Leads verwalten',
    text: 'Unter "Meine Leads" findest du alle deine Kontakte. Klicke auf einen Lead für Details, trage Anrufe ein und behalte den Status im Blick.',
  },
  {
    icon: Phone,
    color: D.green, colorL: D.greenL,
    title: 'Demo-Wizard für Anrufe',
    text: 'Starte den Demo-Wizard während eines Gesprächs: Firmendaten erfassen, Website-Wünsche klären und direkt einen Demo-Termin buchen — oder die Demo per Mail senden.',
  },
  {
    icon: Users,
    color: D.purple, colorL: D.purpleL,
    title: 'Lead-Pool',
    text: 'Im Lead-Pool liegen offene Kontakte ohne Zuweisung. Übernimm einen Lead mit einem Klick — jeder gewonnene Deal bringt dir Provision.',
  },
  {
    icon: CheckCircle2,
    color: D.green, colorL: D.greenL,
    title: 'Alles klar — leg los!',
    text: 'Du siehst kleine Hinweise, wenn du eine Seite zum ersten Mal öffnest. Du kannst sie jederzeit wegklicken.',
    last: true,
  },
];

export default function WelcomeModal() {
  const { welcomeSeen, markWelcomeSeen } = useOnboarding();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);

  if (welcomeSeen) return null;

  const s = STEPS[step];
  const Icon = s.icon;

  function go(next) {
    setDir(next > step ? 1 : -1);
    setStep(next);
  }

  function finish() {
    markWelcomeSeen();
  }

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: D.bg, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>

      <motion.div initial={{ scale: 0.94, y: 16 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        style={{
          width: '100%', maxWidth: 440, margin: 20,
          background: D.card, borderRadius: 24,
          border: `1px solid ${D.border}`,
          boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}>

        {/* Top color bar */}
        <div style={{ height: 4, background: `linear-gradient(90deg, ${s.color}, ${s.color}60)`,
          transition: 'background 0.4s' }} />

        <div style={{ padding: '36px 36px 28px' }}>
          {/* Icon */}
          <AnimatePresence mode="wait">
            <motion.div key={step}
              initial={{ opacity: 0, y: 10 * dir }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 * dir }}
              transition={{ duration: 0.22 }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: s.colorL,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
                border: `1px solid ${s.color}30` }}>
                <Icon size={30} color={s.color} strokeWidth={1.8} />
              </div>

              <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 800, color: D.text, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
                {s.title}
              </h2>
              <p style={{ margin: 0, fontSize: 14, color: D.text2, lineHeight: 1.65 }}>
                {s.text}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom bar */}
        <div style={{ padding: '0 36px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Dots */}
          <div style={{ display: 'flex', gap: 6 }}>
            {STEPS.map((_, i) => (
              <button key={i} onClick={() => go(i)}
                style={{
                  width: i === step ? 20 : 7, height: 7, borderRadius: 99,
                  background: i === step ? s.color : 'rgba(255,255,255,0.12)',
                  border: 'none', cursor: 'pointer', padding: 0,
                  transition: 'all 0.25s',
                }} />
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <button onClick={() => go(step - 1)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '9px 16px',
                  borderRadius: 10, background: 'transparent', border: `1px solid ${D.border}`,
                  color: D.text3, cursor: 'pointer', fontSize: 13 }}>
                <ChevronLeft size={14} />
              </button>
            )}
            {step === 0 && (
              <button onClick={finish}
                style={{ padding: '9px 16px', borderRadius: 10, background: 'transparent',
                  border: 'none', color: D.text3, cursor: 'pointer', fontSize: 13 }}>
                Überspringen
              </button>
            )}
            <button onClick={s.last ? finish : () => go(step + 1)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '9px 22px',
                borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                background: s.color, color: s.last ? '#000' : '#fff',
                boxShadow: `0 4px 16px ${s.color}40`,
                transition: 'all 0.2s',
              }}>
              {s.last ? 'Loslegen' : 'Weiter'} {!s.last && <ChevronRight size={15} />}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
