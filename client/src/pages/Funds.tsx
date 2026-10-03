import {
  FUND_CATEGORY_LABELS,
  FUND_CATEGORY_RISK,
  formatPaise,
  type FundDTO,
  type FundReturns,
  type UserDTO,
  type WalletDTO,
} from '@rupeeround/shared'
import { Bot, Check, ChevronRight, Info, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import Button from '@/components/Button'
import Card from '@/components/Card'
import NavBadge from '@/components/NavBadge'
import ProgressBar from '@/components/ProgressBar'
import ReturnsGrid from '@/components/ReturnsGrid'
import Reveal from '@/components/Reveal'
import ScreenHeader from '@/components/ScreenHeader'
import Skeleton from '@/components/Skeleton'
import SuggestionCard from '@/components/SuggestionCard'
import { ErrorMessage } from '@/components/StateMessage'
import { useAuth, useUser } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { api, errorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatLongDate, formatNav, formatPct } from '@/lib/format'
import { invalidate, invalidateMoney, useApi } from '@/lib/useApi'

type SortKey = keyof Pick<FundReturns, 'year1' | 'month1' | 'year3' | 'day'>

// Sorting is by plain numbers only: no scores, no "best" fund.
const SORTS: { key: SortKey; label: string; heroLabel: string }[] = [
  { key: 'year1', label: '1Y return', heroLabel: 'Highest 1-year return' },
  { key: 'month1', label: '1M return', heroLabel: 'Highest 1-month return' },
  { key: 'year3', label: '3Y return', heroLabel: 'Highest 3-year return' },
  { key: 'day', label: 'Today', heroLabel: 'Biggest move up today' },
]

function sorted(funds: FundDTO[], key: SortKey): FundDTO[] {
  return [...funds].sort((a, b) => (b.returns[key] ?? -Infinity) - (a.returns[key] ?? -Infinity))
}

function FundCompareCard({
  fund,
  rank,
  balancePaise,
  selected,
}: {
  fund: FundDTO
  rank: number
  balancePaise: number | undefined
  selected: boolean
}) {
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const day = fund.returns.day
  const progress = balancePaise !== undefined ? balancePaise / fund.minInvestmentPaise : null

  async function saveTowards() {
    setBusy(true)
    try {
      setUser(await api<UserDTO>('/me', { method: 'PATCH', body: { selectedFundId: fund.id } }))
      invalidateMoney()
      toast({ title: `Now saving towards ${fund.shortName}`, tone: 'success' })
    } catch (caught) {
      toast({ title: errorMessage(caught), tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className={cn('p-5', selected && 'border-line-strong ring-1 ring-ink/10')}>
      <button type="button" onClick={() => navigate(`/funds/${fund.id}`)} className="block w-full text-left">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-subtle px-1.5 py-0.5 font-mono text-[11px] text-muted">#{rank}</span>
          <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-medium">
            {FUND_CATEGORY_LABELS[fund.category]}
          </span>
          {selected && (
            <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-on-primary">
              <Check className="size-3" strokeWidth={3} /> Your fund
            </span>
          )}
          <ChevronRight className="ml-auto size-4 text-muted" />
        </div>
        <p className="mt-2 font-semibold">{fund.shortName}</p>
        <p className="text-xs text-muted">
          {fund.fundHouse} · {FUND_CATEGORY_RISK[fund.category]}
        </p>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.12em] text-muted uppercase">Live NAV</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[21px] leading-none font-light tracking-tight tabular-nums">{formatNav(fund.nav)}</span>
              {day !== null && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 font-mono text-[11px] font-semibold',
                    day >= 0 ? 'bg-gain/15 text-gain' : 'bg-loss/15 text-loss',
                  )}
                >
                  {formatPct(day)}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] tracking-[0.12em] text-muted uppercase">Last updated</p>
            <p className="mt-1 font-mono text-[12px]">{formatLongDate(fund.navDate)}</p>
          </div>
        </div>
      </button>

      <div className="mt-4">
        <ReturnsGrid returns={fund.returns} />
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between text-[12px]">
          <span className="text-muted">Demo minimum</span>
          <span className="font-mono">{formatPaise(fund.minInvestmentPaise)}</span>
        </div>
        {progress !== null && (
          <>
            <ProgressBar className="mt-2 h-1.5" value={progress} barClassName={progress >= 1 ? 'bg-gain' : 'bg-ink'} />
            <p className="mt-1.5 text-[11px] text-muted">
              {progress >= 1
                ? 'Your wallet covers the minimum'
                : `${formatPaise(fund.minInvestmentPaise - (balancePaise ?? 0))} more in your wallet to invest`}
            </p>
          </>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {selected ? (
          <Button variant="secondary" disabled icon={<Check className="size-4" />}>
            Saving here
          </Button>
        ) : (
          <Button loading={busy} onClick={saveTowards}>
            Switch to this
          </Button>
        )}
        <Button
          variant="outline"
          icon={<Bot className="size-4" />}
          onClick={() =>
            navigate('/advisor', {
              state: { draft: `Explain ${fund.shortName} in simple words. How has it done, and what are the risks?` },
            })
          }
        >
          Ask AI
        </Button>
      </div>
    </Card>
  )
}

/** Side-by-side comparison of the 3 funds, sorted by real NAV returns. */
export default function Funds() {
  const user = useUser()
  const funds = useApi<FundDTO[]>('/funds')
  const wallet = useApi<WalletDTO>('/wallet')
  const [sort, setSort] = useState<SortKey>('year1')
  const list = funds.data ? sorted(funds.data, sort) : []
  const leader = list[0]
  const sortInfo = SORTS.find((option) => option.key === sort)!

  return (
    <>
      <ScreenHeader
        title="Compare funds"
        subtitle="Live NAV · real returns from mfapi.in"
        back="/"
        right={
          <button
            type="button"
            onClick={() => invalidate('/funds', '/wallet')}
            aria-label="Refresh"
            className="grid size-10 place-items-center rounded-full border border-line bg-card text-muted hover:text-ink"
          >
            <RefreshCw className="size-4" />
          </button>
        }
      />
      <div className="space-y-4 px-5">
        <Reveal>
          <SuggestionCard
            onChooseOther={() => document.getElementById('fund-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          />
        </Reveal>
        {funds.loading ? (
          <>
            <Skeleton className="h-36 rounded-[28px]" />
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-80 rounded-3xl" />
            ))}
          </>
        ) : funds.error ? (
          <ErrorMessage message={funds.error.message} onRetry={funds.reload} />
        ) : (
          <>
            {leader && (
              <Reveal>
                <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-linear-to-br from-(--wallet-from) to-(--wallet-to) p-5 text-white shadow-2xl shadow-black/40">
                  <p className="text-[11px] font-medium tracking-[0.16em] text-white/60 uppercase">{sortInfo.heroLabel}</p>
                  <p className="font-display mt-2 text-[18px]">{leader.shortName}</p>
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] tracking-[0.12em] text-white/50 uppercase">{sortInfo.label}</p>
                      <p className={cn('font-mono text-lg', (leader.returns[sort] ?? 0) >= 0 ? 'text-gain' : 'text-loss')}>
                        {formatPct(leader.returns[sort])}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] tracking-[0.12em] text-white/50 uppercase">Category</p>
                      <p className="text-lg font-light">{FUND_CATEGORY_LABELS[leader.category]}</p>
                    </div>
                    <div>
                      <p className="text-[10px] tracking-[0.12em] text-white/50 uppercase">Live NAV</p>
                      <p className="font-mono text-lg">{formatNav(leader.nav)}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] text-white/45">Past performance does not decide future returns.</p>
                </div>
              </Reveal>
            )}

            <div
              id="fund-list"
              className="no-scrollbar -mx-5 flex scroll-mt-28 gap-2 overflow-x-auto px-5"
              role="tablist"
              aria-label="Sort funds by"
            >
              {SORTS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  role="tab"
                  aria-selected={sort === option.key}
                  onClick={() => setSort(option.key)}
                  className={cn(
                    'shrink-0 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors',
                    sort === option.key ? 'border-primary bg-primary text-on-primary' : 'border-line bg-card hover:bg-subtle',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {list.map((fund, index) => (
              <Reveal key={fund.id} delay={index * 70}>
                <FundCompareCard
                  fund={fund}
                  rank={index + 1}
                  balancePaise={wallet.data?.balancePaise}
                  selected={fund.id === user.selectedFundId}
                />
              </Reveal>
            ))}

            {leader && (
              <div className="flex items-center justify-center">
                <NavBadge source={leader.navSource} />
              </div>
            )}
            <p className="flex gap-2 pb-2 text-xs text-muted">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              Ranked only by the NAV change you pick. Minimums are demo values and investing is simulated.
            </p>
          </>
        )}
      </div>
    </>
  )
}
