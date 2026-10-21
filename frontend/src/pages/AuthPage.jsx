import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Building2,
  GraduationCap,
  Briefcase,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Shield,
  Layers,
  Check,
  ChevronDown,
  Menu,
  X,
  Cpu,
  Database,
  Server,
  Activity,
  FileCheck,
  Network,
  AlertTriangle,
} from 'lucide-react';
import { XypherArchitectureDiagram } from '../components/XypherArchitectureDiagram';
import { Footer } from '../components/Footer';
import { shouldUse3DHero } from '../lib/deviceDetection';
import { XypherSpinningLogo } from '../components/XypherSpinningLogo';
import { XypherLedgerMatrixFallback } from '../components/XypherLedgerMatrixFallback';
import './login-page.css';

// Code-split the 3D Ledger Matrix Scene adapted from 3d-landing-page-main
const XypherLedgerMatrix3D = lazy(() => import('../components/XypherLedgerMatrix3D'));

// Standard Demo Accounts configured for one-click evaluation
export const DEMO_ACCOUNTS = {
  regulator: {
    email: 'demo.regulator@xypher.demo',
    title: 'Regulator',
  },
  institution: {
    email: 'demo.institution@xypher.demo',
    title: 'Institution',
  },
  student: {
    email: 'demo.student@xypher.demo',
    title: 'Student',
  },
  company: {
    email: 'demo.company@xypher.demo',
    title: 'Company',
  },
};

/**
 * Retrieve demo password from Vite environment variables (VITE_ prefix required for browser visibility)
 * Supports role-specific overrides (e.g. VITE_DEMO_REGULATOR_PASSWORD) or fallback VITE_DEMO_PASSWORD.
 */
export const getDemoPasswordForRole = (roleId) => {
  const roleUpper = roleId.toUpperCase();
  return (
    import.meta.env[`VITE_DEMO_${roleUpper}_PASSWORD`] ||
    import.meta.env.VITE_DEMO_PASSWORD ||
    ''
  );
};

export const AuthPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signIn, signUp, user, role, getDashboardPath, loginAsDemoRole } = useAuth();

  const [isSignUp, setIsSignUp] = useState(location.pathname === '/signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('student');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [demoNotice, setDemoNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authState, setAuthState] = useState('idle'); // 'idle' | 'authenticating' | 'verified' | 'error'
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // WebGL 3D capability detection
  const [canRender3D, setCanRender3D] = useState(() => shouldUse3DHero());

  // Identity Weaver Synthesis State (Snap animation)
  const [isSynthesized, setIsSynthesized] = useState(false);

  // Extra profile fields for signup
  const [institutionName, setInstitutionName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [rollNumber, setRollNumber] = useState('');

  // Sync mode with pathname changes
  useEffect(() => {
    setIsSignUp(location.pathname === '/signup');
  }, [location.pathname]);

  // Check 3D WebGL support
  useEffect(() => {
    setCanRender3D(shouldUse3DHero());
  }, []);

  // Auto-play the Identity Weaver animation when visitor opens the page
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSynthesized(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Only auto-redirect if already authenticated and not currently transitioning
  useEffect(() => {
    if (user && role && authState !== 'authenticating' && authState !== 'verified') {
      const target = getDashboardPath(role);
      navigate(target, { replace: true });
    }
  }, [user, role, navigate, getDashboardPath, authState]);

  const rolesList = [
    {
      id: 'regulator',
      title: 'Regulator',
      subtitle: 'Accreditation & compliance authority',
      icon: ShieldCheck,
    },
    {
      id: 'institution',
      title: 'Institution',
      subtitle: 'Accredited university or college',
      icon: Building2,
    },
    {
      id: 'student',
      title: 'Student',
      subtitle: 'Graduate / Credential recipient',
      icon: GraduationCap,
    },
    {
      id: 'company',
      title: 'Company',
      subtitle: 'Employer or verifying entity',
      icon: Briefcase,
    },
  ];

  /**
   * Handle Role Card Click:
   * 1. Updates active selected role.
   * 2. In Sign-In mode, automatically populates email and configured demo password.
   * 3. Does NOT automatically submit or log in.
   * 4. If demo password is not configured, provides a helpful explanation.
   */
  const handleRoleCardClick = (roleId) => {
    setSelectedRole(roleId);
    setErrorMsg('');

    if (!isSignUp) {
      const demoAccount = DEMO_ACCOUNTS[roleId];
      if (demoAccount) {
        setEmail(demoAccount.email);
        const configuredPassword = getDemoPasswordForRole(roleId);
        if (configuredPassword) {
          setPassword(configuredPassword);
          setDemoNotice(
            `Demo credentials loaded for ${demoAccount.title}. Click "Sign In to Dashboard" to log in.`
          );
        } else {
          setPassword('');
          setDemoNotice(
            `Demo email populated (${demoAccount.email}). Demo password is not configured in environment variables (VITE_DEMO_PASSWORD). Please enter password manually.`
          );
        }
      }
    }
  };

  const handleDemoPillClick = async (roleId) => {
    setIsSignUp(false);
    handleRoleCardClick(roleId);
    handleScrollToAuth();

    // Instant demo evaluation resolution
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    setAuthState('authenticating');
    try {
      if (typeof loginAsDemoRole === 'function') {
        loginAsDemoRole(roleId);
      }
      setAuthState('verified');

      if (prefersReducedMotion) {
        navigate(getDashboardPath(roleId));
      } else {
        await new Promise((r) => setTimeout(r, 650));
        navigate(getDashboardPath(roleId));
      }
    } catch (err) {
      console.warn('Demo login transition note:', err);
    }
  };

  const handleScrollToAuth = () => {
    const el = document.getElementById('auth-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleTriggerSynthesis = () => {
    setIsSynthesized((prev) => !prev);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);
    setAuthState('authenticating');

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    try {
      if (isSignUp) {
        const extraData = {};
        if (selectedRole === 'institution') {
          extraData.institutionName = institutionName;
          extraData.registrationNumber = registrationNumber;
        } else if (selectedRole === 'student') {
          extraData.fullName = fullName;
          extraData.rollNumber = rollNumber;
        }

        await signUp(email, password, selectedRole, extraData);
        setAuthState('verified');
        setSuccessMsg(
          'Signup successful! Account created and mapped to authorized role.'
        );

        if (prefersReducedMotion) {
          navigate(getDashboardPath(selectedRole));
        } else {
          await new Promise((r) => setTimeout(r, 650));
          navigate(getDashboardPath(selectedRole));
        }
      } else {
        await signIn(email, password);
        setAuthState('verified');

        if (prefersReducedMotion) {
          navigate(getDashboardPath(role || selectedRole));
        } else {
          await new Promise((r) => setTimeout(r, 650));
          navigate(getDashboardPath(role || selectedRole));
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setAuthState('error');
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
      setTimeout(() => {
        setAuthState('idle');
      }, 700);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Smooth Anchor Navigation Handler:
   * Handles smooth-scrolling to any on-page section while maintaining
   * keyboard accessibility and updating the browser URL hash cleanly.
   */
  const handleNavClick = (e, targetId, closeMobile = false) => {
    e.preventDefault();
    if (closeMobile) {
      setMobileNavOpen(false);
    }
    if (targetId === 'overview') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', '#overview');
      }
      return;
    }
    const resolvedId = (targetId === 'sign-in' && typeof window !== 'undefined' && window.innerWidth < 768)
      ? 'auth-section'
      : targetId;
    const target = document.getElementById(resolvedId) || document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', `#${targetId}`);
      }
    }
  };

  // Scroll to hash target or /verify route on initial load or route transition
  useEffect(() => {
    if (location.pathname === '/verify') {
      const el = document.getElementById('verify');
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    } else if (window.location.hash) {
      const id = window.location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    }
  }, [location.pathname, location.hash]);

  return (
    <div className="xypher-login-page">
      {/* =========================================================================
          1. HEADER & NAVIGATION: Dark, Opaque, High-Contrast Glassmorphic Nav
          ========================================================================= */}
      <header className="xypher-header">
        <Link className="xypher-brand" to="/" aria-label="XYPHER home">
          <span className="xypher-brand-mark" aria-hidden="true">
            <XypherSpinningLogo size={32} />
          </span>
          <span className="xypher-brand-copy">
            <strong>XYPHER</strong>
            <small>VERIFY. TRUST. AUTHENTICATE.</small>
          </span>
        </Link>
        <nav className="xypher-nav" aria-label="Main navigation">
          <a href="#overview" onClick={(e) => handleNavClick(e, 'overview')}>Overview</a>
          <a href="#architecture" onClick={(e) => handleNavClick(e, 'architecture')}>Architecture</a>
          <a href="#sign-in" onClick={(e) => handleNavClick(e, 'sign-in')}>Sign In</a>
        </nav>
        <div className="xypher-header-actions">
          <a
            className="xypher-header-cta"
            href="#sign-in"
            id="header-portal-cta"
            onClick={(e) => handleNavClick(e, 'sign-in')}
          >
            Access portal <span aria-hidden="true">↗</span>
          </a>
          <button
            type="button"
            className="xypher-mobile-toggle"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((prev) => !prev)}
          >
            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="xypher-mobile-drawer" role="navigation" aria-label="Mobile Navigation">
          <a href="#overview" onClick={(e) => handleNavClick(e, 'overview', true)}>Overview</a>
          <a href="#architecture" onClick={(e) => handleNavClick(e, 'architecture', true)}>Architecture</a>
          <a
            href="#sign-in"
            className="mobile-highlight"
            onClick={(e) => handleNavClick(e, 'sign-in', true)}
          >
            Sign In to Role Portal →
          </a>
        </div>
      )}

      {/* =========================================================================
          2. THE HERO SECTION: 3D Ledger Matrix Animation from Reference Repository
          ========================================================================= */}
      <section className="xypher-hero landing-hero-section" id="overview">
        {/* Real 3D Interactive Scene adapted from 3d-landing-page-main */}
        <div className="xypher-hero-3d-bg" id="matrix">
          {canRender3D ? (
            <Suspense fallback={<XypherLedgerMatrixFallback />}>
              <XypherLedgerMatrix3D />
            </Suspense>
          ) : (
            <XypherLedgerMatrixFallback />
          )}
        </div>

        <div className="xypher-hero-grid" aria-hidden="true" />
        <div className="xypher-hero-glow" aria-hidden="true" />

        <div className="xypher-hero-copy">
          <p className="xypher-eyebrow">
            <span /> DIGITAL CREDENTIAL INFRASTRUCTURE // LIVE LEDGER
          </p>
          <h1 className="landing-hero-title">
            <span className="xy-title-brand">XYPHER —</span>
            <span className="xy-title-line">Blockchain-Based</span>
            <span className="xy-title-line">Academic Credential</span>
            <span className="xy-title-line">Verification with</span>
            <em className="xy-title-accent">Issuer Accreditation Tracking</em>
          </h1>
          <p className="xypher-hero-description">
            Issue, manage, and cryptographically verify academic qualifications with
            tamper-evident blockchain anchors, accredited institutional signatures,
            and zero-trust integrity verification.
          </p>
          <div className="xypher-hero-actions">
            <a
              className="xypher-primary-cta"
              id="hero-signin-btn"
              href="#sign-in"
              onClick={(e) => handleNavClick(e, 'sign-in')}
            >
              Access Role Portal <span aria-hidden="true">↘</span>
            </a>
            <a
              className="xypher-secondary-cta"
              id="hero-arch-btn"
              href="#architecture"
              onClick={(e) => handleNavClick(e, 'architecture')}
            >
              Explore Architecture <span aria-hidden="true">↘</span>
            </a>
          </div>
          <div className="xypher-hero-proof">
            <span className="xypher-proof-dot" />
            Autonomous Ledger Verification Nodes Synchronized
          </div>
        </div>

        <a
          className="xypher-scroll-cue"
          href="#architecture"
          aria-label="Scroll to architecture"
          onClick={(e) => handleNavClick(e, 'architecture')}
        >
          <span className="xypher-scroll-line" />
          <span>EXPLORE ARCHITECTURE</span>
        </a>
        <div className="xypher-hero-index" aria-hidden="true">01 / OVERVIEW</div>
      </section>

      {/* =========================================================================
          2.5. SYSTEM ARCHITECTURE & TECHNICAL SECURITY TOPOLOGY
          ========================================================================= */}
      <XypherArchitectureDiagram />

      {/* =========================================================================
          3. THE ACCESS PORTAL: Glassmorphism Login Interface
          ========================================================================= */}
      <section className="xypher-auth-section" id="sign-in">
        <div className="xypher-auth-container">
          <div className="xypher-auth-heading">
          <p className="xypher-eyebrow">
            <span /> SECURE PORTAL
          </p>
          <h2>
            Your credentials.<br />
            <em>Your access.</em>
          </h2>
          <p>Choose your authorized role and continue to your XYPHER workspace.</p>
        </div>

        <div className="xypher-auth-card auth-card" id="auth-section">
          <div
            className={`xy-glass-card ${
              authState === 'error' ? 'auth-card-shake' : ''
            } ${authState === 'verified' ? 'auth-card-verifying' : ''}`}
            id="auth-glass-panel"
          >
            {/* Authentication Success Resolve Overlay */}
            {authState === 'verified' && (
              <div className="auth-verification-resolve" aria-live="assertive">
                <div className="auth-verification-content">
                  <div className="auth-verification-seal">
                    <ShieldCheck size={36} className="seal-icon" />
                  </div>
                  <h3 className="auth-verification-title">Identity Verified</h3>
                  <div className="auth-verification-meta">
                    <span className="mono-badge">XYPHER // CRYPTOGRAPHIC PROOF RESOLVED</span>
                  </div>
                  <div className="auth-verification-bar">
                    <div className="auth-verification-progress" />
                  </div>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="xy-auth-card-header">
              <Link to="/" className="xy-auth-brand-badge" title="Back to Homepage">
                <ShieldCheck size={26} className="xy-cyan-text" />
                <span className="xy-auth-brand-name">XYPHER</span>
              </Link>
              <h2 className="xy-auth-title">
                {isSignUp ? 'Create Platform Identity' : 'Authorized Access Portal'}
              </h2>
              <p className="xy-auth-subtitle">
                {isSignUp
                  ? 'Register institutional staff or student credentials.'
                  : 'Select your role or enter credentials to enter the secure environment.'}
              </p>
            </div>

            {/* Instant Role Preview / Demo Authentication Quick Access */}
            <div className="xy-demo-quickbox">
              <div className="xy-demo-quickbox__header">
                <Sparkles size={14} className="xy-cyan-text" />
                <span>Instant Role Demo Evaluation</span>
              </div>
              <p className="xy-demo-quickbox__desc">
                Select any authorized role below to populate credentials:
              </p>
              <div className="xy-demo-pills-row">
                {rolesList.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleDemoPillClick(r.id)}
                    className={`xy-demo-pill ${selectedRole === r.id ? 'is-active' : ''}`}
                    id={`demo-pill-${r.id}`}
                    disabled={isSubmitting || authState === 'verified'}
                  >
                    <r.icon size={13} />
                    <span>{r.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Segmented Optical Tab Toggle */}
            <div className="xy-auth-tabs-segmented auth-tabs-segmented" role="tablist" aria-label="Authentication Mode">
              <div
                className="xy-tab-slider"
                style={{
                  transform: isSignUp ? 'translateX(100%)' : 'translateX(0%)',
                }}
                aria-hidden="true"
              />
              <button
                type="button"
                role="tab"
                id="tab-signin"
                aria-selected={!isSignUp}
                className={`xy-segmented-btn ${!isSignUp ? 'active' : ''}`}
                onClick={() => {
                  setIsSignUp(false);
                  setErrorMsg('');
                  setDemoNotice('');
                }}
                disabled={isSubmitting || authState === 'verified'}
              >
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                id="tab-signup"
                aria-selected={isSignUp}
                className={`xy-segmented-btn ${isSignUp ? 'active' : ''}`}
                onClick={() => {
                  setIsSignUp(true);
                  setErrorMsg('');
                  setDemoNotice('');
                }}
                disabled={isSubmitting || authState === 'verified'}
              >
                Create Account
              </button>
            </div>

            {/* Alerts: Error, Success, Demo Notice */}
            {errorMsg && (
              <div className="xy-alert xy-alert--error" role="alert">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="xy-alert xy-alert--success" role="status">
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}
            {demoNotice && !errorMsg && !successMsg && (
              <div className="xy-alert xy-alert--info" role="status" id="demo-autofill-banner">
                <Sparkles size={16} />
                <span>{demoNotice}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="xy-auth-form">
              {/* Tactical 4 Role Cards */}
              <div className="xy-role-selector-block">
                <label className="xy-form-label" id="role-selector-label">
                  {isSignUp ? 'Select Intended Role' : 'Select Authorized Portal'}
                </label>
                <div
                  className="xy-role-grid role-tiles-grid"
                  role="radiogroup"
                  aria-labelledby="role-selector-label"
                >
                  {rolesList.map((r) => {
                    const Icon = r.icon;
                    const isSelected = selectedRole === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        role="radio"
                        id={`role-tile-${r.id}`}
                        aria-checked={isSelected}
                        aria-pressed={isSelected}
                        tabIndex={0}
                        className={`xy-role-card role-tile ${isSelected ? 'is-selected selected' : ''}`}
                        onClick={() => handleRoleCardClick(r.id)}
                        disabled={isSubmitting || authState === 'verified'}
                      >
                        <div className="xy-role-card__header">
                          <div className="xy-role-icon-box">
                            <Icon size={18} strokeWidth={2} />
                          </div>
                          <div className="xy-role-check-indicator" aria-hidden="true">
                            {isSelected && <Check size={12} />}
                          </div>
                        </div>
                        <div className="xy-role-card__body">
                          <span className="xy-role-title">{r.title}</span>
                          <span className="xy-role-subtitle">{r.subtitle}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Extra Registration Fields for Institution / Student */}
              {isSignUp && selectedRole === 'institution' && (
                <div className="xy-role-extra-fields">
                  <div className="xy-field">
                    <label htmlFor="auth-institution-name" className="xy-form-label">
                      Institution Legal Name
                    </label>
                    <div className="xy-input-wrap">
                      <Building2 size={16} className="xy-input-icon" />
                      <input
                        id="auth-institution-name"
                        type="text"
                        required
                        placeholder="e.g. Oxford University"
                        value={institutionName}
                        onChange={(e) => setInstitutionName(e.target.value)}
                        className="xy-input"
                        disabled={isSubmitting || authState === 'verified'}
                      />
                    </div>
                  </div>
                  <div className="xy-field">
                    <label htmlFor="auth-registration-code" className="xy-form-label">
                      Government Accreditation / Registry Code
                    </label>
                    <div className="xy-input-wrap">
                      <Shield size={16} className="xy-input-icon" />
                      <input
                        id="auth-registration-code"
                        type="text"
                        required
                        placeholder="e.g. REG-UK-2024-891"
                        value={registrationNumber}
                        onChange={(e) => setRegistrationNumber(e.target.value)}
                        className="xy-input"
                        disabled={isSubmitting || authState === 'verified'}
                      />
                    </div>
                  </div>
                </div>
              )}

              {isSignUp && selectedRole === 'student' && (
                <div className="xy-role-extra-fields">
                  <div className="xy-field">
                    <label htmlFor="auth-student-name" className="xy-form-label">
                      Full Legal Name
                    </label>
                    <div className="xy-input-wrap">
                      <GraduationCap size={16} className="xy-input-icon" />
                      <input
                        id="auth-student-name"
                        type="text"
                        required
                        placeholder="e.g. Sarah Mitchell"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="xy-input"
                        disabled={isSubmitting || authState === 'verified'}
                      />
                    </div>
                  </div>
                  <div className="xy-field">
                    <label htmlFor="auth-student-roll" className="xy-form-label">
                      Student Roll / Identity Number
                    </label>
                    <div className="xy-input-wrap">
                      <Layers size={16} className="xy-input-icon" />
                      <input
                        id="auth-student-roll"
                        type="text"
                        required
                        placeholder="e.g. CS-2024-8491"
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value)}
                        className="xy-input"
                        disabled={isSubmitting || authState === 'verified'}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div className="xy-field">
                <label htmlFor="auth-email-input" className="xy-form-label">
                  Email Address
                </label>
                <div className="xy-input-wrap">
                  <Mail size={16} className="xy-input-icon" />
                  <input
                    id="auth-email-input"
                    type="email"
                    required
                    placeholder="name@organization.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setDemoNotice('');
                    }}
                    className="xy-input"
                    disabled={isSubmitting || authState === 'verified'}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="xy-field">
                <label htmlFor="auth-password-input" className="xy-form-label">
                  Password
                </label>
                <div className="xy-input-wrap">
                  <Lock size={16} className="xy-input-icon" />
                  <input
                    id="auth-password-input"
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setDemoNotice('');
                    }}
                    className="xy-input"
                    disabled={isSubmitting || authState === 'verified'}
                  />
                </div>
              </div>

              {/* Submit Action */}
              <button
                type="submit"
                disabled={isSubmitting || authState === 'verified'}
                className="xy-button xy-button-primary xy-auth-submit-btn"
                id="auth-submit-btn"
              >
                {authState === 'authenticating' ? (
                  <span className="xy-btn-loading-text">
                    <span className="xy-spinner-sm" aria-hidden="true" />
                    <span>Authenticating Identity...</span>
                  </span>
                ) : authState === 'verified' ? (
                  <span className="xy-btn-verified-text">
                    <ShieldCheck size={18} />
                    <span>Identity Verified</span>
                  </span>
                ) : (
                  <span>
                    {isSignUp
                      ? `Register as ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}`
                      : 'Sign In to Dashboard'}
                  </span>
                )}
                <ArrowRight size={16} />
              </button>
            </form>

            {/* Mode toggle link */}
            <div className="xy-auth-switch-row">
              {isSignUp ? (
                <span>
                  Already registered?{' '}
                  <button
                    type="button"
                    className="xy-link-btn"
                    onClick={() => {
                      setIsSignUp(false);
                      setErrorMsg('');
                      setDemoNotice('');
                    }}
                  >
                    Sign In here
                  </button>
                </span>
              ) : (
                <span>
                  Need an organizational account?{' '}
                  <button
                    type="button"
                    className="xy-link-btn"
                    onClick={() => {
                      setIsSignUp(true);
                      setErrorMsg('');
                      setDemoNotice('');
                    }}
                  >
                    Create one now
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AuthPage;
