import { useState, useMemo } from 'react';
import { Play, ChevronLeft, ChevronRight, Check, GraduationCap, BookOpen } from 'lucide-react';

// ─── Data ────────────────────────────────────────────────────────────────────

const COLD_CALLING = [
  {
    block: 'Mindset & Grundlage',
    color: '#7F77DD',
    bg: 'rgba(127,119,221,0.12)',
    dot: '#7F77DD',
    videos: [
      { id: 'ikn-tetNHZw', title: 'Angst vorm Cold Calling überwinden', duration: '~14 min', desc: 'Fear & Anxiety auflösen – der essenzielle Einstieg für jeden Cold Caller.' },
      { id: 'jc0WyiPuXLU', title: 'Das einzige Mindset-Video das du brauchst', duration: '~18 min', desc: 'Wie die besten Cold Caller über Ablehnung denken – .01% Mindset.' },
    ],
  },
  {
    block: 'Script & Opener',
    color: '#EF9F27',
    bg: 'rgba(239,159,39,0.12)',
    dot: '#EF9F27',
    videos: [
      { id: 'f7ys83DQXGg', title: 'Der einzige Opener den du brauchst (2024)', duration: '~12 min', desc: 'Pattern Interrupt und der perfekte erste Satz – System für 1+ Meeting pro Tag.' },
      { id: 'NdIPxKIPVc0', title: 'Die besten Opening Lines 2025', duration: '~20 min', desc: '8 Sales-Trainer zeigen ihre stärksten Opener im direkten Vergleich.' },
      { id: 'yZxc-JZTdgI', title: 'Das ultimative B2B Cold Call Script', duration: '~22 min', desc: 'Vollständiges Script von der Begrüßung bis zur Terminvereinbarung.' },
    ],
  },
  {
    block: 'Einwandbehandlung',
    color: '#E24B4A',
    bg: 'rgba(226,75,74,0.12)',
    dot: '#E24B4A',
    videos: [
      { id: '-m_pMr52b6M', title: 'Die 10 häufigsten Einwände & Antworten', duration: '~35 min', desc: 'Alle Standard-Einwände mit konkreten Antworten direkt aus der Praxis.' },
      { id: 'NtrC9DK_qE8', title: '3-Schritt-Framework für jeden Einwand', duration: '~40 min', desc: 'Vollständiger Einwand-Kurs – ein Framework das auf jeden Einwand passt.' },
      { id: '4Gwt4w4Ran4', title: '42 Min Einwand-Roleplays (Fortgeschritten)', duration: '~43 min', desc: 'Armand Farrokh, Jason Bay & Nick Cegelski in echten Live-Roleplays.' },
    ],
  },
  {
    block: 'Live Cold Calls',
    color: '#1D9E75',
    bg: 'rgba(29,158,117,0.12)',
    dot: '#1D9E75',
    videos: [
      { id: 'WDuflhD3JHQ', title: 'Live: Erfolgreicher Cold Call (2024)', duration: '~8 min', desc: 'Echter Anruf mit einem Sales Leader – Einwandbehandlung live beobachten.' },
      { id: '2vivv2HeiBU', title: 'Masterclass mit echten Live-Calls', duration: '~30 min', desc: 'Perfektes Script + Live-Demos: 1 von 3 Gesprächen endet im Termin.' },
      { id: 'DEt3IRqqUVs', title: '10 Live Calls von 6 verschiedenen Reps', duration: '~25 min', desc: 'Verschiedene Stile und Persönlichkeiten – was funktioniert wirklich?' },
    ],
  },
  {
    block: 'Termin buchen & Abschluss',
    color: '#378ADD',
    bg: 'rgba(55,138,221,0.12)',
    dot: '#378ADD',
    videos: [
      { id: 'dnOu6ysy7NU', title: 'Wie ich 3–5 Termine/Tag buche (B2B)', duration: '~18 min', desc: 'Konkretes System – Schritt für Schritt zur maximalen Buchungsrate.' },
      { id: 'VorAlE7eRIk', title: 'B2B Appointment Setting meistern', duration: '~20 min', desc: 'Eric Watkins erklärt seine genaue Methode für konsistente Termin-Pipeline.' },
    ],
  },
  {
    block: 'Masterclasses (Deep-Dive)',
    color: '#639922',
    bg: 'rgba(99,153,34,0.12)',
    dot: '#639922',
    videos: [
      { id: '17SF_CBE2Pg', title: '17-Min Cold Call Kurs für B2B Sales', duration: '~17 min', desc: 'Kompakter Gesamtkurs – alle wichtigen Strategien in einer Session.' },
      { id: 'aW8jAYnvqyI', title: '35 Min Expert Cold Calling Tips (B2B)', duration: '~35 min', desc: 'B2B & Software Sales – ehrliche Tipps von erfahrenen Praktikern.' },
      { id: 'A1dsYkSL7TM', title: '15+ Jahre No-BS Cold Calling Advice', duration: '~36 min', desc: 'Die direkteste und ehrlichste Cold Calling Zusammenfassung auf YouTube.' },
    ],
  },
];

const WEB_DESIGN = [
  {
    block: 'Warum eine Website entscheidend ist',
    color: '#378ADD',
    bg: 'rgba(55,138,221,0.12)',
    dot: '#378ADD',
    videos: [
      { id: 'SAGcWZVN5m0', title: 'Wie eine Website einem Unternehmen hilft', duration: '~10 min', desc: 'Web Designer müssen genau wissen, warum Unternehmen eine Website brauchen – perfekt für den Pitch.' },
      { id: 'p8fjj6Lyexs', title: '9 Gründe warum dein Business eine Website braucht', duration: '~12 min', desc: 'Konkrete Argumente für Kunden: Credibility, Erreichbarkeit, Wachstum.' },
      { id: 'NN7YEIlc-Oc', title: 'Warum eine Website das wichtigste digitale Asset ist', duration: '~8 min', desc: 'HubSpot erklärt kompakt: Website als zentraler Knotenpunkt des Marketings.' },
    ],
  },
  {
    block: 'Vertrauen & erste Eindrücke',
    color: '#E24B4A',
    bg: 'rgba(226,75,74,0.12)',
    dot: '#E24B4A',
    videos: [
      { id: 'tqYkYk5nEu8', title: 'Warum manche Websites vertrauenswürdig wirken', duration: '~14 min', desc: 'Die psychologischen Faktoren hinter Trust – und was schlechte Websites falsch machen.' },
      { id: 'sX-VHe9vyf0', title: '10 Website-Fehler die Credibility zerstören', duration: '~16 min', desc: 'Die häufigsten Design-Fehler und warum sie Kunden kosten.' },
      { id: 'TKuFLxX94qU', title: 'Kann eine schlechte Website eine Marke ruinieren?', duration: '~11 min', desc: 'Direkte Antwort: Ja. Und hier ist warum – perfektes Argument für den Erstkontakt.' },
    ],
  },
  {
    block: 'Web Design Grundlagen',
    color: '#7F77DD',
    bg: 'rgba(127,119,221,0.12)',
    dot: '#7F77DD',
    videos: [
      { id: 'q9nBRJo_Iss', title: 'Web Design Basics: 4 Prinzipien für Anfänger', duration: '~15 min', desc: 'Die vier Grundprinzipien guten Webdesigns – verständlich erklärt.' },
      { id: 'Kt6qND056bM', title: '10 Web Design Fehler die Besucher vertreiben', duration: '~18 min', desc: '88% der Besucher kommen nach schlechter UX nicht zurück – diese Fehler kosten Leads.' },
      { id: 'F4fbwKV9dBU', title: 'Alles über Web Design in 3 Minuten', duration: '~3 min', desc: 'Schneller animierter Überblick – ideal als Einstieg oder Refresher.' },
    ],
  },
  {
    block: 'Websites verkaufen & pitchen',
    color: '#639922',
    bg: 'rgba(99,153,34,0.12)',
    dot: '#639922',
    videos: [
      { id: 'r1wujxdXB4I', title: 'Web Design Services verkaufen: 5 Tipps', duration: '~18 min', desc: 'Wie man hochwertige Web-Design-Kunden gewinnt – mit klarer Positionierung.' },
      { id: 'W-_NGb2jchM', title: '30-Sekunden Sales Pitch für Websites', duration: '~8 min', desc: 'Was sagst du in 30 Sekunden am Telefon? Dieses Video liefert genau das.' },
      { id: 'foX8YCcR1OY', title: 'Websites verkaufen mit der Mini-Audit Methode', duration: '~14 min', desc: 'Einfache Technik: Live-Analyse der Kunden-Website als Türöffner für Premium-Projekte.' },
    ],
  },
];

// ─── Styles ──────────────────────────────────────────────────────────────────

const S = {
  page: {
    minHeight: '100%',
    padding: '28px 24px 64px',
    boxSizing: 'border-box',
    maxWidth: 1100,
    margin: '0 auto',
  },
  pageHeader: {
    marginBottom: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.28)',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    margin: '0 0 4px',
  },
  h1: {
    margin: '0 0 4px',
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: '-0.03em',
    color: 'rgba(255,255,255,0.92)',
  },
  subtitle: {
    margin: 0,
    fontSize: 13,
    color: 'rgba(255,255,255,0.32)',
  },
  // Tab switcher
  tabRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 20,
  },
  tab: (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '8px 16px',
    borderRadius: 10,
    border: `0.5px solid ${active ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)'}`,
    background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
    color: active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.38)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
  }),
  // Player container
  playerWrap: {
    display: 'flex',
    height: 600,
    overflow: 'hidden',
    border: '0.5px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    background: 'rgba(255,255,255,0.02)',
  },
  // Sidebar
  sidebar: {
    width: 258,
    flexShrink: 0,
    borderRight: '0.5px solid rgba(255,255,255,0.08)',
    overflowY: 'auto',
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(255,255,255,0.08) transparent',
  },
  blockHeader: (color) => ({
    padding: '10px 14px 6px',
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    position: 'sticky',
    top: 0,
    background: '#070C15',
    zIndex: 1,
  }),
  blockDot: (color) => ({
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: color,
    flexShrink: 0,
  }),
  blockName: {
    fontSize: 10,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  blockCount: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.2)',
    flexShrink: 0,
  },
  videoItem: (active, watched) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    padding: '8px 14px',
    cursor: 'pointer',
    background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
    borderLeft: `2px solid ${active ? 'rgba(255,255,255,0.25)' : 'transparent'}`,
    transition: 'background 0.12s',
  }),
  numCircle: (active, watched, blockColor) => ({
    width: 20,
    height: 20,
    borderRadius: '50%',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 9,
    fontWeight: 600,
    background: watched ? 'rgba(29,158,117,0.22)' : active ? 'rgba(255,255,255,0.1)' : 'transparent',
    border: `1px solid ${watched ? '#1D9E75' : active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'}`,
    color: watched ? '#1D9E75' : active ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)',
  }),
  videoItemTitle: (active) => ({
    fontSize: 12,
    fontWeight: active ? 500 : 400,
    color: active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.45)',
    lineHeight: 1.35,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  }),
  // Main area
  main: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  // Header bar
  playerHeader: {
    padding: '0 18px',
    height: 42,
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    borderBottom: '0.5px solid rgba(255,255,255,0.08)',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: 500,
    color: 'rgba(255,255,255,0.75)',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  progressTrack: {
    width: 120,
    height: 3,
    background: 'rgba(255,255,255,0.07)',
    borderRadius: 99,
    flexShrink: 0,
    overflow: 'hidden',
  },
  progressFill: (pct) => ({
    height: '100%',
    width: `${pct}%`,
    background: '#1D9E75',
    borderRadius: 99,
    transition: 'width 0.3s',
  }),
  counter: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    flexShrink: 0,
    fontVariantNumeric: 'tabular-nums',
  },
  // Video player
  playerArea: {
    position: 'relative',
    aspectRatio: '16/9',
    background: '#000',
    flexShrink: 0,
    cursor: 'pointer',
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(0deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 60%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 52,
    height: 52,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.15)',
    border: '1.5px solid rgba(255,255,255,0.4)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none',
    display: 'block',
  },
  // Video info
  videoInfo: {
    flex: 1,
    minHeight: 0,
    padding: '14px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    overflow: 'hidden',
  },
  chipRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  chip: (color, bg) => ({
    fontSize: 10,
    fontWeight: 600,
    color: color,
    background: bg,
    border: `0.5px solid ${color}44`,
    padding: '2px 8px',
    borderRadius: 99,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }),
  duration: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.28)',
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: 500,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 1.4,
    margin: 0,
  },
  videoDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.38)',
    lineHeight: 1.5,
    margin: 0,
  },
  navRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 'auto',
  },
  navBtn: (disabled) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 12px',
    borderRadius: 8,
    border: '0.5px solid rgba(255,255,255,0.1)',
    background: 'transparent',
    color: disabled ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: 500,
    cursor: disabled ? 'default' : 'pointer',
    transition: 'all 0.12s',
  }),
  watchedBtn: (isWatched) => ({
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    borderRadius: 8,
    border: `0.5px solid ${isWatched ? '#1D9E75' : 'rgba(255,255,255,0.1)'}`,
    background: isWatched ? 'rgba(29,158,117,0.12)' : 'transparent',
    color: isWatched ? '#1D9E75' : 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
  }),
};

// ─── CurriculumPlayer ────────────────────────────────────────────────────────

function CurriculumPlayer({ curriculum, title }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [watched, setWatched] = useState(new Set());
  const [playerActive, setPlayerActive] = useState(false);

  // Flatten all videos with block info
  const flatVideos = useMemo(() => {
    const list = [];
    curriculum.forEach((block) => {
      block.videos.forEach((v) => {
        list.push({ ...v, block: block.block, color: block.color, bg: block.bg, dot: block.dot });
      });
    });
    return list;
  }, [curriculum]);

  const total = flatVideos.length;
  const watchedCount = watched.size;
  const progressPct = total ? Math.round((watchedCount / total) * 100) : 0;

  const current = flatVideos[currentIndex];

  const goTo = (idx) => {
    if (idx < 0 || idx >= total) return;
    setCurrentIndex(idx);
    setPlayerActive(false);
  };

  const toggleWatched = () => {
    setWatched((prev) => {
      const next = new Set(prev);
      next.has(currentIndex) ? next.delete(currentIndex) : next.add(currentIndex);
      return next;
    });
  };

  // Build block list with running index offset
  let runningIdx = 0;
  const blocks = curriculum.map((block) => {
    const start = runningIdx;
    const items = block.videos.map((v, i) => ({ ...v, flatIdx: start + i }));
    runningIdx += block.videos.length;
    const doneCount = items.filter((v) => watched.has(v.flatIdx)).length;
    return { ...block, items, doneCount };
  });

  return (
    <div style={S.playerWrap}>
      {/* Sidebar */}
      <div style={S.sidebar}>
        {blocks.map((block) => (
          <div key={block.block}>
            <div style={S.blockHeader(block.color)}>
              <div style={S.blockDot(block.dot)} />
              <span style={S.blockName}>{block.block}</span>
              <span style={S.blockCount}>{block.doneCount}/{block.items.length}</span>
            </div>
            {block.items.map((v, localIdx) => {
              const isActive = v.flatIdx === currentIndex;
              const isWatched = watched.has(v.flatIdx);
              return (
                <div
                  key={v.id}
                  style={S.videoItem(isActive, isWatched)}
                  onClick={() => goTo(v.flatIdx)}
                >
                  <div style={S.numCircle(isActive, isWatched, block.color)}>
                    {isWatched ? <Check size={9} strokeWidth={3} /> : localIdx + 1}
                  </div>
                  <span style={S.videoItemTitle(isActive)}>{v.title}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Main */}
      <div style={S.main}>
        {/* Header */}
        <div style={S.playerHeader}>
          <span style={S.headerTitle}>{title}</span>
          <div style={S.progressTrack}>
            <div style={S.progressFill(progressPct)} />
          </div>
          <span style={S.counter}>{watchedCount} / {total}</span>
        </div>

        {/* Player */}
        <div
          style={S.playerArea}
          onClick={() => !playerActive && setPlayerActive(true)}
        >
          {playerActive ? (
            <iframe
              style={S.iframe}
              src={`https://www.youtube.com/embed/${current.id}?autoplay=1&rel=0`}
              title={current.title}
              allow="autoplay; encrypted-media; accelerometer; clipboard-write; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <>
              <img
                src={`https://img.youtube.com/vi/${current.id}/hqdefault.jpg`}
                alt={current.title}
                style={S.thumbnail}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <div style={S.overlay}>
                <div style={S.playBtn}>
                  <Play size={20} color="#fff" fill="#fff" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Video info */}
        <div style={S.videoInfo}>
          <div style={S.chipRow}>
            <span style={S.chip(current.color, current.bg)}>{current.block}</span>
            <span style={S.duration}>{current.duration}</span>
          </div>
          <p style={S.videoTitle}>{current.title}</p>
          <p style={S.videoDesc}>{current.desc}</p>
          <div style={S.navRow}>
            <button
              style={S.navBtn(currentIndex === 0)}
              disabled={currentIndex === 0}
              onClick={() => goTo(currentIndex - 1)}
            >
              <ChevronLeft size={14} />
              Zurück
            </button>
            <button
              style={S.navBtn(currentIndex === total - 1)}
              disabled={currentIndex === total - 1}
              onClick={() => goTo(currentIndex + 1)}
            >
              Weiter
              <ChevronRight size={14} />
            </button>
            <button style={S.watchedBtn(watched.has(currentIndex))} onClick={toggleWatched}>
              {watched.has(currentIndex) ? <><Check size={13} strokeWidth={2.5} /> Als gesehen markiert</> : 'Als gesehen markieren ✓'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Training Page ───────────────────────────────────────────────────────────

const CURRICULA = [
  { key: 'cold-calling', label: 'Cold Calling Training', icon: <GraduationCap size={14} />, data: COLD_CALLING },
  { key: 'web-design',   label: 'Web Design für Caller',  icon: <BookOpen size={14} />,     data: WEB_DESIGN   },
];

export default function Training() {
  const [activeCurriculum, setActiveCurriculum] = useState('cold-calling');
  const active = CURRICULA.find((c) => c.key === activeCurriculum);

  return (
    <div style={S.page}>
      <div style={S.pageHeader}>
        <p style={S.label}>Weiterbildung</p>
        <h1 style={S.h1}>Training</h1>
        <p style={S.subtitle}>Lernprogramme für Cold Caller – Video für Video zum Profi</p>
      </div>

      <div style={S.tabRow}>
        {CURRICULA.map((c) => (
          <button
            key={c.key}
            style={S.tab(activeCurriculum === c.key)}
            onClick={() => setActiveCurriculum(c.key)}
          >
            {c.icon}
            {c.label}
          </button>
        ))}
      </div>

      <CurriculumPlayer
        key={activeCurriculum}
        curriculum={active.data}
        title={active.label}
      />
    </div>
  );
}
