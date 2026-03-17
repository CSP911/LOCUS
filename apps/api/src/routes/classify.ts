import { Router } from 'express'
import { z } from 'zod'
import { classifyText } from '../services/weight/classifier'

export const classifyRouter = Router()

const schema = z.object({
  text: z.string().min(1).max(30),
})

/**
 * POST /classify
 *
 * 자연어 텍스트 → Weight 4축 분류
 *
 * Phase 1: Claude API 기반 (프로토타입)
 * Phase 2: KoBERT 파인튜닝 모델로 교체
 */
classifyRouter.post('/', async (req, res, next) => {
  try {
    const { text } = schema.parse(req.body)
    const weight = await classifyText(text)
    res.json(weight)
  } catch (err) {
    next(err)
  }
})
