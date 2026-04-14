'use client'

import { useEffect, useState, useRef } from 'react'
import { useStarStore } from '@/store/starStore'

/**
 * RepeatAlert — 반복 패턴 감지 시 토스트 알림
 *
 * "이 고민 3번째입니다" — 판단 없이 사실만 전달.
 */
export function RepeatAlert() {
  const stars = useStarStore(s => s.stars)
  const [alert, setAlert] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const prevCountRef = useRef(0)

  useEffect(() => {
    if (stars.length <= prevCountRef.current) {
      prevCountRef.current = stars.length
      return
    }
    prevCountRef.current = stars.length

    // 가장 최근 별 확인
    const latest = stars[stars.length - 1]
    if (!latest) return

    const isRecurring = latest.weight?.nature.includes('recurring')
    const repeatCount = latest.repeatCount

    if (repeatCount > 0) {
      setAlert(`비슷한 것을 ${repeatCount + 1}번째 던지고 있어요.`)
    } else if (isRecurring) {
      setAlert('반복되는 패턴이 감지됐어요.')
    } else {
      return
    }

    setVisible(true)
    const hide = setTimeout(() => setVisible(false), 4000)
    const clear = setTimeout(() => setAlert(null), 5000)

    return () => {
      clearTimeout(hide)
      clearTimeout(clear)
    }
  }, [stars])

  if (!alert) return null

  return (
    <div
      className="absolute left-0 right-0 flex justify-center pointer-events-none"
      style={{
        top: 56,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.8s ease-in-out',
        zIndex: 15,
      }}
    >
      <div style={{
        background: 'rgba(255,200,100,0.08)',
        backdropFilter: 'blur(12px)',
        border: '0.5px solid rgba(255,200,100,0.15)',
        borderRadius: 10,
        padding: '6px 14px',
      }}>
        <p style={{
          color: 'rgba(255,200,100,0.6)',
          fontSize: 11,
          textAlign: 'center',
        }}>
          {alert}
        </p>
      </div>
    </div>
  )
}
