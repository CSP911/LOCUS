'use client'

import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import { useStarStore } from '@/store/starStore'
import type { Star, Domain } from '@locus/shared'

// ── Constants ─────────────────────────────────────
const COLORS: Record<Domain, string> = {
  X: '#7ec8e3',
  Y: '#ddd8b0',
  Z: '#f0a870',
}

const DOMAIN_CENTER: Record<Domain, [number, number, number]> = {
  X: [-4.5, 0, -1],
  Y: [0, 3.5, -2.5],
  Z: [4.5, 0, -1],
}

// ── Deterministic random ──────────────────────────
function seeded(id: string, n: number = 0): number {
  let h = 0
  const s = id + String(n)
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i)
    h |= 0
  }
  const x = Math.sin(h) * 10000
  return x - Math.floor(x)
}

// ── Layout ────────────────────────────────────────
function computeLayout(stars: Star[]) {
  const positions = new Map<string, [number, number, number]>()
  const anchorIds = new Set<string>()
  const byDomain: Record<Domain, Star[]> = { X: [], Y: [], Z: [] }
  stars.forEach(s => byDomain[s.domain].push(s))

  for (const domain of ['X', 'Y', 'Z'] as Domain[]) {
    const group = byDomain[domain]
    if (!group.length) continue
    const sorted = [...group].sort((a, b) => b.mass - a.mass)
    anchorIds.add(sorted[0].id)
    const [cx, cy, cz] = DOMAIN_CENTER[domain]
    positions.set(sorted[0].id, [cx, cy, cz])

    for (let i = 1; i < sorted.length; i++) {
      const s = sorted[i]
      const layer = Math.ceil(i / 5)
      const r = 0.6 + layer * 0.6 + seeded(s.id, 0) * 0.4
      const a = seeded(s.id, 1) * Math.PI * 2
      const dy = (seeded(s.id, 2) - 0.5) * 1.2
      positions.set(s.id, [cx + Math.cos(a) * r, cy + dy, cz + Math.sin(a) * r])
    }
  }
  return { positions, anchorIds }
}

// ── Planet surface shader ─────────────────────────
const planetVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const planetFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uColor2;
  uniform float uTime;
  uniform float uSeed;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  // Simplex-like noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
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
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    // Lighting — strong directional for clear light/dark side
    vec3 lightDir = normalize(vec3(0.5, 0.7, 0.6));
    float NdotL = dot(vNormal, lightDir);
    float diffuse = max(NdotL, 0.0);
    // Soften shadow edge
    float wrap = max(NdotL * 0.5 + 0.5, 0.0);
    float light = 0.08 + diffuse * 0.6 + wrap * 0.25;

    // Multi-octave surface noise — visible terrain bands
    vec3 nc = vNormal * 3.0 + uSeed * 12.0;
    float n1 = snoise(nc) * 0.5 + 0.5;
    float n2 = snoise(nc * 2.5 + 3.0) * 0.5 + 0.5;
    float n3 = snoise(nc * 6.0 + 7.0) * 0.5 + 0.5;
    // Layered: big continent shapes + medium bands + fine detail
    float pattern = n1 * 0.5 + n2 * 0.35 + n3 * 0.15;

    // Sharpen contrast for visible surface features
    pattern = smoothstep(0.25, 0.75, pattern);

    // Three-color gradient: dark → mid → bright across surface
    vec3 darkColor = uColor2 * 0.5;
    vec3 midColor = mix(uColor, uColor2, 0.4);
    vec3 brightColor = uColor * 1.3;
    vec3 surfaceColor = pattern < 0.5
      ? mix(darkColor, midColor, pattern * 2.0)
      : mix(midColor, brightColor, (pattern - 0.5) * 2.0);

    // Specular highlight — shiny spot on light side
    vec3 viewDir = normalize(-vPosition);
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(vNormal, halfDir), 0.0), 30.0);

    // Rim / atmosphere glow at edges
    float rim = 1.0 - max(dot(vNormal, viewDir), 0.0);
    rim = pow(rim, 2.0);
    vec3 rimColor = uColor * 2.0;

    // Terminator line glow (subtle light at day/night boundary)
    float terminator = 1.0 - abs(NdotL);
    terminator = pow(terminator, 8.0) * 0.15;

    vec3 finalColor = surfaceColor * light
      + vec3(1.0) * spec * 0.25
      + rimColor * rim * 0.02
      + uColor * terminator;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

// ── Atmosphere shader ─────────────────────────────
const atmosphereVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const atmosphereFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;

  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 viewDir = normalize(-vPosition);
    float rim = 1.0 - max(dot(vNormal, viewDir), 0.0);
    // Layered glow: soft wide + sharp edge
    float softGlow = pow(rim, 2.0) * 0.03;
    float sharpGlow = pow(rim, 5.0) * 0.06;
    float glow = (softGlow + sharpGlow) * uIntensity;
    gl_FragColor = vec4(uColor, glow * 0.04);
  }
`

// ── Secondary color per domain ────────────────────
const COLORS2: Record<Domain, string> = {
  X: '#4a8fad',  // deeper blue
  Y: '#c4b87a',  // deeper gold
  Z: '#d08040',  // deeper orange
}

// ── Planet mesh ───────────────────────────────────
function PlanetMesh({
  star,
  pos,
  isAnchor,
}: {
  star: Star
  pos: [number, number, number]
  isAnchor: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)
  const planetRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  const color = useMemo(() => new THREE.Color(COLORS[star.domain]), [star.domain])
  const color2 = useMemo(() => new THREE.Color(COLORS2[star.domain]), [star.domain])

  const coreSize = isAnchor
    ? 0.25 + star.mass * 0.045
    : 0.12 + star.mass * 0.025
  const seed = seeded(star.id, 5)

  // Planet surface material
  const planetMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: planetVertexShader,
    fragmentShader: planetFragmentShader,
    uniforms: {
      uColor: { value: color },
      uColor2: { value: color2 },
      uTime: { value: 0 },
      uSeed: { value: seed },
    },
  }), [color, color2, seed])

  // Atmosphere material
  const atmoMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: atmosphereVertexShader,
    fragmentShader: atmosphereFragmentShader,
    uniforms: {
      uColor: { value: color },
      uIntensity: { value: isAnchor ? 1.2 : 0.8 },
    },
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), [color, isAnchor])

  // Glow texture for outer halo
  const glowTex = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    g.addColorStop(0, 'rgba(255,255,255,0.6)')
    g.addColorStop(0.2, 'rgba(255,255,255,0.2)')
    g.addColorStop(0.5, 'rgba(255,255,255,0.04)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 64, 64)
    return new THREE.CanvasTexture(canvas)
  }, [])

  // Birth animation
  const birthRef = useRef(0)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  const driftSeed = useRef(seeded(star.id, 3) * Math.PI * 2)
  const rotSpeed = 0.08 + seed * 0.12 // each planet rotates differently
  // tilt axis
  const tiltAxis = useMemo(() => {
    const tilt = (seeded(star.id, 6) - 0.5) * 0.5
    return new THREE.Euler(tilt, 0, tilt * 0.5)
  }, [star.id])

  useFrame((state, delta) => {
    if (!groupRef.current) return

    // Birth scale-in
    if (birthRef.current < 1) {
      birthRef.current = Math.min(1, birthRef.current + delta * 1.5)
    }

    // Gentle pulse
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.0 + star.mass * 2) * 0.025
    groupRef.current.scale.setScalar(birthRef.current * pulse)

    // Self-rotation
    if (planetRef.current) {
      planetRef.current.rotation.y += delta * rotSpeed
    }

    // Orbital drift
    if (!isAnchor) {
      driftSeed.current += delta * 0.12
      const dx = Math.sin(driftSeed.current) * 0.1
      const dy = Math.cos(driftSeed.current * 0.7) * 0.07
      groupRef.current.position.x = pos[0] + dx
      groupRef.current.position.y = pos[1] + dy
    }

    // Update shader time
    planetMaterial.uniforms.uTime.value = state.clock.elapsedTime
  })

  if (!visible) return null

  const glowScale = coreSize * (isAnchor ? 12 : 7)

  return (
    <group ref={groupRef} position={pos} rotation={tiltAxis}>
      {/* Planet core with surface shader */}
      <mesh
        ref={planetRef}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
        onPointerOut={() => setHovered(false)}
        material={planetMaterial}
      >
        <sphereGeometry args={[coreSize, 32, 32]} />
      </mesh>

      {/* Atmosphere rim */}
      <mesh material={atmoMaterial}>
        <sphereGeometry args={[coreSize * 1.25, 32, 32]} />
      </mesh>

      {/* Outer glow sprite */}
      <sprite scale={[glowScale, glowScale, 1]}>
        <spriteMaterial
          map={glowTex}
          color={color}
          transparent
          opacity={isAnchor ? 0.2 : 0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>

      {/* Hover tooltip */}
      {hovered && (
        <Html center style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(6,8,13,0.92)',
            border: '0.5px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            padding: '5px 10px',
            color: 'rgba(255,255,255,0.7)',
            fontSize: 11,
            whiteSpace: 'nowrap',
            transform: 'translateY(-28px)',
            backdropFilter: 'blur(8px)',
          }}>
            {star.text}
          </div>
        </Html>
      )}
    </group>
  )
}

// ── Gravity Lines ─────────────────────────────────
function GravityLines({ stars, positions, anchorIds }: {
  stars: Star[]
  positions: Map<string, [number, number, number]>
  anchorIds: Set<string>
}) {
  const lineData = useMemo(() => {
    const lines: { from: [number, number, number]; to: [number, number, number]; domain: Domain }[] = []
    for (const star of stars) {
      if (anchorIds.has(star.id) || !star.orbitParent) continue
      const from = positions.get(star.id)
      const to = positions.get(star.orbitParent)
      if (from && to) lines.push({ from, to, domain: star.domain })
    }
    return lines
  }, [stars, positions, anchorIds])

  return (
    <>
      {lineData.map((line, i) => (
        <Line
          key={i}
          points={[line.from, line.to]}
          color={COLORS[line.domain]}
          transparent
          opacity={0.035}
          lineWidth={0.5}
        />
      ))}
    </>
  )
}

// ── Nebula particles ──────────────────────────────
function NebulaParticles({ starCount }: { starCount: number }) {
  const ref = useRef<THREE.Points>(null)

  const { positions, colors } = useMemo(() => {
    const count = 600
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const dc = {
      X: new THREE.Color('#7ec8e3'),
      Y: new THREE.Color('#ddd8b0'),
      Z: new THREE.Color('#f0a870'),
    }
    const domains: Domain[] = ['X', 'Y', 'Z']

    for (let i = 0; i < count; i++) {
      const d = domains[i % 3]
      const [cx, cy, cz] = DOMAIN_CENTER[d]
      pos[i * 3] = cx + (Math.random() - 0.5) * 14
      pos[i * 3 + 1] = cy + (Math.random() - 0.5) * 10
      pos[i * 3 + 2] = cz + (Math.random() - 0.5) * 14
      const c = dc[d]
      col[i * 3] = c.r
      col[i * 3 + 1] = c.g
      col[i * 3 + 2] = c.b
    }
    return { positions: pos, colors: col }
  }, [])

  const opacity = Math.min(0.5, 0.15 + starCount * 0.02)

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.008
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.005) * 0.02
    }
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        vertexColors
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

// ── Flying star animation ─────────────────────────
function FlyingStars() {
  const flying = useStarStore(s => s.flying)
  return (
    <>
      {flying.map(f => <FlyingMesh key={f.id} domain={f.domain} />)}
    </>
  )
}

function FlyingMesh({ domain }: { domain: Domain }) {
  const ref = useRef<THREE.Mesh>(null)
  const trailRef = useRef<THREE.Mesh>(null)
  const progressRef = useRef(0)
  const color = useMemo(() => new THREE.Color(COLORS[domain]), [domain])
  const [cx, cy, cz] = DOMAIN_CENTER[domain]

  const startPos = useMemo(() => new THREE.Vector3(0, -4, 2), [])
  const endPos = useMemo(() => new THREE.Vector3(
    cx + (Math.random() - 0.5) * 2,
    cy + (Math.random() - 0.5) * 1,
    cz + (Math.random() - 0.5) * 2,
  ), [cx, cy, cz])

  useFrame((_, delta) => {
    if (!ref.current) return
    progressRef.current = Math.min(1, progressRef.current + delta * 1.0)
    const t = progressRef.current
    const ease = 1 - Math.pow(1 - t, 3)

    ref.current.position.lerpVectors(startPos, endPos, ease)
    const mat = ref.current.material as THREE.MeshBasicMaterial
    mat.opacity = 1 - t * 0.7
    ref.current.scale.setScalar(1 - t * 0.5)

    // Trail
    if (trailRef.current) {
      trailRef.current.position.lerpVectors(startPos, endPos, Math.max(0, ease - 0.08))
      const tMat = trailRef.current.material as THREE.MeshBasicMaterial
      tMat.opacity = (1 - t) * 0.3
    }
  })

  return (
    <>
      <mesh ref={ref} position={startPos}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={1} />
      </mesh>
      <mesh ref={trailRef} position={startPos}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>
    </>
  )
}

// ── Scene ─────────────────────────────────────────
function Scene() {
  const stars = useStarStore(s => s.stars)
  const { positions, anchorIds } = useMemo(() => computeLayout(stars), [stars])

  return (
    <>
      {/* Directional light for planet shading */}
      <directionalLight position={[5, 8, 5]} intensity={0.6} color="#ffffff" />
      <ambientLight intensity={0.08} />

      <NebulaParticles starCount={stars.length} />
      <GravityLines stars={stars} positions={positions} anchorIds={anchorIds} />

      {stars.map(star => {
        const p = positions.get(star.id)
        if (!p) return null
        return (
          <PlanetMesh
            key={star.id}
            star={star}
            pos={p}
            isAnchor={anchorIds.has(star.id)}
          />
        )
      })}

      <FlyingStars />

      <OrbitControls
        enablePan={false}
        enableZoom
        enableRotate
        autoRotate
        autoRotateSpeed={0.2}
        minDistance={4}
        maxDistance={22}
        zoomSpeed={0.5}
        dampingFactor={0.05}
        enableDamping
      />
    </>
  )
}

// ── StarField (exported) ──────────────────────────
export function StarField() {
  const stars = useStarStore(s => s.stars)

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 2, 12], fov: 45, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
        style={{ background: 'transparent' }}
      >
        <Scene />
      </Canvas>

      {stars.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-white/10 text-xs">
            아래에 던지면 별이 됩니다
          </p>
        </div>
      )}
    </div>
  )
}
