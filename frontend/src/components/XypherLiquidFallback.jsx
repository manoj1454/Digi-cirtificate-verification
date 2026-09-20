import React from 'react';

/**
 * High-Fidelity Static Fallback for XYPHER Liquid Cryptographic Identity
 * Rendered when WebGL is unavailable or when prefers-reduced-motion is active.
 * Depicts the 3D translucent sculptural glass lens with embedded cryptographic lattice.
 */
export const XypherLiquidFallback = () => {
  return (
    <div className="xypher-liquid-canvas-wrap xypher-fallback-wrap" aria-hidden="true">
      <svg
        viewBox="0 0 1000 800"
        className="xypher-sculptural-svg xypher-fallback-svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Ambient Warm Caustic Background */}
          <radialGradient id="causticGlow" cx="65%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#EDE1C8" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#F5EFE0" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#F5EFE0" stopOpacity="0.0" />
          </radialGradient>

          {/* Translucent Sculptural Glass Body Gradient */}
          <linearGradient id="glassBody" x1="20%" y1="10%" x2="85%" y2="90%">
            <stop offset="0%" stopColor="#FFFDF9" stopOpacity="0.92" />
            <stop offset="35%" stopColor="#F8F0DE" stopOpacity="0.75" />
            <stop offset="70%" stopColor="#E6D3B0" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#D9C093" stopOpacity="0.90" />
          </linearGradient>

          {/* Fresnel Edge Rim Gradient */}
          <linearGradient id="fresnelRim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#E8B23D" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#C49226" stopOpacity="0.8" />
          </linearGradient>

          {/* Soft Depth Drop Shadow */}
          <filter id="glassShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="18" dy="28" stdDeviation="36" floodColor="#4A3D29" floodOpacity="0.12" />
            <feDropShadow dx="-8" dy="-10" stdDeviation="20" floodColor="#FFFDF8" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* 1. Ambient Caustic Field */}
        <circle cx="680" cy="400" r="380" fill="url(#causticGlow)" />

        {/* 2. 3D Sculptural Translucent Glass Lens Silhouette */}
        <g transform="translate(620, 380) rotate(-6)" filter="url(#glassShadow)">
          {/* Main Translucent Sculptural Lens Body */}
          <rect
            x="-190"
            y="-270"
            width="380"
            height="540"
            rx="95"
            ry="95"
            fill="url(#glassBody)"
            stroke="url(#fresnelRim)"
            strokeWidth="2.5"
          />

          {/* Specular Edge Highlight Glint (Top-left bevel) */}
          <path
            d="M -140 -266 C -70 -272, 70 -272, 140 -266"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.8"
            strokeLinecap="round"
            opacity="0.85"
          />

          {/* 3. Embedded Cryptographic Lattice Grid (Co-moving within the volume) */}
          <g opacity="0.45">
            {/* Fine coordinate grid lines */}
            <line x1="-150" y1="-180" x2="150" y2="-180" stroke="#6B5F4D" strokeWidth="0.8" strokeDasharray="4 6" />
            <line x1="-160" y1="-90" x2="160" y2="-90" stroke="#6B5F4D" strokeWidth="0.8" strokeDasharray="4 6" />
            <line x1="-165" y1="0" x2="165" y2="0" stroke="#C49226" strokeWidth="1.2" />
            <line x1="-160" y1="90" x2="160" y2="90" stroke="#6B5F4D" strokeWidth="0.8" strokeDasharray="4 6" />
            <line x1="-150" y1="180" x2="150" y2="180" stroke="#6B5F4D" strokeWidth="0.8" strokeDasharray="4 6" />

            <line x1="-90" y1="-230" x2="-90" y2="230" stroke="#6B5F4D" strokeWidth="0.8" strokeDasharray="4 6" />
            <line x1="0" y1="-240" x2="0" y2="240" stroke="#C49226" strokeWidth="1.2" />
            <line x1="90" y1="-230" x2="90" y2="230" stroke="#6B5F4D" strokeWidth="0.8" strokeDasharray="4 6" />
          </g>

          {/* 4. Suspended Cryptographic Nodes & Hash Coordinates */}
          {[
            { x: -90, y: -90, r: 4 },
            { x: 0, y: -180, r: 5 },
            { x: 90, y: -90, r: 4.5 },
            { x: -90, y: 0, r: 4 },
            { x: 0, y: 0, r: 6 },
            { x: 90, y: 0, r: 4 },
            { x: -90, y: 90, r: 5 },
            { x: 0, y: 180, r: 4 },
            { x: 90, y: 90, r: 4.5 },
          ].map((pt, idx) => (
            <g key={idx}>
              <circle cx={pt.x} cy={pt.y} r={pt.r * 1.8} fill="#E8B23D" opacity="0.25" />
              <circle cx={pt.x} cy={pt.y} r={pt.r} fill="#C49226" />
              <circle cx={pt.x} cy={pt.y} r={pt.r * 0.4} fill="#FFFDF8" />
            </g>
          ))}

          {/* Internal Refraction Caustic Sheen */}
          <ellipse cx="40" cy="-60" rx="90" ry="140" fill="#FFFDF8" opacity="0.25" />
        </g>
      </svg>
    </div>
  );
};

export default XypherLiquidFallback;
