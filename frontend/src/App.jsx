import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthPage } from './pages/AuthPage';
import { RegulatorDashboard } from './pages/dashboards/RegulatorDashboard';
import { InstitutionDashboard } from './pages/dashboards/InstitutionDashboard';
import { StudentDashboard } from './pages/dashboards/StudentDashboard';
import { CompanyDashboard } from './pages/dashboards/CompanyDashboard';

// Root redirect handler
const RootRedirect = () => {
  const { user, role, loading, getDashboardPath } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading-screen">
        <div className="cyber-spinner"></div>
        <p className="loading-text">Loading platform credentials...</p>
      </div>
    );
  }

  if (user && role) {
    return <Navigate to={getDashboardPath(role)} replace />;
  }

  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <Routes>
              {/* Root redirect */}
              <Route path="/" element={<RootRedirect />} />

              {/* Public Auth Routes */}
              <Route path="/login" element={<AuthPage />} />
              <Route path="/signup" element={<AuthPage />} />

              {/* Protected Role-specific Dashboards */}
              <Route
                path="/regulator"
                element={
                  <ProtectedRoute allowedRole="regulator">
                    <RegulatorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/institution"
                element={
                  <ProtectedRoute allowedRole="institution">
                    <InstitutionDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student"
                element={
                  <ProtectedRoute allowedRole="student">
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/company"
                element={
                  <ProtectedRoute allowedRole="company">
                    <CompanyDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
