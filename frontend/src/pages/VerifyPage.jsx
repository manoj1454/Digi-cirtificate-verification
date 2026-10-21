import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';
import { verifyCertificate } from '../lib/api';
import { XypherSpinningLogo } from '../components/XypherSpinningLogo';
import { Footer } from '../components/Footer';
import './login-page.css';

export const VerifyPage = () => {
  const navigate = useNavigate();
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
      if (status === 404 || !data || !data.success) {
        setVerifyResult({
          state: 'NOT_FOUND',
          title: 'Certificate Not Found',
          message:
            data?.error ||
            'No record matching this credential identifier was found on the blockchain ledger or PostgreSQL registry.',
          credentialId: query,
        });
      } else {
        let state = 'VALID';
        let title = 'Cryptographically Verified Credential';
        let message =
          'This credential is authentic, untampered, and issued by an accredited institution.';

        if (data.revoked) {
          state = 'REVOKED';
          title = 'Credential Revoked';
          message =
            'This certificate was revoked by the issuing institution and is no longer valid.';
        } else if (!data.isInstituteAccredited) {
          state = 'UNACCREDITED';
          title = 'Issuer Accreditation Suspended';
          message =
            'The issuing institution was previously recognized, but current regulatory accreditation has been suspended.';
        }

        setVerifyResult({
          state,
          title,
          message,
          credentialId: data.credentialId || query,
          institutionName: data.institutionName || 'Accredited Institution',
          degreeName: data.degreeName || 'Academic Credential',
          studentName: data.studentName || 'Confidential Student',
          issueDate: data.issueDate ? new Date(data.issueDate).toLocaleDateString() : 'N/A',
          ipfsHash: data.ipfsHash,
          gatewayUrl: data.gatewayUrl,
        });
      }
    } catch (err) {
      setVerifyError(
        'Unable to connect to verification gateway. Ensure the Express backend is running on port 5001.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSampleLookup = (sampleId) => {
    setCredentialId(sampleId);
    setVerifyError(null);
  };

  return (
    <div className="xypher-login-page">
      {/* Sticky XYPHER Header */}
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
          <Link to="/#overview">Overview</Link>
          <Link to="/#architecture">Architecture</Link>
          <Link to="/#sign-in">Sign In</Link>
        </nav>
        <div className="xypher-header-actions">
          <Link className="xypher-header-cta" to="/#sign-in">
            Access portal <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>

      {/* Main Verification Container */}
      <main className="xypher-verify-page-main" style={{ padding: 'clamp(60px, 8vw, 120px) clamp(20px, 5vw, 88px)', minHeight: 'calc(100vh - 160px)' }}>
        <div className="xypher-verify-container" style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--xy-cyan-bright)', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
              <ArrowLeft size={16} /> Back to XYPHER Overview
            </Link>
          </div>

          <div className="xypher-verify-card">
            <div className="xypher-verify-header">
              <p className="xypher-eyebrow">
                <span /> LIVE RECORD VERIFIER // CRYPTOGRAPHIC AUDIT
              </p>
              <h1 className="xypher-verify-title" style={{ fontSize: 'clamp(28px, 4vw, 46px)' }}>
                Verify Academic Credential
              </h1>
              <p className="xypher-verify-subtitle">
                Execute an immediate zero-trust audit against the local Hardhat blockchain ledger (Chain ID 31337) and active institutional accreditation database.
              </p>
            </div>

            <form onSubmit={handleVerifySubmit} className="xypher-verify-form">
              <div className="xy-verify-input-wrap">
                <Search size={20} className="xy-verify-input-icon" />
                <input
                  type="text"
                  className="xy-input xy-verify-input"
                  placeholder="Enter Credential ID (e.g. CERT-DEMO-001 or custom ID)"
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
              <div className="xy-alert xy-alert--error" role="alert" style={{ marginTop: '20px' }}>
                <AlertTriangle size={18} />
                <span>{verifyError}</span>
              </div>
            )}

            {/* Verification Result Output */}
            {verifyResult && (
              <div
                className={`xy-result-card xy-result-card--${verifyResult.state.toLowerCase()}`}
                role="region"
                aria-live="polite"
              >
                <div className="xy-result-header">
                  <div className="xy-result-icon">
                    {verifyResult.state === 'VALID' && (
                      <CheckCircle2 size={24} className="xy-success-text" />
                    )}
                    {verifyResult.state === 'REVOKED' && (
                      <XCircle size={24} className="xy-danger-text" />
                    )}
                    {verifyResult.state === 'UNACCREDITED' && (
                      <AlertTriangle size={24} className="xy-warning-text" />
                    )}
                    {verifyResult.state === 'NOT_FOUND' && (
                      <AlertTriangle size={24} className="xy-warning-text" />
                    )}
                  </div>
                  <div>
                    <h3 className="xy-result-title">{verifyResult.title}</h3>
                    <p className="xy-result-message">{verifyResult.message}</p>
                  </div>
                  <div className="xy-result-badge-wrap">
                    <span
                      className={`xy-status-badge xy-status-badge--${verifyResult.state.toLowerCase()}`}
                    >
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
      </main>

      <Footer />
    </div>
  );
};

export default VerifyPage;
