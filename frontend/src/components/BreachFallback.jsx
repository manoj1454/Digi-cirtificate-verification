import React from 'react';

/**
 * High-Fidelity 2D Static / Fallback for "The Breach" Narrative
 * Rendered when WebGL is unavailable or prefers-reduced-motion is active.
 * Depicts the Database Vault on right protected by the Blockchain Shield repelling the intruder.
 */
export const BreachFallback = () => {
  return (
    <div className="xy-breach-fallback-container" aria-hidden="true">
      <svg
        viewBox="0 0 900 450"
        className="xy-breach-fallback-svg"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="shieldGlowRadial" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00f2ff" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#0066ff" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="vaultGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0b2542" />
            <stop offset="100%" stopColor="#04152b" />
          </linearGradient>
          <linearGradient id="shieldLines" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#35dcff" />
            <stop offset="100%" stopColor="#0066ff" />
          </linearGradient>
        </defs>

        {/* Cyber Floor Grid Lines */}
        <g stroke="rgba(105, 177, 216, 0.15)" strokeWidth="1">
          <line x1="50" y1="360" x2="850" y2="360" />
          <line x1="100" y1="390" x2="800" y2="390" />
          <line x1="200" y1="415" x2="700" y2="415" />
          <line x1="250" y1="360" x2="180" y2="425" />
          <line x1="450" y1="360" x2="450" y2="425" />
          <line x1="650" y1="360" x2="720" y2="425" />
        </g>

        {/* 1. THE INTRUDER (Left side, repelled) */}
        <g transform="translate(180, 200)">
          {/* Hacker Body */}
          <rect x="-20" y="40" width="40" height="70" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
          {/* Head */}
          <circle cx="0" cy="18" r="22" fill="#64748b" />
          {/* Threat Optic Visor */}
          <rect x="6" y="14" width="16" height="6" rx="2" fill="#ff0055" />
          {/* Arms reaching and recoiling */}
          <line x1="16" y1="50" x2="45" y2="70" stroke="#334155" strokeWidth="8" strokeLinecap="round" />
          <line x1="-16" y1="50" x2="-35" y2="75" stroke="#334155" strokeWidth="8" strokeLinecap="round" />
          {/* Shockwave deflection spark */}
          <circle cx="65" cy="65" r="4" fill="#ff0055" opacity="0.8" />
        </g>

        {/* 2. THE BLOCKCHAIN SHIELD (Center barrier) */}
        <g transform="translate(450, 225)">
          {/* Ambient Glow */}
          <circle cx="0" cy="0" r="140" fill="url(#shieldGlowRadial)" />
          {/* Energy Shockwave Ring */}
          <circle cx="0" cy="0" r="105" stroke="#00f2ff" strokeWidth="1.5" strokeDasharray="8 8" opacity="0.65" />
          <circle cx="0" cy="0" r="125" stroke="#35dcff" strokeWidth="1" strokeDasharray="4 6" opacity="0.35" />

          {/* Hexagonal Shield Facets */}
          <polygon points="0,-85 75,-42 75,42 0,85 -75,42 -75,-42" fill="rgba(0, 242, 255, 0.08)" stroke="url(#shieldLines)" strokeWidth="2.5" />
          <polygon points="0,-55 48,-28 48,28 0,55 -48,28 -48,-28" fill="rgba(0, 102, 255, 0.12)" stroke="#00f2ff" strokeWidth="1.5" />

          {/* Shield Chords */}
          <line x1="0" y1="-85" x2="0" y2="85" stroke="#00f2ff" strokeWidth="1.2" opacity="0.7" />
          <line x1="-75" y1="-42" x2="75" y2="42" stroke="#00f2ff" strokeWidth="1.2" opacity="0.7" />
          <line x1="-75" y1="42" x2="75" y2="-42" stroke="#00f2ff" strokeWidth="1.2" opacity="0.7" />

          {/* Shield Status Nodes */}
          <circle cx="0" cy="-85" r="4" fill="#00f2ff" />
          <circle cx="75" cy="-42" r="4" fill="#00f2ff" />
          <circle cx="75" cy="42" r="4" fill="#00f2ff" />
          <circle cx="0" cy="85" r="4" fill="#00f2ff" />
          <circle cx="-75" cy="42" r="4" fill="#00f2ff" />
          <circle cx="-75" cy="-42" r="4" fill="#00f2ff" />
        </g>

        {/* 3. THE VAULT (Right side database monolith) */}
        <g transform="translate(700, 150)">
          {/* Main Cylinder Body */}
          <rect x="-65" y="0" width="130" height="180" rx="16" fill="url(#vaultGradient)" stroke="#00f2ff" strokeWidth="1.5" />
          {/* Glowing Database Torus Rings */}
          <ellipse cx="0" cy="35" rx="68" ry="12" fill="none" stroke="#00f2ff" strokeWidth="3" opacity="0.9" />
          <ellipse cx="0" cy="75" rx="68" ry="12" fill="none" stroke="#00f2ff" strokeWidth="3" opacity="0.9" />
          <ellipse cx="0" cy="115" rx="68" ry="12" fill="none" stroke="#00f2ff" strokeWidth="3" opacity="0.9" />
          <ellipse cx="0" cy="155" rx="68" ry="12" fill="none" stroke="#00f2ff" strokeWidth="3" opacity="0.9" />

          {/* Top Beacon */}
          <polygon points="0,-18 12,-4 0,10 -12,-4" fill="#00f2ff" opacity="0.8" />
          <line x1="0" y1="-30" x2="0" y2="-18" stroke="#00f2ff" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
};

export default BreachFallback;
