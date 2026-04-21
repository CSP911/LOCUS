import { Router } from 'express'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'

export const processGoalRouter = Router()

const schema = z.object({
  goal: z.string().min(1).max(100),
  clarifyAnswer: z.string().optional(),
})

/**
 * POST /process-goal
 *
 * 사용자 목표를 한 번에 처리:
 * 1. 목표 정리 + 모호 시 추가 질문
 * 2. Weight 4축 분류
 * 3. 부담 없는 단계별 플랜 × 각각 알람 시간
 */
processGoalRouter.post('/', async (req, res, next) => {
  try {
    const { goal, clarifyAnswer } = schema.parse(req.body)

    let result
    try {
      result = await processWithClaude(goal, clarifyAnswer)
    } catch (err) {
      console.error('[process-goal] Claude error:', err)
      result = processFallback(goal, clarifyAnswer)
    }

    res.json(result)
  } catch (err) {
    next(err)
  }
})

async function processWithClaude(goal: string, clarifyAnswer?: string) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('no key')

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const userMessage = clarifyAnswer
    ? `원래 목표: "${goal}"\n구체화 답변: "${clarifyAnswer}"\n\n중요: 이미 한 번 되물었습니다. needsClarification을 반드시 false로 하고 모든 필드를 채워주세요.`
    : `목표: "${goal}"`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 700,
    system: `당신은 LŌCUS 도전과제 설계자입니다. 사용자의 목표를 분석하고 부담 없는 단계별 플랜을 설계합니다.

■ 응답 형식 (JSON만, 설명 없이):
{
  "goal": {
    "original": "사용자 원문",
    "needsClarification": true/false,
    "clarifyQuestion": "구체화 질문 (needsClarification=true일 때만)",
    "refined": "구체화된 최종 목표 (needsClarification=false일 때)"
  },
  "classification": {
    "domain": "X/Y/Z",
    "intensity": 1-5,
    "direction": "in/out",
    "nature": ["unresolved"/"recurring"/"onetime"]
  },
  "steps": [
    {
      "order": 1,
      "text": "가장 작고 쉬운 첫 단계",
      "checkinTime": 10,
      "checkinMessage": "체크인 메시지"
    },
    {
      "order": 2,
      "text": "다음 단계",
      "checkinTime": 14,
      "checkinMessage": "체크인 메시지"
    },
    {
      "order": 3,
      "text": "마무리 단계",
      "checkinTime": 21,
      "checkinMessage": "체크인 메시지"
    }
  ]
}

■ 단계 설계 규칙:
- 2~4단계로 나눔 (목표 복잡도에 따라)
- 각 단계는 1~5분 안에 끝나는 수준
- 실패가 불가능할 정도로 작게
- 순서대로 진행하면 자연스럽게 목표 달성
- 첫 단계는 "준비" 수준 (물건 꺼내기, 앱 열기 등)
- 마지막 단계는 "마무리/확인" 수준
- checkinTime: 각 단계에 맞는 시간 (6~23 정수)
  아침 과제: 8→12→20 / 업무 과제: 10→15→18 / 저녁 과제: 14→19→22
- checkinMessage: 친근한 톤, 판단 없이 진행 여부만 물어봄, "~했나요?" / "~어때요?"

■ 목표 판단:
- needsClarification: "했다/안했다" 판단이 어려울 만큼 모호하면 true
- "운동하기"→true, "30분 달리기"→false, "책 읽기"→true, "1챕터 읽기"→false
- needsClarification=true이면 steps는 null

■ 분류:
- domain: X(건강/몸/수면/운동), Y(일/공부/성과/책임), Z(관계/사람/소통)
- intensity: 텍스트에 담긴 무게감
- direction: in(내가 통제 가능), out(타인/환경)
- nature: "또/항상/매번"→recurring, "아직/계속"→unresolved, 단발→onetime

■ 절대 금지:
- 위로/힐링/진단/조언
- "해야 합니다", "하세요" 톤
- 감정 라벨링`,
    messages: [{ role: 'user', content: userMessage }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'
  const clean = raw.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

function processFallback(goal: string, clarifyAnswer?: string) {
  const finalGoal = clarifyAnswer ? `${goal} — ${clarifyAnswer}` : goal

  const isVague = finalGoal.length <= 5 || /하기$|하기!$|읽기$|하자$/.test(finalGoal)
  if (isVague && !clarifyAnswer) {
    return {
      goal: {
        original: goal,
        needsClarification: true,
        clarifyQuestion: `"${goal}" — 조금만 더 구체적으로 알려줄래요? 어떤 걸 얼마나?`,
        refined: null,
      },
      classification: null,
      steps: null,
    }
  }

  return {
    goal: {
      original: goal,
      needsClarification: false,
      clarifyQuestion: null,
      refined: finalGoal,
    },
    classification: {
      domain: 'Y',
      intensity: 3,
      direction: 'in',
      nature: ['onetime'],
    },
    steps: [
      { order: 1, text: '시작 준비하기', checkinTime: 10, checkinMessage: '준비 됐나요?' },
      { order: 2, text: `${finalGoal} — 1분만 해보기`, checkinTime: 14, checkinMessage: '조금이라도 했나요?' },
      { order: 3, text: '한 것 확인하기', checkinTime: 21, checkinMessage: '오늘 어떻게 됐나요?' },
    ],
  }
}
