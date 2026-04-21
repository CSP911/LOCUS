'use client'

import { useState, useEffect } from 'react'
import { useGoalStore, type Goal, type GoalStep } from '@/store/goalStore'
import type { Domain } from '@locus/shared'

const DOMAIN_COLORS: Record<Domain, string> = {
  X: '#7ec8e3',
  Y: '#ddd8b0',
  Z: '#f0a870',
}

export function GoalMain() {
  const goals = useGoalStore(s => s.goals)
  const goal = goals.find(g => g.active) || null

  return (
    <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">
      <div className="flex-1" />
      <div className="pointer-events-auto px-4 pb-24">
        {!goal ? (
          <EmptyState />
        ) : (
          <GoalCard goal={goal} />
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return null
}

function GoalCard({ goal }: { goal: Goal }) {
  const completeStep = useGoalStore(s => s.completeStep)
  const completeGoal = useGoalStore(s => s.completeGoal)

  // 알림 탭으로 왔을 때 해당 단계 하이라이트
  const [highlightStep, setHighlightStep] = useState<number | null>(null)
  useEffect(() => {
    function checkHash() {
      const match = window.location.hash.match(/step-(\d+)/)
      if (match) {
        setHighlightStep(parseInt(match[1]))
        window.location.hash = ''
        setTimeout(() => setHighlightStep(null), 5000)
      }
    }
    checkHash()
    window.addEventListener('hashchange', checkHash)
    return () => window.removeEventListener('hashchange', checkHash)
  }, [])

  const currentStepData = goal.steps.find(s => s.order === goal.currentStep)
  const doneCount = goal.steps.filter(s => s.done).length
  const totalSteps = goal.steps.length
  const allDone = doneCount === totalSteps && totalSteps > 0

  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

  function handleStepDone(step: GoalStep) {
    completeStep(goal.id, step.order)

    if (step.order === totalSteps) {
      // 마지막 단계 완료
      setFeedbackMessage('전부 해냈어요!')
      setTimeout(() => setFeedbackMessage(null), 3000)
    } else {
      setFeedbackMessage(`${step.order}단계 완료. 다음은 언제든 준비되면.`)
      setTimeout(() => setFeedbackMessage(null), 3000)
    }
  }

  function handleSkip() {
    completeGoal(goal.id)
  }

  // 전부 완료
  if (allDone) {
    return (
      <div
        className="rounded-xl px-4 py-4"
        style={{
          background: 'rgba(100,200,150,0.06)',
          border: '0.5px solid rgba(100,200,150,0.15)',
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full" style={{ background: DOMAIN_COLORS[goal.domain] }} />
          <span style={{ color: 'rgba(100,200,150,0.8)', fontSize: 13, fontWeight: 500 }}>
            {goal.text}
          </span>
        </div>
        <p style={{ color: 'rgba(100,200,150,0.5)', fontSize: 12 }}>
          {totalSteps}단계 전부 완료. 다음 도전을 던져보세요.
        </p>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl px-4 py-4"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '0.5px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* 목표 + 진행도 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: DOMAIN_COLORS[goal.domain] }} />
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
            {allDone ? '해냈어요' : doneCount >= totalSteps - 1 && doneCount > 0 ? '거의 다 왔어요' : doneCount > 0 ? '진행 중이에요' : '도전이 시작됐어요'}
          </span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>
          {doneCount}/{totalSteps}
        </span>
      </div>

      {/* 진행 바 */}
      {totalSteps > 0 && (
        <div className="flex gap-1 mb-3">
          {goal.steps.map(step => (
            <div
              key={step.order}
              className="h-1 rounded-full flex-1"
              style={{
                background: step.done
                  ? 'rgba(100,200,150,0.5)'
                  : step.order === goal.currentStep
                    ? 'rgba(255,255,255,0.15)'
                    : 'rgba(255,255,255,0.05)',
              }}
            />
          ))}
        </div>
      )}

      {/* 단계 리스트 — 알람 전엔 숨김, 알람 시 공개 */}
      <div className="flex flex-col gap-1.5 mb-3">
        {goal.steps.map(step => {
          const now = new Date()
          const currentHour = now.getHours() + now.getMinutes() / 60
          // 공개 조건: 완료됨 OR 현재 단계이면서 체크인 시간이 됐거나 지남
          const isRevealed = step.done || (step.order === goal.currentStep && currentHour >= step.checkinTime - 0.5)
          const isHighlighted = highlightStep === step.order

          // 히든 문구 (단계마다 다르게)
          const hiddenMessages = [
            '곧 알려줄게요',
            '아직 비밀이에요',
            '때가 되면 보여요',
            '준비되면 나타나요',
            '알람이 데려다줄게요',
            '조금만 기다려요',
          ]
          const hiddenMsg = hiddenMessages[(step.order - 1) % hiddenMessages.length]

          return (
            <div
              key={step.order}
              className="flex items-center gap-2 rounded-lg px-2 py-1 transition-all"
              style={{
                opacity: step.done ? 0.4 : isRevealed ? 1 : 0.35,
                background: isHighlighted ? 'rgba(100,200,150,0.1)' : 'transparent',
                border: isHighlighted ? '0.5px solid rgba(100,200,150,0.2)' : '0.5px solid transparent',
              }}
            >
              {step.done ? (
                <span style={{ color: 'rgba(100,200,150,0.6)', fontSize: 11 }}>✓</span>
              ) : (
                <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 11 }}>{step.order}</span>
              )}

              {isRevealed ? (
                <>
                  <span style={{
                    color: step.done ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.6)',
                    fontSize: 12,
                    textDecoration: step.done ? 'line-through' : 'none',
                  }}>
                    {step.text}
                  </span>
                  {!step.done && step.order === goal.currentStep && (
                    <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 9, marginLeft: 'auto' }}>
                      지금
                    </span>
                  )}
                </>
              ) : (
                <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 11, fontStyle: 'italic' }}>
                  {hiddenMsg}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* 현재 단계 버튼 — 공개됐을 때만 */}
      {currentStepData && !currentStepData.done && (() => {
        const now = new Date()
        const curHour = now.getHours() + now.getMinutes() / 60
        return curHour >= currentStepData.checkinTime - 0.5
      })() && (
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => handleStepDone(currentStepData)}
            className="px-3 py-1.5 rounded-lg text-xs"
            style={{
              background: 'rgba(100,200,150,0.1)',
              border: '0.5px solid rgba(100,200,150,0.2)',
              color: 'rgba(100,200,150,0.7)',
            }}
          >
            했어요 ✓
          </button>
          <button
            onClick={handleSkip}
            className="px-3 py-1.5 rounded-lg text-xs"
            style={{ color: 'rgba(255,255,255,0.2)' }}
          >
            오늘은 넘길게요
          </button>
        </div>
      )}

      {/* 피드백 메시지 */}
      {feedbackMessage && (
        <p style={{ color: 'rgba(100,200,150,0.6)', fontSize: 11, marginTop: 8 }}>
          {feedbackMessage}
        </p>
      )}
    </div>
  )
}
