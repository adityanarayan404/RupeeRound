import { DROP_REACTIONS, INCOME_TYPES, RISK_HORIZONS, type RiskProfile } from '@rupeeround/shared'
import { Schema, model, type HydratedDocument, type Types } from 'mongoose'

export interface IUser {
  phone: string
  name: string
  pinHash: string
  /** Round-up step in whole rupees. */
  defaultMultiple: number
  selectedFund: Types.ObjectId | null
  /** Answers to the 3 risk questions; null until answered. */
  riskProfile: RiskProfile | null
  failedPinAttempts: number
  lockedUntil: Date | null
  createdAt: Date
  updatedAt: Date
}

// Stored inside the user document (no separate _id).
const riskProfileSchema = new Schema<RiskProfile>(
  {
    horizon: { type: String, enum: RISK_HORIZONS, required: true },
    dropReaction: { type: String, enum: DROP_REACTIONS, required: true },
    income: { type: String, enum: INCOME_TYPES, required: true },
  },
  { _id: false },
)

const userSchema = new Schema<IUser>(
  {
    phone: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    pinHash: { type: String, required: true },
    defaultMultiple: { type: Number, required: true, default: 10 },
    selectedFund: { type: Schema.Types.ObjectId, ref: 'Fund', default: null },
    riskProfile: { type: riskProfileSchema, default: null },
    failedPinAttempts: { type: Number, required: true, default: 0 },
    lockedUntil: { type: Date, default: null },
  },
  { timestamps: true },
)

export type UserDocument = HydratedDocument<IUser>
export const User = model<IUser>('User', userSchema)
