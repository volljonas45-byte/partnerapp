import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

// Pages
import Login         from './pages/Login';
import Dashboard     from './pages/Dashboard';
import Clients       from './pages/Clients';
import NewClient     from './pages/NewClient';
import ClientDetail  from './pages/ClientDetail';
import Invoices      from './pages/Invoices';
import NewInvoice    from './pages/NewInvoice';
import InvoiceDetail from './pages/InvoiceDetail';
import Quotes        from './pages/Quotes';
import NewQuote      from './pages/NewQuote';
import QuoteDetail   from './pages/QuoteDetail';
import EditQuote     from './pages/EditQuote';
import Settings      from './pages/Settings';
import Projects      from './pages/Projects';
import Websites     from './pages/Websites';
import NewProject    from './pages/NewProject';
import ProjectDetail from './pages/ProjectDetail';
import ProjectDetailGeneral from './pages/ProjectDetailGeneral';
import OnboardingTemplates      from './pages/OnboardingTemplates';
import OnboardingTemplateBuilder from './pages/OnboardingTemplateBuilder';
import OnboardingFlows          from './pages/OnboardingFlows';
import OnboardingClient         from './pages/OnboardingClient';
import Wizard                   from './pages/Wizard';
import Intake                   from './pages/Intake';
import IntakePublic             from './pages/IntakePublic';
import Delivery                 from './pages/Delivery';
import Team                    from './pages/Team';
import NewTeamMember           from './pages/NewTeamMember';
import DeliveryPublic           from './pages/DeliveryPublic';
import TimeTracking             from './pages/TimeTracking';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingSpinner className="h-screen" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingSpinner className="h-screen" />;

  return (
    <Routes>
      {/* Öffentlich */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />

      {/* Geschützt */}
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

      <Route path="/clients"         element={<ProtectedRoute><Clients /></ProtectedRoute>} />
      <Route path="/clients/new"     element={<ProtectedRoute><NewClient /></ProtectedRoute>} />
      <Route path="/clients/:id"     element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />

      <Route path="/invoices"     element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
      <Route path="/invoices/new" element={<ProtectedRoute><NewInvoice /></ProtectedRoute>} />
      <Route path="/invoices/:id" element={<ProtectedRoute><InvoiceDetail /></ProtectedRoute>} />

      <Route path="/quotes"          element={<ProtectedRoute><Quotes /></ProtectedRoute>} />
      <Route path="/quotes/new"      element={<ProtectedRoute><NewQuote /></ProtectedRoute>} />
      <Route path="/quotes/:id"      element={<ProtectedRoute><QuoteDetail /></ProtectedRoute>} />
      <Route path="/quotes/:id/edit" element={<ProtectedRoute><EditQuote /></ProtectedRoute>} />

      <Route path="/projects"     element={<ProtectedRoute><Projects /></ProtectedRoute>} />
      <Route path="/projects/new" element={<ProtectedRoute><NewProject /></ProtectedRoute>} />
      <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetailGeneral /></ProtectedRoute>} />

      <Route path="/websites"     element={<ProtectedRoute><Websites /></ProtectedRoute>} />
      <Route path="/websites/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />

      <Route path="/time-tracking" element={<ProtectedRoute><TimeTracking /></ProtectedRoute>} />
      <Route path="/wizard"   element={<ProtectedRoute><Wizard /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/team"        element={<ProtectedRoute><Team /></ProtectedRoute>} />
      <Route path="/team/invite" element={<ProtectedRoute><NewTeamMember /></ProtectedRoute>} />

      <Route path="/onboarding"                    element={<ProtectedRoute><OnboardingTemplates /></ProtectedRoute>} />
      <Route path="/onboarding/templates/:id"       element={<ProtectedRoute><OnboardingTemplateBuilder /></ProtectedRoute>} />
      <Route path="/onboarding/flows"               element={<ProtectedRoute><OnboardingFlows /></ProtectedRoute>} />

      <Route path="/intake"    element={<ProtectedRoute><Intake /></ProtectedRoute>} />
      <Route path="/delivery"  element={<ProtectedRoute><Delivery /></ProtectedRoute>} />

      {/* Public — no auth, no Layout */}
      <Route path="/onboarding/:token"    element={<OnboardingClient />} />
      <Route path="/intake/fill/:token"   element={<IntakePublic />} />
      <Route path="/delivery/view/:token" element={<DeliveryPublic />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
