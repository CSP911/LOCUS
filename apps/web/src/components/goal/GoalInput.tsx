'use client'

import { useState, useRef } from 'react'
import { useGoalStore } from '@/store/goalStore'
import { useStarStore } from '@/store/starStore'
import { classifyText } from '@/lib/classify-client'
import { apiCall } from '@/lib/api'
import { scheduleCheckinNotifications } from '@/lib/notifications'
import type { Domain } from '@locus/shared'

export function GoalInput() {
  const [text, setText] = useState('')
  const [clarifyQuestion, setClarifyQuestion] = useState<string | null>(null)
  const [originalGoal, setOriginalGoal] = useState('')
  const [loading, setLoading] = useState(false)

  const addGoal = useGoalStore(s => s.addGoal)
  const hasTodayGoal = useGoalStore(s => s.hasTodayGoal)
  const throwBall = useGoalStore(s => s.throwBall)
  const throwStar = useStarStore(s => s.throwStar)
  const addingRef = useRef(false)

  const todayHasGoal = hasTodayGoal()

  const handleSubmit = async () => {
    const trimmed = text.trim()
    if (!trimmed || addingRef.current) return
    addingRef.current = true
    setLoading(true)

    if (clarifyQuestion) {
      // 되묻기에 대한 답변 — 구체화된 목표로 등록
      const fullGoal = `${originalGoal} — ${trimmed}`
      await registerGoal(fullGoal)
      setClarifyQuestion(null)
      setOriginalGoal('')
    } else {
      // 첫 입력 — 모호한지 확인
      const result = await apiCall<{ needsClarification: boolean; question?: string }>(
        '/clarify-goal', { goal: trimmed }
      )

      if (result?.needsClarification && result.question) {
        setClarifyQuestion(result.question)
        setOriginalGoal(trimmed)
        setText('')
        setLoading(false)
        addingRef.current = false
        return
      }

      await registerGoal(trimmed)
    }

    setText('')
    setLoading(false)
    addingRef.current = false
  }

  async function registerGoal(goalText: string) {
    let domain: Domain = 'Y'
    const serverResult = await apiCall<{ domain: Domain }>('/classify', { text: goalText.slice(0, 30) })
    if (serverResult) {
      domain = serverResult.domain
    } else {
      domain = classifyText(goalText).domain
    }
    addGoal(goalText, domain)
    await throwStar(goalText)

    // 과제 성격에 맞는 시간에 체크인 알림 스케줄링
    scheduleCheckinNotifications(goalText)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleBall = () => {
    throwBall()
    if (navigator.vibrate) navigator.vibrate(30)
  }

  const handleCancelClarify = () => {
    setClarifyQuestion(null)
    setOriginalGoal('')
    setText('')
  }

  return (
    <div
      className="absolute bottom-0 left-0 right-0 px-4 py-3 z-20"
      style={{ background: 'rgba(4,6,13,0.92)', borderTop: '0.5px solid rgba(255,255,255,0.07)' }}
    >
      {/* 되묻기 질문 */}
      {clarifyQuestion && (
        <div className="mb-2 flex items-center justify-between">
          <p style={{ color: 'rgba(255,200,100,0.6)', fontSize: 12 }}>
            {clarifyQuestion}
          </p>
          <button
            onClick={handleCancelClarify}
            style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}
          >
            취소
          </button>
        </div>
      )}

      {/* 오늘 이미 도전과제 있을 때 */}
      {todayHasGoal && !clarifyQuestion && (
        <p className="mb-2" style={{ color: 'rgba(255,255,255,0.15)', fontSize: 11 }}>
          오늘의 도전과제가 설정되어 있어요
        </p>
      )}

      {/* 입력 영역 */}
      <div className="flex gap-2 items-center">
        <button
          onClick={handleBall}
          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '0.5px solid rgba(255,255,255,0.1)',
          }}
          title="공 던지기"
        >
          <span style={{ fontSize: 18, opacity: 0.4 }}>●</span>
        </button>

        <input
          value={text}
          onChange={e => setText(e.target.value.slice(0, 50))}
          onKeyDown={handleKeyDown}
          placeholder={
            clarifyQuestion
              ? '조금 더 구체적으로...'
              : todayHasGoal
                ? '내일의 도전은 내일...'
                : '오늘 이기고 싶은 것 하나'
          }
          disabled={todayHasGoal && !clarifyQuestion}
          className="flex-1 px-3 py-2.5 rounded-xl text-sm text-white"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '0.5px solid rgba(255,255,255,0.11)',
            fontSize: 13,
            opacity: todayHasGoal && !clarifyQuestion ? 0.3 : 1,
          }}
        />

        <button
          onClick={handleSubmit}
          disabled={!text.trim() || loading}
          className="px-4 py-2.5 rounded-xl text-sm transition-all"
          style={{
            background: text.trim() ? 'rgba(100,200,150,0.15)' : 'rgba(75,95,190,0.18)',
            border: `0.5px solid ${text.trim() ? 'rgba(100,200,150,0.25)' : 'rgba(75,95,190,0.3)'}`,
            color: text.trim() ? 'rgba(100,200,150,0.8)' : '#8595d2',
            fontSize: 13,
          }}
        >
          {loading ? '...' : clarifyQuestion ? '확인' : '던지기'}
        </button>
      </div>

      <div className="flex justify-between mt-2 px-1">
        <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: 10 }}>
          ● 공 = 나중에 물어볼게요
        </span>
        <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: 10 }}>
          {text.length}/50
        </span>
      </div>
    </div>
  )
}
