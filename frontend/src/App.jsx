import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import SystemStatus from './components/SystemStatus';
import ScrollToTop from './components/ScrollToTop';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import Footer from './components/Footer';
import GSTCalculator from './pages/GSTCalculator';
import Pricing from './pages/Pricing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  About, Docs, TrackStatus, Refund, Privacy, Terms, Contact, Apply
} from './pages/StaticPages';
import { Toaster } from 'react-hot-toast';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  return children;
};

// Public Route Component (redirects to dashboard if logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (user) return <Navigate to="/dashboard" />;
  return children;
}

// Every top-level prefix that renders <Dashboard /> (kept in sync with the
// <Route> list below) - used only to decide whether the public
// Footer/BottomNav should be hidden, same as the old '/dashboard'-only check.
const DASHBOARD_PATH_PREFIXES = ['/dashboard', '/wallet', '/payouts', '/analytics', '/developers', '/activity', '/reports', '/security', '/account', '/support'];

function AppContent() {
  const location = useLocation();
  const isDashboard = DASHBOARD_PATH_PREFIXES.some((prefix) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`));

  return (
    <>
      <Toaster />
      <ScrollToTop />
      <SystemStatus />

      {/* Main Content */}
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Auth Routes */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />

        {/* Protected Routes */}
        {/* Dashboard owns its own internal section navigation (sidebar),
            deriving the active section from the URL (see viewFromPath in
            Dashboard.jsx) - each of these prefixes renders the same
            component, which then reads location.pathname itself. This is
            what lets a refresh/direct link/back-forward on e.g.
            /payouts/create or /account/profile land on that exact section
            instead of resetting to the dashboard overview. */}
        <Route path="/dashboard/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/wallet/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/payouts/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/analytics/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/developers/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/activity/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/reports/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/security/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/account/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/support/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

        {/* Public / Service Pages */}
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/about" element={<About />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/gst-calculator" element={<GSTCalculator />} />
        <Route path="/track-status" element={<TrackStatus />} />
        <Route path="/refund" element={<Refund />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/apply" element={<Apply />} />
      </Routes>

      {/* Footer & Bottom Navigation (hidden on dashboard) */}
      {!isDashboard && (
        <>
          <Footer />
          <BottomNav />
        </>
      )}
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
