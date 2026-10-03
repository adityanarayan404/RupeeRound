import { FUND_CATEGORY_LABELS, formatPaise, type FundDTO, type PortfolioDTO, type WalletDTO } from '@rupeeround/shared'
import { Info, PiggyBank } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import Card from '@/components/Card'
import FundCard from '@/components/FundCard'
import ScreenHeader from '@/components/ScreenHeader'
import Skeleton from '@/components/Skeleton'
import { ErrorMessage } from '@/components/StateMessage'
import { useUser } from '@/context/AuthContext'
import { useChartColors } from '@/context/ThemeContext'
import { cn } from '@/lib/cn'
import { formatPercent, formatShortDate } from '@/lib/format'
import { useApi } from '@/lib/useApi'

function PortfolioCard({ portfolio }: { portfolio: PortfolioDTO }) {
  const colors = useChartColors()
  const data = portfolio.savingsHistory.map((point) => ({
    date: point.date,
    saved: point.savedPaise / 100,
    invested: point.investedPaise / 100,
  }))
  const up = portfolio.gainPaise >= 0

  return (
    <Card className="p-5">
      <p className="text-sm font-semibold text-muted">Portfolio value</p>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-extrabold tracking-tight tabular-nums">{formatPaise(portfolio.currentValuePaise)}</p>
        {portfolio.investedPaise > 0 && (
          <p className={cn('text-sm font-bold tabular-nums', up ? 'text-gain' : 'text-loss')}>
            {up ? '+' : '−'}
            {formatPaise(Math.abs(portfolio.gainPaise))} ({formatPercent(portfolio.gainPct, true)})
          </p>
        )}
      </div>
      <p className="text-sm text-muted">Invested {formatPaise(portfolio.investedPaise)}</p>

      <div className="mt-4 h-28" aria-label="Saved and invested over the last 30 days">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="saved-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={colors.fill} stopOpacity={0.35} />
                <stop offset="1" stopColor={colors.fill} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide />
            <Tooltip
              cursor={{ stroke: colors.grid }}
              contentStyle={{ background: colors.tooltipBg, border: `1px solid ${colors.grid}`, borderRadius: 12, fontSize: 12 }}
              labelFormatter={(label) => formatShortDate(String(label))}
              formatter={(value, name) => [`₹${Number(value).toLocaleString('en-IN')}`, name === 'saved' ? 'Saved' : 'Invested']}
            />
            <Area type="monotone" dataKey="saved" stroke={colors.line} strokeWidth={2.5} fill="url(#saved-fill)" />
            <Area type="stepAfter" dataKey="invested" stroke={colors.second} strokeWidth={2} strokeDasharray="4 4" fill="none" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex gap-4 text-xs font-semibold text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ background: colors.line }} /> Total saved
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded border-t-2 border-dashed" style={{ borderColor: colors.second }} /> Invested
        </span>
        <span className="ml-auto">Last 30 days</span>
      </div>
    </Card>
  )
}

export default function Invest() {
  const user = useUser()
  const navigate = useNavigate()
  const funds = useApi<FundDTO[]>('/funds')
  const wallet = useApi<WalletDTO>('/wallet')
  const portfolio = useApi<PortfolioDTO>('/portfolio')

  return (
    <>
      <ScreenHeader title="Invest" subtitle="Simulated investments · real NAVs" />
      <div className="space-y-6 px-5">
        {portfolio.loading ? (
          <Skeleton className="h-64 rounded-3xl" />
        ) : portfolio.error || !portfolio.data ? (
          <ErrorMessage message={portfolio.error?.message ?? 'No portfolio data'} onRetry={portfolio.reload} />
        ) : (
          <PortfolioCard portfolio={portfolio.data} />
        )}

        <div className="flex items-center gap-3 rounded-2xl bg-subtle/70 px-4 py-3">
          <PiggyBank className="size-5 shrink-0 text-accent" />
          <p className="flex-1 text-sm text-muted">Available in your round-up wallet</p>
          {wallet.data ? (
            <p className="font-extrabold tabular-nums">{formatPaise(wallet.data.balancePaise)}</p>
          ) : (
            <Skeleton className="h-5 w-16" />
          )}
        </div>

        <section>
          <h2 className="mb-3 text-lg font-bold">Funds</h2>
          {funds.loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-52 rounded-3xl" />
              ))}
            </div>
          ) : funds.error ? (
            <ErrorMessage message={funds.error.message} onRetry={funds.reload} />
          ) : (
            <div className="space-y-3">
              {funds.data?.map((fund) => (
                <FundCard
                  key={fund.id}
                  fund={fund}
                  balancePaise={wallet.data?.balancePaise}
                  selected={fund.id === user.selectedFundId}
                  onClick={() => navigate(`/invest/${fund.id}`)}
                />
              ))}
            </div>
          )}
        </section>

        {portfolio.data && portfolio.data.holdings.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-bold">Your holdings</h2>
            <Card className="divide-y divide-line py-1">
              {portfolio.data.holdings.map((holding) => (
                <button
                  key={holding.fund.id}
                  type="button"
                  onClick={() => navigate(`/invest/${holding.fund.id}`)}
                  className="flex w-full items-center gap-3 py-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{holding.fund.shortName}</p>
                    <p className="text-xs text-muted">
                      {FUND_CATEGORY_LABELS[holding.fund.category]} · {holding.units.toFixed(3)} units
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold tabular-nums">{formatPaise(holding.currentValuePaise)}</p>
                    <p className={cn('text-xs font-bold tabular-nums', holding.gainPaise >= 0 ? 'text-gain' : 'text-loss')}>
                      {formatPercent(holding.gainPct, true)}
                    </p>
                  </div>
                </button>
              ))}
            </Card>
          </section>
        )}

        <p className="flex gap-2 pb-2 text-xs text-muted">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          RupeeRound is a prototype. Investments are simulated and no real orders are placed. NAVs are real, from
          mfapi.in; fund minimums are demo values.
        </p>
      </div>
    </>
  )
}
