// All money in RupeeRound is stored and computed as whole paise (₹1 = 100 paise)
// so that ₹32.10 + ₹2.90 is exactly ₹35, never 34.99999.

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100)
}

export function paiseToRupees(paise: number): number {
  return paise / 100
}

/**
 * Parses what a user typed ("32", "32.5", "1,250.75", "₹40") into paise.
 * Returns null for anything that isn't a non-negative amount with at most 2 decimals.
 */
export function parseRupeesInput(input: string): number | null {
  const cleaned = input.replace(/[,\s₹]/g, '')
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null
  const [whole, fraction = ''] = cleaned.split('.')
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
}

const wholeRupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const withPaise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** ₹1,070 for whole rupees, ₹32.50 when there are paise. */
export function formatPaise(paise: number): string {
  const formatter = Number.isInteger(paise / 100) ? wholeRupees : withPaise
  return formatter.format(paise / 100)
}
