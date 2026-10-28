import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import UserDetails from './pages/UserDetails';
import Settings from './pages/Settings';
import FundRequests from './pages/FundRequests';
import KycReview from './pages/KycReview';
import Payouts from './pages/Payouts';
import Transactions from './pages/Transactions';
import Wallets from './pages/Wallets';
import Reports from './pages/Reports';
import ApiUsage from './pages/ApiUsage';
import Webhooks from './pages/Webhooks';
import Developers from './pages/Developers';
import ApiPartnerReference from './pages/ApiPartnerReference';
import ActivityLogs from './pages/ActivityLogs';
import AppSettings from './pages/AppSettings';
import Support from './pages/Support';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'superadmin') return <Navigate to="/login" replace />;

  return children;
};

// Public Route Component (redirects to dashboard if logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>;
  if (user) return <Navigate to="/dashboard" />;
  return children;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster />
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
          <Route path="/users/:id/details" element={<ProtectedRoute><UserDetails /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/app-settings" element={<ProtectedRoute><AppSettings /></ProtectedRoute>} />
          <Route path="/fund-requests" element={<ProtectedRoute><FundRequests /></ProtectedRoute>} />
          <Route path="/kyc" element={<ProtectedRoute><KycReview /></ProtectedRoute>} />
          <Route path="/payouts" element={<ProtectedRoute><Payouts /></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
          <Route path="/wallets" element={<ProtectedRoute><Wallets /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/api-usage" element={<ProtectedRoute><ApiUsage /></ProtectedRoute>} />
          <Route path="/webhooks" element={<ProtectedRoute><Webhooks /></ProtectedRoute>} />
          <Route path="/developers" element={<ProtectedRoute><Developers /></ProtectedRoute>} />
          <Route path="/api-partner-reference" element={<ProtectedRoute><ApiPartnerReference /></ProtectedRoute>} />
          <Route path="/activity-logs" element={<ProtectedRoute><ActivityLogs /></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />

          {/* Default Route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
