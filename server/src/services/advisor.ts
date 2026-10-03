// Fund suggestion: the rules in advisorRules.ts pick the fund; Groq only
// rewrites the reasons in plain English. Any AI problem falls back to a template.
import {
  fundMetrics,
  lastYearHistory,
  type AdvisorResponse,
  type RiskProfile,
  type SuggestionSource,
} from '@rupeeround/shared'
import { User } from '../models/User.ts'
import { HttpError } from '../utils/http.ts'
import { toFundDTO } from '../utils/serialize.ts'
import {
  aiFacts,
  checkAiText,
  suggestFund,
  templateExplanation,
  type AiFacts,
  type RuleSuggestion,
} from './advisorRules.ts'
import { listFunds, refreshStaleFunds } from './funds.ts'
import { groqComplete } from './groq.ts'
import { getOrCreateWallet } from './wallet.ts'

const AI_CACHE_MS = 3 * 60 * 60 * 1000
/** Template results are cached briefly so a broken key doesn't call Groq on every request. */
const RULES_CACHE_MS = 5 * 60 * 1000

// ---------------------------------------------------------------------------
// Groq explanation
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You explain a mutual fund suggestion to a beginner investor in India, in plain English.
The fund has ALREADY been chosen by fixed rules. You only explain it, using the JSON facts you are given.

Write exactly 3 short sentences, speaking to the user as "you":
1. Why this category fits their answers (use "whyThisCategory" and "categoryInPlainWords").
2. What the fund's NAV did over about the past year and its biggest drop from a high point (use "oneYearNavChangePct" and "biggestDropFromHighPct"; skip this sentence's numbers if they are null).
3. The wallet situation (use "walletStatus").

Rules you must follow:
- No lists, no headings, no markdown. Write percentages like 4.4% and rupees like ₹1,000.
- Only mention the fund named in "fund", and "lowerMinimumFundAvailableNow" if it is not null. Never name any other fund, company or index.
- Only use numbers that appear in the facts. Never invent, estimate or round numbers in a new way.
- Never predict future returns or say what will happen.
- Never use the words "best", "guaranteed", "guarantee", "sure", "certain", "safe" or "risk-free".
- Do not tell the user to buy or sell. Describe why this fund fits their answers.
- The user did not choose this fund; the rules suggested it. Never write "you chose". Start with the fund or the category, e.g. "A Small Cap fund fits your answers because...".
- Do not add a disclaimer; one is added automatically.`

/** Returns the AI's raw text, or null on any failure. Never throws. */
function askGroq(facts: AiFacts): Promise<string | null> {
  return groqComplete({
    label: 'explanation',
    temperature: 0.2,
    maxTokens: 400,
    timeoutMs: 5000,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify(facts) },
    ],
  })
}

// ---------------------------------------------------------------------------
// Cache + public entry point
// ---------------------------------------------------------------------------

interface CachedExplanation {
  explanation: string
  source: SuggestionSource
  expiresAt: number
}

const explanationCache = new Map<string, CachedExplanation>()

function cacheKey(userId: string, profile: RiskProfile, suggestion: RuleSuggestion): string {
  return [
    userId,
    profile.horizon,
    profile.dropReaction,
    profile.income,
    suggestion.fund.id,
    suggestion.fund.metrics.navDate ?? 'no-nav',
    // "Balance bucket": the explanation only depends on whether the wallet covers the
    // minimum and which alternative is offered, not on the exact rupee amount.
    suggestion.reachableNow ? 'covers' : `short:${suggestion.alternative?.id ?? 'none'}`,
  ].join('|')
}

async function explain(
  userId: string,
  profile: RiskProfile,
  suggestion: RuleSuggestion,
): Promise<{ explanation: string; source: SuggestionSource }> {
  const key = cacheKey(userId, profile, suggestion)
  const now = Date.now()
  const cached = explanationCache.get(key)
  if (cached && cached.expiresAt > now) return cached

  const facts = aiFacts(suggestion, profile)
  const raw = await askGroq(facts)
  const checked = raw ? checkAiText(raw, facts) : null
  if (raw && !checked) console.warn('Groq explanation rejected by safety checks; using template')

  const result: CachedExplanation = checked
    ? { explanation: checked, source: 'ai', expiresAt: now + AI_CACHE_MS }
    : { explanation: templateExplanation(suggestion), source: 'rules', expiresAt: now + RULES_CACHE_MS }

  // Drop expired entries so the map can't grow forever.
  for (const [entryKey, entry] of explanationCache) {
    if (entry.expiresAt <= now) explanationCache.delete(entryKey)
  }
  explanationCache.set(key, result)
  return result
}

export async function getFundSuggestion(userId: string): Promise<AdvisorResponse> {
  const user = await User.findById(userId)
  if (!user) throw new HttpError(401, 'unauthorized', 'Account not found. Please log in again.')
  if (!user.riskProfile) return { needsProfile: true }
  const profile: RiskProfile = {
    horizon: user.riskProfile.horizon,
    dropReaction: user.riskProfile.dropReaction,
    income: user.riskProfile.income,
  }

  await refreshStaleFunds() // respects the NAV cache; only fetches when stale
  const [funds, wallet] = await Promise.all([listFunds(), getOrCreateWallet(userId)])

  const suggestion = suggestFund(
    profile,
    funds.map((fund) => ({
      id: fund.id,
      shortName: fund.shortName,
      category: fund.category,
      minInvestmentPaise: fund.minInvestmentPaise,
      metrics: fundMetrics(lastYearHistory(fund.navHistory)),
    })),
    wallet.balancePaise,
  )
  const { explanation, source } = await explain(userId, profile, suggestion)

  const fundsById = new Map(funds.map((fund) => [fund.id, fund]))
  const alternative = suggestion.alternative ? fundsById.get(suggestion.alternative.id) : undefined

  return {
    needsProfile: false,
    suggestion: {
      fund: toFundDTO(fundsById.get(suggestion.fund.id)!),
      category: suggestion.category,
      riskScore: suggestion.score,
      reasons: suggestion.reasons,
      metrics: suggestion.fund.metrics,
      reachableNow: suggestion.reachableNow,
      shortfallPaise: suggestion.shortfallPaise,
      alternativeFund: alternative ? toFundDTO(alternative) : null,
      explanation,
      source,
    },
  }
}
