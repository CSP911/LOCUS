import { Router } from 'express'
import { computeGravity } from '../services/gravity/compute'

export const gravityRouter = Router()

/**
 * GET /gravity/:userId
 * 현재 Gravity Field 조회
 *
 * GET /gravity/:userId/star-candy
 * Star Candy 형상 (X/Y/Z 균형 지표) 조회
 */
gravityRouter.get('/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params
    const gravity = await computeGravity(userId)
    res.json(gravity)
  } catch (err) {
    next(err)
  }
})

gravityRouter.get('/:userId/star-candy', async (req, res, next) => {
  try {
    const { userId } = req.params
    const gravity = await computeGravity(userId)

    // Star Candy 형상 — X/Y/Z 축별 강도 합산
    // TODO: 실제 별 데이터 기반 계산으로 교체
    const starCandy = {
      X: gravity.defaultGravity.X ?? 0,
      Y: gravity.defaultGravity.Y ?? 0,
      Z: gravity.defaultGravity.Z ?? 0,
      isBalanced: false, // 세 축 균형 여부
    }
    const values = [starCandy.X, starCandy.Y, starCandy.Z]
    const max = Math.max(...values)
    const min = Math.min(...values)
    starCandy.isBalanced = max - min < 0.3

    res.json(starCandy)
  } catch (err) {
    next(err)
  }
})
