import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Zod validation error
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'validation_error',
      details: err.errors,
    })
  }

  // Generic error
  const message = err instanceof Error ? err.message : 'internal_error'
  console.error(`[error] ${req.method} ${req.path} —`, message)

  res.status(500).json({ error: message })
}
