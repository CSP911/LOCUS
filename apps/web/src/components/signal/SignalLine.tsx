'use client'

import { useEffect, useState, useRef } from 'react'
import { useStarStore } from '@/store/starStore'
import { analyzeGravity } from '@/lib/signal'
import type { Signal } from '@locus/shared'

/**
 * SignalLine — Gravity 기반 조용한 한 줄 제안
 *
 * 기획 원칙:
 * - 해결 요구 없음. 분석 없음. 사실의 출현.
 * - 사용자가 해도 되고 안 해도 됨.
 * - 조용히 올라오고, 조용히 사라진다.
 */
export function SignalLine() {
  const stars = useStarStore(s => s.stars)
  const [signal, setSignal] = useState<Signal | null>(null)
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const lastSignalRef = useRef<string | null>(null)

  useEffect(() => {
    if (stars.length < 3) return

    const result = analyzeGravity(stars)
    if (!result) {
      setSignal(null)
      setVisible(false)
      return
    }

    // 같은 메시지 반복 방지
    if (result.message === lastSignalRef.current) return
    if (dismissed) return

    lastSignalRef.current = result.message
    setSignal(result)
    setDismissed(false)

    // 살짝 지연 후 fade in
    const fadeIn = setTimeout(() => setVisible(true), 800)

    // 15초 후 자동 fade out
    const fadeOut = setTimeout(() => {
      setVisible(false)
    }, 15000)

    return () => {
      clearTimeout(fadeIn)
      clearTimeout(fadeOut)
    }
  }, [stars, dismissed])

  // dismissed 리셋 — 별이 추가되면 새 signal 가능
  useEffect(() => {
    setDismissed(false)
  }, [stars.length])

  const handleDismiss = () => {
    setVisible(false)
    setDismissed(true)
  }

  if (!signal) return null

  return (
    <div
      onClick={handleDismiss}
      className="absolute top-0 left-0 right-0 flex justify-center pt-6 pointer-events-auto cursor-pointer"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 2s ease-in-out',
        zIndex: 10,
      }}
    >
      <div style={{
        background: 'rgba(6,8,13,0.6)',
        backdropFilter: 'blur(12px)',
        border: '0.5px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        padding: '8px 16px',
        maxWidth: '80%',
      }}>
        <p style={{
          color: 'rgba(255,255,255,0.45)',
          fontSize: 12,
          letterSpacing: '0.02em',
          textAlign: 'center',
        }}>
          {signal.message}
        </p>
      </div>
    </div>
  )
}
