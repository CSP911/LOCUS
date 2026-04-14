'use client'

/**
 * ThrowInput — 던지기 입력 인터페이스
 *
 * 화두 질문 + 텍스트 입력 + 던지기 버튼.
 * 입력 후 별이 Field로 날아가는 애니메이션 트리거.
 *
 * TODO:
 * - 화두 질문 로테이션 (30~50개 풀)
 * - 던지기 후 비행 애니메이션 연결
 * - 30자 제한 카운터
 * - AI 분류 API 연동
 */

import { useState, useRef, useCallback, TouchEvent } from 'react'
import { useStarStore } from '@/store/starStore'
import { QUESTIONS } from '@/lib/questions'

// ── Dev 테스트 샘플 ──────────────────────────────
const TEST_SAMPLES = [
  // X (기반) — 부정
  '요즘 잠을 너무 못 잔다',
  '운동을 또 빼먹었다',
  '밥을 대충 때우고 있다',
  '몸이 계속 무겁다',
  '피곤한데 쉴 수가 없다',
  '잠들기 전에 생각이 너무 많다',
  // X (기반) — 긍정
  '오늘 오랜만에 잘 잤다',
  '산책했는데 기분이 좋았다',
  '집 정리를 끝냈다',
  // Y (성과) — 부정
  '마감이 아직도 안 끝났다',
  '상사가 또 무시하는 느낌',
  '발표 준비가 계속 걸린다',
  '야근이 매번 반복된다',
  '실수한 게 자꾸 떠오른다',
  '할 일이 계속 밀린다',
  '이 일이 맞는 건지 모르겠다',
  // Y (성과) — 긍정
  '프로젝트를 드디어 끝냈다',
  '오늘 발표 잘했다는 말을 들었다',
  '집중이 잘 됐던 하루였다',
  '새로운 걸 배웠다',
  // Z (관계) — 부정
  '친구한테 연락을 못 하고 있다',
  '혼자 있는 시간이 너무 많다',
  '가족한테 신경을 못 쓰고 있다',
  '대화가 점점 줄고 있다',
  '외롭다는 걸 인정하기 싫다',
  // Z (관계) — 긍정
  '오랜만에 친구를 만났다',
  '좋은 대화를 나눴다',
  '고마운 사람이 떠올랐다',
  // 공통 — 열림
  '아직도 그 말이 머릿속에 맴돈다',
  '뭔가 계속 찜찜하다',
  '오늘 작지만 좋은 일이 있었다',
  '하고 싶은 게 생겼다',
  '요즘이랑 한 달 전이 다르다',
  '시간 가는 줄 몰랐다',
  '오늘 웃었다',
  '뭘 해야 할지 모르겠다',
  '끝낸 게 있어서 홀가분하다',
]

const DOMAIN_COLORS = {
  X: 'var(--color-foundation)',
  Y: 'var(--color-output)',
  Z: 'var(--color-connection)',
} as const

export function ThrowInput() {
  const [text, setText] = useState('')
  const [qIndex, setQIndex] = useState(0)
  const throwStar = useStarStore(s => s.throwStar)
  const throwingRef = useRef(false)

  const handleThrow = async () => {
    const trimmed = text.trim()
    if (!trimmed || throwingRef.current) return
    throwingRef.current = true
    const currentQuestion = QUESTIONS[qIndex]
    setText('')
    setQIndex(i => (i + 1) % QUESTIONS.length)
    try {
      await throwStar(trimmed, currentQuestion)
    } finally {
      throwingRef.current = false
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleThrow()
    }
  }

  // Swipe to throw
  const touchStartY = useRef(0)
  const [swiping, setSwiping] = useState(false)

  const handleTouchStart = (e: TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: TouchEvent) => {
    const deltaY = touchStartY.current - e.changedTouches[0].clientY
    // 50px 이상 위로 스와이프하면 던지기
    if (deltaY > 50 && text.trim()) {
      setSwiping(true)
      handleThrow().then(() => setSwiping(false))
    }
  }

  // Dev: 샘플 일괄 입력
  const [seeding, setSeeding] = useState(false)
  const handleSeed = useCallback(async () => {
    if (seeding) return
    setSeeding(true)
    for (let i = 0; i < TEST_SAMPLES.length; i++) {
      const q = QUESTIONS[i % QUESTIONS.length]
      await throwStar(TEST_SAMPLES[i], q)
      // API rate limit 방지 — 간격 두고 던짐
      await new Promise(r => setTimeout(r, 1500))
    }
    setSeeding(false)
  }, [seeding, throwStar])

  return (
    <div
      className="absolute bottom-0 left-0 right-0 px-4 py-3"
      style={{
        background: 'rgba(4,6,13,0.92)',
        borderTop: '0.5px solid rgba(255,255,255,0.07)',
        transform: swiping ? 'translateY(-20px)' : 'translateY(0)',
        opacity: swiping ? 0.5 : 1,
        transition: 'transform 0.3s, opacity 0.3s',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}>

      {/* 화두 질문 + 스와이프 힌트 */}
      <div className="flex justify-between items-center mb-2">
        <p className="text-xs transition-opacity duration-300"
          style={{ color: 'rgba(148,166,212,0.55)' }}>
          {QUESTIONS[qIndex]}
        </p>
        {text.trim() && (
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.12)' }}>
            ↑ 스와이프로 던지기
          </span>
        )}
      </div>

      {/* 입력 영역 */}
      <div className="flex gap-2 items-center">
        <input
          value={text}
          onChange={e => setText(e.target.value.slice(0, 30))}
          onKeyDown={handleKeyDown}
          placeholder="머릿속에 있는 것을 던져두세요..."
          className="flex-1 px-3 py-2.5 rounded-xl text-sm text-white"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '0.5px solid rgba(255,255,255,0.11)',
            fontSize: 13,
          }}
        />
        <button
          onClick={handleThrow}
          disabled={!text.trim()}
          className="px-4 py-2.5 rounded-xl text-sm transition-all"
          style={{
            background: 'rgba(75,95,190,0.18)',
            border: '0.5px solid rgba(75,95,190,0.3)',
            color: '#8595d2',
            fontSize: 13,
          }}
        >
          던지기
        </button>
      </div>

      {/* 도메인 범례 + 글자수 */}
      <div className="flex gap-3 mt-2 items-center">
        {(['X', 'Y', 'Z'] as const).map(d => (
          <span key={d} className="flex items-center gap-1.5 text-xs"
            style={{ color: 'rgba(255,255,255,0.2)' }}>
            <span className="w-1.5 h-1.5 rounded-full"
              style={{ background: DOMAIN_COLORS[d], display: 'inline-block' }} />
            {d === 'X' ? '기반' : d === 'Y' ? '성과' : '관계'}
          </span>
        ))}

        {/* Dev: 샘플 채우기 버튼 */}
        {process.env.NODE_ENV === 'development' && (
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="text-xs ml-2 px-2 py-0.5 rounded"
            style={{
              color: 'rgba(255,255,255,0.25)',
              border: '0.5px solid rgba(255,255,255,0.1)',
            }}
          >
            {seeding ? `채우는 중...` : 'DEV: 샘플 채우기'}
          </button>
        )}

        <span className="ml-auto text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>
          {text.length}/30
        </span>
      </div>
    </div>
  )
}
