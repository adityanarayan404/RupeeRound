// Creates (or resets) a demo account with a month of realistic activity.
//   pnpm seed   →   log in with 98765 43210 and PIN 1234
import { calculateRoundUp, unitsFor, type MerchantCategory } from '@rupeeround/shared'
import { Types } from 'mongoose'
import { connectDb, disconnectDb } from '../db.ts'
import { Fund, type FundDocument } from '../models/Fund.ts'
import { Goal } from '../models/Goal.ts'
import { Investment } from '../models/Investment.ts'
import { Otp } from '../models/Otp.ts'
import { TopUp } from '../models/TopUp.ts'
import { Transaction } from '../models/Transaction.ts'
import { User } from '../models/User.ts'
import { Wallet } from '../models/Wallet.ts'
import { hashSecret } from '../services/auth.ts'
import { ensureFunds, refreshStaleFunds } from '../services/funds.ts'
import { toIsoDate } from '../utils/http.ts'

const DEMO_PHONE = '9876543210'
const DEMO_PIN = '1234'
const DEMO_NAME = 'Aarav Sharma'
const DEMO_MULTIPLE = 10
/** Wallet balance to end on: below the Small Cap minimum so carry-forward shows. */
const TARGET_BALANCE_PAISE = 620_00

const MERCHANTS: { name: string; category: MerchantCategory; min: number; max: number }[] = [
  { name: 'College Canteen', category: 'food', min: 25, max: 120 },
  { name: 'Chai Stall', category: 'food', min: 12, max: 45 },
  { name: 'Campus Café', category: 'food', min: 80, max: 260 },
  { name: 'Corner Grocery', category: 'grocery', min: 60, max: 540 },
  { name: 'Supermarket', category: 'grocery', min: 180, max: 1100 },
  { name: 'Metro Recharge', category: 'transport', min: 100, max: 300 },
  { name: 'Auto Ride', category: 'transport', min: 30, max: 140 },
  { name: 'City Pharmacy', category: 'health', min: 40, max: 380 },
  { name: 'Fashion Store', category: 'shopping', min: 299, max: 1499 },
  { name: 'Bookstore', category: 'shopping', min: 90, max: 650 },
]

/** Small deterministic PRNG so every seed run produces the same data. */
function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function daysAgo(days: number, hour: number, minute = 0): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(hour, minute, 0, 0)
  return date
}

function navOn(fund: FundDocument, date: Date): number {
  const iso = toIsoDate(date)
  let nav = fund.latestNav
  for (const point of fund.navHistory) {
    if (point.date > iso) break
    nav = point.nav
  }
  return nav
}

async function main(): Promise<void> {
  await connectDb()
  await ensureFunds()
  await refreshStaleFunds()

  const funds = await Fund.find().sort({ sortOrder: 1 })
  const large = funds.find((fund) => fund.category === 'large')!
  const mid = funds.find((fund) => fund.category === 'mid')!
  const small = funds.find((fund) => fund.category === 'small')!

  // Reset any previous demo account.
  const existing = await User.findOne({ phone: DEMO_PHONE })
  if (existing) {
    const user = existing._id
    await Promise.all([
      Transaction.deleteMany({ user }),
      Investment.deleteMany({ user }),
      TopUp.deleteMany({ user }),
      Goal.deleteMany({ user }),
      Wallet.deleteMany({ user }),
      User.deleteOne({ _id: user }),
    ])
  }
  await Otp.deleteMany({ phone: DEMO_PHONE })

  const userId = new Types.ObjectId()
  const createdAt = daysAgo(46, 10)
  await User.collection.insertOne({
    _id: userId,
    phone: DEMO_PHONE,
    name: DEMO_NAME,
    pinHash: await hashSecret(DEMO_PIN),
    defaultMultiple: DEMO_MULTIPLE,
    selectedFund: small._id,
    failedPinAttempts: 0,
    lockedUntil: null,
    createdAt,
    updatedAt: createdAt,
  })

  // ~45 days of everyday payments.
  const random = mulberry32(42)
  const transactions = []
  let roundUpsPaise = 0
  for (let day = 45; day >= 0; day--) {
    const count = 1 + Math.floor(random() * 4)
    for (let i = 0; i < count; i++) {
      const merchant = MERCHANTS[Math.floor(random() * MERCHANTS.length)]!
      const rupees = merchant.min + Math.floor(random() * (merchant.max - merchant.min))
      const amountPaise = rupees * 100 + (random() < 0.2 ? 50 : 0)
      const roundUp = calculateRoundUp(amountPaise, DEMO_MULTIPLE)
      roundUpsPaise += roundUp.roundUpPaise
      const planned = daysAgo(day, 8 + Math.floor(random() * 13), Math.floor(random() * 60))
      // Today's payments can't be in the future: keep them a few minutes apart before now.
      const at = new Date(Math.min(planned.getTime(), Date.now() - (i + 1) * 7 * 60_000))
      transactions.push({
        _id: new Types.ObjectId(),
        user: userId,
        merchant: merchant.name,
        category: merchant.category,
        multiple: DEMO_MULTIPLE,
        ...roundUp,
        createdAt: at,
        updatedAt: at,
      })
    }
  }
  await Transaction.collection.insertMany(transactions)

  // Two past investments that cleared their minimums.
  const pastInvestments = [
    { fund: large, amountPaise: 100_00, at: daysAgo(20, 19) },
    { fund: mid, amountPaise: 500_00, at: daysAgo(9, 20) },
  ]
  const investedPaise = pastInvestments.reduce((sum, item) => sum + item.amountPaise, 0)
  await Investment.collection.insertMany(
    pastInvestments.map(({ fund, amountPaise, at }) => {
      const nav = navOn(fund, at)
      return {
        _id: new Types.ObjectId(),
        user: userId,
        fund: fund._id,
        amountPaise,
        nav,
        units: unitsFor(amountPaise, nav),
        createdAt: at,
        updatedAt: at,
      }
    }),
  )

  // One top-up, sized so the wallet ends just below the Small Cap minimum.
  const topUpPaise = Math.max(0, Math.floor((TARGET_BALANCE_PAISE + investedPaise - roundUpsPaise) / 1000) * 1000)
  if (topUpPaise > 0) {
    const at = daysAgo(24, 18)
    await TopUp.collection.insertOne({ user: userId, amountPaise: topUpPaise, createdAt: at, updatedAt: at })
  }

  const balancePaise = roundUpsPaise + topUpPaise - investedPaise
  await Wallet.collection.insertOne({
    user: userId,
    balancePaise,
    totalRoundUpsPaise: roundUpsPaise,
    totalInvestedPaise: investedPaise,
    totalTopUpsPaise: topUpPaise,
    createdAt,
    updatedAt: new Date(),
  })

  const inDays = (days: number) => new Date(`${toIsoDate(new Date(Date.now() + days * 86_400_000))}T00:00:00Z`)
  await Goal.collection.insertMany([
    { user: userId, title: 'First ₹1,000 saved', emoji: '🌱', targetPaise: 1_000_00, deadline: null, createdAt, updatedAt: createdAt },
    { user: userId, title: 'New headphones', emoji: '🎧', targetPaise: 2_500_00, deadline: inDays(60), createdAt, updatedAt: createdAt },
    { user: userId, title: 'Goa trip', emoji: '🏖️', targetPaise: 10_000_00, deadline: inDays(180), createdAt, updatedAt: createdAt },
  ])

  console.log(`Seeded ${transactions.length} payments for ${DEMO_NAME}.`)
  console.log(`Wallet ₹${balancePaise / 100} · invested ₹${investedPaise / 100} · round-ups ₹${roundUpsPaise / 100}`)
  console.log(`Log in with phone ${DEMO_PHONE} and PIN ${DEMO_PIN}.`)
  await disconnectDb()
}

main().catch(async (error: unknown) => {
  console.error(error)
  await disconnectDb()
  process.exit(1)
})
