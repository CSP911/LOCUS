'use client'

import { useMemo } from 'react'
import { useGoalStore } from '@/store/goalStore'

/**
 * TodayStatus — 오늘 어제의 나를 이겼는지 극단적으로 보여주는 뷰
 */
export function TodayStatus() {
  const goals = useGoalStore(s => s.goals)
  const records = useGoalStore(s => s.records)
  const getStreak = useGoalStore(s => s.getStreak)

  const activeGoals = goals.filter(g => g.active)
  const today = new Date().toISOString().slice(0, 10)

  const { wins, total, allDone } = useMemo(() => {
    const todayRecords = records.filter(r => r.date === today)
    const wins = todayRecords.filter(r => r.achieved).length
    const total = activeGoals.length
    const allDone = total > 0 && wins >= total
    return { wins, total, allDone }
  }, [records, activeGoals, today])

  // 최장 연속 기록
  const maxStreak = useMemo(() => {
    if (activeGoals.length === 0) return 0
    return Math.max(...activeGoals.map(g => getStreak(g.id)))
  }, [activeGoals, getStreak])

  // 목표가 없으면 표시 안 함
  if (activeGoals.length === 0) return null

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
      {/* 메인 상태 */}
      {allDone ? (
        <>
          {/* 이겼을 때 */}
          <p style={{
            color: 'rgba(100,220,150,0.9)',
            fontSize: 48,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}>
            WIN
          </p>
          <p style={{
            color: 'rgba(100,220,150,0.4)',
            fontSize: 13,
            marginTop: 8,
          }}>
            오늘 어제의 나를 이겼어요
          </p>
        </>
      ) : wins > 0 ? (
        <>
          {/* 일부 달성 */}
          <p style={{
            color: 'rgba(255,255,255,0.08)',
            fontSize: 120,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: '-0.04em',
          }}>
            {wins}/{total}
          </p>
          <p style={{
            color: 'rgba(255,255,255,0.2)',
            fontSize: 12,
            marginTop: -8,
          }}>
            아직 이길 수 있어요
          </p>
        </>
      ) : (
        <>
          {/* 아직 0 */}
          <p style={{
            color: 'rgba(255,255,255,0.04)',
            fontSize: 140,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: '-0.04em',
          }}>
            0
          </p>
          <p style={{
            color: 'rgba(255,255,255,0.15)',
            fontSize: 12,
            marginTop: -12,
          }}>
            오늘 아직 시작 전
          </p>
        </>
      )}

      {/* 연속 기록 */}
      {maxStreak > 1 && (
        <p style={{
          color: 'rgba(255,200,100,0.3)',
          fontSize: 11,
          marginTop: 20,
        }}>
          {maxStreak}일 연속 진행 중
        </p>
      )}
    </div>
  )
}
