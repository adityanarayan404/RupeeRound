import type { TransactionDTO } from '@rupeeround/shared'
import { formatDayLabel, formatPaise, formatTime } from '@/lib/format'
import { CATEGORY_ICONS } from '@/lib/merchants'

export default function TransactionRow({ transaction, showDay = false }: { transaction: TransactionDTO; showDay?: boolean }) {
  const Icon = CATEGORY_ICONS[transaction.category]
  const when = showDay
    ? `${formatDayLabel(transaction.createdAt)} · ${formatTime(transaction.createdAt)}`
    : formatTime(transaction.createdAt)

  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-subtle text-accent">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{transaction.merchant}</p>
        <p className="text-xs text-muted">
          {when} · paid {formatPaise(transaction.roundedPaise)}
        </p>
      </div>
      <div className="text-right">
        <p className="font-bold tabular-nums">{formatPaise(transaction.amountPaise)}</p>
        <p className={transaction.roundUpPaise > 0 ? 'text-xs font-bold text-gain tabular-nums' : 'text-xs text-muted'}>
          {transaction.roundUpPaise > 0 ? `+${formatPaise(transaction.roundUpPaise)}` : 'no round-up'}
        </p>
      </div>
    </li>
  )
}
