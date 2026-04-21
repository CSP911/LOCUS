import { Router } from 'express'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'

export const clarifyGoalRouter = Router()

const schema = z.object({
  goal: z.string().min(1).max(50),
})

/**
 * POST /clarify-goal
 *
 * 목표가 모호한지 판단하고, 모호하면 구체화 질문을 반환.
 * 충분히 구체적이면 null ��환.
 */
clarifyGoalRouter.post('/', async (req, res, next) => {
  try {
    const { goal } = schema.parse(req.body)

    let result: { needsClarification: boolean; question?: string }
    try {
      result = await checkWithClaude(goal)
    } catch {
      result = checkFallback(goal)
    }

    res.json(result)
  } catch (err) {
    next(err)
  }
})

async function checkWithClaude(goal: string) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('no key')

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    system: `사용자가 하루 도전과제를 입력했습니다. 이 과제가 오늘 하루 안에 "했다/안 했다"를 판단할 수 있을 만큼 구체적인지 확인하세요.

구체적이면: {"needsClarification": false}
모��하면: {"needsClarification": true, "question": "구체화 질문"}

구체화 질문 규칙:
- 한 문장, 친근한 톤
- "어떤", "얼마나", "언제" 중 하나로 물어봄
- 예: "운동하기" → "어떤 운동을 몇 분 정도 할까요?"
- 예: "공부하기" → "어떤 공부를 얼마나 할까요?"
- 이미 구체적인 건 통과: "30분 달리기", "1챕터 읽기"

JSON만 반환.`,
    messages: [{ role: 'user', content: goal }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'
  const clean = raw.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

function checkFallback(goal: string): { needsClarification: boolean; question?: string } {
  // 숫자/시간/구체적 단어가 있으면 구체적으로 판단
  if (/\d|분|시간|페이지|챕터|장|번|개|km|회/.test(goal)) {
    return { needsClarification: false }
  }
  // 3글자 이하이거나 "하기"로 끝나면 모호
  if (goal.length <= 5 || /하기$|하기!$/.test(goal)) {
    return { needsClarification: true, question: `"${goal}" — 조금만 더 구체적으로 알려줄래요? 어떤 걸 얼마나?` }
  }
  return { needsClarification: false }
}
