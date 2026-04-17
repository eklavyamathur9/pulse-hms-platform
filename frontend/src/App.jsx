import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import Login from './components/Login';
import Layout from './components/Layout';
import PatientDashboard from './components/PatientDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import StaffDashboard from './components/StaffDashboard';
import AdminDashboard from './components/AdminDashboard';

const ProtectedRoute = ({ children, role, toggleTheme, theme }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" />;
  if (role && user.role !== role) return <Navigate to="/" />;
  return <Layout toggleTheme={toggleTheme} theme={theme}>{children}</Layout>;
};

function AppRoutes({ toggleTheme, theme }) {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={`/${user.role}`} /> : <Login />} />
      <Route path="/patient" element={<ProtectedRoute role="patient" toggleTheme={toggleTheme} theme={theme}><PatientDashboard /></ProtectedRoute>} />
      <Route path="/doctor" element={<ProtectedRoute role="doctor" toggleTheme={toggleTheme} theme={theme}><DoctorDashboard /></ProtectedRoute>} />
      <Route path="/staff" element={<ProtectedRoute role="staff" toggleTheme={toggleTheme} theme={theme}><StaffDashboard /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute role="admin" toggleTheme={toggleTheme} theme={theme}><AdminDashboard /></ProtectedRoute>} />
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
