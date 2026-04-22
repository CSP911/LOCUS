import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Star, Domain, Weight, Nature } from '@locus/shared'

// ── Types ─────────────────────────────────────
interface FlyingStar {
  id: string
  text: string
  domain: Domain
  progress: number
}

interface ClassifyResponse {
  domain: Domain
  intensity: number
  direction: 'in' | 'out'
  nature: Nature[]
  method: string
}

interface StarStore {
  stars: Star[]
  flying: FlyingStar[]
  lastThrowDomain: Domain | null
  lastThrowTime: number

  // Actions
  throwStar: (text: string, question?: string) => Promise<void>
  addStar: (star: Star) => void
  clearFlying: (id: string) => void
  resolveStar: (id: string) => void      // 미결→해결
  unresolveStar: (id: string) => void    // 해결→미결 되돌리기

  // Selectors (computed)
  getByDomain: (domain: Domain) => Star[]
  getUnresolved: () => Star[]
  getByWeight: () => Star[]              // 무게 순 정렬
  getRepeating: () => Star[]             // 반복 패턴
  getControllable: () => { in: Star[]; out: Star[] }
}

// ── Mass calculation ──────────────────────────
function calculateMass(intensity: number, nature: Nature[], direction: 'in' | 'out'): number {
  let natureMult = 1.0
  if (nature.includes('unresolved') && nature.includes('recurring')) {
    natureMult = 1.8
  } else if (nature.includes('unresolved')) {
    natureMult = 1.5
  } else if (nature.includes('recurring')) {
    natureMult = 1.3
  }
  const directionMult = direction === 'out' ? 1.2 : 1.0
  return Math.round(intensity * natureMult * directionMult * 10) / 10
}

// ── Repeat detection ──────────────────────────
function detectAndBoostRepeats(
  stars: Star[],
  newText: string,
  newDomain: Domain,
): { stars: Star[]; repeatCount: number } {
  const BOOST = 1.5
  let maxSimilarity = 0

  const boosted = stars.map(star => {
    if (star.domain !== newDomain) return star
    const similarity = textSimilarity(star.text, newText)
    if (similarity > maxSimilarity) maxSimilarity = similarity
    if (similarity < 0.3) return star

    return {
      ...star,
      mass: Math.round((star.mass + BOOST * similarity) * 10) / 10,
      repeatCount: star.repeatCount + 1,
    }
  })

  // 유사 별 개수 = 반복 횟수
  const similarCount = stars.filter(
    s => s.domain === newDomain && textSimilarity(s.text, newText) >= 0.3
  ).length

  return { stars: boosted, repeatCount: similarCount }
}

function textSimilarity(a: string, b: string): number {
  if (a === b) return 1.0
  const gramsA = new Set<string>()
  const gramsB = new Set<string>()
  for (let i = 0; i < a.length - 1; i++) gramsA.add(a.slice(i, i + 2))
  for (let i = 0; i < b.length - 1; i++) gramsB.add(b.slice(i, i + 2))
  if (gramsA.size === 0 || gramsB.size === 0) return 0
  let common = 0
  gramsA.forEach(g => { if (gramsB.has(g)) common++ })
  return common / Math.max(gramsA.size, gramsB.size)
}

// ── Local fallback classifier ─────────────────
function classifyLocal(text: string): ClassifyResponse {
  const xw = ['잠','피곤','밥','몸','쉬','운동','식사','수면','정리','아프']
  const yw = ['일','야근','발표','상사','마감','업무','성과','인정','실수','실패','집중']
  const zw = ['친구','연락','말','대화','사람','관계','혼자','외롭','신경','가족']
  let sx = 0, sy = 0, sz = 0
  xw.forEach(w => { if (text.includes(w)) sx++ })
  yw.forEach(w => { if (text.includes(w)) sy++ })
  zw.forEach(w => { if (text.includes(w)) sz++ })

  let domain: Domain
  if (!sx && !sy && !sz) domain = ['X','Y','Z'][Math.floor(Math.random()*3)] as Domain
  else if (sx >= sy && sx >= sz) domain = 'X'
  else if (sy >= sx && sy >= sz) domain = 'Y'
  else domain = 'Z'

  const nature: Nature[] = []
  if (/또|항상|매번|맨날/.test(text)) nature.push('recurring')
  if (/아직|계속|여전히/.test(text)) nature.push('unresolved')
  if (nature.length === 0) nature.push('onetime')

  let intensity = 3
  if (nature.includes('recurring')) intensity += 1
  if (nature.includes('unresolved')) intensity += 1
  intensity = Math.min(5, intensity)

  const direction = /상사|환경|날씨|타인|남|걔/.test(text) ? 'out' as const : 'in' as const
  return { domain, intensity, direction, nature, method: 'keyword' }
}

// ── Anchor recalculation ──────────────────────
function recalcAnchors(stars: Star[]): Star[] {
  const byDomain: Record<Domain, Star[]> = { X: [], Y: [], Z: [] }
  stars.forEach(s => byDomain[s.domain].push(s))
  return stars.map(star => {
    const group = byDomain[star.domain]
    const heaviest = group.reduce((a, b) => a.mass > b.mass ? a : b, group[0])
    return { ...star, isAnchor: star.id === heaviest.id, orbitParent: star.id === heaviest.id ? null : heaviest.id }
  })
}

// ── Store with localStorage persistence ───────
export const useStarStore = create<StarStore>()(
  persist(
    (set, get) => ({
      stars: [],
      flying: [],
      lastThrowDomain: null,
      lastThrowTime: 0,

      throwStar: async (text: string, question?: string) => {
        const id = crypto.randomUUID()

        let data: ClassifyResponse
        try {
          const res = await fetch('/api/classify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
          })
          if (res.ok) {
            data = await res.json()
          } else {
            data = classifyLocal(text)
          }
        } catch {
          data = classifyLocal(text)
        }

        const { domain, intensity, direction, nature } = data

        const flyingStar: FlyingStar = { id, text, domain, progress: 0 }
        set(s => ({
          flying: [...s.flying, flyingStar],
          lastThrowDomain: domain,
          lastThrowTime: Date.now(),
        }))

        setTimeout(() => {
          const mass = calculateMass(intensity, nature, direction)
          const normIntensity = Math.min(1, Math.max(0.1, intensity / 5))

          const weight: Weight = {
            layers: { body: 0.1, feeling: 0.2, thought: 0.3, action: 0.3, awareness: 0.1 },
            spectrum: { internal: direction === 'in' ? 0.7 : 0.3, external: direction === 'out' ? 0.7 : 0.3 },
            weight: normIntensity,
            nature,
            domain,
            intensity: Math.round(intensity) as 1 | 2 | 3 | 4 | 5,
            direction,
          }

          // 반복 감지
          const { stars: boostedStars, repeatCount } = detectAndBoostRepeats(get().stars, text, domain)

          const star: Star = {
            id,
            text,
            question,
            domain,
            weight,
            intensity: normIntensity,
            mass,
            createdAt: new Date().toISOString(),
            resolved: false,
            repeatCount,
            isAnchor: false,
            orbitParent: null,
          }

          const updated = recalcAnchors([...boostedStars, star])
          set({ stars: updated })
          get().clearFlying(id)
        }, 1200)
      },

      addStar: (star: Star) => {
        const updated = recalcAnchors([...get().stars, star])
        set({ stars: updated })
      },

      clearFlying: (id: string) =>
        set(s => ({ flying: s.flying.filter(f => f.id !== id) })),

      resolveStar: (id: string) =>
        set(s => ({
          stars: s.stars.map(star =>
            star.id === id ? { ...star, resolved: true } : star
          ),
        })),

      unresolveStar: (id: string) =>
        set(s => ({
          stars: s.stars.map(star =>
            star.id === id ? { ...star, resolved: false } : star
          ),
        })),

      // ── Selectors ───────────────────────────
      getByDomain: (domain: Domain) =>
        get().stars.filter(s => s.domain === domain),

      getUnresolved: () =>
        get().stars.filter(s =>
          !s.resolved && s.weight?.nature.includes('unresolved')
        ),

      getByWeight: () =>
        [...get().stars].sort((a, b) => b.mass - a.mass),

      getRepeating: () =>
        get().stars.filter(s => s.repeatCount > 0 || s.weight?.nature.includes('recurring')),

      getControllable: () => ({
        in: get().stars.filter(s => s.weight?.direction === 'in'),
        out: get().stars.filter(s => s.weight?.direction === 'out'),
      }),
    }),
    {
      name: 'locus-stars',
      // flying, lastThrow는 영속화하지 않음
      partialize: (state) => ({ stars: state.stars }),
    },
  ),
)
