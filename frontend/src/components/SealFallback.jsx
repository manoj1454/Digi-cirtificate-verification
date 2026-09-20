import React from 'react';

/**
 * High-fidelity static fallback seal rendered when WebGL is unavailable
 * or on low-powered / reduced-motion devices.
 * Uses exact dark bronze/pewter tones and verification relief detailing.
 */
export const SealFallback = ({ className = '' }) => {
  return (
    <div className={`seal-fallback-wrapper ${className}`} aria-label="Official verification seal">
      <svg
        viewBox="0 0 500 500"
        className="seal-fallback-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Metallic Bronze/Pewter Radial Gradient with grazing highlight */}
          <radialGradient id="metalPlateGrad" cx="38%" cy="32%" r="65%" fx="35%" fy="30%">
            <stop offset="0%" stopColor="#5E5850" />
            <stop offset="35%" stopColor="#3E3A35" />
            <stop offset="70%" stopColor="#2A2724" />
            <stop offset="100%" stopColor="#1A1816" />
          </radialGradient>

          {/* Stepped Rim Metallic Ring */}
          <linearGradient id="rimGrad" x1="20%" y1="10%" x2="80%" y2="90%">
            <stop offset="0%" stopColor="#6E675E" />
            <stop offset="45%" stopColor="#35312C" />
            <stop offset="75%" stopColor="#4A453E" />
            <stop offset="100%" stopColor="#1E1B18" />
          </linearGradient>

          {/* Engraved Text / Relief Linear Gradient */}
          <linearGradient id="engraveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8C8478" />
            <stop offset="60%" stopColor="#4F4A42" />
            <stop offset="100%" stopColor="#25221F" />
          </linearGradient>

          {/* Arched text paths */}
          <path
            id="topTextPath"
            d="M 85 250 A 165 165 0 0 1 415 250"
            fill="none"
          />
          <path
            id="bottomTextPath"
            d="M 415 250 A 165 165 0 0 1 85 250"
            fill="none"
          />
        </defs>

        {/* Outer Shadow Rim */}
        <circle cx="250" cy="250" r="235" fill="#141312" />

        {/* Main Bevelled Rim */}
        <circle cx="250" cy="250" r="225" fill="url(#rimGrad)" stroke="#191816" strokeWidth="2" />
        <circle cx="250" cy="250" r="212" fill="none" stroke="#686157" strokeWidth="1.5" opacity="0.6" />

        {/* Beaded Dentil Border Ring */}
        <circle
          cx="250"
          cy="250"
          r="198"
          fill="none"
          stroke="#7A7266"
          strokeWidth="3"
          strokeDasharray="2.5 7.5"
          opacity="0.75"
        />

        {/* Inner Coin Face */}
        <circle cx="250" cy="250" r="185" fill="url(#metalPlateGrad)" stroke="#1F1D1A" strokeWidth="2" />

        {/* Concentric Guilloché Security Hairlines */}
        <circle cx="250" cy="250" r="145" fill="none" stroke="#524C44" strokeWidth="1" opacity="0.45" />
        <circle cx="250" cy="250" r="142" fill="none" stroke="#2D2A26" strokeWidth="1" opacity="0.6" />
        <circle cx="250" cy="250" r="115" fill="none" stroke="#524C44" strokeWidth="0.75" opacity="0.35" />

        {/* Engraved Arched Lettering */}
        <text
          fill="url(#engraveGrad)"
          fontFamily="Fraunces, Georgia, serif"
          fontSize="14.5"
          fontWeight="600"
          letterSpacing="4"
          textAnchor="middle"
        >
          <textPath href="#topTextPath" startOffset="50%">
            XYPHER • CRYPTOGRAPHIC SEAL
          </textPath>
        </text>

        <text
          fill="url(#engraveGrad)"
          fontFamily="Fraunces, Georgia, serif"
          fontSize="12.5"
          fontWeight="500"
          letterSpacing="4"
          textAnchor="middle"
        >
          <textPath href="#bottomTextPath" startOffset="50%">
            ★ IMMUTABLE DUAL-LAYER REGISTRY ★
          </textPath>
        </text>

        {/* Center Verification Medallion Emblem */}
        <g transform="translate(250, 250)">
          {/* Inner Shield / Hex Crest */}
          <polygon
            points="0,-68 54,-36 54,34 0,72 -54,34 -54,-36"
            fill="#262421"
            stroke="#686157"
            strokeWidth="2.5"
          />
          <polygon
            points="0,-60 47,-31 47,30 0,63 -47,30 -47,-31"
            fill="url(#metalPlateGrad)"
            stroke="#1B1917"
            strokeWidth="1.5"
          />

          {/* Central Keyhole / Checkmark Motif */}
          <path
            d="M -18 -4 L -4 12 L 20 -14"
            fill="none"
            stroke="#A39B8F"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="0" cy="-28" r="8" fill="#A39B8F" />
          <path
            d="M -5 -24 L 5 -24 L 7 -14 L -7 -14 Z"
            fill="#A39B8F"
          />

          {/* Cryptographic Node Dots */}
          <circle cx="-54" cy="-36" r="3.5" fill="#8C8478" />
          <circle cx="54" cy="-36" r="3.5" fill="#8C8478" />
          <circle cx="54" cy="34" r="3.5" fill="#8C8478" />
          <circle cx="-54" cy="34" r="3.5" fill="#8C8478" />
          <circle cx="0" cy="-68" r="3.5" fill="#8C8478" />
          <circle cx="0" cy="72" r="3.5" fill="#8C8478" />
        </g>
      </svg>
    </div>
  );
};

export default SealFallback;
