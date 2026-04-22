'use client'

import { useState, useEffect, useMemo } from 'react'
import { useGoalStore, type Goal, type GoalStep } from '@/store/goalStore'
import { CheckinChat } from './CheckinChat'
import type { Domain } from '@locus/shared'

const DOMAIN_COLORS: Record<Domain, string> = {
  X: '#7ec8e3',
  Y: '#ddd8b0',
  Z: '#f0a870',
}

export function GoalMain() {
  const goals = useGoalStore(s => s.goals)
  const goal = goals.find(g => g.active) || null
  const [showChat, setShowChat] = useState(false)

  return (
    <>
      <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">
        <div className="flex-1" />
        <div className="pointer-events-auto px-4 pb-24">
          {!goal ? (
            <EmptyState />
          ) : (
            <GoalCard goal={goal} onOpenChat={() => setShowChat(true)} />
          )}
        </div>
      </div>

      {/* 채팅 오버레이 — 최상위에서 렌더 */}
      {showChat && goal && (() => {
        const step = goal.steps.find(s => s.order === goal.currentStep)
        if (!step || step.done) return null
        return (
          <CheckinChat
            goal={goal.text}
            stepText={step.text}
            checkinMessage={step.checkinMessage}
            onComplete={() => {
              setShowChat(false)
              const { completeStep } = useGoalStore.getState()
              completeStep(goal.id, step.order)
            }}
            onDeferToday={() => {
              setShowChat(false)
              const { pauseToday } = useGoalStore.getState()
              pauseToday(goal.id)
            }}
            onDeferLater={() => {
              setShowChat(false)
              // 그냥 닫기 — 나중에 다시 체크인 가능
            }}
            onSkip={() => {
              setShowChat(false)
              const { completeGoal } = useGoalStore.getState()
              completeGoal(goal.id)
            }}
            onClose={() => setShowChat(false)}
          />
        )
      })()}
    </>
  )
}

function EmptyState() {
  return null
}

function GoalCard({ goal, onOpenChat }: { goal: Goal; onOpenChat: () => void }) {
  // 30초마다 현재 시간 갱신
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])
  const currentHour = now.getHours() + now.getMinutes() / 60

  // 알림 탭 하이라이트
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
            {allDone
              ? '해냈어요'
              : goal.pausedUntil && new Date() < new Date(goal.pausedUntil)
                ? '내일 이어가요'
                : doneCount >= totalSteps - 1 && doneCount > 0
                  ? '거의 다 왔어요'
                  : doneCount > 0
                    ? '진행 중이에요'
                    : '도전이 시작됐어요'}
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

      {/* 현재 단계 — 체크인 버튼 (pausedUntil이면 안 보임) */}
      {currentStepData && !currentStepData.done && currentHour >= currentStepData.checkinTime - 0.5 && !(goal.pausedUntil && new Date() < new Date(goal.pausedUntil)) && (
        <div className="mt-1">
          <button
            onClick={onOpenChat}
            className="px-4 py-2 rounded-xl text-xs w-full"
            style={{
              background: 'rgba(100,200,150,0.08)',
              border: '0.5px solid rgba(100,200,150,0.15)',
              color: 'rgba(100,200,150,0.7)',
            }}
          >
            체크인하기
          </button>
        </div>
      )}

      {/* 오늘 일시정지 안내 */}
      {goal.pausedUntil && new Date() < new Date(goal.pausedUntil) && (
        <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 11, marginTop: 6 }}>
          내일 이어서 진행돼요.
        </p>
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
