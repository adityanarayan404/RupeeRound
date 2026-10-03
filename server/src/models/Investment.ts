import { Schema, model, type HydratedDocument, type Types } from 'mongoose'

/** A simulated purchase of fund units from the round-up wallet. */
export interface IInvestment {
  user: Types.ObjectId
  fund: Types.ObjectId
  amountPaise: number
  nav: number
  units: number
  createdAt: Date
  updatedAt: Date
}

const investmentSchema = new Schema<IInvestment>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fund: { type: Schema.Types.ObjectId, ref: 'Fund', required: true },
    amountPaise: { type: Number, required: true },
    nav: { type: Number, required: true },
    units: { type: Number, required: true },
  },
  { timestamps: true },
)

investmentSchema.index({ user: 1, createdAt: -1 })

export type InvestmentDocument = HydratedDocument<IInvestment>
export const Investment = model<IInvestment>('Investment', investmentSchema)
