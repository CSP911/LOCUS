'use client'

import { useState } from 'react'

/**
 * TimePicker — 피할 시간대 선택
 *
 * 계산기 스타일 숫자 그리드.
 * 탭하면 해당 시간이 토글됨 (피할 시간 = 빨간색).
 */
export function TimePicker({
  onConfirm,
  onCancel,
}: {
  onConfirm: (avoidHours: number[]) => void
  onCancel: () => void
}) {
  const [avoided, setAvoided] = useState<Set<number>>(new Set())

  function toggle(hour: number) {
    setAvoided(prev => {
      const next = new Set(prev)
      if (next.has(hour)) next.delete(hour)
      else next.add(hour)
      return next
    })
  }

  const hours = Array.from({ length: 18 }, (_, i) => i + 6) // 6시~23시

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center"
      style={{ background: 'rgba(6,8,13,0.95)', backdropFilter: 'blur(12px)' }}
    >
      <div className="w-full max-w-xs px-5">
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 4 }}>
          피하고 싶은 시간대를 눌러주세요
        </p>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, marginBottom: 16 }}>
          알림이 가지 않아요. 안 누르면 전체 가능.
        </p>

        {/* 숫자 그리드 — 6열 */}
        <div className="grid grid-cols-6 gap-1.5 mb-5">
          {hours.map(h => {
            const isAvoided = avoided.has(h)
            return (
              <button
                key={h}
                onClick={() => toggle(h)}
                className="aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all"
                style={{
                  background: isAvoided
                      ? 'rgba(255,100,100,0.15)'
                      : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isAvoided
                      ? 'rgba(255,100,100,0.3)'
                      : 'rgba(255,255,255,0.06)'}`,
                  color: isAvoided
                      ? 'rgba(255,120,120,0.8)'
                      : 'rgba(255,255,255,0.4)',
                  fontSize: 13,
                }}
              >
                {h}
              </button>
            )
          })}
        </div>

        {/* 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={() => onConfirm(Array.from(avoided))}
            className="flex-1 py-2.5 rounded-xl text-sm"
            style={{
              background: 'rgba(100,200,150,0.15)',
              border: '0.5px solid rgba(100,200,150,0.25)',
              color: 'rgba(100,200,150,0.8)',
            }}
          >
            확인
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-sm"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            건너뛰기
          </button>
        </div>
      </div>
    </div>
  )
}
