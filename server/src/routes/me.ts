import {
  DROP_REACTIONS,
  INCOME_TYPES,
  RISK_HORIZONS,
  isRoundUpMultiple,
  type UserDTO,
} from '@rupeeround/shared'
import { Router } from 'express'
import { Types } from 'mongoose'
import { z } from 'zod'
import { Fund } from '../models/Fund.ts'
import { User, type UserDocument } from '../models/User.ts'
import { hashSecret, verifyUserPin } from '../services/auth.ts'
import { HttpError, parse } from '../utils/http.ts'
import { toUserDTO } from '../utils/serialize.ts'
import { objectIdField, pinField } from './schemas.ts'

export const meRouter = Router()

async function currentUser(userId: string): Promise<UserDocument> {
  const user = await User.findById(userId)
  if (!user) throw new HttpError(401, 'unauthorized', 'Account not found. Please log in again.')
  return user
}

meRouter.get('/', async (_req, res) => {
  const body: UserDTO = toUserDTO(await currentUser(res.locals.userId))
  res.json(body)
})

meRouter.patch('/', async (req, res) => {
  const updates = parse(
    z.object({
      name: z.string().trim().min(1).max(40).optional(),
      defaultMultiple: z
        .number()
        .int()
        .refine(isRoundUpMultiple, 'Choose ₹5, ₹10, ₹20, ₹50 or ₹100')
        .optional(),
      selectedFundId: objectIdField.nullable().optional(),
    }),
    req.body,
  )

  const user = await currentUser(res.locals.userId)
  if (updates.name !== undefined) user.name = updates.name
  if (updates.defaultMultiple !== undefined) user.defaultMultiple = updates.defaultMultiple
  if (updates.selectedFundId !== undefined) {
    if (updates.selectedFundId && !(await Fund.exists({ _id: updates.selectedFundId }))) {
      throw new HttpError(404, 'fund_not_found', 'That fund does not exist.')
    }
    user.selectedFund = updates.selectedFundId ? new Types.ObjectId(updates.selectedFundId) : null
  }
  await user.save()

  const body: UserDTO = toUserDTO(user)
  res.json(body)
})

/** Saves the answers to the 3 risk questions used by the fund suggestion. */
meRouter.patch('/risk-profile', async (req, res) => {
  const riskProfile = parse(
    z.object({
      horizon: z.enum(RISK_HORIZONS),
      dropReaction: z.enum(DROP_REACTIONS),
      income: z.enum(INCOME_TYPES),
    }),
    req.body,
  )

  const user = await currentUser(res.locals.userId)
  user.riskProfile = riskProfile
  await user.save()

  const body: UserDTO = toUserDTO(user)
  res.json(body)
})

meRouter.post('/pin', async (req, res) => {
  const { currentPin, newPin } = parse(z.object({ currentPin: pinField, newPin: pinField }), req.body)
  const user = await currentUser(res.locals.userId)
  await verifyUserPin(user, currentPin)
  user.pinHash = await hashSecret(newPin)
  await user.save()
  res.json({ ok: true })
})
