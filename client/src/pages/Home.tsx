import {
  calculateRoundUp,
  formatPaise,
  type PortfolioDTO,
  type TransactionDTO,
  type WalletDTO,
} from '@rupeeround/shared'
import { ArrowRight, Bot, ChartColumnBig, ChevronRight, IndianRupee, Moon, QrCode, Sun } from 'lucide-react'
import { Link } from 'react-router'
import Card from '@/components/Card'
import ProgressBar from '@/components/ProgressBar'
import Reveal from '@/components/Reveal'
import Skeleton, { SkeletonRows } from '@/components/Skeleton'
import StateMessage, { ErrorMessage } from '@/components/StateMessage'
import TransactionRow from '@/components/TransactionRow'
import { useUser } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/cn'
import { dayKey, firstName, formatNav, formatPct, formatRupees2, greeting, initials, todayLabel } from '@/lib/format'
import { useApi } from '@/lib/useApi'

/** Today's round-ups, the fund you're saving towards, and progress to its minimum. */
function SpareChangeCard({ wallet, today }: { wallet: WalletDTO; today: TransactionDTO[] }) {
  const { plan, selectedFund } = wallet
  const todayPaise = today.reduce((sum, transaction) => sum + transaction.roundUpPaise, 0)
  const dayChange = selectedFund?.returns.day ?? null

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-linear-to-br from-(--wallet-from) to-(--wallet-to) p-6 text-white shadow-2xl shadow-black/50">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(120%_80%_at_100%_0%,rgba(255,255,255,0.12),transparent_55%)]"
      />
      <div className="relative">
        <span className="text-[11px] font-medium tracking-[0.16em] whitespace-nowrap text-white/60 uppercase">
          Today's spare change
        </span>
        <p className="mt-3 text-[31px] leading-none font-light tracking-[-0.035em] tabular-nums">{formatRupees2(todayPaise)}</p>
        <p className="mt-2 text-[13px] text-white/55">
          {today.length === 0
            ? 'No payments yet today'
            : `From ${today.length} payment${today.length === 1 ? '' : 's'} today`}
        </p>

        <div className="mt-5 border-t border-white/10 pt-4">
          {selectedFund ? (
            <>
              <Link to={`/funds/${selectedFund.id}`} className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-white/60">Saving towards</span>
                <span className="flex min-w-0 items-center gap-1 text-sm font-semibold">
                  <span className="truncate">{selectedFund.shortName}</span>
                  <ChevronRight className="size-4 shrink-0 text-white/50" />
                </span>
              </Link>
              <p className="mt-1 font-mono text-[11px] text-white/50">
                Live NAV {formatNav(selectedFund.nav)}
                {dayChange !== null && (
                  <span className={dayChange >= 0 ? 'text-gain' : 'text-loss'}> {formatPct(dayChange)} today</span>
                )}
              </p>
              {plan && (
                <div className="mt-4">
                  <div className="flex items-baseline justify-between text-[13px]">
                    <span className="text-white/60">Round-up wallet</span>
                    <span className="font-medium tabular-nums">{formatPaise(wallet.balancePaise)}</span>
                  </div>
                  <ProgressBar value={plan.progress} className="mt-2 h-1.5 bg-white/15" barClassName="bg-white" />
                  <p className="mt-2 text-[12px] text-white/55">
                    {plan.status === 'eligible'
                      ? 'Your wallet covers the demo minimum. Ready to invest.'
                      : `${formatPaise(plan.shortfallPaise)} more to reach the ${formatPaise(selectedFund.minInvestmentPaise)} minimum. Your balance carries forward.`}
                  </p>
                </div>
              )}
            </>
          ) : (
            <Link to="/funds" className="flex items-center justify-between text-sm font-semibold">
              Pick a fund to save towards <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

function ScanPayCard({ multiple }: { multiple: number }) {
  const example = calculateRoundUp(34_00, multiple)
  return (
    <Link
      to="/pay?scan=1"
      className="flex items-center gap-4 rounded-[28px] bg-primary p-5 text-on-primary transition-transform active:scale-[0.99]"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-on-primary/10 px-2 py-0.5 text-[10px] font-semibold tracking-[0.14em] uppercase">
            Scan at shop
          </span>
          <span className="text-[11px] text-on-primary/60">Simulated UPI</span>
        </div>
        <p className="mt-2 text-lg font-semibold tracking-tight">Scan &amp; pay with round-up</p>
        <p className="mt-0.5 text-[13px] text-on-primary/70">
          Pay ₹34 → rounds to {formatPaise(example.roundedPaise)} → {formatPaise(example.roundUpPaise)} saved
        </p>
      </div>
      <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-on-primary text-primary">
        <QrCode className="size-7" />
      </span>
    </Link>
  )
}

function Tile({ to, icon: Icon, title, caption }: { to: string; icon: typeof Bot; title: string; caption: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-4 transition-colors hover:border-line-strong"
    >
      <span className="grid size-10 place-items-center rounded-2xl bg-subtle text-accent">
        <Icon className="size-5" />
      </span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-xs text-muted">{caption}</span>
      </span>
    </Link>
  )
}

export default function Home() {
  const user = useUser()
  const { theme, toggleTheme } = useTheme()
  const wallet = useApi<WalletDTO>('/wallet')
  const transactions = useApi<TransactionDTO[]>('/transactions?limit=50')
  const portfolio = useApi<PortfolioDTO>('/portfolio')

  const todayKey = dayKey(new Date().toISOString())
  const today = (transactions.data ?? []).filter((transaction) => dayKey(transaction.createdAt) === todayKey)
  const recent = (transactions.data ?? []).slice(0, 5)

  return (
    <div className="px-5">
      <header className="pt-safe flex items-start gap-3 pb-4">
        <div className="animate-rise min-w-0 flex-1">
          <p className="eyebrow">{todayLabel()}</p>
          <h1 className="font-display mt-1 text-[25px] text-balance">
            {greeting()}, {firstName(user.name)}
          </h1>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-card text-muted hover:text-ink"
        >
          {theme === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
        </button>
        <Link
          to="/settings"
          aria-label="Settings"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-subtle text-sm font-semibold"
        >
          {initials(user.name)}
        </Link>
      </header>

      <Reveal>
        {wallet.loading || transactions.loading ? (
          <Skeleton className="h-72 rounded-[28px]" />
        ) : wallet.error || !wallet.data ? (
          <ErrorMessage message={wallet.error?.message ?? 'No wallet data'} onRetry={wallet.reload} />
        ) : (
          <SpareChangeCard wallet={wallet.data} today={today} />
        )}
      </Reveal>

      <Reveal delay={60} className="mt-3">
        <ScanPayCard multiple={user.defaultMultiple} />
      </Reveal>

      <Reveal delay={120} className="mt-3 grid grid-cols-2 gap-3">
        {wallet.data && portfolio.data ? (
          <>
            <Card>
              <p className="text-[12px] text-muted">Total invested</p>
              <p className="mt-1 text-[18px] font-light tracking-tight tabular-nums">{formatRupees2(portfolio.data.investedPaise)}</p>
              <p className="mt-1 text-[11px] text-muted">
                {portfolio.data.investments.length} investment{portfolio.data.investments.length === 1 ? '' : 's'} ·{' '}
                {formatPaise(wallet.data.totalRoundUpsPaise)} rounded up
              </p>
            </Card>
            <Card>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] text-muted">Current value</p>
                {portfolio.data.investedPaise > 0 && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold',
                      portfolio.data.gainPaise >= 0 ? 'bg-gain/15 text-gain' : 'bg-loss/15 text-loss',
                    )}
                  >
                    {formatPct(portfolio.data.gainPct * 100)}
                  </span>
                )}
              </div>
              <p className="mt-1 text-[18px] font-light tracking-tight tabular-nums">{formatRupees2(portfolio.data.currentValuePaise)}</p>
              <p className={cn('mt-1 font-mono text-[11px]', portfolio.data.gainPaise >= 0 ? 'text-gain' : 'text-loss')}>
                {portfolio.data.gainPaise >= 0 ? '+' : '−'}
                {formatRupees2(Math.abs(portfolio.data.gainPaise))} {portfolio.data.gainPaise >= 0 ? 'profit' : 'loss'}
              </p>
            </Card>
          </>
        ) : (
          [0, 1].map((index) => <Skeleton key={index} className="h-[112px] rounded-3xl" />)
        )}
      </Reveal>

      <Reveal delay={160} className="mt-3 grid grid-cols-2 gap-3">
        <Tile to="/advisor" icon={Bot} title="Ask the AI advisor" caption="Mutual fund questions" />
        <Tile to="/funds" icon={ChartColumnBig} title="Compare funds" caption="Live NAV & returns" />
      </Reveal>

      <Reveal className="mt-8">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="eyebrow">Recent activity</h2>
          <Link to="/transactions" className="flex items-center gap-1 text-sm font-semibold hover:underline">
            See all <ArrowRight className="size-3.5" />
          </Link>
        </div>
        {transactions.loading ? (
          <div className="mt-3">
            <SkeletonRows count={3} />
          </div>
        ) : transactions.error ? (
          <ErrorMessage message={transactions.error.message} onRetry={transactions.reload} />
        ) : recent.length ? (
          <ul className="divide-y divide-line">
            {recent.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} />
            ))}
          </ul>
        ) : (
          <StateMessage
            icon={IndianRupee}
            title="No payments yet"
            description="Tap Scan to make your first simulated payment and watch the round-up land."
          />
        )}
      </Reveal>
    </div>
  )
}
