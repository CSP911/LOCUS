import type { Request, Response, NextFunction } from 'express'

export function logMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()
  res.on('finish', () => {
    const ms = Date.now() - start
    console.log(`  ${req.method} ${req.path} ${res.statusCode} — ${ms}ms`)
  })
  next()
}
