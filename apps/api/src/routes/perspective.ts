import { Router } from 'express'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import type { Domain } from '../types/shared'

export const perspectiveRouter = Router()

const schema = z.object({
  gravityData: z.any(),
})

perspectiveRouter.post('/', async (req, res, next) => {
  try {
    const { gravityData } = schema.parse(req.body)

    let perspective: string
    try {
      perspective = await generateWithClaude(gravityData)
    } catch {
      perspective = generateFallback(gravityData)
    }

    res.json({ perspective })
  } catch (err) {
    next(err)
  }
})

async function generateWithClaude(data: any): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('no key')

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    system: `Gravity 데이터를 받아 관찰문 1~2줄 생성.
절대 규칙: 진단 금지, 조언 금지, 위로 금지, 감정 라벨 금지, 질문 금지.
사실만 말한다. 권장어: 중심, 무게, 실려있다, 기울어져 있다, 쌓이고 있다.`,
    messages: [{
      role: 'user',
      content: `Gravity: 총 ${data.totalStars}개, 기반 ${Math.round((data.domainRatio?.X || 0) * 100)}%, 성과 ${Math.round((data.domainRatio?.Y || 0) * 100)}%, 관계 ${Math.round((data.domainRatio?.Z || 0) * 100)}%, 미결 ${Math.round((data.natureRatio?.unresolved || 0) * 100)}%, 반복 ${Math.round((data.natureRatio?.recurring || 0) * 100)}%`,
    }],
  })

  return (message.content[0].type === 'text' ? message.content[0].text : '').trim()
}

const DOMAIN_LABEL: Record<Domain, string> = { X: '기반', Y: '성과', Z: '관계' }

function generateFallback(data: any): string {
  const heavy = data.heaviestDomain || 'Y'
  return `무게 중심이 ${DOMAIN_LABEL[heavy as Domain]} 쪽으로 기울어져 있습니다.`
}
