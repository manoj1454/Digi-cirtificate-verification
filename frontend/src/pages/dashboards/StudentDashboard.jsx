import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  GraduationCap,
  Award,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ExternalLink,
  Calendar,
  Hash,
  FileText,
  RefreshCw,
  Building,
  QrCode,
} from 'lucide-react';
import { fetchStudentCertificates } from '../../lib/api';
import { QRCodeModal } from '../../components/QRCodeModal';

export const StudentDashboard = () => {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [selectedQrCert, setSelectedQrCert] = useState(null);

  const loadStudentData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchStudentCertificates();
      setCertificates(res.certificates || []);
      setStudent(res.student || null);
    } catch (err) {
      console.error('Failed to load student certificates:', err);
      setErrorMsg(err.message || 'Could not load your credentials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentData();
  }, [user]);

  return (
    <div className="dashboard-container">
      {/* Top Banner */}
      <div className="dashboard-header">
        <div>
          <div className="portal-badge badge-student">
            <GraduationCap size={16} />
            <span>Student Credential Wallet</span>
          </div>
          <h1 className="dashboard-title">My Verified Academic Credentials</h1>
          <p className="dashboard-sub">
            Logged in as <strong>{user?.email}</strong>. Academic identity cryptographically linked to your registered student profile.
          </p>
        </div>

        <button
          onClick={loadStudentData}
          disabled={loading}
          className="btn-secondary flex-align"
          title="Refresh credentials"
        >
          <RefreshCw size={16} className={loading ? 'spin-icon' : ''} />
          <span>Refresh Wallet</span>
        </button>
      </div>

      {/* Student Identity Card */}
      <div className="card-panel student-id-panel" style={{ marginBottom: '2rem' }}>
        <div className="student-id-grid">
          <div>
            <div className="student-id-label">Student Name</div>
            <div className="student-id-val font-semibold">
              {student?.full_name || 'Registered Graduate'}
            </div>
          </div>
          <div>
            <div className="student-id-label">Roll / Matriculation Number</div>
            <div className="student-id-val">
              <code>{student?.roll_number || 'N/A'}</code>
            </div>
          </div>
          <div>
            <div className="student-id-label">Issuing Institution</div>
            <div className="student-id-val">
              {student?.institutions?.name || 'Accredited Institution'}
            </div>
          </div>
          <div>
            <div className="student-id-label">Credentials in Wallet</div>
            <div className="student-id-val text-success font-semibold">
              {certificates.length} Verified
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="alert-box alert-error" style={{ marginBottom: '1.5rem' }}>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Certificates List */}
      <div className="card-panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title flex-align">
              <Award size={18} className="text-success" />
              <span>Available Certificates & Diplomas ({certificates.length})</span>
            </h2>
            <p className="panel-sub">
              These credentials are anchored on the blockchain and hosted on decentralized IPFS storage. You can view or share the official PDF at any time.
            </p>
          </div>
        </div>

        {certificates.length === 0 ? (
          <div className="empty-state-box">
            <Award size={36} className="text-muted" />
            <p>No certificates issued to your profile yet.</p>
          </div>
        ) : (
          <div className="certificates-grid">
            {certificates.map((cert) => (
              <div key={cert.id} className="student-cert-card" id={`cert-card-${cert.credential_id}`}>
                <div className="cert-card-header">
                  <div className="cert-badge flex-align">
                    <CheckCircle2 size={14} className="text-success" />
                    <span>On-Chain Verified</span>
                  </div>
                  <span className="cert-date flex-align">
                    <Calendar size={13} />
                    <span>{cert.issue_date}</span>
                  </span>
                </div>

                <h3 className="cert-degree-title">{cert.degree_name}</h3>
                <div className="cert-institution-name flex-align">
                  <Building size={14} />
                  <span>{cert.institution_name}</span>
                </div>

                <div className="cert-meta-box">
                  <div className="cert-meta-item">
                    <span className="cert-meta-label">Credential ID:</span>
                    <code className="cert-meta-value">{cert.credential_id}</code>
                  </div>
                  {cert.on_chain_tx_hash && (
                    <div className="cert-meta-item">
                      <span className="cert-meta-label">On-Chain Tx:</span>
                      <code className="cert-meta-value" title={cert.on_chain_tx_hash}>
                        {cert.on_chain_tx_hash.slice(0, 10)}...{cert.on_chain_tx_hash.slice(-6)}
                      </code>
                    </div>
                  )}
                </div>

                <div className="cert-card-footer" style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedQrCert(cert)}
                    className="btn-secondary btn-sm flex-align"
                    id={`view-qr-btn-${cert.credential_id}`}
                  >
                    <QrCode size={14} />
                    <span>View QR Code</span>
                  </button>

                  {cert.gatewayUrl ? (
                    <a
                      href={cert.gatewayUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-primary btn-sm flex-align"
                      id={`download-cert-${cert.credential_id}`}
                    >
                      <FileText size={14} />
                      <span>View PDF</span>
                      <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span className="text-muted text-sm">IPFS Anchoring Complete</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QR Code Display & Download Modal */}
      {selectedQrCert && (
        <QRCodeModal
          credentialId={selectedQrCert.credential_id}
          degreeName={selectedQrCert.degree_name}
          studentName={student?.full_name}
          institutionName={selectedQrCert.institution_name || student?.institutions?.name}
          onClose={() => setSelectedQrCert(null)}
        />
      )}
    </div>
  );
};
