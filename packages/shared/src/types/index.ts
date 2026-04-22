/**
 * @locus/shared — 공유 타입 정의
 *
 * LŌCUS 엔진 분류 체계 — 오온(五蘊) 기반
 *
 * 5 Layers (사용자에게 보이지 않음):
 * - body(색)    : 몸, 감각, 물리적 행동
 * - feeling(수)  : 감정, 에너지, 기분
 * - thought(상)  : 생각, 판단, 인식
 * - action(행)   : 습관, 의지, 실행
 * - awareness(식): 자각, 패턴 인식, 깨달음
 *
 * Spectrum: internal(내면) ↔ external(바깥)
 * 사용자가 보는 것: 색의 그라데이션만
 */

// ── Legacy Domain (하위 호환) ─────────────
export type Domain = 'X' | 'Y' | 'Z'

export const DOMAIN_LABELS: Record<Domain, string> = {
  X: '기반',
  Y: '성과',
  Z: '관계',
} as const

export const DOMAIN_COLORS: Record<Domain, string> = {
  X: '#7ec8e3',
  Y: '#ddd8b0',
  Z: '#f0a870',
} as const

// ── Layers (오온) ─────────────────────────
export interface Layers {
  body: number       // 색(色) 0.0~1.0 — 몸, 감각, 물리적 행동
  feeling: number    // 수(受) 0.0~1.0 — 감정, 에너지, 기분
  thought: number    // 상(想) 0.0~1.0 — 생각, 판단, 인식
  action: number     // 행(行) 0.0~1.0 — 습관, 의지, 실행
  awareness: number  // 식(識) 0.0~1.0 — 자각, 패턴 인식
}

export interface Spectrum {
  internal: number   // 0.0~1.0 — 내면의 무게
  external: number   // 0.0~1.0 — 바깥의 무게 (internal + external = 1.0)
}

// ── Weight (새 구조) ─────────────────────
export type Nature = 'unresolved' | 'recurring' | 'onetime'

export interface Weight {
  // 오온 레이어 (비율, 합산 1.0)
  layers: Layers
  // 내부/외부 스펙트럼
  spectrum: Spectrum
  // 무게감 (0.0~1.0)
  weight: number
  // 성격
  nature: Nature[]

  // Legacy 호환
  domain?: Domain
  intensity?: number
  direction?: 'in' | 'out'
}

// ── Layer → Color 매핑 ────────────────────
// 각 레이어의 대표 색상 (그라데이션 혼합용)
export const LAYER_COLORS: Record<keyof Layers, string> = {
  body: '#7ec8e3',       // 차가운 파랑 — 몸
  feeling: '#f0a870',    // 따뜻한 주황 — 감정
  thought: '#ddd8b0',    // 밝은 크림 — 생각
  action: '#a8d8a0',     // 부드러운 초록 — 행동
  awareness: '#c4b0e8',  // 연한 보라 — 자각
} as const

// ── 레이어 비율 → 혼합 색상 계산 ──────────
export function layersToColor(layers: Layers): string {
  const colors: Record<keyof Layers, [number, number, number]> = {
    body: [126, 200, 227],
    feeling: [240, 168, 112],
    thought: [221, 216, 176],
    action: [168, 216, 160],
    awareness: [196, 176, 232],
  }

  let r = 0, g = 0, b = 0
  const keys = Object.keys(layers) as (keyof Layers)[]
  keys.forEach(key => {
    const ratio = layers[key]
    const [cr, cg, cb] = colors[key]
    r += cr * ratio
    g += cg * ratio
    b += cb * ratio
  })

  // spectrum으로 따뜻함/차가움 조정은 호출 측에서
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
}

// ── Star ────────────────────────────────
export interface Star {
  id: string
  text: string
  question?: string
  domain: Domain              // Legacy 호환
  weight?: Weight
  intensity: number
  mass: number
  createdAt: string
  resolved: boolean
  repeatCount: number
  isAnchor: boolean
  orbitParent: string | null
}

// ── Gravity ─────────────────────────────
export interface GravityField {
  userId: string
  stars: Star[]
  defaultGravity: Partial<Record<Domain, number>>
  stabilityRange: Partial<Record<Domain, [number, number]>>
  recurringMass: Partial<Record<Domain, number>>
  updatedAt: string
}

// ── Signal (제안) ────────────────────────
export type SignalType =
  | 'schedule_timing'
  | 'energy_warning'
  | 'absence'
  | 'pattern'
  | 'shift'

export interface Signal {
  id: string
  type: SignalType
  message: string
  domain?: Domain
  createdAt: string
  seen: boolean
}

// ── User ────────────────────────────────
export interface User {
  id: string
  createdAt: string
  gravityUnlocked: boolean
  signalLevel: 0 | 1 | 2 | 3 | 4 | 5
}

// ── Onboarding ───────────────────────────
export interface OnboardingAnswer {
  questionId: string
  choiceIndex: number
  weight: Partial<Weight>
}
