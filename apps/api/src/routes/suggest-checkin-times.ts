import { Router } from 'express'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'

export const suggestCheckinTimesRouter = Router()

const schema = z.object({
  goal: z.string().min(1).max(100),
})

/**
 * POST /suggest-checkin-times
 *
 * 도전과제의 성격에 맞는 체크인 시간 2개를 제안.
 * 예: "운동하기" → [14, 21] (오후 2시, 밤 9시)
 * 예: "아침 명상" → [9, 20] (오전 9시, 저녁 8시)
 * 예: "보고서 끝내기" → [15, 18] (오후 3시, 오후 6���)
 */
suggestCheckinTimesRouter.post('/', async (req, res, next) => {
  try {
    const { goal } = schema.parse(req.body)

    let times: number[]
    try {
      times = await suggestWithClaude(goal)
    } catch {
      times = [14, 21] // 기본값
    }

    res.json({ times })
  } catch (err) {
    next(err)
  }
})

async function suggestWithClaude(goal: string): Promise<number[]> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('no key')

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 50,
    system: `사용자의 하루 도전과제를 보고, 하루 중 체크인하기 좋은 시간 2개를 추천하세요.
첫 번째: 중간 체크 (아직 할 수 있는 시간)
두 번째: 마무리 체크 (하루가 끝나기 전)

과제 성격에 따라 판단:
- 아침 과제 (명상, 운동 등) → [10, 20]
- 업무 과제 (보고서, 미팅 등) → [14, 18]
- 저녁 과제 (독서, 정리 등) → [17, 22]
- 일반적 → [14, 21]

숫자 배열만 반환. 예: [14, 21]`,
    messages: [{ role: 'user', content: goal }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : '[14, 21]'
  const clean = raw.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(clean)

  if (Array.isArray(parsed) && parsed.length === 2) {
    return parsed.map((n: number) => Math.max(6, Math.min(23, Math.round(n))))
  }
  return [14, 21]
}
