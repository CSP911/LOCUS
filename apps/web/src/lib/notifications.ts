import { apiCall } from './api'

/**
 * 단계별 체크인 알림 스케줄링
 */
export async function scheduleStepNotifications(
  goalText: string,
  steps: { order: number; text: string; checkinTime: number; checkinMessage: string }[]
) {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')

    const perm = await LocalNotifications.requestPermissions()
    if (perm.display !== 'granted') {
      console.warn('[noti] permission denied')
      return
    }

    // 기존 알림 취소
    const pending = await LocalNotifications.getPending()
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel(pending)
    }

    const now = new Date()
    const debugInfo: string[] = []

    const notifications = steps.map((step) => {
      const hours = Math.floor(step.checkinTime)
      const minutes = Math.round((step.checkinTime - hours) * 60)
      const scheduleDate = new Date()
      scheduleDate.setHours(hours, minutes, 0, 0)

      // 이미 지난 시간이면 내일로
      if (scheduleDate <= now) {
        scheduleDate.setDate(scheduleDate.getDate() + 1)
        debugInfo.push(`step${step.order}: ${hours}:${String(minutes).padStart(2,'0')} → 내일로 이동`)
      } else {
        debugInfo.push(`step${step.order}: ${hours}:${String(minutes).padStart(2,'0')} → 오늘 예약`)
      }

      return {
        id: step.order,
        title: 'LŌCUS',
        body: step.checkinMessage,
        schedule: { at: scheduleDate },
        extra: { stepOrder: step.order, goalText },
        smallIcon: 'ic_launcher',
      }
    })

    console.log('[noti] scheduling', notifications.length, 'notifications')
    debugInfo.forEach(d => console.log('[noti]  ', d))

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications: notifications as any })
      const after = await LocalNotifications.getPending()
      console.log('[noti] pending after schedule:', after.notifications.length)

      // DEV: 사용자에게 예약 결과 표시
      const summary = debugInfo.join('\n')
      alert(`알림 ${after.notifications.length}개 예약됨\n\n${summary}`)
    }

    // 알림 탭 리스너
    await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
      const stepOrder = notification.notification.extra?.stepOrder
      if (stepOrder) {
        window.location.hash = `step-${stepOrder}`
      }
    })
  } catch (err: any) {
    console.error('[noti] ERROR:', err)
    alert('알림 예약 실패: ' + (err?.message || err))
  }
}

/**
 * 모든 예약된 알림 취소
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
  const defaultSteps = [
    { order: 1, text: '', checkinTime: 14, checkinMessage: `${goalText} — 진행 중인가요?` },
    { order: 2, text: '', checkinTime: 21, checkinMessage: `${goalText} — 오늘 어떻게 됐나요?` },
  ]
  await scheduleStepNotifications(goalText, defaultSteps)
}
