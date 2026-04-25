import { useState, useMemo } from 'react';
import { Play, CheckCircle2, ChevronLeft } from 'lucide-react';

// ─── Data ─────────────────────────────────────────────────────────────────────
const CURRICULA = [
  {
    key: 'cold-calling',
    title: 'Cold Calling Training',
    accentColor: '#3B82F6',
    coverGradient: 'linear-gradient(135deg, #1e3a5f 0%, #0f1f3d 100%)',
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
    accentColor: '#818CF8',
    coverGradient: 'linear-gradient(135deg, #2d1f5e 0%, #160f3d 100%)',
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

// ─── helpers ──────────────────────────────────────────────────────────────────
function totalVideos(c) { return c.blocks.reduce((s, b) => s + b.videos.length, 0); }
function blockOffset(c, bi) { return c.blocks.slice(0, bi).reduce((s, b) => s + b.videos.length, 0); }

// ─── VIEW 1: Course Grid ──────────────────────────────────────────────────────
function CourseGrid({ onSelect }) {
  return (
    <div style={{ padding: '28px 24px' }}>
      <h1 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 700, color: '#F2F2F7', letterSpacing: '-0.02em' }}>
        Programme
      </h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {CURRICULA.map(c => (
          <div
            key={c.key}
            onClick={() => onSelect(c.key)}
            style={{
              position: 'relative', borderRadius: 14, overflow: 'hidden',
              aspectRatio: '3/2', cursor: 'pointer',
              background: c.coverGradient,
            }}
          >
            {/* Thumbnail from first video */}
            <img
              src={`https://img.youtube.com/vi/${c.blocks[0].videos[0].id}/maxresdefault.jpg`}
              alt={c.title}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }}
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 60%)' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.2, textTransform: 'uppercase' }}>
                {c.title}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
                {c.blocks.length} Module · {totalVideos(c)} Lektionen
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── VIEW 2: Course Detail (hero banner + module list) ────────────────────────
function CourseDetail({ curriculum, watched, onSelectModule, onBack }) {
  const total = totalVideos(curriculum);
  const done  = curriculum.blocks.reduce((s, b, bi) =>
    s + b.videos.filter((_, vi) => watched.has(blockOffset(curriculum, bi) + vi)).length, 0);
  const pct = total ? Math.round((done / total) * 100) : 0;

  // find last watched video for "continue watching"
  let continueBlock = 0, continueVid = 0, continueFlat = 0;
  let found = false;
  curriculum.blocks.forEach((b, bi) => {
    b.videos.forEach((v, vi) => {
      const fi = blockOffset(curriculum, bi) + vi;
      if (watched.has(fi) && !found) { continueBlock = bi; continueVid = vi + 1; continueFlat = fi + 1; }
      if (!watched.has(fi) && !found) { found = true; continueBlock = bi; continueVid = vi; continueFlat = fi; }
    });
  });
  const continueVideo = curriculum.blocks[continueBlock]?.videos[continueVid] || curriculum.blocks[0].videos[0];

  return (
    <div style={{ padding: '0 0 64px' }}>
      {/* Back */}
      <div style={{ padding: '16px 24px 0' }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
            fontSize: 13, cursor: 'pointer', padding: '4px 0',
          }}
        >
          <ChevronLeft size={16} /> Zurück
        </button>
      </div>

      {/* Hero banner */}
      <div style={{
        position: 'relative', margin: '12px 24px 0',
        borderRadius: 16, overflow: 'hidden', height: 220,
        background: curriculum.coverGradient,
      }}>
        {/* bg thumbnail */}
        <img
          src={`https://img.youtube.com/vi/${continueVideo.id}/maxresdefault.jpg`}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }}
          onError={e => { e.currentTarget.style.display = 'none'; }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.85) 40%, transparent 100%)' }} />

        <div style={{ position: 'absolute', inset: 0, padding: '28px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: '0 0 12px', fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
              {curriculum.title}
            </h1>
            {/* Progress */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                fontSize: 12, fontWeight: 600, color: '#fff',
                background: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: 99,
                border: '1px solid rgba(255,255,255,0.2)',
              }}>
                {done}/{total} Lektionen
              </div>
              <div style={{ flex: 1, maxWidth: 220, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: '#fff', borderRadius: 99, transition: 'width 0.5s' }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{pct}%</span>
            </div>
          </div>

          {/* Continue watching */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ position: 'relative', width: 72, height: 48, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
              <img
                src={`https://img.youtube.com/vi/${continueVideo.id}/default.jpg`}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
                <div style={{
                  fontSize: 20, fontWeight: 900, color: 'rgba(255,255,255,0.4)',
                  position: 'absolute', right: 4, bottom: 0, lineHeight: 1,
                }}>
                  {continueFlat + 1}
                </div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 6 }}>{continueVideo.title}</div>
              <button
                onClick={() => onSelectModule(continueBlock, continueVid)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: 99, color: '#fff', fontSize: 12, fontWeight: 600,
                  padding: '6px 16px', cursor: 'pointer',
                }}
              >
                <Play size={12} fill="#fff" color="#fff" /> Weiter ansehen
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Module list + sidebar */}
      <div style={{ display: 'flex', gap: 24, padding: '24px 24px 0', alignItems: 'flex-start' }}>

        {/* Module rows */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {curriculum.blocks.map((block, bi) => {
            const off  = blockOffset(curriculum, bi);
            const done = block.videos.filter((_, vi) => watched.has(off + vi)).length;
            const firstVidId = block.videos[0].id;

            return (
              <div
                key={block.title}
                onClick={() => onSelectModule(bi, 0)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '14px 18px',
                  background: '#141B2D',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12, cursor: 'pointer',
                  transition: 'background 0.14s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#1a2540'}
                onMouseLeave={e => e.currentTarget.style.background = '#141B2D'}
              >
                {/* Thumbnail with number */}
                <div style={{ position: 'relative', width: 80, height: 52, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                  <img
                    src={`https://img.youtube.com/vi/${firstVidId}/default.jpg`}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.55)' }}
                    onError={e => { e.currentTarget.style.display = 'none'; }}
                  />
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 28, fontWeight: 900, color: 'rgba(255,255,255,0.35)', lineHeight: 1 }}>
                      {bi + 1}
                    </span>
                  </div>
                  {done === block.videos.length && (
                    <div style={{ position: 'absolute', top: 4, right: 4 }}>
                      <CheckCircle2 size={14} color="#34D399" strokeWidth={2.5} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#F2F2F7', marginBottom: 4 }}>{block.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 11, color: '#9CA3AF',
                      background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                      padding: '2px 9px', borderRadius: 99,
                    }}>
                      {block.videos.length} {block.videos.length === 1 ? 'Lektion' : 'Lektionen'}
                    </span>
                    {done > 0 && (
                      <span style={{ fontSize: 11, color: '#34D399' }}>{done}/{block.videos.length} abgeschlossen</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar: What's included */}
        <div style={{ width: 260, flexShrink: 0 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#F2F2F7' }}>Was ist enthalten?</h3>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            {curriculum.key === 'cold-calling'
              ? 'Dieses Programm bringt dir alles bei, was du für professionelles Cold Calling brauchst – von Mindset bis Masterclass.'
              : 'Lerne alles über Web Design, das du brauchst, um im Verkaufsgespräch überzeugend zu pitchen.'}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#F2F2F7', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', padding: '4px 12px', borderRadius: 99 }}>
              {curriculum.blocks.length} Module
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#F2F2F7', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', padding: '4px 12px', borderRadius: 99 }}>
              {totalVideos(curriculum)} Lektionen
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── VIEW 3: Lesson Player ────────────────────────────────────────────────────
function LessonPlayer({ curriculum, initialBlock, initialLesson, watched, onToggleWatched, onBack }) {
  const [blockIdx, setBlockIdx] = useState(initialBlock);
  const [lessonIdx, setLessonIdx] = useState(initialLesson);
  const [playerActive, setPlayerActive] = useState(false);

  const block   = curriculum.blocks[blockIdx];
  const video   = block.videos[lessonIdx];
  const flatIdx = blockOffset(curriculum, blockIdx) + lessonIdx;
  const isWatched = watched.has(flatIdx);

  // flat navigation
  const allVideos = useMemo(() => {
    const list = [];
    curriculum.blocks.forEach((b, bi) => b.videos.forEach((v, vi) => list.push({ v, bi, vi, fi: blockOffset(curriculum, bi) + vi })));
    return list;
  }, [curriculum]);
  const flatPos = allVideos.findIndex(x => x.bi === blockIdx && x.vi === lessonIdx);

  const goToFlat = (pos) => {
    if (pos < 0 || pos >= allVideos.length) return;
    const { bi, vi } = allVideos[pos];
    setBlockIdx(bi);
    setLessonIdx(vi);
    setPlayerActive(false);
  };

  return (
    <div style={{ padding: '0 0 64px' }}>
      {/* Back */}
      <div style={{ padding: '16px 24px 0' }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
            fontSize: 13, cursor: 'pointer', padding: '4px 0',
          }}
        >
          <ChevronLeft size={16} /> {curriculum.title}
        </button>
      </div>

      {/* Player + Sidebar */}
      <div style={{ display: 'flex', gap: 0, padding: '16px 24px 0', alignItems: 'flex-start' }}>

        {/* Video column */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Video */}
          <div
            onClick={() => !playerActive && setPlayerActive(true)}
            style={{
              position: 'relative', borderRadius: 12, overflow: 'hidden',
              aspectRatio: '16/9', background: '#000',
              cursor: playerActive ? 'default' : 'pointer',
              marginBottom: 20,
            }}
          >
            {playerActive ? (
              <iframe
                style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0`}
                title={video.title}
                allow="autoplay; encrypted-media; accelerometer; clipboard-write; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <>
                <img
                  src={`https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`}
                  alt={video.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={e => { e.currentTarget.src = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`; }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.92)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                  }}>
                    <Play size={22} color="#111" fill="#111" style={{ marginLeft: 3 }} />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Below video */}
          <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#F2F2F7', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
            {video.title}
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65 }}>
            {video.desc}
          </p>

          {/* Nav + mark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              disabled={flatPos === 0}
              onClick={() => goToFlat(flatPos - 1)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: flatPos === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)',
                fontSize: 13, fontWeight: 500, cursor: flatPos === 0 ? 'default' : 'pointer',
              }}
            >
              <ChevronLeft size={14} /> Zurück
            </button>

            <button
              onClick={() => onToggleWatched(flatIdx)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 18px', borderRadius: 8,
                background: isWatched ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${isWatched ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.1)'}`,
                color: isWatched ? '#34D399' : 'rgba(255,255,255,0.6)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.16s', whiteSpace: 'nowrap',
              }}
            >
              <CheckCircle2 size={14} strokeWidth={isWatched ? 2.5 : 1.5} />
              {isWatched ? 'Abgeschlossen' : 'Als abgeschlossen markieren'}
            </button>

            {flatPos < allVideos.length - 1 && (
              <button
                onClick={() => goToFlat(flatPos + 1)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 18px', borderRadius: 8,
                  background: curriculum.accentColor,
                  border: 'none',
                  color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Nächste Lektion <Play size={12} fill="#fff" color="#fff" />
              </button>
            )}
          </div>
        </div>

        {/* Lesson sidebar */}
        <div style={{
          width: 300, flexShrink: 0, marginLeft: 20,
          background: '#0D1525',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12, overflow: 'hidden',
          maxHeight: 520, overflowY: 'auto',
          scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.06) transparent',
        }}>
          {/* Sidebar header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', position: 'sticky', top: 0, background: '#0D1525', zIndex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#F2F2F7' }}>{curriculum.title}</div>
          </div>

          {/* All lessons flat */}
          {curriculum.blocks.map((b, bi) => (
            <div key={bi}>
              {/* Block section header */}
              <div style={{ padding: '10px 16px 6px', background: '#0a1020' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {b.title}
                </div>
              </div>
              {b.videos.map((v, vi) => {
                const fi = blockOffset(curriculum, bi) + vi;
                const isCur  = bi === blockIdx && vi === lessonIdx;
                const isDone = watched.has(fi);
                return (
                  <div
                    key={v.id}
                    onClick={() => { setBlockIdx(bi); setLessonIdx(vi); setPlayerActive(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                      background: isCur ? 'rgba(255,255,255,0.06)' : 'transparent',
                      borderLeft: `3px solid ${isCur ? curriculum.accentColor : 'transparent'}`,
                      cursor: 'pointer', transition: 'background 0.12s',
                    }}
                  >
                    {/* Thumbnail */}
                    <div style={{ position: 'relative', width: 64, height: 40, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                      <img
                        src={`https://img.youtube.com/vi/${v.id}/default.jpg`}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', filter: isDone ? 'brightness(0.45)' : 'brightness(0.8)' }}
                        onError={e => { e.currentTarget.style.background = '#1a2540'; e.currentTarget.style.display = 'none'; }}
                      />
                      {/* Big number watermark */}
                      <div style={{
                        position: 'absolute', right: 3, bottom: -2,
                        fontSize: 22, fontWeight: 900, color: 'rgba(255,255,255,0.28)', lineHeight: 1,
                        userSelect: 'none',
                      }}>
                        {fi + 1}
                      </div>
                      {isDone && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(52,211,153,0.2)' }}>
                          <CheckCircle2 size={16} color="#34D399" strokeWidth={2.5} />
                        </div>
                      )}
                      {isCur && !isDone && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                          <Play size={14} fill="#fff" color="#fff" />
                        </div>
                      )}
                    </div>
                    {/* Title + duration */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, fontWeight: isCur ? 600 : 400, lineHeight: 1.35,
                        color: isDone ? 'rgba(255,255,255,0.32)' : isCur ? '#F2F2F7' : 'rgba(255,255,255,0.7)',
                        overflow: 'hidden', display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        marginBottom: 3,
                      }}>
                        {v.title}
                      </div>
                      <div style={{
                        display: 'inline-block', fontSize: 10, fontWeight: 600,
                        color: '#9CA3AF', background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(255,255,255,0.08)', padding: '1px 7px', borderRadius: 99,
                      }}>
                        {v.duration}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function Training() {
  const [view, setView]     = useState('grid');
  const [selKey, setSelKey] = useState(null);
  const [selBlock, setSelBlock] = useState(0);
  const [selLesson, setSelLesson] = useState(0);
  const [watched, setWatched] = useState(new Set());

  const curriculum = CURRICULA.find(c => c.key === selKey);

  const toggleWatched = (idx) => setWatched(prev => {
    const next = new Set(prev);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    return next;
  });

  if (view === 'grid') {
    return <CourseGrid onSelect={key => { setSelKey(key); setView('detail'); }} />;
  }
  if (view === 'detail' && curriculum) {
    return (
      <CourseDetail
        curriculum={curriculum}
        watched={watched}
        onSelectModule={(bi, vi = 0) => { setSelBlock(bi); setSelLesson(vi); setView('player'); }}
        onBack={() => setView('grid')}
      />
    );
  }
  if (view === 'player' && curriculum) {
    return (
      <LessonPlayer
        curriculum={curriculum}
        initialBlock={selBlock}
        initialLesson={selLesson}
        watched={watched}
        onToggleWatched={toggleWatched}
        onBack={() => setView('detail')}
      />
    );
  }
  return null;
}
