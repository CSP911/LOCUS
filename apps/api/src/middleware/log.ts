import type { Request, Response, NextFunction } from 'express'

export function logMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()

  // 요청 body 로깅 (POST만)
  if (req.method === 'POST' && req.body) {
    console.log(`  → ${req.method} ${req.originalUrl}`, JSON.stringify(req.body).slice(0, 200))
  }

  // 응답 로깅
  const originalJson = res.json.bind(res)
  res.json = (body: any) => {
    const ms = Date.now() - start
    console.log(`  ← ${req.method} ${req.originalUrl} ${res.statusCode} — ${ms}ms`)

    // process-goal 응답은 전체 로깅
    if (req.originalUrl === '/process-goal') {
      console.log(`    result:`, JSON.stringify(body).slice(0, 500))
    }

    return originalJson(body)
  }

  next()
}
