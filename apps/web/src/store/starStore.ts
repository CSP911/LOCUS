import { create } from 'zustand'
import type { Star, Domain } from '@locus/shared'

// ── Types ─────────────────────────────────────
interface FlyingStar {
  id: string
  text: string
  domain: Domain
  progress: number
}

interface StarStore {
  stars: Star[]
  flying: FlyingStar[]
  throwStar: (text: string) => Promise<void>
  addStar: (star: Star) => void
  clearFlying: (id: string) => void
}

// ── Local fallback classifier ─────────────────
function classifyLocal(text: string): { domain: Domain; intensity: number } {
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

  return { domain, intensity: Math.floor(Math.random() * 3) + 2 }
}

// ── Anchor / orbit recalculation ──────────────
function recalcAnchors(stars: Star[]): Star[] {
  const byDomain: Record<Domain, Star[]> = { X: [], Y: [], Z: [] }
  stars.forEach(s => byDomain[s.domain].push(s))

  return stars.map(star => {
    const group = byDomain[star.domain]
    const heaviest = group.reduce((a, b) => a.mass > b.mass ? a : b, group[0])
    const isAnchor = star.id === heaviest.id

    let orbitParent: string | null = null
    if (!isAnchor) {
      orbitParent = heaviest.id
    }

    return { ...star, isAnchor, orbitParent }
  })
}

// ── Store ─────────────────────────────────────
export const useStarStore = create<StarStore>((set, get) => ({
  stars: [],
  flying: [],

  throwStar: async (text: string) => {
    const id = crypto.randomUUID()

    // 1) Classify via API, fallback to local
    let domain: Domain
    let intensity: number
    try {
      const res = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      domain = data.domain as Domain
      intensity = data.intensity ?? (Math.floor(Math.random() * 3) + 2)
    } catch {
      const local = classifyLocal(text)
      domain = local.domain
      intensity = local.intensity
    }

    // 2) Flying state
    const flyingStar: FlyingStar = { id, text, domain, progress: 0 }
    set(s => ({ flying: [...s.flying, flyingStar] }))

    // 3) Land after animation
    setTimeout(() => {
      // intensity 1~5 → normalized 0.0~1.0 for visual
      const normIntensity = Math.min(1, Math.max(0.1, intensity / 5))
      const mass = intensity * 2 // mass: 2~10

      const star: Star = {
        id,
        text,
        domain,
        intensity: normIntensity,
        mass,
        createdAt: new Date().toISOString(),
        isAnchor: false,
        orbitParent: null,
      }

      const updated = recalcAnchors([...get().stars, star])
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
}))
