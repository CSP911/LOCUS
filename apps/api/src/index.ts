import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import { classifyRouter } from './routes/classify'
import { gravityRouter } from './routes/gravity'
import { signalRouter } from './routes/signal'
import { userRouter } from './routes/user'
import { errorMiddleware } from './middleware/error'
import { logMiddleware } from './middleware/log'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

// ── Middleware ──────────────────────────
app.use(cors({ origin: process.env.WEB_URL || 'http://localhost:3000' }))
app.use(express.json())
app.use(logMiddleware)

// ── Routes ──────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', name: 'LŌCUS API' }))
app.use('/classify', classifyRouter)
app.use('/gravity', gravityRouter)
app.use('/signal', signalRouter)
app.use('/user', userRouter)

// ── Error Handler ───────────────────────
app.use(errorMiddleware)

app.listen(PORT, () => {
  console.log(`\n  LŌCUS API running on http://localhost:${PORT}\n`)
})

export default app
