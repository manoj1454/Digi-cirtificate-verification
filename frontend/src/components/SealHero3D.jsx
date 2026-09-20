import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SealFallback } from './SealFallback';

/**
 * Creates an off-screen procedural texture for the engraved seal face.
 * Generates official verification lettering, concentric guilloché security lines,
 * beaded borders, and a central cryptographic shield emblem.
 */
function createSealCanvasTexture() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const center = size / 2;

  // Background dark metallic base with subtle radial gradient
  const bgGrad = ctx.createRadialGradient(center, center, 80, center, center, 500);
  bgGrad.addColorStop(0, '#3E3A34');
  bgGrad.addColorStop(0.7, '#2A2723');
  bgGrad.addColorStop(1, '#1A1816');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  // Outer concentric rings (stepped relief)
  ctx.strokeStyle = '#8E8475';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(center, center, 470, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#181614';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(center, center, 456, 0, Math.PI * 2);
  ctx.stroke();

  // Beaded dentil border (dots around the rim)
  const numBeads = 96;
  const beadRadius = 432;
  for (let i = 0; i < numBeads; i++) {
    const angle = (i / numBeads) * Math.PI * 2;
    const bx = center + Math.cos(angle) * beadRadius;
    const by = center + Math.sin(angle) * beadRadius;
    ctx.fillStyle = '#BAAF9E';
    ctx.beginPath();
    ctx.arc(bx, by, 5.0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Inner border groove
  ctx.strokeStyle = '#141210';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(center, center, 408, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#82786B';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(center, center, 402, 0, Math.PI * 2);
  ctx.stroke();

  // Arched text function
  function drawArchedText(text, radius, startAngle, endAngle, isClockwise = true, font = 'bold 36px serif') {
    ctx.font = font;
    ctx.fillStyle = '#D6CCBD';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const characters = text.split('');
    const totalAngle = endAngle - startAngle;
    const step = totalAngle / (characters.length - 1 || 1);

    characters.forEach((char, idx) => {
      const charAngle = startAngle + idx * step;
      ctx.save();
      ctx.translate(
        center + Math.cos(charAngle) * radius,
        center + Math.sin(charAngle) * radius
      );
      ctx.rotate(charAngle + (isClockwise ? Math.PI / 2 : -Math.PI / 2));
      ctx.fillText(char, 0, 0);
      ctx.restore();
    });
  }

  // Arched Top Text
  drawArchedText(
    'XYPHER • CRYPTOGRAPHIC SEAL',
    345,
    -Math.PI * 0.78,
    -Math.PI * 0.22,
    true,
    '700 33px "Fraunces", Georgia, serif'
  );

  // Arched Bottom Text
  drawArchedText(
    '★ IMMUTABLE DUAL-LAYER REGISTRY ★',
    345,
    Math.PI * 0.76,
    Math.PI * 0.24,
    false,
    '600 28px "Fraunces", Georgia, serif'
  );

  // Concentric guilloché security hairlines
  [275, 260, 245, 230].forEach((r, idx) => {
    ctx.strokeStyle = idx % 2 === 0 ? '#6B6254' : '#22201D';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(center, center, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Central Faceted Heraldic Shield
  ctx.save();
  ctx.translate(center, center);

  // Outer shield contour
  ctx.fillStyle = '#1D1B18';
  ctx.strokeStyle = '#B5AB9B';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(0, -145);
  ctx.lineTo(110, -75);
  ctx.lineTo(110, 75);
  ctx.lineTo(0, 155);
  ctx.lineTo(-110, 75);
  ctx.lineTo(-110, -75);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner shield facet
  ctx.fillStyle = '#423D35';
  ctx.strokeStyle = '#8E8373';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, -125);
  ctx.lineTo(92, -63);
  ctx.lineTo(92, 63);
  ctx.lineTo(0, 133);
  ctx.lineTo(-92, 63);
  ctx.lineTo(-92, -63);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Keyhole & Checkmark Relief Motif
  ctx.fillStyle = '#DDD5C6';
  ctx.beginPath();
  ctx.arc(0, -50, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-11, -44);
  ctx.lineTo(11, -44);
  ctx.lineTo(16, -18);
  ctx.lineTo(-16, -18);
  ctx.closePath();
  ctx.fill();

  // Heavy Verification Checkmark
  ctx.strokeStyle = '#EAE4D8';
  ctx.lineWidth = 15;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-38, 12);
  ctx.lineTo(-10, 42);
  ctx.lineTo(44, -18);
  ctx.stroke();

  // Accent Rivets on vertices
  const vertices = [
    [0, -145], [110, -75], [110, 75],
    [0, 155], [-110, 75], [-110, -75]
  ];
  vertices.forEach(([vx, vy]) => {
    ctx.fillStyle = '#E5DEC0';
    ctx.beginPath();
    ctx.arc(vx, vy, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1D1B18';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  });

  ctx.restore();

  return canvas;
}

/**
 * 3D Medallion Seal Object with PBR bronze/pewter shading,
 * ambient slow rotation, and cursor-driven key light reveal.
 */
function SealMedallion({ mouseCoords }) {
  const meshRef = useRef();
  const lightRef = useRef();

  // Create procedural canvas textures once
  const [textures, setTextureReady] = useState(null);

  useEffect(() => {
    const canvas = createSealCanvasTexture();
    if (!canvas) return;

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    setTextureReady(texture);

    return () => {
      texture.dispose();
    };
  }, []);

  // Frame loop: updates ambient rotation & directional key-light reveal
  useFrame((state, delta) => {
    // 1. Slow, majestic ambient rotation
    if (meshRef.current) {
      meshRef.current.rotation.z += delta * 0.15;

      // Subtle responsive 3D tilt tracking cursor gently (not drag-to-explore)
      meshRef.current.rotation.x = THREE.MathUtils.lerp(
        meshRef.current.rotation.x,
        -mouseCoords.current.y * 0.16,
        0.06
      );
      meshRef.current.rotation.y = THREE.MathUtils.lerp(
        meshRef.current.rotation.y,
        mouseCoords.current.x * 0.16,
        0.06
      );
    }

    // 2. Mouse-move-driven lighting reveal (shifts directional light across engraving)
    if (lightRef.current) {
      const targetX = mouseCoords.current.x * 4.5;
      const targetY = -mouseCoords.current.y * 4.2 + 0.6;
      const targetZ = 3.6;

      lightRef.current.position.x = THREE.MathUtils.lerp(lightRef.current.position.x, targetX, 0.08);
      lightRef.current.position.y = THREE.MathUtils.lerp(lightRef.current.position.y, targetY, 0.08);
      lightRef.current.position.z = THREE.MathUtils.lerp(lightRef.current.position.z, targetZ, 0.08);
    }
  });

  // Dark pewter/bronze materials
  const faceMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#3A3630'),
      metalness: 0.88,
      roughness: 0.32,
      bumpMap: textures,
      bumpScale: 0.045,
      map: textures,
      roughnessMap: textures,
    });
  }, [textures]);

  const rimMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#302C27'),
      metalness: 0.92,
      roughness: 0.28,
    });
  }, []);

  const edgeBevelMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#554E45'),
      metalness: 0.90,
      roughness: 0.22,
    });
  }, []);

  return (
    <group scale={[1.05, 1.05, 1.05]}>
      {/* Soft directional key light that sweeps across the relief */}
      <directionalLight
        ref={lightRef}
        position={[1.5, 2.2, 3.5]}
        intensity={4.5}
        color="#F8F3E8"
      />

      {/* Subtle fill light to prevent total shadow blackouts */}
      <directionalLight
        position={[-2.5, -2.0, 2.2]}
        intensity={1.2}
        color="#A39B8E"
      />

      {/* Ambient base lighting */}
      <ambientLight intensity={0.65} color="#E5DFD0" />

      {/* Main Medallion Body */}
      <group ref={meshRef}>
        {/* Core Coin Disc (Radius 1.6, rotated so circular engraved cap faces +Z camera) */}
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.65, 1.65, 0.14, 96]} />
          {/* In Three.js cylinder: material-0 is side, material-1 is top cap, material-2 is bottom cap */}
          <primitive object={rimMaterial} attach="material-0" />
          <primitive object={faceMaterial} attach="material-1" />
          <primitive object={faceMaterial} attach="material-2" />
        </mesh>

        {/* Outer Stepped Raised Rim Ring */}
        <mesh position={[0, 0, 0.072]}>
          <ringGeometry args={[1.54, 1.66, 96]} />
          <primitive object={edgeBevelMaterial} attach="material" />
        </mesh>

        <mesh position={[0, 0, -0.072]} rotation={[0, Math.PI, 0]}>
          <ringGeometry args={[1.54, 1.66, 96]} />
          <primitive object={edgeBevelMaterial} attach="material" />
        </mesh>

        {/* Inner Bevel Ring for physical depth */}
        <mesh position={[0, 0, 0.071]}>
          <ringGeometry args={[1.36, 1.42, 96]} />
          <primitive object={edgeBevelMaterial} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

/**
 * React Three Fiber 3D Hero Container.
 * Detects pointer moves on the parent hero area to shift the grazing key light.
 */
export const SealHero3D = ({ className = '' }) => {
  const mouseCoords = useRef({ x: 0.25, y: -0.25 });
  const [hasError, setHasError] = useState(false);

  // Capture mouse movement over viewport
  const handlePointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    mouseCoords.current = { x, y };
  };

  if (hasError) {
    return <SealFallback className={className} />;
  }

  return (
    <div
      className={`seal-3d-canvas-container ${className}`}
      onPointerMove={handlePointerMove}
      aria-label="3D Interactive Verification Seal"
    >
      <Canvas
        camera={{ position: [0, 0, 5.2], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        onError={() => setHasError(true)}
      >
        <SealMedallion mouseCoords={mouseCoords} />
      </Canvas>
    </div>
  );
};

export default SealHero3D;
