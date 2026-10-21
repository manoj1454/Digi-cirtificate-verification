import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  GraduationCap,
  Briefcase,
  Cpu,
  Server,
  Database,
  FileCheck,
  Network,
  ArrowRight,
  ArrowDown,
  CheckCircle2,
  Lock,
  Layers,
  Key,
  Terminal,
  Activity,
  HardDrive,
  Workflow,
  Sparkles,
} from 'lucide-react';

export const XypherArchitectureDiagram = () => {
  // Selected pipeline flow: 'all' | 'issuance' | 'verification' | 'accreditation'
  const [activeFlow, setActiveFlow] = useState('all');
  // Selected node for deep inspection drawer/card
  const [selectedNode, setSelectedNode] = useState(null);

  const flows = [
    {
      id: 'all',
      name: 'System Topology',
      desc: 'Complete overview of actors, gateway, database, storage, and consensus.',
    },
    {
      id: 'issuance',
      name: 'Issuance & Dual-Approval',
      desc: 'Multi-party workflow: IPFS PDF pinning, SHA-256 digest, and EVM contract minting.',
    },
    {
      id: 'verification',
      name: 'Public Verification',
      desc: 'Sub-second zero-trust query: Rate limiter, on-chain proof check, and audit logging.',
    },
    {
      id: 'accreditation',
      name: 'Accreditation Governance',
      desc: 'Regulator-enforced on-chain compliance gating for academic institutions.',
    },
  ];

  const nodeDetails = {
    users: {
      title: 'Layer A: Users & Role Portals',
      subtitle: 'Client Actors & Segregated Responsibilities',
      tech: 'React 19, Lucide Icons, Role Dashboards',
      description:
        'Four dedicated user personas access tailored operational views. Note: Role selection on the client is for navigation convenience; all authorizations and data access policies are cryptographically enforced on the Express backend.',
      points: [
        'Regulator: Institutional accreditation tracking, compliance audits, and regulatory revocation authority.',
        'Institution: Academic registrars initiate certificate drafts; authorized administrators execute secondary approvals.',
        'Student: Recipients access issued qualifications, verify on-chain hashes, and download cryptographic PDFs.',
        'Company / Verifier: Human resources and background checkers run sub-second public authenticity audits.',
      ],
    },
    frontend: {
      title: 'Layer B: Frontend Presentation Layer',
      subtitle: 'Vite & React 19 Single Page Application',
      tech: 'React 19, Vite, React Router DOM, Three.js / R3F, Vanilla CSS',
      description:
        'Modern client application providing responsive, high-contrast interfaces with sub-second page transitions, dynamic 3D consensus telemetry, and zero-trust verification tools.',
      points: [
        'Role-isolated portals: /regulator, /institution, /student, and /company.',
        'Session integration: Transmits Supabase JWT bearer tokens in Authorization headers.',
        'Decentralized viewer: Direct resolution of Pinata IPFS gateway URLs for academic documents.',
        '3D Ledger Matrix: Live WebGL visualization of distributed network nodes in the hero section.',
      ],
    },
    auth: {
      title: 'Layer C1: Identity & Session Management',
      subtitle: 'Supabase Authentication Service',
      tech: 'Supabase Auth, GoTrue JWT Engine',
      description:
        'Handles user registration, credential hashing, session persistence, and cryptographic JWT issuance. The generated bearer token encapsulates user identity and claims.',
      points: [
        'Issues signed JWT tokens containing sub (user UUID) and aud claims.',
        'Maintains secure sessions with token refreshes and password reset workflows.',
        'Does NOT replace backend authorization: Express independently verifies every token.',
      ],
    },
    api: {
      title: 'Layer C2: Security Gateway & REST API',
      subtitle: 'Node.js & Express Security Gateway',
      tech: 'Node.js, Express, express-rate-limit, Multer, Ethers.js v6',
      description:
        'Enterprise API handling request routing, rate limiting, cryptographic anomaly detection, dual-approval state transitions, and EVM contract transactions.',
      points: [
        'Rate Limiting: Enforces 30 req/min threshold on public verification endpoints to prevent DDoS.',
        'Middleware: requireAuth validates Supabase JWT signatures; requireRole ensures authorized access.',
        'Document Processing: Multer ingests PDF documents; computes SHA-256 pre-upload checksums.',
        'Blockchain Driver: Uses administrative wallet to dispatch verified transactions to Hardhat EVM.',
      ],
    },
    database: {
      title: 'Layer D: Application Relational Database',
      subtitle: 'Neon Serverless PostgreSQL',
      tech: 'Neon PostgreSQL, Serverless Connection Pooler',
      description:
        'Relational data store maintaining non-blockchain state, metadata registries, pending multi-party workflow queues, and immutable audit logs.',
      points: [
        'users: Identity mapping, roles (regulator, institution, student, company), created_at.',
        'institutions: Registered universities, accreditation status, regulatory license IDs.',
        'institution_staff: Staff memberships and dual-authorization approval hierarchies.',
        'students: Student identities, matriculation numbers, and institution enrollments.',
        'certificates: Issued credentials, graduate names, degree programs, IPFS CIDs, and tx_hashes.',
        'pending_certificates: Two-step draft queue requiring second-signoff before blockchain commit.',
        'verification_logs: Comprehensive verifier IP, user-agent, timestamp, and audit trail.',
        'anomaly_flags: Automated detection of rapid issuance velocity or accreditation irregularities.',
      ],
    },
    storage: {
      title: 'Layer E: Decentralized Document Storage',
      subtitle: 'Pinata IPFS Storage Cluster',
      tech: '@pinata/sdk v2.5.6, IPFS Gateway',
      description:
        'High-durability decentralized storage for diploma and transcript PDF files. Uploaded files receive permanent Content Identifiers (CID) based on file contents, making silent tampering physically impossible.',
      points: [
        'Immutable CIDs: Any single-bit change to a PDF generates a completely distinct CID.',
        'Pre-Upload SHA-256: Local binary digest computed and matched against on-chain anchor.',
        'Dedicated Gateway: Fast content retrieval via configured Pinata gateway domain.',
        'Separation of Concerns: Document contents live on IPFS; proofs and revocations live on EVM.',
      ],
    },
    blockchain: {
      title: 'Layer F: Smart Contracts & Consensus',
      subtitle: 'Local Hardhat Development Network (Chain ID 31337)',
      tech: 'Solidity ^0.8.20, Hardhat EVM, Ethers.js v6',
      description:
        'Configured for local development on Hardhat Network (Chain ID 31337, RPC http://127.0.0.1:8545). Enforces on-chain accreditation rules, cryptographic hash anchors, and immutable revocation timestamps.',
      points: [
        'Registry.sol: Master accreditation ledger tracking authorized institutions (isAccredited).',
        'CertificateRegistry.sol: Anchors credentialId, ipfsHash, and issuing institutionId.',
        'issueCertificate(): Restricts issuance to accredited institutions; rejects revoked or duplicate IDs.',
        'verifyCertificate(): Returns validity status, revocation boolean, and live issuer standing.',
        'revokeCertificate(): Permanently marks credentials invalid while preserving historical block receipt.',
      ],
    },
  };

  const isHighlighted = (nodeKey) => {
    if (activeFlow === 'all') return true;
    if (activeFlow === 'issuance') {
      return ['users', 'frontend', 'api', 'database', 'storage', 'blockchain'].includes(nodeKey);
    }
    if (activeFlow === 'verification') {
      return ['users', 'frontend', 'api', 'database', 'blockchain'].includes(nodeKey);
    }
    if (activeFlow === 'accreditation') {
      return ['users', 'frontend', 'api', 'database', 'blockchain'].includes(nodeKey);
    }
    return true;
  };

  return (
    <section className="xypher-architecture-section" id="architecture">
      <div id="how-it-works" className="xy-section-anchor-alias" />
      <div className="xypher-arch-container">
        {/* Section Header */}
        <div className="xypher-arch-header">
          <p className="xypher-eyebrow">
            <span /> SYSTEM SPECIFICATION // PROTOCOL BLUEPRINT
          </p>
          <h2 className="xypher-arch-title">Inside the XYPHER Architecture</h2>
          <p className="xypher-arch-desc">
            Explore how identity, authorization, academic records, document storage, and credential integrity work together across the decentralized verification stack.
          </p>
        </div>

        {/* Interactive Flow Filter Tabs */}
        <div className="xy-arch-flow-selector" role="tablist" aria-label="System Architecture Flow Views">
          {flows.map((flow) => (
            <button
              key={flow.id}
              type="button"
              role="tab"
              aria-selected={activeFlow === flow.id}
              className={`xy-arch-flow-btn ${activeFlow === flow.id ? 'active' : ''}`}
              onClick={() => setActiveFlow(flow.id)}
            >
              <span className="xy-flow-dot" />
              <span className="xy-flow-name">{flow.name}</span>
            </button>
          ))}
        </div>

        {/* Active Flow Explanation Banner */}
        <div className="xy-arch-flow-banner">
          <div className="xy-flow-banner-icon">
            <Workflow size={20} className="xy-cyan-bright" />
          </div>
          <div className="xy-flow-banner-text">
            <strong>{flows.find((f) => f.id === activeFlow)?.name}:</strong>{' '}
            <span>{flows.find((f) => f.id === activeFlow)?.desc}</span>
          </div>
        </div>

        {/* Diagram Canvas Container */}
        <div className="xy-arch-diagram-canvas">
          {/* =========================================================================
              LAYER A: USERS & ROLE PORTALS
              ========================================================================= */}
          <div className={`xy-arch-layer ${isHighlighted('users') ? 'layer-highlight' : 'layer-dim'}`}>
            <div className="xy-layer-meta">
              <span className="xy-layer-tag">LAYER A</span>
              <h3 className="xy-layer-name">Users &amp; Role Portals</h3>
              <p className="xy-layer-summary">Client actors accessing role-segregated interfaces.</p>
            </div>

            <div className="xy-arch-roles-grid">
              {/* Regulator Card */}
              <div
                className="xy-arch-role-card"
                tabIndex={0}
                onClick={() => setSelectedNode('users')}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedNode('users')}
              >
                <div className="xy-role-icon-box xy-role-regulator">
                  <ShieldCheck size={20} />
                </div>
                <div className="xy-role-info">
                  <h4>Regulator</h4>
                  <p>Institution accreditation, compliance oversight, and regulatory gating.</p>
                  <span className="xy-role-route">/regulator</span>
                </div>
              </div>

              {/* Institution Card */}
              <div
                className="xy-arch-role-card"
                tabIndex={0}
                onClick={() => setSelectedNode('users')}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedNode('users')}
              >
                <div className="xy-role-icon-box xy-role-institution">
                  <Building2 size={20} />
                </div>
                <div className="xy-role-info">
                  <h4>Institution</h4>
                  <p>Registrar credential initiation, document hashing, and secondary admin signoff.</p>
                  <span className="xy-role-route">/institution</span>
                </div>
              </div>

              {/* Student Card */}
              <div
                className="xy-arch-role-card"
                tabIndex={0}
                onClick={() => setSelectedNode('users')}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedNode('users')}
              >
                <div className="xy-role-icon-box xy-role-student">
                  <GraduationCap size={20} />
                </div>
                <div className="xy-role-info">
                  <h4>Student</h4>
                  <p>Access issued qualification records, cryptographic PDF proofs, and shareable QR codes.</p>
                  <span className="xy-role-route">/student</span>
                </div>
              </div>

              {/* Company Card */}
              <div
                className="xy-arch-role-card"
                tabIndex={0}
                onClick={() => setSelectedNode('users')}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedNode('users')}
              >
                <div className="xy-role-icon-box xy-role-company">
                  <Briefcase size={20} />
                </div>
                <div className="xy-role-info">
                  <h4>Company / Verifier</h4>
                  <p>Sub-second public verification, QR validation, and authenticated audit log history.</p>
                  <span className="xy-role-route">/company &bull; /verify</span>
                </div>
              </div>
            </div>
          </div>

          {/* Connector: Users -> Frontend */}
          <div className="xy-arch-connector-v">
            <div className="xy-connector-line">
              <span className="xy-connector-pulse" />
            </div>
            <span className="xy-connector-label">HTTPS Client Interaction // RBAC Context</span>
          </div>

          {/* =========================================================================
              LAYER B: FRONTEND APPLICATION
              ========================================================================= */}
          <div className={`xy-arch-layer ${isHighlighted('frontend') ? 'layer-highlight' : 'layer-dim'}`}>
            <div className="xy-layer-meta">
              <span className="xy-layer-tag">LAYER B</span>
              <h3 className="xy-layer-name">Frontend Presentation Layer</h3>
              <p className="xy-layer-summary">React 19 &amp; Vite single-page application with responsive role dashboards.</p>
            </div>

            <div
              className="xy-arch-single-node"
              tabIndex={0}
              onClick={() => setSelectedNode('frontend')}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedNode('frontend')}
            >
              <div className="xy-node-header">
                <div className="xy-node-icon">
                  <Cpu size={24} className="xy-cyan-bright" />
                </div>
                <div>
                  <h4 className="xy-node-title">React 19 / Vite Application</h4>
                  <p className="xy-node-subtitle">Component-driven architecture with React Router 7 &amp; Three.js 3D consensus telemetry</p>
                </div>
                <span className="xy-node-badge">CLIENT TIER</span>
              </div>

              <div className="xy-node-chips">
                <span className="xy-chip">Role-Segregated Views</span>
                <span className="xy-chip">Supabase Session Handler</span>
                <span className="xy-chip">Instant QR Scanner Modal</span>
                <span className="xy-chip">PDF Cryptographic Exporter</span>
                <span className="xy-chip">3D WebGL Ledger Canvas</span>
              </div>
            </div>
          </div>

          {/* Connector: Frontend -> Auth & API */}
          <div className="xy-arch-connector-split">
            <div className="xy-connector-branch branch-left">
              <span className="xy-branch-label">① Sign-In / JWT Bearer</span>
            </div>
            <div className="xy-connector-branch branch-right">
              <span className="xy-branch-label">② Authenticated REST API Calls</span>
            </div>
          </div>

          {/* =========================================================================
              LAYER C: AUTHENTICATION & API GATEWAY
              ========================================================================= */}
          <div className={`xy-arch-layer xy-arch-layer--dual ${isHighlighted('api') ? 'layer-highlight' : 'layer-dim'}`}>
            <div className="xy-layer-meta">
              <span className="xy-layer-tag">LAYER C</span>
              <h3 className="xy-layer-name">Authentication &amp; Security Gateway</h3>
              <p className="xy-layer-summary">Segregated authentication tokens and authorized backend business logic.</p>
            </div>

            <div className="xy-arch-dual-grid">
              {/* Supabase Auth */}
              <div
                className="xy-arch-card-node"
                tabIndex={0}
                onClick={() => setSelectedNode('auth')}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedNode('auth')}
              >
                <div className="xy-card-node-head">
                  <div className="xy-node-icon-sm">
                    <Key size={20} className="xy-cyan-text" />
                  </div>
                  <div>
                    <h4>Supabase Auth Engine</h4>
                    <span className="xy-sub-tag">Identity Provider</span>
                  </div>
                </div>
                <p>
                  Issues signed cryptographically verifiable JWT bearer tokens for user sign-in and registration.
                </p>
                <ul className="xy-node-bullets">
                  <li>Secure email / password credential storage</li>
                  <li>Cryptographic JWT access token signing</li>
                  <li>Role metadata passed to client session</li>
                </ul>
              </div>

              {/* Express REST API */}
              <div
                className="xy-arch-card-node xy-card-node--highlight"
                tabIndex={0}
                onClick={() => setSelectedNode('api')}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedNode('api')}
              >
                <div className="xy-card-node-head">
                  <div className="xy-node-icon-sm">
                    <Server size={20} className="xy-cyan-bright" />
                  </div>
                  <div>
                    <h4>Express / Node.js API Gateway</h4>
                    <span className="xy-sub-tag">Business Logic &amp; Security</span>
                  </div>
                </div>
                <p>
                  Enforces strict RBAC middleware, IP rate limiting, anomaly tracking, and dual-approval state workflows.
                </p>
                <ul className="xy-node-bullets">
                  <li><code>requireAuth</code> &amp; <code>requireRole</code> middleware</li>
                  <li>Rate limiter: 30 req/min for public queries</li>
                  <li>Pre-upload SHA-256 hash calculation</li>
                  <li>Ethers.js v6 smart contract orchestrator</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Connector: Gateway -> Services */}
          <div className="xy-arch-connector-v">
            <div className="xy-connector-line">
              <span className="xy-connector-pulse" />
            </div>
            <span className="xy-connector-label">③ Relational Queries &bull; ④ IPFS Pinning &bull; ⑤ Smart Contract Consensus</span>
          </div>

          {/* =========================================================================
              LAYERS D, E, F: DATA, STORAGE & BLOCKCHAIN
              ========================================================================= */}
          <div className="xy-arch-services-grid">
            {/* Layer D: Neon PostgreSQL */}
            <div
              className={`xy-arch-service-card ${isHighlighted('database') ? 'card-highlight' : 'card-dim'}`}
              tabIndex={0}
              onClick={() => setSelectedNode('database')}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedNode('database')}
            >
              <div className="xy-service-head">
                <span className="xy-service-tag">LAYER D</span>
                <div className="xy-service-icon-box">
                  <Database size={22} className="xy-cyan-text" />
                </div>
              </div>
              <h4 className="xy-service-title">Neon PostgreSQL</h4>
              <span className="xy-service-role">Serverless Relational Database</span>
              <p className="xy-service-desc">
                Houses transactional application state, institutional directory listings, pending sign-off queues, and tamper-proof verification audit logs.
              </p>

              <div className="xy-schema-badge-list">
                <span className="xy-schema-pill" title="Users Table">users</span>
                <span className="xy-schema-pill" title="Institutions Registry">institutions</span>
                <span className="xy-schema-pill" title="Staff Roles">institution_staff</span>
                <span className="xy-schema-pill" title="Students">students</span>
                <span className="xy-schema-pill" title="Finalized Certificates">certificates</span>
                <span className="xy-schema-pill" title="Dual Approval Queue">pending_certificates</span>
                <span className="xy-schema-pill" title="Verifier Inquiries">verification_logs</span>
                <span className="xy-schema-pill" title="Security Anomaly Events">anomaly_flags</span>
              </div>
            </div>

            {/* Layer E: Pinata IPFS */}
            <div
              className={`xy-arch-service-card ${isHighlighted('storage') ? 'card-highlight' : 'card-dim'}`}
              tabIndex={0}
              onClick={() => setSelectedNode('storage')}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedNode('storage')}
            >
              <div className="xy-service-head">
                <span className="xy-service-tag">LAYER E</span>
                <div className="xy-service-icon-box">
                  <FileCheck size={22} className="xy-cyan-bright" />
                </div>
              </div>
              <h4 className="xy-service-title">Pinata / IPFS</h4>
              <span className="xy-service-role">Decentralized Document Storage</span>
              <p className="xy-service-desc">
                Stores diploma and transcript PDF assets off-chain on the IPFS peer-to-peer network, yielding an immutable cryptographic Content Identifier (CID).
              </p>

              <div className="xy-schema-badge-list">
                <span className="xy-schema-pill">@pinata/sdk v2.5.6</span>
                <span className="xy-schema-pill">Immutable CIDs</span>
                <span className="xy-schema-pill">SHA-256 Digest</span>
                <span className="xy-schema-pill">Gateway Resolution</span>
              </div>
            </div>

            {/* Layer F: Smart Contracts & Blockchain */}
            <div
              className={`xy-arch-service-card xy-service-card--blockchain ${isHighlighted('blockchain') ? 'card-highlight' : 'card-dim'}`}
              tabIndex={0}
              onClick={() => setSelectedNode('blockchain')}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedNode('blockchain')}
            >
              <div className="xy-service-head">
                <span className="xy-service-tag">LAYER F</span>
                <div className="xy-service-icon-box">
                  <Network size={22} className="xy-electric-blue" />
                </div>
              </div>
              <h4 className="xy-service-title">EVM Smart Contracts</h4>
              <span className="xy-service-role">Local Hardhat Network (Chain ID 31337)</span>
              <p className="xy-service-desc">
                Custom Solidity contracts deployed to local Hardhat node (RPC: <code>http://127.0.0.1:8545</code>). Records tamper-evident hashes, institutional accreditation, and revocations.
              </p>

              <div className="xy-schema-badge-list">
                <span className="xy-schema-pill">Registry.sol</span>
                <span className="xy-schema-pill">CertificateRegistry.sol</span>
                <span className="xy-schema-pill">isAccredited Gate</span>
                <span className="xy-schema-pill">On-Chain Revocation</span>
              </div>
            </div>
          </div>

          {/* =========================================================================
              LAYER G: END-TO-END DATA FLOW & CONNECTION LEGEND
              ========================================================================= */}
          <div className="xy-arch-flow-legend">
            <div className="xy-legend-header">
              <span className="xy-layer-tag">LAYER G</span>
              <h4>End-to-End Interaction Legend</h4>
            </div>

            <div className="xy-legend-items">
              <div className="xy-legend-item">
                <span className="xy-legend-dot dot-auth" />
                <span className="xy-legend-text">
                  <strong>Authentication:</strong> Supabase JWT bearer token transmission &amp; RBAC context
                </span>
              </div>
              <div className="xy-legend-item">
                <span className="xy-legend-dot dot-api" />
                <span className="xy-legend-text">
                  <strong>REST API Requests:</strong> Express endpoints with rate limiting &amp; anomaly checks
                </span>
              </div>
              <div className="xy-legend-item">
                <span className="xy-legend-dot dot-db" />
                <span className="xy-legend-text">
                  <strong>Database Operations:</strong> Neon PostgreSQL relational state &amp; verification logging
                </span>
              </div>
              <div className="xy-legend-item">
                <span className="xy-legend-dot dot-storage" />
                <span className="xy-legend-text">
                  <strong>Document Storage:</strong> Pinata IPFS file pinning &amp; CID retrieval
                </span>
              </div>
              <div className="xy-legend-item">
                <span className="xy-legend-dot dot-chain" />
                <span className="xy-legend-text">
                  <strong>Blockchain Consensus:</strong> Hardhat EVM (31337) smart contract execution
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Node Deep Inspector Modal / Slide-out */}
        {selectedNode && nodeDetails[selectedNode] && (
          <div className="xy-arch-inspector-modal" role="dialog" aria-modal="true" aria-labelledby="inspector-title">
            <div className="xy-inspector-backdrop" onClick={() => setSelectedNode(null)} />
            <div className="xy-inspector-panel">
              <div className="xy-inspector-header">
                <div>
                  <span className="xy-inspector-subtitle">{nodeDetails[selectedNode].subtitle}</span>
                  <h3 id="inspector-title" className="xy-inspector-title">{nodeDetails[selectedNode].title}</h3>
                </div>
                <button
                  type="button"
                  className="xy-inspector-close"
                  onClick={() => setSelectedNode(null)}
                  aria-label="Close inspector"
                >
                  ✕
                </button>
              </div>

              <div className="xy-inspector-body">
                <div className="xy-inspector-tech">
                  <span className="xy-tech-label">CORE TECHNOLOGIES:</span>
                  <span className="xy-tech-value">{nodeDetails[selectedNode].tech}</span>
                </div>

                <p className="xy-inspector-desc">{nodeDetails[selectedNode].description}</p>

                <h4 className="xy-inspector-section-heading">Verified Responsibilities:</h4>
                <ul className="xy-inspector-list">
                  {nodeDetails[selectedNode].points.map((pt, idx) => (
                    <li key={idx}>
                      <CheckCircle2 size={16} className="xy-cyan-bright" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="xy-inspector-footer">
                <button
                  type="button"
                  className="xy-button xy-button-primary"
                  onClick={() => setSelectedNode(null)}
                >
                  Close Specification
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default XypherArchitectureDiagram;
