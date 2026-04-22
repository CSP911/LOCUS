'use client'

import { useState, useRef } from 'react'
import { useGoalStore } from '@/store/goalStore'
import { useStarStore } from '@/store/starStore'
import { apiCall } from '@/lib/api'
import { scheduleStepNotifications } from '@/lib/notifications'
import { TimePicker } from './TimePicker'
import type { Domain } from '@locus/shared'

interface ProcessGoalResponse {
  goal: {
    original: string
    needsClarification: boolean
    clarifyQuestion: string | null
    refined: string | null
  }
  classification: {
    domain: Domain
    intensity: number
    direction: 'in' | 'out'
    nature: string[]
  } | null
  support: {
    smallVersion: string
    steps: string[]
  } | null
  checkinTimes: number[] | null
  checkinMessages: {
    midday: string
    evening: string
  } | null
}

export function GoalInput() {
  const [text, setText] = useState('')
  const [clarifyQuestion, setClarifyQuestion] = useState<string | null>(null)
  const [originalGoal, setOriginalGoal] = useState('')
  const [loading, setLoading] = useState(false)
  const [goalData, setGoalData] = useState<ProcessGoalResponse | null>(null)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [pendingGoal, setPendingGoal] = useState<string>('')
  const [avoidHours, setAvoidHours] = useState<number[]>([])

  const addGoal = useGoalStore(s => s.addGoal)
  const goals = useGoalStore(s => s.goals)
  const throwBall = useGoalStore(s => s.throwBall)
  const throwStar = useStarStore(s => s.throwStar)
  const addingRef = useRef(false)

  const hasActive = goals.some(g => g.active)

  const handleSubmit = async () => {
    const trimmed = text.trim()
    if (!trimmed || addingRef.current) return
    addingRef.current = true
    setLoading(true)

    try {
      if (clarifyQuestion) {
        // 2차: 구체화 답변 → 시간 선택으로
        setPendingGoal(`${originalGoal}|||${trimmed}`)
        setClarifyQuestion(null)
        setOriginalGoal('')
        setText('')
        setShowTimePicker(true)
      } else {
        // 1차: 모호한지 확인
        const result = await apiCall<ProcessGoalResponse>(
          '/process-goal', { goal: trimmed }
        )

        if (result?.goal.needsClarification && result.goal.clarifyQuestion) {
          setClarifyQuestion(result.goal.clarifyQuestion)
          setOriginalGoal(trimmed)
          setText('')
          return
        }

        // 충분히 구체적 → 시간 선택으로
        setPendingGoal(trimmed)
        setText('')
        setShowTimePicker(true)
      }
    } finally {
      setLoading(false)
      addingRef.current = false
    }
  }

  // 시간 선택 완료 → LLM 호출 + 등록
  async function handleTimeConfirm(avoided: number[]) {
    setShowTimePicker(false)
    setAvoidHours(avoided)
    setLoading(true)

    const parts = pendingGoal.split('|||')
    const goal = parts[0]
    const clarifyAnswer = parts[1] || undefined

    try {
      const result = await apiCall<ProcessGoalResponse>(
        '/process-goal',
        {
          goal,
          clarifyAnswer,
          avoidHours: avoided,
          currentTime: new Date().getHours() + new Date().getMinutes() / 60,
        }
      )

      if (result && (result.goal.refined || !result.goal.needsClarification)) {
        await registerGoal(result)
      } else {
        const fallbackGoal = clarifyAnswer ? `${goal} — ${clarifyAnswer}` : goal
        addGoal(fallbackGoal, 'Y')
        await throwStar(fallbackGoal)
      }
    } finally {
      setPendingGoal('')
      setLoading(false)
    }
  }

  function handleTimeSkip() {
    handleTimeConfirm([])
  }

  async function registerGoal(data: any) {
    // 표시용: 첫 입력(사용자 의도)만. 재질문 답변은 포함하지 않음.
    const goalText = pendingGoal.includes('|||')
      ? pendingGoal.split('|||')[0]
      : (data.goal.original || data.goal.refined)
    const domain = (data.classification?.domain || 'Y') as Domain

    // steps를 GoalStep 형식으로 변환
    const steps = (data.steps || []).map((s: any) => ({
      ...s,
      done: false,
    }))

    addGoal(goalText, domain, steps)
    await throwStar(goalText)

    // 단계별 알림 스케줄링
    if (data.steps && data.steps.length > 0) {
      scheduleStepNotifications(goalText, data.steps)
    }
    setGoalData(data)
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
    setGoalData(null)
    setText('')
  }

  if (showTimePicker) {
    return <TimePicker onConfirm={handleTimeConfirm} onCancel={handleTimeSkip} />
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

      {/* 활성 도전 있을 때 */}
      {hasActive && !clarifyQuestion && (
        <p className="mb-2" style={{ color: 'rgba(255,255,255,0.15)', fontSize: 11 }}>
          도전 진행 중 — 끝내면 다음 도전을 던질 수 있어요
        </p>
      )}

      {/* 로딩 표시 */}
      {loading && (
        <p className="mb-2" style={{ color: 'rgba(100,200,150,0.5)', fontSize: 11 }}>
          분석 중...
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
              : hasActive
                ? '지금 도전 진행 중...'
                : '이기고 싶은 것을 던져보세요'
          }
          disabled={(hasActive && !clarifyQuestion) || loading}
          className="flex-1 px-3 py-2.5 rounded-xl text-sm text-white"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '0.5px solid rgba(255,255,255,0.11)',
            fontSize: 13,
            opacity: (hasActive && !clarifyQuestion) || loading ? 0.3 : 1,
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
