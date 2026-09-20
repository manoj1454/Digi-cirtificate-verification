import React from 'react';

/**
 * Static Sundial Instrument Fallback.
 * Renders an exact static vector representation of the sundial instrument
 * with sunlit ivory tones, angled gnomon cast shadow, and verified gold checkmark resolve.
 * Used on devices without WebGL, low-end mobile devices, or when prefers-reduced-motion is active.
 */
export const SundialFallback = ({ className = '' }) => {
  return (
    <div className={`sundial-fallback-wrapper ${className}`} aria-label="Sundial verification instrument">
      <svg
        viewBox="0 0 540 540"
        className="sundial-fallback-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Soft dial plate gradient: sunlit ivory to gentle warm shadow */}
          <radialGradient id="dialFaceGrad" cx="42%" cy="38%" r="62%">
            <stop offset="0%" stopColor="#FAF6ED" />
            <stop offset="60%" stopColor="#F3EBDC" />
            <stop offset="100%" stopColor="#E5DAC5" />
          </radialGradient>

          {/* Brass / Sundial Gold Bezel Rim */}
          <linearGradient id="brassBezelGrad" x1="20%" y1="15%" x2="80%" y2="85%">
            <stop offset="0%" stopColor="#E8B23D" />
            <stop offset="35%" stopColor="#C99426" />
            <stop offset="70%" stopColor="#8A6314" />
            <stop offset="100%" stopColor="#4A3408" />
          </linearGradient>

          {/* Gnomon gold gradient */}
          <linearGradient id="gnomonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F4C75E" />
            <stop offset="50%" stopColor="#D99F2A" />
            <stop offset="100%" stopColor="#8A6014" />
          </linearGradient>

          {/* Cast shadow gradient simulating soft sunlight attenuation */}
          <linearGradient id="castShadowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(43, 35, 24, 0.48)" />
            <stop offset="70%" stopColor="rgba(43, 35, 24, 0.22)" />
            <stop offset="100%" stopColor="rgba(43, 35, 24, 0.02)" />
          </linearGradient>

          {/* Dial calibration track paths */}
          <path id="dialTopTextPath" d="M 95 270 A 175 175 0 0 1 445 270" fill="none" />
          <path id="dialBottomTextPath" d="M 445 270 A 175 175 0 0 1 95 270" fill="none" />
        </defs>

        {/* Outer instrument drop bevel */}
        <circle cx="270" cy="270" r="252" fill="#DDD1BC" />
        <circle cx="270" cy="270" r="248" fill="url(#brassBezelGrad)" />
        <circle cx="270" cy="270" r="236" fill="#F0E8D7" stroke="rgba(107, 95, 77, 0.25)" strokeWidth="1.5" />

        {/* Outer Radian & Degree Tick Marks */}
        {Array.from({ length: 72 }).map((_, i) => {
          const angle = (i / 72) * Math.PI * 2;
          const isMajor = i % 6 === 0;
          const r1 = isMajor ? 220 : 226;
          const r2 = 234;
          const x1 = 270 + Math.cos(angle) * r1;
          const y1 = 270 + Math.sin(angle) * r1;
          const x2 = 270 + Math.cos(angle) * r2;
          const y2 = 270 + Math.sin(angle) * r2;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isMajor ? '#6B5F4D' : 'rgba(107, 95, 77, 0.35)'}
              strokeWidth={isMajor ? 2 : 1}
            />
          );
        })}

        {/* Main Dial Plate */}
        <circle cx="270" cy="270" r="216" fill="url(#dialFaceGrad)" stroke="rgba(107, 95, 77, 0.2)" strokeWidth="1" />

        {/* Concentric Calibration Circles */}
        <circle cx="270" cy="270" r="185" fill="none" stroke="rgba(107, 95, 77, 0.18)" strokeWidth="1" />
        <circle cx="270" cy="270" r="145" fill="none" stroke="rgba(107, 95, 77, 0.12)" strokeWidth="1" strokeDasharray="3 6" />
        <circle cx="270" cy="270" r="95" fill="none" stroke="rgba(107, 95, 77, 0.15)" strokeWidth="1" />

        {/* Sundial Calibrated Hour Lines (radiating from gnomon root) */}
        {[-60, -45, -30, -15, 0, 15, 30, 45, 60].map((deg, idx) => {
          const rad = (deg * Math.PI) / 180;
          const x2 = 270 + Math.sin(rad) * 185;
          const y2 = 270 - Math.cos(rad) * 185;
          return (
            <g key={deg}>
              <line
                x1={270}
                y1={270}
                x2={x2}
                y2={y2}
                stroke="rgba(107, 95, 77, 0.25)"
                strokeWidth="1.2"
              />
              <text
                x={270 + Math.sin(rad) * 198}
                y={270 - Math.cos(rad) * 198 + 4}
                fontFamily="Fraunces, serif"
                fontSize="10"
                fill="#6B5F4D"
                textAnchor="middle"
              >
                {['IX', 'X', 'XI', 'XII', 'I', 'II', 'III', 'IV', 'V'][idx]}
              </text>
            </g>
          );
        })}

        {/* Dial Lettering */}
        <text
          fill="#6B5F4D"
          fontFamily="Fraunces, Georgia, serif"
          fontSize="11"
          fontWeight="600"
          letterSpacing="3"
          textAnchor="middle"
        >
          <textPath href="#dialTopTextPath" startOffset="50%">
            XYPHER • LIGHT &amp; PROOF INSTRUMENT
          </textPath>
        </text>

        <text
          fill="#8A7A64"
          fontFamily="Fraunces, Georgia, serif"
          fontSize="10"
          fontWeight="500"
          letterSpacing="3"
          textAnchor="middle"
        >
          <textPath href="#dialBottomTextPath" startOffset="50%">
            VERITAS PER LUCEM • ANNO 2026
          </textPath>
        </text>

        {/* CAST SHADOW: Angled shadow thrown by the gnomon across the dial */}
        <path
          d="M 270 270 L 375 145 L 392 158 Z"
          fill="url(#castShadowGrad)"
          filter="url(#shadowSoft)"
        />

        {/* Resolve Node: Where sunlight/shadow intersects the verification point */}
        <g className="fallback-verified-badge" transform="translate(378, 148)">
          <circle cx="0" cy="0" r="22" fill="#FBF8F0" stroke="#E8B23D" strokeWidth="2" />
          <path
            d="M -7 0 L -2 5 L 8 -5"
            fill="none"
            stroke="#E8B23D"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text
            x="0"
            y="32"
            fontFamily="JetBrains Mono, monospace"
            fontSize="8"
            fill="#6B5F4D"
            textAnchor="middle"
            letterSpacing="1"
          >
            RESOLVED
          </text>
        </g>

        {/* Central Sundial Gnomon (Stylized raised triangle / fin) */}
        {/* Shadow side of gnomon */}
        <polygon
          points="270,270 270,180 262,270"
          fill="#61440E"
        />
        {/* Light-facing side of gnomon */}
        <polygon
          points="270,270 270,180 276,270"
          fill="url(#gnomonGrad)"
        />
        {/* Central Pivot Stud */}
        <circle cx="270" cy="270" r="9" fill="#E8B23D" stroke="#4A3408" strokeWidth="1.5" />
        <circle cx="270" cy="270" r="4" fill="#2B2318" />
      </svg>
    </div>
  );
};

export default SundialFallback;
