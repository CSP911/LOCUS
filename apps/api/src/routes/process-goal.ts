import { Router } from 'express'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'

export const processGoalRouter = Router()

// ── Step 1: 목적 분석 ────────────────────────
const step1Schema = z.object({
  goal: z.string().min(1).max(100),
  clarifyAnswer: z.string().optional(),
})

processGoalRouter.post('/analyze', async (req, res, next) => {
  try {
    const { goal, clarifyAnswer } = step1Schema.parse(req.body)
    let result
    try {
      result = await analyzeGoal(goal, clarifyAnswer)
    } catch (err) {
      console.error('[analyze] Claude error:', err)
      result = analyzeFallback(goal, clarifyAnswer)
    }
    res.json(result)
  } catch (err) { next(err) }
})

// ── Step 3: 세부 플랜 생성 ────────────────────
const step3Schema = z.object({
  goal: z.string().min(1).max(100),
  refined: z.string().optional(),
  timeType: z.enum(['target', 'avoid']),
  selectedHours: z.array(z.number()),
  classification: z.any().optional(),
})

processGoalRouter.post('/plan', async (req, res, next) => {
  try {
    const data = step3Schema.parse(req.body)
    let result
    try {
      result = await createPlan(data)
    } catch (err) {
      console.error('[plan] Claude error:', err)
      result = planFallback(data)
    }
    res.json(result)
  } catch (err) { next(err) }
})

// 기존 호환용 — 한 번에 처리
const legacySchema = z.object({
  goal: z.string().min(1).max(100),
  clarifyAnswer: z.string().optional(),
  avoidHours: z.array(z.number()).optional(),
})

processGoalRouter.post('/', async (req, res, next) => {
  try {
    const { goal, clarifyAnswer, avoidHours } = legacySchema.parse(req.body)
    let result
    try {
      result = await legacyProcess(goal, clarifyAnswer, avoidHours)
    } catch (err) {
      console.error('[process-goal] Claude error:', err)
      result = legacyFallback(goal, clarifyAnswer)
    }
    res.json(result)
  } catch (err) { next(err) }
})

// ══════════════════════════════════════════════
// Step 1: 목적 분석 — 되묻기 + timeType 판단
// ══════════════════════════════════════════════
async function analyzeGoal(goal: string, clarifyAnswer?: string) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const userMsg = clarifyAnswer
    ? `원래 목표: "${goal}"\n구체화 답변: "${clarifyAnswer}"\n\n중요: 이미 한 번 되물었습니다. needsClarification을 반드시 false로 하세요.`
    : `목표: "${goal}"`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system: `사용자의 도전 목표를 분석합니다. JSON만 반환하세요.

■ 응답 형식:
{
  "goal": {
    "original": "원문",
    "needsClarification": true/false,
    "clarifyQuestion": "구체화 질문 (true일 때만)",
    "refined": "구체화된 목표 (false일 때)"
  },
  "classification": {
    "layers": { "body": 0.0, "feeling": 0.0, "thought": 0.0, "action": 0.0, "awareness": 0.0 },
    "spectrum": { "internal": 0.0, "external": 0.0 },
    "weight": 0.0,
    "nature": ["unresolved"/"recurring"/"onetime"],
    "domain": "X/Y/Z"
  },
  "timeType": "target" 또는 "avoid",
  "timeQuestion": "시간 관련 안내 문구"
}

■ timeType 판단 기준:
- "target": 목표에 특정 시점이 있는 경우 (미팅 준비, 발표, 약속 등)
  → timeQuestion: "몇 시에 예정인가요?" 느낌
- "avoid": 하루 중 자유롭게 할 수 있는 경우 (독서, 운동, 공부 등)
  → timeQuestion: "피하고 싶은 시간대가 있나요?" 느낌

■ 분류 (오온 기반 5레이어 + 스펙트럼):
- classification 형식:
  {
    "layers": { "body": 0.0~1.0, "feeling": 0.0~1.0, "thought": 0.0~1.0, "action": 0.0~1.0, "awareness": 0.0~1.0 },
    "spectrum": { "internal": 0.0~1.0, "external": 0.0~1.0 },
    "weight": 0.0~1.0,
    "nature": ["unresolved"/"recurring"/"onetime"]
  }
- layers 합산 = 1.0 (비율)
  - body: 몸, 감각, 물리적 행동 (운동, 수면, 건강)
  - feeling: 감정, 에너지, 기분 (스트레스, 기분전환)
  - thought: 생각, 판단, 인식 (독서, 공부, 계획)
  - action: 습관, 의지, 실행 (루틴, 도전, 반복)
  - awareness: 자각, 패턴 인식 (성찰, 명상, 되돌아봄)
- spectrum: internal(내면) + external(바깥) = 1.0
- weight: 무게감 (0.0 가벼움 ~ 1.0 무거움)
- nature: 반복/미결/일회
- 하위 호환용 domain도 포함: X(body 높으면)/Y(thought+action 높으면)/Z(feeling+관계성 높으면)

■ needsClarification: "했다/안했다" 판단 어려우면 true

■ 절대 금지: 위로/힐링/진단/조언. 감정 라벨 금지.`,
    messages: [{ role: 'user', content: userMsg }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'
  const clean = raw.replace(/```json|```/g, '').trim()
  const jsonMatch = clean.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found in response')
  return JSON.parse(jsonMatch[0])
}

function analyzeFallback(goal: string, clarifyAnswer?: string) {
  const finalGoal = clarifyAnswer ? `${goal} — ${clarifyAnswer}` : goal
  const isVague = finalGoal.length <= 5 || /하기$|읽기$/.test(finalGoal)

  if (isVague && !clarifyAnswer) {
    return {
      goal: { original: goal, needsClarification: true, clarifyQuestion: `"${goal}" — 조금만 더 구체적으로 알려줄래요?`, refined: null },
      classification: null, timeType: null, timeQuestion: null,
    }
  }

  const hasDeadline = /미팅|회의|발표|약속|면접|시험/.test(finalGoal)
  return {
    goal: { original: goal, needsClarification: false, clarifyQuestion: null, refined: finalGoal },
    classification: {
      layers: { body: 0.1, feeling: 0.1, thought: 0.3, action: 0.4, awareness: 0.1 },
      spectrum: { internal: 0.6, external: 0.4 },
      weight: 0.5,
      nature: ['onetime'] as const,
      domain: 'Y' as const,
    },
    timeType: hasDeadline ? 'target' : 'avoid',
    timeQuestion: hasDeadline ? '몇 시에 예정인가요?' : '피하고 싶은 시간대가 있나요?',
  }
}

// ══════════════════════════════════════════════
// Step 3: 세부 플랜 생성
// ══════════════════════════════════════════════
async function createPlan(data: { goal: string; refined?: string; timeType: string; selectedHours: number[]; classification?: any }) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const timeInfo = data.timeType === 'target'
    ? `목표 시점: ${data.selectedHours.join(', ')}시 (이 시간에 실행해야 합니다. 그 전에 준비 단계를 배치하세요)`
    : `피할 시간: ${data.selectedHours.sort((a,b) => a-b).join(', ')}시 (이 시간에는 체크인을 배정하지 마세요)`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system: `도전 목표의 세부 플랜을 설계합니다. JSON만 반환하세요.

■ 응답 형식:
{
  "steps": [
    { "order": 1, "text": "단계 내용", "checkinTime": 10, "checkinMessage": "체크인 메시지" },
    ...
  ]
}

■ 단계 설계 규칙:
- 2~4단계로 나눔
- 각 단계 1~5분 안에 끝나는 수준
- 실패 불가능할 정도로 작게
- 첫 단계는 "준비", 마지막은 "마무리/확인"
- checkinMessage: 친근한 톤, 판단 없이

■ 시간 배치 규칙:
- checkinTime은 반드시 6~23 사이의 정수 (예: 8, 11, 14, 21). 830 같은 형식 금지.
- timeType이 "target"이면: 목표 시점 기준으로 역산. 준비→리허설→실행 순서
- timeType이 "avoid"이면: 피할 시간을 제외하고 배치

■ 현실 제약 (각 단계 반드시 고려):
- 장소 독립: 이전 단계와 다른 장소에 있을 수 있음
- 시간 제약: 각 단계 5분 이내
- 에너지 변화: 늦은 시간은 더 쉽게
- 최소 도구: 기본 도구만 가정, 추가 준비 불필요
- 자력 수행: 혼자 할 수 있어야 함
- 단계 간 독립: 이전 단계 결과물 없어도 다음 단계 가능

■ 절대 금지: 위로/힐링/진단/조언`,
    messages: [{
      role: 'user',
      content: `목표: "${data.refined || data.goal}"\n${timeInfo}`,
    }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'
  const clean = raw.replace(/```json|```/g, '').trim()
  // JSON 부분만 추출 (첫 { 부터 마지막 } 까지)
  const jsonMatch = clean.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found in response')
  return JSON.parse(jsonMatch[0])
}

function planFallback(data: any) {
  return {
    steps: [
      { order: 1, text: '시작 준비하기', checkinTime: 10, checkinMessage: '준비 됐나요?' },
      { order: 2, text: '1분만 해보기', checkinTime: 14, checkinMessage: '조금이라도 했나요?' },
      { order: 3, text: '마무리하기', checkinTime: 21, checkinMessage: '오늘 어떻게 됐나요?' },
    ],
  }
}

// ══════════════════════════════════════════════
// Legacy: 한 번에 처리 (기존 호환)
// ══════════════════════════════════════════════
async function legacyProcess(goal: string, clarifyAnswer?: string, avoidHours?: number[]) {
  const analysis = await analyzeGoal(goal, clarifyAnswer)
  if (analysis.goal?.needsClarification) return { ...analysis, steps: null }

  const plan = await createPlan({
    goal,
    refined: analysis.goal?.refined,
    timeType: 'avoid',
    selectedHours: avoidHours || [],
    classification: analysis.classification,
  })

  return { ...analysis, ...plan }
}

function legacyFallback(goal: string, clarifyAnswer?: string) {
  const analysis = analyzeFallback(goal, clarifyAnswer)
  if (analysis.goal?.needsClarification) return { ...analysis, steps: null }
  return { ...analysis, ...planFallback({}) }
}
