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
