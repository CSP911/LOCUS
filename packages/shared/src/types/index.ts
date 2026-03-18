/**
 * @locus/shared — 공유 타입 정의
 *
 * LŌCUS Weight 4축 정의 기준:
 * - Domain: X(기반) / Y(성과) / Z(관계)
 * - Intensity: 1~5
 * - Direction: in(통제 가능) / out(통제 불가)
 * - Nature: unresolved(미결) / recurring(반복) / onetime(일회)
 */

// ── Domain ──────────────────────────────
export type Domain = 'X' | 'Y' | 'Z'

export const DOMAIN_LABELS: Record<Domain, string> = {
  X: '기반',
  Y: '성과',
  Z: '관계',
} as const

export const DOMAIN_COLORS: Record<Domain, string> = {
  X: '#7ec8e3', // 차가운 파란빛 — Foundation
  Y: '#ddd8b0', // 밝고 희끄무레한 빛 — Output
  Z: '#f0a870', // 따뜻한 주황빛 — Connection
} as const

// ── Weight ──────────────────────────────
export type Intensity = 1 | 2 | 3 | 4 | 5
export type Direction = 'in' | 'out'
export type Nature = 'unresolved' | 'recurring' | 'onetime'

export interface Weight {
  domain: Domain
  domainRatio?: Partial<Record<Domain, number>> // 복수 영역 시 비율 (합산 1.0)
  intensity: Intensity
  direction: Direction
  directionRatio?: { in: number; out: number }  // 복수 방향 시 비율
  nature: Nature[]                               // 복수 허용 (onetime 단독만)
}

// ── Star ────────────────────────────────
export interface Star {
  id: string
  text: string
  question?: string        // 던질 때의 화두 질문
  domain: Domain
  weight?: Weight
  intensity: number        // 0.0 ~ 1.0 (시각화용)
  mass: number             // intensity * 10 (중력 계산용)
  createdAt: string        // ISO 8601
  isAnchor: boolean        // 영역 내 항성 여부
  orbitParent: string | null // 공전 대상 Star id
}

// ── Gravity ─────────────────────────────
export interface GravityField {
  userId: string
  stars: Star[]
  defaultGravity: Partial<Record<Domain, number>>  // 기본 중심 분포
  stabilityRange: Partial<Record<Domain, [number, number]>>
  recurringMass: Partial<Record<Domain, number>>
  updatedAt: string
}

// ── Signal (제안) ────────────────────────
export type SignalType =
  | 'schedule_timing'  // 일정 조력
  | 'energy_warning'   // 에너지 쏠림
  | 'absence'          // 부재 인식
  | 'pattern'          // 패턴 목격
  | 'shift'            // 변화 감지

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
  gravityUnlocked: boolean // 초기 캘리브레이션 완료 여부
  signalLevel: 0 | 1 | 2 | 3 | 4 | 5 // Gravity 단계 (기능 잠금 해제)
}

// ── Onboarding ───────────────────────────
export interface OnboardingAnswer {
  questionId: string
  choiceIndex: number
  weight: Partial<Weight>
}
