import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck2,
  ExternalLink,
  History,
  Building,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Clock,
  QrCode,
  Download,
  GraduationCap,
  User,
} from 'lucide-react';
import { verifyCertificate, logVerificationAttempt } from '../../lib/api';
import { QRScannerModal } from '../../components/QRScannerModal';
import { generateVerificationReport } from '../../lib/pdfReportGenerator';

export const CompanyDashboard = () => {
  const { user } = useAuth();
  const [credentialId, setCredentialId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showScannerModal, setShowScannerModal] = useState(false);

  const executeVerification = async (targetId) => {
    const queryId = (targetId || credentialId).trim();
    if (!queryId) return;

    setCredentialId(queryId);
    setIsVerifying(true);
    setResult(null);
    setErrorMsg(null);

    try {
      const { status, data } = await verifyCertificate(queryId);

      if (status === 404 || !data.success) {
        const notFoundResult = {
          state: 'NOT_FOUND',
          credentialId: queryId,
          title: 'Certificate Not Found',
          message: 'No official academic credential matching this ID was found on the blockchain ledger.',
        };
        setResult(notFoundResult);
        await logVerificationAttempt({
          credential_id: queryId,
          result: 'NOT_FOUND',
          company_user_id: user?.id,
        });
        addLocalAuditLog(queryId, 'NOT_FOUND');
        return;
      }

      // Determine 3 distinct meaningful outcomes:
      let verificationState = 'VALID';
      let title = 'Valid Credential';
      let message = 'This certificate is authentic, untampered, and issued by an accredited institution.';

      if (data.revoked) {
        verificationState = 'REVOKED';
        title = 'Certificate Revoked';
        message = 'This certificate was revoked by the issuing institution and is no longer valid.';
      } else if (!data.isInstituteAccredited) {
        verificationState = 'UNACCREDITED';
        title = 'Issuer No Longer Accredited';
        message =
          'The issuing institution was previously accredited, but its accreditation has since been revoked by the educational regulator.';
      } else {
        verificationState = 'VALID';
      }

      const outcome = {
        state: verificationState,
        title,
        message,
        credentialId: data.credentialId,
        ipfsHash: data.ipfsHash,
        gatewayUrl: data.gatewayUrl,
        institutionId: data.institutionId,
        institutionName: data.institutionName,
        degreeName: data.degreeName,
        studentName: data.studentName,
        issueDate: data.issueDate,
        revoked: data.revoked,
        isInstituteAccredited: data.isInstituteAccredited,
      };

      setResult(outcome);

      // Log verification attempt to Supabase verification_logs table
      await logVerificationAttempt({
        credential_id: queryId,
        result: verificationState,
        company_user_id: user?.id,
      });

      addLocalAuditLog(queryId, verificationState);
    } catch (err) {
      console.error('Verification error:', err);
      setErrorMsg(err.message || 'An error occurred during verification.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerify = (e) => {
    e.preventDefault();
    executeVerification(credentialId);
  };

  const handleScanSuccess = (scannedId) => {
    setCredentialId(scannedId);
    setShowScannerModal(false);
    executeVerification(scannedId);
  };

  const addLocalAuditLog = (id, status) => {
    const newEntry = {
      id: `log-${Date.now()}`,
      credential_id: id,
      result: status,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  return (
    <div className="dashboard-container">
      {/* Top Banner */}
      <div className="dashboard-header">
        <div>
          <div className="portal-badge badge-company">
            <BriefcaseIcon size={16} />
            <span>Employer Verification Portal</span>
          </div>
          <h1 className="dashboard-title">Official Blockchain Credential Verification</h1>
          <p className="dashboard-sub">
            Logged in as <strong>{user?.email}</strong>. Instant on-chain qualification audit against decentralized registry.
          </p>
        </div>
      </div>

      {/* Verification Search Bar */}
      <div className="card-panel" style={{ marginBottom: '2rem' }}>
        <h2 className="panel-title flex-align">
          <Search size={20} className="text-accent" />
          <span>Verify Academic Qualification</span>
        </h2>
        <p className="panel-sub">
          Enter an applicant's Credential ID or scan their certificate QR code to perform an immutable cryptographic lookup.
        </p>

        <form onSubmit={handleVerify} className="verify-search-form">
          <div className="search-input-wrap">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              required
              placeholder="e.g. CRED-077438-SNT0"
              value={credentialId}
              onChange={(e) => setCredentialId(e.target.value)}
              className="verify-input-field"
              id="verification-credential-input"
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setShowScannerModal(true)}
              className="btn-secondary btn-lg flex-align"
              id="scan-qr-modal-btn"
              title="Scan QR code using camera or image file"
            >
              <QrCode size={18} />
              <span>Scan QR Code</span>
            </button>

            <button
              type="submit"
              disabled={isVerifying || !credentialId.trim()}
              className="btn-primary btn-lg flex-align"
              id="verify-submit-btn"
            >
              <span>{isVerifying ? 'Querying Blockchain...' : 'Verify Credential'}</span>
            </button>
          </div>
        </form>
      </div>

      {errorMsg && (
        <div className="alert-box alert-error" style={{ marginBottom: '1.5rem' }}>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 3 DISTINCT VISUAL OUTCOMES */}
      {result && (
        <div className="verification-result-wrapper" id="verification-result-container">
          {/* STATE 1: VALID (GREEN) */}
          {result.state === 'VALID' && (
            <div className="verification-card outcome-valid" id="outcome-valid-card">
              <div className="outcome-icon-wrap bg-success">
                <CheckCircle2 size={44} className="text-white" />
              </div>
              <div className="outcome-content">
                <div className="outcome-badge-row">
                  <span className="outcome-pill pill-valid">
                    <CheckCircle2 size={14} /> VALID & AUTHENTIC
                  </span>
                  <span className="outcome-pill pill-accredited">
                    <ShieldCheck size={14} /> ISSUER ACCREDITED
                  </span>
                </div>

                <div className="hero-typography-block">
                  <h1 className="hero-degree-title">{result.degreeName || 'Academic Credential'}</h1>
                  <p className="hero-institution-title">{result.institutionName || result.institutionId}</p>
                </div>

                <h2 className="outcome-title text-success">{result.title}</h2>
                <p className="outcome-desc">{result.message}</p>

                <div className="outcome-details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Credential ID:</span>
                    <code className="detail-val">{result.credentialId}</code>
                  </div>
                  {result.degreeName && (
                    <div className="detail-item">
                      <span className="detail-label">Degree / Program:</span>
                      <span className="detail-val font-semibold">{result.degreeName}</span>
                    </div>
                  )}
                  {result.studentName && (
                    <div className="detail-item">
                      <span className="detail-label">Candidate Name:</span>
                      <span className="detail-val">{result.studentName}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <span className="detail-label">Issuing Institution:</span>
                    <span className="detail-val">
                      {result.institutionName ? `${result.institutionName} (${result.institutionId})` : result.institutionId}
                    </span>
                  </div>
                  {result.issueDate && (
                    <div className="detail-item">
                      <span className="detail-label">Issue Date:</span>
                      <span className="detail-val">{result.issueDate}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <span className="detail-label">Revocation Status:</span>
                    <span className="detail-val text-success font-semibold">Active (Not Revoked)</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">IPFS Anchored Hash:</span>
                    <code className="detail-val text-truncate">{result.ipfsHash}</code>
                  </div>
                </div>

                <div className="outcome-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    onClick={() => generateVerificationReport(result, user?.email)}
                    className="btn-primary flex-align"
                    id="download-hr-report-btn"
                  >
                    <Download size={16} />
                    <span>Download HR Report (PDF)</span>
                  </button>

                  {result.gatewayUrl && (
                    <a
                      href={result.gatewayUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary flex-align"
                      id="view-verified-document-btn"
                    >
                      <FileText size={16} />
                      <span>View Official PDF</span>
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STATE 2: REVOKED (RED) */}
          {result.state === 'REVOKED' && (
            <div className="verification-card outcome-revoked" id="outcome-revoked-card">
              <div className="outcome-icon-wrap bg-danger">
                <XCircle size={44} className="text-white" />
              </div>
              <div className="outcome-content">
                <div className="outcome-badge-row">
                  <span className="outcome-pill pill-revoked">
                    <XCircle size={14} /> CREDENTIAL REVOKED
                  </span>
                </div>

                <div className="hero-typography-block">
                  <h1 className="hero-degree-title">{result.degreeName || 'Academic Credential'}</h1>
                  <p className="hero-institution-title">{result.institutionName || result.institutionId}</p>
                </div>

                <h2 className="outcome-title text-danger">{result.title}</h2>
                <p className="outcome-desc">{result.message}</p>

                <div className="outcome-details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Credential ID:</span>
                    <code className="detail-val">{result.credentialId}</code>
                  </div>
                  {result.degreeName && (
                    <div className="detail-item">
                      <span className="detail-label">Degree / Program:</span>
                      <span className="detail-val">{result.degreeName}</span>
                    </div>
                  )}
                  {result.studentName && (
                    <div className="detail-item">
                      <span className="detail-label">Candidate Name:</span>
                      <span className="detail-val">{result.studentName}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <span className="detail-label">Revocation Status:</span>
                    <span className="detail-val text-danger font-semibold">REVOKED ON-CHAIN</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Issuing Institution:</span>
                    <span className="detail-val">
                      {result.institutionName ? `${result.institutionName} (${result.institutionId})` : result.institutionId}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">IPFS Hash (Audit Trail):</span>
                    <code className="detail-val text-truncate">{result.ipfsHash}</code>
                  </div>
                </div>

                <div className="outcome-actions" style={{ marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    onClick={() => generateVerificationReport(result, user?.email)}
                    className="btn-secondary flex-align"
                    id="download-hr-report-btn-revoked"
                  >
                    <Download size={16} />
                    <span>Download HR Audit Report (PDF)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STATE 3: ISSUER NO LONGER ACCREDITED (AMBER/ORANGE) */}
          {result.state === 'UNACCREDITED' && (
            <div className="verification-card outcome-unaccredited" id="outcome-unaccredited-card">
              <div className="outcome-icon-wrap bg-warning">
                <AlertTriangle size={44} className="text-white" />
              </div>
              <div className="outcome-content">
                <div className="outcome-badge-row">
                  <span className="outcome-pill pill-warning">
                    <AlertTriangle size={14} /> ISSUER NO LONGER ACCREDITED
                  </span>
                  <span className="outcome-pill pill-revoked">
                    <ShieldAlert size={14} /> ACCREDITATION REVOKED
                  </span>
                </div>

                <div className="hero-typography-block">
                  <h1 className="hero-degree-title">{result.degreeName || 'Academic Credential'}</h1>
                  <p className="hero-institution-title">{result.institutionName || result.institutionId}</p>
                </div>

                <h2 className="outcome-title text-warning">{result.title}</h2>
                <p className="outcome-desc">{result.message}</p>

                <div className="outcome-details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Credential ID:</span>
                    <code className="detail-val">{result.credentialId}</code>
                  </div>
                  {result.degreeName && (
                    <div className="detail-item">
                      <span className="detail-label">Degree / Program:</span>
                      <span className="detail-val">{result.degreeName}</span>
                    </div>
                  )}
                  {result.studentName && (
                    <div className="detail-item">
                      <span className="detail-label">Candidate Name:</span>
                      <span className="detail-val">{result.studentName}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <span className="detail-label">Issuing Institution:</span>
                    <span className="detail-val">
                      {result.institutionName ? `${result.institutionName} (${result.institutionId})` : result.institutionId}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Certificate Revoked:</span>
                    <span className="detail-val">False (Original issuance was legitimate)</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Current Accreditation Status:</span>
                    <span className="detail-val text-warning font-semibold">REVOKED BY REGULATOR</span>
                  </div>
                </div>

                <div className="outcome-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    onClick={() => generateVerificationReport(result, user?.email)}
                    className="btn-secondary flex-align"
                    id="download-hr-report-btn-unaccredited"
                  >
                    <Download size={16} />
                    <span>Download HR Audit Report (PDF)</span>
                  </button>

                  {result.gatewayUrl && (
                    <a
                      href={result.gatewayUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary flex-align"
                    >
                      <FileText size={16} />
                      <span>View Historical Document</span>
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STATE 4: NOT FOUND */}
          {result.state === 'NOT_FOUND' && (
            <div className="verification-card outcome-not-found" id="outcome-notfound-card">
              <div className="outcome-icon-wrap bg-neutral">
                <XCircle size={44} className="text-muted" />
              </div>
              <div className="outcome-content">
                <span className="outcome-pill pill-muted">UNREGISTERED</span>
                <h2 className="outcome-title text-muted">{result.title}</h2>
                <p className="outcome-desc">{result.message}</p>
                <div className="detail-item" style={{ marginTop: '1rem' }}>
                  <span className="detail-label">Queried Credential ID:</span>
                  <code className="detail-val">{result.credentialId}</code>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audit Log Table */}
      <div className="card-panel" style={{ marginTop: '2.5rem' }}>
        <div className="panel-header">
          <div>
            <h2 className="panel-title flex-align">
              <History size={18} className="text-accent" />
              <span>Verification Audit Trail</span>
            </h2>
            <p className="panel-sub">
              Logged to the <code>verification_logs</code> table in accordance with regulatory compliance standards.
            </p>
          </div>
        </div>

        {auditLogs.length === 0 ? (
          <div className="empty-state-box">
            <History size={36} className="text-muted" />
            <p>No verifications logged in this session yet.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Credential ID</th>
                  <th>Verification Outcome</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <code>{log.credential_id}</code>
                    </td>
                    <td>
                      {log.result === 'VALID' && (
                        <span className="status-badge badge-active flex-align">
                          <CheckCircle2 size={12} /> Valid
                        </span>
                      )}
                      {log.result === 'REVOKED' && (
                        <span className="status-badge badge-revoked flex-align">
                          <XCircle size={12} /> Revoked
                        </span>
                      )}
                      {log.result === 'UNACCREDITED' && (
                        <span className="status-badge badge-pending flex-align">
                          <AlertTriangle size={12} /> Unaccredited
                        </span>
                      )}
                      {log.result === 'NOT_FOUND' && (
                        <span className="status-badge badge-muted flex-align">
                          <XCircle size={12} /> Not Found
                        </span>
                      )}
                    </td>
                    <td>
                      <small className="text-muted">
                        {new Date(log.timestamp).toLocaleTimeString()} ({new Date(log.timestamp).toLocaleDateString()})
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QR Code Scanner Modal */}
      {showScannerModal && (
        <QRScannerModal
          onScan={handleScanSuccess}
          onClose={() => setShowScannerModal(false)}
        />
      )}
    </div>
  );
};

// Helper icon component
const BriefcaseIcon = ({ size = 16, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);
