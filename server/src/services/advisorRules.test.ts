import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ADVISOR_DISCLAIMER, type FundMetrics, type RiskProfile } from '@rupeeround/shared'
import {
  aiFacts,
  categoryForScore,
  checkAiText,
  scoreRiskProfile,
  suggestFund,
  templateExplanation,
  type RuleFund,
} from './advisorRules.ts'

const metrics: FundMetrics = {
  latestNav: 40,
  navDate: '2026-10-01',
  return1yPct: 4.4,
  volatilityPct: 1.2,
  maxDrawdownPct: 12.3,
}

const FUNDS: RuleFund[] = [
  { id: 'L', shortName: 'Large Index', category: 'large', minInvestmentPaise: 100_00, metrics },
  { id: 'M', shortName: 'Mid Index', category: 'mid', minInvestmentPaise: 500_00, metrics },
  { id: 'S', shortName: 'Small Index', category: 'small', minInvestmentPaise: 1_000_00, metrics },
]

const cautious: RiskProfile = { horizon: 'lt1y', dropReaction: 'sell', income: 'irregular' }
const balanced: RiskProfile = { horizon: '1to3y', dropReaction: 'wait', income: 'irregular' }
const bold: RiskProfile = { horizon: 'gt3y', dropReaction: 'buyMore', income: 'steady' }

test('score bands map to categories', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(categoryForScore), [
    'large', 'large', 'large', 'mid', 'mid', 'small', 'small',
  ])
})

test('scores the three answers 0–6', () => {
  assert.deepEqual(scoreRiskProfile(cautious), { score: 0, category: 'large', shortHorizonRule: false })
  assert.deepEqual(scoreRiskProfile(balanced), { score: 2, category: 'large', shortHorizonRule: false })
  assert.deepEqual(scoreRiskProfile({ ...balanced, income: 'steady' }), { score: 4, category: 'mid', shortHorizonRule: false })
  assert.deepEqual(scoreRiskProfile(bold), { score: 6, category: 'small', shortHorizonRule: false })
})

test('money needed within a year always stays in Large Cap', () => {
  // 0 + 2 + 2 = 4 would be Mid Cap, but the short horizon overrides it.
  assert.deepEqual(scoreRiskProfile({ horizon: 'lt1y', dropReaction: 'buyMore', income: 'steady' }), {
    score: 4,
    category: 'large',
    shortHorizonRule: true,
  })
})

test('suggests the category fund and reports the shortfall', () => {
  const suggestion = suggestFund(bold, FUNDS, 620_00)
  assert.equal(suggestion.fund.id, 'S')
  assert.equal(suggestion.reachableNow, false)
  assert.equal(suggestion.shortfallPaise, 380_00)
  // Mid Cap is the closest category the wallet already covers.
  assert.equal(suggestion.alternative?.id, 'M')
})

test('no alternative when the suggestion is already reachable', () => {
  const suggestion = suggestFund(bold, FUNDS, 1_200_00)
  assert.equal(suggestion.reachableNow, true)
  assert.equal(suggestion.shortfallPaise, 0)
  assert.equal(suggestion.alternative, null)
})

test('no alternative when nothing is reachable', () => {
  assert.equal(suggestFund(bold, FUNDS, 50_00).alternative, null)
})

test('changing the answers changes the suggestion', () => {
  assert.notEqual(suggestFund(cautious, FUNDS, 620_00).fund.id, suggestFund(bold, FUNDS, 620_00).fund.id)
})

test('AI text: keeps a clean reply and appends the disclaimer', () => {
  const facts = aiFacts(suggestFund(bold, FUNDS, 620_00), bold)
  const reply = 'Small Index is a Small Cap fund that fits your score of 6 out of 6. Over the past year its NAV rose 4.4%, with a biggest drop of 12.3%.'
  assert.equal(checkAiText(reply, facts), `${reply} ${ADVISOR_DISCLAIMER}`)
})

test('AI text: rejects invented numbers, banned words and empty replies', () => {
  const facts = aiFacts(suggestFund(bold, FUNDS, 620_00), bold)
  assert.equal(checkAiText('It could return 18% next year.', facts), null)
  assert.equal(checkAiText('This is the best fund for you.', facts), null)
  assert.equal(checkAiText('Returns are guaranteed.', facts), null)
  assert.equal(checkAiText('   ', facts), null)
})

test('AI text: drops a model-written disclaimer and keeps at most 3 sentences', () => {
  const facts = aiFacts(suggestFund(bold, FUNDS, 620_00), bold)
  const checked = checkAiText('One. Two. Three. Four. This is not financial advice.', facts)
  assert.equal(checked, `One. Two. Three. ${ADVISOR_DISCLAIMER}`)
})

test('AI facts contain no personal data or wallet balance', () => {
  const facts = aiFacts(suggestFund(bold, FUNDS, 620_00), bold)
  const json = JSON.stringify(facts)
  assert.doesNotMatch(json, /620/)
  assert.deepEqual(Object.keys(facts).sort(), [
    'answers', 'biggestDropFromHighPct', 'category', 'categoryInPlainWords', 'demoMinimumRupees', 'fund',
    'lowerMinimumFundAvailableNow', 'navDate', 'oneYearNavChangePct', 'riskScore', 'riskScoreMax',
    'walletStatus', 'whyThisCategory',
  ])
})

test('template explanation never predicts and ends with the disclaimer', () => {
  const text = templateExplanation(suggestFund(bold, FUNDS, 620_00))
  assert.ok(text.endsWith(ADVISOR_DISCLAIMER))
  assert.doesNotMatch(text, /\b(best|guarantee|sure)\b/i)
  assert.match(text, /\+4\.4%/)
  assert.match(text, /12\.3%/)
})
