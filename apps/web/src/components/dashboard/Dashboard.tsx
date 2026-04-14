'use client'

import { useState } from 'react'
import { useStarStore } from '@/store/starStore'
import type { Star, Domain } from '@locus/shared'

const DOMAIN_INFO: Record<Domain, { label: string; color: string; desc: string }> = {
  X: { label: '건강', color: '#7ec8e3', desc: '몸·수면·식사·운동·휴식' },
  Y: { label: '일', color: '#ddd8b0', desc: '업무·성과·마감·책임' },
  Z: { label: '관계', color: '#f0a870', desc: '사람·대화·감정·소속' },
}

type Tab = 'all' | 'unresolved' | 'weight' | 'domain' | 'control'

export function Dashboard({ onClose }: { onClose: () => void }) {
  const stars = useStarStore(s => s.stars)
  const resolveStar = useStarStore(s => s.resolveStar)
  const unresolveStar = useStarStore(s => s.unresolveStar)
  const getUnresolved = useStarStore(s => s.getUnresolved)
  const getByWeight = useStarStore(s => s.getByWeight)
  const getControllable = useStarStore(s => s.getControllable)

  const [tab, setTab] = useState<Tab>('all')
  const [domainFilter, setDomainFilter] = useState<Domain | null>(null)

  const unresolved = getUnresolved()
  const byWeight = getByWeight()
  const { in: controllable, out: uncontrollable } = getControllable()

  const [controlFilter, setControlFilter] = useState<'in' | 'out' | null>(null)

  const filtered = (() => {
    switch (tab) {
      case 'unresolved': return unresolved
      case 'weight': return byWeight
      case 'domain':
        return domainFilter
          ? stars.filter(s => s.domain === domainFilter)
          : stars
      case 'control':
        if (controlFilter === 'in') return controllable
        if (controlFilter === 'out') return uncontrollable
        return [...controllable, ...uncontrollable]
      default: return stars
    }
  })()

  return (
    <div
      className="absolute inset-0 z-20 overflow-hidden"
      style={{ background: 'rgba(6,8,13,0.96)', backdropFilter: 'blur(20px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 500 }}>
          내 무게들
        </h2>
        <button
          onClick={onClose}
          style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}
        >
          닫기
        </button>
      </div>

      {/* Summary bar */}
      <div className="px-4 pb-3">
        <SummaryBar stars={stars} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pb-3">
        {([
          ['all', '전체'],
          ['unresolved', `미결 (${unresolved.length})`],
          ['weight', '무게순'],
          ['domain', '분류별'],
          ['control', '통제'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setTab(key); setDomainFilter(null); setControlFilter(null) }}
            className="px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{
              background: tab === key ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: tab === key ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)',
              border: '0.5px solid',
              borderColor: tab === key ? 'rgba(255,255,255,0.12)' : 'transparent',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Domain sub-tabs */}
      {tab === 'domain' && (
        <div className="flex gap-2 px-4 pb-3">
          {(['X', 'Y', 'Z'] as Domain[]).map(d => {
            const info = DOMAIN_INFO[d]
            const count = stars.filter(s => s.domain === d).length
            return (
              <button
                key={d}
                onClick={() => setDomainFilter(domainFilter === d ? null : d)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs"
                style={{
                  background: domainFilter === d ? `${info.color}15` : 'transparent',
                  color: domainFilter === d ? info.color : 'rgba(255,255,255,0.3)',
                  border: `0.5px solid ${domainFilter === d ? `${info.color}30` : 'transparent'}`,
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: info.color }} />
                {info.label} ({count})
              </button>
            )
          })}
        </div>
      )}

      {/* Control sub-tabs */}
      {tab === 'control' && (
        <div className="flex gap-2 px-4 pb-3">
          <button
            onClick={() => setControlFilter(controlFilter === 'in' ? null : 'in')}
            className="px-3 py-1 rounded-lg text-xs"
            style={{
              background: controlFilter === 'in' ? 'rgba(100,200,100,0.1)' : 'transparent',
              color: controlFilter === 'in' ? 'rgba(100,200,100,0.7)' : 'rgba(255,255,255,0.3)',
              border: `0.5px solid ${controlFilter === 'in' ? 'rgba(100,200,100,0.2)' : 'transparent'}`,
            }}
          >
            내가 할 수 있는 것 ({controllable.length})
          </button>
          <button
            onClick={() => setControlFilter(controlFilter === 'out' ? null : 'out')}
            className="px-3 py-1 rounded-lg text-xs"
            style={{
              background: controlFilter === 'out' ? 'rgba(160,160,255,0.1)' : 'transparent',
              color: controlFilter === 'out' ? 'rgba(160,160,255,0.7)' : 'rgba(255,255,255,0.3)',
              border: `0.5px solid ${controlFilter === 'out' ? 'rgba(160,160,255,0.2)' : 'transparent'}`,
            }}
          >
            기다려야 하는 것 ({uncontrollable.length})
          </button>
        </div>
      )}

      {/* Direction summary on all tab */}
      {tab === 'all' && stars.length > 0 && (
        <div className="flex gap-2 px-4 pb-3">
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
            내가 할 수 있는 것 <span style={{ color: 'rgba(255,255,255,0.4)' }}>{controllable.length}</span>
            {' · '}
            기다려야 하는 것 <span style={{ color: 'rgba(255,255,255,0.4)' }}>{uncontrollable.length}</span>
          </div>
        </div>
      )}

      {/* Star list */}
      <div className="flex-1 overflow-y-auto px-4 pb-24" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {filtered.length === 0 ? (
          <p className="text-center py-8" style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12 }}>
            {tab === 'unresolved' ? '미결 사항이 없습니다' : '아직 던진 것이 없습니다'}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((star, i) => (
              <StarCard
                key={star.id}
                star={star}
                rank={tab === 'weight' ? i + 1 : undefined}
                onResolve={() => resolveStar(star.id)}
                onUnresolve={() => unresolveStar(star.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Summary Bar ───────────────────────────────
function SummaryBar({ stars }: { stars: Star[] }) {
  if (stars.length === 0) return null

  const mass = { X: 0, Y: 0, Z: 0 }
  stars.forEach(s => { mass[s.domain] += s.mass })
  const total = mass.X + mass.Y + mass.Z || 1

  return (
    <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5">
      {(['X', 'Y', 'Z'] as Domain[]).map(d => (
        <div
          key={d}
          style={{
            width: `${(mass[d] / total) * 100}%`,
            background: DOMAIN_INFO[d].color,
            opacity: 0.6,
            minWidth: mass[d] > 0 ? 4 : 0,
          }}
        />
      ))}
    </div>
  )
}

// ── Star Card ─────────────────────────────────
function StarCard({
  star,
  rank,
  onResolve,
  onUnresolve,
}: {
  star: Star
  rank?: number
  onResolve: () => void
  onUnresolve: () => void
}) {
  const info = DOMAIN_INFO[star.domain]
  const isUnresolved = !star.resolved && star.weight?.nature.includes('unresolved')
  const isRecurring = star.weight?.nature.includes('recurring')
  const isOut = star.weight?.direction === 'out'
  const age = getAge(star.createdAt)

  return (
    <div
      className="rounded-xl px-3 py-2.5 flex gap-3 items-start"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '0.5px solid rgba(255,255,255,0.06)',
        opacity: star.resolved ? 0.4 : 1,
      }}
    >
      {/* Rank or domain dot */}
      <div className="flex-shrink-0 pt-0.5">
        {rank ? (
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: 600 }}>
            {rank}
          </span>
        ) : (
          <span
            className="block w-2 h-2 rounded-full mt-1"
            style={{ background: info.color }}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm"
          style={{
            color: star.resolved ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.75)',
            textDecoration: star.resolved ? 'line-through' : 'none',
            fontSize: 13,
          }}
        >
          {star.text}
        </p>

        {/* Tags */}
        <div className="flex gap-1.5 mt-1.5 flex-wrap">
          <span className="text-xs" style={{ color: info.color, opacity: 0.7 }}>
            {info.label}
          </span>
          {isUnresolved && !star.resolved && (
            <span className="text-xs" style={{ color: 'rgba(255,200,100,0.6)' }}>
              미결
            </span>
          )}
          {isRecurring && (
            <span className="text-xs" style={{ color: 'rgba(255,130,130,0.6)' }}>
              반복{star.repeatCount > 0 ? ` ×${star.repeatCount + 1}` : ''}
            </span>
          )}
          {isOut && (
            <span className="text-xs" style={{ color: 'rgba(160,160,255,0.5)' }}>
              기다려야 함
            </span>
          )}
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>
            {age}
          </span>
        </div>
      </div>

      {/* Resolve button */}
      {isUnresolved && !star.resolved ? (
        <button
          onClick={onResolve}
          className="flex-shrink-0 w-5 h-5 rounded-full border mt-0.5"
          style={{ borderColor: 'rgba(255,255,255,0.15)' }}
          title="해결됨"
        />
      ) : star.resolved ? (
        <button
          onClick={onUnresolve}
          className="flex-shrink-0 w-5 h-5 rounded-full mt-0.5 flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.1)' }}
          title="되돌리기"
        >
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>✓</span>
        </button>
      ) : null}
    </div>
  )
}

function getAge(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}일 전`
  const week = Math.floor(day / 7)
  return `${week}주 전`
}
