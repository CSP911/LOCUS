import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiCall } from '@/lib/api'
import { useGoalStore } from './goalStore'

export interface UserProfile {
  date: string
  profile: {
    layers?: { body: number; feeling: number; thought: number; action: number; awareness: number }
    spectrum?: { internal: number; external: number }
    domains?: { X: number; Y: number; Z: number }  // legacy
    activeHours: number[]
    successRate: number
    deferPattern: Record<string, number>
    avgStepsCompleted: number
    interests: string[]
    strengths: string[]
    struggles: string[]
    personality: {
      consistency: number
      ambition: number
      flexibility: number
    }
  }
  insights: string[]
  recommendation: string | null
}

interface ProfileStore {
  currentProfile: UserProfile | null
  history: UserProfile[]
  lastUpdated: string | null
  updating: boolean

  fetchProfile: () => Promise<void>
  shouldUpdate: () => boolean
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      currentProfile: null,
      history: [],
      lastUpdated: null,
      updating: false,

      shouldUpdate: () => {
        const today = new Date().toISOString().slice(0, 10)
        return get().lastUpdated !== today
      },

      fetchProfile: async () => {
        if (get().updating) return
        set({ updating: true })

        try {
          const goals = useGoalStore.getState().goals
          if (goals.length < 1) {
            set({ updating: false })
            return
          }

          const result = await apiCall<UserProfile>('/daily-profile', { goals })

          if (result) {
            const today = new Date().toISOString().slice(0, 10)
            const prev = get().currentProfile

            set({
              currentProfile: result,
              history: prev
                ? [...get().history.filter(h => h.date !== prev.date), prev].slice(-30)
                : get().history,
              lastUpdated: today,
            })
          }
        } finally {
          set({ updating: false })
        }
      },
    }),
    {
      name: 'locus-profile',
      partialize: (state) => ({
        currentProfile: state.currentProfile,
        history: state.history,
        lastUpdated: state.lastUpdated,
      }),
    },
  ),
)
