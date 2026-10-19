import React from 'react';

/**
 * High-Fidelity Static / 2D Hologram Fallback
 * Rendered when WebGL is unavailable or prefers-reduced-motion is active.
 * Depicts the geometric cryptographic icosahedron certificate hologram with cyan glow.
 */
export const HologramFallback = () => {
  return (
    <div className="xy-hologram-fallback-container" aria-hidden="true">
      <div className="xy-hologram-fallback-glow" />
      <svg
        viewBox="0 0 500 500"
        className="xy-hologram-fallback-svg"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="holoCoreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00f2ff" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#0066ff" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="cyanLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#35dcff" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#0066ff" stopOpacity="0.45" />
          </linearGradient>
        </defs>

        {/* Ambient Radial Core */}
        <circle cx="250" cy="250" r="180" fill="url(#holoCoreGlow)" />

        {/* Rotating Orbital Rings */}
        <ellipse cx="250" cy="250" rx="190" ry="85" stroke="#00f2ff" strokeWidth="1" strokeDasharray="6 8" opacity="0.4" />
        <ellipse cx="250" cy="250" rx="85" ry="190" stroke="#0066ff" strokeWidth="1" strokeDasharray="4 6" opacity="0.3" />

        {/* Geometric Icosahedron Facets */}
        <g stroke="url(#cyanLineGrad)" strokeWidth="1.5">
          {/* Outer polygon */}
          <polygon points="250,70 390,150 410,310 290,410 150,380 90,230 150,110" fill="none" opacity="0.75" />
          
          {/* Internal chords */}
          <line x1="250" y1="70" x2="250" y2="250" opacity="0.8" />
          <line x1="250" y1="70" x2="150" y2="210" opacity="0.6" />
          <line x1="250" y1="70" x2="350" y2="210" opacity="0.6" />
          <line x1="390" y1="150" x2="250" y2="250" opacity="0.7" />
          <line x1="410" y1="310" x2="250" y2="250" opacity="0.7" />
          <line x1="290" y1="410" x2="250" y2="250" opacity="0.8" />
          <line x1="150" y1="380" x2="250" y2="250" opacity="0.7" />
          <line x1="90" y1="230" x2="250" y2="250" opacity="0.7" />
          <line x1="150" y1="110" x2="250" y2="250" opacity="0.6" />

          {/* Inner crystal hexagon */}
          <polygon points="250,160 330,210 330,290 250,340 170,290 170,210" fill="rgba(0, 242, 255, 0.05)" stroke="#00f2ff" strokeWidth="1.8" />
        </g>

        {/* Suspended Particle Nodes */}
        {[
          { cx: 250, cy: 70 },
          { cx: 390, cy: 150 },
          { cx: 410, cy: 310 },
          { cx: 290, cy: 410 },
          { cx: 150, cy: 380 },
          { cx: 90, cy: 230 },
          { cx: 150, cy: 110 },
          { cx: 250, cy: 250 },
          { cx: 250, cy: 160 },
          { cx: 330, cy: 210 },
          { cx: 330, cy: 290 },
          { cx: 250, cy: 340 },
          { cx: 170, cy: 290 },
          { cx: 170, cy: 210 },
          { cx: 200, cy: 130 },
          { cx: 300, cy: 370 },
          { cx: 120, cy: 290 },
          { cx: 370, cy: 240 },
        ].map((pt, i) => (
          <circle key={i} cx={pt.cx} cy={pt.cy} r={i === 7 ? 5 : 3} fill="#00f2ff" />
        ))}
      </svg>
    </div>
  );
};

export default HologramFallback;
