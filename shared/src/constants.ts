/** Round-up steps a user can choose, in whole rupees. */
export const ROUND_UP_MULTIPLES = [5, 10, 20, 50, 100] as const
export type RoundUpMultiple = (typeof ROUND_UP_MULTIPLES)[number]
export const DEFAULT_ROUND_UP_MULTIPLE: RoundUpMultiple = 10

export function isRoundUpMultiple(value: number): value is RoundUpMultiple {
  return (ROUND_UP_MULTIPLES as readonly number[]).includes(value)
}

/** Indian mobile number without the +91 prefix. */
export const PHONE_REGEX = /^[6-9]\d{9}$/
export const PIN_REGEX = /^\d{4}$/
export const OTP_LENGTH = 6

/** Largest single simulated payment: ₹1,00,000. */
export const MAX_PAYMENT_PAISE = 1_00_000_00
/** Largest single simulated top-up: ₹50,000. */
export const MAX_TOPUP_PAISE = 50_000_00

export const FUND_CATEGORIES = ['large', 'mid', 'small'] as const
export type FundCategory = (typeof FUND_CATEGORIES)[number]

export const FUND_CATEGORY_LABELS: Record<FundCategory, string> = {
  large: 'Large Cap',
  mid: 'Mid Cap',
  small: 'Small Cap',
}

export const FUND_CATEGORY_RISK: Record<FundCategory, string> = {
  large: 'Lower risk',
  mid: 'Medium risk',
  small: 'Higher risk',
}

export const MERCHANT_CATEGORIES = ['food', 'grocery', 'transport', 'shopping', 'health', 'other'] as const
export type MerchantCategory = (typeof MERCHANT_CATEGORIES)[number]
