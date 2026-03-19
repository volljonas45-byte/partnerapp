import Sidebar from './Sidebar';

export default function Layout({ children }) {
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: '#F5F5F7',
    }}>
      <Sidebar />
      <main style={{
        flex: 1,
        overflowY: 'auto',
        minWidth: 0,
      }}>
        {children}
      </main>
    </div>
  );
}
