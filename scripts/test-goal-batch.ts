#!/usr/bin/env npx tsx
/**
 * LLM 도전과제 배치 테스트
 *
 * Usage:
 *   npm run test-batch
 *   npm run test-batch -- --only 5    (앞에서 5개만)
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

// ── 테스트 케이스 50개 ────────────────────────
interface TestCase {
  goal: string
  clarify?: string
  hours?: number[]
  expectedTimeType?: 'target' | 'avoid'
  expectedDomain?: string
  description: string
}

const CASES: TestCase[] = [
  // ── 건강/운동 (X) ──────────────────
  { goal: '운동하기', description: '모호 — 되묻기 기대', expectedDomain: 'X' },
  { goal: '30분 달리기', description: '구체적 — 바로 플랜', expectedDomain: 'X', expectedTimeType: 'avoid' },
  { goal: '운동하기', clarify: '헬스장에서 1시간', hours: [9, 10], description: '제외 시간 있는 운동', expectedTimeType: 'avoid' },
  { goal: '스트레칭 10분', description: '간단 운동', expectedDomain: 'X' },
  { goal: '물 2리터 마시기', description: '하루 종일 분산', expectedDomain: 'X', expectedTimeType: 'avoid' },
  { goal: '7시간 수면', description: '수면 목표', expectedDomain: 'X' },
  { goal: '산책하기', clarify: '퇴근 후 30분', description: '시간대 있는 운동', expectedTimeType: 'avoid' },
  { goal: '명상 15분', description: '짧은 집중', expectedDomain: 'X' },

  // ── 업무/성과 (Y) ──────────────────
  { goal: '보고서 끝내기', description: '모호 — 되묻기 기대', expectedDomain: 'Y' },
  { goal: '보고서 끝내기', clarify: '오늘 3페이지', hours: [12, 13], description: '점심 피한 업무', expectedTimeType: 'avoid' },
  { goal: '발표 준비', clarify: '오후 3시 팀 발표', hours: [15], description: '목적 시간 — 역산', expectedTimeType: 'target' },
  { goal: '이메일 5개 답장', description: '구체적 업무', expectedDomain: 'Y', expectedTimeType: 'avoid' },
  { goal: '면접 준비', clarify: '내일 오전 10시 면접', hours: [10], description: '내일 목적 — 오늘 준비', expectedTimeType: 'target' },
  { goal: '코딩 1시간', hours: [9, 10, 18, 19], description: '집중 시간 제외', expectedTimeType: 'avoid' },
  { goal: '기획서 초안 작성', description: '모호 — 분량 되묻기', expectedDomain: 'Y' },
  { goal: '기획서 초안 작성', clarify: '목차만 먼저', description: '구체화된 업무', expectedTimeType: 'avoid' },
  { goal: '회의 준비', clarify: '2시 팀 회의 안건 정리', hours: [14], description: '회의 목적 시간', expectedTimeType: 'target' },
  { goal: '자격증 공부', clarify: '문제집 10문제', hours: [8, 9], description: '아침 피한 공부', expectedTimeType: 'avoid' },
  { goal: '포트폴리오 업데이트', description: '모호', expectedDomain: 'Y' },
  { goal: '블로그 글 쓰기', clarify: '500자 짧은 글', description: '구체적 작성', expectedTimeType: 'avoid' },

  // ── 관계 (Z) ──────────────────────
  { goal: '엄마한테 전화하기', description: '구체적 관계', expectedDomain: 'Z', expectedTimeType: 'avoid' },
  { goal: '친구 만나기', clarify: '저녁 7시 약속', hours: [19], description: '약속 시간 — 목적', expectedTimeType: 'target' },
  { goal: '팀장한테 의견 말하기', description: '모호 — 상황 되묻기', expectedDomain: 'Z' },
  { goal: '팀장한테 의견 말하기', clarify: '1:1 미팅에서 솔직하게', hours: [12, 13], description: '관계 + 제외 시간', expectedTimeType: 'avoid' },
  { goal: '감사 편지 쓰기', clarify: '선생님께 짧게', description: '관계 과제', expectedDomain: 'Z' },
  { goal: '동료한테 피드백 주기', clarify: '오늘 오후 미팅에서', hours: [16], description: '미팅 목적 시간', expectedTimeType: 'target' },
  { goal: '연락 안 한 친구에게 메시지', description: '간단 관계', expectedDomain: 'Z' },

  // ── 자기계발/학습 ──────────────────
  { goal: '책 읽기', description: '모호 — 되묻기', expectedDomain: 'Y' },
  { goal: '책 읽기', clarify: '자기계발서 편하게', hours: [9, 10, 14, 15], description: '자유 독서 + 피할 시간', expectedTimeType: 'avoid' },
  { goal: '영어 공부', clarify: '단어 30개 암기', hours: [9, 10, 14], description: '학습 + 피할 시간', expectedTimeType: 'avoid' },
  { goal: '일기 쓰기', description: '구체적', expectedDomain: 'Y', expectedTimeType: 'avoid' },
  { goal: '새로운 기술 배우기', description: '모호 — 되묻기', expectedDomain: 'Y' },
  { goal: '새로운 기술 배우기', clarify: 'React 튜토리얼 1개', description: '구체화된 학습', expectedTimeType: 'avoid' },
  { goal: '온라인 강의 듣기', clarify: '30분 짜리 하나', hours: [7, 8, 22, 23], description: '이른/늦은 시간 피함', expectedTimeType: 'avoid' },

  // ── 생활/정리 ──────────────────────
  { goal: '방 정리', description: '모호 — 범위 되묻기', expectedDomain: 'X' },
  { goal: '방 정리', clarify: '책상 위만', description: '구체화된 정리', expectedTimeType: 'avoid' },
  { goal: '장보기', clarify: '퇴근 후 마트', hours: [18], description: '시간 있는 생활', expectedTimeType: 'target' },
  { goal: '요리하기', clarify: '저녁 간단하게', hours: [19], description: '저녁 목적 시간', expectedTimeType: 'target' },
  { goal: '세탁기 돌리기', description: '간단 생활', expectedDomain: 'X', expectedTimeType: 'avoid' },
  { goal: '병원 예약하기', description: '구체적 할 일', expectedTimeType: 'avoid' },

  // ── 도전적/감정적 ─────────────────
  { goal: '하루 불평 안 하기', description: '행동 목표 — 하루 종일', expectedTimeType: 'avoid' },
  { goal: '핸드폰 1시간 안 보기', description: '제한 목표', expectedTimeType: 'avoid' },
  { goal: '새로운 사람한테 말 걸기', description: '도전적 관계', expectedDomain: 'Z' },
  { goal: '거절 연습', clarify: '부탁 하나 정중하게 거절', description: '구체적 도전', expectedDomain: 'Z' },
  { goal: '일찍 퇴근하기', clarify: '오늘 6시 칼퇴', hours: [18], description: '목적 시간', expectedTimeType: 'target' },

  // ── 엣지 케이스 ───────────────────
  { goal: '아', description: '극단적 모호 — 반드시 되묻기' },
  { goal: '행복해지기', description: '추상적 — 되묻기' },
  { goal: '오늘 하루 잘 보내기', description: '너무 넓음 — 되묻기' },
  { goal: '매출 200% 올리기', description: '비현실적 — 어떻게 처리?' },
  { goal: '10km 마라톤 완주', description: '큰 목표 — 오늘 할 수 있는 단위로' },
]

// ── 실행 ──────────────────────────────────────
const args = process.argv.slice(2)
const onlyIdx = args.indexOf('--only')
const limit = onlyIdx !== -1 ? parseInt(args[onlyIdx + 1]) : CASES.length

async function runAll() {
  const results: { case: TestCase; pass: boolean; issues: string[]; time: number }[] = []

  console.log(`\n🧪 LŌCUS 도전과제 배치 테스트 (${Math.min(limit, CASES.length)}/${CASES.length}개)\n`)

  for (let i = 0; i < Math.min(limit, CASES.length); i++) {
    const tc = CASES[i]
    const issues: string[] = []
    const start = Date.now()

    process.stdout.write(`  [${i + 1}/${Math.min(limit, CASES.length)}] "${tc.goal}" ${tc.clarify ? `→ "${tc.clarify}"` : ''} ... `)

    try {
      // Step 1: Analyze
      const r1 = await fetch(`${API}/process-goal/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: tc.goal, clarifyAnswer: tc.clarify }),
      }).then(r => r.json())

      if (r1.goal?.needsClarification) {
        if (tc.clarify) issues.push('구체화했는데도 되묻기')
        if (tc.hours) issues.push('시간 줬는데 되묻기 단계에서 멈춤')
        const ms = Date.now() - start
        console.log(`❓ 되묻기 (${ms}ms) — "${r1.goal?.clarifyQuestion?.slice(0, 40)}"`)
        results.push({ case: tc, pass: issues.length === 0, issues, time: ms })
        await sleep(500)
        continue
      }

      // timeType 검증
      if (tc.expectedTimeType && r1.timeType !== tc.expectedTimeType) {
        issues.push(`timeType: 기대 ${tc.expectedTimeType}, 실제 ${r1.timeType}`)
      }

      // domain 검증
      if (tc.expectedDomain && r1.classification?.domain !== tc.expectedDomain) {
        issues.push(`domain: 기대 ${tc.expectedDomain}, 실제 ${r1.classification?.domain}`)
      }

      // Step 3: Plan (시간 있을 때만)
      if (tc.hours) {
        const r3 = await fetch(`${API}/process-goal/plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goal: tc.goal,
            refined: r1.goal?.refined,
            timeType: r1.timeType,
            selectedHours: tc.hours,
            classification: r1.classification,
          }),
        }).then(r => r.json())

        if (!r3.steps || r3.steps.length === 0) {
          issues.push('플랜 없음')
        } else {
          // 피할 시간 검증
          if (tc.expectedTimeType === 'avoid') {
            const violated = r3.steps.filter((s: any) => tc.hours!.includes(s.checkinTime))
            if (violated.length > 0) {
              issues.push(`제외시간 위반: ${violated.map((s: any) => s.checkinTime + '시').join(',')}`)
            }
          }
          // checkinTime 범위 검증
          const badTimes = r3.steps.filter((s: any) => s.checkinTime < 6 || s.checkinTime > 23 || !Number.isInteger(s.checkinTime))
          if (badTimes.length > 0) {
            issues.push(`시간 범위 오류: ${badTimes.map((s: any) => s.checkinTime).join(',')}`)
          }
        }
      }

      const ms = Date.now() - start
      const status = issues.length === 0 ? '✅' : '⚠️'
      console.log(`${status} (${ms}ms) ${issues.length > 0 ? issues.join(' / ') : `timeType=${r1.timeType}`}`)
      results.push({ case: tc, pass: issues.length === 0, issues, time: ms })

    } catch (err: any) {
      const ms = Date.now() - start
      console.log(`❌ 에러 (${ms}ms) — ${err.message?.slice(0, 60)}`)
      issues.push(`에러: ${err.message}`)
      results.push({ case: tc, pass: false, issues, time: ms })
    }

    await sleep(800) // rate limit 방지
  }

  // ── 결과 요약 ──────────────────────
  const passed = results.filter(r => r.pass).length
  const failed = results.filter(r => !r.pass).length
  const avgTime = Math.round(results.reduce((s, r) => s + r.time, 0) / results.length)

  console.log(`\n${'═'.repeat(50)}`)
  console.log(`  ✅ 통과: ${passed}  ⚠️ 이슈: ${failed}  ⏱ 평균: ${avgTime}ms`)
  console.log(`${'═'.repeat(50)}`)

  if (failed > 0) {
    console.log(`\n이슈 목록:`)
    results.filter(r => !r.pass).forEach(r => {
      console.log(`  - "${r.case.goal}" ${r.case.clarify ? `→ "${r.case.clarify}"` : ''}: ${r.issues.join(', ')}`)
    })
  }

  // 결과 파일 저장
  const outPath = path.join(__dirname, '..', 'test-results', `${new Date().toISOString().slice(0, 10)}.json`)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify({ date: new Date().toISOString(), total: results.length, passed, failed, avgTime, results: results.map(r => ({ goal: r.case.goal, clarify: r.case.clarify, pass: r.pass, issues: r.issues, time: r.time })) }, null, 2))
  console.log(`\n결과 저장: ${outPath}\n`)
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

runAll().catch(console.error)
