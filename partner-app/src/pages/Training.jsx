import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, ChevronLeft, ChevronRight, CheckCircle2,
  BookOpen, Phone, Flame, Trophy, Zap, Lock,
} from 'lucide-react';

// ─── Design tokens (match app) ────────────────────────────────────────────────
const D = {
  bg:      '#070C15',
  card:    '#0D1525',
  card2:   '#0F1A2E',
  border:  'rgba(255,255,255,0.07)',
  border2: 'rgba(255,255,255,0.04)',
  text:    '#F2F2F7',
  text2:   'rgba(255,255,255,0.55)',
  text3:   'rgba(255,255,255,0.28)',
  accent:  '#3B82F6',
  accentL: 'rgba(59,130,246,0.12)',
  green:   '#34D399',
  greenL:  'rgba(52,211,153,0.10)',
  orange:  '#F59E0B',
  orangeL: 'rgba(245,158,11,0.10)',
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const COLD_CALLING = [
  { block: 'Mindset & Grundlage', color: '#818CF8', videos: [
    { id: 'ikn-tetNHZw', title: 'Angst vorm Cold Calling überwinden',       duration: '14 min', desc: 'Fear & Anxiety auflösen – der essenzielle Einstieg für jeden Cold Caller.' },
    { id: 'jc0WyiPuXLU', title: 'Das einzige Mindset-Video das du brauchst', duration: '18 min', desc: 'Wie die besten Cold Caller über Ablehnung denken – .01% Mindset.' },
  ]},
  { block: 'Script & Opener', color: '#FBBF24', videos: [
    { id: 'f7ys83DQXGg', title: 'Der einzige Opener den du brauchst (2024)',  duration: '12 min', desc: 'Pattern Interrupt und der perfekte erste Satz – System für 1+ Meeting pro Tag.' },
    { id: 'NdIPxKIPVc0', title: 'Die besten Opening Lines 2025',              duration: '20 min', desc: '8 Sales-Trainer zeigen ihre stärksten Opener im direkten Vergleich.' },
    { id: 'yZxc-JZTdgI', title: 'Das ultimative B2B Cold Call Script',        duration: '22 min', desc: 'Vollständiges Script von der Begrüßung bis zur Terminvereinbarung.' },
  ]},
  { block: 'Einwandbehandlung', color: '#F87171', videos: [
    { id: '-m_pMr52b6M', title: 'Die 10 häufigsten Einwände & Antworten',     duration: '35 min', desc: 'Alle Standard-Einwände mit konkreten Antworten direkt aus der Praxis.' },
    { id: 'NtrC9DK_qE8', title: '3-Schritt-Framework für jeden Einwand',      duration: '40 min', desc: 'Vollständiger Einwand-Kurs – ein Framework das auf jeden Einwand passt.' },
    { id: '4Gwt4w4Ran4', title: '42 Min Einwand-Roleplays (Fortgeschritten)', duration: '43 min', desc: 'Armand Farrokh, Jason Bay & Nick Cegelski in echten Live-Roleplays.' },
  ]},
  { block: 'Live Cold Calls', color: '#34D399', videos: [
    { id: 'WDuflhD3JHQ', title: 'Live: Erfolgreicher Cold Call (2024)',        duration: '8 min',  desc: 'Echter Anruf mit einem Sales Leader – Einwandbehandlung live beobachten.' },
    { id: '2vivv2HeiBU', title: 'Masterclass mit echten Live-Calls',           duration: '30 min', desc: 'Perfektes Script + Live-Demos: 1 von 3 Gesprächen endet im Termin.' },
    { id: 'DEt3IRqqUVs', title: '10 Live Calls von 6 verschiedenen Reps',      duration: '25 min', desc: 'Verschiedene Stile und Persönlichkeiten – was funktioniert wirklich?' },
  ]},
  { block: 'Termin buchen & Abschluss', color: '#38BDF8', videos: [
    { id: 'dnOu6ysy7NU', title: 'Wie ich 3–5 Termine/Tag buche (B2B)',         duration: '18 min', desc: 'Konkretes System – Schritt für Schritt zur maximalen Buchungsrate.' },
    { id: 'VorAlE7eRIk', title: 'B2B Appointment Setting meistern',            duration: '20 min', desc: 'Eric Watkins erklärt seine genaue Methode für konsistente Termin-Pipeline.' },
  ]},
  { block: 'Masterclasses (Deep-Dive)', color: '#A3E635', videos: [
    { id: '17SF_CBE2Pg', title: '17-Min Cold Call Kurs für B2B Sales',         duration: '17 min', desc: 'Kompakter Gesamtkurs – alle wichtigen Strategien in einer Session.' },
    { id: 'aW8jAYnvqyI', title: '35 Min Expert Cold Calling Tips (B2B)',       duration: '35 min', desc: 'B2B & Software Sales – ehrliche Tipps von erfahrenen Praktikern.' },
    { id: 'A1dsYkSL7TM', title: '15+ Jahre No-BS Cold Calling Advice',         duration: '36 min', desc: 'Die direkteste und ehrlichste Cold Calling Zusammenfassung auf YouTube.' },
  ]},
];

const WEB_DESIGN = [
  { block: 'Warum eine Website entscheidend ist', color: '#38BDF8', videos: [
    { id: 'SAGcWZVN5m0', title: 'Wie eine Website einem Unternehmen hilft',           duration: '10 min', desc: 'Web Designer müssen genau wissen, warum Unternehmen eine Website brauchen – perfekt für den Pitch.' },
    { id: 'p8fjj6Lyexs', title: '9 Gründe warum dein Business eine Website braucht',  duration: '12 min', desc: 'Konkrete Argumente für Kunden: Credibility, Erreichbarkeit, Wachstum.' },
    { id: 'NN7YEIlc-Oc', title: 'Warum eine Website das wichtigste digitale Asset ist',duration: '8 min',  desc: 'HubSpot erklärt kompakt: Website als zentraler Knotenpunkt des Marketings.' },
  ]},
  { block: 'Vertrauen & erste Eindrücke', color: '#F87171', videos: [
    { id: 'tqYkYk5nEu8', title: 'Warum manche Websites vertrauenswürdig wirken',      duration: '14 min', desc: 'Die psychologischen Faktoren hinter Trust – und was schlechte Websites falsch machen.' },
    { id: 'sX-VHe9vyf0', title: '10 Website-Fehler die Credibility zerstören',        duration: '16 min', desc: 'Die häufigsten Design-Fehler und warum sie Kunden kosten.' },
    { id: 'TKuFLxX94qU', title: 'Kann eine schlechte Website eine Marke ruinieren?',  duration: '11 min', desc: 'Direkte Antwort: Ja. Und hier ist warum – perfektes Argument für den Erstkontakt.' },
  ]},
  { block: 'Web Design Grundlagen', color: '#818CF8', videos: [
    { id: 'q9nBRJo_Iss', title: 'Web Design Basics: 4 Prinzipien für Anfänger',       duration: '15 min', desc: 'Die vier Grundprinzipien guten Webdesigns – verständlich erklärt.' },
    { id: 'Kt6qND056bM', title: '10 Web Design Fehler die Besucher vertreiben',       duration: '18 min', desc: '88% der Besucher kommen nach schlechter UX nicht zurück – diese Fehler kosten Leads.' },
    { id: 'F4fbwKV9dBU', title: 'Alles über Web Design in 3 Minuten',                 duration: '3 min',  desc: 'Schneller animierter Überblick – ideal als Einstieg oder Refresher.' },
  ]},
  { block: 'Websites verkaufen & pitchen', color: '#A3E635', videos: [
    { id: 'r1wujxdXB4I', title: 'Web Design Services verkaufen: 5 Tipps',             duration: '18 min', desc: 'Wie man hochwertige Web-Design-Kunden gewinnt – mit klarer Positionierung.' },
    { id: 'W-_NGb2jchM', title: '30-Sekunden Sales Pitch für Websites',               duration: '8 min',  desc: 'Was sagst du in 30 Sekunden am Telefon? Dieses Video liefert genau das.' },
    { id: 'foX8YCcR1OY', title: 'Websites verkaufen mit der Mini-Audit Methode',      duration: '14 min', desc: 'Einfache Technik: Live-Analyse der Kunden-Website als Türöffner für Premium-Projekte.' },
  ]},
];

const CURRICULA = [
  { key: 'cold-calling', label: 'Cold Calling',        icon: Phone,    data: COLD_CALLING },
  { key: 'web-design',   label: 'Web Design für Caller', icon: BookOpen, data: WEB_DESIGN   },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function flattenVideos(curriculum) {
  const list = [];
  curriculum.forEach(b => b.videos.forEach(v => list.push({ ...v, block: b.block, color: b.color })));
  return list;
}

function buildBlocks(curriculum, watched) {
  let idx = 0;
  return curriculum.map(b => {
    const start = idx;
    const items = b.videos.map((v, i) => ({ ...v, flatIdx: start + i }));
    idx += b.videos.length;
    const done = items.filter(v => watched.has(v.flatIdx)).length;
    return { ...b, items, done };
  });
}

// ─── XP Toast ─────────────────────────────────────────────────────────────────
function XPToast({ show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed', bottom: 32, right: 32, zIndex: 999,
            background: D.card, border: `1px solid ${D.green}44`,
            borderRadius: 12, padding: '12px 18px',
            display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: `0 8px 32px rgba(52,211,153,0.15)`,
          }}
        >
          <div style={{ width: 32, height: 32, borderRadius: 8, background: D.greenL, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={16} color={D.green} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: D.text }}>+10 XP verdient!</div>
            <div style={{ fontSize: 11, color: D.text3 }}>Video abgeschlossen</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── CurriculumPlayer ─────────────────────────────────────────────────────────
function CurriculumPlayer({ curriculum }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [watched, setWatched]           = useState(new Set());
  const [playerActive, setPlayerActive] = useState(false);
  const [showXP, setShowXP]             = useState(false);
  const [justWatched, setJustWatched]   = useState(null);

  const flat   = useMemo(() => flattenVideos(curriculum), [curriculum]);
  const blocks = useMemo(() => buildBlocks(curriculum, watched), [curriculum, watched]);
  const total  = flat.length;
  const done   = watched.size;
  const pct    = total ? (done / total) * 100 : 0;
  const current = flat[currentIndex];

  const goTo = (idx) => {
    if (idx < 0 || idx >= total) return;
    setCurrentIndex(idx);
    setPlayerActive(false);
  };

  const toggleWatched = () => {
    const adding = !watched.has(currentIndex);
    setWatched(prev => {
      const next = new Set(prev);
      next.has(currentIndex) ? next.delete(currentIndex) : next.add(currentIndex);
      return next;
    });
    if (adding) {
      setJustWatched(currentIndex);
      setShowXP(true);
      setTimeout(() => setShowXP(false), 2500);
    }
  };

  const isWatched = watched.has(currentIndex);

  return (
    <>
      <XPToast show={showXP} />

      {/* ── Stats bar ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {[
          { icon: Trophy, label: 'Abgeschlossen', value: `${done} / ${total}`, color: D.accent },
          { icon: Flame,  label: 'Fortschritt',   value: `${Math.round(pct)}%`, color: D.orange },
          { icon: Zap,    label: 'XP verdient',   value: `${done * 10} XP`,     color: D.green  },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{
            flex: 1, background: D.card, border: `0.5px solid ${D.border}`,
            borderRadius: 12, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={17} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: D.text, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11, color: D.text3, marginTop: 2 }}>{label}</div>
            </div>
          </div>
        ))}

        {/* Progress bar full width */}
        <div style={{
          flex: 2.5, background: D.card, border: `0.5px solid ${D.border}`,
          borderRadius: 12, padding: '12px 18px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 7,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: D.text2 }}>Gesamtfortschritt</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? D.green : D.accent }}>{Math.round(pct)}%</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
            <motion.div
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{ height: '100%', background: pct === 100 ? D.green : D.accent, borderRadius: 99 }}
            />
          </div>
          {pct === 100 && (
            <div style={{ fontSize: 11, color: D.green, fontWeight: 600 }}>🎉 Curriculum abgeschlossen!</div>
          )}
        </div>
      </div>

      {/* ── Main layout ── */}
      <div style={{ display: 'flex', gap: 14, height: 520 }}>

        {/* ── Sidebar ── */}
        <div style={{
          width: 264, flexShrink: 0,
          background: D.card, border: `0.5px solid ${D.border}`,
          borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '12px 14px 10px', borderBottom: `0.5px solid ${D.border}`, flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: D.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              Lektionen
            </span>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, scrollbarWidth: 'thin', scrollbarColor: `rgba(255,255,255,0.05) transparent` }}>
            {blocks.map((block) => (
              <div key={block.block}>
                {/* Block header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px 5px',
                  position: 'sticky', top: 0, background: D.card, zIndex: 1,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: block.color }} />
                    <span style={{ fontSize: 9, fontWeight: 700, color: D.text3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {block.block}
                    </span>
                  </div>
                  <span style={{ fontSize: 9, color: block.done === block.items.length ? D.green : D.text3, fontWeight: 600 }}>
                    {block.done}/{block.items.length}
                  </span>
                </div>

                {block.items.map((v, localIdx) => {
                  const isActive  = v.flatIdx === currentIndex;
                  const isWatched = watched.has(v.flatIdx);
                  return (
                    <div
                      key={v.id}
                      onClick={() => goTo(v.flatIdx)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 9,
                        padding: '7px 14px 7px 12px',
                        cursor: 'pointer',
                        borderLeft: `2px solid ${isActive ? block.color : 'transparent'}`,
                        background: isActive ? `${block.color}0F` : 'transparent',
                        transition: 'background 0.1s',
                      }}
                    >
                      {/* Dot */}
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%',
                        flexShrink: 0, marginTop: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 700,
                        background: isWatched ? D.greenL : isActive ? `${block.color}20` : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isWatched ? D.green : isActive ? `${block.color}60` : D.border}`,
                        color: isWatched ? D.green : isActive ? block.color : D.text3,
                      }}>
                        {isWatched ? <CheckCircle2 size={10} strokeWidth={2.5} /> : localIdx + 1}
                      </div>
                      <span style={{
                        fontSize: 12, lineHeight: 1.4,
                        fontWeight: isActive ? 500 : 400,
                        color: isWatched ? D.text3 : isActive ? D.text : D.text2,
                      }}>
                        {v.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* ── Player + Info ── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Player */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => !playerActive && setPlayerActive(true)}
              style={{
                position: 'relative', borderRadius: 14, overflow: 'hidden',
                background: '#000', cursor: playerActive ? 'default' : 'pointer',
                aspectRatio: '16/9', flexShrink: 0,
                border: `0.5px solid ${D.border}`,
              }}
            >
              {playerActive ? (
                <iframe
                  style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                  src={`https://www.youtube.com/embed/${current.id}?autoplay=1&rel=0`}
                  title={current.title}
                  allow="autoplay; encrypted-media; accelerometer; clipboard-write; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <>
                  <img
                    src={`https://img.youtube.com/vi/${current.id}/maxresdefault.jpg`}
                    alt={current.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={e => { e.currentTarget.src = `https://img.youtube.com/vi/${current.id}/hqdefault.jpg`; }}
                  />
                  {/* Gradient */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(7,12,21,0.95) 0%, rgba(7,12,21,0.4) 40%, rgba(7,12,21,0.05) 100%)' }} />

                  {/* Play */}
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <motion.div
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.96 }}
                      style={{
                        width: 68, height: 68, borderRadius: '50%',
                        background: D.accent,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: `0 0 0 10px ${D.accentL}, 0 12px 40px rgba(59,130,246,0.35)`,
                      }}
                    >
                      <Play size={26} color="#fff" fill="#fff" style={{ marginLeft: 4 }} />
                    </motion.div>
                  </div>

                  {/* Bottom info */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: current.color,
                        background: `${current.color}20`, border: `1px solid ${current.color}35`,
                        padding: '2px 9px', borderRadius: 6,
                        textTransform: 'uppercase', letterSpacing: '0.07em',
                      }}>
                        {current.block}
                      </span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{current.duration}</span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1.3, letterSpacing: '-0.01em' }}>
                      {current.title}
                    </div>
                  </div>

                  {/* Counter badge */}
                  <div style={{
                    position: 'absolute', top: 12, right: 12,
                    fontSize: 11, fontWeight: 600, color: D.text2,
                    background: 'rgba(7,12,21,0.75)', backdropFilter: 'blur(6px)',
                    padding: '3px 10px', borderRadius: 6, border: `0.5px solid ${D.border}`,
                  }}>
                    {currentIndex + 1} / {total}
                  </div>

                  {/* Watched badge */}
                  {isWatched && (
                    <div style={{
                      position: 'absolute', top: 12, left: 12,
                      fontSize: 11, fontWeight: 600, color: D.green,
                      background: D.greenL, backdropFilter: 'blur(6px)',
                      padding: '3px 10px', borderRadius: 6, border: `0.5px solid ${D.green}44`,
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                      <CheckCircle2 size={11} /> Gesehen
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Controls */}
          <div style={{
            background: D.card, border: `0.5px solid ${D.border}`, borderRadius: 14,
            padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flex: 1,
          }}>
            {/* Description */}
            <p style={{ margin: 0, fontSize: 13, color: D.text2, lineHeight: 1.55, flex: 1, minWidth: 0 }}>
              {current.desc}
            </p>

            {/* Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <button
                disabled={currentIndex === 0}
                onClick={() => goTo(currentIndex - 1)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 13px', borderRadius: 9,
                  border: `0.5px solid ${D.border}`, background: 'transparent',
                  color: currentIndex === 0 ? 'rgba(255,255,255,0.15)' : D.text2,
                  fontSize: 12, fontWeight: 500, cursor: currentIndex === 0 ? 'default' : 'pointer',
                }}
              >
                <ChevronLeft size={14} /> Zurück
              </button>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={toggleWatched}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '7px 16px', borderRadius: 9,
                  border: `0.5px solid ${isWatched ? D.green : D.border}`,
                  background: isWatched ? D.greenL : 'rgba(255,255,255,0.04)',
                  color: isWatched ? D.green : D.text2,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.18s', whiteSpace: 'nowrap',
                }}
              >
                <CheckCircle2 size={13} />
                {isWatched ? 'Abgeschlossen ✓' : 'Als gesehen markieren'}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={currentIndex === total - 1}
                onClick={() => goTo(currentIndex + 1)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 15px', borderRadius: 9,
                  border: `0.5px solid ${currentIndex === total - 1 ? D.border : D.accent}`,
                  background: currentIndex === total - 1 ? 'transparent' : D.accentL,
                  color: currentIndex === total - 1 ? 'rgba(255,255,255,0.15)' : D.accent,
                  fontSize: 12, fontWeight: 600, cursor: currentIndex === total - 1 ? 'default' : 'pointer',
                }}
              >
                Weiter <ChevronRight size={14} />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Training Page ────────────────────────────────────────────────────────────
export default function Training() {
  const [activeCurriculum, setActiveCurriculum] = useState('cold-calling');
  const active = CURRICULA.find(c => c.key === activeCurriculum);

  return (
    <div style={{ minHeight: '100%', padding: '28px 28px 64px', boxSizing: 'border-box' }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{ marginBottom: 24 }}
      >
        <p style={{ fontSize: 11, fontWeight: 700, color: D.text3, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 4px' }}>
          Weiterbildung
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ margin: '0 0 3px', fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: D.text }}>
              Training
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: D.text3 }}>
              Strukturierte Lernprogramme · Video für Video zum Cold Calling Profi
            </p>
          </div>

          {/* Curriculum switcher */}
          <div style={{ display: 'flex', gap: 6, background: D.card, border: `0.5px solid ${D.border}`, borderRadius: 11, padding: 4 }}>
            {CURRICULA.map(c => {
              const Icon = c.icon;
              const isActive = activeCurriculum === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setActiveCurriculum(c.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '7px 14px', borderRadius: 8,
                    border: 'none',
                    background: isActive ? D.accentL : 'transparent',
                    color: isActive ? D.accent : D.text3,
                    fontSize: 13, fontWeight: isActive ? 600 : 400,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <Icon size={14} />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Player */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCurriculum}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <CurriculumPlayer curriculum={active.data} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
