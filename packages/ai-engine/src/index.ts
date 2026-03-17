/**
 * @locus/ai-engine
 *
 * LŌCUS AI 분류 엔진
 *
 * Phase 1 (현재): Claude API 기반 프로토타입
 * Phase 2 (예정): KoBERT 파인튜닝 소형 모델
 *
 * 개발 경로:
 * 1. Weight 4축 정의 문서 기준으로 레이블링 데이터 구축 (500~2000개)
 * 2. Claude API로 분류 → 결과를 학습 데이터로 누적
 * 3. KoBERT 파인튜닝
 * 4. 성능 비교 후 교체
 *
 * 장점 (소형 모델):
 * - 외부 API 의존성 없음
 * - 온디바이스 추론 가능 → 프라이버시 보호
 * - 비용 선형 증가 없음
 */

export * from './classifier/index'
export * from './weight/index'
export * from './signal/index'
