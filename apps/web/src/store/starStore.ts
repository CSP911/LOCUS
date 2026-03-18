import { create } from 'zustand'
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
  throwStar: (text: string, question?: string) => Promise<void>
  addStar: (star: Star) => void
  clearFlying: (id: string) => void
}

// ── A) Mass calculation formula ───────────────
// mass = intensity × natureMult × directionMult
function calculateMass(intensity: number, nature: Nature[], direction: 'in' | 'out'): number {
  let natureMult = 1.0
  if (nature.includes('unresolved') && nature.includes('recurring')) {
    natureMult = 1.8 // 미결 + 반복 = 가장 무거움
  } else if (nature.includes('unresolved')) {
    natureMult = 1.5
  } else if (nature.includes('recurring')) {
    natureMult = 1.3
  }
  // onetime = 1.0

  const directionMult = direction === 'out' ? 1.2 : 1.0

  return Math.round(intensity * natureMult * directionMult * 10) / 10
}

// ── B) Repeat detection — boost similar stars ─
// 같은 도메인에서 비슷한 텍스트가 반복 던져지면 기존 별의 mass를 증가시킴
function detectAndBoostRepeats(
  stars: Star[],
  newText: string,
  newDomain: Domain,
): Star[] {
  const BOOST = 1.5 // 반복 시 기존 별에 추가되는 mass

  // 같은 도메인의 기존 별들과 유사도 체크
  return stars.map(star => {
    if (star.domain !== newDomain) return star

    const similarity = textSimilarity(star.text, newText)
    if (similarity < 0.3) return star

    // 유사한 별 발견 → mass 증가 (파급력 증가)
    const boost = BOOST * similarity
    return {
      ...star,
      mass: Math.round((star.mass + boost) * 10) / 10,
    }
  })
}

// 간단한 한국어 텍스트 유사도 (공통 글자 비율)
function textSimilarity(a: string, b: string): number {
  if (a === b) return 1.0

  // 2-gram 기반 유사도
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

// ── Anchor / orbit recalculation ──────────────
function recalcAnchors(stars: Star[]): Star[] {
  const byDomain: Record<Domain, Star[]> = { X: [], Y: [], Z: [] }
  stars.forEach(s => byDomain[s.domain].push(s))

  return stars.map(star => {
    const group = byDomain[star.domain]
    const heaviest = group.reduce((a, b) => a.mass > b.mass ? a : b, group[0])
    const isAnchor = star.id === heaviest.id
    const orbitParent = isAnchor ? null : heaviest.id
    return { ...star, isAnchor, orbitParent }
  })
}

// ── Store ─────────────────────────────────────
export const useStarStore = create<StarStore>((set, get) => ({
  stars: [],
  flying: [],

  throwStar: async (text: string, question?: string) => {
    const id = crypto.randomUUID()

    // 1) Classify via API, fallback to local
    let data: ClassifyResponse
    try {
      const res = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      data = await res.json()
    } catch {
      data = classifyLocal(text)
    }

    const { domain, intensity, direction, nature } = data

    // 2) Flying state
    const flyingStar: FlyingStar = { id, text, domain, progress: 0 }
    set(s => ({ flying: [...s.flying, flyingStar] }))

    // 3) Land after animation
    setTimeout(() => {
      // A) 복합 mass 공식
      const mass = calculateMass(intensity, nature, direction)
      const normIntensity = Math.min(1, Math.max(0.1, intensity / 5))

      const weight: Weight = {
        domain,
        intensity: Math.round(intensity) as 1 | 2 | 3 | 4 | 5,
        direction,
        nature,
      }

      const star: Star = {
        id,
        text,
        question,
        domain,
        weight,
        intensity: normIntensity,
        mass,
        createdAt: new Date().toISOString(),
        isAnchor: false,
        orbitParent: null,
      }

      // B) 반복 감지 — 기존 유사 별의 mass 증가
      const boostedStars = detectAndBoostRepeats(get().stars, text, domain)
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
}))
