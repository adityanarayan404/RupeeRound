import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculateRoundUp } from './roundup.ts'
import { planInvestment, unitsFor } from './invest.ts'
import { formatPaise, parseRupeesInput } from './money.ts'

test('rounds ₹32 up to ₹35 with a ₹5 multiple', () => {
  assert.deepEqual(calculateRoundUp(3200, 5), { amountPaise: 3200, roundedPaise: 3500, roundUpPaise: 300 })
})

test('an exact multiple has no round-up', () => {
  assert.equal(calculateRoundUp(3500, 5).roundUpPaise, 0)
})

test('handles paise exactly', () => {
  assert.deepEqual(calculateRoundUp(3210, 10), { amountPaise: 3210, roundedPaise: 4000, roundUpPaise: 790 })
  assert.equal(calculateRoundUp(10_100, 5).roundUpPaise, 400)
})

test('rejects invalid input', () => {
  assert.throws(() => calculateRoundUp(0, 5), RangeError)
  assert.throws(() => calculateRoundUp(-100, 5), RangeError)
  assert.throws(() => calculateRoundUp(32.5, 5), RangeError)
  assert.throws(() => calculateRoundUp(3200, 0), RangeError)
})

test('carries forward below the fund minimum', () => {
  assert.deepEqual(planInvestment(62_000, 100_000), {
    status: 'carry-forward',
    shortfallPaise: 38_000,
    progress: 0.62,
  })
})

test('invests and keeps the remainder in the wallet', () => {
  assert.deepEqual(planInvestment(107_000, 100_000, 100_000), {
    status: 'eligible',
    investPaise: 100_000,
    remainingPaise: 7_000,
    progress: 1,
  })
  assert.equal(planInvestment(107_000, 100_000).status, 'eligible')
})

test('rejects investments outside the minimum and balance', () => {
  assert.throws(() => planInvestment(107_000, 100_000, 50_000), RangeError)
  assert.throws(() => planInvestment(107_000, 100_000, 200_000), RangeError)
})

test('allots units to 3 decimals', () => {
  assert.equal(unitsFor(100_000, 157.8901), 6.333)
})

test('parses and formats rupee amounts', () => {
  assert.equal(parseRupeesInput('32'), 3200)
  assert.equal(parseRupeesInput('32.5'), 3250)
  assert.equal(parseRupeesInput('₹1,250.75'), 125_075)
  assert.equal(parseRupeesInput('3.456'), null)
  assert.equal(parseRupeesInput('abc'), null)
  assert.equal(formatPaise(107_000), '₹1,070')
  assert.equal(formatPaise(3250), '₹32.50')
})
