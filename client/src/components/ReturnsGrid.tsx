import type { FundReturns } from '@rupeeround/shared'
import { cn } from '@/lib/cn'
import { formatPct } from '@/lib/format'

const PERIODS: { key: keyof FundReturns; label: string }[] = [
  { key: 'month1', label: '1M' },
  { key: 'month3', label: '3M' },
  { key: 'year1', label: '1Y' },
  { key: 'year3', label: '3Y' },
]

/** 1M / 3M / 1Y / 3Y NAV changes in a compact 4-column strip. */
export default function ReturnsGrid({ returns }: { returns: FundReturns }) {
  return (
    <div className="grid grid-cols-4 overflow-hidden rounded-2xl bg-subtle/70">
      {PERIODS.map(({ key, label }, index) => {
        const value = returns[key]
        return (
          <div key={key} className={cn('px-2 py-2.5 text-center', index > 0 && 'border-l border-line')}>
            <p className="text-[10px] tracking-[0.12em] text-muted">{label}</p>
            <p
              className={cn(
                'mt-0.5 font-mono text-[12px] font-semibold tabular-nums',
                value === null ? 'text-muted' : value >= 0 ? 'text-gain' : 'text-loss',
              )}
            >
              {formatPct(value)}
            </p>
          </div>
        )
      })}
    </div>
  )
}
