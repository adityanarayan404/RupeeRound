export type InvestmentPlan =
  | {
      status: 'eligible'
      /** Amount that will be invested. */
      investPaise: number
      /** What stays in the round-up wallet afterwards. */
      remainingPaise: number
      progress: 1
    }
  | {
      status: 'carry-forward'
      /** How much more is needed to reach the fund minimum. */
      shortfallPaise: number
      /** 0–1, how close the balance is to the minimum. */
      progress: number
    }

/**
 * Carry-forward rule: invest only once the wallet covers the fund minimum,
 * otherwise keep the whole balance for next time.
 *
 * `requestedPaise` defaults to the full balance and must sit between the
 * fund minimum and the wallet balance.
 */
export function planInvestment(
  balancePaise: number,
  minimumPaise: number,
  requestedPaise?: number,
): InvestmentPlan {
  if (balancePaise < minimumPaise) {
    return {
      status: 'carry-forward',
      shortfallPaise: minimumPaise - balancePaise,
      progress: minimumPaise > 0 ? Math.max(0, balancePaise) / minimumPaise : 0,
    }
  }

  const investPaise = requestedPaise ?? balancePaise
  if (!Number.isInteger(investPaise) || investPaise < minimumPaise) {
    throw new RangeError('Investment is below the fund minimum')
  }
  if (investPaise > balancePaise) {
    throw new RangeError('Investment is more than the wallet balance')
  }

  return {
    status: 'eligible',
    investPaise,
    remainingPaise: balancePaise - investPaise,
    progress: 1,
  }
}

/** Mutual-fund units are allotted to 3 decimal places. */
export function unitsFor(amountPaise: number, nav: number): number {
  return Math.floor((amountPaise / 100 / nav) * 1000) / 1000
}

export function valueOfUnitsPaise(units: number, nav: number): number {
  return Math.round(units * nav * 100)
}
