'use client'

import { useRef, useMemo, useState, useEffect, useCallback } from 'react'
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
  anchorPos,
  onGroupRef,
  isHeaviestAnchor,
}: {
  star: Star
  pos: [number, number, number]
  isAnchor: boolean
  anchorPos?: [number, number, number]
  onGroupRef?: (id: string, ref: THREE.Group | null) => void
  isHeaviestAnchor?: boolean  // 전체에서 가장 무거운 항성
}) {
  const groupRef = useRef<THREE.Group>(null)

  // Register group ref for gravity line tracking
  useEffect(() => {
    if (onGroupRef) onGroupRef(star.id, groupRef.current)
    return () => { if (onGroupRef) onGroupRef(star.id, null) }
  }, [star.id, onGroupRef])
  const planetRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  const color = useMemo(() => new THREE.Color(COLORS[star.domain]), [star.domain])
  const color2 = useMemo(() => new THREE.Color(COLORS2[star.domain]), [star.domain])

  // 3) 시간의 층위 — 나이에 따른 선명도
  const ageFactor = useMemo(() => {
    const ageMs = Date.now() - new Date(star.createdAt).getTime()
    const ageHours = ageMs / (1000 * 60 * 60)
    if (ageHours < 1) return 1.0          // 방금: 가장 선명
    if (ageHours < 24) return 0.9         // 오늘: 거의 선명
    if (ageHours < 24 * 7) return 0.7     // 이번 주: 살짝 희미
    if (ageHours < 24 * 14) return 0.5    // 2주: 희미
    if (ageHours < 24 * 30) return 0.35   // 한 달: 꽤 희미
    return 0.2                             // 오래됨: 성운에 거의 흡수
  }, [star.createdAt])

  const baseCoreSize = isAnchor
    ? 0.25 + star.mass * 0.045
    : 0.12 + star.mass * 0.025
  // 오래된 별은 약간 작아짐
  const coreSize = baseCoreSize * (0.7 + ageFactor * 0.3)
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

  // Atmosphere material — ageFactor dims older stars
  const atmoMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: atmosphereVertexShader,
    fragmentShader: atmosphereFragmentShader,
    uniforms: {
      uColor: { value: color },
      uIntensity: { value: (isAnchor ? 1.2 : 0.8) * ageFactor },
    },
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), [color, isAnchor, ageFactor])

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

  const rotSpeed = 0.08 + seed * 0.12

  const tiltAxis = useMemo(() => {
    const tilt = (seeded(star.id, 6) - 0.5) * 0.5
    return new THREE.Euler(tilt, 0, tilt * 0.5)
  }, [star.id])

  // Orbit parameters (deterministic per star)
  const orbitAngleRef = useRef(seeded(star.id, 3) * Math.PI * 2)
  const orbitRadius = useMemo(() => {
    if (isAnchor || !anchorPos) return 0
    const dx = pos[0] - anchorPos[0]
    const dy = pos[1] - anchorPos[1]
    const dz = pos[2] - anchorPos[2]
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }, [pos, anchorPos, isAnchor])
  // Lighter planets orbit faster, heavier ones slower
  const orbitSpeed = useMemo(() => {
    if (isAnchor) return 0
    return 0.15 + (1 / (star.mass + 1)) * 0.2
  }, [isAnchor, star.mass])
  // Orbit tilt — each planet orbits on a slightly tilted plane
  const orbitTilt = useMemo(() => (seeded(star.id, 7) - 0.5) * 0.6, [star.id])

  useFrame((state, delta) => {
    if (!groupRef.current) return

    // Birth scale-in
    if (birthRef.current < 1) {
      birthRef.current = Math.min(1, birthRef.current + delta * 1.5)
    }

    // Pulse — 가장 무거운 항성은 느리고 깊은 심장박동
    let pulse: number
    if (isHeaviestAnchor) {
      // 느린 맥동: 심장처럼 쿵... 쿵... (두 번 뛰는 패턴)
      const t = state.clock.elapsedTime * 0.8
      const beat1 = Math.pow(Math.max(0, Math.sin(t * Math.PI)), 4)
      const beat2 = Math.pow(Math.max(0, Math.sin((t + 0.15) * Math.PI)), 6) * 0.5
      pulse = 1 + (beat1 + beat2) * 0.06
    } else {
      pulse = 1 + Math.sin(state.clock.elapsedTime * 1.0 + star.mass * 2) * 0.025
    }
    groupRef.current.scale.setScalar(birthRef.current * pulse)

    // Self-rotation (자전)
    if (planetRef.current) {
      planetRef.current.rotation.y += delta * rotSpeed
    }

    // Orbital revolution (공전) — non-anchors orbit around anchor
    if (!isAnchor && anchorPos && orbitRadius > 0) {
      orbitAngleRef.current += delta * orbitSpeed
      const angle = orbitAngleRef.current
      const r = orbitRadius

      groupRef.current.position.x = anchorPos[0] + Math.cos(angle) * r
      groupRef.current.position.y = anchorPos[1] + Math.sin(angle * 0.4) * r * Math.sin(orbitTilt)
      groupRef.current.position.z = anchorPos[2] + Math.sin(angle) * r
    }

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

      {/* Outer glow sprite — fades with age */}
      <sprite scale={[glowScale, glowScale, 1]}>
        <spriteMaterial
          map={glowTex}
          color={color}
          transparent
          opacity={(isAnchor ? 0.2 : 0.08) * ageFactor}
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
            padding: '6px 10px',
            color: 'rgba(255,255,255,0.7)',
            fontSize: 11,
            whiteSpace: 'nowrap',
            transform: 'translateY(-36px)',
            backdropFilter: 'blur(8px)',
            textAlign: 'center',
          }}>
            {star.question && (
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, marginBottom: 3 }}>
                {star.question}
              </div>
            )}
            <div>{star.text}</div>
          </div>
        </Html>
      )}
    </group>
  )
}

// ── Live Gravity Line (follows orbiting planet) ───
function LiveGravityLine({ starId, anchorId, domain, refs }: {
  starId: string
  anchorId: string
  domain: Domain
  refs: React.MutableRefObject<Map<string, THREE.Group>>
}) {
  const lineRef = useRef<THREE.BufferGeometry>(null)
  const posArray = useMemo(() => new Float32Array(6), [])

  useFrame(() => {
    const starGroup = refs.current.get(starId)
    const anchorGroup = refs.current.get(anchorId)
    if (!starGroup || !anchorGroup || !lineRef.current) return

    const sp = starGroup.position
    const ap = anchorGroup.position
    posArray[0] = sp.x; posArray[1] = sp.y; posArray[2] = sp.z
    posArray[3] = ap.x; posArray[4] = ap.y; posArray[5] = ap.z

    lineRef.current.setAttribute('position', new THREE.BufferAttribute(posArray, 3))
    lineRef.current.attributes.position.needsUpdate = true
  })

  return (
    <line>
      <bufferGeometry ref={lineRef}>
        <bufferAttribute attach="attributes-position" args={[posArray, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        color={COLORS[domain]}
        transparent
        opacity={0.035}
        blending={THREE.AdditiveBlending}
      />
    </line>
  )
}

// ── Gravity Lines container ───────────────────────
function GravityLines({ stars, anchorIds, planetRefs }: {
  stars: Star[]
  anchorIds: Set<string>
  planetRefs: React.MutableRefObject<Map<string, THREE.Group>>
}) {
  const links = useMemo(() => {
    return stars
      .filter(s => !anchorIds.has(s.id) && s.orbitParent)
      .map(s => ({ starId: s.id, anchorId: s.orbitParent!, domain: s.domain }))
  }, [stars, anchorIds])

  return (
    <>
      {links.map(link => (
        <LiveGravityLine
          key={link.starId}
          starId={link.starId}
          anchorId={link.anchorId}
          domain={link.domain}
          refs={planetRefs}
        />
      ))}
    </>
  )
}

// ── Star Candy — X/Y/Z 균형 형상 ──────────────────
// 사용자에게 "Star Candy"라는 이름은 보이지 않는다.
// 성운 중심에 은은한 삼각형이 떠 있고, 각 꼭짓점이
// X/Y/Z 누적 질량에 비례해 늘어난다.
// ── Nebula Clouds — 도메인별 빛 구름 ──────────────
// 삼각형 대신, 각 도메인 영역에 거대한 빛 구름이 피어남.
// 많이 던진 영역은 크고 밝게, 안 던진 영역은 작고 어둡게.
// 라벨 없이 빛의 온도만으로 균형/불균형을 느끼게 한다.
function NebulaClouds({ stars }: { stars: Star[] }) {
  const domainMass = useMemo(() => {
    const w = { X: 0, Y: 0, Z: 0 }
    stars.forEach(s => { w[s.domain] += s.mass })
    return w
  }, [stars])

  const maxMass = Math.max(domainMass.X, domainMass.Y, domainMass.Z, 1)

  // 글로우 텍스처
  const glowTex = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')!
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    g.addColorStop(0, 'rgba(255,255,255,0.4)')
    g.addColorStop(0.3, 'rgba(255,255,255,0.12)')
    g.addColorStop(0.6, 'rgba(255,255,255,0.03)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 128)
    return new THREE.CanvasTexture(canvas)
  }, [])

  return (
    <>
      {(['X', 'Y', 'Z'] as Domain[]).map(d => {
        const ratio = domainMass[d] / maxMass
        const [cx, cy, cz] = DOMAIN_CENTER[d]
        // 크기: 기본 1 + mass 비례 최대 5
        const size = 1 + ratio * 4
        // 밝기: mass 없으면 거의 안 보임
        const opacity = domainMass[d] === 0
          ? 0.01
          : 0.03 + ratio * 0.1

        return (
          <sprite key={d} position={[cx, cy, cz]} scale={[size, size, 1]}>
            <spriteMaterial
              map={glowTex}
              color={COLORS[d]}
              transparent
              opacity={opacity}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </sprite>
        )
      })}
    </>
  )
}

// ── Nebula particles ──────────────────────────────
// 도메인별 누적 mass에 비례해 해당 영역 성운이 밝아짐
function NebulaParticles({ stars }: { stars: Star[] }) {
  const ref = useRef<THREE.Points>(null)

  // 도메인별 절대 mass + 비율
  const domainMass = useMemo(() => {
    const w = { X: 0, Y: 0, Z: 0 }
    stars.forEach(s => { w[s.domain] += s.mass })
    return w
  }, [stars])

  const totalMass = domainMass.X + domainMass.Y + domainMass.Z

  const { positions, colors } = useMemo(() => {
    const dc = {
      X: new THREE.Color('#7ec8e3'),
      Y: new THREE.Color('#ddd8b0'),
      Z: new THREE.Color('#f0a870'),
    }
    const domains: Domain[] = ['X', 'Y', 'Z']
    const maxMass = Math.max(domainMass.X, domainMass.Y, domainMass.Z, 1)

    // 파티클 수를 도메인별 mass에 비례 배분
    // 기본 30개 + mass 비례 최대 250개 per domain
    const BASE = 30
    const perDomain = domains.map(d => {
      const ratio = domainMass[d] / maxMass
      return BASE + Math.round(ratio * 250)
    })
    const total = perDomain[0] + perDomain[1] + perDomain[2]

    const pos = new Float32Array(total * 3)
    const col = new Float32Array(total * 3)
    let idx = 0

    for (let di = 0; di < 3; di++) {
      const d = domains[di]
      const count = perDomain[di]
      const ratio = domainMass[d] / maxMass
      const [cx, cy, cz] = DOMAIN_CENTER[d]

      // 많이 던진 영역 = 밀집 + 밝음, 안 던진 영역 = 넓게 퍼짐 + 어두움
      const spread = 14 - ratio * 8
      const brightness = 0.2 + ratio * 0.8
      const c = dc[d]

      for (let i = 0; i < count; i++) {
        pos[idx * 3] = cx + (Math.random() - 0.5) * spread
        pos[idx * 3 + 1] = cy + (Math.random() - 0.5) * (spread * 0.6)
        pos[idx * 3 + 2] = cz + (Math.random() - 0.5) * spread
        col[idx * 3] = c.r * brightness
        col[idx * 3 + 1] = c.g * brightness
        col[idx * 3 + 2] = c.b * brightness
        idx++
      }
    }
    return { positions: pos, colors: col }
  }, [domainMass])

  const opacity = Math.min(0.5, 0.12 + stars.length * 0.025)

  // 던질 때 성운 출렁임
  const shakeRef = useNebulaShake()

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.008
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.005) * 0.02

      // 출렁임 감쇠
      if (shakeRef.current > 0.01) {
        shakeRef.current *= 0.97
        const s = shakeRef.current
        ref.current.position.x = Math.sin(state.clock.elapsedTime * 8) * s * 0.15
        ref.current.position.y = Math.cos(state.clock.elapsedTime * 6) * s * 0.1
      } else {
        ref.current.position.x = 0
        ref.current.position.y = 0
      }
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

// ── B) Throw Ripple — 던질 때 공간 전체가 반응 ─────
// 던지면 해당 도메인 중심에서 빛 파동이 퍼져나간다.
// 무거운 걸 던지면 더 크고 느리게, 가벼우면 작고 빠르게.
function ThrowRipple() {
  const lastDomain = useStarStore(s => s.lastThrowDomain)
  const lastTime = useStarStore(s => s.lastThrowTime)
  const ringRef = useRef<THREE.Mesh>(null)
  const progressRef = useRef(1) // 1 = idle

  // 새 던지기 감지
  const lastTimeRef = useRef(0)
  useEffect(() => {
    if (lastTime > lastTimeRef.current && lastDomain) {
      lastTimeRef.current = lastTime
      progressRef.current = 0 // 애니메이션 시작
    }
  }, [lastTime, lastDomain])

  const color = useMemo(
    () => new THREE.Color(lastDomain ? COLORS[lastDomain] : '#ffffff'),
    [lastDomain],
  )

  useFrame((_, delta) => {
    if (!ringRef.current || progressRef.current >= 1) {
      if (ringRef.current) ringRef.current.visible = false
      return
    }

    progressRef.current = Math.min(1, progressRef.current + delta * 0.6)
    const t = progressRef.current
    const ease = 1 - Math.pow(1 - t, 2)

    ringRef.current.visible = true
    ringRef.current.scale.setScalar(0.5 + ease * 6)
    const mat = ringRef.current.material as THREE.MeshBasicMaterial
    mat.opacity = (1 - t) * 0.15
    mat.color = color

    if (lastDomain) {
      const [cx, cy, cz] = DOMAIN_CENTER[lastDomain]
      ringRef.current.position.set(cx, cy, cz)
    }
  })

  return (
    <mesh ref={ringRef} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.8, 1.0, 64]} />
      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={0}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  )
}

// ── Nebula Shockwave — 성운 파티클이 흔들림 ─────────
// ThrowRipple과 함께, 던질 때 성운 전체가 미세하게 출렁인다.
function useNebulaShake() {
  const lastTime = useStarStore(s => s.lastThrowTime)
  const shakeRef = useRef(0)
  const lastTimeRef = useRef(0)

  useEffect(() => {
    if (lastTime > lastTimeRef.current) {
      lastTimeRef.current = lastTime
      shakeRef.current = 1.0
    }
  }, [lastTime])

  return shakeRef
}

// ── C) Mass Signature — 조감 뷰에서 보이는 나의 형상 ──
// 줌아웃하면(카메라 거리 15+) 성운 전체를 감싸는
// X/Y/Z 에너지 흐름선이 나타난다. 무게 중심이 기울어진
// 방향으로 흐름이 쏠려 있어서 "내 형상"이 드러남.
function MassSignature({ stars }: { stars: Star[] }) {
  const groupRef = useRef<THREE.Group>(null)

  const { massX, massY, massZ, total } = useMemo(() => {
    let mx = 0, my = 0, mz = 0
    stars.forEach(s => {
      if (s.domain === 'X') mx += s.mass
      else if (s.domain === 'Y') my += s.mass
      else mz += s.mass
    })
    return { massX: mx, massY: my, massZ: mz, total: mx + my + mz }
  }, [stars])

  // 에너지 흐름 곡선 — 각 도메인 방향으로 뻗는 선
  const curves = useMemo(() => {
    if (total === 0) return []
    const maxM = Math.max(massX, massY, massZ, 1)

    return (['X', 'Y', 'Z'] as Domain[]).map(d => {
      const m = d === 'X' ? massX : d === 'Y' ? massY : massZ
      const ratio = m / maxM
      const [cx, cy, cz] = DOMAIN_CENTER[d]
      const reach = 0.5 + ratio * 1.5 // 무거울수록 멀리 뻗음

      // 곡선: 중심 → 도메인 방향으로 3개 제어점
      const points: [number, number, number][] = []
      const steps = 20
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const ease = t * t * (3 - 2 * t) // smoothstep
        points.push([
          cx * ease * reach,
          cy * ease * reach,
          cz * ease * reach,
        ])
      }

      return { domain: d, points, ratio }
    })
  }, [massX, massY, massZ, total])

  // 투명도 — 줌아웃할수록 선명, 가까이서는 안 보임
  const opacityRef = useRef(0)

  useFrame(({ camera }) => {
    if (!groupRef.current) return
    const dist = camera.position.length()
    // 15 이상에서 보이기 시작, 20에서 최대
    const targetOpacity = dist > 15 ? Math.min(1, (dist - 15) / 5) : 0
    opacityRef.current += (targetOpacity - opacityRef.current) * 0.05
    groupRef.current.visible = opacityRef.current > 0.01

    // 느린 회전
    groupRef.current.rotation.y += 0.001
  })

  if (total === 0) return null

  return (
    <group ref={groupRef} visible={false}>
      {curves.map(({ domain, points, ratio }) => (
        <Line
          key={domain}
          points={points}
          color={COLORS[domain]}
          transparent
          opacity={ratio * 0.3 * opacityRef.current}
          lineWidth={1 + ratio * 2}
        />
      ))}

      {/* 중심점 — 무게 중심 위치 */}
      <mesh position={[
        (DOMAIN_CENTER.X[0] * massX + DOMAIN_CENTER.Y[0] * massY + DOMAIN_CENTER.Z[0] * massZ) / (total || 1) * 0.5,
        (DOMAIN_CENTER.X[1] * massX + DOMAIN_CENTER.Y[1] * massY + DOMAIN_CENTER.Z[1] * massZ) / (total || 1) * 0.5,
        (DOMAIN_CENTER.X[2] * massX + DOMAIN_CENTER.Y[2] * massY + DOMAIN_CENTER.Z[2] * massZ) / (total || 1) * 0.5,
      ]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.2 * opacityRef.current}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
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

  // 전체에서 가장 무거운 별 (근본 고민)
  const heaviestStarId = useMemo(() => {
    if (stars.length === 0) return null
    return stars.reduce((a, b) => a.mass > b.mass ? a : b).id
  }, [stars])

  // Shared refs for gravity line tracking
  const planetRefs = useRef<Map<string, THREE.Group>>(new Map())
  const handleGroupRef = useCallback((id: string, ref: THREE.Group | null) => {
    if (ref) planetRefs.current.set(id, ref)
    else planetRefs.current.delete(id)
  }, [])

  return (
    <>
      <directionalLight position={[5, 8, 5]} intensity={0.6} color="#ffffff" />
      <ambientLight intensity={0.08} />

      <NebulaParticles stars={stars} />
      <NebulaClouds stars={stars} />
      <GravityLines stars={stars} anchorIds={anchorIds} planetRefs={planetRefs} />

      {stars.map(star => {
        const p = positions.get(star.id)
        if (!p) return null
        const anchor = star.orbitParent ? positions.get(star.orbitParent) : undefined
        return (
          <PlanetMesh
            key={star.id}
            star={star}
            pos={p}
            isAnchor={anchorIds.has(star.id)}
            anchorPos={anchor}
            onGroupRef={handleGroupRef}
            isHeaviestAnchor={star.id === heaviestStarId}
          />
        )
      })}

      <FlyingStars />
      <ThrowRipple />
      <MassSignature stars={stars} />

      <CameraGravity stars={stars} />

      <OrbitControls
        enablePan={false}
        enableZoom
        enableRotate
        autoRotate
        autoRotateSpeed={0.2}
        minDistance={4}
        maxDistance={30}
        zoomSpeed={0.5}
        dampingFactor={0.05}
        enableDamping
      />
    </>
  )
}

// ── Camera Gravity — 가장 무거운 영역으로 시선이 끌림 ──
function CameraGravity({ stars }: { stars: Star[] }) {
  const heaviestCenter = useMemo(() => {
    if (stars.length === 0) return new THREE.Vector3(0, 1, -1)

    const mass: Record<Domain, number> = { X: 0, Y: 0, Z: 0 }
    stars.forEach(s => { mass[s.domain] += s.mass })
    const total = mass.X + mass.Y + mass.Z
    if (total === 0) return new THREE.Vector3(0, 1, -1)

    // 가중 평균 위치
    const wx = mass.X / total
    const wy = mass.Y / total
    const wz = mass.Z / total

    const [xx, xy, xz] = DOMAIN_CENTER.X
    const [yx, yy, yz] = DOMAIN_CENTER.Y
    const [zx, zy, zz] = DOMAIN_CENTER.Z

    return new THREE.Vector3(
      xx * wx + yx * wy + zx * wz,
      xy * wx + yy * wy + zy * wz,
      xz * wx + yz * wy + zz * wz,
    )
  }, [stars])

  const targetRef = useRef(new THREE.Vector3(0, 1, -1))

  useFrame(({ camera }) => {
    // 부드럽게 이동 (lerp)
    targetRef.current.lerp(heaviestCenter, 0.005)

    // OrbitControls가 있으면 그쪽 target은 건드리지 않고
    // 카메라 lookAt 방향만 살짝 영향
    const offset = targetRef.current.clone().sub(new THREE.Vector3(0, 1, -1)).multiplyScalar(0.3)
    camera.position.x += (offset.x - camera.position.x * 0.01) * 0.002
  })

  return null
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
