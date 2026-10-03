import type { AssistantResponse } from '@rupeeround/shared'
import { Router } from 'express'
import { z } from 'zod'
import { askAssistant } from '../services/assistant.ts'
import { parse } from '../utils/http.ts'

export const assistantRouter = Router()

/** "Ask RupeeRound AI": mutual-fund questions only. The client sends the conversation so far. */
assistantRouter.post('/chat', async (req, res) => {
  const { messages } = parse(
    z.object({
      messages: z
        .array(
          z.object({
            role: z.enum(['user', 'assistant']),
            content: z.string().trim().min(1).max(500, 'Keep each message under 500 characters'),
          }),
        )
        .min(1)
        .max(20)
        .refine((list) => list[list.length - 1]?.role === 'user', 'The last message must be from the user'),
    }),
    req.body,
  )
  // Groq problems come back as source 'unavailable' with HTTP 200, so the app never breaks.
  const body: AssistantResponse = await askAssistant(res.locals.userId, messages)
  res.json(body)
})
