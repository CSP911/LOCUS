/**
 * classifier — 텍스트 → Weight 분류
 *
 * TODO:
 * - labelingData 누적 구조 설계
 * - Claude API 분류 결과 자동 저장
 * - KoBERT 파인튜닝 파이프라인 연동
 */

export { classifyWithClaude } from './claude'
export { classifyWithKeyword } from './keyword'

export type { ClassifyResult } from './types'
