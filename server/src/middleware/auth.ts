import type { NextFunction, Request, Response } from 'express'
import { verifySessionToken } from '../services/auth.ts'
import { HttpError } from '../utils/http.ts'

declare global {
  namespace Express {
    interface Locals {
      userId: string
    }
  }
}

/** Requires `Authorization: Bearer <token>` and sets res.locals.userId. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  const userId = token ? verifySessionToken(token) : null
  if (!userId) throw new HttpError(401, 'unauthorized', 'Please log in again.')
  res.locals.userId = userId
  next()
}
