'use client'

import { useState, useRef } from 'react'
import { apiCall } from '@/lib/api'

interface CheckinChatProps {
  goal: string
  stepText: string
  checkinMessage: string
  onComplete: () => void
  onDefer: () => void
  onSkip: () => void
  onClose: () => void
}

interface ChatMessage {
  from: 'system' | 'user'
  text: string
}

/**
 * CheckinChat — 채팅형 체크인
 *
 * 알람 시간에 뜨는 대화 인터페이스.
 * 숏컷 버튼 + 자유 텍스트 입력 가능.
 * LLM이 응답하고 다음 액션 결정.
 */
export function CheckinChat({ goal, stepText, checkinMessage, onComplete, onDefer, onSkip, onClose }: CheckinChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { from: 'system', text: checkinMessage },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function sendMessage(text: string) {
    if (loading || done) return
    setLoading(true)
    setMessages(prev => [...prev, { from: 'user', text }])
    setInput('')

    const result = await apiCall<{
      reaction: string
      action: 'complete' | 'defer' | 'skip'
    }>('/checkin-respond', { goal, stepText, userMessage: text })

    if (result) {
      setMessages(prev => [...prev, { from: 'system', text: result.reaction }])

      // 2초 후 액션 처리
      setTimeout(() => {
        setDone(true)
        if (result.action === 'complete') onComplete()
        else if (result.action === 'skip') onSkip()
        else onDefer()
      }, 2000)
    } else {
      // fallback
      setMessages(prev => [...prev, { from: 'system', text: '알겠어요.' }])
      setTimeout(() => { setDone(true); onDefer() }, 1500)
    }

    setLoading(false)
  }

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col"
      style={{ background: 'rgba(6,8,13,0.96)', backdropFilter: 'blur(12px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{stepText}</p>
        <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>닫기</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-[80%] rounded-xl px-3 py-2 ${msg.from === 'user' ? 'self-end' : 'self-start'}`}
            style={{
              background: msg.from === 'user'
                ? 'rgba(100,200,150,0.1)'
                : 'rgba(255,255,255,0.04)',
              border: `0.5px solid ${msg.from === 'user'
                ? 'rgba(100,200,150,0.15)'
                : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            <p style={{
              color: msg.from === 'user'
                ? 'rgba(100,200,150,0.8)'
                : 'rgba(255,255,255,0.6)',
              fontSize: 13,
              lineHeight: 1.5,
            }}>
              {msg.text}
            </p>
          </div>
        ))}

        {loading && (
          <div className="self-start rounded-xl px-3 py-2"
            style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>...</p>
          </div>
        )}
      </div>

      {/* Shortcuts + Input */}
      {!done && (
        <div className="px-4 pb-4">
          {/* 숏컷 버튼 */}
          {messages.length <= 1 && !loading && (
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => sendMessage('했어요')}
                className="px-3 py-1.5 rounded-lg text-xs"
                style={{
                  background: 'rgba(100,200,150,0.1)',
                  border: '0.5px solid rgba(100,200,150,0.2)',
                  color: 'rgba(100,200,150,0.7)',
                }}
              >
                했어요 ✓
              </button>
              <button
                onClick={() => sendMessage('아직 못 했어요')}
                className="px-3 py-1.5 rounded-lg text-xs"
                style={{
                  background: 'rgba(255,200,100,0.06)',
                  border: '0.5px solid rgba(255,200,100,0.12)',
                  color: 'rgba(255,200,100,0.5)',
                }}
              >
                아직이요
              </button>
              <button
                onClick={() => sendMessage('오늘은 넘길게요')}
                className="px-3 py-1.5 rounded-lg text-xs"
                style={{ color: 'rgba(255,255,255,0.2)' }}
              >
                넘길게요
              </button>
            </div>
          )}

          {/* 자유 입력 */}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value.slice(0, 100))}
              onKeyDown={e => { if (e.key === 'Enter' && input.trim()) sendMessage(input.trim()) }}
              placeholder="자유롭게 말해도 돼요..."
              disabled={loading || done}
              className="flex-1 px-3 py-2.5 rounded-xl text-sm text-white"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '0.5px solid rgba(255,255,255,0.11)',
                fontSize: 13,
              }}
            />
            <button
              onClick={() => { if (input.trim()) sendMessage(input.trim()) }}
              disabled={!input.trim() || loading || done}
              className="px-3 py-2.5 rounded-xl text-xs"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              보내기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
