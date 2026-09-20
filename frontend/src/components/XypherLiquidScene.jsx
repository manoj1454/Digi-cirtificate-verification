import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  liquidVertexShader,
  liquidFragmentShader,
  particleVertexShader,
  particleFragmentShader,
} from '../shaders/liquidShaders';

/**
 * 3D Translucent Sculptural Glass Lens with Embedded Cryptographic Lattice
 */
function SculpturalLiquidObject({ entranceProgress, scrollProgress }) {
  const meshRef = useRef();
  const particlesRef = useRef();

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 820;

  // Shader uniforms
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uScrollProgress: { value: 0 },
      uEntrance: { value: 0 },
      uIsMobile: { value: isMobile ? 1.0 : 0.0 },
      // Warm ivory and rich translucent amber crystal palette
      uColorBase: { value: new THREE.Color('#FAF5EC') },
      uColorGlassDeep: { value: new THREE.Color('#D8A84E') },
      uColorSpecular: { value: new THREE.Color('#FFFFFF') },
      uColorCryptographic: { value: new THREE.Color('#B27818') },
    }),
    [isMobile]
  );

  const particleUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uEntrance: { value: 0 },
      uScrollProgress: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
    }),
    []
  );

  // Embedded cryptographic points distributed strictly within the sculpted lens volume
  const [particleGeo] = useMemo(() => {
    const count = isMobile ? 350 : 700;
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const randomOffsets = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const y = (Math.random() - 0.5) * 2.0;
      const normY = Math.min(Math.max(y / 1.0, -1.0), 1.0);
      const maxW = Math.cos(normY * 1.35) * 0.65;
      const x = (Math.random() - 0.5) * 2.0 * maxW;
      const z = (Math.random() - 0.5) * 0.25;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      scales[i] = Math.random() * 0.45 + 0.25;

      randomOffsets[i * 3] = Math.random();
      randomOffsets[i * 3 + 1] = Math.random();
      randomOffsets[i * 3 + 2] = Math.random();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geo.setAttribute('aRandomOffset', new THREE.BufferAttribute(randomOffsets, 3));
    return [geo];
  }, [isMobile]);

  // Smooth mouse tracking with viscous damping
  const targetMouse = useRef(new THREE.Vector2(0, 0));
  const currentMouse = useRef(new THREE.Vector2(0, 0));

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      targetMouse.current.set(x, y);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Frame loop
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    currentMouse.current.lerp(targetMouse.current, delta * 2.5);

    if (meshRef.current) {
      const mat = meshRef.current.material;
      mat.uniforms.uTime.value = time;
      mat.uniforms.uMouse.value.copy(currentMouse.current);
      mat.uniforms.uScrollProgress.value = scrollProgress;
      mat.uniforms.uEntrance.value = entranceProgress;

      // 3/4 perspective tilt revealing physical thickness and edge facets
      const baseRotY = isMobile ? 0.0 : -0.32;
      const baseRotX = isMobile ? 0.05 : 0.14;

      meshRef.current.rotation.y = THREE.MathUtils.lerp(
        meshRef.current.rotation.y,
        baseRotY + currentMouse.current.x * 0.16,
        0.06
      );
      meshRef.current.rotation.x = THREE.MathUtils.lerp(
        meshRef.current.rotation.x,
        baseRotX - currentMouse.current.y * 0.12,
        0.06
      );
      meshRef.current.rotation.z = Math.sin(time * 0.3) * 0.02;
    }

    if (particlesRef.current) {
      const pMat = particlesRef.current.material;
      pMat.uniforms.uTime.value = time;
      pMat.uniforms.uMouse.value.copy(currentMouse.current);
      pMat.uniforms.uScrollProgress.value = scrollProgress;
      pMat.uniforms.uEntrance.value = entranceProgress;

      particlesRef.current.rotation.y = meshRef.current?.rotation.y || 0;
      particlesRef.current.rotation.x = meshRef.current?.rotation.x || 0;
    }
  });

  // Asymmetric placement: positioned comfortably in the right half on desktop
  const groupPosition = isMobile ? [0, 0.3, 0] : [0.72, 0.02, 0];
  const groupScale = isMobile ? [0.7, 0.7, 0.7] : [1.02, 1.02, 1.02];

  return (
    <group position={groupPosition} scale={groupScale}>
      {/* 1. 3D Sculptural Translucent Glass Lens Volume */}
      <mesh ref={meshRef} position={[0, 0, 0]}>
        {/* Dimensions tuned so entire silhouette is visible floating in space */}
        <boxGeometry args={[1.65, 2.35, 0.44, isMobile ? 40 : 64, isMobile ? 56 : 80, 20]} />
        <shaderMaterial
          vertexShader={liquidVertexShader}
          fragmentShader={liquidFragmentShader}
          uniforms={uniforms}
          transparent={true}
          side={THREE.FrontSide}
          depthWrite={false}
        />
      </mesh>

      {/* 2. Embedded Cryptographic Lattice Point Cloud */}
      <points ref={particlesRef} geometry={particleGeo}>
        <shaderMaterial
          vertexShader={particleVertexShader}
          fragmentShader={particleFragmentShader}
          uniforms={particleUniforms}
          transparent={true}
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </points>
    </group>
  );
}

/**
 * Full-Screen XYPHER WebGL Canvas Container
 */
export const XypherLiquidScene = ({
  entranceProgress = 1.0,
  scrollProgress = 0.0,
}) => {
  return (
    <div className="xypher-liquid-canvas-wrap" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 4.6], fov: 46 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
      >
        {/* Balanced optical studio lighting */}
        <ambientLight intensity={0.65} color="#FFFDF8" />
        <directionalLight position={[4.0, 4.5, 4.0]} intensity={2.2} color="#FFF7E6" />
        {/* Translucent back-light illuminating crystal interior */}
        <directionalLight position={[-2.5, -1.0, -3.0]} intensity={1.6} color="#E8B23D" />

        <SculpturalLiquidObject
          entranceProgress={entranceProgress}
          scrollProgress={scrollProgress}
        />
      </Canvas>
    </div>
  );
};

export default XypherLiquidScene;
