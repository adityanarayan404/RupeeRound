import {
  FUND_CATEGORY_LABELS,
  MAX_PAYMENT_PAISE,
  calculateRoundUp,
  formatPaise,
  parseRupeesInput,
  type MerchantCategory,
  type PaymentResponse,
  type WalletDTO,
} from '@rupeeround/shared'
import { ArrowRight, Lock, QrCode, ScanLine, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import Button from '@/components/Button'
import Card from '@/components/Card'
import Confetti from '@/components/Confetti'
import MultipleChips from '@/components/MultipleChips'
import PinPad from '@/components/PinPad'
import ProgressBar from '@/components/ProgressBar'
import QrScanner from '@/components/QrScanner'
import Screen from '@/components/Screen'
import ScreenHeader from '@/components/ScreenHeader'
import Sheet from '@/components/Sheet'
import SuccessCheck from '@/components/SuccessCheck'
import { useUser } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { api, errorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatRupees2, sanitizeAmountInput } from '@/lib/format'
import { CATEGORY_ICONS, QUICK_MERCHANTS } from '@/lib/merchants'
import type { ScannedPayment } from '@/lib/upi'
import { invalidateMoney, useApi } from '@/lib/useApi'

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: 'gain' }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className={cn('text-sm', strong ? 'font-semibold' : 'text-muted', tone === 'gain' && 'text-gain')}>{label}</span>
      <span className={cn('font-mono text-sm tabular-nums', strong && 'text-base font-semibold', tone === 'gain' && 'text-gain')}>
        {value}
      </span>
    </div>
  )
}

function PaymentSuccess({
  result,
  merchantId,
  onDone,
  onTransactions,
  onPayAgain,
}: {
  result: PaymentResponse
  merchantId: string | null
  onDone: () => void
  onTransactions: () => void
  onPayAgain: () => void
}) {
  const { transaction, wallet } = result
  const { plan, selectedFund } = wallet
  const reference = `RR/${transaction.id.slice(-10).toUpperCase()}`

  return (
    <Screen>
      <div className="pt-safe pb-safe flex min-h-full flex-col px-5">
        {transaction.roundUpPaise > 0 && <Confetti />}
        <div className="flex flex-1 flex-col items-center pt-10 text-center">
          <SuccessCheck size={88} />
          <span className="animate-rise mt-5 rounded-full border border-line px-3 py-1 text-[11px] font-medium tracking-[0.16em] text-muted uppercase">
            {transaction.roundUpPaise > 0 ? 'Round-up saved' : 'Payment complete'}
          </span>
          <p className="animate-rise mt-4 text-[27px] leading-none font-light tracking-[-0.03em] tabular-nums">
            {transaction.roundUpPaise > 0
              ? `${formatRupees2(transaction.roundUpPaise)} saved`
              : formatRupees2(transaction.roundedPaise)}
          </p>
          <p className="animate-rise mt-2 text-sm text-muted">
            Paid {formatRupees2(transaction.roundedPaise)} to {transaction.merchant}
          </p>

          <Card className="animate-rise mt-7 w-full p-5 text-left [animation-delay:200ms]">
            <Row label="Merchant" value={transaction.merchant} />
            {merchantId && <Row label="UPI ID" value={merchantId} />}
            <Row label="Bill" value={formatRupees2(transaction.amountPaise)} />
            <Row label={`Rounded to next ₹${transaction.multiple}`} value={formatRupees2(transaction.roundedPaise)} />
            <div className="my-2 border-t border-line" />
            <Row label="RupeeRound round-up" value={`+${formatRupees2(transaction.roundUpPaise)}`} tone="gain" strong />
            <Row label="Saving towards" value={selectedFund ? selectedFund.shortName : 'No fund chosen'} />
            <Row label="Status" value="In round-up wallet" />
          </Card>

          <div className="animate-rise mt-3 flex w-full items-center justify-between rounded-2xl bg-subtle/70 px-4 py-3 [animation-delay:300ms]">
            <span className="font-mono text-xs text-muted">{reference}</span>
            <span className="text-xs text-muted">Simulated · no real money moved</span>
          </div>

          {selectedFund && plan && (
            <div className="animate-rise mt-3 w-full rounded-2xl border border-line px-4 py-3 text-left [animation-delay:400ms]">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted">Round-up wallet</span>
                <span className="font-semibold tabular-nums">{formatPaise(wallet.balancePaise)}</span>
              </div>
              <ProgressBar
                className="mt-2 h-1.5"
                value={plan.progress}
                barClassName={plan.status === 'eligible' ? 'bg-gain' : 'bg-ink'}
              />
              <p className="mt-2 text-xs text-muted">
                {plan.status === 'eligible'
                  ? `Ready to invest in ${selectedFund.shortName}.`
                  : `${formatPaise(plan.shortfallPaise)} more to invest in ${selectedFund.shortName}. Your balance carries forward.`}
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 space-y-2.5">
          <Button size="lg" fullWidth onClick={onTransactions}>
            View transactions
          </Button>
          <Button size="lg" fullWidth variant="secondary" onClick={onDone}>
            Back to home
          </Button>
          <button type="button" onClick={onPayAgain} className="w-full py-2 text-sm font-semibold text-muted hover:text-ink">
            Make another payment
          </button>
        </div>
      </div>
    </Screen>
  )
}

/** Simulated UPI payment: scan a shop's QR (or pick a shop), see the round-up, confirm with PIN. */
export default function Pay() {
  const user = useUser()
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const wallet = useApi<WalletDTO>('/wallet')
  const [merchant, setMerchant] = useState('')
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [category, setCategory] = useState<MerchantCategory>('other')
  const [amountInput, setAmountInput] = useState('')
  const [multiple, setMultiple] = useState(user.defaultMultiple)
  const [scanning, setScanning] = useState(false)
  const [pinOpen, setPinOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [shake, setShake] = useState(0)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<PaymentResponse | null>(null)

  // /pay?scan=1 (centre tab button, Home "Scan & pay") opens the scanner straight away.
  useEffect(() => {
    if (searchParams.get('scan') === '1') {
      setScanning(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const amountPaise = parseRupeesInput(amountInput)
  const tooLarge = amountPaise !== null && amountPaise > MAX_PAYMENT_PAISE
  const preview = amountPaise && !tooLarge ? calculateRoundUp(amountPaise, multiple) : null
  const canPay = Boolean(preview && merchant.trim())
  const fund = wallet.data?.selectedFund ?? null
  const MerchantIcon = CATEGORY_ICONS[category]

  function onScanned(payment: ScannedPayment) {
    setScanning(false)
    setMerchant(payment.payeeName)
    setMerchantId(payment.upiId)
    setCategory('other')
    if (payment.amountPaise) setAmountInput(String(payment.amountPaise / 100))
    toast({
      title: `Scanned ${payment.payeeName}`,
      description: payment.amountPaise ? 'Amount filled in from the QR' : 'Enter the bill amount',
      tone: 'success',
    })
  }

  async function pay(enteredPin: string) {
    if (!preview) return
    setBusy(true)
    try {
      const response = await api<PaymentResponse>('/transactions', {
        method: 'POST',
        body: { merchant: merchant.trim(), category, amountPaise: preview.amountPaise, multiple, pin: enteredPin },
      })
      invalidateMoney()
      setPinOpen(false)
      setResult(response)
    } catch (caught) {
      setPinError(errorMessage(caught))
      setShake((count) => count + 1)
      setPin('')
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setResult(null)
    setMerchant('')
    setMerchantId(null)
    setCategory('other')
    setAmountInput('')
    setPin('')
  }

  if (result) {
    return (
      <PaymentSuccess
        result={result}
        merchantId={merchantId}
        onDone={() => navigate('/', { replace: true })}
        onTransactions={() => navigate('/transactions', { replace: true })}
        onPayAgain={reset}
      />
    )
  }

  return (
    <Screen>
      <ScreenHeader
        title="Pay"
        subtitle="Simulated UPI · no real money moves"
        back="/"
        right={
          <button
            type="button"
            onClick={() => setScanning(true)}
            aria-label="Scan QR"
            className="grid size-10 place-items-center rounded-full border border-line bg-card hover:bg-subtle"
          >
            <ScanLine className="size-5" />
          </button>
        }
      />

      <form
        className="space-y-4 px-5 pb-44"
        onSubmit={(event) => {
          event.preventDefault()
          if (canPay) setPinOpen(true)
        }}
      >
        {merchant && merchantId ? (
          <Card className="flex items-center gap-4 p-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-subtle text-accent">
              <MerchantIcon className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{merchant}</p>
              <p className="truncate font-mono text-xs text-muted">{merchantId}</p>
              <span className="mt-1 inline-block rounded-full border border-line px-2 py-0.5 text-[10px] font-medium text-muted">
                Scanned UPI QR
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setMerchant('')
                setMerchantId(null)
              }}
              className="text-sm font-semibold text-muted hover:text-ink"
            >
              Change
            </button>
          </Card>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setScanning(true)}
              className="flex w-full items-center gap-4 rounded-3xl bg-primary p-5 text-left text-on-primary transition-transform active:scale-[0.99]"
            >
              <div className="min-w-0 flex-1">
                <span className="rounded-full bg-on-primary/10 px-2 py-0.5 text-[10px] font-semibold tracking-[0.14em] uppercase">
                  Scan at shop
                </span>
                <p className="mt-2 text-lg font-semibold">Scan any UPI QR</p>
                <p className="text-[13px] text-on-primary/70">Fills in the shop and amount for you</p>
              </div>
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-on-primary text-primary">
                <QrCode className="size-7" />
              </span>
            </button>

            <Card className="p-4">
              <p className="eyebrow mb-3">Or pick a shop</p>
              <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                {QUICK_MERCHANTS.map((quick) => {
                  const Icon = CATEGORY_ICONS[quick.category]
                  const active = merchant === quick.merchant
                  return (
                    <button
                      key={quick.label}
                      type="button"
                      onClick={() => {
                        setMerchant(quick.merchant)
                        setCategory(quick.category)
                      }}
                      className={cn(
                        'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors',
                        active ? 'border-primary bg-primary text-on-primary' : 'border-line bg-card hover:bg-subtle',
                      )}
                    >
                      <Icon className="size-4" />
                      {quick.label}
                    </button>
                  )
                })}
              </div>
              <input
                value={merchant}
                onChange={(event) => {
                  setMerchant(event.target.value.slice(0, 40))
                  setCategory(QUICK_MERCHANTS.find((quick) => quick.merchant === event.target.value)?.category ?? 'other')
                }}
                placeholder="Or type a shop name"
                aria-label="Shop name"
                className="mt-3 h-12 w-full rounded-2xl border border-line bg-bg px-4 text-[14px] font-medium outline-none placeholder:text-muted/60 focus:border-accent"
              />
            </Card>
          </>
        )}

        <Card className="px-5 py-6 text-center">
          <label htmlFor="amount" className="eyebrow">
            Enter bill amount
          </label>
          <div className="mt-3 flex items-center justify-center gap-1">
            <span className="text-4xl font-light text-muted">₹</span>
            <input
              id="amount"
              value={amountInput}
              onChange={(event) => setAmountInput(sanitizeAmountInput(event.target.value))}
              inputMode="decimal"
              placeholder="0"
              autoComplete="off"
              className="bg-transparent text-center text-[46px] leading-none font-light tracking-[-0.04em] text-ink outline-none placeholder:text-line-strong"
              style={{ width: `${Math.max(1, amountInput.length || 1) + 0.6}ch` }}
            />
          </div>
          <div className="mx-auto mt-3 h-px w-40 bg-line-strong" />
          <p className={cn('mt-3 text-xs', tooLarge ? 'text-loss' : 'text-muted')}>
            {tooLarge ? 'Payments are capped at ₹1,00,000' : 'Type any bill amount, e.g. 34, 48 or 102'}
          </p>
        </Card>

        <Card className="p-5" aria-live="polite">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="font-semibold">RupeeRound breakdown</p>
            <span className="rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-muted">
              Nearest ₹{multiple} rule
            </span>
          </div>
          <MultipleChips value={multiple} onChange={setMultiple} label="Round up to the next" />
          <div className="mt-4">
            <Row label="Merchant bill" value={preview ? formatRupees2(preview.amountPaise) : '—'} />
            <Row label="Spare change round-up" value={preview ? `+${formatRupees2(preview.roundUpPaise)}` : '—'} tone="gain" />
            <div className="my-2 border-t border-line" />
            <Row label="Total UPI payment" value={preview ? formatRupees2(preview.roundedPaise) : '—'} strong />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-subtle/70 px-4 py-3 text-sm">
            <span className="text-muted">Goes to your round-up wallet</span>
            <span className="flex items-center gap-1.5 font-semibold">
              {preview ? formatRupees2(preview.roundUpPaise) : '₹0.00'}
              <ArrowRight className="size-3.5 text-muted" />
              {fund ? FUND_CATEGORY_LABELS[fund.category] : 'Wallet'}
            </span>
          </div>
          {preview?.roundUpPaise === 0 && (
            <p className="mt-2 text-xs text-muted">Already a multiple of ₹{multiple}, so there's nothing to round up.</p>
          )}
        </Card>

        <Card className="flex items-center gap-3 p-4">
          <span className="grid size-10 place-items-center rounded-xl bg-subtle text-accent">
            <Wallet className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">RupeeRound demo account</p>
            <p className="text-xs text-muted">Simulated payment source</p>
          </div>
          <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-muted">Demo</span>
        </Card>

        <div className="pb-safe absolute inset-x-0 bottom-0 z-10 border-t border-line bg-bg/80 px-5 pt-4 backdrop-blur-xl">
          <Button type="submit" size="lg" fullWidth disabled={!canPay} icon={<Lock className="size-4" />}>
            {preview ? `Pay & save ${formatRupees2(preview.roundedPaise)}` : 'Pay & save'}
          </Button>
          <p className="mt-2 text-center text-[11px] text-muted">Confirmed with your RupeeRound PIN · simulated</p>
        </div>
      </form>

      {scanning && <QrScanner onResult={onScanned} onClose={() => setScanning(false)} />}

      <Sheet
        open={pinOpen}
        onClose={() => {
          if (busy) return
          setPinOpen(false)
          setPin('')
          setPinError(null)
        }}
        title="Enter your PIN"
      >
        {preview && (
          <p className="-mt-2 mb-5 text-sm text-muted">
            Paying <span className="font-semibold text-ink">{formatRupees2(preview.roundedPaise)}</span> to{' '}
            <span className="font-semibold text-ink">{merchant}</span>
            {preview.roundUpPaise > 0 && (
              <>
                {' '}· <span className="font-semibold text-gain">+{formatRupees2(preview.roundUpPaise)}</span> saved
              </>
            )}
          </p>
        )}
        <PinPad
          value={pin}
          onChange={(value) => {
            setPin(value)
            setPinError(null)
            if (value.length === 4) void pay(value)
          }}
          error={pinError}
          shakeKey={shake}
          disabled={busy}
        />
      </Sheet>
    </Screen>
  )
}
