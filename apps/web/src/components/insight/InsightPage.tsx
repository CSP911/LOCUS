'use client'

import { useEffect } from 'react'
import { useProfileStore } from '@/store/profileStore'

const DOMAIN_LABEL: Record<string, string> = { X: '건강', Y: '성과', Z: '관계' }
const DOMAIN_COLOR: Record<string, string> = { X: '#7ec8e3', Y: '#ddd8b0', Z: '#f0a870' }

export function InsightPage({ onClose }: { onClose: () => void }) {
  const profile = useProfileStore(s => s.currentProfile)
  const history = useProfileStore(s => s.history)
  const fetchProfile = useProfileStore(s => s.fetchProfile)
  const shouldUpdate = useProfileStore(s => s.shouldUpdate)
  const updating = useProfileStore(s => s.updating)

  useEffect(() => {
    if (shouldUpdate()) fetchProfile()
  }, [])

  return (
    <div
      className="absolute inset-0 z-30 overflow-y-auto"
      style={{ background: 'rgba(6,8,13,0.98)', backdropFilter: 'blur(20px)' }}
    >
      <div className="max-w-sm mx-auto px-5 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: 500 }}>
            나의 패턴
          </h2>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
            닫기
          </button>
        </div>

        {updating && (
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, marginBottom: 12 }}>분석 중...</p>
        )}

        {!profile ? (
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, textAlign: 'center', paddingTop: 40 }}>
            도전을 더 쌓으면 패턴이 보여요
          </p>
        ) : (
          <>
            {/* 도메인 분포 */}
            <Section title="관심 영역">
              <div className="flex gap-1 h-2 rounded-full overflow-hidden mb-2">
                {(['X', 'Y', 'Z'] as const).map(d => (
                  <div
                    key={d}
                    style={{
                      width: `${(profile.profile.domains[d] || 0) * 100}%`,
                      background: DOMAIN_COLOR[d],
                      opacity: 0.6,
                      minWidth: profile.profile.domains[d] > 0 ? 4 : 0,
                    }}
                  />
                ))}
              </div>
              <div className="flex gap-3">
                {(['X', 'Y', 'Z'] as const).map(d => (
                  <span key={d} className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: DOMAIN_COLOR[d] }} />
                    {DOMAIN_LABEL[d]} {Math.round((profile.profile.domains[d] || 0) * 100)}%
                  </span>
                ))}
              </div>
            </Section>

            {/* 성공률 */}
            <Section title="성공률">
              <div className="flex items-end gap-2">
                <span style={{ color: 'rgba(100,200,150,0.8)', fontSize: 28, fontWeight: 600, lineHeight: 1 }}>
                  {Math.round(profile.profile.successRate * 100)}%
                </span>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, paddingBottom: 2 }}>
                  도전 완주율
                </span>
              </div>
            </Section>

            {/* 활발한 시간 */}
            {profile.profile.activeHours.length > 0 && (
              <Section title="활발한 시간">
                <div className="flex gap-2 flex-wrap">
                  {profile.profile.activeHours.map(h => (
                    <span key={h} className="px-2 py-1 rounded-lg text-xs"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
                      {h}시
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {/* 관심사 */}
            {profile.profile.interests.length > 0 && (
              <Section title="관심사">
                <div className="flex gap-2 flex-wrap">
                  {profile.profile.interests.map((tag, i) => (
                    <span key={i} className="px-2 py-1 rounded-lg text-xs"
                      style={{ background: 'rgba(100,200,150,0.08)', color: 'rgba(100,200,150,0.6)' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {/* 강점 */}
            {profile.profile.strengths.length > 0 && (
              <Section title="강점">
                {profile.profile.strengths.map((s, i) => (
                  <p key={i} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, lineHeight: 1.6 }}>{s}</p>
                ))}
              </Section>
            )}

            {/* 어려움 */}
            {profile.profile.struggles.length > 0 && (
              <Section title="어려운 부분">
                {profile.profile.struggles.map((s, i) => (
                  <p key={i} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, lineHeight: 1.6 }}>{s}</p>
                ))}
              </Section>
            )}

            {/* 성격 지표 */}
            <Section title="성향">
              <div className="flex flex-col gap-2">
                <PersonalityBar label="꾸준함" value={profile.profile.personality.consistency} />
                <PersonalityBar label="도전성" value={profile.profile.personality.ambition} />
                <PersonalityBar label="유연성" value={profile.profile.personality.flexibility} />
              </div>
            </Section>

            {/* 인사이트 */}
            {profile.insights.length > 0 && (
              <Section title="인사이트">
                {profile.insights.map((s, i) => (
                  <p key={i} style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 1.6, marginBottom: 4 }}>{s}</p>
                ))}
              </Section>
            )}

            {/* 추천 */}
            {profile.recommendation && (
              <Section title="다음 도전?">
                <p style={{ color: 'rgba(255,200,100,0.6)', fontSize: 13, lineHeight: 1.6 }}>
                  {profile.recommendation}
                </p>
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4 mb-3" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
      <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, marginBottom: 8, letterSpacing: '0.05em' }}>
        {title}
      </p>
      {children}
    </div>
  )
}

function PersonalityBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{label}</span>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>{Math.round(value * 100)}%</span>
      </div>
      <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="h-full rounded-full" style={{ width: `${value * 100}%`, background: 'rgba(150,185,220,0.5)' }} />
      </div>
    </div>
  )
}
