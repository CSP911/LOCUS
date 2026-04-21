'use client'

import { useState, useRef } from 'react'
import { useGoalStore } from '@/store/goalStore'
import { useStarStore } from '@/store/starStore'
import { classifyText } from '@/lib/classify-client'
import { apiCall } from '@/lib/api'
import type { Domain } from '@locus/shared'

/**
 * GoalInput — 목표 추가 + 공 던지기
 *
 * 두 가지 모드:
 * 1. 텍스트 입력 → 새 목표 추가
 * 2. 공 버튼 탭 → 텍스트 없는 공 던지기 (나중에 물어봄)
 */
export function GoalInput() {
  const [text, setText] = useState('')
  const addGoal = useGoalStore(s => s.addGoal)
  const throwBall = useGoalStore(s => s.throwBall)
  const throwStar = useStarStore(s => s.throwStar)
  const addingRef = useRef(false)

  const handleAddGoal = async () => {
    const trimmed = text.trim()
    if (!trimmed || addingRef.current) return
    addingRef.current = true

    // 서버 분류 시도, 실패 시 클라이언트 fallback
    let domain: Domain = 'Y'
    const serverResult = await apiCall<{ domain: Domain }>('/classify', { text: trimmed })
    if (serverResult) {
      domain = serverResult.domain
    } else {
      domain = classifyText(trimmed).domain
    }

    addGoal(trimmed, domain)
    // 별도로 starStore에도 던지기 (성운 시각화용)
    await throwStar(trimmed)
    setText('')
    addingRef.current = false
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddGoal()
    }
  }

  const handleBall = () => {
    throwBall()
    // 간단한 피드백
    if (navigator.vibrate) navigator.vibrate(30)
  }

  return (
    <div
      className="absolute bottom-0 left-0 right-0 px-4 py-3 z-20"
      style={{ background: 'rgba(4,6,13,0.92)', borderTop: '0.5px solid rgba(255,255,255,0.07)' }}
    >
      {/* 입력 영역 */}
      <div className="flex gap-2 items-center">
        {/* 공 던지기 버튼 */}
        <button
          onClick={handleBall}
          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '0.5px solid rgba(255,255,255,0.1)',
          }}
          title="공 던지기 (나중에 물어볼게요)"
        >
          <span style={{ fontSize: 18, opacity: 0.4 }}>●</span>
        </button>

        {/* 텍스트 입력 */}
        <input
          value={text}
          onChange={e => setText(e.target.value.slice(0, 30))}
          onKeyDown={handleKeyDown}
          placeholder="이기고 싶은 것을 던져두세요..."
          className="flex-1 px-3 py-2.5 rounded-xl text-sm text-white"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '0.5px solid rgba(255,255,255,0.11)',
            fontSize: 13,
          }}
        />

        {/* 추가 버튼 */}
        <button
          onClick={handleAddGoal}
          disabled={!text.trim()}
          className="px-4 py-2.5 rounded-xl text-sm transition-all"
          style={{
            background: text.trim() ? 'rgba(100,200,150,0.15)' : 'rgba(75,95,190,0.18)',
            border: `0.5px solid ${text.trim() ? 'rgba(100,200,150,0.25)' : 'rgba(75,95,190,0.3)'}`,
            color: text.trim() ? 'rgba(100,200,150,0.8)' : '#8595d2',
            fontSize: 13,
          }}
        >
          던지기
        </button>
      </div>

      {/* 하단 정보 */}
      <div className="flex justify-between mt-2 px-1">
        <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: 10 }}>
          ● 공 = 나중에 물어볼게요
        </span>
        <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: 10 }}>
          {text.length}/30
        </span>
      </div>
    </div>
  )
}
