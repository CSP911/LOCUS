import { Router } from 'express'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'

export const dailyProfileRouter = Router()

const schema = z.object({
  goals: z.array(z.any()),
  date: z.string().optional(),
})

/**
 * POST /daily-profile
 *
 * 사용자의 전체 도전 기록을 받아 프로필 + 인사이트 + 추천을 생성.
 * 매일 1회 호출.
 */
dailyProfileRouter.post('/', async (req, res, next) => {
  try {
    const { goals, date } = schema.parse(req.body)

    // 클라이언트에서 집계한 통계도 받을 수 있지만,
    // 원본 데이터를 보내고 LLM이 분석하게 함
    let result
    try {
      result = await analyzeWithClaude(goals, date || new Date().toISOString().slice(0, 10))
    } catch (err) {
      console.error('[daily-profile] Claude error:', err)
      result = analyzeFallback(goals)
    }

    res.json(result)
  } catch (err) { next(err) }
})

async function analyzeWithClaude(goals: any[], date: string) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  // 도전 데이터 요약
  const summary = goals.map(g => ({
    text: g.text,
    domain: g.domain,
    date: g.date,
    active: g.active,
    stepsTotal: g.steps?.length || 0,
    stepsDone: g.steps?.filter((s: any) => s.done).length || 0,
    stepsTimes: g.steps?.map((s: any) => ({
      order: s.order,
      done: s.done,
      doneAt: s.doneAt,
      checkinTime: s.checkinTime,
    })),
    pausedUntil: g.pausedUntil,
  }))

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system: `사용자의 도전 기록을 분석하여 프로필 JSON을 생성하세요.

■ 응답 형식 (JSON만):
{
  "date": "${date}",
  "profile": {
    "domains": { "X": 0.0~1.0, "Y": 0.0~1.0, "Z": 0.0~1.0 },
    "activeHours": [가장 활발한 시간대 정수 배열],
    "successRate": 0.0~1.0,
    "deferPattern": { "요일": 빈도 0.0~1.0 },
    "avgStepsCompleted": 평균 완료 단계 수,
    "interests": ["관심사 키워드 3~5개"],
    "strengths": ["강점 1~3줄"],
    "struggles": ["어려움 1~3줄"],
    "personality": {
      "consistency": 0.0~1.0,
      "ambition": 0.0~1.0,
      "flexibility": 0.0~1.0
    }
  },
  "insights": ["인사이트 1~3줄 — 사실만, 판단 없이"],
  "recommendation": "다음 도전 추천 한 줄 — 도발적이되 부담 없게"
}

■ 분석 기준:
- domains: X(건강), Y(성과), Z(관계) 비율
- activeHours: doneAt 시간대 중 가장 많이 나오는 것
- successRate: 전체 도전 중 전부 완료한 비율
- deferPattern: 요일별 defer/pause 빈도
- interests: 도전 텍스트에서 추출한 관심사 키워드
- strengths: 잘 하는 패턴 (높은 성공률 도메인, 활발한 시간대 등)
- struggles: 어려워하는 패턴 (자주 defer하는 요일, 낮은 성공률 도메인 등)
- personality.consistency: 매일 꾸준히 하는 정도
- personality.ambition: 도전 난이도/빈도
- personality.flexibility: defer 후 다시 시도하는 정도

■ insights 규칙:
- 사실만. 판단/조언/위로 금지.
- "~하고 있습니다", "~패턴이 있습니다" 톤.

■ recommendation 규칙:
- 도발적이되 부담 없게. "~해볼까요?" 톤.
- 부재한 도메인이나 새로운 영역 제안.

데이터가 부족하면(도전 2개 미만) 빈 값으로 채우세요.`,
    messages: [{
      role: 'user',
      content: `오늘 날짜: ${date}\n도전 기록 (${goals.length}개):\n${JSON.stringify(summary, null, 1)}`,
    }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'
  const clean = raw.replace(/```json|```/g, '').trim()
  const jsonMatch = clean.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON')
  return JSON.parse(jsonMatch[0])
}

function analyzeFallback(goals: any[]) {
  const total = goals.length
  const completed = goals.filter(g => !g.active && g.steps?.every((s: any) => s.done)).length

  return {
    date: new Date().toISOString().slice(0, 10),
    profile: {
      domains: { X: 0.33, Y: 0.34, Z: 0.33 },
      activeHours: [15, 21],
      successRate: total > 0 ? completed / total : 0,
      deferPattern: {},
      avgStepsCompleted: 0,
      interests: [],
      strengths: [],
      struggles: [],
      personality: { consistency: 0.5, ambition: 0.5, flexibility: 0.5 },
    },
    insights: total < 2 ? ['아직 데이터가 쌓이는 중입니다.'] : [],
    recommendation: null,
  }
}
