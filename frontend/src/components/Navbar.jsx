import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogOut, CheckCircle2, AlertTriangle, ArrowRight, UserCheck } from 'lucide-react';

export const Navbar = () => {
  const { user, role, signOut, isSupabaseConfigured } = useAuth();
  const navigate = useNavigate();
  const [apiOnline, setApiOnline] = useState(null);

  useEffect(() => {
    const checkApi = async () => {
      try {
        const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
        const apiUrl = rawApiUrl.replace(/\/+$/, '');
        const res = await fetch(`${apiUrl}/api/health`);
        if (res.ok) {
          const data = await res.json();
          setApiOnline(data.status === 'ok');
        } else {
          setApiOnline(false);
        }
      } catch (e) {
        setApiOnline(false);
      }
    };
    checkApi();
    const interval = setInterval(checkApi, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const roleColors = {
    regulator: { badge: 'badge-regulator', label: 'Regulator' },
    institution: { badge: 'badge-institution', label: 'Institution' },
    student: { badge: 'badge-student', label: 'Student' },
    company: { badge: 'badge-company', label: 'Company' },
  };

  const currentRoleMeta = roleColors[role] || { badge: 'badge-default', label: role || 'Guest' };

  return (
    <header className="site-header">
      <div className="header-inner">
        <div className="brand-section">
          <Link to="/" className="brand-link">
            <div className="logo-icon-wrap">
              <ShieldCheck className="logo-icon" size={24} />
            </div>
            <div className="brand-text">
              <span className="brand-title">XYPHER</span>
              <span className="brand-sub">Verify. Trust. Authenticate.</span>
            </div>
          </Link>
        </div>

        <div className="status-pills">
          {/* Express Backend indicator */}
          <div className={`status-pill ${apiOnline ? 'status-pill-success' : 'status-pill-warning'}`} title={apiOnline ? "Express API Healthy" : "Express API Not Connected"}>
            <span className="status-dot"></span>
            <span>Express API: {apiOnline === null ? 'Checking...' : apiOnline ? 'Online' : 'Offline'}</span>
          </div>

          {/* Supabase indicator */}
          <div className={`status-pill ${isSupabaseConfigured ? 'status-pill-success' : 'status-pill-info'}`} title={isSupabaseConfigured ? "Connected to Supabase" : "Using Local Demo Mode"}>
            <span className="status-dot"></span>
            <span>DB: {isSupabaseConfigured ? 'Supabase Connected' : 'Demo / Standby'}</span>
          </div>
        </div>

        <div className="user-controls">
          {user ? (
            <div className="user-logged-box">
              <div className="user-meta">
                <span className="user-email" title={user.email}>{user.email}</span>
                <span className={`role-badge ${currentRoleMeta.badge}`}>
                  <UserCheck size={13} className="badge-icon" />
                  {currentRoleMeta.label}
                </span>
              </div>
              <button onClick={handleLogout} className="logout-btn" title="Sign Out">
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <Link to="/login" className="login-nav-btn">
              <span>Sign In</span>
              <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
