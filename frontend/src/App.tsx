import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import useThemeStore from './stores/useThemeStore';
import NotificationRenderer from './components/NotificationRenderer';
import Login from './components/Login';
import Layout from './components/Layout';
import LandingPage from './components/LandingPage';
import HospitalRegistration from './components/HospitalRegistration';
import ErrorBoundary from './components/ErrorBoundary';
import { DashboardSkeleton } from './components/common/Skeleton';
import type { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

const PatientDashboard = lazy(() => import('./components/PatientDashboard'));
const DoctorDashboard = lazy(() => import('./components/DoctorDashboard'));
const StaffDashboard = lazy(() => import('./components/StaffDashboard'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const SuperAdminDashboard = lazy(() => import('./components/SuperAdminDashboard'));

interface ProtectedRouteProps {
  children: ReactNode;
  role: string;
  toggleTheme: () => void;
  theme: string;
}

const ProtectedRoute = ({ children, role, toggleTheme, theme }: ProtectedRouteProps) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/login" />;
  return <Layout toggleTheme={toggleTheme} theme={theme}>{children}</Layout>;
};

interface AppRoutesProps {
  toggleTheme: () => void;
  theme: string;
}

function AppRoutes({ toggleTheme, theme }: AppRoutesProps) {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={`/${user.role}`} /> : <LandingPage />} />
      <Route path="/login" element={user ? <Navigate to={`/${user.role}`} /> : <Login />} />
      <Route path="/register-hospital" element={user ? <Navigate to={`/${user.role}`} /> : <HospitalRegistration />} />
      <Route path="/patient" element={<ProtectedRoute role="patient" toggleTheme={toggleTheme} theme={theme}><ErrorBoundary><Suspense fallback={<DashboardSkeleton rows={5} />}><PatientDashboard /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path="/doctor" element={<ProtectedRoute role="doctor" toggleTheme={toggleTheme} theme={theme}><ErrorBoundary><Suspense fallback={<DashboardSkeleton rows={3} />}><DoctorDashboard /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path="/staff" element={<ProtectedRoute role="staff" toggleTheme={toggleTheme} theme={theme}><ErrorBoundary><Suspense fallback={<DashboardSkeleton rows={3} />}><StaffDashboard /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute role="admin" toggleTheme={toggleTheme} theme={theme}><ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><AdminDashboard /></Suspense></ErrorBoundary></ProtectedRoute>} />
      <Route path="/superadmin" element={<ProtectedRoute role="superadmin" toggleTheme={toggleTheme} theme={theme}><ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><SuperAdminDashboard /></Suspense></ErrorBoundary></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  React.useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <Router>
            <AppRoutes toggleTheme={toggleTheme} theme={theme} />
          </Router>
          <NotificationRenderer />
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
