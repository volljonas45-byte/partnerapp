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
      background: '#F5F5F7',
    }}>
      {/* Sidebar — nur Desktop */}
      {!isMobile && <Sidebar />}

      {/* Hauptinhalt */}
      <main style={{
        flex: 1,
        overflowY: isMobile ? 'auto' : 'auto',
        minWidth: 0,
        // Platz für Bottom Nav auf Mobil
        paddingBottom: isMobile ? 64 : 0,
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
