import { NextRequest, NextResponse } from 'next/server'
import type { Domain } from '@locus/shared'

/**
 * POST /api/classify
 *
 * 자연어 텍스트를 X/Y/Z Domain + Weight로 분류.
 *
 * TODO:
 * - Phase 1: Claude API 기반 분류 (프로토타입)
 * - Phase 2: KoBERT 파인튜닝 모델로 교체
 *
 * Request:  { text: string }
 * Response: { domain: Domain, intensity: number, direction: 'in' | 'out', nature: Nature[] }
 */
export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    if (text.length > 30) {
      return NextResponse.json({ error: 'text too long' }, { status: 400 })
    }

    // TODO: AI 분류 로직 구현
    // const result = await classifyWithAI(text)
    const result = classifyFallback(text)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[classify] error:', error)
    return NextResponse.json({ error: 'classification failed' }, { status: 500 })
  }
}

/**
 * 임시 키워드 분류 (AI 연동 전 fallback)
 * 실제 Weight 4축 정의 문서 기준으로 교체 예정
 */
function classifyFallback(text: string) {
  const xw = ['잠','피곤','밥','몸','쉬','운동','식사','수면','정리','아프']
  const yw = ['일','야근','발표','상사','마감','업무','성과','인정','실수','실패','집중']
  const zw = ['친구','연락','말','대화','사람','관계','혼자','외롭','신경','가족']

  let sx = 0, sy = 0, sz = 0
  xw.forEach(w => { if (text.includes(w)) sx++ })
  yw.forEach(w => { if (text.includes(w)) sy++ })
  zw.forEach(w => { if (text.includes(w)) sz++ })

  let domain: Domain
  if (!sx && !sy && !sz) domain = ['X','Y','Z'][Math.floor(Math.random()*3)] as Domain
  else if (sx >= sy && sx >= sz) domain = 'X'
  else if (sy >= sx && sy >= sz) domain = 'Y'
  else domain = 'Z'

  return {
    domain,
    intensity: Math.floor(Math.random() * 3) + 2, // 임시 2~4
    direction: Math.random() > 0.5 ? 'in' : 'out',
    nature: ['unresolved'] as const,
  }
}
