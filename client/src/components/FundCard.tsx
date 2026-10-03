import { FUND_CATEGORY_LABELS, FUND_CATEGORY_RISK, formatPaise, type FundDTO } from '@rupeeround/shared'
import { Check, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatNav, formatPercent, formatShortDate } from '@/lib/format'
import NavBadge from './NavBadge'
import ProgressBar from './ProgressBar'

interface FundCardProps {
  fund: FundDTO
  /** Wallet balance, to show progress towards this fund's minimum. */
  balancePaise?: number
  selected?: boolean
  onClick?: () => void
  /** "select" shows a radio-style tick instead of a chevron. */
  mode?: 'link' | 'select'
}

export default function FundCard({ fund, balancePaise, selected, onClick, mode = 'link' }: FundCardProps) {
  const progress = balancePaise !== undefined ? balancePaise / fund.minInvestmentPaise : null
  const reached = progress !== null && progress >= 1

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={mode === 'select' ? selected : undefined}
      className={cn(
        'w-full rounded-3xl border bg-card p-4 text-left transition-all hover:border-line-strong active:scale-[0.99]',
        selected ? 'border-primary ring-2 ring-primary/20' : 'border-line',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-tan/60 px-2 py-0.5 text-[11px] font-bold text-primary-strong dark:text-ink">
              {FUND_CATEGORY_LABELS[fund.category]}
            </span>
            <span className="text-[11px] font-medium text-muted">{FUND_CATEGORY_RISK[fund.category]}</span>
            {selected && mode === 'link' && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-on-primary">Your fund</span>
            )}
          </div>
          <p className="truncate font-bold">{fund.shortName}</p>
          <p className="text-xs text-muted">{fund.fundHouse}</p>
        </div>
        {mode === 'select' ? (
          <span
            className={cn(
              'grid size-6 shrink-0 place-items-center rounded-full border-2',
              selected ? 'border-primary bg-primary text-on-primary' : 'border-line-strong',
            )}
          >
            {selected && <Check className="size-3.5" strokeWidth={3} />}
          </span>
        ) : (
          <ChevronRight className="mt-1 size-5 shrink-0 text-muted" />
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-[11px] font-medium text-muted">NAV · {formatShortDate(fund.navDate)}</p>
          <p className="font-bold tabular-nums">{formatNav(fund.nav)}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted">1Y return</p>
          <p
            className={cn(
              'font-bold tabular-nums',
              fund.return1y === null ? 'text-muted' : fund.return1y >= 0 ? 'text-gain' : 'text-loss',
            )}
          >
            {fund.return1y === null ? '—' : formatPercent(fund.return1y, true)}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted">Min (demo)</p>
          <p className="font-bold tabular-nums">{formatPaise(fund.minInvestmentPaise)}</p>
        </div>
      </div>

      {progress !== null && (
        <div className="mt-3">
          <ProgressBar value={progress} barClassName={reached ? 'bg-gain' : undefined} />
          <p className="mt-1.5 text-xs font-medium text-muted">
            {reached
              ? 'Your wallet covers the minimum: ready to invest'
              : `${formatPaise(fund.minInvestmentPaise - (balancePaise ?? 0))} more to reach the minimum`}
          </p>
        </div>
      )}
      <div className="mt-2">
        <NavBadge source={fund.navSource} />
      </div>
    </button>
  )
}
