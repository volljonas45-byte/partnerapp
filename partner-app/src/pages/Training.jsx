import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, CheckCircle2, Clock, ChevronDown, ChevronUp, GraduationCap, X, Trophy } from 'lucide-react';

const glass = {
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  background: 'rgba(255,255,255,0.025)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 18,
};

// Cold Calling Training Curriculum
// → Replace ytId values with your preferred YouTube video IDs
const MODULES = [
  {
    id: 'm1',
    title: 'Mindset & Motivation',
    description: 'Die richtige mentale Einstellung für Cold Calls – Resilienz, Selbstvertrauen und tägliche Routinen.',
    color: '#3B82F6', glow: 'rgba(59,130,246,0.2)', emoji: '🧠',
    videos: [
      { ytId: 'LiqW37eJNMw', title: 'Das richtige Mindset für Cold Calls',     channel: 'Sales Insights Lab',   duration: '8:42', level: 'Einsteiger'     },
      { ytId: 'b0SVHZ3THMQ', title: 'Wie du mit Ablehnung umgehst',            channel: 'Sales Gravy',          duration: '11:20', level: 'Einsteiger'    },
      { ytId: 'pHRZ8eomJl8', title: 'Tägliche Routine für Top-Verkäufer',      channel: 'Alex Hormozi',         duration: '14:05', level: 'Einsteiger'    },
    ],
  },
  {
    id: 'm2',
    title: 'Vorbereitung & Research',
    description: 'Prospects recherchieren, Listen aufbauen und dich optimal auf jeden Anruf vorbereiten.',
    color: '#38BDF8', glow: 'rgba(56,189,248,0.2)', emoji: '🔍',
    videos: [
      { ytId: 'F5NM-qqF8E8', title: 'Prospect-Recherche in 10 Minuten',        channel: 'Predictable Revenue',  duration: '9:15',  level: 'Einsteiger'    },
      { ytId: '9hW3uVy4-g4', title: 'Der perfekte Call-Script Aufbau',          channel: 'Sales Insights Lab',   duration: '16:38', level: 'Fortgeschritten'},
      { ytId: 'rj_QIMP89gU', title: 'Qualifikation: BANT & MEDDIC erklärt',    channel: 'Corporate Sales',      duration: '12:54', level: 'Fortgeschritten'},
    ],
  },
  {
    id: 'm3',
    title: 'Der perfekte Opener',
    description: 'In den ersten 10 Sekunden Interesse wecken und einen starken ersten Eindruck hinterlassen.',
    color: '#818cf8', glow: 'rgba(129,140,248,0.2)', emoji: '📞',
    videos: [
      { ytId: 'FiPEYzQ-NaA', title: 'Die besten Cold Call Opening Lines',       channel: 'NEPQ Sales',           duration: '10:22', level: 'Einsteiger'    },
      { ytId: 'qOcSBc4bPFk', title: 'Pattern Interrupt – Aufmerksamkeit erzeugen', channel: 'Jeremy Miner',    duration: '13:47', level: 'Fortgeschritten'},
      { ytId: 'aBLr1LZZSHg', title: 'Von Gatekeeper zum Entscheider',           channel: 'B2B Sales Academy',   duration: '11:30', level: 'Fortgeschritten'},
    ],
  },
  {
    id: 'm4',
    title: 'Einwandbehandlung',
    description: 'Die häufigsten Einwände im B2B-Vertrieb und wie du sie professionell und überzeugend beantwortest.',
    color: '#f59e0b', glow: 'rgba(245,158,11,0.2)', emoji: '🛡️',
    videos: [
      { ytId: 'WDMbWkVm7Kg', title: '"Kein Interesse" – Die perfekte Antwort',   channel: 'Sales Gravy',          duration: '9:40',  level: 'Einsteiger'    },
      { ytId: 'KvJBSR28gOQ', title: '"Schicken Sie uns Infos per E-Mail"',       channel: 'NEPQ Sales',           duration: '7:55',  level: 'Fortgeschritten'},
      { ytId: '6hcJEsJi5hE', title: 'Preis-Einwände sicher meistern',            channel: 'Sales Insights Lab',   duration: '14:18', level: 'Profi'         },
      { ytId: 'LbKe1DPKGTI', title: '"Wir haben bereits einen Anbieter"',        channel: 'B2B Mastery',          duration: '11:02', level: 'Profi'         },
    ],
  },
  {
    id: 'm5',
    title: 'Termin setzen & Abschluss',
    description: 'Qualifizierte Termine setzen, die auch stattfinden – und den Call sauber zum Abschluss bringen.',
    color: '#34D399', glow: 'rgba(52,211,153,0.2)', emoji: '📅',
    videos: [
      { ytId: 'UvP44kIQzGQ', title: 'Den Termin in 3 Schritten sichern',        channel: 'Sales Process',        duration: '8:33',  level: 'Fortgeschritten'},
      { ytId: 'hAIh5h9DL8I', title: 'No-Show Rate auf 0 reduzieren',            channel: 'SaaS Sales Academy',   duration: '10:15', level: 'Fortgeschritten'},
      { ytId: 'g4GR5W8NWSA', title: 'Folgetermine & Callbacks richtig planen',  channel: 'Cold Calling Pro',     duration: '9:47',  level: 'Profi'         },
    ],
  },
  {
    id: 'm6',
    title: 'Praxis & Live Roleplay',
    description: 'Echte Cold Calls zum Zuschauen und Lernen – mit Live-Feedback und detaillierter Analyse.',
    color: '#c084fc', glow: 'rgba(192,132,252,0.18)', emoji: '🎯',
    videos: [
      { ytId: 'eDiXVBFJXe0', title: 'Live Cold Call: B2B SaaS Demo',            channel: 'Sales Roleplay',       duration: '18:22', level: 'Profi'         },
      { ytId: 'nUL_2IHuU7g', title: 'Cold Call Analyse: Was lief gut/schlecht?', channel: 'Sales Breakdown',     duration: '22:45', level: 'Profi'         },
      { ytId: 'h3F8d7S2kpL', title: '100 Calls in einer Woche – Learnings',     channel: 'Sales Diary',          duration: '15:30', level: 'Profi'         },
    ],
  },
];

const LEVEL_STYLE = {
  Einsteiger:      { color: '#34D399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)'  },
  Fortgeschritten: { color: '#38BDF8', bg: 'rgba(56,189,248,0.1)',  border: 'rgba(56,189,248,0.25)'  },
  Profi:           { color: '#c084fc', bg: 'rgba(192,132,252,0.1)', border: 'rgba(192,132,252,0.25)' },
};

export default function Training() {
  const [watched, setWatched] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('vecturo_training_watched') || '[]')); }
    catch { return new Set(); }
  });
  const [activeModule, setActiveModule] = useState('m1');
  const [playingVideo, setPlayingVideo] = useState(null);

  const toggleWatched = (ytId) => {
    setWatched(prev => {
      const next = new Set(prev);
      next.has(ytId) ? next.delete(ytId) : next.add(ytId);
      localStorage.setItem('vecturo_training_watched', JSON.stringify([...next]));
      return next;
    });
  };

  const totalVideos = MODULES.reduce((s, m) => s + m.videos.length, 0);
  const watchedCount = MODULES.reduce((s, m) => s + m.videos.filter(v => watched.has(v.ytId)).length, 0);
  const progressPct = totalVideos ? Math.round((watchedCount / totalVideos) * 100) : 0;
  const circum = 2 * Math.PI * 18;

  return (
    <div style={{ minHeight: '100%', padding: '28px 20px 64px', boxSizing: 'border-box', position: 'relative' }}>

      {/* Ambient glows */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', right: '10%', width: 500, height: 500, background: 'rgba(129,140,248,0.05)', borderRadius: '50%', filter: 'blur(120px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '10%', width: 400, height: 400, background: 'rgba(59,130,246,0.05)', borderRadius: '50%', filter: 'blur(100px)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 4px' }}>Weiterbildung</p>
            <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: 'rgba(255,255,255,0.92)' }}>
              Cold Calling Programm
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.32)' }}>
              {totalVideos} Videos in {MODULES.length} Modulen · Werde zum Cold Calling Profi
            </p>
          </div>

          {/* Progress ring */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
            style={{ ...glass, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ position: 'relative', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="48" height="48" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
                <circle cx="24" cy="24" r="18" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                <motion.circle cx="24" cy="24" r="18" fill="none" stroke="#34D399" strokeWidth="3"
                  strokeLinecap="round" strokeDasharray={circum}
                  initial={{ strokeDashoffset: circum }}
                  animate={{ strokeDashoffset: circum * (1 - progressPct / 100) }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                />
              </svg>
              <span style={{ position: 'relative', fontSize: 11, fontWeight: 700, color: '#34D399' }}>{progressPct}%</span>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{watchedCount} / {totalVideos} Videos</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>abgeschlossen</div>
            </div>
          </motion.div>
        </motion.div>

        {/* Module grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          {MODULES.map((mod, i) => {
            const modDone  = mod.videos.filter(v => watched.has(v.ytId)).length;
            const modPct   = Math.round((modDone / mod.videos.length) * 100);
            const isActive = activeModule === mod.id;
            return (
              <motion.div key={mod.id}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                onClick={() => setActiveModule(isActive ? null : mod.id)}
                style={{
                  ...glass, padding: '14px 16px', cursor: 'pointer',
                  borderColor: isActive ? `${mod.color}45` : 'rgba(255,255,255,0.06)',
                  background: isActive ? 'rgba(255,255,255,0.038)' : 'rgba(255,255,255,0.025)',
                  boxShadow: isActive ? `0 0 28px ${mod.glow}` : undefined,
                }}
                whileHover={{ y: -3, transition: { duration: 0.14 } }}
                whileTap={{ scale: 0.98 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{mod.emoji}</span>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Modul {i + 1}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? mod.color : 'rgba(255,255,255,0.6)' }}>
                        {mod.title}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {modPct === 100 && <Trophy size={13} color="#34D399" />}
                    {isActive
                      ? <ChevronUp size={14} color="rgba(255,255,255,0.3)" />
                      : <ChevronDown size={14} color="rgba(255,255,255,0.3)" />}
                  </div>
                </div>
                <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                  <motion.div style={{ height: '100%', background: mod.color, borderRadius: 99 }}
                    initial={{ width: 0 }} animate={{ width: `${modPct}%` }}
                    transition={{ delay: 0.3 + i * 0.06, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
                  {modDone}/{mod.videos.length} Videos · <span style={{ color: mod.color }}>{modPct}%</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Active module video grid */}
        <AnimatePresence mode="wait">
          {activeModule && (() => {
            const mod = MODULES.find(m => m.id === activeModule);
            if (!mod) return null;
            return (
              <motion.div key={activeModule}
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.28 }}
                style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 12, padding: '0 2px' }}>
                  <h2 style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
                    {mod.emoji} {mod.title}
                  </h2>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.32)', lineHeight: 1.5 }}>{mod.description}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {mod.videos.map((video, i) => {
                    const isWatched = watched.has(video.ytId);
                    const lvl = LEVEL_STYLE[video.level];
                    return (
                      <motion.div key={video.ytId}
                        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07, duration: 0.35 }}
                        style={{
                          ...glass, overflow: 'hidden', cursor: 'pointer',
                          borderColor: isWatched ? 'rgba(52,211,153,0.22)' : 'rgba(255,255,255,0.06)',
                          boxShadow: isWatched ? '0 0 20px rgba(52,211,153,0.08)' : undefined,
                        }}
                        whileHover={{ y: -4, transition: { duration: 0.14 } }}
                        whileTap={{ scale: 0.98 }}>

                        {/* Thumbnail */}
                        <div style={{ position: 'relative', aspectRatio: '16/9', background: '#0a1122', overflow: 'hidden' }}
                          onClick={() => setPlayingVideo(video)}>
                          <img
                            src={`https://img.youtube.com/vi/${video.ytId}/hqdefault.jpg`}
                            alt={video.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            onError={e => { e.currentTarget.style.display = 'none'; }}
                          />
                          {/* Gradient overlay always visible */}
                          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 60%)' }} />
                          {/* Play button */}
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <motion.div whileHover={{ scale: 1.12 }}
                              style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid rgba(255,255,255,0.35)' }}>
                              <Play size={17} color="#fff" fill="#fff" />
                            </motion.div>
                          </div>
                          {/* Watched badge */}
                          {isWatched && (
                            <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(52,211,153,0.92)', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <CheckCircle2 size={13} color="#fff" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div style={{ padding: '12px 14px 10px' }}>
                          <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }} onClick={() => setPlayingVideo(video)}>
                            {video.title}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={10} color="rgba(255,255,255,0.28)" />
                                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>{video.duration}</span>
                              </div>
                              <span style={{ fontSize: 9, fontWeight: 600, color: lvl.color, background: lvl.bg, border: `1px solid ${lvl.border}`, padding: '1px 6px', borderRadius: 99 }}>
                                {video.level}
                              </span>
                            </div>
                            <button onClick={e => { e.stopPropagation(); toggleWatched(video.ytId); }}
                              style={{ fontSize: 10, fontWeight: 600, color: isWatched ? '#34D399' : 'rgba(255,255,255,0.28)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}>
                              {isWatched ? '✓ Gesehen' : 'Als gesehen markieren'}
                            </button>
                          </div>
                          <div style={{ marginTop: 4, fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{video.channel}</div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* Tip banner */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.4 }}
          style={{ ...glass, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(59,130,246,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(59,130,246,0.22)' }}>
            <GraduationCap size={18} color="#3B82F6" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.72)', marginBottom: 2 }}>
              Tipp: Täglich 1 Video = in 6 Wochen zum Cold Calling Profi
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>
              Starte mit Modul 1 · Markiere Videos als gesehen · Verfolge deinen Fortschritt
            </div>
          </div>
        </motion.div>
      </div>

      {/* Video Modal */}
      <AnimatePresence>
        {playingVideo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
            onClick={() => setPlayingVideo(null)}>
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{ width: '100%', maxWidth: 920, background: '#0D1525', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}
              onClick={e => e.stopPropagation()}>
              {/* Modal header */}
              <div style={{ padding: '13px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{playingVideo.title}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', marginTop: 2 }}>{playingVideo.channel} · {playingVideo.duration}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 16 }}>
                  <button onClick={() => toggleWatched(playingVideo.ytId)}
                    style={{ fontSize: 12, fontWeight: 600, color: watched.has(playingVideo.ytId) ? '#34D399' : 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, cursor: 'pointer', padding: '5px 12px', whiteSpace: 'nowrap' }}>
                    {watched.has(playingVideo.ytId) ? '✓ Gesehen' : 'Als gesehen markieren'}
                  </button>
                  <button onClick={() => setPlayingVideo(null)}
                    style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, color: 'rgba(255,255,255,0.55)', cursor: 'pointer', padding: '6px 10px', display: 'flex', alignItems: 'center' }}>
                    <X size={16} />
                  </button>
                </div>
              </div>
              {/* Iframe */}
              <div style={{ aspectRatio: '16/9', background: '#000' }}>
                <iframe
                  src={`https://www.youtube.com/embed/${playingVideo.ytId}?autoplay=1&rel=0`}
                  title={playingVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
