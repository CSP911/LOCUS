import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Domain } from '@locus/shared'

// ── Types ─────────────────────────────────────
export interface Goal {
  id: string
  text: string              // "운동하기", "보고서 끝내기"
  domain: Domain            // 자동 분류
  createdAt: string
  active: boolean           // 현재 활성 목표인지
}

export interface DayRecord {
  id: string
  goalId: string
  date: string             // YYYY-MM-DD
  achieved: boolean        // 이겼나
  smallAction?: string     // 작은 버전을 했으면 뭘 했는지
  note?: string            // 추가 메모
}

export interface Ball {
  id: string
  timestamp: number        // 던진 시각 (ms)
  date: string             // YYYY-MM-DD
  note?: string            // 나중에 채워진 메모
  answered: boolean        // 물어봤고 답했는지
}

interface GoalStore {
  goals: Goal[]
  records: DayRecord[]
  balls: Ball[]

  // Goal actions
  addGoal: (text: string, domain: Domain) => void
  removeGoal: (id: string) => void
  toggleGoal: (id: string) => void

  // Record actions
  checkIn: (goalId: string, achieved: boolean, smallAction?: string) => void
  getTodayRecord: (goalId: string) => DayRecord | undefined
  getWeekRecords: (goalId: string) => DayRecord[]
  getStreak: (goalId: string) => number

  // Ball actions (텍스트 없는 공 던지기)
  throwBall: () => void
  answerBall: (id: string, note: string) => void
  getUnansweredBalls: () => Ball[]
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export const useGoalStore = create<GoalStore>()(
  persist(
    (set, get) => ({
      goals: [],
      records: [],
      balls: [],

      addGoal: (text: string, domain: Domain) => {
        const goal: Goal = {
          id: crypto.randomUUID(),
          text,
          domain,
          createdAt: new Date().toISOString(),
          active: true,
        }
        set(s => ({ goals: [...s.goals, goal] }))
      },

      removeGoal: (id: string) =>
        set(s => ({ goals: s.goals.filter(g => g.id !== id) })),

      toggleGoal: (id: string) =>
        set(s => ({
          goals: s.goals.map(g => g.id === id ? { ...g, active: !g.active } : g),
        })),

      checkIn: (goalId: string, achieved: boolean, smallAction?: string) => {
        const existing = get().getTodayRecord(goalId)
        if (existing) {
          // 업데이트
          set(s => ({
            records: s.records.map(r =>
              r.id === existing.id ? { ...r, achieved, smallAction } : r
            ),
          }))
        } else {
          // 새로 생성
          const record: DayRecord = {
            id: crypto.randomUUID(),
            goalId,
            date: today(),
            achieved,
            smallAction,
          }
          set(s => ({ records: [...s.records, record] }))
        }
      },

      getTodayRecord: (goalId: string) =>
        get().records.find(r => r.goalId === goalId && r.date === today()),

      getWeekRecords: (goalId: string) => {
        const now = Date.now()
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000
        return get().records.filter(r =>
          r.goalId === goalId &&
          new Date(r.date).getTime() > weekAgo
        )
      },

      getStreak: (goalId: string) => {
        const records = get().records
          .filter(r => r.goalId === goalId && r.achieved)
          .sort((a, b) => b.date.localeCompare(a.date))

        let streak = 0
        const d = new Date()
        for (let i = 0; i < 30; i++) {
          const dateStr = d.toISOString().slice(0, 10)
          if (records.find(r => r.date === dateStr)) {
            streak++
          } else if (i > 0) {
            break
          }
          d.setDate(d.getDate() - 1)
        }
        return streak
      },

      // Ball actions
      throwBall: () => {
        const ball: Ball = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          date: today(),
          answered: false,
        }
        set(s => ({ balls: [...s.balls, ball] }))
      },

      answerBall: (id: string, note: string) =>
        set(s => ({
          balls: s.balls.map(b =>
            b.id === id ? { ...b, note, answered: true } : b
          ),
        })),

      getUnansweredBalls: () =>
        get().balls.filter(b => !b.answered),
    }),
    {
      name: 'locus-goals',
    },
  ),
)
