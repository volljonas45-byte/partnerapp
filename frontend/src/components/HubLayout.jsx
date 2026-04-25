import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

/**
 * HubLayout — sticky tab bar above an Outlet for grouping thematically
 * related pages (Finanzen, Projekte, Zeit & Team, Workflow, Sales).
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

  const isActive = (tab) => {
    const matches = tab.match
      ? Array.isArray(tab.match) ? tab.match : [tab.match]
      : [tab.to];
    return matches.some(m => location.pathname === m || location.pathname.startsWith(m + '/'));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: c.bg,
          backdropFilter: 'saturate(180%) blur(18px)',
          WebkitBackdropFilter: 'saturate(180%) blur(18px)',
          borderBottom: `0.5px solid ${c.borderSubtle}`,
          padding: '0 24px',
        }}
      >
        <div style={{ display: 'flex', gap: 2, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {tabs.map(tab => {
            const active = isActive(tab);
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                style={{ textDecoration: 'none', flexShrink: 0 }}
              >
                <div
                  style={{
                    padding: '12px 14px 11px',
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    letterSpacing: '-0.01em',
                    color: active ? '#5B8CF5' : c.textSecondary,
                    borderBottom: active ? '2px solid #5B8CF5' : '2px solid transparent',
                    marginBottom: -1,
                    cursor: 'pointer',
                    transition: 'color 0.15s, border-color 0.15s',
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
