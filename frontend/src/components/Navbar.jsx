import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogOut, UserCheck, Menu, X, ArrowRight, LayoutDashboard } from 'lucide-react';
import { XypherSpinningLogo } from './XypherSpinningLogo';

export const Navbar = () => {
  const { user, role, signOut, getDashboardPath } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [apiOnline, setApiOnline] = useState(null);
  const [dbConnected, setDbConnected] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkApi = async () => {
      try {
        const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
        const apiUrl = rawApiUrl.replace(/\/+$/, '');
        const res = await fetch(`${apiUrl}/api/health`);
        if (res.ok) {
          const data = await res.json();
          setApiOnline(true);
          setDbConnected(Boolean(data.database?.connected));
        } else {
          setApiOnline(false);
          setDbConnected(false);
        }
      } catch (e) {
        setApiOnline(false);
        setDbConnected(false);
      }
    };
    checkApi();
    const interval = setInterval(checkApi, 10000);
    return () => clearInterval(interval);
  }, []);

  // Close mobile drawer on route navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

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
  const dashboardLink = role ? getDashboardPath(role) : '/login';

  // Public XYPHER pages have their own dedicated, modern xypher-header
  if (
    location.pathname === '/' ||
    location.pathname === '/verify' ||
    location.pathname === '/login' ||
    location.pathname === '/signup'
  ) {
    return null;
  }

  return (
    <header className="proto-header site-header" role="banner">
      <div className="nav">
        {/* Brand logo */}
        <div className="logo">
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'inherit', textDecoration: 'none' }}>
            <XypherSpinningLogo size={28} />
            <span style={{ fontWeight: 800, letterSpacing: '0.12em' }}>XYPHER</span>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <nav aria-label="Main Navigation">
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><a href="/#architecture">Architecture</a></li>
            <li><Link to="/verify">Verify</Link></li>
            <li><Link to="/login">Role Portals ▾</Link></li>
          </ul>
        </nav>

        {/* Telemetry / Status pills */}
        <div className="status-pills">
          <div
            className={`status-pill ${apiOnline ? 'status-pill-success' : 'status-pill-warning'}`}
            title={apiOnline ? 'Express API Healthy' : 'Express API Not Connected'}
          >
            <span className="status-dot"></span>
            <span>API: {apiOnline === null ? 'Checking...' : apiOnline ? 'Online' : 'Offline'}</span>
          </div>

          <div
            className={`status-pill ${dbConnected ? 'status-pill-success' : 'status-pill-info'}`}
            title={dbConnected ? 'Connected to Neon PostgreSQL' : 'Database in Standby / Demo Mode'}
          >
            <span className="status-dot"></span>
            <span>DB: {dbConnected === null ? 'Checking...' : dbConnected ? 'Neon Active' : 'Standby'}</span>
          </div>
        </div>

        {/* User controls / Auth actions */}
        <div className="user-controls">
          {user ? (
            <div className="user-logged-box" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Link to={dashboardLink} className="btn" title="Open Your Dashboard" style={{ padding: '10px 18px' }}>
                Dashboard
              </Link>
              <div className="user-meta">
                <span className={`role-badge ${currentRoleMeta.badge}`}>
                  <UserCheck size={13} className="badge-icon" />
                  {currentRoleMeta.label}
                </span>
              </div>
              <button onClick={handleLogout} className="btn" title="Sign Out" style={{ padding: '10px 16px', opacity: 0.8 }}>
                Logout
              </button>
            </div>
          ) : (
            <div className="auth-nav-actions">
              <Link to="/login" className="btn" id="nav-get-started-btn">
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            className="mobile-menu-toggle"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-drawer"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div id="mobile-navigation-drawer" className="mobile-nav-drawer" role="navigation">
          <nav className="mobile-nav-links">
            <a href="/#overview" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>
              Overview
            </a>
            <a href="/#architecture" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>
              Architecture
            </a>
            <Link to="/verify" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>
              Verify a Certificate
            </Link>
            <hr className="mobile-nav-divider" />
            {user ? (
              <>
                <Link to={dashboardLink} className="mobile-nav-item mobile-nav-highlight" onClick={() => setMobileMenuOpen(false)}>
                  <LayoutDashboard size={16} />
                  <span>Go to {currentRoleMeta.label} Dashboard</span>
                </Link>
                <button
                  type="button"
                  className="mobile-nav-item mobile-nav-logout"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                >
                  <LogOut size={16} />
                  <span>Logout ({user.email})</span>
                </button>
              </>
            ) : (
              <Link to="/login" className="mobile-nav-item mobile-nav-highlight" onClick={() => setMobileMenuOpen(false)}>
                <span>Sign In to Role Portal</span>
                <ArrowRight size={16} />
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};
