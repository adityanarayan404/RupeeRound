import { FUND_CATEGORY_LABELS, formatPaise, type PortfolioDTO, type WalletDTO } from '@rupeeround/shared'
import { Bot, ChartColumnBig, ChevronRight, Info, PiggyBank, RefreshCw } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import Button from '@/components/Button'
import Card from '@/components/Card'
import ReturnsGrid from '@/components/ReturnsGrid'
import Reveal from '@/components/Reveal'
import ScreenHeader from '@/components/ScreenHeader'
import Skeleton from '@/components/Skeleton'
import StateMessage, { ErrorMessage } from '@/components/StateMessage'
import { useChartColors } from '@/context/ThemeContext'
import { cn } from '@/lib/cn'
import { formatLongDate, formatNav, formatPct, formatRupees2, formatShortDate } from '@/lib/format'
import { invalidate, useApi } from '@/lib/useApi'

function HoldingRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className={cn('font-semibold tabular-nums', mono && 'font-mono text-[13px]')}>{value}</span>
    </div>
  )
}

function GrowthChart({ portfolio }: { portfolio: PortfolioDTO }) {
  const colors = useChartColors()
  const data = portfolio.savingsHistory.map((point) => ({
    date: point.date,
    saved: point.savedPaise / 100,
    invested: point.investedPaise / 100,
  }))
  return (
    <>
      <div className="mt-5 flex items-center justify-between text-[12px] text-muted">
        <span>Money put aside</span>
        <span>Last 30 days</span>
      </div>
      <div className="mt-2 h-32" aria-label="Saved and invested over the last 30 days">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="portfolio-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={colors.fill} stopOpacity={0.16} />
                <stop offset="1" stopColor={colors.fill} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide />
            <Tooltip
              cursor={{ stroke: colors.grid }}
              labelStyle={{ color: colors.text }}
              itemStyle={{ color: colors.ink }}
              contentStyle={{ background: colors.tooltipBg, border: `1px solid ${colors.grid}`, borderRadius: 12, fontSize: 12 }}
              labelFormatter={(label) => formatShortDate(String(label))}
              formatter={(value, name) => [`₹${Number(value).toLocaleString('en-IN')}`, name === 'saved' ? 'Saved' : 'Invested']}
            />
            <Area type="monotone" dataKey="saved" stroke={colors.line} strokeWidth={2} fill="url(#portfolio-fill)" />
            <Area type="stepAfter" dataKey="invested" stroke={colors.second} strokeWidth={1.5} strokeDasharray="4 4" fill="none" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex gap-4 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ background: colors.line }} /> Total saved
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 border-t-2 border-dashed" style={{ borderColor: colors.second }} /> Invested
        </span>
      </div>
    </>
  )
}

/** Portfolio value, growth and each holding with its live returns. */
export default function Portfolio() {
  const navigate = useNavigate()
  const portfolio = useApi<PortfolioDTO>('/portfolio')
  const wallet = useApi<WalletDTO>('/wallet')
  const data = portfolio.data

  // Today's move: each holding's value change since the previous NAV.
  const todayPaise = (data?.holdings ?? []).reduce((sum, holding) => {
    const day = holding.fund.returns.day
    return day === null ? sum : sum + holding.currentValuePaise - holding.currentValuePaise / (1 + day / 100)
  }, 0)
  const navDate = data?.holdings[0]?.fund.navDate

  return (
    <>
      <ScreenHeader
        title="Portfolio"
        subtitle={navDate ? `NAV as of ${formatLongDate(navDate)}` : 'Simulated investments · real NAVs'}
        right={
          <button
            type="button"
            onClick={() => invalidate('/portfolio', '/wallet', '/funds')}
            aria-label="Refresh"
            className="grid size-10 place-items-center rounded-full border border-line bg-card text-muted hover:text-ink"
          >
            <RefreshCw className="size-4" />
          </button>
        }
      />
      <div className="space-y-4 px-5">
        <Reveal>
          {portfolio.loading ? (
            <Skeleton className="h-80 rounded-3xl" />
          ) : portfolio.error || !data ? (
            <ErrorMessage message={portfolio.error?.message ?? 'No portfolio data'} onRetry={portfolio.reload} />
          ) : (
            <Card className="p-5">
              <p className="eyebrow">Current portfolio value</p>
              <p className="mt-3 text-[27px] leading-none font-light tracking-[-0.03em] tabular-nums">
                {formatRupees2(data.currentValuePaise)}
              </p>
              {data.investedPaise > 0 ? (
                <>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 font-mono text-[12px] font-semibold',
                        data.gainPaise >= 0 ? 'bg-gain/15 text-gain' : 'bg-loss/15 text-loss',
                      )}
                    >
                      {data.gainPaise >= 0 ? '+' : '−'}
                      {formatRupees2(Math.abs(data.gainPaise))} ({formatPct(data.gainPct * 100)})
                    </span>
                    <span className="text-[12px] text-muted">Total returns</span>
                  </div>
                  <p className={cn('mt-2 font-mono text-[12px]', todayPaise >= 0 ? 'text-gain' : 'text-loss')}>
                    {todayPaise >= 0 ? '+' : '−'}
                    {formatRupees2(Math.abs(Math.round(todayPaise)))} today
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted">Nothing invested yet. Your round-ups wait in the wallet.</p>
              )}
              <GrowthChart portfolio={data} />
            </Card>
          )}
        </Reveal>

        <Reveal className="flex items-center gap-3 rounded-2xl bg-subtle/70 px-4 py-3">
          <PiggyBank className="size-5 shrink-0 text-accent" />
          <p className="flex-1 text-sm text-muted">Waiting in your round-up wallet</p>
          {wallet.data ? (
            <p className="font-semibold tabular-nums">{formatPaise(wallet.data.balancePaise)}</p>
          ) : (
            <Skeleton className="h-5 w-16" />
          )}
        </Reveal>

        {data && data.holdings.length === 0 && (
          <StateMessage
            icon={ChartColumnBig}
            title="No holdings yet"
            description="Once your wallet reaches a fund's minimum, invest it and it shows up here."
            action={<Button onClick={() => navigate('/funds')}>Compare funds</Button>}
          />
        )}

        {data?.holdings.map((holding, index) => (
          <Reveal key={holding.fund.id} delay={index * 60}>
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="eyebrow">Fund holding</p>
                  <p className="mt-1 truncate font-semibold">{holding.fund.shortName}</p>
                </div>
                <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[11px] font-medium">
                  {FUND_CATEGORY_LABELS[holding.fund.category]}
                </span>
              </div>
              <div className="mt-3">
                <HoldingRow label="Total invested" value={formatRupees2(holding.investedPaise)} mono />
                <HoldingRow label="Live NAV" value={formatNav(holding.fund.nav)} mono />
                <HoldingRow label="Units held" value={`${holding.units.toFixed(4)} units`} mono />
                <HoldingRow label="Current value" value={formatRupees2(holding.currentValuePaise)} mono />
                <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
                  <span className="text-muted">Gain / loss</span>
                  <span className={cn('font-mono text-[13px] font-semibold', holding.gainPaise >= 0 ? 'text-gain' : 'text-loss')}>
                    {holding.gainPaise >= 0 ? '+' : '−'}
                    {formatRupees2(Math.abs(holding.gainPaise))} ({formatPct(holding.gainPct * 100)})
                  </span>
                </div>
              </div>
              <p className="eyebrow mt-4 mb-2">Fund NAV change</p>
              <ReturnsGrid returns={holding.fund.returns} />
            </Card>
          </Reveal>
        ))}

        <Reveal className="grid grid-cols-2 gap-3">
          <Link to="/funds" className="flex items-center justify-between rounded-2xl border border-line bg-card px-4 py-3.5 text-sm font-semibold">
            <span className="flex items-center gap-2">
              <ChartColumnBig className="size-4 text-accent" /> Compare funds
            </span>
            <ChevronRight className="size-4 text-muted" />
          </Link>
          <Link
            to="/advisor"
            state={{ draft: 'How is my portfolio doing, and what do these returns mean?' }}
            className="flex items-center justify-between rounded-2xl border border-line bg-card px-4 py-3.5 text-sm font-semibold"
          >
            <span className="flex items-center gap-2">
              <Bot className="size-4 text-accent" /> Ask AI
            </span>
            <ChevronRight className="size-4 text-muted" />
          </Link>
        </Reveal>

        <p className="flex gap-2 pb-2 text-xs text-muted">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          Investments are simulated and no real orders are placed. NAVs are real, from mfapi.in. Past performance does not
          decide future returns.
        </p>
      </div>
    </>
  )
}
