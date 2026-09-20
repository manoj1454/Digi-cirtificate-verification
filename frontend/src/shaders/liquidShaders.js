/**
 * XYPHER — Liquid Cryptographic Identity Shaders (Phase 1.5 Refined)
 * 
 * 3D Physical Translucent Glass / Resin Lens Sculpture with Embedded Cryptographic Lattice
 */

export const liquidVertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uScrollProgress;
  uniform float uEntrance;
  uniform float uIsMobile;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewPosition;
  varying vec3 vLocalPosition;
  varying float vDisplacement;
  varying float vOpticalDepth;

  // 3D Simplex noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vUv = uv;
    vLocalPosition = position;

    vec3 pos = position;

    // Organic double-tapered elliptical lens silhouette
    float normY = clamp(pos.y / 1.18, -1.0, 1.0);
    // Convex lens profile: wide waist at center, organic taper at poles
    float lensContour = cos(normY * 1.35); // 1.0 at center, ~0.22 at poles
    pos.x *= mix(0.28, 1.0, lensContour);

    // Sculptural 3D S-curve fold and convex crystal depth
    float distFromCenter = length(pos.xy * vec2(1.2, 0.65));
    float lensTaper = smoothstep(1.3, 0.15, distFromCenter);
    pos.z = pos.z * mix(0.3, 1.45, lensTaper) + sin(normY * 2.4) * 0.25;

    // Subtle viscous liquid surface displacement
    float wave1 = snoise(vec3(pos.x * 1.4, pos.y * 1.0 + uTime * 0.14, pos.z * 1.8));
    float wave2 = snoise(vec3(pos.x * 2.2 - uTime * 0.09, pos.y * 1.8, pos.z * 2.5));
    float wave = (wave1 * 0.7 + wave2 * 0.3) * 0.09;

    // Cursor field interaction: tactile surface push
    vec2 mouseEffect = uMouse * 1.5;
    float distToMouse = length(pos.xy - mouseEffect);
    float mouseInfluence = smoothstep(1.8, 0.0, distToMouse);
    float cursorPush = sin(distToMouse * 5.0 - uTime * 1.5) * exp(-distToMouse * 2.0) * 0.15;

    // Entrance growth
    float entranceFactor = smoothstep(0.0, 1.0, uEntrance);
    pos.xy *= mix(0.15, 1.0, entranceFactor);

    float totalDisp = (wave + cursorPush * mouseInfluence) * entranceFactor;
    pos += normal * totalDisp;

    // Scroll transition: object unfolds, flattens and translates downward
    float s = uScrollProgress;
    pos.z = mix(pos.z, pos.z * 0.15 - s * 1.2, s);
    pos.y = mix(pos.y, pos.y - s * 2.8, s);
    pos.x = mix(pos.x, pos.x * (1.0 + s * 1.2), s);

    vDisplacement = totalDisp;
    vOpticalDepth = abs(pos.z);

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPos.xyz;

    vec4 viewPos = viewMatrix * worldPos;
    vViewPosition = viewPos.xyz;

    // Dynamic normal with displacement perturbations
    vec3 displacedNormal = normalize(normalMatrix * (normal + vec3(wave1 * 0.18, wave2 * 0.18, 0.0)));
    vNormal = displacedNormal;

    gl_Position = projectionMatrix * viewPos;
  }
`;

export const liquidFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uScrollProgress;
  uniform float uEntrance;
  uniform vec3 uColorBase;
  uniform vec3 uColorGlassDeep;
  uniform vec3 uColorSpecular;
  uniform vec3 uColorCryptographic;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewPosition;
  varying vec3 vLocalPosition;
  varying float vDisplacement;
  varying float vOpticalDepth;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(-vViewPosition);

    // 1. Dynamic Key Light Tracking Cursor
    vec3 lightPos = vec3(uMouse.x * 2.5 + 1.8, uMouse.y * 2.0 + 2.2, 4.0);
    vec3 L = normalize(lightPos - vWorldPosition);
    vec3 H = normalize(L + V);

    // 2. Soft internal illumination
    vec3 backLightPos = vec3(-2.0, -1.0, -3.0);
    vec3 BL = normalize(backLightPos - vWorldPosition);
    float backLightIntensity = max(dot(-N, BL), 0.0) * 0.25;

    // 3. Physical Fresnel (Schlick, optical resin n=1.52)
    float F0 = 0.045;
    float NdotV = max(dot(N, V), 0.0);
    float fresnel = F0 + (1.0 - F0) * pow(1.0 - NdotV, 3.5);

    // 4. Optical Absorption (Beer-Lambert: background paper transmitted through amber crystal)
    // Warm ivory sunlit paper background (#F5EFE0)
    vec3 bgPaper = vec3(0.961, 0.937, 0.878);
    // Deep amber-gold transmission tint through crystal thickness
    vec3 amberTransmission = vec3(0.855, 0.686, 0.345);
    float thickness = clamp(vOpticalDepth * 2.6, 0.0, 1.0);
    vec3 transmitted = mix(bgPaper, amberTransmission, thickness * 0.55);

    // Subtle internal illumination from backlight
    transmitted += vec3(0.22, 0.16, 0.05) * backLightIntensity * thickness;

    // 5. Embedded 3D Cryptographic Lattice (Suspended inside the volume)
    vec3 p = vLocalPosition * 5.5;

    // Crisp coordinate grid lines
    float lineX = 1.0 - smoothstep(0.0, 0.03, abs(fract(p.x * 1.5) - 0.5));
    float lineY = 1.0 - smoothstep(0.0, 0.03, abs(fract(p.y * 0.9) - 0.5));
    float grid = max(lineX, lineY) * 0.45;

    // Intersection datum nodes
    vec2 cell = fract(p.xy * vec2(1.5, 0.9)) - 0.5;
    float node = 1.0 - smoothstep(0.04, 0.085, length(cell));

    // Cryptographic hash marks
    float hash = step(0.965, fract(sin(dot(floor(p.xy), vec2(27.13, 83.71))) * 43758.5453));
    float internalLattice = (grid * 0.4 + node * 0.85 + hash * 0.5) 
                          * smoothstep(1.3, 0.15, length(vLocalPosition.xy))
                          * smoothstep(0.1, 0.85, uEntrance);

    // Rich golden amber datum color for internal lattice
    vec3 latticeColor = vec3(0.68, 0.46, 0.10);
    transmitted = mix(transmitted, latticeColor, internalLattice * 0.88);

    // 6. Blinn-Phong Specular Glint (Tight, sharp optical highlight on crystal facet)
    float NdotH = max(dot(N, H), 0.0);
    float specGlint = pow(NdotH, 128.0) * 1.4;
    vec3 specular = vec3(1.0, 0.99, 0.96) * specGlint;

    // 7. Fresnel Edge Rim (Glowing white/pale-gold optical reflection at glancing angles)
    vec3 rimGlow = vec3(1.0, 0.97, 0.90) * fresnel * 1.1;

    // Assemble final crystal surface
    vec3 finalColor = transmitted + specular + rimGlow;

    // Physical optical alpha:
    float alpha = mix(0.72, 0.98, fresnel + internalLattice * 0.35 + thickness * 0.15);
    alpha = mix(alpha, alpha * 0.25, uScrollProgress * 0.8);

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export const particleVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uEntrance;
  uniform float uScrollProgress;
  uniform vec2 uMouse;

  attribute float aScale;
  attribute vec3 aRandomOffset;

  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    vec3 pos = position;

    // Gentle orbital drift inside the glass volume
    float angle = uTime * 0.2 + aRandomOffset.x * 6.28;
    pos.x += cos(angle) * 0.06;
    pos.y += sin(angle) * 0.06;
    pos.z += sin(uTime * 0.25 + aRandomOffset.z * 3.14) * 0.04;

    // Cursor attraction
    float dist = length(pos.xy - uMouse * 1.5);
    pos.xy += normalize(pos.xy - uMouse * 1.5 + 0.001) * exp(-dist * 2.2) * 0.1;

    // Entrance convergence
    float coalesce = smoothstep(0.0, 1.0, uEntrance);
    pos = mix(pos * 2.0 + aRandomOffset * 1.2, pos, coalesce);

    // Scroll dispersion
    pos.y -= uScrollProgress * 2.8;
    pos.z -= uScrollProgress * 1.4;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    gl_PointSize = aScale * (160.0 / -mvPosition.z) * coalesce;

    // Rich amber and dark ink tones
    float norm = smoothstep(0.0, 1.4, length(pos.xy));
    vColor = mix(vec3(0.82, 0.58, 0.16), vec3(0.22, 0.18, 0.12), norm * 0.45);
    vAlpha = (1.0 - norm * 0.4) * coalesce * (1.0 - uScrollProgress * 0.6);
  }
`;

export const particleFragmentShader = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;

    float edge = smoothstep(0.5, 0.2, dist);
    float core = smoothstep(0.2, 0.0, dist) * 0.5;

    gl_FragColor = vec4(vColor + vec3(core), vAlpha * edge * 0.88);
  }
`;
