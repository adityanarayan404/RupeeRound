import {
  BACKTEST_PERIOD_DAYS,
  FUND_CATEGORY_LABELS,
  ROUND_UP_MULTIPLES,
  SPENDING_PROFILES,
  SPENDING_PROFILE_IDS,
  backtestWindow,
  formatPaise,
  generatePayments,
  runBacktest,
  type BacktestPeriod,
  type BacktestResult,
  type FundDTO,
  type NavHistoryResponse,
  type SpendingProfileId,
} from '@rupeeround/shared'
import { Bus, GraduationCap, House, Info, Laptop } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Card from '@/components/Card'
import ChoiceChips from '@/components/ChoiceChips'
import MultipleChips from '@/components/MultipleChips'
import Reveal from '@/components/Reveal'
import Screen from '@/components/Screen'
import ScreenHeader from '@/components/ScreenHeader'
import Skeleton from '@/components/Skeleton'
import StateMessage, { ErrorMessage } from '@/components/StateMessage'
import { useUser } from '@/context/AuthContext'
import { useChartColors } from '@/context/ThemeContext'
import { cn } from '@/lib/cn'
import { formatLongDate, formatPct, formatShortDate } from '@/lib/format'
import { useApi } from '@/lib/useApi'

const PROFILE_ICONS: Record<SpendingProfileId, typeof Bus> = {
  student: GraduationCap,
  firstJob: Laptop,
  commuter: Bus,
  household: House,
}

const PERIODS: { value: BacktestPeriod; label: string; long: string }[] = [
  { value: '6m', label: '6M', long: '6 months' },
  { value: '1y', label: '1Y', long: 'year' },
  { value: '3y', label: '3Y', long: '3 years' },
]

const monthYear = new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit' })

/** "₹1,240" — whole rupees, for big headline figures. */
function rupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-mono text-[13px] font-semibold tabular-nums">{value}</span>
    </div>
  )
}

function GrowthChart({ result, period }: { result: BacktestResult; period: BacktestPeriod }) {
  const colors = useChartColors()
  const data = result.series.map((point) => ({
    date: point.date,
    value: point.valuePaise / 100,
    saved: point.savedPaise / 100,
  }))
  const tick = (value: string) =>
    period === '6m' ? formatShortDate(value) : monthYear.format(new Date(`${value}T00:00:00`))

  return (
    <>
      <div className="mt-2 h-40" aria-label="Round-ups saved and their value over time">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="backtest-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={colors.fill} stopOpacity={0.16} />
                <stop offset="1" stopColor={colors.fill} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tickFormatter={(value) => tick(String(value))}
              tick={{ fill: colors.text, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              minTickGap={40}
            />
            <YAxis hide domain={[0, 'dataMax']} />
            <Tooltip
              cursor={{ stroke: colors.grid }}
              labelStyle={{ color: colors.text }}
              itemStyle={{ color: colors.ink }}
              contentStyle={{ background: colors.tooltipBg, border: `1px solid ${colors.grid}`, borderRadius: 12, fontSize: 12 }}
              labelFormatter={(label) => formatLongDate(String(label))}
              formatter={(value, name) => [
                `₹${Math.round(Number(value)).toLocaleString('en-IN')}`,
                name === 'value' ? 'Worth' : 'Saved',
              ]}
            />
            <Area type="monotone" dataKey="value" stroke={colors.line} strokeWidth={2} fill="url(#backtest-fill)" />
            <Area type="monotone" dataKey="saved" stroke={colors.second} strokeWidth={1.5} strokeDasharray="4 4" fill="none" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex gap-4 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ background: colors.line }} /> Worth (at real NAVs)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 border-t-2 border-dashed" style={{ borderColor: colors.second }} /> Round-ups saved
        </span>
      </div>
    </>
  )
}

/**
 * "What if?" backtest: a sample spending profile's round-ups, invested by RupeeRound's
 * own rules at a fund's real past NAVs. Spending is simulated; prices are real.
 */
export default function Backtest() {
  const user = useUser()
  const funds = useApi<FundDTO[]>('/funds')
  const [profileId, setProfileId] = useState<SpendingProfileId>('student')
  const [period, setPeriod] = useState<BacktestPeriod>('1y')
  const [multiple, setMultiple] = useState(user.defaultMultiple)
  const [chosenFundId, setChosenFundId] = useState<string | null>(null)

  const fundList = funds.data ?? []
  const fund =
    fundList.find((candidate) => candidate.id === chosenFundId) ??
    fundList.find((candidate) => candidate.id === user.selectedFundId) ??
    fundList[0]
  // 3 years of NAVs per fund, fetched once and cached; shorter periods are sliced here.
  const history = useApi<NavHistoryResponse>(fund ? `/funds/${fund.id}/nav-history?range=3y` : null)
  const navPoints = history.data?.fundId === fund?.id ? history.data?.points : undefined

  const payments = useMemo(() => {
    const window = navPoints ? backtestWindow(navPoints, BACKTEST_PERIOD_DAYS[period]) : null
    return window ? generatePayments(profileId, window.fromIso, window.toIso) : null
  }, [navPoints, period, profileId])

  const byStep = useMemo(() => {
    if (!payments || !navPoints || !fund) return null
    return ROUND_UP_MULTIPLES.map((step) => ({
      step,
      result: runBacktest({ payments, navHistory: navPoints, multipleRupees: step, minimumPaise: fund.minInvestmentPaise }),
    }))
  }, [payments, navPoints, fund])

  const result = byStep?.find((entry) => entry.step === multiple)?.result ?? null
  const bestValue = Math.max(1, ...(byStep ?? []).map((entry) => entry.result.totalValuePaise))
  const periodLabel = PERIODS.find((option) => option.value === period)!.long

  return (
    <Screen>
      <ScreenHeader title="What if?" subtitle="Simulated spending · real fund prices" back="/" />
      <div className="space-y-4 px-5 pb-10">
        <Reveal>
          <p className="text-sm text-muted">
            Pick a spending style and a fund. We replay a typical {periodLabel} of payments with RupeeRound's round-up
            rules and invest the spare change at that fund's real past prices.
          </p>
        </Reveal>

        <Reveal delay={40}>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-ink">Spending style</legend>
            <div className="grid grid-cols-2 gap-2">
              {SPENDING_PROFILE_IDS.map((id) => {
                const profile = SPENDING_PROFILES[id]
                const Icon = PROFILE_ICONS[id]
                const selected = id === profileId
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setProfileId(id)}
                    className={cn(
                      'rounded-2xl border p-3 text-left transition-all',
                      selected
                        ? 'border-primary bg-primary text-on-primary shadow-md shadow-black/20'
                        : 'border-line bg-card text-ink hover:bg-subtle',
                    )}
                  >
                    <Icon className={cn('size-4', selected ? 'text-on-primary' : 'text-accent')} />
                    <span className="mt-2 block text-sm font-semibold">{profile.label}</span>
                    <span className={cn('block text-[11px] leading-snug', selected ? 'text-on-primary/70' : 'text-muted')}>
                      {profile.description}
                    </span>
                  </button>
                )
              })}
            </div>
          </fieldset>
        </Reveal>

        <Reveal delay={80} className="space-y-4">
          {funds.loading ? (
            <Skeleton className="h-11 rounded-2xl" />
          ) : funds.error ? (
            <ErrorMessage message={funds.error.message} onRetry={funds.reload} />
          ) : (
            fund && (
              <ChoiceChips
                legend="Fund"
                options={fundList.map((candidate) => ({ value: candidate.id, label: FUND_CATEGORY_LABELS[candidate.category] }))}
                value={fund.id}
                onChange={setChosenFundId}
              />
            )
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink">Looking back</p>
            <div className="flex rounded-xl bg-subtle p-1" role="tablist" aria-label="Backtest period">
              {PERIODS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={period === option.value}
                  onClick={() => setPeriod(option.value)}
                  className={cn(
                    'rounded-lg px-3.5 py-1 text-xs font-semibold transition-colors',
                    period === option.value ? 'bg-card text-ink shadow-sm' : 'text-muted',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <MultipleChips value={multiple} onChange={setMultiple} />
        </Reveal>

        {history.error ? (
          <ErrorMessage message={history.error.message} onRetry={history.reload} />
        ) : navPoints && navPoints.length < 2 ? (
          <StateMessage title="No price history yet" description="Live NAVs from mfapi.in haven't loaded. Try again shortly." />
        ) : !result || !fund ? (
          <Skeleton className="h-96 rounded-[28px]" />
        ) : (
          <>
            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-linear-to-br from-(--wallet-from) to-(--wallet-to) p-6 text-white shadow-2xl shadow-black/50">
              <div
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(120%_80%_at_100%_0%,rgba(255,255,255,0.12),transparent_55%)]"
              />
              <div className="relative">
                <span className="text-[11px] font-medium tracking-[0.16em] text-white/60 uppercase">
                  Your spare change would be worth
                </span>
                <p className="mt-3 text-[34px] leading-none font-light tracking-[-0.035em] tabular-nums">
                  {rupees(result.totalValuePaise)}
                </p>
                <p className="mt-2 text-[13px] text-white/60">
                  from {rupees(result.roundUpsPaise)} of round-ups, {formatLongDate(result.fromIso)} to{' '}
                  {formatLongDate(result.toIso)}
                </p>
                {result.investedPaise > 0 ? (
                  <span className="mt-4 inline-block rounded-full bg-white/12 px-2.5 py-1 font-mono text-[12px] font-semibold text-white">
                    {result.gainPaise >= 0 ? '+' : '−'}
                    {rupees(Math.abs(result.gainPaise))} ({formatPct(result.gainFraction * 100)}) market{' '}
                    {result.gainPaise >= 0 ? 'gain' : 'loss'}
                  </span>
                ) : (
                  <p className="mt-4 text-[13px] text-white/70">
                    The wallet never reached the {formatPaise(fund.minInvestmentPaise)} minimum, so it all carried forward.
                  </p>
                )}
                <p className="mt-4 border-t border-white/10 pt-3 text-[12px] text-white/55">
                  {SPENDING_PROFILES[profileId].label} · {fund.shortName} · ₹{multiple} step
                </p>
              </div>
            </div>

            <Reveal>
              <Card className="p-5">
                <p className="eyebrow">How it grew</p>
                <GrowthChart result={result} period={period} />
              </Card>
            </Reveal>

            <Reveal>
              <Card className="p-5">
                <p className="eyebrow mb-2">The breakdown</p>
                <Row label="Payments replayed" value={result.paymentsCount.toLocaleString('en-IN')} />
                <Row label="Total spent" value={rupees(result.spentPaise)} />
                <Row label="Round-ups saved" value={formatPaise(result.roundUpsPaise)} />
                <Row
                  label="Invested"
                  value={`${formatPaise(result.investedPaise)} · ${result.investmentsCount} time${result.investmentsCount === 1 ? '' : 's'}`}
                />
                <Row label="Units held" value={result.units.toFixed(3)} />
                <Row label="Units worth today" value={formatPaise(result.unitsValuePaise)} />
                <Row label="Still in wallet" value={formatPaise(result.walletPaise)} />
                {result.firstInvestmentDate && (
                  <p className="mt-2 text-[12px] text-muted">
                    First investment on {formatLongDate(result.firstInvestmentDate)}, when the wallet first covered the{' '}
                    {formatPaise(fund.minInvestmentPaise)} demo minimum. After that, every time it filled up again.
                  </p>
                )}
              </Card>
            </Reveal>

            {byStep && (
              <Reveal>
                <Card className="p-5">
                  <p className="eyebrow">Same spending, different step</p>
                  <p className="mt-1 text-[12px] text-muted">
                    Bigger steps save faster but add more to every payment. Tap a step to see its full result.
                  </p>
                  <ul className="mt-3 space-y-2.5">
                    {byStep.map(({ step, result: stepResult }) => (
                      <li key={step}>
                        <button
                          type="button"
                          onClick={() => setMultiple(step)}
                          aria-pressed={step === multiple}
                          className="block w-full text-left"
                        >
                          <div className="flex items-baseline justify-between text-sm">
                            <span className={cn('font-semibold', step === multiple ? 'text-ink' : 'text-muted')}>
                              ₹{step} step{' '}
                              <span className="text-[11px] font-normal text-muted">
                                +{Math.round((stepResult.roundUpsPaise / Math.max(1, stepResult.spentPaise)) * 100)}% on spends
                              </span>
                            </span>
                            <span className="font-mono text-[13px] tabular-nums">
                              <span className="text-muted">{rupees(stepResult.roundUpsPaise)} → </span>
                              <span className="font-semibold text-ink">{rupees(stepResult.totalValuePaise)}</span>
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-subtle">
                            <div
                              className={cn('h-full rounded-full transition-all', step === multiple ? 'bg-primary' : 'bg-line-strong')}
                              style={{ width: `${(stepResult.totalValuePaise / bestValue) * 100}%` }}
                            />
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </Card>
              </Reveal>
            )}
          </>
        )}

        <p className="flex gap-2 text-xs text-muted">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          Spending is simulated from a sample profile, not anyone's real payments. Fund prices are real past NAVs from
          mfapi.in, and the minimum is RupeeRound's demo value. A backtest only shows the past. Past performance does not
          decide future returns.
        </p>
      </div>
    </Screen>
  )
}
