import { useState } from 'react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import MobileDrawer from './MobileDrawer';
import { useMobile } from '../hooks/useMobile';

export default function Layout({ children }) {
  const isMobile = useMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: isMobile ? 'auto' : 'hidden',
      overflowX: 'hidden',
      background: '#F5F5F7',
      maxWidth: '100vw',
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
        {children}
      </main>

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
