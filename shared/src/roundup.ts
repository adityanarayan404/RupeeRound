export interface RoundUpResult {
  amountPaise: number
  roundedPaise: number
  roundUpPaise: number
}

/**
 * Rounds a payment up to the next multiple of `multipleRupees`.
 *
 *   ₹32 with ₹5  → pay ₹35, ₹3 round-up
 *   ₹35 with ₹5  → pay ₹35, ₹0 round-up (already a multiple)
 */
export function calculateRoundUp(amountPaise: number, multipleRupees: number): RoundUpResult {
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw new RangeError('Payment amount must be a positive whole number of paise')
  }
  if (!Number.isInteger(multipleRupees) || multipleRupees <= 0) {
    throw new RangeError('Round-up multiple must be a positive whole number of rupees')
  }

  const stepPaise = multipleRupees * 100
  const roundedPaise = Math.ceil(amountPaise / stepPaise) * stepPaise
  return { amountPaise, roundedPaise, roundUpPaise: roundedPaise - amountPaise }
}
