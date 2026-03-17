import Anthropic from '@anthropic-ai/sdk'
import type { ClassifyResult } from './types'

/**
 * classifyWithClaude
 * Phase 1 분류기 — Claude API 기반
 *
 * 레이블링 데이터 생성 + 프로토타입 검증 용도.
 * 충분한 데이터 축적 후 KoBERT로 교체.
 */
export async function classifyWithClaude(
  text: string,
  apiKey?: string
): Promise<ClassifyResult> {
  const client = new Anthropic({ apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY })

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 256,
    system: `당신은 LŌCUS Weight 분류 전문가입니다. 
사용자가 던진 텍스트를 4축으로 분류하고 JSON만 반환하세요.

Weight 4축 정의:
- domain: X(기반—수면/식사/몸/휴식/정리), Y(성과—일/책임/성장/기여), Z(관계—사람/소속/연결/나)
- intensity: 1(스쳐지나감) 2(가끔떠오름) 3(하루몇번) 4(자주/영향줌) 5(계속머릿속)
- direction: in(내가통제가능), out(통제불가—타인/상황/환경)
- nature: unresolved(미결), recurring(반복), onetime(단발) — 복수허용, onetime은 단독만

복수 domain/direction은 domainRatio, directionRatio로 표현:
{"domain":"Y","domainRatio":{"Y":0.6,"Z":0.4},"intensity":4,"direction":"out","directionRatio":{"out":0.6,"in":0.4},"nature":["unresolved","recurring"]}`,
    messages: [{ role: 'user', content: `텍스트: "${text}"` }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'
  const clean = raw.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(clean)

  return {
    ...parsed,
    confidence: 0.85,
    method: 'claude' as const,
    rawText: text,
  }
}
