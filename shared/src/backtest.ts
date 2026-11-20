// "What if?" backtest: replay a simulated spending pattern against a fund's REAL
// past NAVs. Spending is generated from a profile (no real user data); prices are
// real. It looks backwards only and never predicts returns.
import type { MerchantCategory } from './constants.ts'
import { unitsFor, valueOfUnitsPaise } from './invest.ts'
import { calculateRoundUp } from './roundup.ts'
import type { NavPoint } from './types.ts'

export const SPENDING_PROFILE_IDS = ['student', 'firstJob', 'commuter', 'household'] as const
export type SpendingProfileId = (typeof SPENDING_PROFILE_IDS)[number]

export interface ProfileMerchant {
  name: string
  category: MerchantCategory
  minRupees: number
  maxRupees: number
  /** Relative chance of this merchant for each payment. */
  weight: number
}

export interface SpendingProfile {
  id: SpendingProfileId
  label: string
  description: string
  /** Inclusive range of UPI payments on a day. */
  paymentsPerDay: readonly [number, number]
  merchants: readonly ProfileMerchant[]
}

export const SPENDING_PROFILES: Record<SpendingProfileId, SpendingProfile> = {
  student: {
    id: 'student',
    label: 'College student',
    description: 'Chai, canteen, autos and the odd recharge',
    paymentsPerDay: [2, 5],
    merchants: [
      { name: 'Chai Stall', category: 'food', minRupees: 10, maxRupees: 40, weight: 5 },
      { name: 'College Canteen', category: 'food', minRupees: 30, maxRupees: 150, weight: 5 },
      { name: 'Auto Ride', category: 'transport', minRupees: 25, maxRupees: 120, weight: 3 },
      { name: 'Stationery Shop', category: 'shopping', minRupees: 20, maxRupees: 250, weight: 2 },
      { name: 'Snacks Corner', category: 'food', minRupees: 15, maxRupees: 90, weight: 3 },
      { name: 'Mobile Recharge', category: 'other', minRupees: 199, maxRupees: 399, weight: 0.4 },
    ],
  },
  firstJob: {
    id: 'firstJob',
    label: 'First job',
    description: 'Cafés, food delivery, cabs and weekend shopping',
    paymentsPerDay: [2, 4],
    merchants: [
      { name: 'Café', category: 'food', minRupees: 120, maxRupees: 450, weight: 4 },
      { name: 'Food Delivery', category: 'food', minRupees: 180, maxRupees: 650, weight: 4 },
      { name: 'Cab Ride', category: 'transport', minRupees: 120, maxRupees: 520, weight: 3 },
      { name: 'Supermarket', category: 'grocery', minRupees: 250, maxRupees: 1800, weight: 2 },
      { name: 'Pharmacy', category: 'health', minRupees: 60, maxRupees: 600, weight: 1 },
      { name: 'Fashion Store', category: 'shopping', minRupees: 499, maxRupees: 2999, weight: 0.6 },
    ],
  },
  commuter: {
    id: 'commuter',
    label: 'Daily commuter',
    description: 'Metro, bus, autos, tea and a quick lunch',
    paymentsPerDay: [3, 6],
    merchants: [
      { name: 'Metro Ticket', category: 'transport', minRupees: 20, maxRupees: 80, weight: 5 },
      { name: 'City Bus', category: 'transport', minRupees: 10, maxRupees: 45, weight: 3 },
      { name: 'Auto Ride', category: 'transport', minRupees: 40, maxRupees: 160, weight: 3 },
      { name: 'Tea Stall', category: 'food', minRupees: 10, maxRupees: 30, weight: 4 },
      { name: 'Lunch Mess', category: 'food', minRupees: 60, maxRupees: 180, weight: 3 },
    ],
  },
  household: {
    id: 'household',
    label: 'Household',
    description: 'Groceries, vegetables, milk and medicines',
    paymentsPerDay: [1, 4],
    merchants: [
      { name: 'Kirana Store', category: 'grocery', minRupees: 80, maxRupees: 900, weight: 4 },
      { name: 'Vegetable Vendor', category: 'grocery', minRupees: 40, maxRupees: 300, weight: 4 },
      { name: 'Milk Booth', category: 'grocery', minRupees: 30, maxRupees: 90, weight: 4 },
      { name: 'Pharmacy', category: 'health', minRupees: 60, maxRupees: 800, weight: 1.5 },
      { name: 'Supermarket', category: 'grocery', minRupees: 400, maxRupees: 2600, weight: 1 },
    ],
  },
}

export const BACKTEST_PERIODS = ['6m', '1y', '3y'] as const
export type BacktestPeriod = (typeof BACKTEST_PERIODS)[number]
export const BACKTEST_PERIOD_DAYS: Record<BacktestPeriod, number> = { '6m': 182, '1y': 365, '3y': 1095 }

export interface SimulatedPayment {
  /** yyyy-mm-dd */
  date: string
  merchant: string
  category: MerchantCategory
  amountPaise: number
}

/** Small deterministic PRNG (mulberry32): the same seed always gives the same numbers. */
export function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619)
  return hash >>> 0
}

const DAY_MS = 86_400_000

function addDays(isoDate: string, days: number): string {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)
}

/**
 * A repeatable set of everyday UPI payments for a profile, one or more per day
 * from `fromIso` to `toIso` (inclusive). Same inputs → same payments every time.
 */
export function generatePayments(profileId: SpendingProfileId, fromIso: string, toIso: string): SimulatedPayment[] {
  const profile = SPENDING_PROFILES[profileId]
  const random = seededRandom(hashString(profileId))
  const totalWeight = profile.merchants.reduce((sum, merchant) => sum + merchant.weight, 0)
  const [minPerDay, maxPerDay] = profile.paymentsPerDay

  function pickMerchant(): ProfileMerchant {
    let roll = random() * totalWeight
    for (const merchant of profile.merchants) {
      roll -= merchant.weight
      if (roll < 0) return merchant
    }
    return profile.merchants[profile.merchants.length - 1]!
  }

  const payments: SimulatedPayment[] = []
  for (let date = fromIso; date <= toIso; date = addDays(date, 1)) {
    const count = minPerDay + Math.floor(random() * (maxPerDay - minPerDay + 1))
    for (let i = 0; i < count; i++) {
      const merchant = pickMerchant()
      const rupees = merchant.minRupees + Math.floor(random() * (merchant.maxRupees - merchant.minRupees + 1))
      payments.push({ date, merchant: merchant.name, category: merchant.category, amountPaise: rupees * 100 })
    }
  }
  return payments
}

/**
 * The dates a backtest covers: `days` back from the latest NAV, or from the first NAV
 * if the history is shorter. Null when there is no history.
 */
export function backtestWindow(navHistory: NavPoint[], days: number): { fromIso: string; toIso: string } | null {
  const first = navHistory[0]
  const latest = navHistory[navHistory.length - 1]
  if (!first || !latest) return null
  const wanted = addDays(latest.date, -days)
  return { fromIso: wanted > first.date ? wanted : first.date, toIso: latest.date }
}

export interface BacktestPoint {
  /** yyyy-mm-dd (a NAV date) */
  date: string
  /** Round-ups saved so far. */
  savedPaise: number
  /** Invested units valued at that day's NAV, plus whatever waited in the wallet. */
  valuePaise: number
}

export interface BacktestResult {
  fromIso: string
  toIso: string
  paymentsCount: number
  spentPaise: number
  roundUpsPaise: number
  investmentsCount: number
  firstInvestmentDate: string | null
  investedPaise: number
  units: number
  /** Units valued at the latest NAV. */
  unitsValuePaise: number
  /** Still in the wallet at the end, below the minimum (carried forward). */
  walletPaise: number
  /** unitsValuePaise + walletPaise */
  totalValuePaise: number
  /** unitsValuePaise − investedPaise */
  gainPaise: number
  /** gainPaise ÷ investedPaise, as a fraction; 0 when nothing was invested. */
  gainFraction: number
  /** About `maxPoints` evenly spaced points for a chart, always including the last day. */
  series: BacktestPoint[]
}

export interface BacktestInput {
  payments: SimulatedPayment[]
  /** Oldest first. */
  navHistory: NavPoint[]
  multipleRupees: number
  minimumPaise: number
  maxPoints?: number
}

/**
 * Replays the payments day by day with RupeeRound's own rules: each payment's round-up
 * goes to the wallet, and on each NAV day the whole wallet is invested at that day's NAV
 * once it covers the fund minimum (otherwise it carries forward).
 */
export function runBacktest({ payments, navHistory, multipleRupees, minimumPaise, maxPoints = 60 }: BacktestInput): BacktestResult {
  const sorted = [...payments].sort((a, b) => a.date.localeCompare(b.date))
  const navs = navHistory.filter((point) => Number.isFinite(point.nav) && point.nav > 0)
  const fromIso = sorted[0]?.date ?? navs[0]?.date ?? ''
  const navsInWindow = navs.filter((point) => point.date >= fromIso)

  let next = 0
  let wallet = 0
  let roundUps = 0
  let spent = 0
  let invested = 0
  let units = 0
  let investmentsCount = 0
  let firstInvestmentDate: string | null = null
  const points: BacktestPoint[] = []

  function takePaymentsUpTo(date: string | null) {
    while (next < sorted.length && (date === null || sorted[next]!.date <= date)) {
      const payment = sorted[next]!
      const { roundUpPaise } = calculateRoundUp(payment.amountPaise, multipleRupees)
      wallet += roundUpPaise
      roundUps += roundUpPaise
      spent += payment.amountPaise
      next++
    }
  }

  for (const point of navsInWindow) {
    takePaymentsUpTo(point.date)
    if (wallet > 0 && wallet >= minimumPaise) {
      units = Math.round((units + unitsFor(wallet, point.nav)) * 1000) / 1000
      invested += wallet
      investmentsCount++
      firstInvestmentDate ??= point.date
      wallet = 0
    }
    points.push({ date: point.date, savedPaise: roundUps, valuePaise: valueOfUnitsPaise(units, point.nav) + wallet })
  }
  // Payments after the latest NAV can't be invested yet; they wait in the wallet.
  takePaymentsUpTo(null)

  const latestNav = navsInWindow[navsInWindow.length - 1]?.nav ?? null
  const unitsValuePaise = latestNav === null ? 0 : valueOfUnitsPaise(units, latestNav)
  const gainPaise = unitsValuePaise - invested
  const step = Math.max(1, Math.ceil(points.length / maxPoints))
  const series = points.filter((_, index) => index % step === 0 || index === points.length - 1)

  return {
    fromIso,
    toIso: navsInWindow[navsInWindow.length - 1]?.date ?? fromIso,
    paymentsCount: sorted.length,
    spentPaise: spent,
    roundUpsPaise: roundUps,
    investmentsCount,
    firstInvestmentDate,
    investedPaise: invested,
    units,
    unitsValuePaise,
    walletPaise: wallet,
    totalValuePaise: unitsValuePaise + wallet,
    gainPaise,
    gainFraction: invested > 0 ? gainPaise / invested : 0,
    series,
  }
}
