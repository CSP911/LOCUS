import { apiCall } from './api'

/**
 * 단계별 체크인 알림 스케줄링
 *
 * 각 step의 checkinTime에 맞춰 알림 예약.
 * 알림 탭 시 앱이 열리고 해당 단계로 이동.
 */
export async function scheduleStepNotifications(
  goalText: string,
  steps: { order: number; text: string; checkinTime: number; checkinMessage: string }[]
) {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')

    const perm = await LocalNotifications.requestPermissions()
    if (perm.display !== 'granted') return

    // 기존 알림 취소
    const pending = await LocalNotifications.getPending()
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel(pending)
    }

    const now = new Date()
    const notifications = steps.map((step) => {
      const hours = Math.floor(step.checkinTime)
      const minutes = Math.round((step.checkinTime - hours) * 60)
      const scheduleDate = new Date(now)
      scheduleDate.setHours(hours, minutes, 0, 0)

      if (scheduleDate <= now) return null

      return {
        id: step.order,
        title: 'LŌCUS',
        body: step.checkinMessage,
        schedule: { at: scheduleDate },
        extra: { stepOrder: step.order, goalText },
        smallIcon: 'ic_launcher',
      }
    }).filter(Boolean)

    console.log('[noti] scheduling', notifications.length, 'of', steps.length, 'steps')
    steps.forEach(s => {
      const h = Math.floor(s.checkinTime)
      const m = Math.round((s.checkinTime - h) * 60)
      const d = new Date()
      d.setHours(h, m, 0, 0)
      console.log(`[noti]   step ${s.order}: ${h}:${String(m).padStart(2,'0')} → ${d <= new Date() ? 'SKIPPED (past)' : 'OK'}`)
    })

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications: notifications as any })
      const after = await LocalNotifications.getPending()
      console.log('[noti] pending after schedule:', after.notifications.length)
    } else {
      console.log('[noti] no future notifications to schedule')
    }

    // 알림 탭 리스너 등록
    await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
      const stepOrder = notification.notification.extra?.stepOrder
      if (stepOrder) {
        // URL hash로 단계 정보 전달 — GoalMain에서 읽음
        window.location.hash = `step-${stepOrder}`
      }
    })
  } catch {
    // 웹 환경 — 스킵
  }
}

/**
 * 모든 예약된 알림 취소 — 도전 마무리(완료/지연/취소) 시 호출
 */
export async function cancelAllNotifications() {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const pending = await LocalNotifications.getPending()
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel(pending)
    }
  } catch {
    // 웹 환경 — 스킵
  }
}

// 기존 함수 호환용
export async function scheduleCheckinNotifications(goalText: string) {
  // process-goal에서 steps와 함께 호출하는 scheduleStepNotifications로 대체됨
  // 이 함수는 steps 없이 호출될 때의 fallback
  const defaultSteps = [
    { order: 1, text: '', checkinTime: 14, checkinMessage: `${goalText} — 진행 중인가요?` },
    { order: 2, text: '', checkinTime: 21, checkinMessage: `${goalText} — 오늘 어떻게 됐나요?` },
  ]
  await scheduleStepNotifications(goalText, defaultSteps)
}
