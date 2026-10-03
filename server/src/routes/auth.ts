import type {
  AuthResponse,
  CheckPhoneResponse,
  OtpRequestResponse,
  OtpVerifyResponse,
} from '@rupeeround/shared'
import { Router } from 'express'
import { z } from 'zod'
import { config } from '../config.ts'
import { Otp } from '../models/Otp.ts'
import { User } from '../models/User.ts'
import {
  compareSecret,
  hashSecret,
  signSessionToken,
  signSignupToken,
  verifySignupToken,
  verifyUserPin,
} from '../services/auth.ts'
import { getOrCreateWallet } from '../services/wallet.ts'
import { HttpError, parse } from '../utils/http.ts'
import { toUserDTO } from '../utils/serialize.ts'
import { phoneField, pinField } from './schemas.ts'

const OTP_TTL_MS = 5 * 60 * 1000
const MAX_OTP_ATTEMPTS = 5

export const authRouter = Router()

authRouter.post('/check-phone', async (req, res) => {
  const { phone } = parse(z.object({ phone: phoneField }), req.body)
  const body: CheckPhoneResponse = { exists: Boolean(await User.exists({ phone })) }
  res.json(body)
})

// The prototype has no SMS provider: every OTP is DEMO_OTP and is returned
// in the response so the presenter can see it.
authRouter.post('/otp/request', async (req, res) => {
  const { phone } = parse(z.object({ phone: phoneField }), req.body)
  await Otp.deleteMany({ phone })
  await Otp.create({
    phone,
    codeHash: await hashSecret(config.demoOtp),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  })
  const body: OtpRequestResponse = { sent: true, demoOtp: config.demoOtp }
  res.json(body)
})

authRouter.post('/otp/verify', async (req, res) => {
  const { phone, otp } = parse(
    z.object({ phone: phoneField, otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits') }),
    req.body,
  )

  const record = await Otp.findOne({ phone }).sort({ createdAt: -1 })
  if (!record || record.expiresAt.getTime() < Date.now()) {
    throw new HttpError(400, 'otp_expired', 'This OTP has expired. Tap resend to get a new one.')
  }
  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    throw new HttpError(429, 'otp_attempts', 'Too many wrong attempts. Tap resend to get a new OTP.')
  }
  if (!(await compareSecret(otp, record.codeHash))) {
    record.attempts += 1
    await record.save()
    throw new HttpError(400, 'wrong_otp', 'That OTP is not right. Check it and try again.')
  }

  await Otp.deleteMany({ phone })
  const body: OtpVerifyResponse = { signupToken: signSignupToken(phone) }
  res.json(body)
})

authRouter.post('/register', async (req, res) => {
  const { signupToken, name, pin } = parse(
    z.object({
      signupToken: z.string().min(1),
      name: z.string().trim().min(1, 'Enter your name').max(40),
      pin: pinField,
    }),
    req.body,
  )
  const phone = verifySignupToken(signupToken)

  if (await User.exists({ phone })) {
    throw new HttpError(409, 'phone_taken', 'This number already has an account. Log in with your PIN.')
  }

  const user = await User.create({ phone, name, pinHash: await hashSecret(pin) })
  await getOrCreateWallet(user._id)

  const body: AuthResponse = { token: signSessionToken(user.id), user: toUserDTO(user) }
  res.status(201).json(body)
})

authRouter.post('/login', async (req, res) => {
  const { phone, pin } = parse(z.object({ phone: phoneField, pin: pinField }), req.body)
  const user = await User.findOne({ phone })
  if (!user) throw new HttpError(404, 'not_registered', 'No account for this number yet. Sign up first.')

  await verifyUserPin(user, pin)
  const body: AuthResponse = { token: signSessionToken(user.id), user: toUserDTO(user) }
  res.json(body)
})
