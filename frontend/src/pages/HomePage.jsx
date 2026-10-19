import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Building2,
  GraduationCap,
  Briefcase,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Lock,
  Layers,
  FileCheck,
  FileText,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Database,
  Shield,
  Activity,
  Award,
} from 'lucide-react';
import { verifyCertificate } from '../lib/api';
import { Footer } from '../components/Footer';

export const HomePage = () => {
  const [credentialId, setCredentialId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyError, setVerifyError] = useState(null);

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    const query = credentialId.trim();
    if (!query) return;

    setIsVerifying(true);
    setVerifyResult(null);
    setVerifyError(null);

    try {
      const { status, data } = await verifyCertificate(query);
      if (status === 404 || !data.success) {
        setVerifyResult({
          state: 'NOT_FOUND',
          title: 'Certificate Not Found',
          message: 'No record matching this credential identifier was found on the blockchain ledger.',
          credentialId: query,
        });
      } else {
        let state = 'VALID';
        let title = 'Cryptographically Verified Credential';
        let message = 'This credential is authentic, untampered, and issued by an accredited institution.';

        if (data.revoked) {
          state = 'REVOKED';
          title = 'Credential Revoked';
          message = 'This certificate was revoked by the issuing institution and is no longer valid.';
        } else if (!data.isInstituteAccredited) {
          state = 'UNACCREDITED';
          title = 'Issuer Accreditation Revoked';
          message = 'The issuing institution was previously recognized, but current regulatory accreditation has been suspended.';
        }

        setVerifyResult({
          state,
          title,
          message,
          credentialId: data.credentialId,
          institutionName: data.institutionName || 'Accredited Institution',
          degreeName: data.degreeName || 'Academic Credential',
          studentName: data.studentName || 'Confidential Student',
          issueDate: data.issueDate ? new Date(data.issueDate).toLocaleDateString() : 'N/A',
          ipfsHash: data.ipfsHash,
          gatewayUrl: data.gatewayUrl,
        });
      }
    } catch (err) {
      setVerifyError('Unable to connect to verification gateway. Ensure the Express backend is running.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSampleLookup = (sampleId) => {
    setCredentialId(sampleId);
  };

  return (
    <div className="xy-home-page xy-tech-background">
      {/* =========================================================================
          1. Hero Section
          ========================================================================= */}
      <section className="xy-hero xy-container" id="hero">
        <div className="xy-hero__grid">
          {/* Left Hero Content */}
          <div className="xy-hero__content">
            <div className="xy-eyebrow">
              <span className="xy-eyebrow__dot" />
              <span>TRUSTED CREDENTIAL VERIFICATION</span>
            </div>

            <h1 className="xy-hero__heading">
              Trust Every Credential. Verify Every Achievement.
            </h1>

            <p className="xy-hero__description">
              A modern platform for issuing, managing, and verifying academic credentials through a secure, auditable workflow. Engineered with cryptographic certainty for universities, students, employers, and educational regulators.
            </p>

            <div className="xy-hero__actions">
              <Link to="/login" className="xy-button xy-button-primary">
                <span>Explore the Platform</span>
                <ArrowRight size={18} />
              </Link>
              <a href="#verify" className="xy-button xy-button-secondary">
                <Search size={18} />
                <span>Verify a Certificate</span>
              </a>
            </div>

            {/* Quick Demo Access Bar */}
            <div className="xy-hero__quick-roles">
              <span className="xy-hero__roles-label">Role Portals:</span>
              <div className="xy-hero__role-tags">
                <Link to="/login" className="xy-role-tag"><ShieldCheck size={13} /> Regulator</Link>
                <Link to="/login" className="xy-role-tag"><Building2 size={13} /> Institution</Link>
                <Link to="/login" className="xy-role-tag"><GraduationCap size={13} /> Student</Link>
                <Link to="/login" className="xy-role-tag"><Briefcase size={13} /> Company</Link>
              </div>
            </div>
          </div>

          {/* Right Hero Visual: Futuristic Credential Hologram */}
          <div className="xy-hero__visual" aria-hidden="true">
            <div className="xy-credential-card-hologram">
              <div className="xy-holo-header">
                <div className="xy-holo-badge">
                  <ShieldCheck size={18} className="xy-cyan-text" />
                  <span>ON-CHAIN VERIFIED</span>
                </div>
                <div className="xy-holo-code">ID: CERT-89412-V</div>
              </div>

              <div className="xy-holo-body">
                <div className="xy-holo-icon-wrap">
                  <Award size={36} className="xy-cyan-bright" />
                </div>
                <div className="xy-holo-degree">Bachelor of Computer Science</div>
                <div className="xy-holo-sub">Oxford Institute of Technology</div>

                <div className="xy-holo-meta-grid">
                  <div className="xy-holo-meta">
                    <span className="label">Recipient</span>
                    <span className="val">Alexandre V. Chen</span>
                  </div>
                  <div className="xy-holo-meta">
                    <span className="label">Status</span>
                    <span className="val xy-success-text">Active &bull; Valid</span>
                  </div>
                  <div className="xy-holo-meta">
                    <span className="label">Accreditation</span>
                    <span className="val">Govt. Board Certified</span>
                  </div>
                  <div className="xy-holo-meta">
                    <span className="label">Integrity Hash</span>
                    <span className="val mono">0x7f4b...92ce</span>
                  </div>
                </div>
              </div>

              <div className="xy-holo-footer">
                <div className="xy-holo-hash-strip">
                  <div className="pulse-indicator" />
                  <span>Cryptographic Proof Anchored // Dual-Key Approval</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. Trust / Capabilities Strip
          ========================================================================= */}
      <section className="xy-trust-strip">
        <div className="xy-container">
          <div className="xy-trust-strip__grid">
            <div className="xy-trust-item">
              <div className="xy-trust-icon-box"><Shield size={20} /></div>
              <div className="xy-trust-item__content">
                <h4>Tamper-Proof Ledger</h4>
                <p>Immutable cryptographic hash signatures permanently anchor record integrity.</p>
              </div>
            </div>
            <div className="xy-trust-item">
              <div className="xy-trust-icon-box"><Building2 size={20} /></div>
              <div className="xy-trust-item__content">
                <h4>Continuous Accreditation</h4>
                <p>Regulators maintain live accreditation standing checked on every verification.</p>
              </div>
            </div>
            <div className="xy-trust-item">
              <div className="xy-trust-icon-box"><Layers size={20} /></div>
              <div className="xy-trust-item__content">
                <h4>Two-Person Governance</h4>
                <p>Institution-level separation of duties before certificates are signed and issued.</p>
              </div>
            </div>
            <div className="xy-trust-item">
              <div className="xy-trust-icon-box"><Activity size={20} /></div>
              <div className="xy-trust-item__content">
                <h4>Sub-Second Inquiries</h4>
                <p>Instant decentralized verification without gatekept portals or administrative wait times.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. How It Works (Workflow Breakdown)
          ========================================================================= */}
      <section className="xy-section" id="how-it-works">
        <div className="xy-container">
          <div className="xy-section-header">
            <div className="xy-eyebrow">
              <span className="xy-eyebrow__dot" />
              <span>AUDITABLE LIFECYCLE</span>
            </div>
            <h2 className="xy-section-title">How XYPHER Works</h2>
            <p className="xy-section-subtitle">
              A transparent, three-stage pipeline ensuring credential provenance from institutional accreditation to public verification.
            </p>
          </div>

          <div className="xy-workflow-grid">
            {/* Step 1 */}
            <div className="xy-workflow-card">
              <div className="xy-workflow-step">01</div>
              <div className="xy-workflow-icon-wrap">
                <FileCheck size={28} className="xy-cyan-text" />
              </div>
              <h3 className="xy-workflow-title">Institutional Initiation</h3>
              <p className="xy-workflow-desc">
                Accredited academic registrars upload certified academic documents to IPFS, compute cryptographic digests, and initiate the credential record.
              </p>
              <div className="xy-workflow-tag">IPFS / Pinata Storage</div>
            </div>

            {/* Step 2 */}
            <div className="xy-workflow-card">
              <div className="xy-workflow-step">02</div>
              <div className="xy-workflow-icon-wrap">
                <ShieldCheck size={28} className="xy-cyan-bright" />
              </div>
              <h3 className="xy-workflow-title">Authorized Approval</h3>
              <p className="xy-workflow-desc">
                A secondary authorized administrator reviews the graduate identity and degree particulars, validating and cryptographically issuing the credential.
              </p>
              <div className="xy-workflow-tag">Multi-Party Verification</div>
            </div>

            {/* Step 3 */}
            <div className="xy-workflow-card">
              <div className="xy-workflow-step">03</div>
              <div className="xy-workflow-icon-wrap">
                <Search size={28} className="xy-blue-text" />
              </div>
              <h3 className="xy-workflow-title">Instant Verification</h3>
              <p className="xy-workflow-desc">
                Employers, background checkers, and universities verify credentials via QR code or identifier, validating both document integrity and live issuer standing.
              </p>
              <div className="xy-workflow-tag">Instant Blockchain Query</div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. Core Architectural Features Grid
          ========================================================================= */}
      <section className="xy-section xy-section--alt" id="features">
        <div className="xy-container">
          <div className="xy-section-header">
            <div className="xy-eyebrow">
              <span className="xy-eyebrow__dot" />
              <span>PLATFORM CAPABILITIES</span>
            </div>
            <h2 className="xy-section-title">Engineered for Academic Integrity</h2>
            <p className="xy-section-subtitle">
              Comprehensive role-isolated capabilities designed for governments, institutions, students, and verifiers.
            </p>
          </div>

          <div className="xy-features-grid">
            {/* Feature 1 */}
            <div className="xy-card xy-card-interactive xy-feature-card">
              <div className="xy-feature-icon-box"><Lock size={22} className="xy-cyan-text" /></div>
              <h3 className="xy-feature-title">Credential Integrity</h3>
              <p className="xy-feature-desc">
                SHA-256 document hashing ensures no alteration, tampering, or post-issuance modification goes undetected.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="xy-card xy-card-interactive xy-feature-card">
              <div className="xy-feature-icon-box"><Building2 size={22} className="xy-cyan-bright" /></div>
              <h3 className="xy-feature-title">Accreditation Registry</h3>
              <p className="xy-feature-desc">
                Government regulators can grant, audit, or revoke institution credentials, instantly affecting downstream verification outcomes.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="xy-card xy-card-interactive xy-feature-card">
              <div className="xy-feature-icon-box"><Search size={22} className="xy-blue-text" /></div>
              <h3 className="xy-feature-title">Instant Verifier Portal</h3>
              <p className="xy-feature-desc">
                Employers verify candidate degrees in seconds without fees, cumbersome phone confirmations, or waitlists.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="xy-card xy-card-interactive xy-feature-card">
              <div className="xy-feature-icon-box"><AlertTriangle size={22} className="xy-warning-text" /></div>
              <h3 className="xy-feature-title">Tamper-Evident Revocation</h3>
              <p className="xy-feature-desc">
                Issuing universities can revoke certificates for academic misconduct, clearly signaling invalid status while preserving audit logs.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="xy-card xy-card-interactive xy-feature-card">
              <div className="xy-feature-icon-box"><GraduationCap size={22} className="xy-cyan-text" /></div>
              <h3 className="xy-feature-title">Student Credential Ownership</h3>
              <p className="xy-feature-desc">
                Graduates access their verified certificates, download cryptographic PDF proofs, and share verifiable QR codes anywhere.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="xy-card xy-card-interactive xy-feature-card">
              <div className="xy-feature-icon-box"><Database size={22} className="xy-cyan-bright" /></div>
              <h3 className="xy-feature-title">Auditable Verification Logs</h3>
              <p className="xy-feature-desc">
                Every query is logged to Neon PostgreSQL with date and verifier telemetry, giving institutions full visibility over credential checks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. Interactive Public Verification Demo (Live API call)
          ========================================================================= */}
      <section className="xy-section" id="verify">
        <div className="xy-container">
          <div className="xy-verify-box xy-card">
            <div className="xy-verify-box__header">
              <div className="xy-eyebrow">
                <span className="xy-eyebrow__dot" />
                <span>LIVE RECORD VERIFIER</span>
              </div>
              <h2 className="xy-verify-title">Verify a Credential Online</h2>
              <p className="xy-verify-subtitle">
                Enter any official XYPHER credential ID to run a live cryptographic audit against the platform ledger and active accreditation registry.
              </p>
            </div>

            <form onSubmit={handleVerifySubmit} className="xy-verify-form">
              <div className="xy-verify-input-wrap">
                <Search size={20} className="xy-verify-input-icon" />
                <input
                  type="text"
                  className="xy-input xy-verify-input"
                  placeholder="Enter Credential ID (e.g. CERT-2024-8902 or sample ID)"
                  value={credentialId}
                  onChange={(e) => setCredentialId(e.target.value)}
                  disabled={isVerifying}
                />
                <button
                  type="submit"
                  className="xy-button xy-button-primary xy-verify-submit-btn"
                  disabled={isVerifying || !credentialId.trim()}
                >
                  {isVerifying ? 'Verifying...' : 'Verify Now'}
                </button>
              </div>

              <div className="xy-verify-hints">
                <span>Sample evaluation IDs:</span>
                <button
                  type="button"
                  className="xy-sample-link"
                  onClick={() => handleSampleLookup('CERT-DEMO-001')}
                >
                  CERT-DEMO-001
                </button>
                <button
                  type="button"
                  className="xy-sample-link"
                  onClick={() => handleSampleLookup('CERT-DEMO-REVOKED')}
                >
                  CERT-DEMO-REVOKED
                </button>
              </div>
            </form>

            {/* Error Message */}
            {verifyError && (
              <div className="xy-alert xy-alert--error" role="alert">
                <AlertTriangle size={18} />
                <span>{verifyError}</span>
              </div>
            )}

            {/* Verification Result Output */}
            {verifyResult && (
              <div className={`xy-result-card xy-result-card--${verifyResult.state.toLowerCase()}`} role="region" aria-live="polite">
                <div className="xy-result-header">
                  <div className="xy-result-icon">
                    {verifyResult.state === 'VALID' && <CheckCircle2 size={24} className="xy-success-text" />}
                    {verifyResult.state === 'REVOKED' && <XCircle size={24} className="xy-danger-text" />}
                    {verifyResult.state === 'UNACCREDITED' && <AlertTriangle size={24} className="xy-warning-text" />}
                    {verifyResult.state === 'NOT_FOUND' && <AlertTriangle size={24} className="xy-warning-text" />}
                  </div>
                  <div>
                    <h3 className="xy-result-title">{verifyResult.title}</h3>
                    <p className="xy-result-message">{verifyResult.message}</p>
                  </div>
                  <div className="xy-result-badge-wrap">
                    <span className={`xy-status-badge xy-status-badge--${verifyResult.state.toLowerCase()}`}>
                      {verifyResult.state}
                    </span>
                  </div>
                </div>

                {verifyResult.state !== 'NOT_FOUND' && (
                  <div className="xy-result-details-grid">
                    <div className="xy-detail-item">
                      <span className="xy-detail-label">Degree / Program</span>
                      <span className="xy-detail-val">{verifyResult.degreeName}</span>
                    </div>
                    <div className="xy-detail-item">
                      <span className="xy-detail-label">Issuing Institution</span>
                      <span className="xy-detail-val">{verifyResult.institutionName}</span>
                    </div>
                    <div className="xy-detail-item">
                      <span className="xy-detail-label">Graduate Name</span>
                      <span className="xy-detail-val">{verifyResult.studentName}</span>
                    </div>
                    <div className="xy-detail-item">
                      <span className="xy-detail-label">Issue Date</span>
                      <span className="xy-detail-val">{verifyResult.issueDate}</span>
                    </div>
                  </div>
                )}

                <div className="xy-result-footer">
                  <span className="xy-result-env-note">
                    Verification executed via Neon PostgreSQL backend &bull; Local Hardhat blockchain simulation
                  </span>
                  {verifyResult.gatewayUrl && (
                    <a
                      href={verifyResult.gatewayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="xy-button xy-button-secondary xy-btn-sm"
                    >
                      <span>View IPFS Document</span>
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. Platform Call to Action
          ========================================================================= */}
      <section className="xy-section xy-cta-section">
        <div className="xy-container">
          <div className="xy-cta-box">
            <h2 className="xy-cta-title">Ready to secure and verify academic credentials?</h2>
            <p className="xy-cta-desc">
              Experience the role-based workflow for regulators, universities, students, and enterprise background verification teams.
            </p>
            <div className="xy-cta-actions">
              <Link to="/login" className="xy-button xy-button-primary">
                <span>Enter Authentication Portal</span>
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default HomePage;
