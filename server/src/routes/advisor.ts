import type { AdvisorResponse } from '@rupeeround/shared'
import { Router } from 'express'
import { getFundSuggestion } from '../services/advisor.ts'

export const advisorRouter = Router()

/** Rule-based fund suggestion with a plain-English explanation (AI when available). */
advisorRouter.get('/', async (_req, res) => {
  const body: AdvisorResponse = await getFundSuggestion(res.locals.userId)
  res.json(body)
})
