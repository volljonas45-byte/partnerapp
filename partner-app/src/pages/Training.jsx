import { useState, useMemo } from 'react';
import { Play, ChevronLeft, ChevronRight, CheckCircle2, BookOpen, Phone } from 'lucide-react';

// ─── App design tokens (match Sidebar/Dashboard) ──────────────────────────────
const D = {
  bg:       '#070C15',
  card:     '#0D1525',
  card2:    '#111827',
  border:   'rgba(255,255,255,0.07)',
  border2:  'rgba(255,255,255,0.04)',
  text:     '#F2F2F7',
  text2:    'rgba(255,255,255,0.55)',
  text3:    'rgba(255,255,255,0.28)',
  accent:   '#3B82F6',
  accentL:  'rgba(59,130,246,0.12)',
  green:    '#34D399',
  greenL:   'rgba(52,211,153,0.1)',
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const COLD_CALLING = [
  {
    block: 'Mindset & Grundlage', color: '#818CF8',
    videos: [
      { id: 'ikn-tetNHZw', title: 'Angst vorm Cold Calling überwinden', duration: '14 min', desc: 'Fear & Anxiety auflösen – der essenzielle Einstieg für jeden Cold Caller.' },
      { id: 'jc0WyiPuXLU', title: 'Das einzige Mindset-Video das du brauchst', duration: '18 min', desc: 'Wie die besten Cold Caller über Ablehnung denken – .01% Mindset.' },
    ],
  },
  {
    block: 'Script & Opener', color: '#FBBF24',
    videos: [
      { id: 'f7ys83DQXGg', title: 'Der einzige Opener den du brauchst (2024)', duration: '12 min', desc: 'Pattern Interrupt und der perfekte erste Satz – System für 1+ Meeting pro Tag.' },
      { id: 'NdIPxKIPVc0', title: 'Die besten Opening Lines 2025', duration: '20 min', desc: '8 Sales-Trainer zeigen ihre stärksten Opener im direkten Vergleich.' },
      { id: 'yZxc-JZTdgI', title: 'Das ultimative B2B Cold Call Script', duration: '22 min', desc: 'Vollständiges Script von der Begrüßung bis zur Terminvereinbarung.' },
    ],
  },
  {
    block: 'Einwandbehandlung', color: '#F87171',
    videos: [
      { id: '-m_pMr52b6M', title: 'Die 10 häufigsten Einwände & Antworten', duration: '35 min', desc: 'Alle Standard-Einwände mit konkreten Antworten direkt aus der Praxis.' },
      { id: 'NtrC9DK_qE8', title: '3-Schritt-Framework für jeden Einwand', duration: '40 min', desc: 'Vollständiger Einwand-Kurs – ein Framework das auf jeden Einwand passt.' },
      { id: '4Gwt4w4Ran4', title: '42 Min Einwand-Roleplays (Fortgeschritten)', duration: '43 min', desc: 'Armand Farrokh, Jason Bay & Nick Cegelski in echten Live-Roleplays.' },
    ],
  },
  {
    block: 'Live Cold Calls', color: '#34D399',
    videos: [
      { id: 'WDuflhD3JHQ', title: 'Live: Erfolgreicher Cold Call (2024)', duration: '8 min', desc: 'Echter Anruf mit einem Sales Leader – Einwandbehandlung live beobachten.' },
      { id: '2vivv2HeiBU', title: 'Masterclass mit echten Live-Calls', duration: '30 min', desc: 'Perfektes Script + Live-Demos: 1 von 3 Gesprächen endet im Termin.' },
      { id: 'DEt3IRqqUVs', title: '10 Live Calls von 6 verschiedenen Reps', duration: '25 min', desc: 'Verschiedene Stile und Persönlichkeiten – was funktioniert wirklich?' },
    ],
  },
  {
    block: 'Termin buchen & Abschluss', color: '#38BDF8',
    videos: [
      { id: 'dnOu6ysy7NU', title: 'Wie ich 3–5 Termine/Tag buche (B2B)', duration: '18 min', desc: 'Konkretes System – Schritt für Schritt zur maximalen Buchungsrate.' },
      { id: 'VorAlE7eRIk', title: 'B2B Appointment Setting meistern', duration: '20 min', desc: 'Eric Watkins erklärt seine genaue Methode für konsistente Termin-Pipeline.' },
    ],
  },
  {
    block: 'Masterclasses (Deep-Dive)', color: '#A3E635',
    videos: [
      { id: '17SF_CBE2Pg', title: '17-Min Cold Call Kurs für B2B Sales', duration: '17 min', desc: 'Kompakter Gesamtkurs – alle wichtigen Strategien in einer Session.' },
      { id: 'aW8jAYnvqyI', title: '35 Min Expert Cold Calling Tips (B2B)', duration: '35 min', desc: 'B2B & Software Sales – ehrliche Tipps von erfahrenen Praktikern.' },
      { id: 'A1dsYkSL7TM', title: '15+ Jahre No-BS Cold Calling Advice', duration: '36 min', desc: 'Die direkteste und ehrlichste Cold Calling Zusammenfassung auf YouTube.' },
    ],
  },
];

const WEB_DESIGN = [
  {
    block: 'Warum eine Website entscheidend ist', color: '#38BDF8',
    videos: [
      { id: 'SAGcWZVN5m0', title: 'Wie eine Website einem Unternehmen hilft', duration: '10 min', desc: 'Web Designer müssen genau wissen, warum Unternehmen eine Website brauchen – perfekt für den Pitch.' },
      { id: 'p8fjj6Lyexs', title: '9 Gründe warum dein Business eine Website braucht', duration: '12 min', desc: 'Konkrete Argumente für Kunden: Credibility, Erreichbarkeit, Wachstum.' },
      { id: 'NN7YEIlc-Oc', title: 'Warum eine Website das wichtigste digitale Asset ist', duration: '8 min', desc: 'HubSpot erklärt kompakt: Website als zentraler Knotenpunkt des Marketings.' },
    ],
  },
  {
    block: 'Vertrauen & erste Eindrücke', color: '#F87171',
    videos: [
      { id: 'tqYkYk5nEu8', title: 'Warum manche Websites vertrauenswürdig wirken', duration: '14 min', desc: 'Die psychologischen Faktoren hinter Trust – und was schlechte Websites falsch machen.' },
      { id: 'sX-VHe9vyf0', title: '10 Website-Fehler die Credibility zerstören', duration: '16 min', desc: 'Die häufigsten Design-Fehler und warum sie Kunden kosten.' },
      { id: 'TKuFLxX94qU', title: 'Kann eine schlechte Website eine Marke ruinieren?', duration: '11 min', desc: 'Direkte Antwort: Ja. Und hier ist warum – perfektes Argument für den Erstkontakt.' },
    ],
  },
  {
    block: 'Web Design Grundlagen', color: '#818CF8',
    videos: [
      { id: 'q9nBRJo_Iss', title: 'Web Design Basics: 4 Prinzipien für Anfänger', duration: '15 min', desc: 'Die vier Grundprinzipien guten Webdesigns – verständlich erklärt.' },
      { id: 'Kt6qND056bM', title: '10 Web Design Fehler die Besucher vertreiben', duration: '18 min', desc: '88% der Besucher kommen nach schlechter UX nicht zurück – diese Fehler kosten Leads.' },
      { id: 'F4fbwKV9dBU', title: 'Alles über Web Design in 3 Minuten', duration: '3 min', desc: 'Schneller animierter Überblick – ideal als Einstieg oder Refresher.' },
    ],
  },
  {
    block: 'Websites verkaufen & pitchen', color: '#A3E635',
    videos: [
      { id: 'r1wujxdXB4I', title: 'Web Design Services verkaufen: 5 Tipps', duration: '18 min', desc: 'Wie man hochwertige Web-Design-Kunden gewinnt – mit klarer Positionierung.' },
      { id: 'W-_NGb2jchM', title: '30-Sekunden Sales Pitch für Websites', duration: '8 min', desc: 'Was sagst du in 30 Sekunden am Telefon? Dieses Video liefert genau das.' },
      { id: 'foX8YCcR1OY', title: 'Websites verkaufen mit der Mini-Audit Methode', duration: '14 min', desc: 'Einfache Technik: Live-Analyse der Kunden-Website als Türöffner für Premium-Projekte.' },
    ],
  },
];

// ─── CurriculumPlayer ──────────────────────────────────────────────────────────

function CurriculumPlayer({ curriculum }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [watched, setWatched] = useState(new Set());
  const [playerActive, setPlayerActive] = useState(false);

  const flatVideos = useMemo(() => {
    const list = [];
    curriculum.forEach((block) =>
      block.videos.forEach((v) => list.push({ ...v, block: block.block, color: block.color }))
    );
    return list;
  }, [curriculum]);

  const total = flatVideos.length;
  const watchedCount = watched.size;
  const progressPct = total ? (watchedCount / total) * 100 : 0;
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

  let runningIdx = 0;
  const blocks = curriculum.map((block) => {
    const start = runningIdx;
    const items = block.videos.map((v, i) => ({ ...v, flatIdx: start + i }));
    runningIdx += block.videos.length;
    return { ...block, items };
  });

  return (
    <div style={{ display: 'flex', gap: 16, height: 596 }}>

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <div style={{
        width: 272,
        flexShrink: 0,
        background: D.card,
        border: `0.5px solid ${D.border}`,
        borderRadius: 14,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Progress header */}
        <div style={{
          padding: '12px 16px',
          borderBottom: `0.5px solid ${D.border}`,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: D.text3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Fortschritt
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 72, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progressPct}%`, background: D.green, borderRadius: 99, transition: 'width 0.4s' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: D.green, minWidth: 32 }}>
              {watchedCount}/{total}
            </span>
          </div>
        </div>

        {/* Video list */}
        <div style={{ overflowY: 'auto', flex: 1, scrollbarWidth: 'thin', scrollbarColor: `${D.border} transparent` }}>
          {blocks.map((block) => (
            <div key={block.block}>
              {/* Block label */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 16px 5px',
                position: 'sticky', top: 0,
                background: D.card, zIndex: 1,
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: block.color, flexShrink: 0 }} />
                <span style={{ fontSize: 9, fontWeight: 700, color: D.text3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {block.block}
                </span>
              </div>

              {block.items.map((v, localIdx) => {
                const isActive = v.flatIdx === currentIndex;
                const isWatched = watched.has(v.flatIdx);
                return (
                  <div
                    key={v.id}
                    onClick={() => goTo(v.flatIdx)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '7px 16px 7px 14px',
                      cursor: 'pointer',
                      borderLeft: `2px solid ${isActive ? block.color : 'transparent'}`,
                      background: isActive ? `${block.color}0D` : 'transparent',
                      transition: 'background 0.12s',
                    }}
                  >
                    <div style={{
                      width: 19, height: 19, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 700,
                      background: isWatched ? D.greenL : isActive ? `${block.color}1A` : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isWatched ? D.green : isActive ? `${block.color}66` : D.border}`,
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

      {/* ── Main ────────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Player */}
        <div
          onClick={() => !playerActive && setPlayerActive(true)}
          style={{
            position: 'relative',
            borderRadius: 14,
            overflow: 'hidden',
            background: '#000',
            cursor: playerActive ? 'default' : 'pointer',
            aspectRatio: '16/9',
            flexShrink: 0,
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
                onError={(e) => { e.currentTarget.src = `https://img.youtube.com/vi/${current.id}/hqdefault.jpg`; }}
              />
              {/* Gradient */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(7,12,21,0.9) 0%, rgba(7,12,21,0.3) 45%, rgba(7,12,21,0.1) 100%)' }} />

              {/* Play button */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                  width: 60, height: 60, borderRadius: '50%',
                  background: D.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 0 8px rgba(59,130,246,0.15)',
                }}>
                  <Play size={22} color="#fff" fill="#fff" style={{ marginLeft: 3 }} />
                </div>
              </div>

              {/* Bottom overlay: block chip + title */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    color: current.color,
                    background: `${current.color}1A`,
                    border: `1px solid ${current.color}33`,
                    padding: '2px 8px', borderRadius: 6,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    {current.block}
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{current.duration}</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', lineHeight: 1.35 }}>
                  {current.title}
                </div>
              </div>

              {/* Video counter */}
              <div style={{
                position: 'absolute', top: 12, right: 12,
                fontSize: 11, fontWeight: 600, color: D.text2,
                background: 'rgba(7,12,21,0.7)',
                padding: '3px 10px', borderRadius: 6,
                border: `0.5px solid ${D.border}`,
              }}>
                {currentIndex + 1} / {total}
              </div>
            </>
          )}
        </div>

        {/* Info bar */}
        <div style={{
          background: D.card,
          border: `0.5px solid ${D.border}`,
          borderRadius: 14,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flex: 1,
        }}>
          <p style={{ margin: 0, fontSize: 13, color: D.text2, lineHeight: 1.5, flex: 1, minWidth: 0 }}>
            {current.desc}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* Back */}
            <button
              disabled={currentIndex === 0}
              onClick={() => goTo(currentIndex - 1)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '6px 12px', borderRadius: 8,
                border: `0.5px solid ${D.border}`,
                background: 'transparent',
                color: currentIndex === 0 ? 'rgba(255,255,255,0.15)' : D.text2,
                fontSize: 12, fontWeight: 500,
                cursor: currentIndex === 0 ? 'default' : 'pointer',
              }}
            >
              <ChevronLeft size={13} /> Zurück
            </button>

            {/* Mark watched */}
            <button
              onClick={toggleWatched}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 8,
                border: `0.5px solid ${watched.has(currentIndex) ? D.green : D.border}`,
                background: watched.has(currentIndex) ? D.greenL : 'transparent',
                color: watched.has(currentIndex) ? D.green : D.text2,
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}
            >
              <CheckCircle2 size={13} />
              {watched.has(currentIndex) ? 'Gesehen ✓' : 'Als gesehen markieren'}
            </button>

            {/* Next */}
            <button
              disabled={currentIndex === total - 1}
              onClick={() => goTo(currentIndex + 1)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '6px 12px', borderRadius: 8,
                border: `0.5px solid ${currentIndex === total - 1 ? D.border : D.accent}`,
                background: currentIndex === total - 1 ? 'transparent' : D.accentL,
                color: currentIndex === total - 1 ? 'rgba(255,255,255,0.15)' : D.accent,
                fontSize: 12, fontWeight: 500,
                cursor: currentIndex === total - 1 ? 'default' : 'pointer',
              }}
            >
              Weiter <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Training Page ─────────────────────────────────────────────────────────────

const CURRICULA = [
  { key: 'cold-calling', label: 'Cold Calling Training', icon: Phone,    data: COLD_CALLING, count: 16 },
  { key: 'web-design',   label: 'Web Design für Caller', icon: BookOpen, data: WEB_DESIGN,   count: 12 },
];

export default function Training() {
  const [activeCurriculum, setActiveCurriculum] = useState('cold-calling');
  const active = CURRICULA.find((c) => c.key === activeCurriculum);

  return (
    <div style={{ minHeight: '100%', padding: '28px 24px 64px', boxSizing: 'border-box', maxWidth: 1140, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: D.text3, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 4px' }}>
          Weiterbildung
        </p>
        <h1 style={{ margin: '0 0 3px', fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: D.text }}>
          Training
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: D.text3 }}>
          Strukturierte Lernprogramme – Video für Video zum Cold Calling Profi
        </p>
      </div>

      {/* Curriculum tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {CURRICULA.map((c) => {
          const Icon = c.icon;
          const isActive = activeCurriculum === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setActiveCurriculum(c.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 16px',
                borderRadius: 10,
                border: `0.5px solid ${isActive ? D.accent : D.border}`,
                background: isActive ? D.accentL : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={14} color={isActive ? D.accent : D.text3} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? D.accent : D.text2, lineHeight: 1.2 }}>
                  {c.label}
                </div>
                <div style={{ fontSize: 10, color: D.text3 }}>{c.count} Videos</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Player */}
      <CurriculumPlayer
        key={activeCurriculum}
        curriculum={active.data}
      />
    </div>
  );
}
