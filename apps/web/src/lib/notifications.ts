import { apiCall } from './api'

/**
 * 도전과제에 맞는 체크인 알림 스케줄���
 *
 * Capacitor LocalNotifications를 동적 import로 사용 (웹에서는 무시)
 */
export async function scheduleCheckinNotifications(goalText: string) {
  // 1) LLM에게 최적 시간 물어보기
  let times = [14, 21]
  const result = await apiCall<{ times: number[] }>('/suggest-checkin-times', { goal: goalText })
  if (result?.times && result.times.length === 2) {
    times = result.times
  }

  // 2) Capacitor 환경인지 확인
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')

    // 권한 요청
    const perm = await LocalNotifications.requestPermissions()
    if (perm.display !== 'granted') return

    // 기존 알림 취소
    const pending = await LocalNotifications.getPending()
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel(pending)
    }

    // 오늘 날짜 기준으로 스케줄링
    const now = new Date()
    const notifications = times.map((hour, i) => {
      const scheduleDate = new Date(now)
      scheduleDate.setHours(hour, 0, 0, 0)

      // 이미 지난 시간이면 스���
      if (scheduleDate <= now) return null

      return {
        id: i + 1,
        title: 'LŌCUS',
        body: i === 0
          ? `"${goalText}" — 진행 중인가요?`
          : `"${goalText}" — 오늘 어떻게 됐나요?`,
        schedule: { at: scheduleDate },
        sound: undefined,
        smallIcon: 'ic_launcher',
      }
    }).filter(Boolean)

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications: notifications as any })
    }
  } catch {
    // 웹 환경 — 알림 스킵
  }
}
