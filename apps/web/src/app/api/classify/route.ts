import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { Domain, Nature } from '@locus/shared'

/**
 * POST /api/classify
 *
 * 자연어 텍스트 → Weight 4축 분류.
 * Phase 1: Claude API / fallback: 키워드 기반
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

    // Claude API 분류 시도, 실패 시 키워드 fallback
    let result
    try {
      result = await classifyWithClaude(text)
    } catch (e) {
      console.warn('[classify] Claude API failed, using fallback:', e)
      result = classifyFallback(text)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[classify] error:', error)
    return NextResponse.json({ error: 'classification failed' }, { status: 500 })
  }
}

// ── Claude API 분류 ───────────────────────────────
async function classifyWithClaude(text: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }

  const client = new Anthropic({ apiKey })

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    system: `당신은 LŌCUS Weight 분류기입니다. 사용자가 던진 짧은 텍스트를 4축으로 분류하고 JSON만 반환하세요. 설명 없이 JSON만.

Weight 4축:
- domain: "X"(기반—수면/식사/몸/휴식/정리), "Y"(성과—일/책임/성장/돈/기여), "Z"(관계—사람/소속/놀이/창작/나)
- intensity: 1(스쳐지나감) 2(가끔떠오름) 3(하루몇번올라옴) 4(자주/다른행동에영향) 5(계속머릿속/다른것못함)
- direction: "in"(내가 통제 가능—내 선택/행동/습관), "out"(통제 불가—타인/상황/환경)
- nature: ["unresolved"](끝나지않은것), ["recurring"](반복패턴), ["onetime"](단발), ["unresolved","recurring"](끝나지않은 반복) — onetime은 단독만

판단 기준:
- "또", "항상", "매번" → recurring 신호
- "아직", "계속", "여전히" → unresolved 신호
- 텍스트의 내용이 아니라 사용자의 심리적 무게를 읽는다
- intensity는 텍스트에 담긴 긴장/무게감으로 판단

응답 형식: {"domain":"Y","intensity":4,"direction":"out","nature":["unresolved"]}`,
    messages: [{ role: 'user', content: text }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'
  const clean = raw.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(clean)

  // Validate and sanitize
  const domain = (['X', 'Y', 'Z'].includes(parsed.domain) ? parsed.domain : 'Y') as Domain
  const intensity = Math.min(5, Math.max(1, Math.round(parsed.intensity ?? 3)))
  const direction = parsed.direction === 'out' ? 'out' : 'in'
  const nature: Nature[] = Array.isArray(parsed.nature)
    ? parsed.nature.filter((n: string) => ['unresolved', 'recurring', 'onetime'].includes(n))
    : ['unresolved']

  return { domain, intensity, direction, nature, method: 'claude' as const }
}

// ── 키워드 fallback ───────────────────────────────
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

  // Nature 키워드 감지
  const nature: Nature[] = []
  if (/또|항상|매번|맨날/.test(text)) nature.push('recurring')
  if (/아직|계속|여전히|안끝|못끝/.test(text)) nature.push('unresolved')
  if (nature.length === 0) nature.push('onetime')

  // Intensity 추정: 반복/미결이면 높게
  let intensity = 3
  if (nature.includes('recurring')) intensity += 1
  if (nature.includes('unresolved')) intensity += 1
  intensity = Math.min(5, intensity)

  const direction = /상사|환경|날씨|타인|남|걔/.test(text) ? 'out' : 'in'

  return { domain, intensity, direction, nature, method: 'keyword' as const }
}
