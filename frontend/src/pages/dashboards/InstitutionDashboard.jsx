import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Award,
  PlusCircle,
  CheckCircle2,
  FileText,
  Users,
  Building,
  Shield,
  Clock,
  AlertTriangle,
  UploadCloud,
  ExternalLink,
  Lock,
  RefreshCw,
  UserPlus,
  ArrowRight,
  ShieldAlert,
  UserCheck,
  Mail,
  Key,
  Info,
  QrCode,
  BarChart2,
  TrendingUp,
  Search,
} from 'lucide-react';
import {
  fetchMyInstitution,
  fetchInstitutions,
  fetchStudents,
  addStudent,
  fetchPendingCertificates,
  fetchIssuedCertificates,
  initiateCertificate,
  approveCertificate,
  inviteStaff,
  fetchInstitutionStaff,
  fetchInstitutionStats,
  revokeCertificate,
} from '../../lib/api';
import { QRCodeModal } from '../../components/QRCodeModal';

export const InstitutionDashboard = () => {
  const { user } = useAuth();

  const [institution, setInstitution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [pendingCertificates, setPendingCertificates] = useState([]);
  const [issuedCertificates, setIssuedCertificates] = useState([]);
  const [stats, setStats] = useState(null);

  // Modals & form state
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedQrCert, setSelectedQrCert] = useState(null);

  // Add student form
  const [newStudent, setNewStudent] = useState({ full_name: '', roll_number: '', email: '' });
  const [addingStudent, setAddingStudent] = useState(false);

  // Invite staff form
  const [newStaff, setNewStaff] = useState({
    email: '',
    full_name: '',
    password: 'StaffPassword123!',
  });
  const [invitingStaff, setInvitingStaff] = useState(false);

  // Issue certificate form
  const [issueData, setIssueData] = useState({
    student_id: '',
    degree_name: '',
    issue_date: new Date().toISOString().split('T')[0],
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [issuing, setIssuing] = useState(false);

  // Multi-sig action state
  const [actionLoading, setActionLoading] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch institution record for logged in user
      let inst = null;
      try {
        inst = await fetchMyInstitution();
      } catch (e) {
        const list = await fetchInstitutions();
        inst = list.find((i) => i.user_id === user?.id) || list[0] || null;
      }
      setInstitution(inst);

      if (inst && inst.status === 'approved') {
        const [studentList, staffData, pendingList, issuedList, statsData] = await Promise.all([
          fetchStudents(inst.id),
          fetchInstitutionStaff(inst.id).catch(() => []),
          fetchPendingCertificates(inst.id),
          fetchIssuedCertificates(inst.id),
          fetchInstitutionStats(inst.id).catch(() => null),
        ]);
        setStudents(studentList);
        setStaffList(staffData);
        setPendingCertificates(pendingList);
        setIssuedCertificates(issuedList);
        setStats(statsData);
      }
    } catch (err) {
      console.error('Failed to load institution data:', err);
      setErrorMsg(err.message || 'Error loading dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Handle student creation
  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!institution || !newStudent.full_name || !newStudent.roll_number) return;
    setAddingStudent(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const added = await addStudent(institution.id, newStudent);
      setStatusMsg(`Student "${added.full_name}" registered successfully.`);
      setShowStudentModal(false);
      setNewStudent({ full_name: '', roll_number: '', email: '' });
      const updated = await fetchStudents(institution.id);
      setStudents(updated);
    } catch (err) {
      setErrorMsg(`Failed to add student: ${err.message}`);
    } finally {
      setAddingStudent(false);
    }
  };

  // Handle staff invitation
  const handleInviteStaff = async (e) => {
    e.preventDefault();
    console.log('[handleInviteStaff] CALLED! institution:', institution?.id, 'email:', newStaff?.email, 'full_name:', newStaff?.full_name);
    if (!institution || !newStaff.email) {
      console.warn('[handleInviteStaff] EARLY EXIT: institution is', institution, 'email is', newStaff?.email);
      return;
    }
    setInvitingStaff(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const res = await inviteStaff(institution.id, newStaff);
      setStatusMsg(
        `Staff member "${newStaff.email}" invited successfully! They can log in with password: "${newStaff.password}" to participate in multi-sig approvals.`
      );
      setShowInviteModal(false);
      setNewStaff({ email: '', full_name: '', password: 'StaffPassword123!' });
      const updatedStaff = await fetchInstitutionStaff(institution.id);
      setStaffList(updatedStaff);
    } catch (err) {
      setErrorMsg(`Failed to invite staff member: ${err.message}`);
    } finally {
      setInvitingStaff(false);
    }
  };

  // Handle Certificate Initiation
  const handleInitiateCertificate = async (e) => {
    e.preventDefault();
    if (!institution || !issueData.student_id || !issueData.degree_name || !selectedFile) {
      setErrorMsg('Please select a student, provide a degree title, and upload a valid PDF certificate.');
      return;
    }

    setIssuing(true);
    setErrorMsg(null);
    setStatusMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile, selectedFile.name);
      formData.append('institution_id', institution.id);
      formData.append('student_id', issueData.student_id);
      formData.append('degree_name', issueData.degree_name);
      formData.append('issue_date', issueData.issue_date);

      const initiated = await initiateCertificate(formData);
      setStatusMsg(
        `Certificate initiated with Credential ID: ${initiated.credential_id}. Multi-sig rule: Log out and log in as another staff member to approve and mine on-chain.`
      );
      setShowIssueModal(false);
      setIssueData({
        student_id: '',
        degree_name: '',
        issue_date: new Date().toISOString().split('T')[0],
      });
      setSelectedFile(null);
      await loadData();
    } catch (err) {
      setErrorMsg(`Certificate initiation failed: ${err.message}`);
    } finally {
      setIssuing(false);
    }
  };

  // Handle Approval
  const handleApprove = async (pendingCert) => {
    setActionLoading(pendingCert.id);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const res = await approveCertificate(pendingCert.id);
      setStatusMsg(
        `Certificate ${pendingCert.credential_id} successfully approved and mined on-chain! Tx: ${res.on_chain_tx_hash.slice(0, 10)}...`
      );

      // Automatically open the QR Code modal for the newly issued certificate
      setSelectedQrCert({
        credential_id: pendingCert.credential_id,
        degree_name: pendingCert.degree_name,
        students: pendingCert.students,
      });

      await loadData();
    } catch (err) {
      setErrorMsg(`Approval failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Certificate Revocation
  const handleRevokeCertificate = async (cert) => {
    setActionLoading(`revoke-${cert.id}`);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      await revokeCertificate(cert.id);
      setStatusMsg(`Certificate ${cert.credential_id} successfully revoked on-chain.`);
      await loadData();
    } catch (err) {
      setErrorMsg(`Certificate revocation failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="dashboard-container">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: '1rem' }}>
          <RefreshCw size={36} className="spin-slow text-accent" />
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>Loading institutional records and smart contract status...</p>
        </div>
      </div>
    );
  }

  // 1. Pending Regulator Approval State
  if (!loading && institution && institution.status === 'pending') {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div>
            <div className="portal-badge badge-institution">
              <Building size={16} />
              <span>Academic Institution Portal</span>
            </div>
            <h1 className="dashboard-title">{institution.name}</h1>
            <p className="dashboard-sub">Registration Number: <code>{institution.registration_number}</code></p>
          </div>
          <button onClick={loadData} className="btn-secondary flex-align">
            <RefreshCw size={16} />
            <span>Check Approval Status</span>
          </button>
        </div>

        <div className="approval-pending-card">
          <div className="approval-pending-icon-wrap">
            <Clock size={48} className="text-warning spin-slow" />
          </div>
          <h2 className="approval-pending-title">Waiting for Regulator Approval</h2>
          <p className="approval-pending-desc">
            Your institution registration has been submitted and is currently pending accreditation review by the Educational Regulator. Once the regulator approves your institution and registers it on-chain in <code>Registry.sol</code>, your credential minting and student management features will be unlocked automatically.
          </p>
          <div className="approval-pending-footer">
            <div className="approval-step-badge">
              <CheckCircle2 size={16} className="text-success" />
              <span>Identity & Registration Created</span>
            </div>
            <div className="approval-step-divider"></div>
            <div className="approval-step-badge pending">
              <Clock size={16} className="text-warning" />
              <span>Awaiting Regulator On-Chain Approval</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Rejected State
  if (!loading && institution && institution.status === 'rejected') {
    return (
      <div className="dashboard-container">
        <div className="alert-box alert-error">
          <ShieldAlert size={28} />
          <div>
            <strong>Institutional Application Rejected</strong>
            <p>Your institutional application was reviewed and rejected by the regulator. Contact the accreditation board for compliance details.</p>
          </div>
        </div>
      </div>
    );
  }

  // 3. Approved & Active Dashboard
  return (
    <div className="dashboard-container">
      {/* Top Banner */}
      <div className="dashboard-header">
        <div>
          <div className="portal-badge badge-institution" id="institution-badge" data-institution-id={institution?.id}>
            <Building size={16} />
            <span>{institution?.name || 'Academic Institution Node'}</span>
          </div>
          <h1 className="dashboard-title">Credential Issuance & Records Portal</h1>
          <p className="dashboard-sub">
            Logged in as <strong>{user?.email}</strong>. Accredited institution authority with rights to mint credentials.
          </p>
        </div>

        <div className="flex-align" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowInviteModal(true)}
            className="btn-secondary flex-align"
            id="invite-staff-btn"
          >
            <UserPlus size={16} />
            <span>Invite Staff Member</span>
          </button>
          <button
            onClick={() => setShowStudentModal(true)}
            className="btn-secondary flex-align"
            id="add-student-btn"
          >
            <Users size={16} />
            <span>Add Student</span>
          </button>
          <button
            onClick={() => setShowIssueModal(true)}
            className="btn-primary flex-align"
            id="issue-certificate-btn"
          >
            <PlusCircle size={18} />
            <span>Issue Certificate</span>
          </button>
        </div>
      </div>

      {/* Multi-Sig Security Protocol Explanatory Notice */}
      <div className="alert-box alert-info" style={{ marginBottom: '1.5rem' }}>
        <Shield size={18} style={{ flexShrink: 0, color: 'var(--text-secondary)' }} />
        <div>
          <strong style={{ color: 'var(--text-primary)' }}>Multi-Sig Governance Policy Active:</strong>
          <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
            Issuing an academic credential requires two distinct staff approvals. The staff member who initiates a certificate cannot approve it. To complete approval, log out and log in with an invited staff member's account.
          </span>
        </div>
      </div>

      {/* Notifications */}
      {statusMsg && (
        <div className="alert-box alert-success" style={{ marginBottom: '1.5rem' }}>
          <CheckCircle2 size={18} />
          <span>{statusMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="alert-box alert-error" style={{ marginBottom: '1.5rem' }}>
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* SECTION: Analytics & Supabase Telemetry Statistics */}
      {stats && (
        <div className="card-panel" style={{ marginBottom: '2rem' }}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title flex-align">
                <BarChart2 size={18} className="text-accent" />
                <span>Institution Analytics & Verification Audit</span>
              </h2>
              <p className="panel-sub">
                Pure Supabase database aggregation telemetry showing credentials issued, revocations, and verification requests received.
              </p>
            </div>
          </div>

          <div className="metrics-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="metric-card">
              <div className="metric-label">Total Issued</div>
              <div className="metric-value text-success" id="stat-total-issued">{stats.total_issued}</div>
              <div className="metric-footer text-muted">Mined credentials on-chain</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Total Revoked</div>
              <div className="metric-value text-danger" id="stat-total-revoked">{stats.total_revoked}</div>
              <div className="metric-footer text-muted">Revoked by institution</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Verification Lookups</div>
              <div className="metric-value text-accent" id="stat-total-verifications">{stats.total_verifications}</div>
              <div className="metric-footer text-muted">Employer audit requests logged</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Active Credentials</div>
              <div className="metric-value" id="stat-active-credentials">{Math.max(0, stats.total_issued - stats.total_revoked)}</div>
              <div className="metric-footer text-success font-medium">100% In Good Standing</div>
            </div>
          </div>

          {/* Issuance Over Time Breakdown */}
          <div className="issuance-timeline-box">
            <div className="flex-align" style={{ gap: '0.5rem', marginBottom: '1rem' }}>
              <TrendingUp size={16} className="text-secondary" />
              <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>Issuance Volume Over Time</span>
            </div>

            {(!stats.issuance_over_time || stats.issuance_over_time.length === 0) ? (
              <p className="text-muted text-sm">No historical issuance periods recorded yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {stats.issuance_over_time.map((item) => {
                  const maxCount = Math.max(...stats.issuance_over_time.map((i) => i.count), 1);
                  const percentage = Math.max(15, Math.round((item.count / maxCount) * 100));
                  return (
                    <div key={item.period} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '85px', fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                        {item.period}
                      </div>
                      <div className="timeline-track">
                        <div
                          className="timeline-bar"
                          style={{
                            width: `${percentage}%`,
                          }}
                        >
                          {item.count} {item.count === 1 ? 'credential' : 'credentials'}
                        </div>
                      </div>
                      <div style={{ width: '70px', textAlign: 'right', fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                        {item.count} total
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 1: Pending Certificates (Multi-Sig Approval Queue) */}
      <div className="card-panel" style={{ marginBottom: '2rem' }}>
        <div className="panel-header">
          <div>
            <h2 className="panel-title flex-align">
              <Clock size={18} className="text-warning" />
              <span>Pending Multi-Sig Certificates ({pendingCertificates.length})</span>
            </h2>
            <p className="panel-sub">
              Dual authorization required: The initiating staff member cannot approve their own submission.
            </p>
          </div>
        </div>

        {pendingCertificates.length === 0 ? (
          <div className="empty-state-box">
            <CheckCircle2 size={36} className="text-muted" />
            <p>No certificates currently awaiting approval.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Credential ID</th>
                  <th>Student</th>
                  <th>Degree Program</th>
                  <th>Initiated By</th>
                  <th>Multi-Sig Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingCertificates.map((cert) => {
                  const isInitiator = cert.created_by === user?.id;
                  const studentName = cert.students?.full_name || 'Enrolled Student';
                  return (
                    <tr key={cert.id}>
                      <td>
                        <code>{cert.credential_id}</code>
                      </td>
                      <td>
                        <div className="font-semibold">{studentName}</div>
                        <small className="text-muted">{cert.students?.roll_number}</small>
                      </td>
                      <td>{cert.degree_name}</td>
                      <td>
                        <small className="text-muted">
                          {isInitiator ? (
                            <span className="text-accent font-semibold">You ({user?.email})</span>
                          ) : (
                            <span>Staff [{cert.created_by.slice(0, 8)}...]</span>
                          )}
                        </small>
                      </td>
                      <td>
                        {isInitiator ? (
                          <span className="status-badge badge-pending flex-align" title="Multi-sig rule: Initiator cannot self-approve">
                            <Lock size={12} /> Awaiting 2nd Staff Signer
                          </span>
                        ) : (
                          <span className="status-badge badge-active flex-align">
                            <CheckCircle2 size={12} /> Ready for Your Approval
                          </span>
                        )}
                      </td>
                      <td>
                        {isInitiator ? (
                          <button
                            disabled
                            className="btn-secondary btn-sm flex-align"
                            style={{ opacity: 0.65, cursor: 'not-allowed' }}
                            title="Multi-sig rule: You initiated this certificate. Log out and log in as another staff member to approve."
                          >
                            <Lock size={14} />
                            <span>Awaiting 2nd Signer</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleApprove(cert)}
                            disabled={actionLoading === cert.id}
                            className="btn-primary btn-sm flex-align"
                            id={`approve-cert-${cert.id}`}
                            title="Approve and issue on-chain"
                          >
                            <CheckCircle2 size={14} />
                            <span>{actionLoading === cert.id ? 'Mining on Chain...' : 'Approve & Issue'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 2: Institutional Staff Roster */}
      <div className="card-panel" style={{ marginBottom: '2rem' }}>
        <div className="panel-header">
          <div>
            <h2 className="panel-title flex-align">
              <Users size={18} className="text-accent" />
              <span>Authorized Institutional Staff & Multi-Sig Signers ({staffList.length})</span>
            </h2>
            <p className="panel-sub">
              All staff members belonging to {institution?.name || 'this institution'} who hold authorization to initiate or approve credentials.
            </p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="btn-secondary btn-sm flex-align"
            id="invite-staff-btn-roster"
          >
            <UserPlus size={14} />
            <span>Invite Another Staff Member</span>
          </button>
        </div>

        {staffList.length === 0 ? (
          <div className="empty-state-box">
            <Users size={36} className="text-muted" />
            <p>No staff members listed yet. Click "Invite Staff Member" above to add a second signer.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Staff Name & Email</th>
                  <th>Role / Identity</th>
                  <th>Account Status</th>
                  <th>Multi-Sig Eligibility</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((s) => {
                  const isCurrent = s.id === user?.id || s.email === user?.email;
                  return (
                    <tr key={s.id}>
                      <td>
                        <div className="font-semibold">{s.fullName || s.email}</div>
                        <small className="text-muted">{s.email}</small>
                      </td>
                      <td>
                        <span className="portal-badge badge-institution" style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}>
                          {s.isOwner ? 'Institution Owner' : 'Authorized Staff'}
                        </span>
                      </td>
                      <td>
                        {isCurrent ? (
                          <span className="status-badge badge-active flex-align">
                            <UserCheck size={12} /> Currently Logged In
                          </span>
                        ) : (
                          <span className="status-badge badge-neutral flex-align">
                            <CheckCircle2 size={12} /> Active Account
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="text-muted font-medium" style={{ fontSize: '0.85rem' }}>
                          {isCurrent ? 'Can initiate or approve others' : 'Can approve your submissions'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 3: Already Issued Certificates */}
      <div className="card-panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title flex-align">
              <Award size={18} className="text-success" />
              <span>Issued Academic Credentials ({issuedCertificates.length})</span>
            </h2>
            <p className="panel-sub">
              Finalized credentials registered on-chain with IPFS storage and scannable QR verification codes.
            </p>
          </div>
        </div>

        {issuedCertificates.length === 0 ? (
          <div className="empty-state-box">
            <Award size={36} className="text-muted" />
            <p>No certificates issued yet.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Credential ID</th>
                  <th>Student</th>
                  <th>Degree Program</th>
                  <th>Issue Date</th>
                  <th>On-Chain Tx</th>
                  <th>Actions & Verification</th>
                </tr>
              </thead>
              <tbody>
                {issuedCertificates.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <code>{c.credential_id}</code>
                    </td>
                    <td>
                      <div className="font-semibold">{c.students?.full_name || 'Student'}</div>
                      <small className="text-muted">{c.students?.roll_number}</small>
                    </td>
                    <td>{c.degree_name}</td>
                    <td>{c.issue_date}</td>
                    <td>
                      {c.on_chain_tx_hash ? (
                        <code title={c.on_chain_tx_hash}>
                          {c.on_chain_tx_hash.slice(0, 10)}...{c.on_chain_tx_hash.slice(-6)}
                        </code>
                      ) : (
                        <small className="text-muted">Confirmed</small>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedQrCert(c)}
                          className="btn-secondary btn-sm flex-align"
                          id={`view-qr-${c.credential_id}`}
                          title="Generate, download, and print QR verification code"
                        >
                          <QrCode size={14} />
                          <span>QR Code</span>
                        </button>

                        {c.gatewayUrl ? (
                          <a
                            href={c.gatewayUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-primary btn-sm flex-align"
                            id={`view-pdf-${c.credential_id}`}
                          >
                            <FileText size={14} />
                            <span>PDF</span>
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span className="text-muted text-sm">On IPFS</span>
                        )}

                        {c.revoked ? (
                          <span className="status-badge badge-revoked flex-align" style={{ fontSize: '0.75rem' }}>
                            <ShieldAlert size={12} /> Revoked
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRevokeCertificate(c)}
                            disabled={actionLoading === `revoke-${c.id}`}
                            className="btn-danger btn-sm flex-align"
                            id={`revoke-cert-${c.credential_id}`}
                            title="Revoke certificate on-chain"
                          >
                            <ShieldAlert size={14} />
                            <span>{actionLoading === `revoke-${c.id}` ? 'Revoking...' : 'Revoke'}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {selectedQrCert && (
        <QRCodeModal
          credentialId={selectedQrCert.credential_id}
          degreeName={selectedQrCert.degree_name}
          studentName={selectedQrCert.students?.full_name}
          institutionName={institution?.name}
          onClose={() => setSelectedQrCert(null)}
        />
      )}

      {/* MODAL 1: Invite Staff */}
      {showInviteModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3 className="modal-title flex-align">
              <UserPlus size={20} />
              <span>Invite Staff Member (Multi-Sig Signer)</span>
            </h3>
            <p className="modal-sub">
              Creates an authentic Supabase Auth account linked to <strong>{institution?.name}</strong>. The invited staff member can log in and approve credentials initiated by you.
            </p>
            <form onSubmit={handleInviteStaff} className="modal-form">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Professor Robert Chen"
                  value={newStaff.full_name}
                  onChange={(e) => setNewStaff((prev) => ({ ...prev, full_name: e.target.value }))}
                  className="form-input"
                  id="staff-name-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Institutional Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="robert.chen@institution.edu"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff((prev) => ({ ...prev, email: e.target.value }))}
                  className="form-input"
                  id="staff-email-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Temporary Password *</label>
                <input
                  type="text"
                  required
                  value={newStaff.password}
                  onChange={(e) => setNewStaff((prev) => ({ ...prev, password: e.target.value }))}
                  className="form-input"
                  id="staff-password-input"
                />
                <small className="text-muted">
                  The second staff member will use this password to sign into their account.
                </small>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={invitingStaff}
                  className="btn-primary flex-align"
                  id="submit-invite-staff-btn"
                >
                  <UserPlus size={16} />
                  <span>{invitingStaff ? 'Creating Staff Account...' : 'Invite Staff Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Student */}
      {showStudentModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3 className="modal-title flex-align">
              <UserPlus size={20} />
              <span>Enroll Student to Institution</span>
            </h3>
            <form onSubmit={handleAddStudent} className="modal-form">
              <div className="form-group">
                <label className="form-label">Student Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. David Vance"
                  value={newStudent.full_name}
                  onChange={(e) => setNewStudent((prev) => ({ ...prev, full_name: e.target.value }))}
                  className="form-input"
                  id="student-name-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Roll Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS-2024-049"
                  value={newStudent.roll_number}
                  onChange={(e) => setNewStudent((prev) => ({ ...prev, roll_number: e.target.value }))}
                  className="form-input"
                  id="student-roll-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="david.vance@student.edu"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent((prev) => ({ ...prev, email: e.target.value }))}
                  className="form-input"
                  id="student-email-input"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingStudent}
                  className="btn-primary"
                  id="submit-add-student-btn"
                >
                  {addingStudent ? 'Enrolling...' : 'Enroll Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Issue Certificate */}
      {showIssueModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3 className="modal-title flex-align">
              <PlusCircle size={20} />
              <span>Initiate New Academic Credential</span>
            </h3>
            <p className="modal-sub">
              Credential ID will be auto-generated cryptographically server-side. Upload the official PDF certificate for IPFS anchoring.
            </p>

            <form onSubmit={handleInitiateCertificate} className="modal-form">
              <div className="form-group">
                <label className="form-label">Select Student *</label>
                {students.length === 0 ? (
                  <p className="text-warning">
                    No students enrolled yet. Please add a student first.
                  </p>
                ) : (
                  <select
                    required
                    value={issueData.student_id}
                    onChange={(e) => setIssueData((prev) => ({ ...prev, student_id: e.target.value }))}
                    className="form-input"
                    id="select-student-dropdown"
                  >
                    <option value="">-- Choose enrolled student --</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} ({s.roll_number})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Degree / Program Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master of Science in Cybersecurity & Distributed Systems"
                  value={issueData.degree_name}
                  onChange={(e) => setIssueData((prev) => ({ ...prev, degree_name: e.target.value }))}
                  className="form-input"
                  id="degree-name-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Issue Date *</label>
                <input
                  type="date"
                  required
                  value={issueData.issue_date}
                  onChange={(e) => setIssueData((prev) => ({ ...prev, issue_date: e.target.value }))}
                  className="form-input"
                  id="issue-date-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Official Certificate PDF File *</label>
                <input
                  type="file"
                  required
                  accept="application/pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="form-input"
                  id="certificate-file-input"
                />
                <small className="text-muted">
                  Must be a valid PDF document (%PDF header verified).
                </small>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={issuing || students.length === 0}
                  className="btn-primary"
                  id="submit-initiate-cert-btn"
                >
                  {issuing ? 'Anchoring to Pinata IPFS...' : 'Initiate Certificate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
