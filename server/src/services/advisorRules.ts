// Pure, deterministic rules for the fund suggestion. No database, no network,
// so they are easy to unit-test. The AI never decides anything here.
import {
  ADVISOR_DISCLAIMER,
  FUND_CATEGORY_LABELS,
  formatPaise,
  type DropReaction,
  type FundCategory,
  type FundMetrics,
  type IncomeType,
  type RiskHorizon,
  type RiskProfile,
} from '@rupeeround/shared'

/**
 * Points per answer: more points = more comfortable with ups and downs.
 * Three answers, 0–2 points each, so the total is 0–6.
 */
export const RISK_SCORE_TABLE: {
  horizon: Record<RiskHorizon, number>
  dropReaction: Record<DropReaction, number>
  income: Record<IncomeType, number>
} = {
  horizon: { lt1y: 0, '1to3y': 1, gt3y: 2 },
  dropReaction: { sell: 0, wait: 1, buyMore: 2 },
  income: { irregular: 0, steady: 2 },
}

export const MAX_RISK_SCORE = 6

/** 0–2 → Large Cap, 3–4 → Mid Cap, 5–6 → Small Cap. */
export function categoryForScore(score: number): FundCategory {
  if (score <= 2) return 'large'
  if (score <= 4) return 'mid'
  return 'small'
}

export interface RiskScore {
  score: number
  category: FundCategory
  /** True when the short-horizon rule overrode the score. */
  shortHorizonRule: boolean
}

export function scoreRiskProfile(profile: RiskProfile): RiskScore {
  const score =
    RISK_SCORE_TABLE.horizon[profile.horizon] +
    RISK_SCORE_TABLE.dropReaction[profile.dropReaction] +
    RISK_SCORE_TABLE.income[profile.income]
  const byScore = categoryForScore(score)

  // Money that may be needed within a year shouldn't ride mid/small cap swings,
  // whatever the other two answers say.
  if (profile.horizon === 'lt1y' && byScore !== 'large') {
    return { score, category: 'large', shortHorizonRule: true }
  }
  return { score, category: byScore, shortHorizonRule: false }
}

/** The minimum the rules need to know about each fund. */
export interface RuleFund {
  id: string
  shortName: string
  category: FundCategory
  minInvestmentPaise: number
  metrics: FundMetrics
}

export interface RuleSuggestion extends RiskScore {
  fund: RuleFund
  reasons: string[]
  reachableNow: boolean
  shortfallPaise: number
  alternative: RuleFund | null
}

const CATEGORY_ORDER: FundCategory[] = ['large', 'mid', 'small']

const CATEGORY_DESCRIPTIONS: Record<FundCategory, string> = {
  large: "Large Cap funds hold India's biggest companies and usually move less than smaller ones.",
  mid: 'Mid Cap funds hold mid-sized companies and tend to have bigger ups and downs than Large Caps.',
  small: 'Small Cap funds hold smaller companies and can swing the most, both up and down.',
}

/** "+4.4%" / "−8.9%" */
export function signedPct(value: number): string {
  return `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}%`
}

/**
 * Picks one of our funds for this risk profile and wallet balance.
 * The category always follows the risk answers; if the wallet can't reach that
 * fund's minimum yet, a lower-minimum fund it can reach is offered as an alternative.
 */
export function suggestFund(profile: RiskProfile, funds: RuleFund[], balancePaise: number): RuleSuggestion {
  const risk = scoreRiskProfile(profile)
  const fund = funds.find((candidate) => candidate.category === risk.category)
  if (!fund) throw new Error(`No ${risk.category} fund configured`)

  const shortfallPaise = Math.max(0, fund.minInvestmentPaise - balancePaise)
  const reachableNow = shortfallPaise === 0

  // Closest category to the suggestion that the wallet already covers.
  let alternative: RuleFund | null = null
  if (!reachableNow) {
    const target = CATEGORY_ORDER.indexOf(risk.category)
    alternative =
      funds
        .filter((candidate) => candidate.id !== fund.id && candidate.minInvestmentPaise <= balancePaise)
        .sort(
          (a, b) =>
            Math.abs(CATEGORY_ORDER.indexOf(a.category) - target) - Math.abs(CATEGORY_ORDER.indexOf(b.category) - target) ||
            b.minInvestmentPaise - a.minInvestmentPaise,
        )[0] ?? null
  }

  const label = FUND_CATEGORY_LABELS[risk.category]
  const reasons: string[] = [
    risk.shortHorizonRule
      ? `You may need this money within a year, so the suggestion stays with a ${label} fund.`
      : `Your answers score ${risk.score} out of ${MAX_RISK_SCORE} for comfort with ups and downs, which points to a ${label} fund.`,
    CATEGORY_DESCRIPTIONS[risk.category],
  ]
  if (fund.metrics.return1yPct !== null) {
    reasons.push(`Over about the past year, its NAV moved ${signedPct(fund.metrics.return1yPct)}.`)
  }
  if (fund.metrics.maxDrawdownPct !== null) {
    reasons.push(`Its biggest drop from a high point in that time was ${fund.metrics.maxDrawdownPct.toFixed(1)}%.`)
  }
  reasons.push(
    reachableNow
      ? `Your wallet already covers its ${formatPaise(fund.minInvestmentPaise)} demo minimum.`
      : `Your wallet is ${formatPaise(shortfallPaise)} short of its ${formatPaise(fund.minInvestmentPaise)} demo minimum, so your balance carries forward until then.`,
  )
  if (alternative) {
    reasons.push(
      `${alternative.shortName} has a lower ${formatPaise(alternative.minInvestmentPaise)} demo minimum that your wallet covers now, if you want to start sooner.`,
    )
  }

  return { ...risk, fund, reasons, reachableNow, shortfallPaise, alternative }
}

// ---------------------------------------------------------------------------
// What the AI sees, and how its answer is checked
// ---------------------------------------------------------------------------

/** Facts only: no name, phone or exact wallet balance ever goes to the AI. */
export function aiFacts(suggestion: RuleSuggestion, profile: RiskProfile) {
  const { fund, alternative } = suggestion
  const label = FUND_CATEGORY_LABELS[suggestion.category]
  // Ready-made phrases: the model words things better from sentences than from true/false flags.
  return {
    fund: fund.shortName,
    category: label,
    // Written as "you/your" so the model speaks to the user directly.
    whyThisCategory: suggestion.shortHorizonRule
      ? `You may need this money within a year, so a ${label} fund fits.`
      : `Your answers score ${suggestion.score} out of ${MAX_RISK_SCORE} for comfort with ups and downs, which fits a ${label} fund.`,
    categoryInPlainWords: CATEGORY_DESCRIPTIONS[suggestion.category],
    answers: {
      needMoneyIn: { lt1y: 'under 1 year', '1to3y': '1 to 3 years', gt3y: 'more than 3 years' }[profile.horizon],
      ifInvestmentFell20Pct: { sell: 'would sell', wait: 'would wait', buyMore: 'would buy more' }[profile.dropReaction],
      income: profile.income,
    },
    riskScore: suggestion.score,
    riskScoreMax: MAX_RISK_SCORE,
    navDate: fund.metrics.navDate,
    oneYearNavChangePct: fund.metrics.return1yPct,
    biggestDropFromHighPct: fund.metrics.maxDrawdownPct,
    demoMinimumRupees: fund.minInvestmentPaise / 100,
    walletStatus: suggestion.reachableNow
      ? 'Your round-up wallet already covers this fund’s demo minimum.'
      : alternative
        ? `Your round-up wallet has not reached this fund’s demo minimum yet, so your balance carries forward. ${alternative.shortName} has a lower demo minimum your wallet already covers.`
        : 'Your round-up wallet has not reached this fund’s demo minimum yet, so your balance carries forward.',
    lowerMinimumFundAvailableNow: alternative?.shortName ?? null,
  }
}

export type AiFacts = ReturnType<typeof aiFacts>

const BANNED_WORDS = /\b(best|guarantee[ds]?|sure(ly)?|certain(ly)?|safe|risk-free|assured|definitely)\b/i

/** Every number the AI may write: the facts themselves, plus numbers inside fund names (e.g. "Nifty 50"). */
function allowedNumbers(facts: AiFacts): number[] {
  const values = [
    facts.riskScore,
    facts.riskScoreMax,
    facts.demoMinimumRupees,
    20, // from the "fell 20%" question
    1, // "1 year"
    3, // "3 years"
  ]
  for (const value of [facts.oneYearNavChangePct, facts.biggestDropFromHighPct]) {
    if (value !== null) values.push(Math.abs(value))
  }
  for (const name of [facts.fund, facts.lowerMinimumFundAvailableNow ?? '']) {
    for (const match of name.match(/\d+/g) ?? []) values.push(Number(match))
  }
  if (facts.navDate) values.push(...facts.navDate.split('-').map(Number))
  return values
}

/**
 * Checks the AI's reply against the hard rules. Returns the cleaned text with the
 * disclaimer appended, or null if it breaks a rule (the caller then uses the template).
 */
export function checkAiText(raw: string, facts: AiFacts): string | null {
  const text = raw
    .replace(/[*_#`>]/g, '') // strip markdown
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/) // into sentences
    .filter((sentence) => !/financial advice|past performance/i.test(sentence)) // our disclaimer is added below
    .slice(0, 3)
    .join(' ')
    .trim()

  if (!text || text.length > 600) return null
  if (BANNED_WORDS.test(text)) return null

  // Every number in the reply must match a fact (to 1 decimal place), so it can't invent figures.
  const allowed = allowedNumbers(facts)
  const numbers = (text.match(/\d+(?:[.,]\d+)*/g) ?? []).map((value) => Number(value.replace(/,/g, '')))
  if (!numbers.every((value) => allowed.some((fact) => Math.abs(fact - value) <= 0.05))) return null

  return `${text} ${ADVISOR_DISCLAIMER}`
}

/** Fallback explanation when the AI is unavailable: 3 sentences + disclaimer. */
export function templateExplanation(suggestion: RuleSuggestion): string {
  const { fund, category, score, shortHorizonRule, reachableNow } = suggestion
  const label = FUND_CATEGORY_LABELS[category]
  const { return1yPct, maxDrawdownPct } = fund.metrics

  const fit = shortHorizonRule
    ? `${fund.shortName} is a ${label} fund, chosen because you may need this money within a year.`
    : `${fund.shortName} is a ${label} fund, which matches your answers (score ${score} out of ${MAX_RISK_SCORE}).`

  const history =
    return1yPct !== null && maxDrawdownPct !== null
      ? `Over about the past year its NAV moved ${signedPct(return1yPct)}, and its biggest drop from a high point was ${maxDrawdownPct.toFixed(1)}%.`
      : CATEGORY_DESCRIPTIONS[category]

  const reach = reachableNow
    ? 'Your wallet already covers its demo minimum, so you can invest now.'
    : 'Until your wallet reaches its demo minimum, your balance simply carries forward.'

  return `${fit} ${history} ${reach} ${ADVISOR_DISCLAIMER}`
}
