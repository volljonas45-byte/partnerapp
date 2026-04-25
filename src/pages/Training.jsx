import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, CheckCircle2, ChevronLeft, ChevronRight, Phone, BookOpen, ArrowLeft } from 'lucide-react';

// ─── Data ─────────────────────────────────────────────────────────────────────
const CURRICULA = [
  {
    key: 'cold-calling',
    title: 'Cold Calling Training',
    subtitle: '6 Module · 16 Lektionen',
    icon: Phone,
    accentColor: '#3B82F6',
    blocks: [
      { title: 'Mindset & Grundlage', color: '#818CF8', videos: [
        { id: 'ikn-tetNHZw', title: 'Angst vorm Cold Calling überwinden',        duration: '14 min', desc: 'Fear & Anxiety auflösen – der essenzielle Einstieg für jeden Cold Caller.' },
        { id: 'jc0WyiPuXLU', title: 'Das einzige Mindset-Video das du brauchst', duration: '18 min', desc: 'Wie die besten Cold Caller über Ablehnung denken – .01% Mindset.' },
      ]},
      { title: 'Script & Opener', color: '#FBBF24', videos: [
        { id: 'f7ys83DQXGg', title: 'Der einzige Opener den du brauchst (2024)',  duration: '12 min', desc: 'Pattern Interrupt und der perfekte erste Satz – System für 1+ Meeting pro Tag.' },
        { id: 'NdIPxKIPVc0', title: 'Die besten Opening Lines 2025',              duration: '20 min', desc: '8 Sales-Trainer zeigen ihre stärksten Opener im direkten Vergleich.' },
        { id: 'yZxc-JZTdgI', title: 'Das ultimative B2B Cold Call Script',        duration: '22 min', desc: 'Vollständiges Script von der Begrüßung bis zur Terminvereinbarung.' },
      ]},
      { title: 'Einwandbehandlung', color: '#F87171', videos: [
        { id: '-m_pMr52b6M', title: 'Die 10 häufigsten Einwände & Antworten',     duration: '35 min', desc: 'Alle Standard-Einwände mit konkreten Antworten direkt aus der Praxis.' },
        { id: 'NtrC9DK_qE8', title: '3-Schritt-Framework für jeden Einwand',      duration: '40 min', desc: 'Vollständiger Einwand-Kurs – ein Framework das auf jeden Einwand passt.' },
        { id: '4Gwt4w4Ran4', title: '42 Min Einwand-Roleplays (Fortgeschritten)', duration: '43 min', desc: 'Armand Farrokh, Jason Bay & Nick Cegelski in echten Live-Roleplays.' },
      ]},
      { title: 'Live Cold Calls', color: '#34D399', videos: [
        { id: 'WDuflhD3JHQ', title: 'Live: Erfolgreicher Cold Call (2024)',        duration: '8 min',  desc: 'Echter Anruf mit einem Sales Leader – Einwandbehandlung live beobachten.' },
        { id: '2vivv2HeiBU', title: 'Masterclass mit echten Live-Calls',           duration: '30 min', desc: 'Perfektes Script + Live-Demos: 1 von 3 Gesprächen endet im Termin.' },
        { id: 'DEt3IRqqUVs', title: '10 Live Calls von 6 verschiedenen Reps',      duration: '25 min', desc: 'Verschiedene Stile und Persönlichkeiten – was funktioniert wirklich?' },
      ]},
      { title: 'Termin buchen & Abschluss', color: '#38BDF8', videos: [
        { id: 'dnOu6ysy7NU', title: 'Wie ich 3–5 Termine/Tag buche (B2B)',         duration: '18 min', desc: 'Konkretes System – Schritt für Schritt zur maximalen Buchungsrate.' },
        { id: 'VorAlE7eRIk', title: 'B2B Appointment Setting meistern',            duration: '20 min', desc: 'Eric Watkins erklärt seine genaue Methode für konsistente Termin-Pipeline.' },
      ]},
      { title: 'Masterclasses', color: '#A3E635', videos: [
        { id: '17SF_CBE2Pg', title: '17-Min Cold Call Kurs für B2B Sales',         duration: '17 min', desc: 'Kompakter Gesamtkurs – alle wichtigen Strategien in einer Session.' },
        { id: 'aW8jAYnvqyI', title: '35 Min Expert Cold Calling Tips (B2B)',       duration: '35 min', desc: 'B2B & Software Sales – ehrliche Tipps von erfahrenen Praktikern.' },
        { id: 'A1dsYkSL7TM', title: '15+ Jahre No-BS Cold Calling Advice',         duration: '36 min', desc: 'Die direkteste und ehrlichste Cold Calling Zusammenfassung auf YouTube.' },
      ]},
    ],
  },
  {
    key: 'web-design',
    title: 'Web Design für Caller',
    subtitle: '4 Module · 12 Lektionen',
    icon: BookOpen,
    accentColor: '#818CF8',
    blocks: [
      { title: 'Warum eine Website entscheidend ist', color: '#38BDF8', videos: [
        { id: 'SAGcWZVN5m0', title: 'Wie eine Website einem Unternehmen hilft',            duration: '10 min', desc: 'Web Designer müssen genau wissen, warum Unternehmen eine Website brauchen – perfekt für den Pitch.' },
        { id: 'p8fjj6Lyexs', title: '9 Gründe warum dein Business eine Website braucht',  duration: '12 min', desc: 'Konkrete Argumente für Kunden: Credibility, Erreichbarkeit, Wachstum.' },
        { id: 'NN7YEIlc-Oc', title: 'Warum eine Website das wichtigste digitale Asset ist',duration: '8 min',  desc: 'HubSpot erklärt kompakt: Website als zentraler Knotenpunkt des Marketings.' },
      ]},
      { title: 'Vertrauen & erste Eindrücke', color: '#F87171', videos: [
        { id: 'tqYkYk5nEu8', title: 'Warum manche Websites vertrauenswürdig wirken',      duration: '14 min', desc: 'Die psychologischen Faktoren hinter Trust – und was schlechte Websites falsch machen.' },
        { id: 'sX-VHe9vyf0', title: '10 Website-Fehler die Credibility zerstören',        duration: '16 min', desc: 'Die häufigsten Design-Fehler und warum sie Kunden kosten.' },
        { id: 'TKuFLxX94qU', title: 'Kann eine schlechte Website eine Marke ruinieren?',  duration: '11 min', desc: 'Direkte Antwort: Ja. Und hier ist warum – perfektes Argument für den Erstkontakt.' },
      ]},
      { title: 'Web Design Grundlagen', color: '#818CF8', videos: [
        { id: 'q9nBRJo_Iss', title: 'Web Design Basics: 4 Prinzipien für Anfänger',       duration: '15 min', desc: 'Die vier Grundprinzipien guten Webdesigns – verständlich erklärt.' },
        { id: 'Kt6qND056bM', title: '10 Web Design Fehler die Besucher vertreiben',       duration: '18 min', desc: '88% der Besucher kommen nach schlechter UX nicht zurück – diese Fehler kosten Leads.' },
        { id: 'F4fbwKV9dBU', title: 'Alles über Web Design in 3 Minuten',                 duration: '3 min',  desc: 'Schneller animierter Überblick – ideal als Einstieg oder Refresher.' },
      ]},
      { title: 'Websites verkaufen & pitchen', color: '#A3E635', videos: [
        { id: 'r1wujxdXB4I', title: 'Web Design Services verkaufen: 5 Tipps',             duration: '18 min', desc: 'Wie man hochwertige Web-Design-Kunden gewinnt – mit klarer Positionierung.' },
        { id: 'W-_NGb2jchM', title: '30-Sekunden Sales Pitch für Websites',               duration: '8 min',  desc: 'Was sagst du in 30 Sekunden am Telefon? Dieses Video liefert genau das.' },
        { id: 'foX8YCcR1OY', title: 'Websites verkaufen mit der Mini-Audit Methode',      duration: '14 min', desc: 'Einfache Technik: Live-Analyse der Kunden-Website als Türöffner für Premium-Projekte.' },
      ]},
    ],
  },
];

// ─── Course Overview ───────────────────────────────────────────────────────────
function CourseOverview({ onSelect }) {
  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22 }}
    >
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.14em', margin: '0 0 6px' }}>Weiterbildung</p>
        <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: '#F2F2F7' }}>Training</h1>
        <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.38)' }}>Wähle ein Programm und starte mit dem Training</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 680 }}>
        {CURRICULA.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.28 }}
              onClick={() => onSelect(c.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 20,
                padding: '20px 24px',
                background: '#0D1525',
                border: '0.5px solid rgba(255,255,255,0.07)',
                borderRadius: 14,
                cursor: 'pointer',
                transition: 'border-color 0.15s, background 0.15s',
              }}
              whileHover={{ borderColor: `${c.accentColor}44`, backgroundColor: '#111d30' }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                background: `${c.accentColor}18`,
                border: `1px solid ${c.accentColor}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={20} color={c.accentColor} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#F2F2F7', marginBottom: 3 }}>{c.title}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)' }}>{c.subtitle}</div>
              </div>
              <div style={{
                display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 320,
              }}>
                {c.blocks.map(b => (
                  <span key={b.title} style={{
                    fontSize: 10, fontWeight: 600,
                    color: b.color, background: `${b.color}15`,
                    border: `1px solid ${b.color}28`,
                    padding: '3px 9px', borderRadius: 99,
                    whiteSpace: 'nowrap',
                  }}>
                    {b.title}
                  </span>
                ))}
              </div>
              <ChevronRight size={16} color="rgba(255,255,255,0.25)" style={{ flexShrink: 0 }} />
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Module Overview ───────────────────────────────────────────────────────────
function ModuleOverview({ curriculum, watched, onSelectModule, onBack }) {
  const totalVideos = curriculum.blocks.reduce((s, b) => s + b.videos.length, 0);
  const doneVideos  = curriculum.blocks.reduce((s, b, bi) => {
    let offset = curriculum.blocks.slice(0, bi).reduce((x, bb) => x + bb.videos.length, 0);
    return s + b.videos.filter((_, vi) => watched.has(offset + vi)).length;
  }, 0);
  const pct = totalVideos ? Math.round((doneVideos / totalVideos) * 100) : 0;
  const Icon = curriculum.icon;

  let globalIdx = 0;

  return (
    <motion.div
      key="modules"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22 }}
    >
      {/* Back + Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <button
          onClick={onBack}
          style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: '#0D1525', border: '0.5px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
          }}
        >
          <ArrowLeft size={15} />
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 3px' }}>Weiterbildung</p>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#F2F2F7' }}>{curriculum.title}</h1>
        </div>
        {/* Progress */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: pct === 100 ? '#34D399' : '#F2F2F7', marginBottom: 5 }}>
            {doneVideos} / {totalVideos} Lektionen
          </div>
          <div style={{ width: 160, height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
            <motion.div
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{ height: '100%', background: pct === 100 ? '#34D399' : curriculum.accentColor, borderRadius: 99 }}
            />
          </div>
        </div>
      </div>

      {/* Modules */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 720 }}>
        {curriculum.blocks.map((block, bi) => {
          const blockStart = globalIdx;
          const blockDone  = block.videos.filter((_, vi) => watched.has(blockStart + vi)).length;
          globalIdx += block.videos.length;
          const allDone = blockDone === block.videos.length;

          return (
            <motion.div
              key={block.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: bi * 0.05, duration: 0.25 }}
              onClick={() => onSelectModule(bi)}
              style={{
                display: 'flex', alignItems: 'center', gap: 18,
                padding: '16px 20px',
                background: '#0D1525',
                border: '0.5px solid rgba(255,255,255,0.07)',
                borderRadius: 12, cursor: 'pointer',
                transition: 'border-color 0.15s, background 0.15s',
              }}
              whileHover={{ borderColor: `${block.color}44`, backgroundColor: '#111d30' }}
            >
              {/* Module number / done indicator */}
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: allDone ? 'rgba(52,211,153,0.12)' : `${block.color}15`,
                border: `1px solid ${allDone ? '#34D39944' : block.color + '30'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700,
                color: allDone ? '#34D399' : block.color,
              }}>
                {allDone ? <CheckCircle2 size={17} strokeWidth={2} /> : bi + 1}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#F2F2F7', marginBottom: 3 }}>{block.title}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                  {block.videos.length} {block.videos.length === 1 ? 'Lektion' : 'Lektionen'}
                </div>
              </div>

              {/* Mini progress */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: allDone ? '#34D399' : 'rgba(255,255,255,0.35)', fontWeight: allDone ? 600 : 400 }}>
                  {blockDone}/{block.videos.length}
                </span>
                <ChevronRight size={15} color="rgba(255,255,255,0.22)" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Lesson Player ─────────────────────────────────────────────────────────────
function LessonPlayer({ curriculum, blockIndex, watched, onToggleWatched, onBack }) {
  const block = curriculum.blocks[blockIndex];

  // flat offset for this block
  const blockOffset = useMemo(
    () => curriculum.blocks.slice(0, blockIndex).reduce((s, b) => s + b.videos.length, 0),
    [curriculum, blockIndex]
  );

  const [localIndex, setLocalIndex] = useState(0);
  const [playerActive, setPlayerActive] = useState(false);

  const total   = block.videos.length;
  const current = block.videos[localIndex];
  const flatIdx = blockOffset + localIndex;
  const isWatched = watched.has(flatIdx);

  const goTo = (idx) => {
    if (idx < 0 || idx >= total) return;
    setLocalIndex(idx);
    setPlayerActive(false);
  };

  return (
    <motion.div
      key="player"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22 }}
    >
      {/* Back + breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <button
          onClick={onBack}
          style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: '#0D1525', border: '0.5px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
          }}
        >
          <ArrowLeft size={15} />
        </button>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>
            {curriculum.title} · <span style={{ color: block.color }}>{block.title}</span>
          </p>
        </div>
      </div>

      {/* Player layout */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

        {/* Left: Video + info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Video */}
          <AnimatePresence mode="wait">
            <motion.div
              key={localIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => !playerActive && setPlayerActive(true)}
              style={{
                position: 'relative', borderRadius: 14, overflow: 'hidden',
                background: '#000', cursor: playerActive ? 'default' : 'pointer',
                aspectRatio: '16/9',
                border: '0.5px solid rgba(255,255,255,0.07)',
                marginBottom: 18,
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
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(7,12,21,0.85) 0%, transparent 55%)' }} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <motion.div
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        width: 62, height: 62, borderRadius: '50%',
                        background: curriculum.accentColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: `0 0 0 10px ${curriculum.accentColor}22, 0 16px 40px ${curriculum.accentColor}44`,
                      }}
                    >
                      <Play size={24} color="#fff" fill="#fff" style={{ marginLeft: 3 }} />
                    </motion.div>
                  </div>
                  {isWatched && (
                    <div style={{
                      position: 'absolute', top: 12, left: 12,
                      display: 'flex', alignItems: 'center', gap: 5,
                      fontSize: 11, fontWeight: 600, color: '#34D399',
                      background: 'rgba(52,211,153,0.12)', backdropFilter: 'blur(6px)',
                      padding: '4px 10px', borderRadius: 99,
                      border: '0.5px solid rgba(52,211,153,0.3)',
                    }}>
                      <CheckCircle2 size={11} /> Abgeschlossen
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Info below player */}
          <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: '#F2F2F7', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
            {current.title}
          </h2>
          <p style={{ margin: '0 0 18px', fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
            {current.desc}
          </p>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              disabled={localIndex === 0}
              onClick={() => goTo(localIndex - 1)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '8px 14px', borderRadius: 9,
                border: '0.5px solid rgba(255,255,255,0.09)',
                background: 'transparent',
                color: localIndex === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.55)',
                fontSize: 12, fontWeight: 500,
                cursor: localIndex === 0 ? 'default' : 'pointer',
              }}
            >
              <ChevronLeft size={14} /> Zurück
            </button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => onToggleWatched(flatIdx)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 18px', borderRadius: 9,
                border: `0.5px solid ${isWatched ? '#34D399' : 'rgba(255,255,255,0.09)'}`,
                background: isWatched ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.04)',
                color: isWatched ? '#34D399' : 'rgba(255,255,255,0.55)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.18s', whiteSpace: 'nowrap',
              }}
            >
              <CheckCircle2 size={13} />
              {isWatched ? 'Abgeschlossen' : 'Als abgeschlossen markieren'}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={localIndex === total - 1}
              onClick={() => goTo(localIndex + 1)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '8px 16px', borderRadius: 9,
                border: `0.5px solid ${localIndex === total - 1 ? 'rgba(255,255,255,0.07)' : curriculum.accentColor}`,
                background: localIndex === total - 1 ? 'transparent' : `${curriculum.accentColor}18`,
                color: localIndex === total - 1 ? 'rgba(255,255,255,0.15)' : curriculum.accentColor,
                fontSize: 12, fontWeight: 600,
                cursor: localIndex === total - 1 ? 'default' : 'pointer',
              }}
            >
              Nächste Lektion <ChevronRight size={14} />
            </motion.button>
          </div>
        </div>

        {/* Right: Lesson list */}
        <div style={{
          width: 300, flexShrink: 0,
          background: '#0D1525',
          border: '0.5px solid rgba(255,255,255,0.07)',
          borderRadius: 14, overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>
              {block.title}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
              {block.videos.filter((_, vi) => watched.has(blockOffset + vi)).length} / {total} abgeschlossen
            </div>
          </div>
          <div>
            {block.videos.map((v, vi) => {
              const fi = blockOffset + vi;
              const isCurrent = vi === localIndex;
              const isDone    = watched.has(fi);
              return (
                <div
                  key={v.id}
                  onClick={() => goTo(vi)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px',
                    borderBottom: vi < total - 1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none',
                    borderLeft: `2px solid ${isCurrent ? curriculum.accentColor : 'transparent'}`,
                    background: isCurrent ? `${curriculum.accentColor}0D` : 'transparent',
                    cursor: 'pointer', transition: 'background 0.12s',
                  }}
                >
                  {/* Thumbnail */}
                  <div style={{ width: 56, height: 36, borderRadius: 6, overflow: 'hidden', flexShrink: 0, position: 'relative', background: '#000' }}>
                    <img
                      src={`https://img.youtube.com/vi/${v.id}/default.jpg`}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: isDone ? 0.45 : 0.85 }}
                    />
                    {isDone && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(52,211,153,0.25)' }}>
                        <CheckCircle2 size={14} color="#34D399" strokeWidth={2.5} />
                      </div>
                    )}
                    {isCurrent && !isDone && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }}>
                        <Play size={12} color="#fff" fill="#fff" />
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: isCurrent ? 600 : 400, lineHeight: 1.35,
                      color: isCurrent ? '#F2F2F7' : isDone ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.7)',
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {v.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>{v.duration}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </motion.div>
  );
}

// ─── Training (root) ──────────────────────────────────────────────────────────
export default function Training() {
  const [view, setView]               = useState('overview');   // 'overview' | 'modules' | 'player'
  const [selectedCurriculum, setSC]   = useState(null);
  const [selectedBlock, setSB]        = useState(null);
  const [watched, setWatched]         = useState(new Set());

  const curriculum = CURRICULA.find(c => c.key === selectedCurriculum);

  const toggleWatched = (idx) => {
    setWatched(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  return (
    <div style={{ minHeight: '100%', padding: '28px 28px 64px', boxSizing: 'border-box' }}>
      <AnimatePresence mode="wait">
        {view === 'overview' && (
          <CourseOverview
            key="overview"
            onSelect={(key) => { setSC(key); setView('modules'); }}
          />
        )}
        {view === 'modules' && curriculum && (
          <ModuleOverview
            key="modules"
            curriculum={curriculum}
            watched={watched}
            onSelectModule={(bi) => { setSB(bi); setView('player'); }}
            onBack={() => setView('overview')}
          />
        )}
        {view === 'player' && curriculum && selectedBlock !== null && (
          <LessonPlayer
            key="player"
            curriculum={curriculum}
            blockIndex={selectedBlock}
            watched={watched}
            onToggleWatched={toggleWatched}
            onBack={() => setView('modules')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
