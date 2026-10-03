import { Schema, model, type HydratedDocument, type Types } from 'mongoose'
import { MERCHANT_CATEGORIES, type MerchantCategory } from '@rupeeround/shared'

/** A simulated merchant payment and the round-up it produced. */
export interface ITransaction {
  user: Types.ObjectId
  merchant: string
  category: MerchantCategory
  amountPaise: number
  roundedPaise: number
  roundUpPaise: number
  multiple: number
  createdAt: Date
  updatedAt: Date
}

const transactionSchema = new Schema<ITransaction>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    merchant: { type: String, required: true, trim: true, maxlength: 40 },
    category: { type: String, enum: MERCHANT_CATEGORIES, required: true, default: 'other' },
    amountPaise: { type: Number, required: true },
    roundedPaise: { type: Number, required: true },
    roundUpPaise: { type: Number, required: true },
    multiple: { type: Number, required: true },
  },
  { timestamps: true },
)

transactionSchema.index({ user: 1, createdAt: -1 })

export type TransactionDocument = HydratedDocument<ITransaction>
export const Transaction = model<ITransaction>('Transaction', transactionSchema)
