import { useState, useLayoutEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { radii, font, easing } from '../../designTokens';

/**
 * Animated pill-tab bar (sliding lila pill).
 *
 * Props:
 *  - tabs:     array of strings OR array of { value, label }
 *  - value:    currently active tab value
 *  - onChange: (value) => void
 *  - size:     'sm' | 'md' (default 'md')
 *  - fullWidth: stretch tabs across container
 */
export default function Tabs({
  tabs, value, onChange, size = 'md', fullWidth = false, style,
}) {
  const { c } = useTheme();
  const refs = useRef([]);
  const [pill, setPill] = useState({ left: 0, width: 0, visible: false });

  // Normalize tabs to { value, label } objects
  const items = tabs.map(t => typeof t === 'string' ? { value: t, label: t } : t);
  const activeIdx = items.findIndex(t => t.value === value);

  useLayoutEffect(() => {
    const el = refs.current[activeIdx];
    if (el) {
      setPill({ left: el.offsetLeft, width: el.offsetWidth, visible: true });
    }
  }, [activeIdx, items.length]);

  const sizes = {
    sm: { pad: '5px 12px', font: font.size.sm,   gap: 2, height: 30 },
    md: { pad: '7px 14px', font: font.size.base, gap: 3, height: 36 },
  };
  const s = sizes[size] || sizes.md;

  return (
    <div style={{
      position: 'relative',
      display: fullWidth ? 'flex' : 'inline-flex',
      gap: s.gap,
      padding: 3,
      background: c.inputBg,
      border: `0.5px solid ${c.borderSubtle}`,
      borderRadius: radii.lg,
      ...style,
    }}>
      {/* Sliding pill */}
      <div style={{
        position: 'absolute',
        top: 3, bottom: 3,
        left: pill.left, width: pill.width,
        background: c.primaryLight,
        border: `0.5px solid ${c.primaryMuted}`,
        borderRadius: radii.md,
        opacity: pill.visible ? 1 : 0,
        transition: pill.visible
          ? `left 0.28s ${easing.smooth}, width 0.28s ${easing.smooth}, opacity 0.18s ${easing.smooth}`
          : 'none',
        pointerEvents: 'none',
        boxShadow: '0 1px 4px rgba(155,114,242,0.16)',
      }} />

      {items.map((tab, i) => {
        const isActive = tab.value === value;
        return (
          <button
            key={tab.value}
            ref={el => { refs.current[i] = el; }}
            onClick={() => onChange?.(tab.value)}
            style={{
              position: 'relative',
              zIndex: 1,
              padding: s.pad,
              flex: fullWidth ? 1 : '0 0 auto',
              border: 'none',
              background: 'transparent',
              fontSize: s.font,
              fontWeight: isActive ? font.weight.semibold : font.weight.medium,
              color: isActive ? c.primary : c.textSecondary,
              cursor: 'pointer',
              borderRadius: radii.md,
              fontFamily: 'inherit',
              letterSpacing: font.letterSpacing.snug,
              transition: `color 0.18s ${easing.smooth}`,
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = c.text; }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = c.textSecondary; }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
