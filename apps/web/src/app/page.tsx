'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { GoalMain } from '@/components/goal/GoalMain'
import { GoalInput } from '@/components/goal/GoalInput'
import { BallAsk } from '@/components/goal/BallAsk'
import { TodayStatus } from '@/components/goal/TodayStatus'
import { SignalLine } from '@/components/signal/SignalLine'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { WeeklyReport } from '@/components/dashboard/WeeklyReport'
import { InsightPage } from '@/components/insight/InsightPage'

const StarField = dynamic(
  () => import('@/components/field/StarField').then(m => ({ default: m.StarField })),
  { ssr: false },
)

export default function FieldPage() {
  const [showDashboard, setShowDashboard] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showInsight, setShowInsight] = useState(false)

  return (
    <main className="relative w-full h-screen overflow-hidden bg-locus-bg">
      {/* 오늘의 상태 — 배경처럼 크게 */}
      <TodayStatus />

      {/* Signal — 조용한 한 줄 */}
      <SignalLine />

      {/* 공 던지기 물어보기 */}
      <BallAsk />

      {/* 목표 카드 (하단 입력 위) */}
      <GoalMain />

      {/* 상단 버튼 */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={() => setShowInsight(true)}
          className="px-3 py-1.5 rounded-lg text-xs"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '0.5px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.3)',
          }}
        >
          나의 패턴
        </button>
        <button
          onClick={() => setShowReport(true)}
          className="px-3 py-1.5 rounded-lg text-xs"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '0.5px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.3)',
          }}
        >
          리포트
        </button>
        <button
          onClick={() => setShowDashboard(true)}
          className="px-3 py-1.5 rounded-lg text-xs"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '0.5px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.3)',
          }}
        >
          내 무게들
        </button>
      </div>

      {/* Dashboard overlay */}
      {showDashboard && (
        <Dashboard onClose={() => setShowDashboard(false)} />
      )}

      {/* Weekly Report overlay */}
      {showReport && (
        <WeeklyReport onClose={() => setShowReport(false)} />
      )}

      {/* Insight overlay */}
      {showInsight && (
        <InsightPage onClose={() => setShowInsight(false)} />
      )}

      {/* 하단 입력 — 목표 던지기 + 공 */}
      <GoalInput />
    </main>
  )
}
