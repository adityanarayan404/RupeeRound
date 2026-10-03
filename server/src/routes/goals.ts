import type { GoalDTO, GoalsResponse } from '@rupeeround/shared'
import { Router } from 'express'
import { z } from 'zod'
import { Goal } from '../models/Goal.ts'
import { getOrCreateWallet } from '../services/wallet.ts'
import { HttpError, parse } from '../utils/http.ts'
import { toGoalDTO } from '../utils/serialize.ts'
import { isoDateField, objectIdField } from './schemas.ts'

export const goalsRouter = Router()

const MAX_GOALS = 10
const MAX_TARGET_PAISE = 1_00_00_000_00 // ₹1 crore

const goalFields = {
  title: z.string().trim().min(1, 'Give your goal a name').max(40),
  emoji: z.string().trim().min(1).max(8),
  targetPaise: z.number().int().positive('Set a target amount').max(MAX_TARGET_PAISE),
  deadline: isoDateField.nullable(),
}

/** Goals track everything the user has put aside: wallet balance + amount invested. */
async function savedPaiseFor(userId: string): Promise<number> {
  const wallet = await getOrCreateWallet(userId)
  return wallet.balancePaise + wallet.totalInvestedPaise
}

function deadlineDate(deadline: string | null | undefined): Date | null | undefined {
  if (deadline === undefined) return undefined
  return deadline ? new Date(`${deadline}T00:00:00Z`) : null
}

goalsRouter.get('/', async (_req, res) => {
  const userId = res.locals.userId
  const [savedPaise, goals] = await Promise.all([
    savedPaiseFor(userId),
    Goal.find({ user: userId }).sort({ createdAt: 1 }),
  ])
  const body: GoalsResponse = { savedPaise, goals: goals.map((goal) => toGoalDTO(goal, savedPaise)) }
  res.json(body)
})

goalsRouter.post('/', async (req, res) => {
  const input = parse(
    z.object({ ...goalFields, emoji: goalFields.emoji.default('🎯'), deadline: goalFields.deadline.default(null) }),
    req.body,
  )
  const userId = res.locals.userId
  if ((await Goal.countDocuments({ user: userId })) >= MAX_GOALS) {
    throw new HttpError(400, 'too_many_goals', `You can have up to ${MAX_GOALS} goals.`)
  }

  const goal = await Goal.create({ ...input, user: userId, deadline: deadlineDate(input.deadline) })
  const body: GoalDTO = toGoalDTO(goal, await savedPaiseFor(userId))
  res.status(201).json(body)
})

goalsRouter.patch('/:id', async (req, res) => {
  const { id } = parse(z.object({ id: objectIdField }), req.params)
  const input = parse(z.object(goalFields).partial(), req.body)
  const userId = res.locals.userId

  const goal = await Goal.findOne({ _id: id, user: userId })
  if (!goal) throw new HttpError(404, 'goal_not_found', 'That goal does not exist.')
  if (input.title !== undefined) goal.title = input.title
  if (input.emoji !== undefined) goal.emoji = input.emoji
  if (input.targetPaise !== undefined) goal.targetPaise = input.targetPaise
  const deadline = deadlineDate(input.deadline)
  if (deadline !== undefined) goal.deadline = deadline
  await goal.save()

  const body: GoalDTO = toGoalDTO(goal, await savedPaiseFor(userId))
  res.json(body)
})

goalsRouter.delete('/:id', async (req, res) => {
  const { id } = parse(z.object({ id: objectIdField }), req.params)
  const result = await Goal.deleteOne({ _id: id, user: res.locals.userId })
  if (result.deletedCount === 0) throw new HttpError(404, 'goal_not_found', 'That goal does not exist.')
  res.status(204).end()
})
