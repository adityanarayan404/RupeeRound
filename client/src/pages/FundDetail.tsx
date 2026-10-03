import {
  FUND_CATEGORY_LABELS,
  FUND_CATEGORY_RISK,
  MAX_TOPUP_PAISE,
  formatPaise,
  parseRupeesInput,
  planInvestment,
  unitsFor,
  type FundDTO,
  type InvestResponse,
  type NavHistoryResponse,
  type PortfolioDTO,
  type UserDTO,
  type WalletDTO,
} from '@rupeeround/shared'
import { Check, Info, Plus, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Button from '@/components/Button'
import Card from '@/components/Card'
import Confetti from '@/components/Confetti'
import NavBadge from '@/components/NavBadge'
import ProgressBar from '@/components/ProgressBar'
import Reveal from '@/components/Reveal'
import Screen from '@/components/Screen'
import ScreenHeader from '@/components/ScreenHeader'
import Sheet from '@/components/Sheet'
import Skeleton from '@/components/Skeleton'
import StateMessage, { ErrorMessage } from '@/components/StateMessage'
import SuccessCheck from '@/components/SuccessCheck'
import TextField from '@/components/TextField'
import { useAuth, useUser } from '@/context/AuthContext'
import { useChartColors } from '@/context/ThemeContext'
import { useToast } from '@/context/ToastContext'
import { api, errorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatNav, formatPercent, formatShortDate, sanitizeAmountInput } from '@/lib/format'
import { invalidateMoney, useApi } from '@/lib/useApi'

type Range = '1m' | '6m' | '1y'
const RANGES: { value: Range; label: string }[] = [
  { value: '1m', label: '1M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
]

function NavChart({ fundId }: { fundId: string }) {
  const colors = useChartColors()
  const [range, setRange] = useState<Range>('6m')
  const history = useApi<NavHistoryResponse>(`/funds/${fundId}/nav-history?range=${range}`)
  const points = history.data?.points ?? []
  const first = points[0]
  const last = points[points.length - 1]
  const change = first && last ? last.nav / first.nav - 1 : null

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-muted">
          NAV change{' '}
          {change !== null && (
            <span className={cn('font-semibold', change >= 0 ? 'text-gain' : 'text-loss')}>{formatPercent(change, true)}</span>
          )}
        </p>
        <div className="flex rounded-xl bg-subtle p-1" role="tablist" aria-label="Chart range">
          {RANGES.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={range === option.value}
              onClick={() => setRange(option.value)}
              className={cn(
                'rounded-lg px-3 py-1 text-xs font-semibold transition-colors',
                range === option.value ? 'bg-card text-ink shadow-sm' : 'text-muted',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-44">
        {history.loading ? (
          <Skeleton className="h-full rounded-2xl" />
        ) : history.error ? (
          <ErrorMessage message={history.error.message} onRetry={history.reload} />
        ) : points.length < 2 ? (
          <StateMessage title="No NAV history yet" description="Live data from mfapi.in hasn't loaded. The saved NAV is shown above." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="nav-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={colors.fill} stopOpacity={0.16} />
                  <stop offset="1" stopColor={colors.fill} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={(value) => formatShortDate(String(value))}
                tick={{ fill: colors.text, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis domain={['dataMin', 'dataMax']} hide />
              <Tooltip
                cursor={{ stroke: colors.grid }}
                labelStyle={{ color: colors.text }} itemStyle={{ color: colors.ink }} contentStyle={{ background: colors.tooltipBg, border: `1px solid ${colors.grid}`, borderRadius: 12, fontSize: 12 }}
                labelFormatter={(label) => formatShortDate(String(label))}
                formatter={(value) => [formatNav(Number(value)), 'NAV']}
              />
              <Area type="monotone" dataKey="nav" stroke={colors.line} strokeWidth={2.5} fill="url(#nav-fill)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  )
}

function InvestSheet({ fund, wallet, open, onClose }: { fund: FundDTO; wallet: WalletDTO; open: boolean; onClose: () => void }) {
  const toast = useToast()
  const [amountInput, setAmountInput] = useState(() => String(wallet.balancePaise / 100))
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<InvestResponse | null>(null)

  const amountPaise = parseRupeesInput(amountInput)
  let plan: ReturnType<typeof planInvestment> | null = null
  let problem: string | null = null
  try {
    plan = amountPaise ? planInvestment(wallet.balancePaise, fund.minInvestmentPaise, amountPaise) : null
  } catch (error) {
    problem = (error as Error).message
  }

  async function invest() {
    if (plan?.status !== 'eligible') return
    setBusy(true)
    try {
      const response = await api<InvestResponse>('/investments', {
        method: 'POST',
        body: { fundId: fund.id, amountPaise: plan.investPaise },
      })
      invalidateMoney()
      setDone(response)
    } catch (caught) {
      toast({ title: errorMessage(caught), tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  function close() {
    if (busy) return
    setDone(null)
    onClose()
  }

  if (done) {
    return (
      <Sheet open={open} onClose={close}>
        <Confetti />
        <div className="flex flex-col items-center py-4 text-center">
          <SuccessCheck size={84} />
          <p className="mt-5 text-2xl font-semibold">Invested {formatPaise(done.investment.amountPaise)}</p>
          <p className="mt-1 text-muted">
            {done.investment.units.toFixed(3)} units of {fund.shortName} at {formatNav(done.investment.nav)}
          </p>
          <p className="mt-4 rounded-2xl bg-subtle px-4 py-2 text-sm text-muted">
            {formatPaise(done.wallet.balancePaise)} stays in your round-up wallet
          </p>
          <Button className="mt-6" size="lg" fullWidth onClick={close}>
            Done
          </Button>
        </div>
      </Sheet>
    )
  }

  const chips = [
    { label: `Minimum ${formatPaise(fund.minInvestmentPaise)}`, paise: fund.minInvestmentPaise },
    { label: `All ${formatPaise(wallet.balancePaise)}`, paise: wallet.balancePaise },
  ]

  return (
    <Sheet open={open} onClose={close} title={`Invest in ${fund.shortName}`}>
      <div className="mb-4 flex gap-2">
        {chips.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => setAmountInput(String(chip.paise / 100))}
            className={cn(
              'rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors',
              amountPaise === chip.paise ? 'border-primary bg-primary text-on-primary' : 'border-line bg-card hover:bg-subtle',
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>
      <TextField
        label="Amount to invest"
        prefix="₹"
        value={amountInput}
        onChange={(event) => setAmountInput(sanitizeAmountInput(event.target.value))}
        inputMode="decimal"
        error={problem}
      />
      {plan?.status === 'eligible' && (
        <div className="mt-4 space-y-2 rounded-2xl bg-subtle/70 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Invest</span>
            <span className="font-semibold tabular-nums">{formatPaise(plan.investPaise)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Stays in wallet</span>
            <span className="font-semibold tabular-nums">{formatPaise(plan.remainingPaise)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Units at {formatNav(fund.nav)}</span>
            <span className="font-semibold tabular-nums">≈ {unitsFor(plan.investPaise, fund.nav).toFixed(3)}</span>
          </div>
        </div>
      )}
      <Button className="mt-5" size="lg" fullWidth loading={busy} disabled={plan?.status !== 'eligible'} onClick={invest}>
        Confirm simulated investment
      </Button>
    </Sheet>
  )
}

function TopUpSheet({ shortfallPaise, open, onClose }: { shortfallPaise: number; open: boolean; onClose: () => void }) {
  const toast = useToast()
  const [amountInput, setAmountInput] = useState(() => String(Math.ceil(shortfallPaise / 100)))
  const [busy, setBusy] = useState(false)
  const amountPaise = parseRupeesInput(amountInput)
  const tooLarge = amountPaise !== null && amountPaise > MAX_TOPUP_PAISE

  async function topUp() {
    if (!amountPaise || tooLarge) return
    setBusy(true)
    try {
      await api<WalletDTO>('/wallet/topup', { method: 'POST', body: { amountPaise } })
      invalidateMoney()
      toast({ title: `${formatPaise(amountPaise)} added to your wallet`, tone: 'success' })
      onClose()
    } catch (caught) {
      toast({ title: errorMessage(caught), tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={() => !busy && onClose()} title="Add money">
      <p className="-mt-2 mb-4 text-sm text-muted">
        Top up your wallet to reach the minimum now instead of waiting for more round-ups. Simulated, so no real
        money is charged.
      </p>
      <TextField
        label="Amount"
        prefix="₹"
        value={amountInput}
        onChange={(event) => setAmountInput(sanitizeAmountInput(event.target.value))}
        inputMode="decimal"
        error={tooLarge ? 'Top-ups are capped at ₹50,000' : null}
        hint={`You need ${formatPaise(shortfallPaise)} more to reach the minimum.`}
      />
      <Button className="mt-5" size="lg" fullWidth loading={busy} disabled={!amountPaise || tooLarge} onClick={topUp}>
        Add {amountPaise ? formatPaise(amountPaise) : 'money'}
      </Button>
    </Sheet>
  )
}

export default function FundDetail() {
  const { fundId = '' } = useParams()
  const user = useUser()
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const funds = useApi<FundDTO[]>('/funds')
  const wallet = useApi<WalletDTO>('/wallet')
  const portfolio = useApi<PortfolioDTO>('/portfolio')
  const [sheet, setSheet] = useState<'invest' | 'topup' | null>(null)
  const [selecting, setSelecting] = useState(false)

  const [searchParams, setSearchParams] = useSearchParams()
  const fund = funds.data?.find((candidate) => candidate.id === fundId)
  const holding = portfolio.data?.holdings.find((candidate) => candidate.fund.id === fundId)
  const plan = fund && wallet.data ? planInvestment(wallet.data.balancePaise, fund.minInvestmentPaise) : null
  const isSelected = user.selectedFundId === fundId

  // "/invest/:id?invest=1" (from the suggestion card) opens the invest sheet straight away.
  const wantsInvest = searchParams.get('invest') === '1'
  useEffect(() => {
    if (!wantsInvest || !plan) return
    if (plan.status === 'eligible') setSheet('invest')
    setSearchParams({}, { replace: true }) // remove ?invest=1 so a refresh doesn't reopen it
  }, [wantsInvest, plan, setSearchParams])

  async function selectFund() {
    setSelecting(true)
    try {
      setUser(await api<UserDTO>('/me', { method: 'PATCH', body: { selectedFundId: fundId } }))
      invalidateMoney()
      toast({ title: 'Your wallet now saves towards this fund', tone: 'success' })
    } catch (caught) {
      toast({ title: errorMessage(caught), tone: 'error' })
    } finally {
      setSelecting(false)
    }
  }

  if (funds.loading) {
    return (
      <Screen>
        <ScreenHeader title="Fund" back="/funds" />
        <div className="space-y-4 px-5">
          <Skeleton className="h-28 rounded-3xl" />
          <Skeleton className="h-60 rounded-3xl" />
        </div>
      </Screen>
    )
  }

  if (!fund) {
    return (
      <Screen>
        <ScreenHeader title="Fund" back="/funds" />
        {funds.error ? (
          <ErrorMessage message={funds.error.message} onRetry={funds.reload} />
        ) : (
          <StateMessage title="Fund not found" description="It may have been removed." />
        )}
      </Screen>
    )
  }

  return (
    <Screen>
      <ScreenHeader title={fund.shortName} subtitle={fund.fundHouse} back="/funds" />
      <div className="space-y-4 px-5 pb-10">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-subtle border border-line px-2.5 py-1 text-xs font-semibold text-ink">
              {FUND_CATEGORY_LABELS[fund.category]}
            </span>
            <span className="text-xs font-medium text-muted">{FUND_CATEGORY_RISK[fund.category]}</span>
          </div>
          <p className="mt-3 text-sm font-semibold text-muted">NAV on {formatShortDate(fund.navDate)}</p>
          <div className="flex items-baseline gap-3">
            <p className="text-[27px] leading-none font-light tracking-[-0.03em] tabular-nums">{formatNav(fund.nav)}</p>
            {fund.return1y !== null && (
              <p className={cn('text-sm font-semibold', fund.return1y >= 0 ? 'text-gain' : 'text-loss')}>
                {formatPercent(fund.return1y, true)} 1Y
              </p>
            )}
          </div>
          <div className="mt-1">
            <NavBadge source={fund.navSource} />
          </div>
        </div>

        <Reveal>
          <NavChart fundId={fund.id} />
        </Reveal>

        <Reveal delay={60} className="grid grid-cols-3 gap-2">
          <Card className="p-3">
            <p className="text-[11px] font-semibold text-muted">Min (demo)</p>
            <p className="font-semibold tabular-nums">{formatPaise(fund.minInvestmentPaise)}</p>
          </Card>
          <Card className="p-3">
            <p className="text-[11px] font-semibold text-muted">Your units</p>
            <p className="font-semibold tabular-nums">{holding ? holding.units.toFixed(3) : '0'}</p>
          </Card>
          <Card className="p-3">
            <p className="text-[11px] font-semibold text-muted">Your value</p>
            <p className="font-semibold tabular-nums">{formatPaise(holding?.currentValuePaise ?? 0)}</p>
          </Card>
        </Reveal>

        {wallet.data && plan ? (
          <Card className="p-5">
            {plan.status === 'eligible' ? (
              <>
                <div className="flex items-center gap-2 text-gain">
                  <Sparkles className="size-5" />
                  <p className="font-semibold">You can invest now</p>
                </div>
                <p className="mt-1 text-sm text-muted">
                  Your wallet has {formatPaise(wallet.data.balancePaise)}, above the {formatPaise(fund.minInvestmentPaise)}{' '}
                  minimum. Whatever you don't invest stays in your wallet.
                </p>
                <Button className="mt-4" size="lg" fullWidth onClick={() => setSheet('invest')}>
                  Invest
                </Button>
              </>
            ) : (
              <>
                <p className="font-semibold">
                  {formatPaise(wallet.data.balancePaise)} / {formatPaise(fund.minInvestmentPaise)} saved
                </p>
                <ProgressBar className="mt-3 h-2.5" value={plan.progress} />
                <p className="mt-2 text-sm text-muted">
                  <span className="font-semibold text-ink">{formatPaise(plan.shortfallPaise)}</span> more needed to invest.
                  Your balance carries forward automatically.
                </p>
                <Button className="mt-4" fullWidth icon={<Plus className="size-4" />} onClick={() => setSheet('topup')}>
                  Add {formatPaise(plan.shortfallPaise)} and invest now
                </Button>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button variant="secondary" onClick={() => navigate('/')}>
                    Keep saving
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/funds')}>
                    Change fund
                  </Button>
                </div>
              </>
            )}
          </Card>
        ) : (
          <Skeleton className="h-40 rounded-3xl" />
        )}

        {isSelected ? (
          <p className="flex items-center justify-center gap-2 text-sm font-semibold text-muted">
            <Check className="size-4 text-gain" /> Your wallet is saving towards this fund
          </p>
        ) : (
          <Button variant="outline" fullWidth loading={selecting} onClick={selectFund}>
            Save towards this fund
          </Button>
        )}

        <p className="flex gap-2 text-xs text-muted">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          {fund.name}. NAV data from mfapi.in. Investments in RupeeRound are simulated; the minimum shown is a
          demo value, not the scheme's actual minimum.
        </p>
      </div>

      {wallet.data && sheet === 'invest' && (
        <InvestSheet fund={fund} wallet={wallet.data} open onClose={() => setSheet(null)} />
      )}
      {plan?.status === 'carry-forward' && sheet === 'topup' && (
        <TopUpSheet shortfallPaise={plan.shortfallPaise} open onClose={() => setSheet(null)} />
      )}
    </Screen>
  )
}
