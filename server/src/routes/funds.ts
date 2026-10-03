import type { FundDTO, NavHistoryResponse } from '@rupeeround/shared'
import { Router } from 'express'
import { z } from 'zod'
import { Fund } from '../models/Fund.ts'
import { listFunds, refreshStaleFunds } from '../services/funds.ts'
import { HttpError, parse, toIsoDate } from '../utils/http.ts'
import { toFundDTO } from '../utils/serialize.ts'
import { objectIdField } from './schemas.ts'

export const fundsRouter = Router()

const RANGE_DAYS = { '1m': 31, '6m': 183, '1y': 366 } as const

fundsRouter.get('/', async (_req, res) => {
  await refreshStaleFunds()
  const body: FundDTO[] = (await listFunds()).map(toFundDTO)
  res.json(body)
})

fundsRouter.get('/:id/nav-history', async (req, res) => {
  const { id } = parse(z.object({ id: objectIdField }), req.params)
  const { range } = parse(z.object({ range: z.enum(['1m', '6m', '1y']).default('6m') }), req.query)

  await refreshStaleFunds()
  const fund = await Fund.findById(id)
  if (!fund) throw new HttpError(404, 'fund_not_found', 'That fund does not exist.')

  const from = new Date(`${fund.navDate}T00:00:00Z`)
  from.setUTCDate(from.getUTCDate() - RANGE_DAYS[range])
  const fromIso = toIsoDate(from)

  const body: NavHistoryResponse = {
    fundId: fund.id,
    points: fund.navHistory
      .filter((point) => point.date >= fromIso)
      .map((point) => ({ date: point.date, nav: point.nav })),
  }
  res.json(body)
})
