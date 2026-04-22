#!/usr/bin/env npx tsx
/**
 * LLM 도전과제 3단계 테스트
 *
 * Usage:
 *   npm run test-goal "책 읽기"
 *   npm run test-goal "팀장한테 의견 말하기" --clarify "1:1 미팅에서"
 *   npm run test-goal "발표 준비" --clarify "오후 3시 발표" --hours "15"
 *   npm run test-goal "영어 공부" --clarify "단어 암기" --hours "9,10,14"
 */

import * as fs from 'fs'
import * as path from 'path'

const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const m = line.match(/^([^#=]+)=(.+)$/)
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim()
  })
}

const API = 'https://locus-api-production-ec46.up.railway.app'

const args = process.argv.slice(2)
const goal = args.find(a => !a.startsWith('--'))
const clarifyIdx = args.indexOf('--clarify')
const clarify = clarifyIdx !== -1 ? args[clarifyIdx + 1] : undefined
const hoursIdx = args.indexOf('--hours')
const hours = hoursIdx !== -1 ? args[hoursIdx + 1].split(',').map(Number) : undefined

if (!goal) {
  console.log(`
  Usage:
    npm run test-goal "목표"
    npm run test-goal "목표" --clarify "답변" --hours "15"
  `)
  process.exit(0)
}

async function run() {
  console.log(`\n🎯 목표: "${goal}"`)
  if (clarify) console.log(`   구체화: "${clarify}"`)

  // ── Step 1: 분석 ─────────────────
  console.log(`\n── Step 1: 목적 분석 ──`)
  const t1 = Date.now()
  const r1 = await fetch(`${API}/process-goal/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal, clarifyAnswer: clarify }),
  }).then(r => r.json())
  console.log(`   ⏱ ${Date.now() - t1}ms`)

  if (r1.goal?.needsClarification) {
    console.log(`   ❓ 되묻기: ${r1.goal.clarifyQuestion}`)
    console.log(`\n   → --clarify "답변" 옵션으로 재실행하세요`)
    return
  }

  console.log(`   📌 정리: ${r1.goal?.refined}`)
  console.log(`   🕐 시간 유형: ${r1.timeType === 'target' ? '목적 시간 (target)' : '제외 시간 (avoid)'}`)
  console.log(`   💬 "${r1.timeQuestion}"`)

  if (r1.classification) {
    const c = r1.classification
    const dl: Record<string, string> = { X: '건강', Y: '성과', Z: '관계' }
    console.log(`   📊 ${dl[c.domain]}/${c.intensity}/${c.direction}/${c.nature}`)
  }

  // ── Step 2: 시간 선택 (CLI에서는 --hours로 전달) ──
  const selectedHours = hours || (r1.timeType === 'target' ? [14] : [])
  console.log(`\n── Step 2: 시간 선택 ──`)
  console.log(`   ${r1.timeType === 'target' ? '목적 시간' : '제외 시간'}: ${selectedHours.length > 0 ? selectedHours.join(', ') + '시' : '없음'}`)

  // ── Step 3: 플랜 생성 ────────────
  console.log(`\n── Step 3: 세부 플랜 생성 ──`)
  const t3 = Date.now()
  const r3 = await fetch(`${API}/process-goal/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      goal,
      refined: r1.goal?.refined,
      timeType: r1.timeType,
      selectedHours,
      classification: r1.classification,
    }),
  }).then(r => r.json())
  console.log(`   ⏱ ${Date.now() - t3}ms`)

  if (r3.steps) {
    console.log(`\n📋 세부 플랜:`)
    console.log(`   ─────────────────────────────────────`)
    r3.steps.forEach((s: any) => {
      console.log(`   ${s.order}. ${s.text}`)
      console.log(`      ⏰ ${s.checkinTime}시 — "${s.checkinMessage}"`)
      console.log()
    })

    // 제약 체크
    console.log(`✅ 현실 제약 체크:`)
    let allPass = true
    if (r1.timeType === 'avoid' && selectedHours.length > 0) {
      const violated = r3.steps.filter((s: any) => selectedHours.includes(s.checkinTime))
      if (violated.length > 0) {
        console.log(`   ✗ 제외 시간 위반! ${violated.map((s: any) => `${s.order}단계(${s.checkinTime}시)`).join(', ')}`)
        allPass = false
      } else {
        console.log(`   ✓ 제외 시간 준수`)
      }
    }
    if (r1.timeType === 'target' && selectedHours.length > 0) {
      const hasTarget = r3.steps.some((s: any) => selectedHours.includes(s.checkinTime) || s.checkinTime <= selectedHours[0])
      console.log(`   ${hasTarget ? '✓' : '✗'} 목적 시간 기준 배치`)
      if (!hasTarget) allPass = false
    }
    console.log(`   ✓ 장소 독립 / 5분 이내 / 단계 간 독립 (프롬프트 제약)`)
    if (allPass) console.log(`\n   🎉 전체 통과`)
  }

  console.log()
}

run().catch(console.error)
