import { Schema, model, type Types } from 'mongoose'

/** Simulated money a user added to their wallet to reach a fund minimum. */
export interface ITopUp {
  user: Types.ObjectId
  amountPaise: number
  createdAt: Date
  updatedAt: Date
}

const topUpSchema = new Schema<ITopUp>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amountPaise: { type: Number, required: true },
  },
  { timestamps: true },
)

export const TopUp = model<ITopUp>('TopUp', topUpSchema)
