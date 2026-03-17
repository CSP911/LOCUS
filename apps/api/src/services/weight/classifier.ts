import Anthropic from '@anthropic-ai/sdk'
import type { Weight, Domain, Intensity, Direction, Nature } from '@locus/shared'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/**
 * classifyText — 자연어 텍스트 → Weight 4축 분류
 *
 * Phase 1: Claude API 기반 프로토타입
 * Phase 2: KoBERT 파인튜닝 모델로 교체 (학습 데이터 2000개 이상 구축 후)
 *
 * Weight 4축 정의:
 * - domain: X(기반) / Y(성과) / Z(관계)
 * - intensity: 1~5 (머릿속에 얼마나 자주/무겁게 올라오는가)
 * - direction: in(내가 통제 가능) / out(통제 불가)
 * - nature: unresolved(미결) / recurring(반복) / onetime(일회)
 */
export async function classifyText(text: string): Promise<Weight> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[classifier] ANTHROPIC_API_KEY 없음 — fallback 사용')
    return classifyFallback(text)
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: buildPrompt(text),
      }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    return parseResponse(raw)
  } catch (err) {
    console.error('[classifier] Claude API 오류 — fallback 사용:', err)
    return classifyFallback(text)
  }
}

function buildPrompt(text: string): string {
  return `당신은 LŌCUS의 Weight 분류기입니다.
사용자가 던진 짧은 텍스트를 읽고 아래 4축으로 분류하세요.

텍스트: "${text}"

분류 기준:
- domain: X(기반 — 수면/식사/몸/휴식/정리), Y(성과 — 일/책임/성장/기여), Z(관계 — 사람/소속/연결/혼자)
- intensity: 1(스쳐지나감) 2(가끔 떠오름) 3(하루 몇번) 4(자주/다른것에 영향) 5(계속 머릿속)
- direction: in(내가 통제 가능한 것), out(타인/상황/환경에서 온 것)
- nature: unresolved(끝나지 않은 것), recurring(반복 패턴), onetime(단발성) — 복수 가능, onetime은 단독만

JSON만 반환하세요. 설명 없이.
형식: {"domain":"X","intensity":3,"direction":"in","nature":["unresolved"]}`
}

function parseResponse(raw: string): Weight {
  try {
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return {
      domain: parsed.domain as Domain,
      intensity: parsed.intensity as Intensity,
      direction: parsed.direction as Direction,
      nature: parsed.nature as Nature[],
    }
  } catch {
    console.error('[classifier] 파싱 실패 — fallback 사용')
    return classifyFallback('')
  }
}

/**
 * 키워드 기반 fallback 분류
 * AI 연동 전 또는 실패 시 사용
 */
function classifyFallback(text: string): Weight {
  const xw = ['잠','피곤','밥','몸','쉬','운동','식사','수면','정리','아프','청소']
  const yw = ['일','야근','발표','상사','마감','업무','성과','인정','실수','실패','집중']
  const zw = ['친구','연락','말','대화','사람','관계','혼자','외롭','신경','가족']

  let sx = 0, sy = 0, sz = 0
  xw.forEach(w => { if (text.includes(w)) sx++ })
  yw.forEach(w => { if (text.includes(w)) sy++ })
  zw.forEach(w => { if (text.includes(w)) sz++ })

  let domain: Domain
  if (!sx && !sy && !sz) domain = (['X','Y','Z'] as Domain[])[Math.floor(Math.random()*3)]
  else if (sx >= sy && sx >= sz) domain = 'X'
  else if (sy >= sx && sy >= sz) domain = 'Y'
  else domain = 'Z'

  return {
    domain,
    intensity: 3,
    direction: 'out',
    nature: ['unresolved'],
  }
}
