import { formatPaise, type GoalsResponse, type PortfolioDTO, type TransactionDTO, type WalletDTO } from '@rupeeround/shared'
import {
  ArrowRight,
  ChevronRight,
  History as HistoryIcon,
  IndianRupee,
  Moon,
  Sun,
  Target,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router'
import ProgressBar from '@/components/ProgressBar'
import ProgressRing from '@/components/ProgressRing'
import Skeleton, { SkeletonRows } from '@/components/Skeleton'
import StateMessage, { ErrorMessage } from '@/components/StateMessage'
import TransactionRow from '@/components/TransactionRow'
import { useUser } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/cn'
import { firstName, formatPercent, greeting, initials } from '@/lib/format'
import { useApi } from '@/lib/useApi'

function WalletCard({ wallet }: { wallet: WalletDTO }) {
  const { plan, selectedFund } = wallet

  return (
    <div className="relative overflow-hidden rounded-[28px] bg-linear-to-br from-(--wallet-from) to-(--wallet-to) p-5 text-[#FBF8F1] shadow-xl shadow-[#56443E]/25">
      <div aria-hidden className="absolute -top-16 -right-12 size-48 rounded-full bg-white/10" />
      <div aria-hidden className="absolute -right-6 -bottom-20 size-40 rounded-full bg-white/5" />
      <div className="relative">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#FBF8F1]/85">
          <Wallet className="size-4" /> Round-up wallet
        </div>
        <p className="mt-1 text-[42px] leading-tight font-extrabold tracking-tight tabular-nums">
          {formatPaise(wallet.balancePaise)}
        </p>

        {selectedFund && plan ? (
          plan.status === 'eligible' ? (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-white/15 p-3">
              <p className="text-sm font-semibold">Ready to invest in {selectedFund.shortName}</p>
              <Link
                to={`/invest/${selectedFund.id}`}
                className="shrink-0 rounded-xl bg-[#FBF8F1] px-3 py-2 text-sm font-bold text-[#56443E]"
              >
                Invest now
              </Link>
            </div>
          ) : (
            <div className="mt-3">
              <ProgressBar value={plan.progress} className="h-2.5 bg-white/20" barClassName="bg-[#F1F0E2]" />
              <p className="mt-2 text-sm text-[#FBF8F1]/90">
                <span className="font-bold">{formatPaise(plan.shortfallPaise)}</span> more to reach the{' '}
                {formatPaise(selectedFund.minInvestmentPaise)} minimum for {selectedFund.shortName}. Your balance
                carries forward.
              </p>
            </div>
          )
        ) : (
          <Link to="/invest" className="mt-3 inline-flex items-center gap-1 text-sm font-bold underline-offset-2 hover:underline">
            Pick a fund to start investing <ArrowRight className="size-4" />
          </Link>
        )}
      </div>
    </div>
  )
}

function HubTile({ to, icon: Icon, title, caption, primary }: { to: string; icon: LucideIcon; title: string; caption: string; primary?: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        'flex flex-col gap-3 rounded-3xl border p-4 transition-all active:scale-[0.98]',
        primary ? 'border-transparent bg-primary text-on-primary shadow-lg shadow-primary/25' : 'border-line bg-card hover:border-line-strong',
      )}
    >
      <span className={cn('grid size-10 place-items-center rounded-2xl', primary ? 'bg-white/20' : 'bg-subtle text-accent')}>
        <Icon className="size-5" />
      </span>
      <span>
        <span className="block font-bold">{title}</span>
        <span className={cn('block text-xs', primary ? 'text-on-primary/80' : 'text-muted')}>{caption}</span>
      </span>
    </Link>
  )
}

function Stat({ label, value, tone, title }: { label: string; value: string; tone?: 'gain' | 'loss'; title?: string }) {
  return (
    <div title={title} className="min-w-0 rounded-2xl border border-line bg-card px-3 py-2.5">
      <p className="truncate text-[11px] font-semibold text-muted">{label}</p>
      <p className={cn('truncate font-extrabold tabular-nums', tone === 'gain' && 'text-gain', tone === 'loss' && 'text-loss')}>
        {value}
      </p>
    </div>
  )
}

export default function Home() {
  const user = useUser()
  const { theme, toggleTheme } = useTheme()
  const wallet = useApi<WalletDTO>('/wallet')
  const transactions = useApi<TransactionDTO[]>('/transactions?limit=5')
  const portfolio = useApi<PortfolioDTO>('/portfolio')
  const goals = useApi<GoalsResponse>('/goals')

  const nextGoal =
    goals.data?.goals.find((goal) => goal.savedPaise < goal.targetPaise) ?? goals.data?.goals[0] ?? null

  return (
    <div className="px-5">
      <header className="pt-safe flex items-center gap-3 pb-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted">{greeting()},</p>
          <h1 className="truncate text-2xl font-extrabold tracking-tight">{firstName(user.name)}</h1>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="grid size-11 place-items-center rounded-full border border-line bg-card text-muted hover:text-ink"
        >
          {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </button>
        <Link
          to="/profile"
          aria-label="Profile"
          className="grid size-11 place-items-center rounded-full bg-tan font-extrabold text-primary-strong dark:text-ink"
        >
          {initials(user.name)}
        </Link>
      </header>

      {wallet.loading ? (
        <Skeleton className="h-48 rounded-[28px]" />
      ) : wallet.error || !wallet.data ? (
        <ErrorMessage message={wallet.error?.message ?? 'No wallet data'} onRetry={wallet.reload} />
      ) : (
        <WalletCard wallet={wallet.data} />
      )}

      <div className="mt-3 grid grid-cols-3 gap-2">
        {wallet.data && portfolio.data ? (
          <>
            <Stat label="Round-ups" value={formatPaise(wallet.data.totalRoundUpsPaise)} />
            <Stat label="Invested" value={formatPaise(wallet.data.totalInvestedPaise)} />
            <Stat
              label="Portfolio"
              value={formatPaise(portfolio.data.currentValuePaise)}
              title={portfolio.data.investedPaise ? `${formatPercent(portfolio.data.gainPct, true)} overall` : undefined}
              tone={portfolio.data.investedPaise ? (portfolio.data.gainPaise >= 0 ? 'gain' : 'loss') : undefined}
            />
          </>
        ) : (
          [0, 1, 2].map((index) => <Skeleton key={index} className="h-[58px] rounded-2xl" />)
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <HubTile to="/pay" icon={IndianRupee} title="Pay & round up" caption="Simulated merchant payment" primary />
        <HubTile to="/invest" icon={TrendingUp} title="Invest" caption="Large · Mid · Small Cap" />
        <HubTile to="/goals" icon={Target} title="Goals" caption="Track what you're saving for" />
        <HubTile to="/history" icon={HistoryIcon} title="History" caption="Every payment and round-up" />
      </div>

      {nextGoal && goals.data && (
        <Link
          to="/goals"
          className="mt-5 flex items-center gap-4 rounded-3xl border border-line bg-card p-4 transition-colors hover:border-line-strong"
        >
          <ProgressRing value={goals.data.savedPaise / nextGoal.targetPaise} size={56} stroke={6} complete={goals.data.savedPaise >= nextGoal.targetPaise}>
            <span className="text-xl">{nextGoal.emoji}</span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted">Next goal</p>
            <p className="truncate font-bold">{nextGoal.title}</p>
            <p className="text-sm text-muted tabular-nums">
              {formatPaise(Math.min(goals.data.savedPaise, nextGoal.targetPaise))} / {formatPaise(nextGoal.targetPaise)}
            </p>
          </div>
          <ChevronRight className="size-5 text-muted" />
        </Link>
      )}

      <section className="mt-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-bold">Recent round-ups</h2>
          <Link to="/history" className="text-sm font-bold text-primary hover:underline">
            See all
          </Link>
        </div>
        {transactions.loading ? (
          <div className="mt-3">
            <SkeletonRows count={3} />
          </div>
        ) : transactions.error ? (
          <ErrorMessage message={transactions.error.message} onRetry={transactions.reload} />
        ) : transactions.data?.length ? (
          <ul className="divide-y divide-line">
            {transactions.data.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} showDay />
            ))}
          </ul>
        ) : (
          <StateMessage
            icon={IndianRupee}
            title="No payments yet"
            description="Tap Pay to make your first simulated payment and watch the round-up land."
          />
        )}
      </section>
    </div>
  )
}
