import type { GravityField, Domain } from '../types/shared'

/**
 * computeGravity — 사용자의 현재 Gravity Field 계산
 *
 * Star Candy 형상 기반:
 * - Default Gravity: 기본적으로 어디로 기우는가
 * - Stability Range: 무너지지 않는 범위
 * - Recurring Mass: 자주 무게가 실리는 영역
 *
 * TODO:
 * - DB에서 실제 별 데이터 로드
 * - 초기 Weight 반감기 적용 (2주 후 20%)
 * - Gravity 임계값 수치화 (배포 후 실험 기반)
 */
export async function computeGravity(userId: string): Promise<GravityField> {
  // TODO: DB에서 userId의 stars 로드
  const stars: any[] = []

  // Domain별 mass 합산
  const massByDomain: Record<Domain, number> = { X: 0, Y: 0, Z: 0 }
  stars.forEach(s => {
    massByDomain[s.domain as Domain] += s.mass ?? 0
  })

  const total = Object.values(massByDomain).reduce((a, b) => a + b, 0) || 1

  // 정규화 (0.0 ~ 1.0)
  const defaultGravity: Partial<Record<Domain, number>> = {
    X: massByDomain.X / total,
    Y: massByDomain.Y / total,
    Z: massByDomain.Z / total,
  }

  return {
    userId,
    stars,
    defaultGravity,
    stabilityRange: {
      X: [0.2, 0.6],
      Y: [0.2, 0.6],
      Z: [0.2, 0.6],
    },
    recurringMass: {}, // TODO: 반복 패턴 별 집계
    updatedAt: new Date().toISOString(),
  }
}

/**
 * checkGravityLevel — Gravity 형성 수준 판단
 * 기능 잠금 해제 기준
 *
 * level 0: Gravity 미형성 (기본 던지기만)
 * level 1: 일정 조력 잠금 해제
 * level 2: 에너지 타이밍 잠금 해제
 * level 3: 부재 인식 잠금 해제
 * level 4: 패턴 목격 잠금 해제
 * level 5: 변화 감지 잠금 해제
 *
 * TODO: 임계값은 실제 데이터 기반으로 보정
 */
export function checkGravityLevel(starCount: number, daysSinceJoin: number): number {
  if (starCount < 5) return 0
  if (starCount < 10) return 1
  if (starCount < 20 || daysSinceJoin < 3) return 2
  if (starCount < 35 || daysSinceJoin < 7) return 3
  if (starCount < 50 || daysSinceJoin < 14) return 4
  return 5
}
