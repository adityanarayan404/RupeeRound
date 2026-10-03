import {
  ADVISOR_DISCLAIMER,
  FUND_CATEGORY_LABELS,
  FUND_CATEGORY_RISK,
  formatPaise,
  type AdvisorResponse,
  type FundSuggestionDTO,
} from '@rupeeround/shared'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { cn } from '@/lib/cn'
import { formatLongDate, formatNav } from '@/lib/format'
import { useApi } from '@/lib/useApi'
import Button from './Button'
import Card from './Card'
import RiskSheet from './RiskSheet'
import Skeleton from './Skeleton'
import { ErrorMessage } from './StateMessage'

function Fact({ label, value, tone }: { label: string; value: string; tone?: 'gain' | 'loss' }) {
  return (
    <div className="rounded-2xl bg-subtle/70 px-3 py-2.5">
      <p className="text-[11px] font-semibold text-muted">{label}</p>
      <p className={cn('text-sm font-bold', tone === 'gain' && 'text-gain', tone === 'loss' && 'text-loss')}>{value}</p>
    </div>
  )
}

function Suggestion({
  suggestion,
  onChangeAnswers,
  onChooseOther,
}: {
  suggestion: FundSuggestionDTO
  onChangeAnswers: () => void
  onChooseOther: () => void
}) {
  const navigate = useNavigate()
  const { fund, metrics, explanation, source, reachableNow, shortfallPaise, alternativeFund } = suggestion
  // The disclaimer is always the last sentence; show it in smaller text.
  const body = explanation.endsWith(ADVISOR_DISCLAIMER)
    ? explanation.slice(0, -ADVISOR_DISCLAIMER.length).trim()
    : explanation

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-muted">Suggested for you</p>
        <span
          className="rounded-full border border-line px-2 py-0.5 text-[11px] font-bold text-muted"
          title={source === 'ai' ? 'Explanation written by AI from the facts below' : 'Explanation from the built-in rules'}
        >
          {source === 'ai' ? 'AI' : 'Rules'}
        </span>
      </div>

      <p className="mt-1 text-xl font-extrabold tracking-tight">{fund.shortName}</p>
      <p className="text-sm text-muted">
        {FUND_CATEGORY_LABELS[suggestion.category]} · {FUND_CATEGORY_RISK[suggestion.category]}
      </p>

      <div className="mt-3 flex items-baseline gap-2">
        <p className="text-2xl font-extrabold tabular-nums">{formatNav(fund.nav)}</p>
        <p className="text-xs font-semibold text-muted">NAV</p>
      </div>
      <p className="text-xs text-muted">
        {fund.navSource === 'demo'
          ? 'Demo NAV: live data from mfapi.in is unavailable right now'
          : `Data from mfapi.in, as of ${formatLongDate(fund.navDate)}`}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Fact
          label="Past year"
          value={
            metrics.return1yPct === null
              ? 'Not enough history'
              : `${metrics.return1yPct >= 0 ? 'Up' : 'Down'} ${Math.abs(metrics.return1yPct).toFixed(1)}%`
          }
          tone={metrics.return1yPct === null ? undefined : metrics.return1yPct >= 0 ? 'gain' : 'loss'}
        />
        <Fact
          label="Biggest drop"
          value={
            metrics.maxDrawdownPct === null
              ? 'Not enough history'
              : `Fell ${metrics.maxDrawdownPct.toFixed(1)}% from a high`
          }
        />
      </div>

      <p className="mt-4 text-sm leading-relaxed">{body}</p>
      <p className="mt-2 text-xs text-muted">{ADVISOR_DISCLAIMER}</p>

      <div className="mt-4">
        {reachableNow ? (
          <Button fullWidth onClick={() => navigate(`/invest/${fund.id}?invest=1`)}>
            Invest in {fund.shortName}
          </Button>
        ) : (
          <div className="rounded-2xl border border-dashed border-line-strong/70 px-4 py-3 text-sm">
            <p className="font-bold">{formatPaise(shortfallPaise)} more to reach this fund's minimum</p>
            {alternativeFund && (
              <p className="mt-1 text-muted">
                <button
                  type="button"
                  onClick={() => navigate(`/invest/${alternativeFund.id}`)}
                  className="font-bold text-primary hover:underline"
                >
                  {alternativeFund.shortName}
                </button>{' '}
                has a lower {formatPaise(alternativeFund.minInvestmentPaise)} minimum you can invest in now.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-sm font-bold">
        <button type="button" onClick={onChooseOther} className="text-primary hover:underline">
          Choose a different fund
        </button>
        <button type="button" onClick={onChangeAnswers} className="text-muted hover:text-ink">
          Change answers
        </button>
      </div>
    </Card>
  )
}

/** Rule-based fund suggestion at the top of the Invest tab. */
export default function SuggestionCard({ onChooseOther }: { onChooseOther: () => void }) {
  const advisor = useApi<AdvisorResponse>('/advisor')
  const [asking, setAsking] = useState(false)

  let content
  if (advisor.loading) {
    content = <Skeleton className="h-[420px] rounded-3xl" />
  } else if (advisor.error || !advisor.data) {
    content = (
      <Card>
        <ErrorMessage message={advisor.error?.message ?? 'No suggestion available'} onRetry={advisor.reload} />
      </Card>
    )
  } else if (advisor.data.needsProfile) {
    content = (
      <Card className="p-5">
        <p className="text-sm font-semibold text-muted">Suggested for you</p>
        <p className="mt-1 text-lg font-extrabold">Not sure which fund to pick?</p>
        <p className="mt-1 text-sm text-muted">
          Answer 3 quick questions and RupeeRound's rules will suggest one of our 3 funds, with a plain-English
          explanation.
        </p>
        <Button className="mt-4" fullWidth onClick={() => setAsking(true)}>
          Answer 3 questions
        </Button>
      </Card>
    )
  } else {
    content = (
      <Suggestion
        suggestion={advisor.data.suggestion}
        onChangeAnswers={() => setAsking(true)}
        onChooseOther={onChooseOther}
      />
    )
  }

  return (
    <>
      {content}
      {asking && <RiskSheet open onClose={() => setAsking(false)} />}
    </>
  )
}
