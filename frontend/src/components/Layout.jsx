import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import MobileDrawer from './MobileDrawer';
import GlobalSearch from './GlobalSearch';
import { useMobile } from '../hooks/useMobile';
import { useTheme } from '../context/ThemeContext';

export default function Layout({ children }) {
  const isMobile = useMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { c } = useTheme();
  const location = useLocation();

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: isMobile ? 'auto' : 'hidden',
      overflowX: 'hidden',
      background: c.bg,
      maxWidth: '100vw',
      transition: 'background 0.2s ease',
    }}>
      {/* Sidebar — nur Desktop */}
      {!isMobile && <Sidebar />}

      {/* Hauptinhalt */}
      <main style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        minWidth: 0,
        maxWidth: '100%',
        paddingTop: isMobile ? 'env(safe-area-inset-top)' : 0,
        paddingBottom: isMobile ? 'calc(62px + env(safe-area-inset-bottom) + 20px)' : 0,
      }}>
        {/* key remounts on route change → triggers fade-in animation */}
        <div key={location.pathname} className="vec-page-fade" style={{ minHeight: '100%' }}>
          {children}
        </div>
      </main>

      <GlobalSearch />

      {/* Bottom Navigation — nur Mobil */}
      {isMobile && (
        <>
          <BottomNav onMoreClick={() => setDrawerOpen(true)} />
          {drawerOpen && <MobileDrawer onClose={() => setDrawerOpen(false)} />}
        </>
      )}
    </div>
  );
}
