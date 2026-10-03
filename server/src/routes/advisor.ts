import type { AdvisorResponse } from '@rupeeround/shared'
import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { getFundSuggestion } from '../services/advisor.ts'

export const advisorRouter = Router()

/** Rule-based fund suggestion with a plain-English explanation (AI when available). */
advisorRouter.get(
  '/',
  // May call the Groq API, so it is rate limited per client IP.
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { code: 'rate_limited', message: 'Too many requests. Please wait a few minutes.' } },
  }),
  async (_req, res) => {
    const body: AdvisorResponse = await getFundSuggestion(res.locals.userId)
    res.json(body)
  },
)
