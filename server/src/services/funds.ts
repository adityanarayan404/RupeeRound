import type { FundCategory, NavPoint } from '@rupeeround/shared'
import { config } from '../config.ts'
import { Fund, type FundDocument } from '../models/Fund.ts'
import { toIsoDate } from '../utils/http.ts'

interface FundDefinition {
  schemeCode: number
  name: string
  shortName: string
  fundHouse: string
  category: FundCategory
  minInvestmentPaise: number
  /** Used only until the first live NAV fetch succeeds. */
  fallbackNav: number
}

// Real funds so the NAVs from mfapi.in are genuine.
// Minimums are RupeeRound demo values, labelled as such in the app. (HDFC Small Cap's
// ₹100 also matches its real minimum lump sum.)
const FUND_DEFINITIONS: FundDefinition[] = [
  {
    schemeCode: 120716,
    name: 'UTI Nifty 50 Index Fund - Direct Plan - Growth',
    shortName: 'UTI Nifty 50 Index',
    fundHouse: 'UTI Mutual Fund',
    category: 'large',
    minInvestmentPaise: 100_00,
    fallbackNav: 157.89,
  },
  {
    schemeCode: 147622,
    name: 'Motilal Oswal Nifty Midcap 150 Index Fund - Direct Plan - Growth',
    shortName: 'Motilal Oswal Midcap 150',
    fundHouse: 'Motilal Oswal Mutual Fund',
    category: 'mid',
    minInvestmentPaise: 500_00,
    fallbackNav: 39.29,
  },
  {
    schemeCode: 130503,
    name: 'HDFC Small Cap Fund - Direct Plan - Growth Option',
    shortName: 'HDFC Small Cap',
    fundHouse: 'HDFC Mutual Fund',
    category: 'small',
    minInvestmentPaise: 100_00,
    fallbackNav: 155.01,
  },
]

/**
 * When a category's scheme changes (e.g. Small Cap: Motilal Oswal → HDFC), switch the
 * existing fund record to the new scheme instead of adding a fourth fund. Its _id stays
 * the same, so users "saving towards" it keep pointing at the right category; the old
 * scheme's NAV history is cleared and re-fetched for the new one.
 */
async function migrateReplacedSchemes(): Promise<void> {
  const codes = FUND_DEFINITIONS.map((definition) => definition.schemeCode)
  for (const definition of FUND_DEFINITIONS) {
    if (await Fund.exists({ schemeCode: definition.schemeCode })) continue
    const replaced = await Fund.findOne({ category: definition.category, schemeCode: { $nin: codes } })
    if (!replaced) continue
    console.log(`Switching ${replaced.shortName} to ${definition.shortName}`)
    replaced.schemeCode = definition.schemeCode
    replaced.fundHouse = definition.fundHouse
    replaced.latestNav = definition.fallbackNav
    replaced.navDate = toIsoDate(new Date())
    replaced.navFetchedAt = null
    replaced.navHistory = []
    replaced.historyDays = 0
    await replaced.save()
  }
}

/** Creates the three demo funds if they are missing and keeps their settings in sync. */
export async function ensureFunds(): Promise<void> {
  await migrateReplacedSchemes()
  await Promise.all(
    FUND_DEFINITIONS.map((definition, index) =>
      Fund.updateOne(
        { schemeCode: definition.schemeCode },
        {
          $set: {
            name: definition.name,
            shortName: definition.shortName,
            category: definition.category,
            minInvestmentPaise: definition.minInvestmentPaise,
            sortOrder: index,
          },
          $setOnInsert: {
            fundHouse: definition.fundHouse,
            latestNav: definition.fallbackNav,
            navDate: toIsoDate(new Date()),
            navFetchedAt: null,
            navHistory: [],
          },
        },
        { upsert: true },
      ),
    ),
  )
}

interface MfApiResponse {
  status: string
  meta?: { fund_house?: string }
  data?: { date: string; nav: string }[]
}

const MFAPI_URL = 'https://api.mfapi.in/mf'
/** A little over 3 years, so the 3-year return has a comparison point. */
const HISTORY_DAYS = 1130
/** After a failed fetch, wait this long before trying mfapi.in again. */
const RETRY_AFTER_MS = 2 * 60 * 1000

const lastFailureAt = new Map<number, number>()
let refreshInFlight: Promise<void> | null = null

function ddmmyyyyToIso(value: string): string {
  const [day, month, year] = value.split('-')
  return `${year}-${month}-${day}`
}

/**
 * Turns mfapi.in's NAV list (newest first, "dd-mm-yyyy" dates, NAVs as strings)
 * into clean points, oldest first, covering the last `days` days.
 */
export function parseMfapiHistory(data: { date: string; nav: string }[], days: number = HISTORY_DAYS): NavPoint[] {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffIso = toIsoDate(cutoff)
  return data
    .map((point) => ({ date: ddmmyyyyToIso(point.date), nav: Number(point.nav) }))
    .filter((point) => Number.isFinite(point.nav) && point.nav > 0 && point.date >= cutoffIso)
    .sort((a, b) => a.date.localeCompare(b.date))
}

async function refreshFundNav(fund: FundDocument): Promise<void> {
  const response = await fetch(`${MFAPI_URL}/${fund.schemeCode}`, { signal: AbortSignal.timeout(6000) })
  if (!response.ok) throw new Error(`mfapi.in responded ${response.status}`)
  const body = (await response.json()) as MfApiResponse
  if (body.status !== 'SUCCESS' || !body.data?.length) throw new Error('mfapi.in returned no NAV data')

  const history = parseMfapiHistory(body.data)

  const latest = history[history.length - 1]
  if (!latest) throw new Error('mfapi.in returned no recent NAV')

  fund.navHistory = history
  fund.latestNav = latest.nav
  fund.navDate = latest.date
  fund.navFetchedAt = new Date()
  fund.historyDays = HISTORY_DAYS
  if (body.meta?.fund_house) fund.fundHouse = body.meta.fund_house
  await fund.save()
}

/**
 * Fetches fresh NAVs for funds whose cache is older than NAV_CACHE_HOURS.
 * Never throws: if mfapi.in is down the last saved NAV keeps being used.
 */
export function refreshStaleFunds(): Promise<void> {
  refreshInFlight ??= (async () => {
    const funds = await Fund.find()
    const now = Date.now()
    const stale = funds.filter((fund) => {
      const fresh =
        fund.navFetchedAt &&
        now - fund.navFetchedAt.getTime() <= config.navCacheMs &&
        fund.historyDays === HISTORY_DAYS // older, shorter histories get re-fetched once
      const recentlyFailed = now - (lastFailureAt.get(fund.schemeCode) ?? 0) < RETRY_AFTER_MS
      return !fresh && !recentlyFailed
    })
    await Promise.all(
      stale.map((fund) =>
        refreshFundNav(fund).catch((error: unknown) => {
          lastFailureAt.set(fund.schemeCode, Date.now())
          console.warn(`NAV refresh failed for ${fund.shortName}: ${(error as Error).message}`)
        }),
      ),
    )
  })().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

export async function listFunds(): Promise<FundDocument[]> {
  return Fund.find().sort({ sortOrder: 1 })
}
