import { MAX_TOPUP_PAISE, type WalletDTO } from '@rupeeround/shared'
import { Router } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import { TopUp } from '../models/TopUp.ts'
import { Wallet } from '../models/Wallet.ts'
import { buildWalletDTO } from '../services/wallet.ts'
import { parse } from '../utils/http.ts'

export const walletRouter = Router()

walletRouter.get('/', async (_req, res) => {
  const body: WalletDTO = await buildWalletDTO(res.locals.userId)
  res.json(body)
})

/** Simulated "Add money" used to reach a fund minimum sooner. */
walletRouter.post('/topup', async (req, res) => {
  const { amountPaise } = parse(
    z.object({
      amountPaise: z.number().int().positive('Enter an amount').max(MAX_TOPUP_PAISE, 'Top-ups are capped at ₹50,000'),
    }),
    req.body,
  )
  const userId = res.locals.userId

  await mongoose.connection.transaction(async (session) => {
    await TopUp.create([{ user: userId, amountPaise }], { session })
    await Wallet.updateOne(
      { user: userId },
      { $inc: { balancePaise: amountPaise, totalTopUpsPaise: amountPaise } },
      { upsert: true, session },
    )
  })

  const body: WalletDTO = await buildWalletDTO(userId)
  res.status(201).json(body)
})
