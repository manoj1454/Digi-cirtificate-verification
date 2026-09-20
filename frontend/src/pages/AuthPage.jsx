import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import Lenis from 'lenis';
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
  ChevronDown,
} from 'lucide-react';
import { XypherLiquidFallback } from '../components/XypherLiquidFallback';
import { shouldUse3DHero } from '../lib/deviceDetection';

// Code-split Three.js / React Three Fiber liquid scene so it only loads on this route
const XypherLiquidScene = lazy(() => import('../components/XypherLiquidScene'));

export const AuthPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('student');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authState, setAuthState] = useState('idle'); // 'idle' | 'authenticating' | 'verified' | 'error'

  // Extra profile fields for signup
  const [institutionName, setInstitutionName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [rollNumber, setRollNumber] = useState('');

  // 3D capability detection
  const [canRender3D, setCanRender3D] = useState(false);
  const lenisRef = useRef(null);
  const cardRef = useRef(null);

  // Cinematic Entrance & Scroll State
  const [entranceProgress, setEntranceProgress] = useState(0.0);
  const [scrollProgress, setScrollProgress] = useState(0.0);

  const { signIn, signUp, user, role, getDashboardPath, loginAsDemoRole, isSupabaseConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Detect WebGL support and device power
    const isCapable = shouldUse3DHero();
    setCanRender3D(isCapable);

    // Check reduced motion preference
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Cinematic Visual Sequence (GSAP)
    // Empty warm space -> Faint lattice convergence -> Glass lens forms and thickens -> Specular sweep -> Settle
    if (prefersReducedMotion) {
      setEntranceProgress(1.0);
    } else {
      const entranceObj = { val: 0.0 };
      gsap.to(entranceObj, {
        val: 1.0,
        duration: 3.2,
        ease: 'power2.out',
        onUpdate: () => setEntranceProgress(entranceObj.val),
      });

      // Animate typography with cinematic ease
      gsap.fromTo(
        '.xypher-wordmark-display',
        { opacity: 0, y: 35, filter: 'blur(8px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.8, delay: 0.6, ease: 'power3.out' }
      );
      gsap.fromTo(
        '.xypher-hero-tagline-editorial',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 1.4, delay: 1.0, ease: 'power2.out' }
      );
      gsap.fromTo(
        '.xypher-hero-purpose, .xypher-hero-action-row, .xypher-pillars-minimal',
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 1.4, delay: 1.3, ease: 'power2.out', stagger: 0.15 }
      );
    }

    // Initialize Lenis smooth scroll for the landing page
    const lenis = new Lenis({
      duration: 1.3,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    // Track scroll progress to drive uScrollProgress shader uniform and hero exit
    lenis.on('scroll', (e) => {
      const scrollY = e.scroll || window.scrollY || 0;
      const heroHeight = window.innerHeight || 800;
      const progress = Math.min(Math.max(scrollY / (heroHeight * 0.75), 0), 1);
      setScrollProgress(progress);
    });

    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const handleScrollToAuth = () => {
    const el = document.getElementById('auth-section');
    if (el) {
      if (lenisRef.current) {
        lenisRef.current.scrollTo(el, { offset: 0, duration: 1.2 });
      } else {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Only auto-redirect if already authenticated and not currently transitioning
  useEffect(() => {
    if (user && role && authState !== 'authenticating' && authState !== 'verified') {
      const target = getDashboardPath(role);
      navigate(target, { replace: true });
    }
  }, [user, role, navigate, getDashboardPath, authState]);

  // Optical physical card cursor light & specular tracking
  const handleCardMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    cardRef.current.style.setProperty('--card-mouse-x', `${x.toFixed(1)}%`);
    cardRef.current.style.setProperty('--card-mouse-y', `${y.toFixed(1)}%`);

    // Extremely subtle physical tilt (restrained to max 2.5 degrees)
    const tiltX = (((e.clientY - rect.top) / rect.height) - 0.5) * -3;
    const tiltY = (((e.clientX - rect.left) / rect.width) - 0.5) * 3;
    cardRef.current.style.setProperty('--card-tilt-x', `${tiltX.toFixed(2)}deg`);
    cardRef.current.style.setProperty('--card-tilt-y', `${tiltY.toFixed(2)}deg`);
  };

  const handleCardMouseLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.setProperty('--card-mouse-x', '50%');
    cardRef.current.style.setProperty('--card-mouse-y', '25%');
    cardRef.current.style.setProperty('--card-tilt-x', '0deg');
    cardRef.current.style.setProperty('--card-tilt-y', '0deg');
  };

  const rolesList = [
    {
      id: 'regulator',
      title: 'Regulator',
      subtitle: 'Accreditation & compliance authority',
      icon: ShieldCheck,
      colorClass: 'role-card-regulator',
    },
    {
      id: 'institution',
      title: 'Institution',
      subtitle: 'Accredited university or college',
      icon: Building2,
      colorClass: 'role-card-institution',
    },
    {
      id: 'student',
      title: 'Student',
      subtitle: 'Graduate / Credential recipient',
      icon: GraduationCap,
      colorClass: 'role-card-student',
    },
    {
      id: 'company',
      title: 'Company',
      subtitle: 'Employer or verifying entity',
      icon: Briefcase,
      colorClass: 'role-card-company',
    },
  ];

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
          'Signup successful! Account created and role mapped in users table.'
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
      setErrorMsg(err.message || 'Authentication failed.');
      // Reset error shake state after 600ms so subsequent actions can shake cleanly
      setTimeout(() => {
        setAuthState('idle');
      }, 600);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async (roleId) => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    setAuthState('authenticating');
    setErrorMsg('');
    try {
      loginAsDemoRole(roleId);
      setAuthState('verified');

      if (prefersReducedMotion) {
        navigate(getDashboardPath(roleId));
      } else {
        await new Promise((r) => setTimeout(r, 650));
        navigate(getDashboardPath(roleId));
      }
    } catch (err) {
      setAuthState('error');
      setErrorMsg(err.message || 'Demo authentication failed.');
      setTimeout(() => {
        setAuthState('idle');
      }, 600);
    }
  };

  return (
    <div className="xypher-landing-wrap">
      {/* =========================================================================
          Continuous Ambient 3D Crystal Lens & Atmospheric Layer
          Continues from Hero down into Login Environment
          ========================================================================= */}
      <div className="xypher-ambient-scene-layer" aria-hidden="true">
        {canRender3D ? (
          <Suspense fallback={<XypherLiquidFallback />}>
            <XypherLiquidScene
              entranceProgress={entranceProgress}
              scrollProgress={scrollProgress}
            />
          </Suspense>
        ) : (
          <XypherLiquidFallback />
        )}
      </div>

      {/* =========================================================================
          1. Full-Screen Immersive WebGL Hero Scene (LOCKED PHASE 1.5 ART DIRECTION)
          ========================================================================= */}
      <section className="xypher-hero-fullscreen" id="hero-fullscreen">
        {/* Editorial Typography & Interactive Controls Layer */}
        <div
          className="xypher-hero-editorial-overlay"
          style={{
            opacity: Math.max(1 - scrollProgress * 1.5, 0),
            transform: `translateY(${-scrollProgress * 50}px)`,
          }}
        >
          {/* Top: Protocol Subtitle */}
          <div className="xypher-editorial-top">
            <div className="xypher-editorial-tag">
              <span>CRYPTOGRAPHIC PROTOCOL // 2026</span>
            </div>
          </div>

          {/* Asymmetric Editorial Hero Content */}
          <div className="xypher-editorial-asym-container">
            <div className="xypher-editorial-col">
              <h1 className="xypher-wordmark-display">XYPHER</h1>
              <p className="xypher-hero-tagline-editorial">Verify What Matters.</p>
              <p className="xypher-hero-purpose">
                A digital certificate becoming a physical object. Immutable cryptographic verification suspended in a translucent optical lens.
              </p>

              <div className="xypher-hero-action-row">
                <button
                  type="button"
                  onClick={handleScrollToAuth}
                  className="xypher-scroll-prompt btn-tactile"
                  id="hero-scroll-btn"
                  aria-label="Scroll to authentication portal"
                >
                  <span>Enter Verification Portal</span>
                  <ChevronDown size={14} className="scroll-prompt-icon" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom: Subtle Trust Metadata */}
          <div className="xypher-editorial-bottom">
            <div className="xypher-pillars-minimal">
              <div className="xypher-pillar-item">
                <span className="xypher-pillar-title">Tamper-Proof Ledger</span>
                <span className="xypher-pillar-desc">Cryptographically anchored on-chain</span>
              </div>
              <div className="xypher-pillar-rule" />
              <div className="xypher-pillar-item">
                <span className="xypher-pillar-title">Live Accreditation</span>
                <span className="xypher-pillar-desc">Continuous institutional audit</span>
              </div>
              <div className="xypher-pillar-rule" />
              <div className="xypher-pillar-item">
                <span className="xypher-pillar-title">Zero-Cost Verification</span>
                <span className="xypher-pillar-desc">Instant public cryptographic proof</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. Physical Optical Glass Authentication Section (PHASE 2)
          ========================================================================= */}
      <section id="auth-section" className="landing-auth-section">
        <div className="auth-page-layout">
          <div className="auth-form-column">
            <div
              ref={cardRef}
              className={`auth-card glass-panel ${
                authState === 'error' ? 'auth-card-shake' : ''
              } ${authState === 'verified' ? 'auth-card-verifying' : ''}`}
              id="auth-glass-panel"
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
            >
              {/* Authentication Success Resolve Overlay */}
              {authState === 'verified' && (
                <div className="auth-verification-resolve" aria-live="assertive">
                  <div className="auth-verification-content">
                    <div className="auth-verification-seal">
                      <ShieldCheck size={32} className="seal-icon" />
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
              <div className="auth-header">
                <div className="auth-logo-badge">
                  <ShieldCheck size={26} className="auth-logo-icon" />
                </div>
                <h2 className="auth-title">XYPHER</h2>
                <p className="auth-wordmark-tagline">Verify. Trust. Authenticate.</p>
                <p className="auth-sub">
                  {isSignUp
                    ? 'Register your organizational role or student identity'
                    : 'Sign in to access your authorized role dashboard'}
                </p>
              </div>

              {/* Instant Role Preview / Demo Authentication */}
              <div className="setup-notice-box">
                <div className="setup-notice-header">
                  <Sparkles size={14} className="notice-icon" />
                  <span>Instant Role Preview Available</span>
                </div>
                <p className="setup-notice-text">
                  Instant preview for evaluation and testing. Select any role below for one-click verification:
                </p>
                <div className="demo-pills-row">
                  {rolesList.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleDemoLogin(r.id)}
                      className={`demo-pill ${r.colorClass}`}
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
              <div className="auth-tabs-segmented" role="tablist" aria-label="Authentication Mode">
                <div
                  className="auth-tab-slider"
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
                  className={`auth-segmented-btn ${!isSignUp ? 'active' : ''}`}
                  onClick={() => {
                    setIsSignUp(false);
                    setErrorMsg('');
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
                  className={`auth-segmented-btn ${isSignUp ? 'active' : ''}`}
                  onClick={() => {
                    setIsSignUp(true);
                    setErrorMsg('');
                  }}
                  disabled={isSubmitting || authState === 'verified'}
                >
                  Create Account
                </button>
              </div>

              {/* Error & Success Alerts */}
              {errorMsg && (
                <div className="alert-box alert-error" role="alert">
                  <AlertCircle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="alert-box alert-success" role="status">
                  <CheckCircle2 size={16} />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="auth-form">
                {/* Tactical Role Tiles Selection */}
                <div className="role-selector-block">
                  <label className="form-label" id="role-selector-label">
                    {isSignUp ? 'Select Account Role' : 'Select Sign-In Portal'}
                  </label>
                  <div
                    className="role-tiles-grid"
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
                          tabIndex={0}
                          className={`role-tile ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedRole(r.id)}
                          disabled={isSubmitting || authState === 'verified'}
                        >
                          <div className="role-tile-header">
                            <div className="role-tile-icon-box">
                              <Icon size={16} strokeWidth={1.8} />
                            </div>
                            <div className="role-tile-pip" aria-hidden="true" />
                          </div>
                          <div className="role-tile-body">
                            <span className="role-tile-name">{r.title}</span>
                            <span className="role-tile-desc">{r.subtitle}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Extra Registration Fields for Institution / Student */}
                {isSignUp && selectedRole === 'institution' && (
                  <div className="role-extra-fields">
                    <div className="form-group">
                      <label htmlFor="auth-institution-name" className="form-label">
                        Institution Legal Name
                      </label>
                      <div className="glass-input-wrap">
                        <Building2 size={16} className="glass-input-icon" />
                        <input
                          id="auth-institution-name"
                          type="text"
                          required
                          placeholder="e.g. Oxford University"
                          value={institutionName}
                          onChange={(e) => setInstitutionName(e.target.value)}
                          className="glass-input-field"
                          disabled={isSubmitting || authState === 'verified'}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="auth-registration-code" className="form-label">
                        Government Accreditation / Code
                      </label>
                      <div className="glass-input-wrap">
                        <Shield size={16} className="glass-input-icon" />
                        <input
                          id="auth-registration-code"
                          type="text"
                          required
                          placeholder="e.g. REG-UK-2024-891"
                          value={registrationNumber}
                          onChange={(e) => setRegistrationNumber(e.target.value)}
                          className="glass-input-field"
                          disabled={isSubmitting || authState === 'verified'}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {isSignUp && selectedRole === 'student' && (
                  <div className="role-extra-fields">
                    <div className="form-group">
                      <label htmlFor="auth-student-name" className="form-label">
                        Full Legal Name
                      </label>
                      <div className="glass-input-wrap">
                        <GraduationCap size={16} className="glass-input-icon" />
                        <input
                          id="auth-student-name"
                          type="text"
                          required
                          placeholder="e.g. Sarah Mitchell"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="glass-input-field"
                          disabled={isSubmitting || authState === 'verified'}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="auth-student-roll" className="form-label">
                        Student Roll / Identity Number
                      </label>
                      <div className="glass-input-wrap">
                        <Layers size={16} className="glass-input-icon" />
                        <input
                          id="auth-student-roll"
                          type="text"
                          required
                          placeholder="e.g. CS-2022-8491"
                          value={rollNumber}
                          onChange={(e) => setRollNumber(e.target.value)}
                          className="glass-input-field"
                          disabled={isSubmitting || authState === 'verified'}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Email Field with Optical Glass Container */}
                <div className="form-group">
                  <label htmlFor="auth-email-input" className="form-label">
                    Email Address
                  </label>
                  <div className="glass-input-wrap">
                    <Mail size={16} className="glass-input-icon" />
                    <input
                      id="auth-email-input"
                      type="email"
                      required
                      placeholder="name@organization.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="glass-input-field"
                      disabled={isSubmitting || authState === 'verified'}
                    />
                  </div>
                </div>

                {/* Password Field with Optical Glass Container */}
                <div className="form-group">
                  <label htmlFor="auth-password-input" className="form-label">
                    Password
                  </label>
                  <div className="glass-input-wrap">
                    <Lock size={16} className="glass-input-icon" />
                    <input
                      id="auth-password-input"
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="glass-input-field"
                      disabled={isSubmitting || authState === 'verified'}
                    />
                  </div>
                </div>

                {/* Tactile Primary Authentication Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || authState === 'verified'}
                  className={`auth-submit-btn-tactile ${
                    authState === 'authenticating' ? 'loading' : ''
                  } ${authState === 'verified' ? 'verified' : ''}`}
                  id="auth-submit-btn"
                >
                  {authState === 'authenticating' ? (
                    <span className="btn-content-wrap">
                      <span className="btn-pulse-dot" aria-hidden="true" />
                      <span>Authenticating...</span>
                    </span>
                  ) : authState === 'verified' ? (
                    <span className="btn-content-wrap">
                      <ShieldCheck size={16} className="btn-verified-icon" />
                      <span>Identity Verified</span>
                    </span>
                  ) : (
                    <span className="btn-content-wrap">
                      <span>
                        {isSignUp
                          ? `Register as ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}`
                          : 'Sign In to Dashboard'}
                      </span>
                      <ArrowRight size={15} className="btn-arrow-icon" />
                    </span>
                  )}
                </button>
              </form>

              {/* Footer info */}
              <div className="auth-footer-info">
                <p>
                  Secured with PostgreSQL Row-Level Security (RLS) &amp; Cryptographic Dual-Layer Signatures.
                </p>
              </div>
            </div>
          </div>

          {/* Editorial Right Panel */}
          <div className="auth-editorial-column">
            <div className="auth-editorial-content">
              <div className="auth-editorial-kicker">
                <span className="mono-kicker">CRYPTOGRAPHIC ATTESTATION // L-2</span>
              </div>

              <blockquote className="auth-editorial-quote">
                “XYPHER verifies not just the digital credential, but the continuous accreditation standing of the authority behind it.”
              </blockquote>

              <div className="auth-editorial-specs">
                <div className="spec-item">
                  <span className="spec-label">Security Protocol</span>
                  <span className="spec-val">Dual-Layer On-Chain Registry</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Verification Time</span>
                  <span className="spec-val">&lt; 380ms Latency</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Accreditation</span>
                  <span className="spec-val">Live Dynamic Proof</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AuthPage;
