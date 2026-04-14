'use client'

import { useMemo } from 'react'
import { useStarStore } from '@/store/starStore'
import type { Star, Domain } from '@locus/shared'

const DOMAIN_INFO: Record<Domain, { label: string; color: string }> = {
  X: { label: '건강', color: '#7ec8e3' },
  Y: { label: '일', color: '#ddd8b0' },
  Z: { label: '관계', color: '#f0a870' },
}

interface PeriodStats {
  total: number
  mass: Record<Domain, number>
  ratio: Record<Domain, number>
  unresolvedCount: number
  recurringCount: number
  controllable: number
  uncontrollable: number
  heaviest: Star | null
}

function computeStats(stars: Star[]): PeriodStats {
  const mass: Record<Domain, number> = { X: 0, Y: 0, Z: 0 }
  let unresolvedCount = 0, recurringCount = 0, inCount = 0, outCount = 0

  stars.forEach(s => {
    mass[s.domain] += s.mass
    if (s.weight?.nature.includes('unresolved') && !s.resolved) unresolvedCount++
    if (s.weight?.nature.includes('recurring')) recurringCount++
    if (s.weight?.direction === 'in') inCount++
    if (s.weight?.direction === 'out') outCount++
  })

  const total = mass.X + mass.Y + mass.Z || 1
  const heaviest = stars.length > 0
    ? stars.reduce((a, b) => a.mass > b.mass ? a : b)
    : null

  return {
    total: stars.length,
    mass,
    ratio: { X: mass.X / total, Y: mass.Y / total, Z: mass.Z / total },
    unresolvedCount,
    recurringCount,
    controllable: inCount,
    uncontrollable: outCount,
    heaviest,
  }
}

export function WeeklyReport({ onClose }: { onClose: () => void }) {
  const stars = useStarStore(s => s.stars)

  const now = Date.now()
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000
  const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000

  const thisWeek = useMemo(
    () => stars.filter(s => new Date(s.createdAt).getTime() > weekAgo),
    [stars, weekAgo],
  )
  const lastWeek = useMemo(
    () => stars.filter(s => {
      const t = new Date(s.createdAt).getTime()
      return t > twoWeeksAgo && t <= weekAgo
    }),
    [stars, weekAgo, twoWeeksAgo],
  )

  const current = computeStats(thisWeek)
  const previous = computeStats(lastWeek)

  // 변화 감지
  const changes = useMemo(() => {
    const lines: string[] = []

    if (current.total === 0) return ['이번 주에 던진 것이 없습니다.']

    // 도메인 변화
    for (const d of ['X', 'Y', 'Z'] as Domain[]) {
      const diff = current.ratio[d] - (previous.total > 0 ? previous.ratio[d] : 0)
      if (diff > 0.15) {
        lines.push(`${DOMAIN_INFO[d].label} 영역의 무게가 늘었습니다.`)
      } else if (diff < -0.15 && previous.total > 0) {
        lines.push(`${DOMAIN_INFO[d].label} 영역의 무게가 줄었습니다.`)
      }
    }

    // 미결 변화
    if (current.unresolvedCount > 3) {
      lines.push(`끝나지 않은 것이 ${current.unresolvedCount}개 쌓여 있습니다.`)
    }

    // 반복 변화
    if (current.recurringCount > 2) {
      lines.push(`반복되는 패턴이 ${current.recurringCount}개 감지됩니다.`)
    }

    // 통제 비율
    const totalDir = current.controllable + current.uncontrollable || 1
    if (current.uncontrollable / totalDir > 0.6) {
      lines.push('기다려야 하는 것들이 많은 주였습니다.')
    } else if (current.controllable / totalDir > 0.7) {
      lines.push('내가 할 수 있는 것들에 집중한 주였습니다.')
    }

    if (lines.length === 0) {
      lines.push(`이번 주 ${current.total}개를 던졌습니다.`)
    }

    return lines
  }, [current, previous])

  return (
    <div
      className="absolute inset-0 z-30 overflow-y-auto"
      style={{ background: 'rgba(6,8,13,0.98)', backdropFilter: 'blur(20px)' }}
    >
      <div className="max-w-sm mx-auto px-5 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10, letterSpacing: '0.1em' }}>
              WEEKLY REPORT
            </p>
            <h2 style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: 500, marginTop: 2 }}>
              이번 주의 무게
            </h2>
          </div>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
            닫기
          </button>
        </div>

        {/* Domain ratio bars */}
        <div id="locus-report" className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginBottom: 12 }}>무게 분포</p>

          {(['X', 'Y', 'Z'] as Domain[]).map(d => {
            const pct = Math.round(current.ratio[d] * 100)
            const prevPct = previous.total > 0 ? Math.round(previous.ratio[d] * 100) : null
            const diff = prevPct !== null ? pct - prevPct : null
            const info = DOMAIN_INFO[d]

            return (
              <div key={d} className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: info.color }} />
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{info.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 500 }}>
                      {pct}%
                    </span>
                    {diff !== null && diff !== 0 && (
                      <span style={{
                        color: diff > 0 ? 'rgba(255,180,100,0.5)' : 'rgba(100,200,150,0.5)',
                        fontSize: 10,
                      }}>
                        {diff > 0 ? `+${diff}` : diff}
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: info.color, opacity: 0.6 }}
                  />
                </div>
              </div>
            )
          })}

          {/* Stats row */}
          <div className="flex justify-between mt-4 pt-3" style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
            <Stat label="던진 수" value={current.total} />
            <Stat label="미결" value={current.unresolvedCount} />
            <Stat label="반복" value={current.recurringCount} />
            <Stat label="통제불가" value={current.uncontrollable} />
          </div>
        </div>

        {/* Changes */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginBottom: 8 }}>변화</p>
          {changes.map((line, i) => (
            <p key={i} style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 1.6, marginBottom: 4 }}>
              {line}
            </p>
          ))}
        </div>

        {/* Heaviest */}
        {current.heaviest && (
          <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginBottom: 8 }}>가장 무거운 것</p>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>
              "{current.heaviest.text}"
            </p>
            <p style={{ color: DOMAIN_INFO[current.heaviest.domain].color, fontSize: 10, marginTop: 4, opacity: 0.6 }}>
              {DOMAIN_INFO[current.heaviest.domain].label} · 무게 {current.heaviest.mass}
            </p>
          </div>
        )}

        {/* Share button */}
        <button
          onClick={handleShare}
          className="w-full py-3 rounded-xl text-sm"
          style={{
            background: 'rgba(75,95,190,0.15)',
            border: '0.5px solid rgba(75,95,190,0.25)',
            color: 'rgba(133,149,210,0.8)',
            fontSize: 13,
          }}
        >
          리포트 이미지 저장
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: 500 }}>{value}</p>
      <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>{label}</p>
    </div>
  )
}

// ── Share as image ────────────────────────────
async function handleShare() {
  const el = document.getElementById('locus-report')
  if (!el) return

  try {
    // html2canvas 없이 간단한 방법: 클립보드에 텍스트 복사
    const text = el.innerText
    await navigator.clipboard.writeText(`LŌCUS Weekly Report\n\n${text}`)
    alert('리포트가 클립보드에 복사되었습니다.')
  } catch {
    alert('복사에 실패했습니다.')
  }
}
