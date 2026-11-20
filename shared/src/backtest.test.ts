import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  SPENDING_PROFILES,
  SPENDING_PROFILE_IDS,
  backtestWindow,
  generatePayments,
  runBacktest,
  type SimulatedPayment,
} from './backtest.ts'
import type { NavPoint } from './types.ts'

function pay(date: string, rupees: number): SimulatedPayment {
  return { date, merchant: 'Shop', category: 'other', amountPaise: rupees * 100 }
}

function navs(start: string, values: number[]): NavPoint[] {
  const first = Date.parse(`${start}T00:00:00Z`)
  return values.map((nav, index) => ({ date: new Date(first + index * 86_400_000).toISOString().slice(0, 10), nav }))
}

test('generated payments are repeatable and stay inside the profile', () => {
  for (const id of SPENDING_PROFILE_IDS) {
    const a = generatePayments(id, '2026-01-01', '2026-01-31')
    const b = generatePayments(id, '2026-01-01', '2026-01-31')
    assert.deepEqual(a, b)

    const profile = SPENDING_PROFILES[id]
    const [minPerDay, maxPerDay] = profile.paymentsPerDay
    assert.ok(a.length >= 31 * minPerDay && a.length <= 31 * maxPerDay)
    for (const payment of a) {
      assert.ok(payment.date >= '2026-01-01' && payment.date <= '2026-01-31')
      const merchant = profile.merchants.find((candidate) => candidate.name === payment.merchant)!
      assert.ok(payment.amountPaise >= merchant.minRupees * 100 && payment.amountPaise <= merchant.maxRupees * 100)
      assert.equal(payment.amountPaise % 100, 0)
    }
  }
})

test('the window goes back from the latest NAV, or starts at the first NAV', () => {
  const history = navs('2026-01-01', [10, 10, 10, 10, 10])
  assert.deepEqual(backtestWindow(history, 2), { fromIso: '2026-01-03', toIso: '2026-01-05' })
  assert.deepEqual(backtestWindow(history, 365), { fromIso: '2026-01-01', toIso: '2026-01-05' })
  assert.equal(backtestWindow([], 365), null)
})

test('round-ups below the minimum carry forward and are never invested', () => {
  // ₹32 and ₹47 with a ₹10 step → ₹8 + ₹3 = ₹11 saved, below a ₹100 minimum.
  const result = runBacktest({
    payments: [pay('2026-01-01', 32), pay('2026-01-02', 47)],
    navHistory: navs('2026-01-01', [10, 10, 10]),
    multipleRupees: 10,
    minimumPaise: 100_00,
  })
  assert.equal(result.roundUpsPaise, 11_00)
  assert.equal(result.investmentsCount, 0)
  assert.equal(result.walletPaise, 11_00)
  assert.equal(result.totalValuePaise, 11_00)
  assert.equal(result.gainFraction, 0)
})

test('the wallet is invested at that day\'s NAV once it reaches the minimum', () => {
  // Day 1: ₹1 → ₹100 step saves ₹99 (below ₹100). Day 2: ₹99 more → ₹198, invested at NAV 20.
  // NAV then doubles to 40, so the units are worth twice what was invested.
  const result = runBacktest({
    payments: [pay('2026-01-01', 1), pay('2026-01-02', 1)],
    navHistory: navs('2026-01-01', [10, 20, 40]),
    multipleRupees: 100,
    minimumPaise: 100_00,
  })
  assert.equal(result.investmentsCount, 1)
  assert.equal(result.firstInvestmentDate, '2026-01-02')
  assert.equal(result.investedPaise, 198_00)
  assert.equal(result.units, 9.9)
  assert.equal(result.unitsValuePaise, 396_00)
  assert.equal(result.gainPaise, 198_00)
  assert.equal(result.gainFraction, 1)
  assert.equal(result.walletPaise, 0)
})

test('payments on a day without a NAV are invested on the next NAV day', () => {
  // NAVs skip 2026-01-02 (a holiday): that payment is invested on 2026-01-03.
  const result = runBacktest({
    payments: [pay('2026-01-02', 1)],
    navHistory: [
      { date: '2026-01-01', nav: 10 },
      { date: '2026-01-03', nav: 11 },
    ],
    multipleRupees: 100,
    minimumPaise: 50_00,
  })
  assert.equal(result.firstInvestmentDate, '2026-01-03')
  assert.equal(result.units, 9) // ₹99 ÷ 11, 3 decimals
})

test('a flat NAV keeps value equal to what was saved', () => {
  const payments = generatePayments('student', '2026-01-01', '2026-03-31')
  const flat = navs('2026-01-01', Array.from({ length: 90 }, () => 25))
  const result = runBacktest({ payments, navHistory: flat, multipleRupees: 10, minimumPaise: 100_00 })
  assert.ok(result.investmentsCount > 0)
  // Units are floored to 3 decimals, so value can be a few paise under.
  assert.ok(result.roundUpsPaise - result.totalValuePaise <= result.investmentsCount * 3)
  assert.ok(result.series.length <= 61)
  assert.equal(result.series[result.series.length - 1]!.date, result.toIso)
})
