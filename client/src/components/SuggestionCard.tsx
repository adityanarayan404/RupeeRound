import {
  ADVISOR_DISCLAIMER,
  FUND_CATEGORY_LABELS,
  FUND_CATEGORY_RISK,
  formatPaise,
  type AdvisorResponse,
  type FundSuggestionDTO,
} from '@rupeeround/shared'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useUser } from '@/context/AuthContext'
import { cn } from '@/lib/cn'
import { formatLongDate, formatNav } from '@/lib/format'
import { useApi } from '@/lib/useApi'
import Button from './Button'
import Card from './Card'
import RiskSheet, { describeRiskProfile } from './RiskSheet'
import Skeleton from './Skeleton'
import { ErrorMessage } from './StateMessage'

function Fact({ label, value, tone }: { label: string; value: string; tone?: 'gain' | 'loss' }) {
  return (
    <div className="rounded-2xl bg-subtle/70 px-3 py-2.5">
      <p className="text-[11px] font-semibold text-muted">{label}</p>
      <p className={cn('text-sm font-semibold', tone === 'gain' && 'text-gain', tone === 'loss' && 'text-loss')}>{value}</p>
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
  const user = useUser()
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
          className="rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold text-muted"
          title={source === 'ai' ? 'Explanation written by AI from the facts below' : 'Explanation from the built-in rules'}
        >
          {source === 'ai' ? 'AI' : 'Rules'}
        </span>
      </div>

      <p className="font-display mt-1 text-[23px]">{fund.shortName}</p>
      <p className="text-sm text-muted">
        {FUND_CATEGORY_LABELS[suggestion.category]} · {FUND_CATEGORY_RISK[suggestion.category]}
      </p>
      <p className="mt-2 rounded-xl bg-subtle/70 px-3 py-2 text-[12px] text-muted">
        Your answers: <span className="text-ink">{describeRiskProfile(user)}</span> (score {suggestion.riskScore} of 6)
      </p>

      <div className="mt-3 flex items-baseline gap-2">
        <p className="text-[18px] leading-none font-light tracking-tight tabular-nums">{formatNav(fund.nav)}</p>
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
          <Button fullWidth onClick={() => navigate(`/funds/${fund.id}?invest=1`)}>
            Invest in {fund.shortName}
          </Button>
        ) : (
          <div className="rounded-2xl border border-dashed border-line-strong/70 px-4 py-3 text-sm">
            <p className="font-semibold">{formatPaise(shortfallPaise)} more to reach this fund's minimum</p>
            {alternativeFund && (
              <p className="mt-1 text-muted">
                <button
                  type="button"
                  onClick={() => navigate(`/funds/${alternativeFund.id}`)}
                  className="font-semibold text-primary hover:underline"
                >
                  {alternativeFund.shortName}
                </button>{' '}
                has a lower {formatPaise(alternativeFund.minInvestmentPaise)} minimum you can invest in now.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" className="h-10" onClick={onChangeAnswers}>
          Change answers
        </Button>
        <Button variant="secondary" size="sm" className="h-10" onClick={onChooseOther}>
          Compare all funds
        </Button>
      </div>
      <Link to="/advisor" className="mt-3 block text-center text-[13px] text-muted hover:text-ink">
        Have a question? <span className="font-semibold text-ink underline-offset-2 hover:underline">Ask the AI advisor</span>
      </Link>
    </Card>
  )
}

/** Rule-based fund suggestion at the top of the Compare funds page. */
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
        <p className="font-display mt-1 text-[18px]">Not sure which fund to pick?</p>
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
