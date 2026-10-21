import React from 'react';

/**
 * High-Fidelity 2D Static Fallback for "The Split Hero Experience"
 * Renders the generated Figma-matched corporate cybersecurity visual asset
 * with floating holographic certificate shards and glowing golden badge.
 */
export const IdentityWeaverFallback = () => {
  return (
    <div className="xy-weaver-fallback-container" aria-hidden="true">
      {/* Background Split Hero Asset */}
      <img
        src="/images/xypher-split-hero.jpg"
        alt="XYPHER Decentralized Credential Attestation"
        className="xy-weaver-bg-image"
      />

      {/* Atmospheric Vignette Overlay */}
      <div className="xy-weaver-image-vignette" />

      {/* Interactive 2D Floating Data Shards */}
      <svg
        viewBox="0 0 800 600"
        className="xy-weaver-fallback-svg"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="goldBadgeGradSplit" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff59d" />
            <stop offset="50%" stopColor="#ffd700" />
            <stop offset="100%" stopColor="#d4af37" />
          </linearGradient>
          <linearGradient id="cyanShardGradSplit" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#16c6f2" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#0044aa" stopOpacity="0.25" />
          </linearGradient>
          <filter id="badgeGlowFilterSplit" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="16" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. FLOATING GLASS TRANSMISSION SHARDS */}
        <g id="glass-shards-split">
          {[
            { x: 380, y: 180, rot: 15, s: 24 },
            { x: 440, y: 140, rot: -25, s: 20 },
            { x: 320, y: 240, rot: 45, s: 22 },
            { x: 280, y: 340, rot: -15, s: 26 },
            { x: 480, y: 280, rot: 30, s: 22 },
            { x: 450, y: 400, rot: -35, s: 25 },
            { x: 340, y: 460, rot: 20, s: 20 },
            { x: 240, y: 280, rot: -30, s: 22 },
          ].map((s, idx) => (
            <g key={idx} transform={`translate(${s.x}, ${s.y}) rotate(${s.rot})`}>
              <rect
                x={-s.s / 2}
                y={-s.s / 2}
                width={s.s}
                height={s.s}
                rx={3}
                fill="url(#cyanShardGradSplit)"
                stroke="#16c6f2"
                strokeWidth="1.4"
              />
              <line
                x1={-s.s / 2}
                y1="0"
                x2={s.s / 2}
                y2="0"
                stroke="#ffffff"
                strokeWidth="0.8"
                opacity="0.8"
              />
            </g>
          ))}
        </g>

        {/* 2. GOLDEN HOLOGRAPHIC SEAL ABOVE LAPTOP */}
        <g transform="translate(420, 290)" filter="url(#badgeGlowFilterSplit)">
          <circle cx="0" cy="0" r="54" stroke="#ffd700" strokeWidth="2" strokeDasharray="6 6" opacity="0.9" />
          <circle cx="0" cy="0" r="64" stroke="#16c6f2" strokeWidth="1" strokeDasharray="3 6" opacity="0.65" />

          {/* Mathematical Torus Knot Loop */}
          <path
            d="M -32 -12 C -48 -38, -12 -48, 0 -32 C 12 -48, 48 -38, 32 -12 C 48 18, 22 44, 0 34 C -22 44, -48 18, -32 -12 Z"
            fill="none"
            stroke="url(#goldBadgeGradSplit)"
            strokeWidth="6"
            strokeLinejoin="round"
          />

          {/* Radiant Core */}
          <circle cx="0" cy="0" r="6" fill="#ffd700" />
        </g>
      </svg>
    </div>
  );
};

export default IdentityWeaverFallback;
