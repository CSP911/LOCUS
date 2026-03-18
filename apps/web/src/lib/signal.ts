import type { Star, Signal, SignalType, Domain } from '@locus/shared'

const DOMAIN_LABEL: Record<Domain, string> = {
  X: '몸과 기반',
  Y: '일과 성과',
  Z: '관계와 의미',
}

/**
 * analyzeGravity — 현재 별 상태를 분석해 Signal을 생성
 *
 * 기획 원칙:
 * - 해결 요구 없음. 유도 없음. 사실의 출현.
 * - 사용자가 해도 되고 안 해도 됨. LŌCUS는 확인하지 않는다.
 */
export function analyzeGravity(stars: Star[]): Signal | null {
  if (stars.length < 3) return null // 최소 데이터 필요

  // 도메인별 mass 집계
  const mass: Record<Domain, number> = { X: 0, Y: 0, Z: 0 }
  const count: Record<Domain, number> = { X: 0, Y: 0, Z: 0 }
  let recurringCount = 0
  let unresolvedCount = 0

  stars.forEach(s => {
    mass[s.domain] += s.mass
    count[s.domain]++
    if (s.weight?.nature.includes('recurring')) recurringCount++
    if (s.weight?.nature.includes('unresolved')) unresolvedCount++
  })

  const total = mass.X + mass.Y + mass.Z
  if (total === 0) return null

  const ratios = {
    X: mass.X / total,
    Y: mass.Y / total,
    Z: mass.Z / total,
  }

  // ── 트리거 조건 (우선순위 순) ──────────────

  // 1) 에너지 쏠림 — 한 영역이 55% 이상
  for (const d of ['X', 'Y', 'Z'] as Domain[]) {
    if (ratios[d] > 0.55 && count[d] >= 3) {
      return makeSignal('energy_warning', d,
        `요즘 ${DOMAIN_LABEL[d]}에 많이 실려있네요.`)
    }
  }

  // 2) 부재 인식 — 한 영역이 10% 미만 (다른 영역에 최소 3개 이상)
  for (const d of ['X', 'Y', 'Z'] as Domain[]) {
    if (ratios[d] < 0.1 && stars.length >= 5) {
      return makeSignal('absence', d,
        `요즘 ${DOMAIN_LABEL[d]} 쪽이 조용하네요.`)
    }
  }

  // 3) 패턴 목격 — 반복(recurring) 성격이 40% 이상
  if (stars.length >= 5 && recurringCount / stars.length > 0.4) {
    return makeSignal('pattern', undefined,
      '비슷한 흐름이 반복되고 있네요.')
  }

  // 4) 미결 누적 — 미결(unresolved)이 50% 이상
  if (stars.length >= 5 && unresolvedCount / stars.length > 0.5) {
    return makeSignal('pattern', undefined,
      '끝나지 않은 것들이 쌓이고 있네요.')
  }

  return null
}

function makeSignal(type: SignalType, domain: Domain | undefined, message: string): Signal {
  return {
    id: crypto.randomUUID(),
    type,
    message,
    domain,
    createdAt: new Date().toISOString(),
    seen: false,
  }
}
