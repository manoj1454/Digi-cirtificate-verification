import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ allowedRole, children }) => {
  const { user, role, loading, getDashboardPath } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-loading-screen">
        <div className="cyber-spinner"></div>
        <p className="loading-text">Verifying security credentials...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If a specific role is required and current user role does not match
  if (allowedRole && role && role !== allowedRole) {
    console.warn(`Unauthorized role access: ${role} tried to access ${allowedRole} dashboard`);
    return <Navigate to={getDashboardPath(role)} replace />;
  }

  return children;
};
