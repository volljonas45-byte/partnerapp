import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, HelpCircle, MapPin, Inbox } from 'lucide-react';

const D = {
  card: '#16161E', border: 'rgba(255,255,255,0.08)',
  text: '#F2F2F7', text2: '#AEAEB2', text3: '#636366',
  accent: '#4F6EF7', accentL: 'rgba(79,110,247,0.15)',
  green: '#34D399', greenL: 'rgba(52,211,153,0.12)',
};

const REQUEST_STEPS = [
  { n: 1, title: 'Leads anfragen klicken', text: 'Klicke oben rechts auf "Leads anfragen" und wähle eine Branche.' },
  { n: 2, title: 'Branche & Anzahl eingeben', text: 'Gib an, aus welcher Branche du Leads möchtest und wie viele du haben willst.' },
  { n: 3, title: 'Anfrage absenden', text: 'Sende die Anfrage ab — wir melden uns per E-Mail sobald passende Leads bereit sind.' },
  { n: 4, title: 'Lead im Pool übernehmen', text: 'Zugewiesene Leads erscheinen im Lead-Pool. Mit einem Klick auf "Übernehmen" landet der Lead in deiner Liste.' },
];

const MAPS_STEPS = [
  { n: 1, title: 'Google Maps öffnen', text: 'Gehe zu maps.google.com und gib Ort + Branche ein, z.B. "Stuttgart Friseur".' },
  { n: 2, title: 'Einträge durchsuchen', text: 'Suche nach Unternehmen mit schlechter, alter oder gar keiner Website.' },
  { n: 3, title: 'Website prüfen', text: 'Ist im Google-Profil eine Website verknüpft? Wenn nicht — perfekter Lead!' },
  { n: 4, title: 'Website bewerten', text: 'Sieht die Website veraltet aus (vor 2018, nicht mobiloptimiert)? Dann lohnt sich die Kontaktaufnahme.' },
  { n: 5, title: 'Screenshot machen', text: 'Mache einen Screenshot vom vollständigen Google Maps-Profil des Unternehmens.' },
  { n: 6, title: 'Screenshot importieren', text: 'In "Meine Leads" auf "Screenshot" klicken → Bild hochladen → KI extrahiert die Daten automatisch.' },
  { n: 7, title: 'Lead anlegen & Demo starten', text: 'Lead anlegen und direkt den Demo-Wizard starten um die Demo vorzubereiten.' },
];

function Step({ n, title, text, color }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ width: 26, height: 26, borderRadius: 7, background: `${color}18`,
        border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        fontSize: 11, fontWeight: 700, color }}>
        {n}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: D.text, marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: D.text2, lineHeight: 1.5 }}>{text}</div>
      </div>
    </div>
  );
}

export default function LeadGuide({ onClose }) {
  const [tab, setTab] = useState('request');

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 9500, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0 }} />

      <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
        style={{ position: 'relative', width: '100%', maxWidth: 500, margin: 16,
          background: D.card, borderRadius: 20, border: `1px solid ${D.border}`,
          boxShadow: '0 40px 80px rgba(0,0,0,0.6)', overflow: 'hidden',
          maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>

        <div style={{ height: 3, background: 'linear-gradient(90deg, #4F6EF7, #34D399)', flexShrink: 0 }} />

        <div style={{ padding: '22px 24px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: D.accentL,
                border: `1px solid rgba(79,110,247,0.3)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HelpCircle size={18} color={D.accent} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: D.text }}>Lead-Guide</h2>
                <p style={{ margin: 0, fontSize: 11.5, color: D.text3 }}>Wie du Leads findest und anfragst</p>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8,
              border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.04)',
              color: D.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={13} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 4, marginBottom: 20 }}>
            {[
              { k: 'request', l: 'Leads anfragen', icon: Inbox },
              { k: 'maps', l: 'Google Maps Strategie', icon: MapPin },
            ].map(({ k, l, icon: Icon }) => (
              <button key={k} onClick={() => setTab(k)} style={{
                flex: 1, padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12,
                fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                background: tab === k ? D.accent : 'transparent',
                color: tab === k ? '#fff' : D.text3, transition: 'all 0.2s',
              }}>
                <Icon size={12} /> {l}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowY: 'auto', padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tab === 'request' ? (
            <>
              <div style={{ padding: '12px 14px', borderRadius: 10, background: D.accentL,
                border: `1px solid rgba(79,110,247,0.25)`, marginBottom: 4 }}>
                <p style={{ margin: 0, fontSize: 12.5, color: D.accent, lineHeight: 1.5 }}>
                  Du kannst gezielt Leads anfordern — wir suchen dann passende Kontakte für dich heraus und weisen sie dir zu.
                </p>
              </div>
              {REQUEST_STEPS.map(s => <Step key={s.n} {...s} color={D.accent} />)}
            </>
          ) : (
            <>
              <div style={{ padding: '12px 14px', borderRadius: 10, background: D.greenL,
                border: `1px solid rgba(52,211,153,0.25)`, marginBottom: 4 }}>
                <p style={{ margin: 0, fontSize: 12.5, color: D.green, lineHeight: 1.5 }}>
                  Mit dieser Strategie findest du selbst Unternehmen die eine neue Website brauchen — direkt über Google Maps.
                </p>
              </div>
              {MAPS_STEPS.map(s => <Step key={s.n} {...s} color={D.green} />)}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
