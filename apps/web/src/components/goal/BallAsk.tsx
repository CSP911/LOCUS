'use client'

import { useState } from 'react'
import { useGoalStore } from '@/store/goalStore'

/**
 * BallAsk — 공 던진 것에 대해 나중에 물어보기
 *
 * 답 안 해도 됨. 부드럽게 물어봄.
 */
export function BallAsk() {
  const unanswered = useGoalStore(s => s.getUnansweredBalls)()
  const answerBall = useGoalStore(s => s.answerBall)
  const [input, setInput] = useState('')
  const [currentIdx, setCurrentIdx] = useState(0)

  // 오늘 이전의 공만 물어봄 (방금 던진 건 안 물어봄)
  const askable = unanswered.filter(b => {
    const elapsed = Date.now() - b.timestamp
    return elapsed > 30 * 60 * 1000 // 30분 이상 지난 것만
  })

  if (askable.length === 0) return null

  const ball = askable[currentIdx % askable.length]
  const time = new Date(ball.timestamp)
  const timeStr = `${time.getHours()}시 ${time.getMinutes()}분`

  function handleAnswer() {
    if (!input.trim()) return
    answerBall(ball.id, input.trim())
    setInput('')
    setCurrentIdx(i => i + 1)
  }

  function handleSkip() {
    // 그냥 넘기기 — 답 안 해도 됨
    setCurrentIdx(i => i + 1)
  }

  return (
    <div
      className="absolute left-0 right-0 flex justify-center pointer-events-auto"
      style={{ top: 60, zIndex: 12 }}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-xl px-4 py-3"
        style={{
          background: 'rgba(6,8,13,0.9)',
          backdropFilter: 'blur(12px)',
          border: '0.5px solid rgba(255,255,255,0.08)',
        }}
      >
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginBottom: 8 }}>
          {timeStr}쯤 뭔가 있었던 것 같은데, 뭐였어요?
        </p>

        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value.slice(0, 30))}
            onKeyDown={e => { if (e.key === 'Enter') handleAnswer() }}
            placeholder="짧게 말해도 돼요..."
            className="flex-1 px-3 py-2 rounded-lg text-sm text-white"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              fontSize: 12,
            }}
          />
          <button
            onClick={handleAnswer}
            disabled={!input.trim()}
            className="px-3 py-2 rounded-lg text-xs"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            답
          </button>
        </div>

        <button
          onClick={handleSkip}
          className="mt-2 text-xs"
          style={{ color: 'rgba(255,255,255,0.15)' }}
        >
          기억 안 나요
        </button>
      </div>
    </div>
  )
}
