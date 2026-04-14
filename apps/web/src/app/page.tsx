'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { ThrowInput } from '@/components/field/ThrowInput'
import { SignalLine } from '@/components/signal/SignalLine'
import { CorePerspective } from '@/components/signal/CorePerspective'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { WeeklyReport } from '@/components/dashboard/WeeklyReport'
import { RepeatAlert } from '@/components/signal/RepeatAlert'

const StarField = dynamic(
  () => import('@/components/field/StarField').then(m => ({ default: m.StarField })),
  { ssr: false },
)

export default function FieldPage() {
  const [showDashboard, setShowDashboard] = useState(false)
  const [showReport, setShowReport] = useState(false)

  return (
    <main className="relative w-full h-screen overflow-hidden bg-locus-bg">
      {/* 3D Star Field */}
      <StarField />

      {/* Signal */}
      <SignalLine />

      {/* Repeat alert */}
      <RepeatAlert />

      {/* Core Perspective */}
      <CorePerspective />

      {/* Top buttons */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
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

      {/* Throw input */}
      <ThrowInput />
    </main>
  )
}
