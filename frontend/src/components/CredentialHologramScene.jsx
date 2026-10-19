import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const CredentialHologram = () => {
  const groupRef = useRef(null);
  const meshRef = useRef(null);
  const innerMeshRef = useRef(null);
  const particlesRef = useRef(null);

  // Generate 500 ambient floating data particles in 3D volume
  const particlePositions = useMemo(() => {
    const count = 500;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 10;
    }
    return positions;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Outer icosahedron: slow, elegant rotation + pulse + subtle float
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.2;
      meshRef.current.rotation.z = t * 0.1;
      const scale = 1 + Math.sin(t * 2) * 0.05;
      meshRef.current.scale.set(scale, scale, scale);
      meshRef.current.position.y = Math.sin(t * 1.5) * 0.12;
    }

    // Inner core counter-rotation
    if (innerMeshRef.current) {
      innerMeshRef.current.rotation.y = -t * 0.3;
      innerMeshRef.current.rotation.x = t * 0.15;
      const innerScale = 0.65 + Math.cos(t * 2.5) * 0.03;
      innerMeshRef.current.scale.set(innerScale, innerScale, innerScale);
    }

    // Ambient data particles: differential rotation for depth
    if (particlesRef.current) {
      particlesRef.current.rotation.y = -t * 0.15;
      particlesRef.current.rotation.x = Math.sin(t * 0.5) * 0.05;
    }

    // Interactive mouse parallax
    if (groupRef.current) {
      const targetX = state.pointer.x * 0.45;
      const targetY = -state.pointer.y * 0.45;
      groupRef.current.rotation.y += (targetX - groupRef.current.rotation.y) * 0.06;
      groupRef.current.rotation.x += (targetY - groupRef.current.rotation.x) * 0.06;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Outer Glowing Wireframe Geometry: Digital Identity Certificate */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.2, 2]} />
        <meshStandardMaterial
          color="#00f2ff"
          wireframe
          transparent
          opacity={0.65}
          emissive="#00f2ff"
          emissiveIntensity={1.8}
        />
      </mesh>

      {/* Inner Cryptographic Core */}
      <mesh ref={innerMeshRef}>
        <icosahedronGeometry args={[0.65, 1]} />
        <meshStandardMaterial
          color="#0066ff"
          wireframe
          transparent
          opacity={0.4}
          emissive="#2878ff"
          emissiveIntensity={1.4}
        />
      </mesh>

      {/* Ambient Data Particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particlePositions.length / 3}
            array={particlePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.035}
          color="#00f2ff"
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Lighting Setup */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} color="#00f2ff" intensity={1.8} />
      <pointLight position={[-10, -10, -10]} color="#0066ff" intensity={0.9} />
      <pointLight position={[0, 0, 6]} color="#35dcff" intensity={0.8} />
    </group>
  );
};

export const CredentialHologramScene = () => {
  return (
    <div className="xy-hologram-canvas-container" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <CredentialHologram />
      </Canvas>
    </div>
  );
};

export default CredentialHologramScene;
