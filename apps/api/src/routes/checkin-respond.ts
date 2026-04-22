import { Router } from 'express'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'

export const checkinRespondRouter = Router()

const schema = z.object({
  goal: z.string(),           // 원래 목표
  stepText: z.string(),       // 현재 단계 내용
  userMessage: z.string(),    // 사용자 응답 (자유 텍스트 or 숏컷)
})

/**
 * POST /checkin-respond
 *
 * 사용자의 체크인 응답을 받아 LLM이 리액션 + 다음 액션을 결정.
 *
 * 응답:
 * {
 *   "reaction": "부담 없는 리액션 한 줄",
 *   "action": "complete" | "defer" | "skip" | "suggest_small",
 *   "smallSuggestion": "더 작은 대안 (action이 suggest_small일 때)"
 * }
 */
checkinRespondRouter.post('/', async (req, res, next) => {
  try {
    const data = schema.parse(req.body)
    let result
    try {
      result = await respondWithClaude(data)
    } catch (err) {
      console.error('[checkin-respond] Claude error:', err)
      result = respondFallback(data)
    }
    res.json(result)
  } catch (err) { next(err) }
})

async function respondWithClaude(data: { goal: string; stepText: string; userMessage: string }) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 200,
    system: `사용자가 도전 과제 체크인에 응답했습니다. 리액션과 다음 액션을 JSON으로 반환하세요.

■ 응답 형식:
{
  "reaction": "부담 없는 리액션 한 줄",
  "action": "complete" | "defer" | "skip"
}

■ action 판단:
- "complete": 사용자가 했다고 말함 ("했어요", "다 읽었어", "끝남" 등)
- "defer": 그 외 모든 경우 — 못 했거나, 힘들거나, 상황이 안 되거나. 내일 이어가면 됨.
- "skip": 명시적으로 포기 ("넘길게요", "안 할래", "포기" 등)

■ 핵심 스탠스:
- 못 해도 괜찮다. 내일 이어가면 된다. 느림의 미학.
- 어떻게든 오늘 하게 만들려고 하지 않는다.
- 대안 제안 금지. 수용만.

■ reaction 규칙:
- 판단/조언/위로/격려 금지 ("힘내세요" X, "해야 해요" X, "다음엔 꼭" X)
- 부담 없고 담백한 톤. 한 줄, 짧게.
- complete: 사실 인정 ("해냈네요.", "끝냈군요.")
- defer: 수용 ("괜찮아요. 내일 이어가면 돼요.", "천천히요.")
- skip: 판단 없이 ("알겠어요.")`,
    messages: [{
      role: 'user',
      content: `목표: "${data.goal}"\n현재 단계: "${data.stepText}"\n사용자 응답: "${data.userMessage}"`,
    }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'
  const clean = raw.replace(/```json|```/g, '').trim()
  const jsonMatch = clean.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON')
  return JSON.parse(jsonMatch[0])
}

function respondFallback(data: { userMessage: string }) {
  const msg = data.userMessage.toLowerCase()
  if (/했|끝|완료|다 읽|함/.test(msg)) {
    return { reaction: '해냈네요.', action: 'complete', smallSuggestion: null }
  }
  if (/넘길|안 할|포기|패스/.test(msg)) {
    return { reaction: '알겠어요. 내일 다시.', action: 'skip', smallSuggestion: null }
  }
  if (/나중|이따|두고|못/.test(msg)) {
    return { reaction: '괜찮아요. 나중에 이어서 해도 돼요.', action: 'defer', smallSuggestion: null }
  }
  return { reaction: '알겠어요.', action: 'defer', smallSuggestion: null }
}
