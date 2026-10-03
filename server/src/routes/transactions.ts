import {
  MAX_PAYMENT_PAISE,
  MERCHANT_CATEGORIES,
  calculateRoundUp,
  isRoundUpMultiple,
  type PaymentResponse,
  type TransactionDTO,
} from '@rupeeround/shared'
import { Router } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import { Transaction, type TransactionDocument } from '../models/Transaction.ts'
import { User } from '../models/User.ts'
import { Wallet } from '../models/Wallet.ts'
import { verifyUserPin } from '../services/auth.ts'
import { buildWalletDTO } from '../services/wallet.ts'
import { HttpError, parse } from '../utils/http.ts'
import { toTransactionDTO } from '../utils/serialize.ts'
import { pinField } from './schemas.ts'

export const transactionsRouter = Router()

transactionsRouter.get('/', async (req, res) => {
  const { limit } = parse(z.object({ limit: z.coerce.number().int().min(1).max(100).default(50) }), req.query)
  const transactions = await Transaction.find({ user: res.locals.userId }).sort({ createdAt: -1 }).limit(limit)
  const body: TransactionDTO[] = transactions.map(toTransactionDTO)
  res.json(body)
})

/** Simulated merchant payment: rounds up and moves the difference into the wallet. */
transactionsRouter.post('/', async (req, res) => {
  const payment = parse(
    z.object({
      merchant: z.string().trim().min(1, 'Enter who you are paying').max(40),
      category: z.enum(MERCHANT_CATEGORIES).default('other'),
      amountPaise: z.number().int().positive('Enter an amount').max(MAX_PAYMENT_PAISE, 'Payments are capped at ₹1,00,000'),
      multiple: z.number().int().refine(isRoundUpMultiple, 'Choose ₹5, ₹10, ₹20, ₹50 or ₹100'),
      pin: pinField,
    }),
    req.body,
  )

  const user = await User.findById(res.locals.userId)
  if (!user) throw new HttpError(401, 'unauthorized', 'Account not found. Please log in again.')
  await verifyUserPin(user, payment.pin)

  const roundUp = calculateRoundUp(payment.amountPaise, payment.multiple)

  // The payment record and the wallet credit succeed or fail together.
  let created: TransactionDocument | undefined
  await mongoose.connection.transaction(async (session) => {
    const [transaction] = await Transaction.create(
      [
        {
          user: user._id,
          merchant: payment.merchant,
          category: payment.category,
          multiple: payment.multiple,
          ...roundUp,
        },
      ],
      { session },
    )
    created = transaction
    await Wallet.updateOne(
      { user: user._id },
      { $inc: { balancePaise: roundUp.roundUpPaise, totalRoundUpsPaise: roundUp.roundUpPaise } },
      { upsert: true, session },
    )
  })
  if (!created) throw new Error('Payment transaction did not return a record')

  const body: PaymentResponse = {
    transaction: toTransactionDTO(created),
    wallet: await buildWalletDTO(res.locals.userId),
  }
  res.status(201).json(body)
})
