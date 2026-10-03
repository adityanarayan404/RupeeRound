// Converts Mongoose documents into the DTOs defined in @rupeeround/shared.
import type { FundDTO, GoalDTO, InvestmentDTO, NavSource, TransactionDTO, UserDTO } from '@rupeeround/shared'
import { config } from '../config.ts'
import type { IFund } from '../models/Fund.ts'
import type { IGoal } from '../models/Goal.ts'
import type { IInvestment } from '../models/Investment.ts'
import type { ITransaction } from '../models/Transaction.ts'
import type { IUser } from '../models/User.ts'
import { toIsoDate } from './http.ts'

type WithId<T> = T & { _id: { toString(): string } }

export function toUserDTO(user: WithId<IUser>): UserDTO {
  return {
    id: user._id.toString(),
    name: user.name,
    phone: user.phone,
    defaultMultiple: user.defaultMultiple,
    selectedFundId: user.selectedFund ? user.selectedFund.toString() : null,
    createdAt: user.createdAt.toISOString(),
  }
}

function navSource(fund: IFund): NavSource {
  if (!fund.navFetchedAt) return 'demo'
  return Date.now() - fund.navFetchedAt.getTime() <= config.navCacheMs ? 'live' : 'cached'
}

/** NAV change over the last year, using the closest point on or before that date. */
function oneYearReturn(fund: IFund): number | null {
  const history = fund.navHistory
  if (history.length < 2) return null
  const latest = history[history.length - 1]!
  const target = new Date(`${latest.date}T00:00:00Z`)
  target.setUTCFullYear(target.getUTCFullYear() - 1)
  const targetIso = toIsoDate(target)
  let base: (typeof history)[number] | undefined
  for (const point of history) {
    if (point.date > targetIso) break
    base = point
  }
  if (!base) return null
  return latest.nav / base.nav - 1
}

export function toFundDTO(fund: WithId<IFund>): FundDTO {
  return {
    id: fund._id.toString(),
    schemeCode: fund.schemeCode,
    name: fund.name,
    shortName: fund.shortName,
    fundHouse: fund.fundHouse,
    category: fund.category,
    minInvestmentPaise: fund.minInvestmentPaise,
    nav: fund.latestNav,
    navDate: fund.navDate,
    navSource: navSource(fund),
    return1y: oneYearReturn(fund),
  }
}

export function toTransactionDTO(tx: WithId<ITransaction>): TransactionDTO {
  return {
    id: tx._id.toString(),
    merchant: tx.merchant,
    category: tx.category,
    amountPaise: tx.amountPaise,
    roundedPaise: tx.roundedPaise,
    roundUpPaise: tx.roundUpPaise,
    multiple: tx.multiple,
    createdAt: tx.createdAt.toISOString(),
  }
}

export function toInvestmentDTO(investment: WithId<IInvestment>, fund: WithId<IFund>): InvestmentDTO {
  return {
    id: investment._id.toString(),
    fundId: fund._id.toString(),
    fundName: fund.shortName,
    category: fund.category,
    amountPaise: investment.amountPaise,
    nav: investment.nav,
    units: investment.units,
    createdAt: investment.createdAt.toISOString(),
  }
}

export function toGoalDTO(goal: WithId<IGoal>, savedPaise: number): GoalDTO {
  return {
    id: goal._id.toString(),
    title: goal.title,
    emoji: goal.emoji,
    targetPaise: goal.targetPaise,
    savedPaise,
    deadline: goal.deadline ? toIsoDate(goal.deadline) : null,
    createdAt: goal.createdAt.toISOString(),
  }
}
