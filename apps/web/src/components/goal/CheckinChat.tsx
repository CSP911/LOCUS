'use client'

import { useState } from 'react'

interface CheckinChatProps {
  goal: string
  stepText: string
  checkinMessage: string
  onComplete: () => void
  onReplan: () => Promise<'replanned' | 'ended'>
  onClose: () => void
}

/**
 * CheckinChat — 체크인 확인
 *
 * "했어요" → 단계 완료
 * "이따 할게요" → LLM 리플랜 → 성공 시 재스케줄 / 실패 시 도전 마무리
 */
export function CheckinChat({ stepText, checkinMessage, onComplete, onReplan, onClose }: CheckinChatProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<'replanned' | 'ended' | null>(null)

  async function handleDefer() {
    setLoading(true)
    const res = await onReplan()
    setResult(res)
    setLoading(false)
  }

  // 리플랜 결과 표시
  if (result) {
    return (
      <div
        className="absolute inset-0 z-30 flex items-center justify-center"
        style={{ background: 'rgba(6,8,13,0.96)', backdropFilter: 'blur(12px)' }}
      >
        <div className="w-full max-w-xs px-5 text-center">
          <p style={{
            color: result === 'replanned' ? 'rgba(100,200,150,0.7)' : 'rgba(255,255,255,0.5)',
            fontSize: 14,
            lineHeight: 1.6,
            marginBottom: 20,
          }}>
            {result === 'replanned'
              ? '알림 시간을 다시 잡았어요.'
              : '오늘은 여기까지로 할게요.'}
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-sm"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            확인
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center"
      style={{ background: 'rgba(6,8,13,0.96)', backdropFilter: 'blur(12px)' }}
    >
      <div className="w-full max-w-xs px-5">
        {/* 체크인 메시지 */}
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.6, marginBottom: 6 }}>
          {checkinMessage}
        </p>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, marginBottom: 24 }}>
          {stepText}
        </p>

        {/* 2버튼 or 로딩 */}
        {loading ? (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center' }}>
            시간 다시 잡는 중...
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <button
              onClick={onComplete}
              className="w-full py-3 rounded-xl text-sm"
              style={{
                background: 'rgba(100,200,150,0.1)',
                border: '0.5px solid rgba(100,200,150,0.2)',
                color: 'rgba(100,200,150,0.8)',
              }}
            >
              했어요
            </button>
            <button
              onClick={handleDefer}
              className="w-full py-3 rounded-xl text-sm"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.35)',
              }}
            >
              이따 할게요
            </button>
          </div>
        )}

        {/* 닫기 */}
        {!loading && (
          <button
            onClick={onClose}
            className="w-full mt-4"
            style={{ color: 'rgba(255,255,255,0.12)', fontSize: 11 }}
          >
            닫기
          </button>
        )}
      </div>
    </div>
  )
}
