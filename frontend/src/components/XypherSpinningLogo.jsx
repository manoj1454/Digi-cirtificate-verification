import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { isWebGLSupported } from '../lib/deviceDetection';

/**
 * 3D Isometric Compound Emblem
 * Directly adapted from the reference repository (SpinningLogo in landing-page.tsx),
 * elevated with XYPHER cryptographic aesthetics (cyan/azure materials, glowing edges).
 * Includes automatic SVG fallback when WebGL is unavailable.
 */
function LogoMeshGroup({ isReducedMotion }) {
  const groupRef = useRef(null);

  useFrame((state, delta) => {
    if (groupRef.current && !isReducedMotion) {
      groupRef.current.rotation.y += delta * 0.75;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Central Root Cube */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#15abd9"
          roughness={0.2}
          metalness={0.8}
          emissive="#0d4a66"
          emissiveIntensity={0.4}
        />
        <lineSegments>
          <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry(1.002, 1.002, 1.002)]} />
          <lineBasicMaterial attach="material" color="#5be3ff" linewidth={2} />
        </lineSegments>
      </mesh>

      {/* Upper Offset Block (Issuer Anchor) */}
      <mesh position={[0.48, 0.48, 0.48]}>
        <boxGeometry args={[0.48, 0.48, 0.48]} />
        <meshStandardMaterial
          color="#38bdf8"
          roughness={0.25}
          metalness={0.7}
          emissive="#0284c7"
          emissiveIntensity={0.5}
        />
        <lineSegments>
          <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry(0.482, 0.482, 0.482)]} />
          <lineBasicMaterial attach="material" color="#ffffff" linewidth={1.5} />
        </lineSegments>
      </mesh>

      {/* Lower Offset Block (Recipient Credential) */}
      <mesh position={[-0.48, -0.48, -0.48]}>
        <boxGeometry args={[0.48, 0.48, 0.48]} />
        <meshStandardMaterial
          color="#0ea5e9"
          roughness={0.25}
          metalness={0.7}
          emissive="#0369a1"
          emissiveIntensity={0.5}
        />
        <lineSegments>
          <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry(0.482, 0.482, 0.482)]} />
          <lineBasicMaterial attach="material" color="#93c5fd" linewidth={1.5} />
        </lineSegments>
      </mesh>
    </group>
  );
}

export function XypherSpinningLogo({ size = 44, className = '' }) {
  const [canRender3D, setCanRender3D] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCanRender3D(isWebGLSupported());
      setIsReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
  }, []);

  if (!canRender3D) {
    return (
      <div
        className={`xypher-spinning-logo-wrap ${className}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 40 40" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="20,4 34,12 20,20 6,12" fill="#38bdf8" stroke="#5be3ff" strokeWidth="1.2" />
          <polygon points="6,12 20,20 20,36 6,28" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.2" />
          <polygon points="20,20 34,12 34,28 20,36" fill="#0369a1" stroke="#0ea5e9" strokeWidth="1.2" />
          <polygon points="26,8 34,12 26,16 18,12" fill="#ffffff" fillOpacity="0.45" />
          <polygon points="14,24 22,28 22,36 14,32" fill="#15abd9" fillOpacity="0.6" />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`xypher-spinning-logo-wrap ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [2.5, 2.2, 2.8], fov: 42 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
        style={{ pointerEvents: 'none' }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[5, 6, 5]} intensity={1.5} color="#e0f2fe" />
        <pointLight position={[-4, -3, -4]} intensity={0.8} color="#0284c7" />
        <LogoMeshGroup isReducedMotion={isReducedMotion} />
      </Canvas>
    </div>
  );
}

export default XypherSpinningLogo;
