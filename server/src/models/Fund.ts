import { Schema, model, type HydratedDocument } from 'mongoose'
import { FUND_CATEGORIES, type FundCategory, type NavPoint } from '@rupeeround/shared'

export interface IFund {
  /** AMFI scheme code, used to fetch NAVs from mfapi.in. */
  schemeCode: number
  name: string
  shortName: string
  fundHouse: string
  category: FundCategory
  /** Demo minimum chosen by RupeeRound, not the scheme's real minimum. */
  minInvestmentPaise: number
  sortOrder: number
  latestNav: number
  /** yyyy-mm-dd of latestNav */
  navDate: string
  /** null until a live fetch succeeds; latestNav is then a demo value. */
  navFetchedAt: Date | null
  /** About 3 years of daily NAVs, oldest first. */
  navHistory: NavPoint[]
  /** How many days of history navHistory was fetched with; a change forces a re-fetch. */
  historyDays: number
}

const fundSchema = new Schema<IFund>({
  schemeCode: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  shortName: { type: String, required: true },
  fundHouse: { type: String, required: true },
  category: { type: String, enum: FUND_CATEGORIES, required: true },
  minInvestmentPaise: { type: Number, required: true },
  sortOrder: { type: Number, required: true, default: 0 },
  latestNav: { type: Number, required: true },
  navDate: { type: String, required: true },
  navFetchedAt: { type: Date, default: null },
  navHistory: { type: [{ _id: false, date: String, nav: Number }], default: [] },
  historyDays: { type: Number, default: 0 },
})

export type FundDocument = HydratedDocument<IFund>
export const Fund = model<IFund>('Fund', fundSchema)
