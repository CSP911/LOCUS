import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { Domain } from '@locus/shared'

/**
 * POST /api/perspective
 *
 * Gravity 데이터를 받아 Core Perspective(관찰문)를 생성.
 * 진단/조언/위로 금지. 사실의 목격만.
 */
export async function POST(req: NextRequest) {
  try {
    const { gravityData } = await req.json()

    if (!gravityData) {
      return NextResponse.json({ error: 'gravityData required' }, { status: 400 })
    }

    let perspective: string
    try {
      perspective = await generateWithClaude(gravityData)
    } catch (e) {
      console.warn('[perspective] Claude failed, using fallback:', e)
      perspective = generateFallback(gravityData)
    }

    return NextResponse.json({ perspective })
  } catch (error) {
    console.error('[perspective] error:', error)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

interface GravityData {
  totalStars: number
  domainMass: { X: number; Y: number; Z: number }
  domainRatio: { X: number; Y: number; Z: number }
  directionRatio: { in: number; out: number }
  natureRatio: { unresolved: number; recurring: number; onetime: number }
  heaviestDomain: Domain
  lightestDomain: Domain
  recentTexts: string[] // 최근 5개 별 텍스트
}

async function generateWithClaude(data: GravityData): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }

  const client = new Anthropic({ apiKey })

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    system: `당신은 LŌCUS Core Perspective 생성기입니다.
사용자의 Gravity 데이터(무게 분포)를 받아, 관찰문 1~2줄을 생성합니다.

■ 절대 규칙:
- 진단 금지 ("스트레스를 받고 있군요" ✗)
- 조언 금지 ("쉬어보세요" ✗)
- 위로 금지 ("괜찮아요" ✗)
- 감정 라벨 금지 ("힘들어 보여요" ✗)
- 질문 금지 ("~하고 있나요?" ✗)

■ 해야 하는 것:
- 사실만 말한다. 데이터가 보여주는 형상을 목격한다.
- 톤: 차분하고 건조. 관찰자의 시점.
- 권장어: 중심, 무게, 실려있다, 향하고 있다, 기울어져 있다, 쌓이고 있다

■ 좋은 예:
- "무게 중심이 성과 쪽으로 기울어져 있습니다. 대부분 끝나지 않은 것들입니다."
- "바깥에서 오는 것들이 안에서 오는 것보다 많습니다."
- "관계 영역은 비어 있고, 기반 영역에 반복되는 것들이 쌓이고 있습니다."

■ 나쁜 예:
- "많이 힘드시겠네요." (위로)
- "일을 줄여보는 건 어떨까요?" (조언)
- "번아웃 징후가 보입니다." (진단)

1~2문장만 반환. 설명이나 부연 없이.`,
    messages: [{
      role: 'user',
      content: `Gravity 데이터:
- 총 ${data.totalStars}개의 별
- 무게 분포: 기반(X) ${Math.round(data.domainRatio.X * 100)}%, 성과(Y) ${Math.round(data.domainRatio.Y * 100)}%, 관계(Z) ${Math.round(data.domainRatio.Z * 100)}%
- 방향: 안(통제 가능) ${Math.round(data.directionRatio.in * 100)}%, 밖(통제 불가) ${Math.round(data.directionRatio.out * 100)}%
- 성격: 미결 ${Math.round(data.natureRatio.unresolved * 100)}%, 반복 ${Math.round(data.natureRatio.recurring * 100)}%, 일회 ${Math.round(data.natureRatio.onetime * 100)}%
- 가장 무거운 영역: ${data.heaviestDomain === 'X' ? '기반' : data.heaviestDomain === 'Y' ? '성과' : '관계'}
- 가장 가벼운 영역: ${data.lightestDomain === 'X' ? '기반' : data.lightestDomain === 'Y' ? '성과' : '관계'}
- 최근 던진 것들: ${data.recentTexts.join(' / ')}`,
    }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  return raw.trim()
}

const DOMAIN_LABEL: Record<Domain, string> = { X: '기반', Y: '성과', Z: '관계' }

function generateFallback(data: GravityData): string {
  const parts: string[] = []

  // 무게 중심
  const heavy = DOMAIN_LABEL[data.heaviestDomain]
  parts.push(`무게 중심이 ${heavy} 쪽으로 기울어져 있습니다.`)

  // 방향
  if (data.directionRatio.out > 0.6) {
    parts.push('대부분 바깥에서 오는 것들입니다.')
  } else if (data.directionRatio.in > 0.6) {
    parts.push('대부분 안에서 오는 것들입니다.')
  }

  // 성격
  if (data.natureRatio.unresolved > 0.5) {
    parts.push('끝나지 않은 것들이 많이 쌓여 있습니다.')
  } else if (data.natureRatio.recurring > 0.4) {
    parts.push('반복되는 것들이 자리잡고 있습니다.')
  }

  return parts.slice(0, 2).join(' ')
}
