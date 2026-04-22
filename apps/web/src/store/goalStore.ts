import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Domain } from '@locus/shared'

// ── Types ─────────────────────────────────────
export interface GoalStep {
  order: number
  text: string
  checkinTime: number       // 예정 시간 (6~23)
  checkinMessage: string
  done: boolean             // 완료 여���
  doneAt?: number           // 실제 완료 시간 (시.분 소수점, 예: 14.5 = 14시 30분)
}

export interface Goal {
  id: string
  text: string
  domain: Domain
  date: string
  createdAt: string
  active: boolean
  steps: GoalStep[]
  currentStep: number
  pausedUntil?: string      // ISO date — 이 날짜까지 체크인 안 함 (defer_today)
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
  addGoal: (text: string, domain: Domain, steps?: GoalStep[]) => void
  completeGoal: (id: string) => void
  completeStep: (goalId: string, stepOrder: number) => void
  pauseToday: (id: string) => void    // 오늘은 여기까지 — 내일 이어서
  getActiveGoal: () => Goal | undefined
  hasActiveGoal: () => boolean

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

      addGoal: (text: string, domain: Domain, steps?: GoalStep[]) => {
        const goal: Goal = {
          id: crypto.randomUUID(),
          text,
          domain,
          date: today(),
          createdAt: new Date().toISOString(),
          active: true,
          steps: steps || [],
          currentStep: 1,
        }
        set(s => ({ goals: [...s.goals, goal] }))
      },

      completeGoal: (id: string) =>
        set(s => ({
          goals: s.goals.map(g => g.id === id ? { ...g, active: false } : g),
        })),

      completeStep: (goalId: string, stepOrder: number) =>
        set(s => ({
          goals: s.goals.map(g => {
            if (g.id !== goalId) return g
            const now = new Date()
            const doneAt = now.getHours() + now.getMinutes() / 60
            const updatedSteps = g.steps.map(step =>
              step.order === stepOrder ? { ...step, done: true, doneAt } : step
            )
            const nextStep = stepOrder + 1
            const allDone = updatedSteps.every(step => step.done)
            return {
              ...g,
              steps: updatedSteps,
              currentStep: nextStep,
              active: !allDone,
            }
          }),
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

      pauseToday: (id: string) => {
        // 내일 0시까지 체크인 안 함
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)
        set(s => ({
          goals: s.goals.map(g =>
            g.id === id ? { ...g, pausedUntil: tomorrow.toISOString() } : g
          ),
        }))
      },

      getActiveGoal: () =>
        get().goals.find(g => g.active),

      hasActiveGoal: () =>
        get().goals.some(g => g.active),

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
