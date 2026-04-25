import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import HubLayout from './components/HubLayout';
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
import BrandingWizard           from './pages/BrandingWizard';
import SocialMediaWizard        from './pages/SocialMediaWizard';
import Intake                   from './pages/Intake';
import IntakePublic             from './pages/IntakePublic';
import Delivery                 from './pages/Delivery';
import Team                    from './pages/Team';
import NewTeamMember           from './pages/NewTeamMember';
import EditTeamMember          from './pages/EditTeamMember';
import DeliveryPublic           from './pages/DeliveryPublic';
import TimeTracking             from './pages/TimeTracking';
import TeamDashboard            from './pages/TeamDashboard';
import CalendarPage             from './pages/Calendar';
import Timeline                from './pages/Timeline';
import WorkOverview            from './pages/WorkOverview';
import SalesEngine             from './pages/SalesEngine';
import SalesAnalytics          from './pages/SalesAnalytics';
import SalesLeadDetail         from './pages/SalesLeadDetail';
import Planning                from './pages/Planning';
import Finance                 from './pages/Finance';
import AdminPartners           from './pages/AdminPartners';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingSpinner className="h-screen" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <Layout>{children}</Layout>;
}

// Dashboard manages its own layout (sidebar included)
function ProtectedRouteNoLayout({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingSpinner className="h-screen" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return children;
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
      <Route path="/" element={<ProtectedRouteNoLayout><Dashboard /></ProtectedRouteNoLayout>} />

      <Route path="/clients"         element={<ProtectedRoute><Clients /></ProtectedRoute>} />
      <Route path="/clients/new"     element={<ProtectedRoute><NewClient /></ProtectedRoute>} />
      <Route path="/clients/:id"     element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />

      {/* ── Hub: Finanzen (Übersicht | Rechnungen | Angebote) ─────────────── */}
      <Route element={<ProtectedRoute><HubLayout tabs={[
        { to: '/finance',  label: 'Übersicht'  },
        { to: '/invoices', label: 'Rechnungen' },
        { to: '/quotes',   label: 'Angebote'   },
      ]} /></ProtectedRoute>}>
        <Route path="/finance"  element={<Finance />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/quotes"   element={<Quotes />} />
      </Route>
      <Route path="/invoices/new" element={<ProtectedRoute><NewInvoice /></ProtectedRoute>} />
      <Route path="/invoices/:id" element={<ProtectedRoute><InvoiceDetail /></ProtectedRoute>} />
      <Route path="/quotes/new"      element={<ProtectedRoute><NewQuote /></ProtectedRoute>} />
      <Route path="/quotes/:id"      element={<ProtectedRoute><QuoteDetail /></ProtectedRoute>} />
      <Route path="/quotes/:id/edit" element={<ProtectedRoute><EditQuote /></ProtectedRoute>} />

      {/* ── Hub: Projekte (Board | Websites | Timeline) ──────────────────── */}
      <Route element={<ProtectedRoute><HubLayout tabs={[
        { to: '/work',     label: 'Board'    },
        { to: '/websites', label: 'Websites' },
        { to: '/timeline', label: 'Timeline' },
      ]} /></ProtectedRoute>}>
        <Route path="/work"     element={<WorkOverview />} />
        <Route path="/websites" element={<Websites />} />
        <Route path="/timeline" element={<Timeline />} />
      </Route>
      <Route path="/planning" element={<ProtectedRoute><Planning /></ProtectedRoute>} />
      <Route path="/projects"     element={<Navigate to="/work" replace />} />
      <Route path="/projects/new" element={<ProtectedRoute><NewProject /></ProtectedRoute>} />
      <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetailGeneral /></ProtectedRoute>} />
      <Route path="/websites/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />

      {/* ── Hub: Zeit & Team (Kalender | Zeiterfassung | Workload) ────────── */}
      <Route element={<ProtectedRoute><HubLayout tabs={[
        { to: '/calendar',       label: 'Kalender'      },
        { to: '/time-tracking',  label: 'Zeiterfassung' },
        { to: '/team-dashboard', label: 'Workload'      },
      ]} /></ProtectedRoute>}>
        <Route path="/calendar"       element={<CalendarPage />} />
        <Route path="/time-tracking"  element={<TimeTracking />} />
        <Route path="/team-dashboard" element={<TeamDashboard />} />
      </Route>

      {/* ── Hub: Sales (Pipeline | Analytics) ─────────────────────────────── */}
      <Route element={<ProtectedRoute><HubLayout tabs={[
        { to: '/sales',           label: 'Pipeline'  },
        { to: '/sales/analytics', label: 'Analytics' },
      ]} /></ProtectedRoute>}>
        <Route path="/sales"           element={<SalesEngine />} />
        <Route path="/sales/analytics" element={<SalesAnalytics />} />
      </Route>
      <Route path="/sales/leads/:id"  element={<ProtectedRoute><SalesLeadDetail /></ProtectedRoute>} />

      {/* ── Hub: Workflow (Intake | Übergabe | Onboarding) ────────────────── */}
      <Route element={<ProtectedRoute><HubLayout tabs={[
        { to: '/intake',     label: 'Intake'     },
        { to: '/delivery',   label: 'Übergabe'   },
        { to: '/onboarding', label: 'Onboarding', match: ['/onboarding'] },
      ]} /></ProtectedRoute>}>
        <Route path="/intake"          element={<Intake />} />
        <Route path="/delivery"        element={<Delivery />} />
        <Route path="/onboarding"      element={<OnboardingTemplates />} />
        <Route path="/onboarding/flows" element={<OnboardingFlows />} />
      </Route>
      <Route path="/onboarding/templates/:id" element={<ProtectedRoute><OnboardingTemplateBuilder /></ProtectedRoute>} />

      <Route path="/admin/partners"   element={<ProtectedRoute><AdminPartners /></ProtectedRoute>} />
      <Route path="/wizard"              element={<ProtectedRoute><Wizard /></ProtectedRoute>} />
      <Route path="/wizard/branding"     element={<ProtectedRoute><BrandingWizard /></ProtectedRoute>} />
      <Route path="/wizard/social-media" element={<ProtectedRoute><SocialMediaWizard /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/team"           element={<ProtectedRoute><Team /></ProtectedRoute>} />
      <Route path="/team/invite"    element={<ProtectedRoute><NewTeamMember /></ProtectedRoute>} />
      <Route path="/team/:id/edit"  element={<ProtectedRoute><EditTeamMember /></ProtectedRoute>} />

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
