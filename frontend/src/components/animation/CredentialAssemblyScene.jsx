import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import "./credential-assembly-scene.css";

const CYAN = 0x15abd9;
const CERT_W = 2.4;
const CERT_H = 3.0;
const COLS = 4;
const ROWS = 5;

const clamp01 = (n) => Math.max(0, Math.min(1, n));
const ease = (n) => {
  const x = clamp01(n);
  return x * x * (3 - 2 * x);
};

function randomFrom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function certificateCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 800;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("Canvas 2D unavailable");

  const bg = c.createLinearGradient(0, 0, 640, 800);
  bg.addColorStop(0, "#0d304a");
  bg.addColorStop(1, "#071729");
  c.fillStyle = bg;
  c.fillRect(0, 0, 640, 800);
  c.strokeStyle = "#15abd9";
  c.lineWidth = 5;
  c.strokeRect(18, 18, 604, 764);
  c.strokeStyle = "rgba(91,220,255,.35)";
  c.lineWidth = 2;
  c.strokeRect(34, 34, 572, 732);

  c.fillStyle = "#15abd9";
  c.fillRect(54, 55, 46, 46);
  c.strokeStyle = "#fff";
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(65, 79);
  c.lineTo(76, 89);
  c.lineTo(91, 67);
  c.stroke();

  c.fillStyle = "#fff";
  c.font = "700 48px Arial, sans-serif";
  c.fillText("XYPHER", 118, 91);
  c.fillStyle = "#5be3ff";
  c.font = "600 18px Arial, sans-serif";
  c.fillText("VERIFIED DIGITAL CREDENTIAL", 55, 145);

  // Decorative QR-like grid
  const rand = randomFrom(42);
  const qx = 58,
    qy = 190,
    cell = 12,
    count = 15;
  c.fillStyle = "#f5fcff";
  c.fillRect(qx - 10, qy - 10, count * cell + 20, count * cell + 20);
  c.fillStyle = "#082033";
  for (let y = 0; y < count; y++) {
    for (let x = 0; x < count; x++) {
      if (rand() > 0.5) {
        c.fillRect(qx + x * cell, qy + y * cell, cell - 1, cell - 1);
      }
    }
  }
  const finder = (fx, fy) => {
    c.fillStyle = "#082033";
    c.fillRect(qx + fx * cell, qy + fy * cell, 7 * cell, 7 * cell);
    c.fillStyle = "#fff";
    c.fillRect(qx + (fx + 1) * cell, qy + (fy + 1) * cell, 5 * cell, 5 * cell);
    c.fillStyle = "#082033";
    c.fillRect(qx + (fx + 2) * cell, qy + (fy + 2) * cell, 3 * cell, 3 * cell);
  };
  finder(0, 0);
  finder(8, 0);
  finder(0, 8);

  c.strokeStyle = "#22c9f2";
  c.lineWidth = 3;
  for (let i = 1; i <= 8; i++) {
    c.beginPath();
    c.arc(430, 285, i * 15, Math.PI * 1.08, Math.PI * 1.92);
    c.stroke();
  }
  c.fillStyle = "rgba(235,250,255,.85)";
  c.font = "600 15px monospace";
  c.fillText("INTEGRITY CHECK", 340, 430);
  c.fillStyle = "#fff";
  c.font = "700 35px Arial, sans-serif";
  c.fillText("ACADEMIC RECORD", 58, 535);
  c.fillStyle = "rgba(221,241,250,.38)";
  c.fillRect(58, 562, 410, 7);
  c.fillRect(58, 585, 335, 7);
  c.fillRect(58, 608, 375, 7);
  c.fillStyle = "#5be3ff";
  c.font = "600 17px monospace";
  c.fillText("HASH • VERIFIED • AUDITABLE", 58, 686);
  c.beginPath();
  c.arc(520, 700, 44, 0, Math.PI * 2);
  c.fillStyle = "#15abd9";
  c.fill();
  c.strokeStyle = "#fff";
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(498, 700);
  c.lineTo(514, 716);
  c.lineTo(543, 682);
  c.stroke();
  return canvas;
}

function fragmentCanvas(kind) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("Canvas 2D unavailable");
  c.fillStyle = "#0a2535";
  c.fillRect(0, 0, 128, 128);
  c.strokeStyle = "#15abd9";
  c.lineWidth = 3;
  c.strokeRect(2, 2, 124, 124);
  const rand = randomFrom(7 + kind * 13);
  if (kind === 0) {
    c.fillStyle = "#fff";
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if (rand() > 0.5) c.fillRect(12 + x * 13, 12 + y * 13, 10, 10);
      }
    }
  } else if (kind === 1) {
    c.lineWidth = 3;
    for (let i = 1; i < 6; i++) {
      c.beginPath();
      c.arc(64, 100, i * 14, Math.PI * 1.1, Math.PI * 1.9);
      c.stroke();
    }
  } else {
    c.fillStyle = "#fff";
    c.font = "700 16px Arial";
    c.fillText("VERIFIED", 12, 43);
    c.fillStyle = "rgba(255,255,255,.4)";
    for (let i = 0; i < 4; i++) c.fillRect(12, 61 + i * 13, 98 - i * 12, 5);
  }
  return canvas;
}

function glowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("Canvas 2D unavailable");
  const g = c.createRadialGradient(128, 128, 8, 128, 128, 128);
  g.addColorStop(0, "rgba(21,171,217,.85)");
  g.addColorStop(0.45, "rgba(21,171,217,.24)");
  g.addColorStop(1, "rgba(21,171,217,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

export default function CredentialAssemblyScene() {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      host.dataset.webgl = "unavailable";
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    camera.position.set(0, 0.25, 8.4);
    scene.add(new THREE.AmbientLight(0xb6d9e8, 1.15));
    const key = new THREE.DirectionalLight(0xffffff, 1.25);
    key.position.set(-3, 4, 5);
    scene.add(key);
    const cyan = new THREE.PointLight(CYAN, 0, 10);
    cyan.position.set(1.7, 2, 1.8);
    scene.add(cyan);

    const certTexture = new THREE.CanvasTexture(certificateCanvas());
    certTexture.colorSpace = THREE.SRGBColorSpace;
    certTexture.anisotropy = Math.min(
      4,
      renderer.capabilities.getMaxAnisotropy()
    );
    const fragTextures = [0, 1, 2].map((i) => {
      const t = new THREE.CanvasTexture(fragmentCanvas(i));
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    });

    const cert = new THREE.Group();
    cert.position.set(0.7, 0, 0);
    scene.add(cert);
    const tiles = [];
    const tileW = CERT_W / COLS,
      tileH = CERT_H / ROWS;

    // 20 UV-mapped tiles
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const geometry = new THREE.PlaneGeometry(tileW, tileH);
        const u0 = col / COLS,
          u1 = (col + 1) / COLS,
          v1 = 1 - row / ROWS,
          v0 = 1 - (row + 1) / ROWS;
        geometry.attributes.uv.array.set([u0, v1, u1, v1, u0, v0, u1, v0]);
        geometry.attributes.uv.needsUpdate = true;
        const material = new THREE.MeshBasicMaterial({
          map: certTexture,
          transparent: true,
          side: THREE.DoubleSide,
          opacity: 0.95,
        });
        const mesh = new THREE.Mesh(geometry, material);
        cert.add(mesh);
        const target = new THREE.Vector3(
          -CERT_W / 2 + tileW * (col + 0.5),
          CERT_H / 2 - tileH * (row + 0.5),
          0
        );
        tiles.push({
          mesh,
          target,
          phase: Math.random() * Math.PI * 2,
          radius: 1.7 + Math.random() * 2,
          speed: 0.12 + Math.random() * 0.25,
          direction: Math.random() < 0.5 ? -1 : 1,
          fragment: false,
        });
      }
    }

    // 18 loose fragments orbiting
    for (let i = 0; i < 18; i++) {
      const size = 0.14 + Math.random() * 0.2;
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size),
        new THREE.MeshBasicMaterial({
          map: fragTextures[i % 3],
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      scene.add(mesh);
      tiles.push({
        mesh,
        target: new THREE.Vector3(0, 0, -0.1),
        phase: Math.random() * Math.PI * 2,
        radius: 1.8 + Math.random() * 2.4,
        speed: 0.15 + Math.random() * 0.35,
        direction: Math.random() < 0.5 ? -1 : 1,
        fragment: true,
      });
    }

    const glowTex = glowTexture();
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0,
      })
    );
    glow.position.z = -0.12;
    glow.scale.set(3.2, 4, 1);
    cert.add(glow);

    const tempPlaneGeom = new THREE.PlaneGeometry(CERT_W, CERT_H);
    const frameGeometry = new THREE.EdgesGeometry(tempPlaneGeom);
    tempPlaneGeom.dispose(); // immediately dispose temporary geometry
    const frame = new THREE.LineSegments(
      frameGeometry,
      new THREE.LineBasicMaterial({
        color: 0x7fe3ff,
        transparent: true,
        opacity: 0,
      })
    );
    frame.position.z = 0.02;
    cert.add(frame);

    const node = new THREE.Sprite(
      new THREE.SpriteMaterial({
        color: CYAN,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0,
      })
    );
    node.position.set(-1.7, 0.35, 0.2);
    node.scale.set(0.3, 0.3, 1);
    scene.add(node);

    const particlePositions = new Float32Array(220 * 3);
    const prng = randomFrom(1234);
    for (let i = 0; i < 220; i++) {
      particlePositions[i * 3] = (prng() - 0.5) * 10;
      particlePositions[i * 3 + 1] = (prng() - 0.5) * 6;
      particlePositions[i * 3 + 2] = -2 - prng() * 5;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3)
    );
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x5bdfff,
      size: 0.018,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    let px = 0.5,
      py = 0.5,
      tx = 0.5,
      ty = 0.5,
      progress = reduceMotion ? 1 : 0;
    let raf = 0,
      disposed = false;
    const clock = new THREE.Clock();

    const onPointer = (e) => {
      const r = host.getBoundingClientRect();
      if (r.width && r.height) {
        tx = clamp01((e.clientX - r.left) / r.width);
        ty = clamp01((e.clientY - r.top) / r.height);
      }
    };

    const resize = () => {
      if (disposed) return;
      const w = Math.max(1, host.clientWidth),
        h = Math.max(1, host.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.z = w < 520 ? 10.5 : w < 800 ? 9.4 : 8.4;
      camera.updateProjectionMatrix();
    };

    host.addEventListener("pointermove", onPointer, { passive: true });
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(resize)
        : null;
    ro?.observe(host);
    window.addEventListener("resize", resize);
    resize();

    const draw = () => {
      if (disposed) return;
      raf = requestAnimationFrame(draw);
      const t = clock.getElapsedTime();
      px += (tx - px) * 0.045;
      py += (ty - py) * 0.045;
      if (!reduceMotion) {
        progress = Math.min(1, progress + 0.0022);
      }
      const p = ease(progress);
      cert.rotation.y += ((px - 0.5) * 0.32 - cert.rotation.y) * 0.035;
      cert.rotation.x += ((0.5 - py) * 0.2 - cert.rotation.x) * 0.035;
      cert.position.y = Math.sin(t * 0.8) * (reduceMotion ? 0 : 0.04);
      cert.rotation.z = Math.sin(t * 0.32) * (reduceMotion ? 0 : 0.018);

      for (const tile of tiles) {
        const angle = t * tile.speed * tile.direction + tile.phase;
        if (tile.fragment) {
          const fade = 1 - ease((p - 0.42) / 0.48);
          tile.mesh.position.set(
            cert.position.x + Math.cos(angle) * tile.radius,
            cert.position.y + Math.sin(angle * 0.8) * tile.radius * 0.7,
            Math.sin(angle) * 0.7 - 0.2
          );
          tile.mesh.position.lerp(tile.target, p * 0.65);
          tile.mesh.rotation.set(
            Math.sin(t + tile.phase) * (1 - p),
            Math.cos(t * 0.7 + tile.phase) * (1 - p),
            angle * 0.15
          );
          tile.mesh.material.opacity = fade;
          tile.mesh.visible = fade > 0.015;
        } else {
          const stagger =
            ((tile.phase % (Math.PI * 0.22)) / (Math.PI * 0.22)) * 0.12;
          const local = ease((p - stagger) / 0.88);
          const ox = Math.cos(angle) * tile.radius,
            oy = Math.sin(angle * 0.8) * tile.radius * 0.65,
            oz = Math.sin(angle) * 0.65;
          tile.mesh.position.set(
            ox + (tile.target.x - ox) * local,
            oy + (tile.target.y - oy) * local,
            oz + (tile.target.z - oz) * local
          );
          const wobble = 1 - local;
          tile.mesh.rotation.set(
            Math.sin(t + tile.phase) * 1.2 * wobble,
            Math.cos(t * 0.8 + tile.phase) * 1.2 * wobble,
            Math.sin(t * 0.7) * 0.4 * wobble
          );
          tile.mesh.material.opacity = 0.72 + 0.28 * local;
        }
      }

      glow.material.opacity = p * 0.65;
      frame.material.opacity = p * 0.85;
      cyan.intensity = p * 1.5;
      node.material.opacity = 0.25 + p * 0.5;
      particles.rotation.y = reduceMotion ? 0 : t * 0.008;
      camera.position.x += ((px - 0.5) * 0.42 - camera.position.x) * 0.025;
      camera.position.y +=
        (0.25 + (0.5 - py) * 0.2 - camera.position.y) * 0.025;
      camera.lookAt(0.2, 0, 0);
      renderer.render(scene, camera);
    };

    if (reduceMotion) {
      for (const tile of tiles) {
        if (tile.fragment) {
          tile.mesh.visible = false;
          tile.mesh.material.opacity = 0;
        } else {
          tile.mesh.position.copy(tile.target);
          tile.mesh.rotation.set(0, 0, 0);
          tile.mesh.material.opacity = 1;
        }
      }
      frame.material.opacity = 0.85;
      glow.material.opacity = 0.55;
      node.material.opacity = 0.65;
      camera.lookAt(0.2, 0, 0);
      renderer.render(scene, camera);
    } else {
      raf = requestAnimationFrame(draw);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      host.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", resize);
      ro?.disconnect();

      // Dispose owned geometries & materials once
      for (const tile of tiles) {
        tile.mesh.geometry.dispose();
        tile.mesh.material.dispose();
      }

      glow.material.map?.dispose();
      glow.material.dispose();

      frameGeometry.dispose();
      frame.material.dispose();

      node.material.dispose();

      certTexture.dispose();
      fragTextures.forEach((t) => t.dispose());

      particleGeometry.dispose();
      particleMaterial.dispose();

      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={hostRef} className="credential-scene" aria-hidden="true" />;
}
