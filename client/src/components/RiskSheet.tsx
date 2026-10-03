import {
  FUND_CATEGORY_LABELS,
  type AdvisorResponse,
  type DropReaction,
  type IncomeType,
  type RiskHorizon,
  type UserDTO,
} from '@rupeeround/shared'
import { useState } from 'react'
import { useAuth, useUser } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { api, errorMessage } from '@/lib/api'
import { invalidate, peekCache } from '@/lib/useApi'
import Button from './Button'
import ChoiceChips from './ChoiceChips'
import Sheet from './Sheet'

const HORIZONS: { value: RiskHorizon; label: string }[] = [
  { value: 'lt1y', label: 'Within a year' },
  { value: '1to3y', label: '1 to 3 years' },
  { value: 'gt3y', label: 'After 3 years' },
]

const DROP_REACTIONS: { value: DropReaction; label: string }[] = [
  { value: 'sell', label: 'Sell' },
  { value: 'wait', label: 'Wait it out' },
  { value: 'buyMore', label: 'Buy more' },
]

const INCOMES: { value: IncomeType; label: string }[] = [
  { value: 'steady', label: 'Steady' },
  { value: 'irregular', label: 'Irregular' },
]

/** Short labels for showing saved answers, e.g. on the Profile screen. */
export function describeRiskProfile(user: UserDTO): string {
  if (!user.riskProfile) return 'Not answered yet'
  const { horizon, dropReaction, income } = user.riskProfile
  return [
    HORIZONS.find((option) => option.value === horizon)?.label,
    DROP_REACTIONS.find((option) => option.value === dropReaction)?.label,
    INCOMES.find((option) => option.value === income)?.label,
  ].join(' · ')
}

/** The 3 risk questions behind the fund suggestion. */
export default function RiskSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useUser()
  const { setUser } = useAuth()
  const toast = useToast()
  const [horizon, setHorizon] = useState<RiskHorizon | null>(user.riskProfile?.horizon ?? null)
  const [dropReaction, setDropReaction] = useState<DropReaction | null>(user.riskProfile?.dropReaction ?? null)
  const [income, setIncome] = useState<IncomeType | null>(user.riskProfile?.income ?? null)
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!horizon || !dropReaction || !income) return
    setBusy(true)
    // Remember the category we showed before, so we can say whether it changed.
    const before = peekCache<AdvisorResponse>('/advisor')
    const previousCategory = before && !before.needsProfile ? before.suggestion.category : null
    try {
      const updated = await api<UserDTO>('/me/risk-profile', {
        method: 'PATCH',
        body: { horizon, dropReaction, income },
      })
      setUser(updated)
      // Fresh suggestion for the new answers (also refreshes any open SuggestionCard).
      invalidate('/advisor')
      const after = await api<AdvisorResponse>('/advisor').catch(() => null)
      if (after && !after.needsProfile && after.suggestion.category === previousCategory) {
        toast({
          title: 'Suggestion updated',
          description: `Your answers still point to ${FUND_CATEGORY_LABELS[after.suggestion.category]}`,
          tone: 'info',
        })
      } else {
        toast({
          title: 'Suggestion updated',
          description: after && !after.needsProfile ? `Now suggesting ${after.suggestion.fund.shortName}` : undefined,
          tone: 'success',
        })
      }
      onClose()
    } catch (caught) {
      toast({ title: errorMessage(caught), tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={() => !busy && onClose()} title="3 quick questions">
      <p className="-mt-2 mb-5 text-sm text-muted">
        Your answers decide which of our 3 funds fits you. There are no right or wrong answers.
      </p>
      <div className="space-y-5">
        <ChoiceChips legend="When might you need this money?" options={HORIZONS} value={horizon} onChange={setHorizon} />
        <ChoiceChips
          legend="If your investment fell 20% in a month, you would…"
          options={DROP_REACTIONS}
          value={dropReaction}
          onChange={setDropReaction}
        />
        <ChoiceChips legend="Your income or pocket money is…" options={INCOMES} value={income} onChange={setIncome} />
      </div>
      <Button
        className="mt-6"
        size="lg"
        fullWidth
        loading={busy}
        disabled={!horizon || !dropReaction || !income}
        onClick={save}
      >
        See my suggestion
      </Button>
    </Sheet>
  )
}
