import type { Signal, SignalType, Domain } from '@locus/shared'
import { computeGravity, checkGravityLevel } from '../gravity/compute'

/**
 * generateSignal — Gravity 기반 제안 생성
 *
 * LŌCUS 제안 원칙:
 * - 해결 요구 없음. 유도 없음. 사실의 출현.
 * - 조용히 한 줄만. 분석/조언 없음.
 * - 사용자가 해도 되고 안 해도 됨.
 * - LŌCUS는 확인하지 않음.
 *
 * TODO:
 * - 전이 순간 타이밍 감지 연동
 * - 실제 별 데이터 기반 패턴 분석
 * - 중복 제안 방지 (최근 N일 내 같은 타입 제한)
 */
export async function generateSignal(userId: string): Promise<Signal | null> {
  const gravity = await computeGravity(userId)
  const level = checkGravityLevel(gravity.stars.length, 0)

  if (level === 0) return null

  const signal = detectSignal(gravity, level)
  if (!signal) return null

  return {
    id: crypto.randomUUID(),
    ...signal,
    createdAt: new Date().toISOString(),
    seen: false,
  }
}

function detectSignal(
  gravity: Awaited<ReturnType<typeof computeGravity>>,
  level: number
): Omit<Signal, 'id' | 'createdAt' | 'seen'> | null {
  const { defaultGravity } = gravity

  const X = defaultGravity.X ?? 0
  const Y = defaultGravity.Y ?? 0
  const Z = defaultGravity.Z ?? 0

  // Level 2 이상 — 에너지 쏠림 감지
  if (level >= 2 && Y > 0.6) {
    return {
      type: 'energy_warning',
      message: '요즘 일에 많이 실려있네요.',
      domain: 'Y',
    }
  }

  // Level 3 이상 — 부재 인식
  if (level >= 3 && Z < 0.15) {
    return {
      type: 'absence',
      message: '요즘 혼자 있는 시간이 많았네요.',
      domain: 'Z',
    }
  }

  if (level >= 3 && X < 0.15) {
    return {
      type: 'absence',
      message: '요즘 몸 챙기는 게 밀린 것 같네요.',
      domain: 'X',
    }
  }

  // Level 4 이상 — 패턴 목격
  if (level >= 4) {
    const dominant = ([['X', X], ['Y', Y], ['Z', Z]] as [Domain, number][])
      .sort((a, b) => b[1] - a[1])[0]
    if (dominant[1] > 0.5) {
      return {
        type: 'pattern',
        message: '이번 주도 비슷한 흐름이네요.',
        domain: dominant[0],
      }
    }
  }

  return null
}

/**
 * SIGNAL_MESSAGES — 제안 문장 풀
 * 설계 원칙: 사실만 전달. 해결 요구 없음. 짧게.
 */
export const SIGNAL_MESSAGES: Record<SignalType, string[]> = {
  schedule_timing: [
    '지금 이거 하면 좋은 타이밍일 수 있어요.',
  ],
  energy_warning: [
    '요즘 일에 많이 실려있네요.',
    'Y 영역에 무게가 쏠려있어요.',
  ],
  absence: [
    '요즘 혼자 있는 시간이 많았네요.',
    '이 영역에 신호가 없었어요.',
  ],
  pattern: [
    '이번 주도 비슷한 흐름이네요.',
    '반복되는 패턴이 보여요.',
  ],
  shift: [
    '요즘 좀 다른가요?',
    '최근 변화가 감지돼요.',
  ],
}
