import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

// --- Base64 Silhouette Image (Silhouette with laptop from prototype) ---
const SILHOUETTE_DATA_URL =
  "data:image/png;base64,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";

export default function IdentityWeaverHero({
  onAccessPortal,
  onScrollToAuth,
  eyebrow = "DIGITAL IDENTITY",
  heading = "Credentials You Can Trust, Verified.",
  sub = "Tamper-proof, blockchain-backed certificates that anyone can verify in seconds. Decentralized cryptographic credential infrastructure engineered for academic institutions, regulators, and verifying employers.",
  btnText = "Learn More",
  secondaryBtnText,
  onSecondaryClick,
}) {
  const containerRef = useRef(null);
  const wrapRef = useRef(null);
  const [isDone, setIsDone] = useState(false);
  const handleScroll = onAccessPortal || onScrollToAuth;

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    // Initialize Three.js renderer
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    wrap.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    const look = new THREE.Vector3(0.7, 0.9, 0);

    scene.add(new THREE.AmbientLight(0xa9bcc8, 0.95));
    const key = new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(-3, 4, 5);
    scene.add(key);

    const rim = new THREE.PointLight(0x15abd9, 0, 9);
    rim.position.set(1.7, 2, 1.8);
    scene.add(rim);

    // --- Figure: exact silhouette from reference as a textured plane ---
    const fig = new THREE.Group();
    fig.position.set(0.2, 0, 0);
    scene.add(fig);

    const sil = new Image();
    sil.onload = () => {
      const tex = new THREE.Texture(sil);
      tex.needsUpdate = true;
      tex.anisotropy = 4;
      const H = 4.6,
        W = (H * 460) / 549;
      const pm = new THREE.Mesh(
        new THREE.PlaneGeometry(W, H),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true })
      );
      pm.position.set(0, 0.4, 0);
      fig.add(pm);

      // soft cyan rim: same silhouette, additive, slightly bigger
      const rm = new THREE.Mesh(
        new THREE.PlaneGeometry(W * 1.03, H * 1.03),
        new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          color: 0x15abd9,
          blending: THREE.AdditiveBlending,
          opacity: 0,
          depthWrite: false,
        })
      );
      rm.position.set(0, 0.4, -0.02);
      fig.add(rm);
      fig.userData.rim = rm;
    };
    sil.src = SILHOUETTE_DATA_URL;

    // Energy node above the laptop
    const node = new THREE.Sprite(
      new THREE.SpriteMaterial({
        color: 0x15abd9,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0,
      })
    );
    node.scale.set(0.9, 0.9, 1);
    node.position.set(-1.2, 0.9, 0.3);
    scene.add(node);

    // --- Dynamic XYPHER Badge Canvas ---
    function rng(s) {
      return function () {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
      };
    }

    function badgeCanvas() {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 640;
      const g = c.getContext('2d');
      const bg = g.createLinearGradient(0, 0, 512, 640);
      bg.addColorStop(0, '#0a2535');
      bg.addColorStop(1, '#0f4560');
      g.fillStyle = bg;
      g.fillRect(0, 0, 512, 640);
      g.strokeStyle = '#15ABD9';
      g.lineWidth = 8;
      g.strokeRect(10, 10, 492, 620);
      g.lineWidth = 2;
      g.strokeStyle = 'rgba(21,171,217,.5)';
      g.strokeRect(26, 26, 460, 588);
      g.fillStyle = '#15ABD9';
      g.fillRect(48, 52, 34, 34);
      g.fillStyle = '#fff';
      g.font = '700 54px Impact,Arial Narrow,sans-serif';
      g.textBaseline = 'middle';
      g.fillText('XYPHER', 96, 70);
      g.fillStyle = '#15ABD9';
      g.font = '600 20px Arial,sans-serif';
      g.fillText('CERTIFIED CREDENTIAL', 50, 126);

      // QR Code
      const r = rng(42),
        N = 21,
        cs = 10,
        qx = 50,
        qy = 170;
      g.fillStyle = '#fff';
      g.fillRect(qx - 8, qy - 8, N * cs + 16, N * cs + 16);
      g.fillStyle = '#08202e';
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          const f = (i < 7 && j < 7) || (i > 13 && j < 7) || (i < 7 && j > 13);
          if (!f && r() > 0.5) g.fillRect(qx + i * cs, qy + j * cs, cs, cs);
        }
      }
      [
        [0, 0],
        [14, 0],
        [0, 14],
      ].forEach((p) => {
        g.fillStyle = '#08202e';
        g.fillRect(qx + p[0] * cs, qy + p[1] * cs, 7 * cs, 7 * cs);
        g.fillStyle = '#fff';
        g.fillRect(qx + (p[0] + 1) * cs, qy + (p[1] + 1) * cs, 5 * cs, 5 * cs);
        g.fillStyle = '#08202e';
        g.fillRect(qx + (p[0] + 2) * cs, qy + (p[1] + 2) * cs, 3 * cs, 3 * cs);
      });

      // Fingerprint / Biometric
      g.strokeStyle = '#15ABD9';
      g.lineWidth = 3;
      for (let k = 1; k <= 8; k++) {
        g.beginPath();
        g.arc(385, 285, k * 13, Math.PI * 1.05, Math.PI * (2 - 0.05 * k));
        g.stroke();
      }
      g.fillStyle = 'rgba(255,255,255,.85)';
      g.font = '600 14px Arial,sans-serif';
      g.fillText('BIOMETRIC MATCH 99.8%', 318, 415);

      // Name block
      g.fillStyle = '#fff';
      g.font = '700 36px Impact,Arial Narrow,sans-serif';
      g.fillText('MANOJ  K.', 50, 465);
      g.fillStyle = 'rgba(255,255,255,.35)';
      g.fillRect(50, 490, 300, 6);
      g.fillRect(50, 510, 220, 6);
      g.fillStyle = '#15ABD9';
      g.font = '600 16px monospace';
      g.fillText('ID 0x7F3A…9C21 · ON-CHAIN', 50, 560);
      g.beginPath();
      g.arc(420, 525, 46, 0, 7);
      g.fillStyle = '#15ABD9';
      g.fill();
      g.strokeStyle = '#fff';
      g.lineWidth = 8;
      g.beginPath();
      g.moveTo(397, 525);
      g.lineTo(414, 543);
      g.lineTo(445, 507);
      g.stroke();
      return c;
    }

    const badgeTex = new THREE.CanvasTexture(badgeCanvas());
    badgeTex.anisotropy = 4;

    // --- Shards Grid ---
    const badge = new THREE.Group();
    badge.position.set(2.0, 2.25, 0.9);
    scene.add(badge);

    const COLS = 4,
      ROWS = 5,
      TW = 0.4,
      TH = 0.4,
      BW = COLS * TW,
      BH = ROWS * TH;
    const ORB = new THREE.Vector3(0.6, 1.2, 0);
    const shards = [];

    function addShard(geo, mat, target, fade) {
      const m = new THREE.Mesh(geo, mat);
      badge.add(m);
      shards.push({
        m: m,
        t: target,
        fade: fade,
        d: Math.random(),
        r: 1.6 + Math.random() * 2.2,
        a: Math.random() * 6.28,
        sp: (0.15 + Math.random() * 0.35) * (Math.random() < 0.5 ? -1 : 1),
        ph: Math.random() * 6.28,
        hy: 0.8 + Math.random() * 1.2,
        rx: Math.random() * 3 + 0.5,
        ry: Math.random() * 3 + 0.5,
        rz: Math.random() * 3 + 0.5,
      });
    }

    for (let rr = 0; rr < ROWS; rr++) {
      for (let cc = 0; cc < COLS; cc++) {
        const geo = new THREE.PlaneGeometry(TW, TH);
        const u0 = cc / COLS,
          u1 = (cc + 1) / COLS,
          v1 = 1 - rr / ROWS,
          v0 = 1 - (rr + 1) / ROWS;
        geo.attributes.uv.array.set([u0, v1, u1, v1, u0, v0, u1, v0]);
        const mat = new THREE.MeshBasicMaterial({
          map: badgeTex,
          side: THREE.DoubleSide,
          transparent: true,
        });
        addShard(
          geo,
          mat,
          new THREE.Vector3(-BW / 2 + TW * (cc + 0.5), BH / 2 - TH * (rr + 0.5), 0),
          false
        );
      }
    }

    // Loose fragments
    function fragTex(kind) {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const g = c.getContext('2d');
      g.fillStyle = 'rgba(10,37,53,.9)';
      g.fillRect(0, 0, 128, 128);
      g.strokeStyle = '#15ABD9';
      g.lineWidth = 4;
      g.strokeRect(2, 2, 124, 124);
      const r = rng(7 + kind * 13);
      if (kind === 0) {
        g.fillStyle = '#fff';
        for (let i = 0; i < 8; i++)
          for (let j = 0; j < 8; j++) if (r() > 0.5) g.fillRect(12 + i * 13, 12 + j * 13, 12, 12);
      } else if (kind === 1) {
        g.lineWidth = 3;
        for (let k = 1; k < 6; k++) {
          g.beginPath();
          g.arc(64, 100, k * 14, Math.PI * 1.1, Math.PI * 1.9);
          g.stroke();
        }
      } else {
        g.fillStyle = '#fff';
        g.font = '700 20px Arial';
        g.fillText('CERTIFIED', 14, 44);
        g.fillStyle = 'rgba(255,255,255,.4)';
        for (let l = 0; l < 4; l++) g.fillRect(14, 62 + l * 14, 100 - l * 14, 6);
      }
      return new THREE.CanvasTexture(c);
    }

    const ft = [fragTex(0), fragTex(1), fragTex(2)];
    for (let f = 0; f < 18; f++) {
      const s = 0.22 + Math.random() * 0.22;
      addShard(
        new THREE.PlaneGeometry(s, s),
        new THREE.MeshBasicMaterial({
          map: ft[f % 3],
          side: THREE.DoubleSide,
          transparent: true,
        }),
        new THREE.Vector3(0, 0, -0.1),
        true
      );
    }

    // Glow
    const gc = document.createElement('canvas');
    gc.width = gc.height = 256;
    const gg = gc.getContext('2d');
    const rg = gg.createRadialGradient(128, 128, 10, 128, 128, 128);
    rg.addColorStop(0, 'rgba(21,171,217,.9)');
    rg.addColorStop(0.5, 'rgba(21,171,217,.25)');
    rg.addColorStop(1, 'rgba(21,171,217,0)');
    gg.fillStyle = rg;
    gg.fillRect(0, 0, 256, 256);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(gc),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0,
      })
    );
    glow.position.z = -0.1;
    glow.scale.set(4, 4.6, 1);
    badge.add(glow);

    // Frame
    const frame = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(BW, BH)),
      new THREE.LineBasicMaterial({ color: 0x7fe3ff, transparent: true, opacity: 0 })
    );
    frame.position.z = 0.01;
    badge.add(frame);

    // Interaction state
    let mx = 0.4,
      my = 0.5,
      lastMove = -10,
      p = 0,
      flash = 0,
      wasDone = false;
    const clock = new THREE.Clock();

    function onMove(x, y) {
      mx = x / window.innerWidth;
      my = y / window.innerHeight;
      lastMove = clock.getElapsedTime();
    }

    const handlePointerMove = (e) => onMove(e.clientX, e.clientY);
    const handleTouchMove = (e) => {
      if (e.touches.length > 0) onMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    function resize() {
      if (!wrap) return;
      const w = wrap.clientWidth,
        h = wrap.clientHeight;
      renderer.setSize(w, h, false);
      cam.aspect = w / h;
      cam.position.set(0, 1.3, w / h < 1 ? 11 : 7.4);
      cam.updateProjectionMatrix();
    }

    window.addEventListener('resize', resize);
    resize();

    function sstep(x) {
      x = Math.max(0, Math.min(1, x));
      return x * x * (3 - 2 * x);
    }

    const tmp = new THREE.Vector3();
    let animId;

    function frameLoop() {
      animId = requestAnimationFrame(frameLoop);
      const t = clock.getElapsedTime();
      let target;

      // Cursor proximity toward figure (mx ~ 0.72) triggers synthesis, or idle demo loop
      if (t - lastMove > 4) {
        target = 0.5 + 0.5 * Math.sin(t * 0.5 - 1.2);
      } else {
        target = 1 - Math.min(1, Math.abs(mx - 0.72) / 0.42);
      }
      target = sstep(target * 1.15);
      p += (target - p) * 0.045;

      const ap = sstep(p * 1.1);
      fig.position.y = Math.sin(t * 1.2) * 0.015;
      fig.rotation.z = -ap * 0.035;
      fig.rotation.y = (mx - 0.7) * 0.12;

      if (fig.userData.rim) fig.userData.rim.material.opacity = ap * 0.35 + flash * 0.4;
      node.material.opacity = ap * 0.8 * (0.7 + 0.3 * Math.sin(t * 5));
      node.scale.setScalar(0.6 + ap * 0.5 + flash);

      badge.rotation.y = (mx - 0.7) * 0.5 * p;
      badge.rotation.x = -(my - 0.4) * 0.3 * p;
      badge.position.y = 2.25 + Math.sin(t * 1.6) * 0.04 * p;

      for (let i = 0; i < shards.length; i++) {
        const s = shards[i];
        const lp = sstep((p - s.d * 0.4) / 0.6);
        const a = s.a + t * s.sp;
        tmp.set(
          ORB.x + Math.cos(a) * s.r,
          ORB.y + Math.sin(t * 0.7 + s.ph) * s.hy,
          Math.sin(a) * s.r * 0.6 + 0.3
        );
        tmp.sub(badge.position);
        s.m.position.set(
          tmp.x + (s.t.x - tmp.x) * lp,
          tmp.y + (s.t.y - tmp.y) * lp,
          tmp.z + (s.t.z - tmp.z) * lp
        );
        const k = 1 - lp;
        s.m.rotation.set(
          Math.sin(t * s.rx * 0.4 + s.ph) * 3 * k,
          Math.sin(t * s.ry * 0.4 + s.ph) * 3 * k,
          Math.sin(t * s.rz * 0.4) * 3 * k
        );
        if (s.fade) {
          const o = 1 - sstep((p - 0.45) / 0.4);
          s.m.material.opacity = o;
          s.m.visible = o > 0.01;
          s.m.scale.setScalar(0.4 + 0.6 * o);
        } else {
          s.m.material.opacity = 0.45 + 0.55 * Math.min(1, lp + 0.2);
        }
      }

      const done = p > 0.96;
      if (done && !wasDone) {
        flash = 1;
        setIsDone(true);
      }
      if (!done && wasDone && p < 0.9) {
        wasDone = false;
        setIsDone(false);
      } else if (done) {
        wasDone = true;
      }
      flash *= 0.94;

      const g3 = Math.pow(p, 4);
      glow.material.opacity = Math.min(1, g3 * 0.8 + flash * 0.6);
      glow.scale.set(4 + flash * 1.2, 4.6 + flash * 1.2, 1);
      frame.material.opacity = g3;
      rim.intensity = g3 * 1.6 + flash * 2;

      cam.lookAt(look);
      cam.position.x = (mx - 0.5) * 0.5;
      renderer.render(scene, cam);
    }

    frameLoop();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('resize', resize);
      if (wrap && renderer.domElement) {
        wrap.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`hero xy-intera-hero ${isDone ? 'done' : ''}`}
      id="hero"
    >
      {/* Three.js 3D Interactive Stage */}
      <div id="stage" ref={wrapRef} />

      {/* Copy Left Column */}
      <div className="copy">
        <div className="eyebrow">{eyebrow}</div>
        <h1>{heading}</h1>
        <p className="sub">{sub}</p>
        <div className="xy-hero-cta-btns" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleScroll}
            className="btn"
            id="hero-scroll-btn"
          >
            {btnText}
          </button>
          {secondaryBtnText && (
            <button
              type="button"
              onClick={onSecondaryClick}
              className="btn btn-secondary-outline"
              id="hero-secondary-btn"
            >
              {secondaryBtnText}
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Feedback Overlays */}
      <div id="msg">
        <b>We bring order and verification</b> to digital chaos.
      </div>
      <div id="hint">Move your cursor toward the figure</div>
    </div>
  );
}

// Aliases for compatibility
export const IdentityWeaverScene = IdentityWeaverHero;
export const IdentityWeaverFinal = IdentityWeaverHero;
