export default function AmbientGlow({ variant = 'default' }) {
  const glows = {
    default: [
      { top: '-10%', left: '20%',  width: 480, height: 480, color: 'rgba(139,92,246,0.07)',  blur: 120 },
      { bottom: '10%', right: '10%', width: 380, height: 380, color: 'rgba(91,140,245,0.06)', blur: 100 },
      { top: '40%', left: '60%',  width: 280, height: 280, color: 'rgba(52,211,153,0.05)',  blur: 80  },
    ],
    blue: [
      { top: '-5%', left: '30%',  width: 400, height: 400, color: 'rgba(91,140,245,0.08)',  blur: 100 },
      { bottom: '5%', right: '15%', width: 320, height: 320, color: 'rgba(155,114,242,0.06)', blur: 90 },
    ],
    warm: [
      { top: '-5%', right: '20%', width: 400, height: 400, color: 'rgba(251,146,60,0.06)',  blur: 100 },
      { bottom: '10%', left: '10%', width: 320, height: 320, color: 'rgba(248,113,113,0.05)', blur: 90 },
    ],
  };

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {(glows[variant] || glows.default).map((g, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: g.top, bottom: g.bottom, left: g.left, right: g.right,
          width: g.width, height: g.height,
          background: g.color,
          borderRadius: '50%',
          filter: `blur(${g.blur}px)`,
        }} />
      ))}
    </div>
  );
}
