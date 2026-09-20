import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
} from 'lucide-react';
import {
  fetchInstitutions,
  approveInstitution,
  rejectInstitution,
  updateInstitutionAccreditation,
} from '../../lib/api';

export const RegulatorDashboard = () => {
  const { user } = useAuth();
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const loadInstitutions = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const list = await fetchInstitutions();
      setInstitutions(list);
    } catch (err) {
      console.error('Failed to load institutions:', err);
      setErrorMsg(err.message || 'Could not load institutions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstitutions();
  }, []);

  const handleApprove = async (id, name) => {
    setActionLoading(id);
    setStatusMsg(null);
    setErrorMsg(null);
    try {
      const res = await approveInstitution(id);
      setStatusMsg(`Successfully approved "${name}" and registered on-chain.`);
      await loadInstitutions();
    } catch (err) {
      console.error('Approval failed:', err);
      setErrorMsg(`Failed to approve ${name}: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id, name) => {
    setActionLoading(id);
    setStatusMsg(null);
    setErrorMsg(null);
    try {
      await rejectInstitution(id);
      setStatusMsg(`Application for "${name}" has been rejected.`);
      await loadInstitutions();
    } catch (err) {
      setErrorMsg(`Failed to reject ${name}: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleAccreditation = async (id, name, currentAccredited) => {
    const nextState = !currentAccredited;
    setActionLoading(id);
    setStatusMsg(null);
    setErrorMsg(null);
    try {
      await updateInstitutionAccreditation(id, nextState);
      setStatusMsg(
        `Institution "${name}" accreditation ${nextState ? 'RESTORED' : 'REVOKED'} on-chain.`
      );
      await loadInstitutions();
    } catch (err) {
      setErrorMsg(`Failed to update accreditation for ${name}: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const pendingList = institutions.filter((i) => i.status === 'pending');
  const approvedList = institutions.filter((i) => i.status === 'approved');
  const rejectedList = institutions.filter((i) => i.status === 'rejected');

  return (
    <div className="dashboard-container">
      {/* Top Banner */}
      <div className="dashboard-header">
        <div>
          <div className="portal-badge badge-regulator">
            <ShieldCheck size={16} />
            <span>Regulator Oversight Authority</span>
          </div>
          <h1 className="dashboard-title">Institutional Accreditation & Compliance</h1>
          <p className="dashboard-sub">
            Logged in as <strong>{user?.email}</strong>. As the educational regulator, your actions directly control on-chain institutional accreditation and credential minting rights.
          </p>
        </div>
        <button
          onClick={loadInstitutions}
          disabled={loading}
          className="btn-secondary flex-align"
          title="Refresh institution records"
        >
          <RefreshCw size={16} className={loading ? 'spin-icon' : ''} />
          <span>Refresh Ledger</span>
        </button>
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
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Overview Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Pending Reviews</div>
          <div className="metric-value text-warning">{pendingList.length}</div>
          <div className="metric-footer text-muted">Awaiting regulator approval</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Approved Institutions</div>
          <div className="metric-value text-success">{approvedList.length}</div>
          <div className="metric-footer text-success">
            {approvedList.filter((i) => i.isAccreditedOnChain).length} active on-chain
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Revoked / Inactive</div>
          <div className="metric-value text-danger">
            {approvedList.filter((i) => !i.isAccreditedOnChain).length}
          </div>
          <div className="metric-footer text-danger">Accreditation revoked</div>
        </div>
      </div>

      {/* SECTION 1: Pending Institutional Applications */}
      <div className="card-panel" style={{ marginBottom: '2rem' }}>
        <div className="panel-header">
          <div>
            <h2 className="panel-title flex-align">
              <Clock size={18} className="text-warning" />
              <span>Pending Institutional Applications ({pendingList.length})</span>
            </h2>
            <p className="panel-sub">
              Review registered institutions. Approving will trigger an on-chain transaction calling <code>Registry.addInstitute()</code>.
            </p>
          </div>
        </div>

        {pendingList.length === 0 ? (
          <div className="empty-state-box">
            <CheckCircle2 size={36} className="text-muted" />
            <p>No pending institutional applications at this time.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Institution Name</th>
                  <th>Registration No.</th>
                  <th>Database ID</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingList.map((inst) => (
                  <tr key={inst.id}>
                    <td>
                      <div className="font-semibold">{inst.name}</div>
                    </td>
                    <td>
                      <code>{inst.registration_number}</code>
                    </td>
                    <td>
                      <small className="text-muted">{inst.id}</small>
                    </td>
                    <td>
                      <span className="status-badge badge-pending">
                        <Clock size={12} /> Pending Approval
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons-row">
                        <button
                          onClick={() => handleApprove(inst.id, inst.name)}
                          disabled={actionLoading === inst.id}
                          className="btn-primary btn-sm flex-align"
                          id={`approve-btn-${inst.id}`}
                        >
                          <CheckCircle2 size={14} />
                          <span>{actionLoading === inst.id ? 'Minding on Chain...' : 'Approve'}</span>
                        </button>
                        <button
                          onClick={() => handleReject(inst.id, inst.name)}
                          disabled={actionLoading === inst.id}
                          className="btn-danger btn-sm flex-align"
                          id={`reject-btn-${inst.id}`}
                        >
                          <XCircle size={14} />
                          <span>Reject</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 2: Approved Institutions & Accreditation Management */}
      <div className="card-panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title flex-align">
              <Building2 size={18} className="text-success" />
              <span>Approved Institutions & On-Chain Accreditation ({approvedList.length})</span>
            </h2>
            <p className="panel-sub">
              Manage live accreditation status. Revoking accreditation updates <code>Registry.sol</code> on-chain, causing all issued certificates to dynamically fail verification.
            </p>
          </div>
        </div>

        {approvedList.length === 0 ? (
          <div className="empty-state-box">
            <Building2 size={36} className="text-muted" />
            <p>No institutions currently approved.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Institution</th>
                  <th>Registration No.</th>
                  <th>Approved Date</th>
                  <th>On-Chain Accreditation</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {approvedList.map((inst) => {
                  const isAccredited = inst.isAccreditedOnChain !== false;
                  return (
                    <tr key={inst.id}>
                      <td>
                        <div className="font-semibold">{inst.name}</div>
                        <small className="text-muted">{inst.id}</small>
                      </td>
                      <td>
                        <code>{inst.registration_number}</code>
                      </td>
                      <td>
                        <small>
                          {inst.approved_at
                            ? new Date(inst.approved_at).toLocaleDateString()
                            : 'N/A'}
                        </small>
                      </td>
                      <td>
                        {isAccredited ? (
                          <span className="status-badge badge-active flex-align">
                            <CheckCircle2 size={12} /> Accredited & Active
                          </span>
                        ) : (
                          <span className="status-badge badge-revoked flex-align">
                            <AlertCircle size={12} /> Accreditation Revoked
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleAccreditation(inst.id, inst.name, isAccredited)}
                          disabled={actionLoading === inst.id}
                          className={`btn-sm flex-align ${isAccredited ? 'btn-danger' : 'btn-primary'}`}
                          id={`toggle-accreditation-${inst.id}`}
                        >
                          {isAccredited ? (
                            <>
                              <XCircle size={14} />
                              <span>{actionLoading === inst.id ? 'Updating...' : 'Revoke Accreditation'}</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={14} />
                              <span>{actionLoading === inst.id ? 'Updating...' : 'Restore Accreditation'}</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
