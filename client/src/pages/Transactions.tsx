import { type TransactionDTO } from '@rupeeround/shared'
import { IndianRupee, Info } from 'lucide-react'
import { useNavigate } from 'react-router'
import Button from '@/components/Button'
import Card from '@/components/Card'
import Reveal from '@/components/Reveal'
import ScreenHeader from '@/components/ScreenHeader'
import { SkeletonRows } from '@/components/Skeleton'
import StateMessage, { ErrorMessage } from '@/components/StateMessage'
import TransactionRow from '@/components/TransactionRow'
import { dayKey, formatDayLabel, formatRupees2 } from '@/lib/format'
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

/** Every simulated payment and the round-up it saved, newest first. */
export default function Transactions() {
  const navigate = useNavigate()
  const transactions = useApi<TransactionDTO[]>('/transactions?limit=100')
  const list = transactions.data ?? []
  const totalRoundUps = list.reduce((sum, transaction) => sum + transaction.roundUpPaise, 0)
  const roundUpCount = list.filter((transaction) => transaction.roundUpPaise > 0).length

  return (
    <>
      <ScreenHeader
        title="Transactions"
        subtitle="Your last 100 payments"
        right={
          list.length > 0 && <span className="font-mono text-xs text-muted">{roundUpCount} round-ups</span>
        }
      />
      <div className="px-5 pb-6">
        {transactions.loading ? (
          <SkeletonRows count={7} />
        ) : transactions.error ? (
          <ErrorMessage message={transactions.error.message} onRetry={transactions.reload} />
        ) : list.length === 0 ? (
          <StateMessage
            icon={IndianRupee}
            title="No payments yet"
            description="Your simulated payments and their round-ups will show up here."
            action={<Button onClick={() => navigate('/pay?scan=1')}>Scan & pay</Button>}
          />
        ) : (
          <>
            <Reveal>
              <Card className="mb-5 flex items-center justify-between">
                <span className="text-sm text-muted">Total rounded up</span>
                <span className="font-mono text-lg font-semibold text-gain tabular-nums">+{formatRupees2(totalRoundUps)}</span>
              </Card>
            </Reveal>
            {groupByDay(list).map((group, index) => (
              <Reveal key={group.label} delay={Math.min(index, 4) * 40} className="mb-4">
                <h2 className="eyebrow mb-1">{group.label}</h2>
                <Card className="py-0">
                  <ul className="divide-y divide-line">
                    {group.items.map((transaction) => (
                      <TransactionRow key={transaction.id} transaction={transaction} showDay={false} />
                    ))}
                  </ul>
                </Card>
              </Reveal>
            ))}
            <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
              <Info className="size-3.5" /> Simulated transactions · no real money moves
            </p>
          </>
        )}
      </div>
    </>
  )
}
