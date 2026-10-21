import React from 'react';

/**
 * High-performance SVG fallback for devices without WebGL support
 * or when reduced motion / low-power mode is enabled.
 * Matches existing test expectations (.seal-fallback-svg) while maintaining
 * the isometric matrix visual language.
 */
export function XypherLedgerMatrixFallback({ className = '' }) {
  return (
    <div
      className={`xypher-matrix-fallback seal-fallback-svg ${className}`}
      id="hero-seal-container"
      role="img"
      aria-label="XYPHER Cryptographic Ledger Matrix Graphic"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <svg
        viewBox="0 0 800 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%', maxHeight: '680px' }}
      >
        <defs>
          <radialGradient id="matrixCenterGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#15abd9" stopOpacity="0.25" />
            <stop offset="50%" stopColor="#0369a1" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#061426" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="cubeFaceTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.65" />
          </linearGradient>

          <linearGradient id="cubeFaceLeft" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#03446a" stopOpacity="0.85" />
          </linearGradient>

          <linearGradient id="cubeFaceRight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0369a1" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#062238" stopOpacity="0.95" />
          </linearGradient>

          <filter id="fallbackGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Backdrop Ambient Glow */}
        <circle cx="400" cy="300" r="280" fill="url(#matrixCenterGlow)" />

        {/* Isometric Grid Lines */}
        <g stroke="#15abd9" strokeOpacity="0.2" strokeWidth="1">
          {/* Diagonal axes */}
          <line x1="80" y1="120" x2="720" y2="480" />
          <line x1="160" y1="80" x2="640" y2="520" />
          <line x1="240" y1="40" x2="560" y2="560" />
          <line x1="320" y1="20" x2="480" y2="580" />

          <line x1="720" y1="120" x2="80" y2="480" />
          <line x1="640" y1="80" x2="160" y2="520" />
          <line x1="560" y1="40" x2="240" y2="560" />
          <line x1="480" y1="20" x2="320" y2="580" />

          {/* Secondary Matrix Rings */}
          <ellipse cx="400" cy="300" rx="340" ry="180" stroke="#38bdf8" strokeOpacity="0.15" strokeDasharray="4 8" />
          <ellipse cx="400" cy="300" rx="220" ry="110" stroke="#5be3ff" strokeOpacity="0.25" strokeDasharray="6 6" />
          <ellipse cx="400" cy="300" rx="100" ry="50" stroke="#15abd9" strokeOpacity="0.4" />
        </g>

        {/* Central Master Anchor Cube */}
        <g transform="translate(400, 260)" filter="url(#fallbackGlow)">
          {/* Top Face */}
          <polygon points="0,-48 48,-24 0,0 -48,-24" fill="url(#cubeFaceTop)" stroke="#5be3ff" strokeWidth="1.5" />
          {/* Left Face */}
          <polygon points="-48,-24 0,0 0,56 -48,32" fill="url(#cubeFaceLeft)" stroke="#38bdf8" strokeWidth="1.2" />
          {/* Right Face */}
          <polygon points="0,0 48,-24 48,32 0,56" fill="url(#cubeFaceRight)" stroke="#0ea5e9" strokeWidth="1.2" />

          {/* Emitted Pulse Ring */}
          <ellipse cx="0" cy="56" rx="60" ry="30" stroke="#5be3ff" strokeOpacity="0.5" strokeWidth="1.5" fill="none" />
        </g>

        {/* Peripheral Floating Credential Nodes */}
        {/* Node 1: Left */}
        <g transform="translate(240, 220)">
          <polygon points="0,-24 24,-12 0,0 -24,-12" fill="url(#cubeFaceTop)" stroke="#5be3ff" strokeWidth="1" />
          <polygon points="-24,-12 0,0 0,28 -24,16" fill="url(#cubeFaceLeft)" stroke="#38bdf8" strokeWidth="1" />
          <polygon points="0,0 24,-12 24,16 0,28" fill="url(#cubeFaceRight)" stroke="#0ea5e9" strokeWidth="1" />
          <line x1="0" y1="28" x2="0" y2="60" stroke="#38bdf8" strokeOpacity="0.4" strokeDasharray="2 3" />
        </g>

        {/* Node 2: Right */}
        <g transform="translate(560, 240)">
          <polygon points="0,-24 24,-12 0,0 -24,-12" fill="url(#cubeFaceTop)" stroke="#5be3ff" strokeWidth="1" />
          <polygon points="-24,-12 0,0 0,28 -24,16" fill="url(#cubeFaceLeft)" stroke="#38bdf8" strokeWidth="1" />
          <polygon points="0,0 24,-12 24,16 0,28" fill="url(#cubeFaceRight)" stroke="#0ea5e9" strokeWidth="1" />
          <line x1="0" y1="28" x2="0" y2="70" stroke="#38bdf8" strokeOpacity="0.4" strokeDasharray="2 3" />
        </g>

        {/* Node 3: Bottom Left */}
        <g transform="translate(300, 390)">
          <polygon points="0,-20 20,-10 0,0 -20,-10" fill="url(#cubeFaceTop)" stroke="#5be3ff" strokeWidth="1" />
          <polygon points="-20,-10 0,0 0,24 -20,14" fill="url(#cubeFaceLeft)" stroke="#38bdf8" strokeWidth="1" />
          <polygon points="0,0 20,-10 20,14 0,24" fill="url(#cubeFaceRight)" stroke="#0ea5e9" strokeWidth="1" />
        </g>

        {/* Node 4: Bottom Right */}
        <g transform="translate(510, 380)">
          <polygon points="0,-20 20,-10 0,0 -20,-10" fill="url(#cubeFaceTop)" stroke="#5be3ff" strokeWidth="1" />
          <polygon points="-20,-10 0,0 0,24 -20,14" fill="url(#cubeFaceLeft)" stroke="#38bdf8" strokeWidth="1" />
          <polygon points="0,0 20,-10 20,14 0,24" fill="url(#cubeFaceRight)" stroke="#0ea5e9" strokeWidth="1" />
        </g>

        {/* Data Beacons */}
        <circle cx="400" cy="210" r="3" fill="#ffffff" filter="url(#fallbackGlow)" />
        <circle cx="240" cy="195" r="2.5" fill="#5be3ff" />
        <circle cx="560" cy="215" r="2.5" fill="#5be3ff" />
        <circle cx="300" cy="370" r="2" fill="#38bdf8" />
        <circle cx="510" cy="360" r="2" fill="#38bdf8" />
      </svg>
    </div>
  );
}

export default XypherLedgerMatrixFallback;
