import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import { classifyRouter } from './routes/classify'
import { gravityRouter } from './routes/gravity'
import { signalRouter } from './routes/signal'
import { userRouter } from './routes/user'
import { suggestSmallRouter } from './routes/suggest-small'
import { perspectiveRouter } from './routes/perspective'
import { clarifyGoalRouter } from './routes/clarify-goal'
import { suggestCheckinTimesRouter } from './routes/suggest-checkin-times'
import { checkinRespondRouter } from './routes/checkin-respond'
import { processGoalRouter } from './routes/process-goal'
import { errorMiddleware } from './middleware/error'
import { logMiddleware } from './middleware/log'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

// ── Middleware ──────────────────────────
// 모바일 앱 + 웹 모두 허용
app.use(cors({
  origin: process.env.WEB_URL || '*',
  methods: ['GET', 'POST'],
}))
app.use(express.json())
app.use(logMiddleware)

// ── Routes ──────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', name: 'LŌCUS API' }))
app.use('/classify', classifyRouter)
app.use('/gravity', gravityRouter)
app.use('/signal', signalRouter)
app.use('/user', userRouter)
app.use('/suggest-small', suggestSmallRouter)
app.use('/perspective', perspectiveRouter)
app.use('/clarify-goal', clarifyGoalRouter)
app.use('/suggest-checkin-times', suggestCheckinTimesRouter)
app.use('/checkin-respond', checkinRespondRouter)
app.use('/process-goal', processGoalRouter)

// ── Error Handler ───────────────────────
app.use(errorMiddleware)

app.listen(PORT, () => {
  console.log(`\n  LŌCUS API running on http://localhost:${PORT}\n`)
})

export default app
