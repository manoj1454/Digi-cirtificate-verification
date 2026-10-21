import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const CinematicBreach = () => {
  const hackerRef = useRef(null);
  const vaultRef = useRef(null);
  const shieldRef = useRef(null);
  const innerShieldRef = useRef(null);
  const shockwaveRef = useRef(null);
  const particlesRef = useRef(null);

  // Mutable animation state machine held in ref to avoid React re-renders in useFrame
  const stateRef = useRef({
    stage: 'approach', // 'approach' | 'blocked' | 'resolved'
    stageTimer: 0,
    shockwaveScale: 0,
    shockwaveOpacity: 0,
  });

  // Spark / shockwave particles
  const { particlePositions, particleVelocities } = useMemo(() => {
    const count = 40;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = 0.5;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;

      // Random radial velocity
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.05 + Math.random() * 0.08;
      velocities[i * 3] = Math.cos(angle) * speed;
      velocities[i * 3 + 1] = Math.sin(angle) * speed;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.05;
    }
    return { particlePositions: positions, particleVelocities: velocities };
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const s = stateRef.current;

    // 1. Hacker State Machine
    if (s.stage === 'approach') {
      // Approach towards vault (from -4.8 to -0.9)
      if (hackerRef.current) {
        hackerRef.current.position.x = THREE.MathUtils.lerp(hackerRef.current.position.x, -0.9, 0.035);
        // Subtle stride bobbing
        hackerRef.current.position.y = -0.5 + Math.sin(t * 8) * 0.05;
        // Subtle forward lean
        hackerRef.current.rotation.z = -0.08;

        // Trigger Block when hacker reaches perimeter
        if (hackerRef.current.position.x > -1.15) {
          s.stage = 'blocked';
          s.shockwaveScale = 0.5;
          s.shockwaveOpacity = 0.95;
        }
      }

      // Shield remains subtle/charging before impact
      if (shieldRef.current) {
        shieldRef.current.scale.setScalar(THREE.MathUtils.lerp(shieldRef.current.scale.x, 0.4, 0.08));
      }
    } else if (s.stage === 'blocked') {
      // Shockwave push-back: hacker recoils rapidly to -5.0
      if (hackerRef.current) {
        hackerRef.current.position.x = THREE.MathUtils.lerp(hackerRef.current.position.x, -5.0, 0.075);
        hackerRef.current.position.y = -0.5 + Math.sin(t * 12) * 0.08;
        hackerRef.current.rotation.z = 0.2; // Recoil back tilt
      }

      // Shield expands dramatically on deflection
      if (shieldRef.current) {
        shieldRef.current.scale.setScalar(THREE.MathUtils.lerp(shieldRef.current.scale.x, 1.45, 0.15));
      }

      // Shockwave ring expansion
      s.shockwaveScale += delta * 4.5;
      s.shockwaveOpacity = Math.max(s.shockwaveOpacity - delta * 1.8, 0);

      if (hackerRef.current && hackerRef.current.position.x < -4.6) {
        s.stage = 'resolved';
        s.stageTimer = t + 2.2; // Stay resolved for 2.2 seconds before resetting loop
      }
    } else if (s.stage === 'resolved') {
      // Hacker stays back in defeated posture
      if (hackerRef.current) {
        hackerRef.current.position.x = THREE.MathUtils.lerp(hackerRef.current.position.x, -4.8, 0.05);
        hackerRef.current.rotation.z = THREE.MathUtils.lerp(hackerRef.current.rotation.z, 0, 0.05);
      }

      // Shield settles into a steady protective pulse
      if (shieldRef.current) {
        const pulse = 1.1 + Math.sin(t * 3) * 0.06;
        shieldRef.current.scale.setScalar(THREE.MathUtils.lerp(shieldRef.current.scale.x, pulse, 0.08));
      }

      // Reset cycle after timer expires
      if (t > s.stageTimer) {
        s.stage = 'approach';
        if (hackerRef.current) {
          hackerRef.current.position.x = -4.8;
        }
      }
    }

    // 2. Shockwave Mesh Update
    if (shockwaveRef.current) {
      shockwaveRef.current.scale.setScalar(s.shockwaveScale);
      shockwaveRef.current.material.opacity = s.shockwaveOpacity;
      shockwaveRef.current.visible = s.shockwaveOpacity > 0.01;
    }

    // 3. Vault Animation: gentle hover oscillation
    if (vaultRef.current) {
      vaultRef.current.position.y = Math.sin(t * 1.4) * 0.08;
      vaultRef.current.rotation.y = t * 0.12;
    }

    // 4. Shield Rotations
    if (shieldRef.current) {
      shieldRef.current.rotation.y += 0.014;
      shieldRef.current.rotation.x += 0.007;
    }
    if (innerShieldRef.current) {
      innerShieldRef.current.rotation.y -= 0.02;
      innerShieldRef.current.rotation.z += 0.01;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* =====================================================================
          1. THE VAULT (Cryptographic Database Monolith on Right, x: 2.2)
          ===================================================================== */}
      <group ref={vaultRef} position={[2.2, 0, 0]}>
        {/* Main Database Cylinder */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.85, 0.85, 2.3, 8]} />
          <meshStandardMaterial
            color="#081d36"
            emissive="#00c8f0"
            emissiveIntensity={0.3}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>

        {/* Database Storage Core Rings */}
        {[0.75, 0.25, -0.25, -0.75].map((y, i) => (
          <mesh key={i} position={[0, y, 0]}>
            <torusGeometry args={[0.9, 0.045, 16, 32]} />
            <meshStandardMaterial
              color="#00f2ff"
              emissive="#00f2ff"
              emissiveIntensity={2.5}
            />
          </mesh>
        ))}

        {/* Top Cryptographic Terminal Beacon */}
        <mesh position={[0, 1.25, 0]}>
          <octahedronGeometry args={[0.22, 0]} />
          <meshStandardMaterial
            color="#35dcff"
            emissive="#00f2ff"
            emissiveIntensity={3}
            wireframe
          />
        </mesh>

        {/* Ground Projection Ring beneath Vault */}
        <mesh position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.6, 1.4, 32]} />
          <meshBasicMaterial color="#00f2ff" transparent opacity={0.2} />
        </mesh>
      </group>

      {/* =====================================================================
          2. THE INTRUDER (Stylized Cyber Hacker Figure on Left)
          ===================================================================== */}
      <group ref={hackerRef} position={[-4.8, -0.5, 0]}>
        {/* Head */}
        <mesh position={[0, 1.2, 0]}>
          <sphereGeometry args={[0.22, 16, 16]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.3} />
        </mesh>
        {/* Red Threat Visor */}
        <mesh position={[0.15, 1.22, 0]}>
          <boxGeometry args={[0.12, 0.06, 0.22]} />
          <meshStandardMaterial color="#ff0055" emissive="#ff0055" emissiveIntensity={2.5} />
        </mesh>

        {/* Torso */}
        <mesh position={[0, 0.62, 0]}>
          <boxGeometry args={[0.42, 0.72, 0.24]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} />
        </mesh>

        {/* Right Arm reaching out towards Vault */}
        <mesh position={[0.3, 0.72, 0.12]} rotation={[0, 0, -0.7]}>
          <boxGeometry args={[0.12, 0.44, 0.12]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        {/* Left Arm trailing */}
        <mesh position={[-0.15, 0.6, -0.12]} rotation={[0, 0, 0.3]}>
          <boxGeometry args={[0.12, 0.42, 0.12]} />
          <meshStandardMaterial color="#334155" />
        </mesh>

        {/* Left Leg */}
        <mesh position={[-0.12, -0.05, 0]}>
          <boxGeometry args={[0.14, 0.55, 0.14]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        {/* Right Leg */}
        <mesh position={[0.12, -0.05, 0]}>
          <boxGeometry args={[0.14, 0.55, 0.14]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
      </group>

      {/* =====================================================================
          3. THE BLOCKCHAIN SHIELD (Perimeter Defense Barrier, x: 0.5)
          ===================================================================== */}
      <group position={[0.5, 0, 0]}>
        {/* Outer Hexagonal Shield */}
        <mesh ref={shieldRef} scale={[0.4, 0.4, 0.4]}>
          <icosahedronGeometry args={[1.3, 1]} />
          <meshStandardMaterial
            color="#00f2ff"
            wireframe
            transparent
            opacity={0.8}
            emissive="#00f2ff"
            emissiveIntensity={3.2}
          />
        </mesh>

        {/* Inner Cryptographic Defense Core */}
        <mesh ref={innerShieldRef} scale={[0.7, 0.7, 0.7]}>
          <icosahedronGeometry args={[0.8, 0]} />
          <meshStandardMaterial
            color="#35dcff"
            wireframe
            transparent
            opacity={0.5}
            emissive="#0066ff"
            emissiveIntensity={2}
          />
        </mesh>

        {/* Shockwave Energy Deflection Ring */}
        <mesh ref={shockwaveRef} rotation={[0, Math.PI / 2, 0]} visible={false}>
          <ringGeometry args={[0.8, 1.25, 32]} />
          <meshBasicMaterial
            color="#00f2ff"
            transparent
            opacity={0}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* =====================================================================
          4. LIGHTING & AMBIENT SETUP
          ===================================================================== */}
      <ambientLight intensity={0.35} />
      {/* Cyan Shield / Vault Light */}
      <pointLight position={[2, 2, 3]} color="#00f2ff" intensity={2.2} distance={15} />
      {/* Hacker Threat Rim Light */}
      <pointLight position={[-4, 1.5, 2]} color="#ff2255" intensity={1.2} distance={10} />
      {/* Cool Fill Light */}
      <pointLight position={[0, -2, 4]} color="#2878ff" intensity={0.9} distance={12} />

      {/* Cyber Grid Floor Plane */}
      <mesh position={[0, -1.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[18, 12]} />
        <meshBasicMaterial color="#031124" />
      </mesh>
    </group>
  );
};

export const BreachHeroScene = () => {
  return (
    <div className="xy-breach-canvas-container" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 7.5], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <CinematicBreach />
      </Canvas>
    </div>
  );
};

export default BreachHeroScene;
