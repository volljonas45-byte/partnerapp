import { useState, useLayoutEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { radii, font, easing } from '../designTokens';

/**
 * HubLayout — sticky tab bar above an Outlet for grouping thematically
 * related pages (Finanzen, Projekte, Zeit & Team, Workflow, Sales).
 *
 * Uses the animated lila pill pattern for the active tab — consistent with
 * AdminPartners SegCtrl and the new ui/Tabs component.
 *
 * tabs: [{ to, label, match? }]
 *   - to:    target path
 *   - label: displayed text
 *   - match: optional path prefix(es) (string | string[]) used for active
 *            state when child paths differ from `to`.
 */
export default function HubLayout({ tabs = [] }) {
  const { c } = useTheme();
  const location = useLocation();
  const refs = useRef([]);
  const [pill, setPill] = useState({ left: 0, width: 0, visible: false });

  const isActive = (tab) => {
    const matches = tab.match
      ? Array.isArray(tab.match) ? tab.match : [tab.match]
      : [tab.to];
    return matches.some(m => location.pathname === m || location.pathname.startsWith(m + '/'));
  };

  const activeIdx = tabs.findIndex(isActive);

  useLayoutEffect(() => {
    const el = refs.current[activeIdx];
    if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth, visible: true });
    else setPill(p => ({ ...p, visible: false }));
  }, [activeIdx, tabs.length, location.pathname]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: 'rgba(13,13,18,0.78)',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          borderBottom: `0.5px solid ${c.borderSubtle}`,
          padding: '12px 24px',
        }}
      >
        <div style={{
          position: 'relative',
          display: 'inline-flex',
          gap: 3,
          padding: 3,
          background: c.inputBg,
          border: `0.5px solid ${c.borderSubtle}`,
          borderRadius: radii.lg,
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          {/* Sliding lila pill */}
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

          {tabs.map((tab, i) => {
            const active = isActive(tab);
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                style={{ textDecoration: 'none', flexShrink: 0, position: 'relative', zIndex: 1 }}
              >
                <div
                  ref={el => { refs.current[i] = el; }}
                  style={{
                    padding: '7px 14px',
                    fontSize: font.size.base,
                    fontWeight: active ? font.weight.semibold : font.weight.medium,
                    letterSpacing: font.letterSpacing.snug,
                    color: active ? c.primary : c.textSecondary,
                    cursor: 'pointer',
                    borderRadius: radii.md,
                    transition: `color 0.18s ${easing.smooth}`,
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.color = c.text; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.color = c.textSecondary; }}
                >
                  {tab.label}
                </div>
              </NavLink>
            );
          })}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Outlet />
      </div>
    </div>
  );
}
