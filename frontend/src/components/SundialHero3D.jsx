import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { ShieldCheck, Check, FileText } from 'lucide-react';
import { SundialFallback } from './SundialFallback';

/**
 * Creates an off-screen procedural texture for the sundial dial face.
 * Features degree ticks, hour radials (IX through V), and motto.
 */
function createDialCanvasTexture() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const center = size / 2;

  // Dial plate base: warm sunlit ivory paper
  const bgGrad = ctx.createRadialGradient(center, center, 60, center, center, 500);
  bgGrad.addColorStop(0, '#FAF6ED');
  bgGrad.addColorStop(0.65, '#F3EBDC');
  bgGrad.addColorStop(1, '#E6DAC5');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  // Outer brass bezel rim
  ctx.strokeStyle = '#D9A332';
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.arc(center, center, 480, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#6B5F4D';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(center, center, 468, 0, Math.PI * 2);
  ctx.stroke();

  // Degree tick marks (72 radials)
  for (let i = 0; i < 72; i++) {
    const angle = (i / 72) * Math.PI * 2;
    const isMajor = i % 6 === 0;
    const r1 = isMajor ? 435 : 446;
    const r2 = 464;
    const x1 = center + Math.cos(angle) * r1;
    const y1 = center + Math.sin(angle) * r1;
    const x2 = center + Math.cos(angle) * r2;
    const y2 = center + Math.sin(angle) * r2;

    ctx.strokeStyle = isMajor ? '#2B2318' : 'rgba(107, 95, 77, 0.45)';
    ctx.lineWidth = isMajor ? 3.5 : 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Concentric hair lines
  [420, 340, 240].forEach((r, idx) => {
    ctx.strokeStyle = 'rgba(107, 95, 77, 0.2)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(center, center, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Sundial Hour Radials
  const hours = [
    { label: 'IX', deg: -60 },
    { label: 'X', deg: -45 },
    { label: 'XI', deg: -30 },
    { label: 'XII', deg: -15 },
    { label: 'I', deg: 0 },
    { label: 'II', deg: 15 },
    { label: 'III', deg: 30 },
    { label: 'IV', deg: 45 },
    { label: 'V', deg: 60 },
  ];

  hours.forEach(({ label, deg }) => {
    const rad = (deg * Math.PI) / 180;
    const x2 = center + Math.sin(rad) * 410;
    const y2 = center - Math.cos(rad) * 410;

    ctx.strokeStyle = 'rgba(107, 95, 77, 0.35)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Roman numeral
    const tx = center + Math.sin(rad) * 380;
    const ty = center - Math.cos(rad) * 380;
    ctx.font = '600 24px "Fraunces", Georgia, serif';
    ctx.fillStyle = '#4A3E31';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, tx, ty);
  });

  // Central rosette ring
  ctx.strokeStyle = '#D9A332';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(center, center, 48, 0, Math.PI * 2);
  ctx.stroke();

  return canvas;
}

/**
 * Creates custom 3D Gnomon Geometry.
 * A precision inclined triangular stylus casting a realistic shadow.
 */
function createGnomonGeometry() {
  const geom = new THREE.BufferGeometry();
  // Triangular fin coordinates: base root (0, -0.6, 0), apex (0, 0.5, 1.3), base front (0, 0.8, 0)
  // With thickness along X
  const w = 0.04;
  const vertices = new Float32Array([
    // Side 1 (Right)
    w, -0.7, 0,
    w, 0.7, 0,
    w, 0.2, 1.25,

    // Side 2 (Left)
    -w, -0.7, 0,
    -w, 0.2, 1.25,
    -w, 0.7, 0,

    // Top spine (quad as 2 tris)
    -w, 0.2, 1.25,
    w, -0.7, 0,
    -w, -0.7, 0,

    -w, 0.2, 1.25,
    w, 0.2, 1.25,
    w, -0.7, 0,

    // Sloped front edge
    -w, 0.7, 0,
    w, 0.7, 0,
    w, 0.2, 1.25,

    -w, 0.7, 0,
    w, 0.2, 1.25,
    -w, 0.2, 1.25,
  ]);

  geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geom.computeVertexNormals();
  return geom;
}

/**
 * 3D Sundial Scene Mesh.
 * Receives cursor coordinates to rotate the directional sun and cast interactive shadows.
 */
function SundialMesh({ mouseCoords }) {
  const sunLightRef = useRef();
  const dialGroupRef = useRef();

  const [dialTexture, setDialTexture] = useState(null);

  useEffect(() => {
    const canvas = createDialCanvasTexture();
    if (!canvas) return;
    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    setDialTexture(tex);

    return () => tex.dispose();
  }, []);

  const gnomonGeom = useMemo(() => createGnomonGeometry(), []);

  // Dial Materials
  const dialFaceMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      map: dialTexture,
      roughness: 0.55,
      metalness: 0.08,
    });
  }, [dialTexture]);

  const rimMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#D99F2A',
      roughness: 0.32,
      metalness: 0.78,
    });
  }, []);

  const gnomonMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#E8B23D',
      roughness: 0.26,
      metalness: 0.82,
    });
  }, []);

  // Frame Loop: Orbit directional sun based on cursor coordinates
  useFrame((_, delta) => {
    if (sunLightRef.current) {
      // Calculate target sun position based on cursor:
      // Mouse X shifts the sun horizontally around the sundial
      // Mouse Y adjusts solar altitude / elevation angle
      const targetAngle = Math.PI * 0.38 + mouseCoords.current.x * 0.9;
      const targetElevation = Math.max(2.6, 4.0 - mouseCoords.current.y * 1.2);
      const radius = 4.4;

      const targetX = Math.cos(targetAngle) * radius;
      const targetY = Math.sin(targetAngle) * radius;
      const targetZ = targetElevation;

      sunLightRef.current.position.x = THREE.MathUtils.lerp(
        sunLightRef.current.position.x,
        targetX,
        0.08
      );
      sunLightRef.current.position.y = THREE.MathUtils.lerp(
        sunLightRef.current.position.y,
        targetY,
        0.08
      );
      sunLightRef.current.position.z = THREE.MathUtils.lerp(
        sunLightRef.current.position.z,
        targetZ,
        0.08
      );
    }

    // Gentle camera perspective tilt response
    if (dialGroupRef.current) {
      dialGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        dialGroupRef.current.rotation.x,
        -0.22 - mouseCoords.current.y * 0.08,
        0.05
      );
      dialGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        dialGroupRef.current.rotation.y,
        mouseCoords.current.x * 0.1,
        0.05
      );
    }
  });

  return (
    <group ref={dialGroupRef} position={[0, -0.05, 0]} rotation={[-0.22, 0, 0]}>
      {/* Sun Light: Directional Key Light with Soft Shadow Map */}
      <directionalLight
        ref={sunLightRef}
        position={[2.8, 3.5, 4.5]}
        intensity={2.8}
        color="#FFF8EB"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={15}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-bias={-0.0005}
      />

      {/* Sky Ambient Light */}
      <ambientLight intensity={0.75} color="#FDF9F0" />

      {/* Secondary soft fill light */}
      <directionalLight position={[-3, -2, 2.5]} intensity={0.4} color="#E8DEC8" />

      {/* Dial Backing / Beveled Rim Base */}
      <mesh position={[0, 0, -0.04]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.06, 2.1, 0.08, 96]} />
        <primitive object={rimMat} attach="material" />
      </mesh>

      {/* Horizontal Sunlit Ivory Dial Plate (faces directly +Z towards camera) */}
      <mesh receiveShadow position={[0, 0, 0.002]}>
        <circleGeometry args={[2.02, 96]} />
        <primitive object={dialFaceMat} attach="material" />
      </mesh>

      {/* Outer raised brass bezel ring */}
      <mesh position={[0, 0, 0.006]}>
        <ringGeometry args={[1.94, 2.04, 96]} />
        <primitive object={rimMat} attach="material" />
      </mesh>

      {/* Central Gnomon (Stylus) casting shadow across dial */}
      <mesh
        geometry={gnomonGeom}
        material={gnomonMat}
        castShadow
        position={[0, 0, 0.01]}
      />

      {/* Central Pivot Stud */}
      <mesh position={[0, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.09, 0.05, 32]} />
        <primitive object={rimMat} attach="material" />
      </mesh>
    </group>
  );
}

/**
 * Sundial Hero 3D Component with Cryptographic Scramble Resolve Pipeline.
 */
export const SundialHero3D = ({ className = '' }) => {
  const mouseCoords = useRef({ x: 0.25, y: -0.2 });
  const [hasError, setHasError] = useState(false);

  // GSAP Text Scramble & Resolve State
  const [resolveState, setResolveState] = useState('scrambling'); // 'initial', 'scrambling', 'resolved'
  const [hashText, setHashText] = useState('0x7f4a...8b9c');
  const hashRef = useRef(null);

  const hexChars = '0123456789ABCDEFabcdef';

  // Run the cryptographic resolve sequence
  useEffect(() => {
    let iteration = 0;
    const targetHash = 'CRED::VERIFIED::2026';
    let timer;

    const runScramble = () => {
      setResolveState('scrambling');
      iteration = 0;

      const interval = setInterval(() => {
        setHashText((prev) => {
          iteration++;
          if (iteration > 24) {
            clearInterval(interval);
            setResolveState('resolved');
            return targetHash;
          }
          // Scramble characters
          let scrambled = '0x';
          for (let i = 0; i < 14; i++) {
            scrambled += hexChars[Math.floor(Math.random() * hexChars.length)];
          }
          return scrambled;
        });
      }, 45);
    };

    // Trigger on mount, then gently cycle every 8 seconds
    runScramble();
    timer = setInterval(runScramble, 8500);

    return () => {
      clearInterval(timer);
    };
  }, []);

  const handlePointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    mouseCoords.current = { x, y };
  };

  if (hasError) {
    return <SundialFallback className={className} />;
  }

  return (
    <div
      className={`sundial-3d-canvas-container ${className}`}
      onPointerMove={handlePointerMove}
      aria-label="3D Interactive Sundial Instrument"
    >
      <Canvas
        camera={{ position: [0, 0, 5.8], fov: 45 }}
        dpr={[1, 1.5]}
        shadows
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        onError={() => setHasError(true)}
      >
        <SundialMesh mouseCoords={mouseCoords} />
      </Canvas>

      {/* Floating Cryptographic Resolve Plate */}
      <div className="sundial-resolve-plate" aria-live="polite">
        <div className="resolve-plate-inner">
          <div className={`resolve-icon-wrap ${resolveState === 'resolved' ? 'active' : ''}`}>
            {resolveState === 'resolved' ? (
              <Check size={14} className="resolve-check" />
            ) : (
              <FileText size={14} className="resolve-doc" />
            )}
          </div>
          <div className="resolve-text-col">
            <span className="resolve-caption">Light Resolving Into Proof</span>
            <code ref={hashRef} className={`resolve-hash-code ${resolveState === 'resolved' ? 'resolved' : ''}`}>
              {hashText}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SundialHero3D;
