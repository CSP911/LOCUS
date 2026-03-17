import { Router } from 'express'

export const userRouter = Router()

/**
 * POST /user
 * 신규 유저 생성
 *
 * GET /user/:userId
 * 유저 조회 (signalLevel 포함)
 *
 * PATCH /user/:userId/onboarding
 * 초기 캘리브레이션 완료 처리
 */
userRouter.post('/', async (req, res, next) => {
  try {
    // TODO: DB 저장
    const user = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      gravityUnlocked: false,
      signalLevel: 0,
    }
    res.status(201).json(user)
  } catch (err) {
    next(err)
  }
})

userRouter.get('/:userId', async (req, res, next) => {
  try {
    // TODO: DB 조회
    res.json({ id: req.params.userId, signalLevel: 0 })
  } catch (err) {
    next(err)
  }
})

userRouter.patch('/:userId/onboarding', async (req, res, next) => {
  try {
    const { answers } = req.body
    // TODO: 온보딩 답변 기반 초기 Weight 계산 + 저장
    res.json({ ok: true, gravityUnlocked: true })
  } catch (err) {
    next(err)
  }
})
