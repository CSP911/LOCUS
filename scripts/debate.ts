#!/usr/bin/env npx tsx
/**
 * LŌCUS Debate System
 *
 * 4명의 페르소나가 주어진 주제로 라운드 토론을 진행.
 * 결과는 debates/ 폴더에 마크다운으로 저장.
 *
 * Usage:
 *   npm run debate "주제"
 *   npm run debate "주제" --rounds 7
 */

import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'fs'
import * as path from 'path'

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.+)$/)
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim()
    }
  })
}

// ── Config ────────────────────────────────────────
const MODEL = 'claude-haiku-4-5-20251001'
const DEFAULT_ROUNDS = 5
const MAX_TOKENS_PER_TURN = 300

const PERSONAS_DIR = path.join(__dirname, 'personas')
const DEBATES_DIR = path.join(__dirname, '..', 'debates')
const LOCUS_PLANNING = path.join(__dirname, '..', 'LŌCUS_Planning_v1.2.docx')

// ── Load personas ─────────────────────────────────
interface Persona {
  name: string
  file: string
  prompt: string
}

function loadPersonas(): Persona[] {
  const files = fs.readdirSync(PERSONAS_DIR).filter(f => f.endsWith('.md'))
  return files.map(f => {
    const content = fs.readFileSync(path.join(PERSONAS_DIR, f), 'utf-8')
    const nameMatch = content.match(/^# (.+)/m)
    const name = nameMatch ? nameMatch[1].split('—')[0].trim() : f.replace('.md', '')
    return { name, file: f, prompt: content }
  })
}

// ── Debate logic ──────────────────────────────────
async function runDebate(topic: string, rounds: number) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set. Add it to .env.local or export it.')
    process.exit(1)
  }

  const client = new Anthropic({ apiKey })
  const personas = loadPersonas()
  const history: { speaker: string; message: string }[] = []

  console.log(`\n🌌 LŌCUS Debate`)
  console.log(`   주제: ${topic}`)
  console.log(`   참여자: ${personas.map(p => p.name).join(', ')}`)
  console.log(`   라운드: ${rounds}\n`)

  // LŌCUS context
  const locusContext = `
LŌCUS는 "당신의 중심점" — 사용자가 일상의 것들을 텍스트로 던지면 3D 성운 공간에 별로 쌓이고,
Gravity가 형성되면 조용히 한 줄 제안(Signal)이 올라오는 앱.
핵심 철학: 위로/힐링 아님. 정렬/튜닝 도구. 진단/조언/감정라벨 금지.
Weight 4축: Domain(X기반/Y성과/Z관계), Intensity(1~5), Direction(in/out), Nature(미결/반복/일회).
현재 상태: 3D 시각화 구현, Claude API 분류, Signal/Core Perspective 구현,
데이터 영속성 없음(클라이언트 메모리만), 인증 없음.
`

  for (let round = 1; round <= rounds; round++) {
    console.log(`── 라운드 ${round} ──────────────────────`)

    for (const persona of personas) {
      // Build conversation context
      const recentHistory = history.slice(-8)
        .map(h => `[${h.speaker}]: ${h.message}`)
        .join('\n\n')

      const systemPrompt = `${persona.prompt}

## 토론 맥락
${locusContext}

## 규칙
- 한국어로 답한다
- 2~4문장으로 간결하게 말한다
- 다른 참여자의 발언에 반응하되, 자기 관점을 유지한다
- 동의할 때는 근거를 추가하고, 반대할 때는 대안을 제시한다
- 라운드가 진행될수록 구체적인 결론/제안으로 수렴한다
${round === rounds ? '- 마지막 라운드: 핵심 제안 하나를 명확하게 말한다' : ''}`

      const userMessage = round === 1 && history.length === 0
        ? `토론 주제: "${topic}"\n\n당신의 관점에서 첫 발언을 해주세요.`
        : `토론 주제: "${topic}"\n\n지금까지의 대화:\n${recentHistory}\n\n이에 대한 당신의 의견을 말해주세요.`

      try {
        const response = await client.messages.create({
          model: MODEL,
          max_tokens: MAX_TOKENS_PER_TURN,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        })

        const text = response.content[0].type === 'text'
          ? response.content[0].text.trim()
          : '(응답 없음)'

        history.push({ speaker: persona.name, message: text })
        console.log(`\n[${persona.name}]`)
        console.log(text)
      } catch (err: any) {
        console.error(`  ⚠ ${persona.name} 응답 실패:`, err.message)
        history.push({ speaker: persona.name, message: '(응답 실패)' })
      }

      // Rate limit buffer
      await sleep(500)
    }

    console.log('')
  }

  // ── Save result ───────────────────────────────
  const date = new Date().toISOString().slice(0, 10)
  const slug = topic.slice(0, 30).replace(/[^가-힣a-zA-Z0-9]/g, '-')
  const filename = `${date}_${slug}.md`
  const filepath = path.join(DEBATES_DIR, filename)

  const md = buildMarkdown(topic, personas, history, rounds)
  fs.mkdirSync(DEBATES_DIR, { recursive: true })
  fs.writeFileSync(filepath, md, 'utf-8')

  console.log(`\n✅ 토론 결과 저장: debates/${filename}`)
}

function buildMarkdown(
  topic: string,
  personas: Persona[],
  history: { speaker: string; message: string }[],
  rounds: number,
): string {
  const lines: string[] = [
    `# LŌCUS Debate`,
    ``,
    `**주제**: ${topic}`,
    `**일시**: ${new Date().toISOString()}`,
    `**참여자**: ${personas.map(p => p.name).join(', ')}`,
    `**라운드**: ${rounds}`,
    ``,
    `---`,
    ``,
  ]

  let currentRound = 0
  const persPerRound = personas.length

  history.forEach((h, i) => {
    const round = Math.floor(i / persPerRound) + 1
    if (round !== currentRound) {
      currentRound = round
      lines.push(`## 라운드 ${round}`, '')
    }
    lines.push(`### ${h.speaker}`, '', h.message, '')
  })

  // Summary section
  lines.push(
    `---`,
    ``,
    `## 핵심 요약`,
    ``,
    `> 이 섹션은 토론 결과를 읽는 사람(또는 Claude Code)이 채워주세요.`,
    ``,
  )

  return lines.join('\n')
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ── CLI ───────────────────────────────────────────
const args = process.argv.slice(2)
const topic = args.find(a => !a.startsWith('--'))
const roundsFlag = args.indexOf('--rounds')
const rounds = roundsFlag !== -1 ? parseInt(args[roundsFlag + 1]) : DEFAULT_ROUNDS

if (!topic) {
  console.log('Usage: npm run debate "토론 주제" [--rounds N]')
  console.log('Example: npm run debate "LŌCUS를 매일 쓰게 만드는 핵심 가치는 무엇인가"')
  process.exit(0)
}

runDebate(topic, rounds)
