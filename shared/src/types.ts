// Shapes of the JSON the API sends and receives. Shared by client and server.
import type { DropReaction, FundCategory, IncomeType, MerchantCategory, RiskHorizon } from './constants.ts'
import type { InvestmentPlan } from './invest.ts'
import type { FundMetrics } from './metrics.ts'

export interface RiskProfile {
  horizon: RiskHorizon
  dropReaction: DropReaction
  income: IncomeType
}

export interface UserDTO {
  id: string
  name: string
  phone: string
  defaultMultiple: number
  selectedFundId: string | null
  /** null until the user answers the 3 risk questions. */
  riskProfile: RiskProfile | null
  createdAt: string
}

export interface AuthResponse {
  token: string
  user: UserDTO
}

export interface CheckPhoneResponse {
  exists: boolean
}

export interface OtpRequestResponse {
  sent: true
  /** Present only in demo mode so the presenter knows what to type. */
  demoOtp?: string
}

export interface OtpVerifyResponse {
  signupToken: string
}

export type NavSource = 'live' | 'cached' | 'demo'

export interface FundDTO {
  id: string
  schemeCode: number
  name: string
  shortName: string
  fundHouse: string
  category: FundCategory
  /** Demo value set by RupeeRound, not the real scheme minimum. */
  minInvestmentPaise: number
  nav: number
  /** yyyy-mm-dd */
  navDate: string
  navSource: NavSource
  /** One-year NAV change as a fraction (0.12 = 12%), when history allows. */
  return1y: number | null
}

export interface NavPoint {
  /** yyyy-mm-dd */
  date: string
  nav: number
}

export interface NavHistoryResponse {
  fundId: string
  points: NavPoint[]
}

export interface WalletDTO {
  balancePaise: number
  totalRoundUpsPaise: number
  totalInvestedPaise: number
  totalTopUpsPaise: number
  selectedFund: FundDTO | null
  plan: InvestmentPlan | null
}

export interface TransactionDTO {
  id: string
  merchant: string
  category: MerchantCategory
  amountPaise: number
  roundedPaise: number
  roundUpPaise: number
  multiple: number
  createdAt: string
}

export interface PaymentRequest {
  merchant: string
  category: MerchantCategory
  amountPaise: number
  multiple: number
  pin: string
}

export interface PaymentResponse {
  transaction: TransactionDTO
  wallet: WalletDTO
}

export interface InvestmentDTO {
  id: string
  fundId: string
  fundName: string
  category: FundCategory
  amountPaise: number
  nav: number
  units: number
  createdAt: string
}

export interface InvestResponse {
  investment: InvestmentDTO
  wallet: WalletDTO
}

export interface HoldingDTO {
  fund: FundDTO
  units: number
  investedPaise: number
  currentValuePaise: number
  gainPaise: number
  gainPct: number
}

export interface SavingsPoint {
  /** yyyy-mm-dd */
  date: string
  /** Cumulative round-ups + top-ups up to this day. */
  savedPaise: number
  /** Cumulative amount invested up to this day. */
  investedPaise: number
}

export interface PortfolioDTO {
  investedPaise: number
  currentValuePaise: number
  gainPaise: number
  gainPct: number
  holdings: HoldingDTO[]
  investments: InvestmentDTO[]
  savingsHistory: SavingsPoint[]
}

export interface GoalDTO {
  id: string
  title: string
  emoji: string
  targetPaise: number
  savedPaise: number
  /** yyyy-mm-dd */
  deadline: string | null
  createdAt: string
}

export interface GoalsResponse {
  /** Everything the user has put aside: wallet balance + amount invested. */
  savedPaise: number
  goals: GoalDTO[]
}

/** 'ai' = Groq wrote the explanation; 'rules' = the built-in template did. The pick itself is always rule-based. */
export type SuggestionSource = 'ai' | 'rules'

export interface FundSuggestionDTO {
  fund: FundDTO
  category: FundCategory
  /** 0–6 from the risk answers; higher = more comfortable with ups and downs. */
  riskScore: number
  /** Plain-English facts behind the pick, in order. */
  reasons: string[]
  /** Computed from the stored mfapi.in NAV history (about the last year). */
  metrics: FundMetrics
  reachableNow: boolean
  /** 0 when the wallet already covers the fund minimum. */
  shortfallPaise: number
  /** A lower-minimum fund the wallet covers now, shown only when the suggestion isn't reachable yet. */
  alternativeFund: FundDTO | null
  /** Up to 3 sentences, always ending with ADVISOR_DISCLAIMER. */
  explanation: string
  source: SuggestionSource
}

export type AdvisorResponse = { needsProfile: true } | { needsProfile: false; suggestion: FundSuggestionDTO }

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    details?: unknown
  }
}
