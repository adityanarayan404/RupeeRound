import type { NavPoint } from './types.ts'

export interface FundMetrics {
  latestNav: number | null
  /** yyyy-mm-dd of latestNav */
  navDate: string | null
  /** NAV change over about one year, in percent (12.5 = +12.5%). */
  return1yPct: number | null
  /** Standard deviation of daily NAV changes, in percent. Higher = bumpier ride. */
  volatilityPct: number | null
  /** Largest fall from a high point to a later low, in percent (25 = fell 25%). */
  maxDrawdownPct: number | null
}

const DAY_MS = 86_400_000
/** Only report a 1-year return if we have a NAV within this many days of the 1-year mark. */
const ONE_YEAR_TOLERANCE_DAYS = 15

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function dayNumber(isoDate: string): number {
  return Date.parse(`${isoDate}T00:00:00Z`) / DAY_MS
}

/**
 * Turns a fund's NAV history (oldest → newest) into a few plain numbers.
 * Never throws: anything that can't be computed from the data comes back as null.
 */
export function fundMetrics(history: NavPoint[]): FundMetrics {
  const points = history.filter((point) => Number.isFinite(point.nav) && point.nav > 0)
  const latest = points[points.length - 1]
  if (!latest) {
    return { latestNav: null, navDate: null, return1yPct: null, volatilityPct: null, maxDrawdownPct: null }
  }

  return {
    latestNav: latest.nav,
    navDate: latest.date,
    return1yPct: oneYearReturnPct(points),
    volatilityPct: volatilityPct(points),
    maxDrawdownPct: maxDrawdownPct(points),
  }
}

function oneYearReturnPct(points: NavPoint[]): number | null {
  const latest = points[points.length - 1]!
  const target = dayNumber(latest.date) - 365

  // The point whose date is closest to exactly one year before the latest NAV.
  let closest: NavPoint | null = null
  let closestGap = Infinity
  for (const point of points) {
    const gap = Math.abs(dayNumber(point.date) - target)
    if (gap < closestGap) {
      closest = point
      closestGap = gap
    }
  }
  if (!closest || closest === latest || closestGap > ONE_YEAR_TOLERANCE_DAYS) return null
  return round2((latest.nav / closest.nav - 1) * 100)
}

function volatilityPct(points: NavPoint[]): number | null {
  // Daily % change between each NAV and the one before it.
  const changes: number[] = []
  for (let i = 1; i < points.length; i++) {
    changes.push((points[i]!.nav / points[i - 1]!.nav - 1) * 100)
  }
  if (changes.length < 2) return null

  const mean = changes.reduce((sum, change) => sum + change, 0) / changes.length
  // Sample standard deviation (divide by n − 1).
  const variance = changes.reduce((sum, change) => sum + (change - mean) ** 2, 0) / (changes.length - 1)
  return round2(Math.sqrt(variance))
}

/**
 * NAV points from roughly the last year (oldest first). Keeps a little slack past
 * 365 days so the 1-year comparison point is still included.
 */
export function lastYearHistory(history: NavPoint[], windowDays = 380): NavPoint[] {
  const latest = history[history.length - 1]
  if (!latest) return []
  const cutoff = new Date(`${latest.date}T00:00:00Z`)
  cutoff.setUTCDate(cutoff.getUTCDate() - windowDays)
  const cutoffIso = cutoff.toISOString().slice(0, 10)
  return history.filter((point) => point.date >= cutoffIso)
}

export interface FundReturns {
  /** Change vs the previous NAV (the last trading day), in percent. */
  day: number | null
  month1: number | null
  month3: number | null
  year1: number | null
  year3: number | null
}

/**
 * NAV change over the last `days` calendar days, in percent. Uses the NAV
 * closest to that date; null if there isn't one reasonably close (history too short).
 */
export function periodReturnPct(history: NavPoint[], days: number): number | null {
  const points = history.filter((point) => Number.isFinite(point.nav) && point.nav > 0)
  const latest = points[points.length - 1]
  if (!latest || points.length < 2) return null
  const target = dayNumber(latest.date) - days
  const tolerance = Math.max(5, days * 0.04) // weekends/holidays have no NAV

  let closest: NavPoint | null = null
  let closestGap = Infinity
  for (const point of points) {
    const gap = Math.abs(dayNumber(point.date) - target)
    if (gap < closestGap) {
      closest = point
      closestGap = gap
    }
  }
  if (!closest || closest === latest || closestGap > tolerance) return null
  return round2((latest.nav / closest.nav - 1) * 100)
}

/** Day, 1M, 3M, 1Y and 3Y NAV changes from a fund's history (oldest → newest). */
export function fundReturns(history: NavPoint[]): FundReturns {
  const points = history.filter((point) => Number.isFinite(point.nav) && point.nav > 0)
  const latest = points[points.length - 1]
  const previous = points[points.length - 2]
  return {
    day: latest && previous ? round2((latest.nav / previous.nav - 1) * 100) : null,
    month1: periodReturnPct(points, 30),
    month3: periodReturnPct(points, 91),
    year1: periodReturnPct(points, 365),
    year3: periodReturnPct(points, 365 * 3),
  }
}

function maxDrawdownPct(points: NavPoint[]): number | null {
  if (points.length < 2) return null
  let peak = points[0]!.nav
  let worst = 0
  for (const point of points) {
    peak = Math.max(peak, point.nav)
    // How far below the highest NAV seen so far are we now?
    worst = Math.max(worst, (peak - point.nav) / peak)
  }
  return round2(worst * 100)
}
