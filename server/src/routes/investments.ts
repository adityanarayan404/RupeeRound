import {
  formatPaise,
  planInvestment,
  unitsFor,
  type InvestResponse,
  type InvestmentDTO,
  type InvestmentPlan,
} from '@rupeeround/shared'
import { Router } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import { Fund } from '../models/Fund.ts'
import { Investment, type InvestmentDocument } from '../models/Investment.ts'
import { Wallet } from '../models/Wallet.ts'
import { buildWalletDTO, getOrCreateWallet } from '../services/wallet.ts'
import { HttpError, parse } from '../utils/http.ts'
import { toInvestmentDTO } from '../utils/serialize.ts'
import { objectIdField } from './schemas.ts'

export const investmentsRouter = Router()

investmentsRouter.get('/', async (_req, res) => {
  const investments = await Investment.find({ user: res.locals.userId }).sort({ createdAt: -1 })
  const funds = new Map((await Fund.find()).map((fund) => [fund.id, fund]))
  const body: InvestmentDTO[] = investments.flatMap((investment) => {
    const fund = funds.get(investment.fund.toString())
    return fund ? [toInvestmentDTO(investment, fund)] : []
  })
  res.json(body)
})

/**
 * Simulated investment from the round-up wallet. Below the fund minimum the
 * request is refused and the balance carries forward.
 */
investmentsRouter.post('/', async (req, res) => {
  const { fundId, amountPaise } = parse(
    z.object({ fundId: objectIdField, amountPaise: z.number().int().positive().optional() }),
    req.body,
  )
  const userId = res.locals.userId

  const fund = await Fund.findById(fundId)
  if (!fund) throw new HttpError(404, 'fund_not_found', 'That fund does not exist.')
  const wallet = await getOrCreateWallet(userId)

  let plan: InvestmentPlan
  try {
    plan = planInvestment(wallet.balancePaise, fund.minInvestmentPaise, amountPaise)
  } catch (error) {
    throw new HttpError(400, 'invalid_amount', (error as Error).message)
  }
  if (plan.status === 'carry-forward') {
    throw new HttpError(
      422,
      'below_minimum',
      `You need ${formatPaise(plan.shortfallPaise)} more to invest in ${fund.shortName}. Your balance carries forward.`,
      { shortfallPaise: plan.shortfallPaise },
    )
  }

  const investPaise = plan.investPaise
  let created: InvestmentDocument | undefined
  await mongoose.connection.transaction(async (session) => {
    // Only succeeds if the balance still covers the amount (guards double taps).
    const debit = await Wallet.updateOne(
      { user: userId, balancePaise: { $gte: investPaise } },
      { $inc: { balancePaise: -investPaise, totalInvestedPaise: investPaise } },
      { session },
    )
    if (debit.modifiedCount !== 1) {
      throw new HttpError(409, 'balance_changed', 'Your wallet balance changed. Please try again.')
    }
    const [investment] = await Investment.create(
      [
        {
          user: userId,
          fund: fund._id,
          amountPaise: investPaise,
          nav: fund.latestNav,
          units: unitsFor(investPaise, fund.latestNav),
        },
      ],
      { session },
    )
    created = investment
  })
  if (!created) throw new Error('Investment transaction did not return a record')

  const body: InvestResponse = {
    investment: toInvestmentDTO(created, fund),
    wallet: await buildWalletDTO(userId),
  }
  res.status(201).json(body)
})
