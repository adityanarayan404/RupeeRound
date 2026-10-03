import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from '../config.ts'
import type { UserDocument } from '../models/User.ts'
import { HttpError } from '../utils/http.ts'

const MAX_PIN_ATTEMPTS = 5
const LOCK_MINUTES = 15

export function hashSecret(secret: string): Promise<string> {
  return bcrypt.hash(secret, 10)
}

export function compareSecret(secret: string, hash: string): Promise<boolean> {
  return bcrypt.compare(secret, hash)
}

export function signSessionToken(userId: string): string {
  return jwt.sign({ purpose: 'session' }, config.jwtSecret, { subject: userId, expiresIn: '7d' })
}

export function signSignupToken(phone: string): string {
  return jwt.sign({ purpose: 'signup', phone }, config.jwtSecret, { expiresIn: '15m' })
}

/** Returns the user id from a session token, or null if invalid/expired. */
export function verifySessionToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret)
    if (typeof payload === 'string' || payload.purpose !== 'session' || !payload.sub) return null
    return payload.sub
  } catch {
    return null
  }
}

/** Returns the verified phone number from a signup token. */
export function verifySignupToken(token: string): string {
  try {
    const payload = jwt.verify(token, config.jwtSecret)
    if (typeof payload !== 'string' && payload.purpose === 'signup' && typeof payload.phone === 'string') {
      return payload.phone
    }
  } catch {
    // fall through
  }
  throw new HttpError(401, 'signup_expired', 'Your verification expired. Please verify your number again.')
}

/**
 * Checks a 4-digit PIN. Five wrong tries lock the account for 15 minutes,
 * because a 4-digit PIN is otherwise easy to guess.
 */
export async function verifyUserPin(user: UserDocument, pin: string): Promise<void> {
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000)
    throw new HttpError(423, 'pin_locked', `Too many wrong PINs. Try again in ${minutes} min.`, {
      lockedUntil: user.lockedUntil.toISOString(),
    })
  }

  if (await compareSecret(pin, user.pinHash)) {
    if (user.failedPinAttempts > 0 || user.lockedUntil) {
      user.failedPinAttempts = 0
      user.lockedUntil = null
      await user.save()
    }
    return
  }

  user.failedPinAttempts += 1
  if (user.failedPinAttempts >= MAX_PIN_ATTEMPTS) {
    user.failedPinAttempts = 0
    user.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60_000)
    await user.save()
    throw new HttpError(423, 'pin_locked', `Too many wrong PINs. Try again in ${LOCK_MINUTES} min.`, {
      lockedUntil: user.lockedUntil.toISOString(),
    })
  }
  await user.save()
  const attemptsLeft = MAX_PIN_ATTEMPTS - user.failedPinAttempts
  throw new HttpError(401, 'wrong_pin', `Wrong PIN. ${attemptsLeft} ${attemptsLeft === 1 ? 'try' : 'tries'} left.`, {
    attemptsLeft,
  })
}
