import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Apply from './pages/Apply';
import Pending from './pages/Pending';
import Dashboard from './pages/Dashboard';
import MyLeads from './pages/MyLeads';
import LeadPool from './pages/LeadPool';
import Appointments from './pages/Appointments';
import Earnings from './pages/Earnings';
import CompleteProfile from './pages/CompleteProfile';

const qc = new QueryClient();

const BG = '#0D0D12';

function Layout({ children }) {
  return (
    <div style={{ display: 'flex', height: '100vh', background: BG, overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minWidth: 0, height: '100%' }}>
        {children}
      </main>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, isApproved } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isApproved) return <Navigate to="/pending" replace />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { isAuthenticated, isApproved, isPending } = useAuth();
  return (
    <Routes>
      <Route path="/login"   element={isAuthenticated && isApproved ? <Navigate to="/" replace /> : isAuthenticated && isPending ? <Navigate to="/pending" replace /> : <Login />} />
      <Route path="/apply"   element={isAuthenticated && isApproved ? <Navigate to="/" replace /> : <Apply />} />
      <Route path="/pending"          element={<Pending />} />
      <Route path="/complete-profile" element={<CompleteProfile />} />

      <Route path="/"             element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/leads/mine"   element={<ProtectedRoute><MyLeads /></ProtectedRoute>} />
      <Route path="/leads/pool"   element={<ProtectedRoute><LeadPool /></ProtectedRoute>} />
      <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
      <Route path="/earnings"     element={<ProtectedRoute><Earnings /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
