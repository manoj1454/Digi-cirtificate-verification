import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
} from 'lucide-react';

export const AuthPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('student');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extra profile fields for signup
  const [institutionName, setInstitutionName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [rollNumber, setRollNumber] = useState('');

  const { signIn, signUp, user, role, getDashboardPath, loginAsDemoRole, isSupabaseConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user && role) {
      const target = getDashboardPath(role);
      navigate(target, { replace: true });
    }
  }, [user, role, navigate, getDashboardPath]);

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
        setSuccessMsg(
          'Signup successful! Account created and role mapped in users table.'
        );
        navigate(getDashboardPath(selectedRole));
      } else {
        await signIn(email, password);
        // Navigation will trigger automatically via Auth state change or role resolution
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = (targetRole) => {
    loginAsDemoRole(targetRole);
    navigate(`/${targetRole}`);
  };

  return (
    <div className="landing-page-container">
      {/* =========================================================================
          Hero / About Section
          ========================================================================= */}
      <section className="landing-hero-section">
        <div className="landing-hero-inner">
          <div className="landing-hero-brand">
            <h1 className="landing-hero-title">XYPHER</h1>
            <p className="landing-hero-tagline">Verify. Trust. Authenticate.</p>
          </div>

          <p className="landing-hero-description">
            Every year, thousands of fraudulent academic and professional credentials pass unnoticed through conventional hiring and compliance channels. XYPHER establishes an immutable, dual-layer standard of trust: cryptographically sealing each credential on-chain while continuously interrogating the real-time accreditation standing of the issuing institution. Because a tamper-proof certificate issued by an unaccredited or revoked entity remains inherently invalid, XYPHER verifies not just the certificate — but the institution behind it.
          </p>

          <div className="landing-pillars-row">
            <div className="landing-pillar">
              <span className="landing-pillar-label">Tamper-Proof</span>
              <span className="landing-pillar-dash">—</span>
              <span className="landing-pillar-text">Every credential is cryptographically sealed and cannot be silently altered.</span>
            </div>

            <div className="landing-pillar-divider" />

            <div className="landing-pillar">
              <span className="landing-pillar-label">Issuer Accreditation</span>
              <span className="landing-pillar-dash">—</span>
              <span className="landing-pillar-text">We verify the institution&apos;s standing continuously, not just at the moment of issuance.</span>
            </div>

            <div className="landing-pillar-divider" />

            <div className="landing-pillar">
              <span className="landing-pillar-label">Instant &amp; Free</span>
              <span className="landing-pillar-dash">—</span>
              <span className="landing-pillar-text">Verification is a read-only check, with no cost and no waiting.</span>
            </div>
          </div>

          <div className="landing-hero-actions">
            <button
              type="button"
              onClick={() => {
                document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn-primary landing-hero-cta"
            >
              <span>Sign In</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          Auth Section (Restrained Frosted Glass Card)
          ========================================================================= */}
      <section id="auth-section" className="landing-auth-section">
        <div className="auth-page-layout">
          <div className="auth-form-column">
            <div className="auth-card frosted-card">
              {/* Header */}
              <div className="auth-header">
                <div className="auth-logo-badge">
                  <ShieldCheck size={28} className="auth-logo-icon" />
                </div>
                <h1 className="auth-title">XYPHER</h1>
                <p className="auth-wordmark-tagline">Verify. Trust. Authenticate.</p>
                <p className="auth-sub">
                  {isSignUp
                    ? 'Register your organizational role or student identity'
                    : 'Sign in to access your authorized role dashboard'}
                </p>
              </div>

        {/* Status Notice if Supabase not configured */}
        {!isSupabaseConfigured && (
          <div className="setup-notice-box">
            <div className="setup-notice-header">
              <Sparkles size={16} className="text-warning" />
              <span>Instant Role Preview Available</span>
            </div>
            <p className="setup-notice-text">
              Supabase keys in <code>frontend/.env</code> are currently in standby/placeholder mode. You can test live database operations once configured, or click any role below for instant preview:
            </p>
            <div className="demo-pills-row">
              {rolesList.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleDemoLogin(r.id)}
                  className={`demo-pill ${r.colorClass}`}
                >
                  <r.icon size={13} />
                  <span>{r.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab Toggle */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${!isSignUp ? 'active' : ''}`}
            onClick={() => {
              setIsSignUp(false);
              setErrorMsg('');
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${isSignUp ? 'active' : ''}`}
            onClick={() => {
              setIsSignUp(true);
              setErrorMsg('');
            }}
          >
            Create Account
          </button>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="alert-box alert-error">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="alert-box alert-success">
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {/* Role selector (shown on Signup) */}
          {isSignUp && (
            <div className="role-selector-section">
              <label className="form-label">
                Select Your Role <span className="text-required">*</span>
              </label>
              <div className="role-cards-grid">
                {rolesList.map((r) => {
                  const Icon = r.icon;
                  const isSelected = selectedRole === r.id;
                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedRole(r.id)}
                      className={`role-choice-card ${isSelected ? 'selected' : ''} ${r.colorClass}`}
                    >
                      <Icon size={20} className="role-choice-icon" />
                      <div className="role-choice-title">{r.title}</div>
                      <div className="role-choice-sub">{r.subtitle}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Role-specific extra fields during Signup */}
          {isSignUp && selectedRole === 'institution' && (
            <div className="role-extra-fields">
              <div className="form-group">
                <label className="form-label">Institution Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Massachusetts Institute of Technology"
                  value={institutionName}
                  onChange={e => setInstitutionName(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Accreditation / Registration No.</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. REG-2025-0812"
                  value={registrationNumber}
                  onChange={e => setRegistrationNumber(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
          )}

          {isSignUp && selectedRole === 'student' && (
            <div className="role-extra-fields">
              <div className="form-group">
                <label className="form-label">Full Legal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Mitchell"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Student Roll Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS-2022-8491"
                  value={rollNumber}
                  onChange={e => setRollNumber(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                type="email"
                required
                placeholder="name@organization.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary auth-submit-btn"
          >
            <span>
              {isSubmitting
                ? 'Processing...'
                : isSignUp
                ? `Register as ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}`
                : 'Sign In to Dashboard'}
            </span>
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Footer info */}
        <div className="auth-footer-info">
          <p>
            Secured with PostgreSQL Row-Level Security (RLS) & Supabase Identity.
          </p>
        </div>
      </div>
    </div>

    {/* Editorial Right Panel */}
    <div className="auth-editorial-column">
      <div className="auth-editorial-content">
        <div className="auth-editorial-kicker">
          <span>Institutional Verification</span>
        </div>

        <blockquote className="auth-editorial-quote">
          “Every year, thousands of fraudulent credentials pass unnoticed. This platform verifies not just the certificate — but the institution behind it.”
        </blockquote>
      </div>
    </div>
  </div>
</section>
</div>
);
};
