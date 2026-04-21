'use client'

import { useState, useEffect } from 'react'
import { useGoalStore, type Goal } from '@/store/goalStore'
import type { Domain } from '@locus/shared'

const DOMAIN_COLORS: Record<Domain, string> = {
  X: '#7ec8e3',
  Y: '#ddd8b0',
  Z: '#f0a870',
}

export function GoalMain() {
  const goals = useGoalStore(s => s.goals)
  const activeGoals = goals.filter(g => g.active)

  return (
    <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">
      {/* 상단 여백 */}
      <div className="flex-1" />

      {/* 목표 카드들 — 하단 입력 위에 여백 확보 */}
      <div className="pointer-events-auto px-4 pb-24">
        {activeGoals.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-2">
            {activeGoals.map(goal => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-4">
      <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>
        어제의 나를 이길 목표를 던져보세요
      </p>
    </div>
  )
}

function GoalCard({ goal }: { goal: Goal }) {
  const checkIn = useGoalStore(s => s.checkIn)
  const getTodayRecord = useGoalStore(s => s.getTodayRecord)
  const getWeekRecords = useGoalStore(s => s.getWeekRecords)
  const getStreak = useGoalStore(s => s.getStreak)

  const todayRecord = getTodayRecord(goal.id)
  const weekRecords = getWeekRecords(goal.id)
  const streak = getStreak(goal.id)

  const [showSmall, setShowSmall] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [smallSuggestion, setSmallSuggestion] = useState<string | null>(null)
  const [loadingSuggestion, setLoadingSuggestion] = useState(false)

  const winsThisWeek = weekRecords.filter(r => r.achieved).length

  // 못 했을 때 작은 버전 제안 가져오기
  async function fetchSmallSuggestion() {
    setLoadingSuggestion(true)
    try {
      const res = await fetch('/api/suggest-small', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goal.text }),
      })
      const data = await res.json()
      setSmallSuggestion(data.suggestion)
    } catch {
      setSmallSuggestion(`${goal.text} — 1분만 해볼까요?`)
    } finally {
      setLoadingSuggestion(false)
    }
  }

  function handleNotDone() {
    setShowSmall(true)
    fetchSmallSuggestion()
  }

  function handleSmallDone() {
    // 작은 버전 했다 → "얼마나 했어요?" 물어보기
    setShowSmall(false)
    setShowFeedback(true)
  }

  function handleFeedback(level: 'just' | 'more' | 'much') {
    const messages: Record<string, string> = {
      just: '작게라도 한 거예요.',
      more: '시작이 반이죠. 좋았어요.',
      much: `${smallSuggestion?.replace(/할까요\?|볼까요\?/g, '').trim()}에서 시작했는데. 대단하네요.`,
    }
    checkIn(goal.id, true, `${smallSuggestion} → ${level}`)
    setFeedbackMessage(messages[level])
    setShowFeedback(false)

    // 3초 후 메시지 사라짐
    setTimeout(() => setFeedbackMessage(null), 3500)
  }

  function handleSkip() {
    checkIn(goal.id, false)
    setShowSmall(false)
  }

  // 피드백 질문 단계 ("얼마나 했어요?")
  if (showFeedback) {
    return (
      <div
        className="rounded-xl px-4 py-3"
        style={{
          background: 'rgba(100,200,150,0.04)',
          border: '0.5px solid rgba(100,200,150,0.12)',
        }}
      >
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 10 }}>
          얼마나 했어요?
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => handleFeedback('just')}
            className="px-3 py-1.5 rounded-lg text-xs"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
          >
            딱 그만큼
          </button>
          <button
            onClick={() => handleFeedback('more')}
            className="px-3 py-1.5 rounded-lg text-xs"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}
          >
            좀 더 했어요
          </button>
          <button
            onClick={() => handleFeedback('much')}
            className="px-3 py-1.5 rounded-lg text-xs"
            style={{ background: 'rgba(100,200,150,0.1)', color: 'rgba(100,200,150,0.7)' }}
          >
            생각보다 많이!
          </button>
        </div>
      </div>
    )
  }

  // 이미 오늘 체크인 했으면
  if (todayRecord) {
    return (
      <div
        className="rounded-xl px-4 py-3"
        style={{
          background: todayRecord.achieved
            ? 'rgba(100,200,150,0.06)'
            : 'rgba(255,255,255,0.02)',
          border: `0.5px solid ${todayRecord.achieved
            ? 'rgba(100,200,150,0.15)'
            : 'rgba(255,255,255,0.05)'}`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: DOMAIN_COLORS[goal.domain] }} />
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{goal.text}</span>
          </div>
          <span style={{
            color: todayRecord.achieved ? 'rgba(100,200,150,0.7)' : 'rgba(255,255,255,0.2)',
            fontSize: 11,
          }}>
            {todayRecord.achieved ? '오늘 이겼어요' : '내일 다시'}
          </span>
        </div>
        {streak > 1 && (
          <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10, marginTop: 4, marginLeft: 16 }}>
            {streak}일 연속 🔥
          </p>
        )}
        {/* 피드백 메시지 (3초간) */}
        {feedbackMessage && (
          <p style={{
            color: 'rgba(100,200,150,0.6)',
            fontSize: 11,
            marginTop: 6,
            marginLeft: 16,
            transition: 'opacity 0.5s',
          }}>
            {feedbackMessage}
          </p>
        )}
      </div>
    )
  }

  // 아직 체크인 안 했으면
  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '0.5px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* 목표 + 주간 통계 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: DOMAIN_COLORS[goal.domain] }} />
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{goal.text}</span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>
          이번 주 {winsThisWeek}일 이김
        </span>
      </div>

      {/* 작은 버전 제안 */}
      {showSmall ? (
        <div className="ml-4">
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginBottom: 8 }}>
            {loadingSuggestion ? '생각 중...' : smallSuggestion}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleSmallDone}
              disabled={loadingSuggestion}
              className="px-3 py-1.5 rounded-lg text-xs"
              style={{
                background: 'rgba(100,200,150,0.1)',
                border: '0.5px solid rgba(100,200,150,0.2)',
                color: 'rgba(100,200,150,0.7)',
              }}
            >
              했어요
            </button>
            <button
              onClick={handleSkip}
              className="px-3 py-1.5 rounded-lg text-xs"
              style={{
                color: 'rgba(255,255,255,0.2)',
              }}
            >
              오늘은 넘길게요
            </button>
          </div>
        </div>
      ) : (
        /* 체크인 버튼 */
        <div className="flex gap-2 ml-4">
          <button
            onClick={() => checkIn(goal.id, true)}
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
            onClick={handleNotDone}
            className="px-3 py-1.5 rounded-lg text-xs"
            style={{
              background: 'rgba(255,200,100,0.06)',
              border: '0.5px solid rgba(255,200,100,0.12)',
              color: 'rgba(255,200,100,0.5)',
            }}
          >
            아직 못 했어요
          </button>
        </div>
      )}
    </div>
  )
}
