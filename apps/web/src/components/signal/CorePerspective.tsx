'use client'

import { useEffect, useState, useRef } from 'react'
import { useStarStore } from '@/store/starStore'
import type { Star, Domain } from '@locus/shared'

/**
 * CorePerspective — Gravity 기반 관찰문
 *
 * 별이 5개 이상 쌓이면, 현재 무게 분포를 Claude가 읽어
 * 1~2줄의 관찰문을 생성한다. 진단/조언/위로 없이 사실만.
 *
 * 화면 하단 입력 바로 위에 은은하게 표시.
 */
export function CorePerspective() {
  const stars = useStarStore(s => s.stars)
  const [perspective, setPerspective] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const lastCountRef = useRef(0)
  const fetchingRef = useRef(false)

  useEffect(() => {
    // 5개 미만이면 표시 안 함
    if (stars.length < 5) {
      setPerspective(null)
      setVisible(false)
      return
    }

    // 새 별이 추가될 때만 갱신 (3개마다)
    const newCount = stars.length
    if (newCount === lastCountRef.current) return
    if (newCount % 3 !== 0 && newCount !== 5) return // 5개 도달 시 + 이후 3개마다
    lastCountRef.current = newCount

    fetchPerspective(stars)
  }, [stars])

  async function fetchPerspective(stars: Star[]) {
    if (fetchingRef.current) return
    fetchingRef.current = true

    try {
      const gravityData = buildGravityData(stars)

      const res = await fetch('/api/perspective', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gravityData }),
      })

      if (!res.ok) return
      const { perspective: text } = await res.json()

      if (text) {
        setVisible(false)
        setPerspective(text)
        // Fade in
        setTimeout(() => setVisible(true), 500)
      }
    } catch {
      // silently fail
    } finally {
      fetchingRef.current = false
    }
  }

  if (!perspective) return null

  return (
    <div
      className="absolute left-0 right-0 flex justify-center pointer-events-none"
      style={{
        bottom: 110,
        opacity: visible ? 1 : 0,
        transition: 'opacity 3s ease-in-out',
        zIndex: 5,
      }}
    >
      <div style={{
        maxWidth: '75%',
        textAlign: 'center',
      }}>
        {/* "Core Perspective" 라벨 — 극도로 희미 */}
        <p style={{
          color: 'rgba(255,255,255,0.12)',
          fontSize: 9,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}>
          core perspective
        </p>

        {/* 관찰문 */}
        <p style={{
          color: 'rgba(255,255,255,0.35)',
          fontSize: 12,
          lineHeight: 1.6,
          letterSpacing: '0.01em',
        }}>
          {perspective}
        </p>
      </div>
    </div>
  )
}

// ── Gravity 데이터 구성 ───────────────────────────
function buildGravityData(stars: Star[]) {
  const domainMass: Record<Domain, number> = { X: 0, Y: 0, Z: 0 }
  let dirIn = 0, dirOut = 0
  let natUnresolved = 0, natRecurring = 0, natOnetime = 0

  stars.forEach(s => {
    domainMass[s.domain] += s.mass

    const dir = s.weight?.direction
    if (dir === 'in') dirIn++
    else if (dir === 'out') dirOut++

    const nat = s.weight?.nature ?? []
    if (nat.includes('unresolved')) natUnresolved++
    if (nat.includes('recurring')) natRecurring++
    if (nat.includes('onetime')) natOnetime++
  })

  const totalMass = domainMass.X + domainMass.Y + domainMass.Z || 1
  const totalDir = dirIn + dirOut || 1
  const totalNat = natUnresolved + natRecurring + natOnetime || 1

  const domains: Domain[] = ['X', 'Y', 'Z']
  const heaviestDomain = domains.reduce((a, b) =>
    domainMass[a] > domainMass[b] ? a : b
  )
  const lightestDomain = domains.reduce((a, b) =>
    domainMass[a] < domainMass[b] ? a : b
  )

  // 최근 5개 텍스트
  const recentTexts = stars
    .slice(-5)
    .map(s => s.text)

  return {
    totalStars: stars.length,
    domainMass,
    domainRatio: {
      X: domainMass.X / totalMass,
      Y: domainMass.Y / totalMass,
      Z: domainMass.Z / totalMass,
    },
    directionRatio: {
      in: dirIn / totalDir,
      out: dirOut / totalDir,
    },
    natureRatio: {
      unresolved: natUnresolved / totalNat,
      recurring: natRecurring / totalNat,
      onetime: natOnetime / totalNat,
    },
    heaviestDomain,
    lightestDomain,
    recentTexts,
  }
}
