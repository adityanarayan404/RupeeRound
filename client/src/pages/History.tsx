import { formatPaise, type TransactionDTO } from '@rupeeround/shared'
import { IndianRupee } from 'lucide-react'
import { useNavigate } from 'react-router'
import Button from '@/components/Button'
import Card from '@/components/Card'
import Screen from '@/components/Screen'
import ScreenHeader from '@/components/ScreenHeader'
import { SkeletonRows } from '@/components/Skeleton'
import StateMessage, { ErrorMessage } from '@/components/StateMessage'
import TransactionRow from '@/components/TransactionRow'
import { dayKey, formatDayLabel } from '@/lib/format'
import { useApi } from '@/lib/useApi'

function groupByDay(transactions: TransactionDTO[]): { label: string; items: TransactionDTO[] }[] {
  const groups = new Map<string, { label: string; items: TransactionDTO[] }>()
  for (const transaction of transactions) {
    const key = dayKey(transaction.createdAt)
    const group = groups.get(key) ?? { label: formatDayLabel(transaction.createdAt), items: [] }
    group.items.push(transaction)
    groups.set(key, group)
  }
  return [...groups.values()]
}

export default function History() {
  const navigate = useNavigate()
  const transactions = useApi<TransactionDTO[]>('/transactions?limit=100')
  const list = transactions.data ?? []
  const totalRoundUps = list.reduce((sum, transaction) => sum + transaction.roundUpPaise, 0)

  return (
    <Screen>
      <ScreenHeader title="History" subtitle="Your last 100 payments" back="/" />
      <div className="px-5 pb-10">
        {transactions.loading ? (
          <SkeletonRows count={7} />
        ) : transactions.error ? (
          <ErrorMessage message={transactions.error.message} onRetry={transactions.reload} />
        ) : list.length === 0 ? (
          <StateMessage
            icon={IndianRupee}
            title="No payments yet"
            description="Your simulated payments and their round-ups will show up here."
            action={<Button onClick={() => navigate('/pay')}>Make a payment</Button>}
          />
        ) : (
          <>
            <Card className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold text-muted">Payments</p>
                <p className="text-xl font-extrabold tabular-nums">{list.length}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted">Rounded up</p>
                <p className="text-xl font-extrabold text-gain tabular-nums">+{formatPaise(totalRoundUps)}</p>
              </div>
            </Card>
            {groupByDay(list).map((group) => (
              <section key={group.label} className="mb-2">
                <h2 className="sticky top-[calc(var(--safe-top)+4.25rem)] z-10 bg-bg/95 py-2 text-xs font-bold tracking-wide text-muted uppercase backdrop-blur">
                  {group.label}
                </h2>
                <ul className="divide-y divide-line">
                  {group.items.map((transaction) => (
                    <TransactionRow key={transaction.id} transaction={transaction} />
                  ))}
                </ul>
              </section>
            ))}
          </>
        )}
      </div>
    </Screen>
  )
}
