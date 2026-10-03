import { Schema, model } from 'mongoose'

export interface IOtp {
  phone: string
  codeHash: string
  attempts: number
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

const otpSchema = new Schema<IOtp>(
  {
    phone: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
)

// MongoDB deletes each OTP automatically once it expires.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const Otp = model<IOtp>('Otp', otpSchema)
