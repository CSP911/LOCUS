import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

/**
 * POST /api/suggest-small
 *
 * 목표의 "가장 작은 버전"을 제안.
 * "운동하기" → "스트레칭 1분만 할까요?"
 */
export async function POST(req: NextRequest) {
  try {
    const { goal, context } = await req.json()

    if (!goal) {
      return NextResponse.json({ error: 'goal required' }, { status: 400 })
    }

    let suggestion: string
    try {
      suggestion = await generateWithClaude(goal, context)
    } catch {
      suggestion = generateFallback(goal)
    }

    return NextResponse.json({ suggestion })
  } catch (error) {
    console.error('[suggest-small] error:', error)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

async function generateWithClaude(goal: string, context?: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }

  const client = new Anthropic({ apiKey })

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    system: `당신은 목표의 "가장 작은 버전"을 제안하는 역할입니다.

규칙:
- 1~3분 안에 끝나는 행동만 제안
- 실패가 불가능한 수준으로 작게
- "~할까요?" 톤 (질문형, 강요 아님)
- 한 문장만. 설명 없이.
- 판단/조언 금지 ("해야 해요" X)
- 감정 라벨 금지

좋은 예:
- "운동하기" → "지금 스트레칭 1분만 할까요?"
- "영어 공부" → "단어 3개만 볼까요?"
- "보고서 끝내기" → "목차만 써볼까요?"
- "독서" → "한 페이지만 펼쳐볼까요?"
- "정리하기" → "서랍 하나만 열어볼까요?"`,
    messages: [{
      role: 'user',
      content: context
        ? `목표: "${goal}"\n맥락: ${context}\n\n가장 작은 버전을 한 문장으로:`
        : `목표: "${goal}"\n\n가장 작은 버전을 한 문장으로:`,
    }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  return raw.trim().replace(/^["']|["']$/g, '')
}

function generateFallback(goal: string): string {
  const templates = [
    `${goal} — 1분만 해볼까요?`,
    `${goal}의 가장 작은 첫 단계만 할까요?`,
    `지금 30초만 시작해볼까요?`,
  ]
  return templates[Math.floor(Math.random() * templates.length)]
}
