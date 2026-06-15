import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import Login from './components/Login';
import Layout from './components/Layout';
import LandingPage from './components/LandingPage';
import HospitalRegistration from './components/HospitalRegistration';
import ErrorBoundary from './components/ErrorBoundary';

const PatientDashboard = lazy(() => import('./components/PatientDashboard'));
const DoctorDashboard = lazy(() => import('./components/DoctorDashboard'));
const StaffDashboard = lazy(() => import('./components/StaffDashboard'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const SuperAdminDashboard = lazy(() => import('./components/SuperAdminDashboard'));

const ProtectedRoute = ({ children, role, toggleTheme, theme }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/login" />;
  return <Layout toggleTheme={toggleTheme} theme={theme}>{children}</Layout>;
};

function AppRoutes({ toggleTheme, theme }) {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={`/${user.role}`} /> : <LandingPage />} />
      <Route path="/login" element={user ? <Navigate to={`/${user.role}`} /> : <Login />} />
      <Route path="/register-hospital" element={user ? <Navigate to={`/${user.role}`} /> : <HospitalRegistration />} />
      <Route path="/patient" element={<ProtectedRoute role="patient" toggleTheme={toggleTheme} theme={theme}><ErrorBoundary><Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}><PatientDashboard /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path="/doctor" element={<ProtectedRoute role="doctor" toggleTheme={toggleTheme} theme={theme}><ErrorBoundary><Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}><DoctorDashboard /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path="/staff" element={<ProtectedRoute role="staff" toggleTheme={toggleTheme} theme={theme}><ErrorBoundary><Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}><StaffDashboard /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute role="admin" toggleTheme={toggleTheme} theme={theme}><ErrorBoundary><Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}><AdminDashboard /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path="/superadmin" element={<ProtectedRoute role="superadmin" toggleTheme={toggleTheme} theme={theme}><ErrorBoundary><Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}><SuperAdminDashboard /></Suspense></ErrorBoundary></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  const [theme, setTheme] = React.useState(localStorage.getItem('theme') || 'light');

  React.useEffect(() => {
    document.body.className = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <AuthProvider>
      <NotificationProvider>
        <SocketProvider>
          <Router>
            <AppRoutes toggleTheme={toggleTheme} theme={theme} />
          </Router>
        </SocketProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
