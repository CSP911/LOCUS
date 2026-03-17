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

import { useState, useRef } from 'react'
import { useStarStore } from '@/store/starStore'
import { QUESTIONS } from '@/lib/questions'

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
    setText('')
    setQIndex(i => (i + 1) % QUESTIONS.length)
    try {
      await throwStar(trimmed)
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

  return (
    <div className="absolute bottom-0 left-0 right-0 px-4 py-3"
      style={{ background: 'rgba(4,6,13,0.92)', borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>

      {/* 화두 질문 */}
      <p className="text-xs mb-2 transition-opacity duration-300"
        style={{ color: 'rgba(148,166,212,0.55)' }}>
        {QUESTIONS[qIndex]}
      </p>

      {/* 입력 영역 */}
      <div className="flex gap-2 items-center">
        <input
          value={text}
          onChange={e => setText(e.target.value.slice(0, 30))}
          onKeyDown={handleKeyDown}
          placeholder="지금 가장 무거운 것을 던져두세요..."
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
        <span className="ml-auto text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>
          {text.length}/30
        </span>
      </div>
    </div>
  )
}
