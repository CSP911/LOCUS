/**
 * 단계별 체크인 알림 스케줄링
 *
 * 테스트 알림과 100% 동일한 구조로 — extra 제거, 이모지 제거, 하나씩 schedule
 */
export async function scheduleStepNotifications(
  goalText: string,
  steps: { order: number; text: string; checkinTime: number; checkinMessage: string }[]
) {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')

    const perm = await LocalNotifications.requestPermissions()
    if (perm.display !== 'granted') return

    // 기존 알림 전부 취소
    const pending = await LocalNotifications.getPending()
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel(pending)
    }

    const nowMs = Date.now()
    const nowDate = new Date()
    // 오늘 0시 0분 0초 기준 ms
    const todayStart = new Date(nowDate)
    todayStart.setHours(0, 0, 0, 0)
    const todayStartMs = todayStart.getTime()
    let scheduled = 0

    for (const step of steps) {
      // checkinTime(소수 시간) → 밀리초 직접 변환 (초 단위 정밀도 유지)
      const targetMs = todayStartMs + step.checkinTime * 3600000
      const diffMs = targetMs - nowMs

      if (diffMs <= 0) continue

      const at = new Date(nowMs + diffMs)
      const body = `Step ${step.order}: ${step.text}`.slice(0, 100) // 이모지 없는 순수 텍스트, 100자 제한

      await LocalNotifications.schedule({
        notifications: [{
          id: 900 + step.order,
          title: 'LŌCUS',
          body,
          schedule: { at, allowWhileIdle: true, exact: true } as any,
          smallIcon: 'ic_launcher',
        }],
      })

      scheduled++
    }

    // 알림 예약 완료 (디버그 alert 제거됨)

    // 알림 수신 리스너 — 알림이 도착하면 해당 단계 활성화
    if (!(window as any).__locusNotiListener) {
      (window as any).__locusNotiListener = true

      // 포그라운드에서 알림 수신 시
      await LocalNotifications.addListener('localNotificationReceived', async (notification) => {
        const stepOrder = notification.id - 900
        if (stepOrder > 0 && stepOrder <= 10) {
          const { useGoalStore } = await import('@/store/goalStore')
          useGoalStore.getState().revealStep(stepOrder)
        }
      })

      // 알림 탭해서 앱 열 때
      await LocalNotifications.addListener('localNotificationActionPerformed', async (action) => {
        const stepOrder = action.notification.id - 900
        if (stepOrder > 0 && stepOrder <= 10) {
          const { useGoalStore } = await import('@/store/goalStore')
          useGoalStore.getState().revealStep(stepOrder)
        }
      })
    }
  } catch (err: any) {
    console.error('알림 에러:', err)
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
  } catch {}
}

// 기존 호환
export async function scheduleCheckinNotifications(goalText: string) {
  const defaultSteps = [
    { order: 1, text: '중간 체크', checkinTime: 14, checkinMessage: '진행 중인가요?' },
    { order: 2, text: '마무리 체크', checkinTime: 21, checkinMessage: '오늘 어떻게 됐나요?' },
  ]
  await scheduleStepNotifications(goalText, defaultSteps)
}
