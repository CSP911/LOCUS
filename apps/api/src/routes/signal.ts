import { Router } from 'express'
import { generateSignal } from '../services/signal/generate'

export const signalRouter = Router()

/**
 * GET /signal/:userId
 * 현재 Gravity 기반 제안 조회
 *
 * LŌCUS 제안 원칙:
 * - 해결 요구 없음. 유도 없음. 사실의 출현.
 * - Gravity 충분히 형성됐을 때만 (signalLevel >= 1)
 * - 사용자가 열려있는 전이 순간에만
 */
signalRouter.get('/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params
    const signal = await generateSignal(userId)

    if (!signal) {
      // Gravity 미형성 — 제안 없음
      return res.json({ signal: null, reason: 'gravity_insufficient' })
    }

    res.json({ signal })
  } catch (err) {
    next(err)
  }
})

/**
 * PATCH /signal/:signalId/seen
 * 제안 확인 처리
 */
signalRouter.patch('/:signalId/seen', async (req, res, next) => {
  try {
    // TODO: DB 업데이트
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})
