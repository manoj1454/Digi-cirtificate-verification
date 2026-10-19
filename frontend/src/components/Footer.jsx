import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ExternalLink, Lock, CheckCircle2, Database, Shield } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="xy-footer" role="contentinfo">
      <div className="xy-container">
        <div className="xy-footer__grid">
          {/* Brand info */}
          <div className="xy-footer__col xy-footer__col--brand">
            <Link to="/" className="brand-link xy-footer__brand-link">
              <div className="logo-icon-wrap">
                <ShieldCheck className="logo-icon" size={24} />
              </div>
              <div className="brand-text">
                <span className="brand-title">XYPHER</span>
                <span className="brand-sub">Verify. Trust. Authenticate.</span>
              </div>
            </Link>
            <p className="xy-footer__desc">
              Decentralized academic credential verification platform. Engineered for accredited universities, regulatory bodies, students, and enterprise verifiers.
            </p>
            <div className="xy-footer__env-badge">
              <span className="env-dot" />
              <span>Demo Environment // Local Hardhat &amp; Neon PostgreSQL</span>
            </div>
          </div>

          {/* Quick links */}
          <div className="xy-footer__col">
            <h4 className="xy-footer__heading">Platform</h4>
            <ul className="xy-footer__links">
              <li><a href="/#hero" className="xy-footer__link">Overview</a></li>
              <li><a href="/#how-it-works" className="xy-footer__link">How It Works</a></li>
              <li><a href="/#features" className="xy-footer__link">Features</a></li>
              <li><a href="/#verify" className="xy-footer__link">Public Verification</a></li>
            </ul>
          </div>

          {/* Roles */}
          <div className="xy-footer__col">
            <h4 className="xy-footer__heading">Portals</h4>
            <ul className="xy-footer__links">
              <li><Link to="/login" className="xy-footer__link">Regulator Portal</Link></li>
              <li><Link to="/login" className="xy-footer__link">Institution Dashboard</Link></li>
              <li><Link to="/login" className="xy-footer__link">Student Registry</Link></li>
              <li><Link to="/login" className="xy-footer__link">Verifier Gateway</Link></li>
            </ul>
          </div>

          {/* Security & Architecture */}
          <div className="xy-footer__col">
            <h4 className="xy-footer__heading">Security Architecture</h4>
            <p className="xy-footer__security-note">
              Credentials are cryptographic hashes anchored to smart contracts. File documents are stored via IPFS decentralized storage with strict institutional isolation.
            </p>
            <div className="xy-footer__security-tags">
              <span className="xy-tech-tag"><Lock size={12} /> Neon RLS</span>
              <span className="xy-tech-tag"><Database size={12} /> IPFS / Pinata</span>
              <span className="xy-tech-tag"><Shield size={12} /> Smart Contracts</span>
            </div>
          </div>
        </div>

        <div className="xy-footer__bottom">
          <div className="xy-footer__disclaimer">
            <span>Notice: This is a sandbox demonstration platform. Cryptographic verification runs against local simulated blockchain or configured testnet. Never submit confidential real-world credentials.</span>
          </div>
          <div className="xy-footer__copyright">
            &copy; {new Date().getFullYear()} XYPHER Protocol. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};
