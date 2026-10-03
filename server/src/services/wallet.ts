import { planInvestment, type WalletDTO } from '@rupeeround/shared'
import type { ClientSession, Types } from 'mongoose'
import { Fund } from '../models/Fund.ts'
import { User } from '../models/User.ts'
import { Wallet, type WalletDocument } from '../models/Wallet.ts'
import { HttpError } from '../utils/http.ts'
import { toFundDTO } from '../utils/serialize.ts'

export async function getOrCreateWallet(
  userId: string | Types.ObjectId,
  session?: ClientSession,
): Promise<WalletDocument> {
  const wallet = await Wallet.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId } },
    { upsert: true, returnDocument: 'after', session },
  )
  if (!wallet) throw new Error('Wallet upsert returned nothing')
  return wallet
}

/** Wallet totals plus progress towards the user's chosen fund minimum. */
export async function buildWalletDTO(userId: string): Promise<WalletDTO> {
  const [wallet, user] = await Promise.all([getOrCreateWallet(userId), User.findById(userId)])
  if (!user) throw new HttpError(401, 'unauthorized', 'Account not found. Please log in again.')

  const fund = user.selectedFund ? await Fund.findById(user.selectedFund) : null
  return {
    balancePaise: wallet.balancePaise,
    totalRoundUpsPaise: wallet.totalRoundUpsPaise,
    totalInvestedPaise: wallet.totalInvestedPaise,
    totalTopUpsPaise: wallet.totalTopUpsPaise,
    selectedFund: fund ? toFundDTO(fund) : null,
    plan: fund ? planInvestment(wallet.balancePaise, fund.minInvestmentPaise) : null,
  }
}
