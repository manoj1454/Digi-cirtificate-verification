import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Autonomous Credential Ledger Node
 * Directly adapted from the reference repository (AnimatedBox in landing-page.tsx),
 * elevated with cryptographic integrity styling (translucent glass, glowing neon edges,
 * and pulsating verification data beacons).
 */
function CredentialLedgerNode({ initialPosition, nodeType = 'credential', isReducedMotion = false }) {
  const meshRef = useRef(null);
  const coreRef = useRef(null);
  const [targetPosition, setTargetPosition] = useState(() => new THREE.Vector3(...initialPosition));
  const currentPosition = useRef(new THREE.Vector3(...initialPosition));

  // Determine node aesthetic based on simulated cryptographic role
  const nodeConfig = useMemo(() => {
    switch (nodeType) {
      case 'anchor':
        return {
          bodyColor: '#0c3d5f',
          edgeColor: '#5be3ff',
          coreColor: '#38bdf8',
          emissiveIntensity: 0.6,
          scale: [1.2, 1.2, 1.2],
        };
      case 'verified':
        return {
          bodyColor: '#063544',
          edgeColor: '#22e3ae',
          coreColor: '#10b981',
          emissiveIntensity: 0.8,
          scale: [1, 1, 1],
        };
      default:
        return {
          bodyColor: '#07243c',
          edgeColor: '#15abd9',
          coreColor: '#0ea5e9',
          emissiveIntensity: 0.5,
          scale: [1, 1, 1],
        };
    }
  }, [nodeType]);

  // Cardinal direction stepped navigation from reference repository
  const getAdjacentIntersection = (current) => {
    const directions = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    const randomDirection = directions[Math.floor(Math.random() * directions.length)];
    // Stepping along the 3-unit grid section intersections
    return new THREE.Vector3(
      current.x + randomDirection[0] * 3,
      initialPosition[1],
      current.z + randomDirection[1] * 3
    );
  };

  useEffect(() => {
    if (isReducedMotion) return;

    // Randomize stagger so all boxes don't step in unison
    const delay = 1400 + Math.random() * 800;
    const interval = setInterval(() => {
      const newPos = getAdjacentIntersection(currentPosition.current);
      // Confine inside active ledger bounds
      newPos.x = Math.max(-18, Math.min(18, newPos.x));
      newPos.z = Math.max(-18, Math.min(18, newPos.z));
      setTargetPosition(newPos);
    }, delay);

    return () => clearInterval(interval);
  }, [isReducedMotion]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      if (!isReducedMotion) {
        // Smooth lerp tracking target coordinate
        currentPosition.current.lerp(targetPosition, 0.07);
        // Subtle vertical floating breath
        const floatOffset = Math.sin(state.clock.elapsedTime * 2 + initialPosition[0]) * 0.08;
        meshRef.current.position.set(
          currentPosition.current.x,
          currentPosition.current.y + floatOffset,
          currentPosition.current.z
        );

        if (coreRef.current) {
          coreRef.current.rotation.y += delta * 1.5;
          coreRef.current.rotation.x += delta * 0.8;
        }
      } else {
        meshRef.current.position.copy(currentPosition.current);
      }
    }
  });

  return (
    <group ref={meshRef} position={initialPosition} scale={nodeConfig.scale}>
      {/* Frosted Translucent Credential Block */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={nodeConfig.bodyColor}
          roughness={0.15}
          metalness={0.8}
          transparent
          opacity={0.85}
          emissive={nodeConfig.bodyColor}
          emissiveIntensity={0.2}
        />
        {/* Crisp Luminescent Wireframe Edges */}
        <lineSegments>
          <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry(1.001, 1.001, 1.001)]} />
          <lineBasicMaterial attach="material" color={nodeConfig.edgeColor} linewidth={2} />
        </lineSegments>
      </mesh>

      {/* Internal Cryptographic Beacon Core */}
      <mesh ref={coreRef} position={[0, 0, 0]}>
        <octahedronGeometry args={[0.26, 0]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive={nodeConfig.coreColor}
          emissiveIntensity={nodeConfig.emissiveIntensity}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* Downward Ledger Projection Ray */}
      <line>
        <bufferGeometry
          attach="geometry"
          onUpdate={(geo) => {
            geo.setFromPoints([
              new THREE.Vector3(0, -0.5, 0),
              new THREE.Vector3(0, -initialPosition[1], 0),
            ]);
          }}
        />
        <lineBasicMaterial
          attach="material"
          color={nodeConfig.edgeColor}
          transparent
          opacity={0.35}
        />
      </line>
    </group>
  );
}

/**
 * Central Master Anchor Nexus
 * Sits at origin [0, 1.2, 0], representing the root authority of the network.
 * Features the rotating isometric compound emblem (from SpinningLogo)
 * flanked by concentric cryptographic orbital verification rings.
 */
function CentralAnchorNexus({ isReducedMotion = false }) {
  const nexusRef = useRef(null);
  const ring1Ref = useRef(null);
  const ring2Ref = useRef(null);

  useFrame((state, delta) => {
    if (isReducedMotion) return;
    if (nexusRef.current) {
      nexusRef.current.rotation.y += delta * 0.4;
    }
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z += delta * 0.3;
      ring1Ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.4) * 0.3;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z -= delta * 0.25;
      ring2Ref.current.rotation.y = Math.cos(state.clock.elapsedTime * 0.4) * 0.3;
    }
  });

  return (
    <group position={[0, 1.2, 0]}>
      {/* Central Compound Diamond/Cube Core */}
      <group ref={nexusRef}>
        <mesh>
          <boxGeometry args={[1.5, 1.5, 1.5]} />
          <meshStandardMaterial
            color="#082b45"
            roughness={0.1}
            metalness={0.9}
            transparent
            opacity={0.9}
            emissive="#15abd9"
            emissiveIntensity={0.35}
          />
          <lineSegments>
            <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry(1.502, 1.502, 1.502)]} />
            <lineBasicMaterial attach="material" color="#5be3ff" linewidth={2.5} />
          </lineSegments>
        </mesh>

        {/* Compound Offset Satellites */}
        <mesh position={[0.75, 0.75, 0.75]}>
          <boxGeometry args={[0.7, 0.7, 0.7]} />
          <meshStandardMaterial color="#0284c7" roughness={0.2} metalness={0.8} />
          <lineSegments>
            <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry(0.702, 0.702, 0.702)]} />
            <lineBasicMaterial attach="material" color="#ffffff" linewidth={1.5} />
          </lineSegments>
        </mesh>
        <mesh position={[-0.75, -0.75, -0.75]}>
          <boxGeometry args={[0.7, 0.7, 0.7]} />
          <meshStandardMaterial color="#0ea5e9" roughness={0.2} metalness={0.8} />
          <lineSegments>
            <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry(0.702, 0.702, 0.702)]} />
            <lineBasicMaterial attach="material" color="#38bdf8" linewidth={1.5} />
          </lineSegments>
        </mesh>
      </group>

      {/* Holographic Verification Orbital Ring 1 */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[3.2, 0.025, 16, 100]} />
        <meshBasicMaterial color="#5be3ff" transparent opacity={0.65} />
      </mesh>

      {/* Holographic Verification Orbital Ring 2 */}
      <mesh ref={ring2Ref} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[4.2, 0.02, 16, 100]} />
        <meshBasicMaterial color="#22e3ae" transparent opacity={0.45} />
      </mesh>

      {/* Upward Laser Light Beam */}
      <pointLight position={[0, 0, 0]} intensity={2.5} distance={15} color="#5be3ff" />
    </group>
  );
}

/**
 * Full 3D Scene Controller
 * Integrates Drei Grid, autonomous nodes, OrbitControls, and mouse parallax
 */
function MatrixScene({ mousePos, isReducedMotion }) {
  // Dispersed initial coordinates matching the 3-unit grid step system
  const initialPositions = useMemo(
    () => [
      { pos: [-9, 0.6, -9], type: 'anchor' },
      { pos: [-3, 0.6, -3], type: 'verified' },
      { pos: [3, 0.6, 3], type: 'credential' },
      { pos: [9, 0.6, 9], type: 'verified' },
      { pos: [-6, 0.6, 6], type: 'credential' },
      { pos: [6, 0.6, -6], type: 'anchor' },
      { pos: [-12, 0.6, 0], type: 'credential' },
      { pos: [12, 0.6, 0], type: 'verified' },
      { pos: [0, 0.6, 12], type: 'credential' },
      { pos: [-15, 0.6, -6], type: 'credential' },
      { pos: [15, 0.6, 6], type: 'credential' },
    ],
    []
  );

  // Subtle camera parallax tracking without hijacking OrbitControls
  useFrame((state) => {
    if (!isReducedMotion && mousePos.current) {
      state.camera.position.x += (28 + mousePos.current.x * 3.5 - state.camera.position.x) * 0.02;
      state.camera.position.y += (22 + mousePos.current.y * 2.5 - state.camera.position.y) * 0.02;
    }
  });

  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[20, 30, 20]} intensity={1.4} color="#f0f9ff" castShadow />
      <pointLight position={[-15, 12, -15]} intensity={0.8} color="#0284c7" />

      {/* OrbitControls configured to prevent hijacking user page scroll */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enableDamping
        dampingFactor={0.05}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minPolarAngle={Math.PI / 6}
        autoRotate={!isReducedMotion}
        autoRotateSpeed={0.35}
      />

      {/* Infinite 3D Perspective Coordinate Grid from Reference Repository */}
      <Grid
        renderOrder={-1}
        position={[0, 0, 0]}
        infiniteGrid
        cellSize={1}
        cellThickness={0.6}
        cellColor={[0.02, 0.15, 0.28]}
        sectionSize={3}
        sectionThickness={1.2}
        sectionColor={[0.08, 0.67, 0.85]}
        fadeDistance={55}
        fadeStrength={1.5}
      />

      {/* Central Root Anchor Nexus */}
      <CentralAnchorNexus isReducedMotion={isReducedMotion} />

      {/* Dynamic Grid Nodes */}
      {initialPositions.map((node, index) => (
        <CredentialLedgerNode
          key={index}
          initialPosition={node.pos}
          nodeType={node.type}
          isReducedMotion={isReducedMotion}
        />
      ))}
    </>
  );
}

export function XypherLedgerMatrix3D({ className = '' }) {
  const containerRef = useRef(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setIsReducedMotion(mediaQuery.matches);

      const handleChange = (e) => setIsReducedMotion(e.matches);
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  const handlePointerMove = (e) => {
    if (!containerRef.current || isReducedMotion) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    mousePos.current = { x, y };
  };

  return (
    <div
      ref={containerRef}
      id="hero-seal-container"
      className={`seal-3d-canvas-container xypher-ledger-matrix-container ${className}`}
      onPointerMove={handlePointerMove}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        inset: 0,
        pointerEvents: 'auto',
      }}
    >
      <Canvas
        shadows
        camera={{ position: [28, 22, 28], fov: 46 }}
        dpr={[1, Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2)]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          stencil: false,
        }}
        style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}
      >
        <MatrixScene mousePos={mousePos} isReducedMotion={isReducedMotion} />
      </Canvas>
    </div>
  );
}

export default XypherLedgerMatrix3D;
