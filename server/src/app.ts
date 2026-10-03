import cors from 'cors'
import express from 'express'
import { rateLimit } from 'express-rate-limit'
import helmet from 'helmet'
import { config } from './config.ts'
import { requireAuth } from './middleware/auth.ts'
import { errorHandler, notFound } from './middleware/errors.ts'
import { advisorRouter } from './routes/advisor.ts'
import { authRouter } from './routes/auth.ts'
import { fundsRouter } from './routes/funds.ts'
import { goalsRouter } from './routes/goals.ts'
import { investmentsRouter } from './routes/investments.ts'
import { meRouter } from './routes/me.ts'
import { portfolioRouter } from './routes/portfolio.ts'
import { transactionsRouter } from './routes/transactions.ts'
import { walletRouter } from './routes/wallet.ts'

export function createApp(): express.Express {
  const app = express()

  // Render/Railway sit behind one proxy; needed for correct client IPs in rate limiting.
  app.set('trust proxy', 1)
  app.use(helmet())
  app.use(cors({ origin: config.clientOrigins }))
  app.use(express.json({ limit: '20kb' }))

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true })
  })

  app.use(
    '/api/auth',
    rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false }),
    authRouter,
  )

  app.use('/api/me', requireAuth, meRouter)
  app.use('/api/transactions', requireAuth, transactionsRouter)
  app.use('/api/wallet', requireAuth, walletRouter)
  app.use('/api/funds', requireAuth, fundsRouter)
  app.use('/api/investments', requireAuth, investmentsRouter)
  app.use('/api/portfolio', requireAuth, portfolioRouter)
  app.use('/api/goals', requireAuth, goalsRouter)
  // Limited because each suggestion may call the Groq API.
  app.use(
    '/api/advisor',
    requireAuth,
    rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false }),
    advisorRouter,
  )

  app.use('/api', notFound)
  app.use(errorHandler)
  return app
}
