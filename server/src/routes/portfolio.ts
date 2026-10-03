import { valueOfUnitsPaise, type HoldingDTO, type PortfolioDTO, type SavingsPoint } from '@rupeeround/shared'
import { Router } from 'express'
import { Fund } from '../models/Fund.ts'
import { Investment } from '../models/Investment.ts'
import { TopUp } from '../models/TopUp.ts'
import { Transaction } from '../models/Transaction.ts'
import { toIndiaDate } from '../utils/http.ts'
import { toFundDTO, toInvestmentDTO } from '../utils/serialize.ts'

export const portfolioRouter = Router()

const HISTORY_DAYS = 30

interface DatedAmount {
  createdAt: Date
  amountPaise: number
}

/** Daily cumulative saved/invested totals for the last 30 days. */
function buildSavingsHistory(saved: DatedAmount[], invested: DatedAmount[]): SavingsPoint[] {
  const days: string[] = []
  const today = new Date()
  for (let offset = HISTORY_DAYS - 1; offset >= 0; offset--) {
    days.push(toIndiaDate(new Date(today.getTime() - offset * 86_400_000)))
  }
  const firstDay = days[0]!

  function cumulative(events: DatedAmount[]): number[] {
    const perDay = new Map<string, number>()
    let running = 0
    for (const event of events) {
      const day = toIndiaDate(event.createdAt)
      if (day < firstDay) running += event.amountPaise
      else perDay.set(day, (perDay.get(day) ?? 0) + event.amountPaise)
    }
    return days.map((day) => (running += perDay.get(day) ?? 0))
  }

  const savedTotals = cumulative(saved)
  const investedTotals = cumulative(invested)
  return days.map((date, index) => ({
    date,
    savedPaise: savedTotals[index]!,
    investedPaise: investedTotals[index]!,
  }))
}

portfolioRouter.get('/', async (_req, res) => {
  const userId = res.locals.userId
  const [investments, funds, roundUps, topUps] = await Promise.all([
    Investment.find({ user: userId }).sort({ createdAt: -1 }),
    Fund.find().sort({ sortOrder: 1 }),
    Transaction.find({ user: userId, roundUpPaise: { $gt: 0 } }, { roundUpPaise: 1, createdAt: 1 }),
    TopUp.find({ user: userId }, { amountPaise: 1, createdAt: 1 }),
  ])

  const fundsById = new Map(funds.map((fund) => [fund.id, fund]))
  const totalsByFund = new Map<string, { units: number; investedPaise: number }>()
  for (const investment of investments) {
    const key = investment.fund.toString()
    const totals = totalsByFund.get(key) ?? { units: 0, investedPaise: 0 }
    totals.units += investment.units
    totals.investedPaise += investment.amountPaise
    totalsByFund.set(key, totals)
  }

  const holdings: HoldingDTO[] = []
  for (const [fundId, totals] of totalsByFund) {
    const fund = fundsById.get(fundId)
    if (!fund) continue
    const units = Math.round(totals.units * 1000) / 1000
    const currentValuePaise = valueOfUnitsPaise(units, fund.latestNav)
    const gainPaise = currentValuePaise - totals.investedPaise
    holdings.push({
      fund: toFundDTO(fund),
      units,
      investedPaise: totals.investedPaise,
      currentValuePaise,
      gainPaise,
      gainPct: totals.investedPaise ? gainPaise / totals.investedPaise : 0,
    })
  }
  holdings.sort((a, b) => b.currentValuePaise - a.currentValuePaise)

  const investedPaise = holdings.reduce((sum, holding) => sum + holding.investedPaise, 0)
  const currentValuePaise = holdings.reduce((sum, holding) => sum + holding.currentValuePaise, 0)
  const gainPaise = currentValuePaise - investedPaise

  const body: PortfolioDTO = {
    investedPaise,
    currentValuePaise,
    gainPaise,
    gainPct: investedPaise ? gainPaise / investedPaise : 0,
    holdings,
    investments: investments.flatMap((investment) => {
      const fund = fundsById.get(investment.fund.toString())
      return fund ? [toInvestmentDTO(investment, fund)] : []
    }),
    savingsHistory: buildSavingsHistory(
      [
        ...roundUps.map((tx) => ({ createdAt: tx.createdAt, amountPaise: tx.roundUpPaise })),
        ...topUps.map((topUp) => ({ createdAt: topUp.createdAt, amountPaise: topUp.amountPaise })),
      ],
      investments.map((investment) => ({ createdAt: investment.createdAt, amountPaise: investment.amountPaise })),
    ),
  }
  res.json(body)
})
