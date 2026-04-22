/**
 * 테스트 알림 — 10초 후 발송
 * 디버그용. 앱에서 호출하면 10초 후 알림이 오는지 확인.
 */
export async function sendTestNotification() {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')

    // 권한 확인
    const perm = await LocalNotifications.requestPermissions()
    console.log('[test-noti] permission:', perm.display)
    if (perm.display !== 'granted') {
      alert('알림 권한이 없습니다')
      return
    }

    // 기존 알림 확인
    const pending = await LocalNotifications.getPending()
    console.log('[test-noti] pending:', pending.notifications.length)

    // 10초 후 알림 예약
    const at = new Date(Date.now() + 10000)
    console.log('[test-noti] scheduling for:', at.toISOString())

    await LocalNotifications.schedule({
      notifications: [{
        id: 999,
        title: 'LŌCUS 테스트',
        body: '이 알림이 보이면 정상 작동!',
        schedule: { at },
        sound: undefined,
        smallIcon: 'ic_launcher',
      }],
    })

    // 예약 확인
    const after = await LocalNotifications.getPending()
    console.log('[test-noti] after schedule, pending:', after.notifications.length)
    alert(`알림 예약됨 (${after.notifications.length}개). 10초 후 확인하세요. 앱을 닫아도 됩니다.`)

  } catch (err: any) {
    console.error('[test-noti] error:', err)
    alert('알림 예약 실패: ' + err.message)
  }
}
