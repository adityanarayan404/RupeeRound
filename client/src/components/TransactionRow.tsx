import type { TransactionDTO } from '@rupeeround/shared'
import { formatDayLabel, formatPaise, formatRupees2, formatTime } from '@/lib/format'
import { CATEGORY_ICONS } from '@/lib/merchants'

/** Transaction row: shop, when and what was paid, and the round-up saved. */
export default function TransactionRow({ transaction, showDay = true }: { transaction: TransactionDTO; showDay?: boolean }) {
  const Icon = CATEGORY_ICONS[transaction.category]
  const when = showDay
    ? `${formatDayLabel(transaction.createdAt)}, ${formatTime(transaction.createdAt)}`
    : formatTime(transaction.createdAt)

  return (
    <li className="flex items-center gap-3 py-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-subtle text-accent">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{transaction.merchant}</p>
        <p className="truncate font-mono text-[11px] text-muted">
          {when} · Paid {formatPaise(transaction.roundedPaise)}
        </p>
      </div>
      <div className="text-right">
        {transaction.roundUpPaise > 0 ? (
          <>
            <p className="font-mono text-sm font-semibold text-gain tabular-nums">+{formatRupees2(transaction.roundUpPaise)}</p>
            <p className="text-[11px] text-muted">saved</p>
          </>
        ) : (
          <>
            <p className="font-mono text-sm text-muted tabular-nums">{formatRupees2(0)}</p>
            <p className="text-[11px] text-muted">exact amount</p>
          </>
        )}
      </div>
    </li>
  )
}
