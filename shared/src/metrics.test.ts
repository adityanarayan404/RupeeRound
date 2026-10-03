import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fundMetrics, fundReturns, lastYearHistory, periodReturnPct } from './metrics.ts'
import type { NavPoint } from './types.ts'

/** Daily NAV points starting from `start`, one per calendar day. */
function series(start: string, navs: number[]): NavPoint[] {
  const first = Date.parse(`${start}T00:00:00Z`)
  return navs.map((nav, index) => ({
    date: new Date(first + index * 86_400_000).toISOString().slice(0, 10),
    nav,
  }))
}

test('empty history returns nulls instead of throwing', () => {
  assert.deepEqual(fundMetrics([]), {
    latestNav: null,
    navDate: null,
    return1yPct: null,
    volatilityPct: null,
    maxDrawdownPct: null,
  })
})

test('a single point only knows the latest NAV', () => {
  const metrics = fundMetrics([{ date: '2026-10-01', nav: 50 }])
  assert.equal(metrics.latestNav, 50)
  assert.equal(metrics.navDate, '2026-10-01')
  assert.equal(metrics.return1yPct, null)
  assert.equal(metrics.volatilityPct, null)
  assert.equal(metrics.maxDrawdownPct, null)
})

test('100 → 120 → 90 is a 25% max drawdown', () => {
  assert.equal(fundMetrics(series('2026-01-01', [100, 120, 90])).maxDrawdownPct, 25)
})

test('a fund that only rises has no drawdown', () => {
  assert.equal(fundMetrics(series('2026-01-01', [10, 11, 12, 13])).maxDrawdownPct, 0)
})

test('one-year return uses the point closest to 365 days earlier', () => {
  const history: NavPoint[] = [
    { date: '2025-09-28', nav: 80 }, // 368 days before
    { date: '2025-10-02', nav: 100 }, // 364 days before: closest
    { date: '2026-04-01', nav: 105 },
    { date: '2026-10-01', nav: 112 },
  ]
  assert.equal(fundMetrics(history).return1yPct, 12)
})

test('no one-year return when history is shorter than a year', () => {
  assert.equal(fundMetrics(series('2026-06-01', [10, 11, 12])).return1yPct, null)
})

test('volatility is the standard deviation of daily % changes', () => {
  // Daily changes: +10%, −10%, +10%, −10% → mean 0, sample std dev ≈ 11.55
  const metrics = fundMetrics(series('2026-01-01', [100, 110, 99, 108.9, 98.01]))
  assert.equal(metrics.volatilityPct, 11.55)
  // A perfectly steady fund has zero volatility.
  assert.equal(fundMetrics(series('2026-01-01', [100, 101, 102.01])).volatilityPct, 0)
})

test('period returns: day, months and years, null when history is too short', () => {
  const history: NavPoint[] = [
    { date: '2023-10-02', nav: 50 }, // 3 years before
    { date: '2025-10-01', nav: 80 }, // 1 year before
    { date: '2026-07-02', nav: 90 }, // ~91 days before
    { date: '2026-09-01', nav: 95 }, // 30 days before
    { date: '2026-09-30', nav: 98 },
    { date: '2026-10-01', nav: 100 },
  ]
  assert.deepEqual(fundReturns(history), { day: 2.04, month1: 5.26, month3: 11.11, year1: 25, year3: 100 })
  assert.equal(periodReturnPct(history.slice(3), 365), null)
  assert.deepEqual(fundReturns([]), { day: null, month1: null, month3: null, year1: null, year3: null })
})

test('lastYearHistory keeps about the last year of points', () => {
  const history: NavPoint[] = [
    { date: '2024-01-01', nav: 1 },
    { date: '2025-09-20', nav: 2 },
    { date: '2026-10-01', nav: 3 },
  ]
  assert.deepEqual(lastYearHistory(history).map((point) => point.date), ['2025-09-20', '2026-10-01'])
  assert.deepEqual(lastYearHistory([]), [])
})

test('ignores broken NAV values', () => {
  const metrics = fundMetrics([
    { date: '2026-01-01', nav: 100 },
    { date: '2026-01-02', nav: Number.NaN },
    { date: '2026-01-03', nav: 0 },
    { date: '2026-01-04', nav: 90 },
  ])
  assert.equal(metrics.latestNav, 90)
  assert.equal(metrics.maxDrawdownPct, 10)
})
