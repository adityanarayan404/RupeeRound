import { Schema, model, type HydratedDocument, type Types } from 'mongoose'

export interface IWallet {
  user: Types.ObjectId
  /** Money waiting to be invested. */
  balancePaise: number
  totalRoundUpsPaise: number
  totalInvestedPaise: number
  totalTopUpsPaise: number
  createdAt: Date
  updatedAt: Date
}

const walletSchema = new Schema<IWallet>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    balancePaise: { type: Number, required: true, default: 0, min: 0 },
    totalRoundUpsPaise: { type: Number, required: true, default: 0 },
    totalInvestedPaise: { type: Number, required: true, default: 0 },
    totalTopUpsPaise: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
)

export type WalletDocument = HydratedDocument<IWallet>
export const Wallet = model<IWallet>('Wallet', walletSchema)
