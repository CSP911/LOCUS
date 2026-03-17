import type { ClassifyResult } from './types'
import type { Domain } from '@locus/shared'

/**
 * classifyWithKeyword
 * Fallback 분류기 — 키워드 기반
 *
 * AI 연동 전 또는 실패 시 사용.
 * Weight 4축 정의 문서 기준으로 지속 업데이트 필요.
 */

const DOMAIN_KEYWORDS: Record<Domain, string[]> = {
  X: ['잠','피곤','밥','먹','몸','쉬','운동','식사','수면','정리','아프','청소','컨디션','몸살'],
  Y: ['일','야근','발표','상사','마감','업무','성과','인정','실수','실패','집중','회의','프로젝트','결과','목표'],
  Z: ['친구','연락','말','대화','사람','관계','혼자','외롭','신경','가족','연인','모임','소속'],
}

const IN_KEYWORDS = ['내가','내','나는','나의','내 선택','내 행동','또 미뤘','또 못했']
const OUT_KEYWORDS = ['상사','친구가','누가','상황','환경','회사가','연락이 없','무시했','말을']
const RECURRING_WORDS = ['또','항상','매번','계속','반복','늘','자꾸','여전히']
const UNRESOLVED_WORDS = ['아직','계속','여전히','해결','못','안 됐','모르겠']

export function classifyWithKeyword(text: string): ClassifyResult {
  // Domain 분류
  let scores: Record<Domain, number> = { X: 0, Y: 0, Z: 0 }
  Object.entries(DOMAIN_KEYWORDS).forEach(([d, words]) => {
    words.forEach(w => { if (text.includes(w)) scores[d as Domain]++ })
  })

  const total = Object.values(scores).reduce((a, b) => a + b, 0)
  let domain: Domain
  let domainRatio: Partial<Record<Domain, number>> | undefined

  if (total === 0) {
    domain = (['X','Y','Z'] as Domain[])[Math.floor(Math.random() * 3)]
  } else if (total > 1 && scores.X > 0 && scores.Y > 0 || scores.X > 0 && scores.Z > 0 || scores.Y > 0 && scores.Z > 0) {
    // 복수 domain
    domain = Object.entries(scores).sort(([,a],[,b]) => b-a)[0][0] as Domain
    domainRatio = {}
    Object.entries(scores).forEach(([d, s]) => {
      if (s > 0) (domainRatio as any)[d] = s / total
    })
  } else {
    domain = Object.entries(scores).sort(([,a],[,b]) => b-a)[0][0] as Domain
  }

  // Direction
  const inScore = IN_KEYWORDS.filter(w => text.includes(w)).length
  const outScore = OUT_KEYWORDS.filter(w => text.includes(w)).length
  const direction = inScore >= outScore ? 'in' : 'out'

  // Nature
  const nature: ('unresolved' | 'recurring' | 'onetime')[] = []
  if (RECURRING_WORDS.some(w => text.includes(w))) nature.push('recurring')
  if (UNRESOLVED_WORDS.some(w => text.includes(w))) nature.push('unresolved')
  if (nature.length === 0) nature.push('onetime')

  return {
    domain,
    domainRatio,
    intensity: 3,
    direction,
    nature,
    confidence: 0.4,
    method: 'keyword',
    rawText: text,
  }
}
