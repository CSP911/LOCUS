import { Router } from 'express'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'

export const suggestSmallRouter = Router()

const schema = z.object({
  goal: z.string().min(1).max(50),
  context: z.string().optional(),
})

suggestSmallRouter.post('/', async (req, res, next) => {
  try {
    const { goal, context } = schema.parse(req.body)

    let suggestion: string
    try {
      suggestion = await generateWithClaude(goal, context)
    } catch {
      suggestion = generateFallback(goal)
    }

    res.json({ suggestion })
  } catch (err) {
    next(err)
  }
})

async function generateWithClaude(goal: string, context?: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('no key')

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    system: `목표의 "가장 작은 버전"을 제안하세요.
규칙: 1~3분 안에 끝나는 것, 실패 불가능한 수준, "~할까요?" 톤, 한 문장만, 판단/조언 금지.
예: "운동하기"→"스트레칭 1분만 할까요?", "독서"→"한 페이지만 펼쳐볼까요?"`,
    messages: [{
      role: 'user',
      content: context
        ? `목표: "${goal}" / 맥락: ${context}`
        : `목표: "${goal}"`,
    }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  return raw.trim().replace(/^["']|["']$/g, '')
}

function generateFallback(goal: string): string {
  const map: Record<string, string[]> = {
    '운동': ['스트레칭 1분만 할까요?', '제자리 걷기 30초만 할까요?'],
    '공부': ['한 문장만 읽어볼까요?', '단어 3개만 볼까요?'],
    '읽': ['한 페이지만 펼쳐볼까요?', '목차만 훑어볼까요?'],
    '정리': ['물건 하나만 제자리에 놓을까요?'],
    '연락': ['이모지 하나만 보내볼까요?'],
  }
  for (const [k, opts] of Object.entries(map)) {
    if (goal.includes(k)) return opts[Math.floor(Math.random() * opts.length)]
  }
  return `${goal} — 1분만 해볼까요?`
}
