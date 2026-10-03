import {
  MAX_PAYMENT_PAISE,
  calculateRoundUp,
  formatPaise,
  parseRupeesInput,
  type MerchantCategory,
  type PaymentResponse,
} from '@rupeeround/shared'
import { ArrowDown, Lock, PiggyBank } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import Button from '@/components/Button'
import Confetti from '@/components/Confetti'
import MultipleChips from '@/components/MultipleChips'
import PinPad from '@/components/PinPad'
import ProgressBar from '@/components/ProgressBar'
import Screen from '@/components/Screen'
import ScreenHeader from '@/components/ScreenHeader'
import Sheet from '@/components/Sheet'
import SuccessCheck from '@/components/SuccessCheck'
import TextField from '@/components/TextField'
import { useUser } from '@/context/AuthContext'
import { api, errorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { sanitizeAmountInput } from '@/lib/format'
import { CATEGORY_ICONS, QUICK_MERCHANTS } from '@/lib/merchants'
import { invalidateMoney } from '@/lib/useApi'

function PaymentSuccess({ result, onDone, onPayAgain }: { result: PaymentResponse; onDone: () => void; onPayAgain: () => void }) {
  const { transaction, wallet } = result
  const { plan, selectedFund } = wallet

  return (
    <div className="pt-safe pb-safe flex h-full flex-col px-6">
      {transaction.roundUpPaise > 0 && <Confetti />}
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <SuccessCheck />
        <p className="animate-rise mt-6 text-sm font-semibold text-muted">Payment successful</p>
        <p className="animate-rise mt-1 text-4xl font-extrabold tracking-tight tabular-nums">
          {formatPaise(transaction.roundedPaise)}
        </p>
        <p className="animate-rise mt-1 text-muted">paid to {transaction.merchant}</p>

        {transaction.roundUpPaise > 0 ? (
          <div className="animate-pop mt-6 flex items-center gap-2 rounded-full border border-gain/30 bg-gain/10 px-5 py-2.5 text-lg font-extrabold text-gain [animation-delay:350ms]">
            <PiggyBank className="size-5" />+{formatPaise(transaction.roundUpPaise)} saved
          </div>
        ) : (
          <p className="mt-6 rounded-2xl bg-subtle px-4 py-3 text-sm text-muted">
            That was already a round number, so nothing extra this time.
          </p>
        )}

        <div className="animate-rise mt-8 w-full rounded-3xl border border-line bg-card p-4 text-left [animation-delay:500ms]">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-semibold text-muted">Round-up wallet</p>
            <p className="text-xl font-extrabold tabular-nums">{formatPaise(wallet.balancePaise)}</p>
          </div>
          {selectedFund && plan && (
            <>
              <ProgressBar
                className="mt-3"
                value={plan.progress}
                barClassName={plan.status === 'eligible' ? 'bg-gain' : undefined}
              />
              <p className="mt-2 text-sm text-muted">
                {plan.status === 'eligible'
                  ? `You've reached the ${formatPaise(selectedFund.minInvestmentPaise)} minimum for ${selectedFund.shortName}. Ready to invest!`
                  : `${formatPaise(plan.shortfallPaise)} more to invest in ${selectedFund.shortName}.`}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" size="lg" onClick={onPayAgain}>
          Pay again
        </Button>
        <Button size="lg" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  )
}

/** Single-form simulated payment with a live round-up preview. */
export default function Pay() {
  const user = useUser()
  const navigate = useNavigate()
  const [merchant, setMerchant] = useState('')
  const [category, setCategory] = useState<MerchantCategory>('other')
  const [amountInput, setAmountInput] = useState('')
  const [multiple, setMultiple] = useState(user.defaultMultiple)
  const [pinOpen, setPinOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [shake, setShake] = useState(0)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<PaymentResponse | null>(null)

  const amountPaise = parseRupeesInput(amountInput)
  const tooLarge = amountPaise !== null && amountPaise > MAX_PAYMENT_PAISE
  const preview = amountPaise && !tooLarge ? calculateRoundUp(amountPaise, multiple) : null
  const canPay = Boolean(preview && merchant.trim())

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
    setCategory('other')
    setAmountInput('')
    setPin('')
  }

  if (result) {
    return <PaymentSuccess result={result} onDone={() => navigate('/', { replace: true })} onPayAgain={reset} />
  }

  return (
    <Screen>
      <ScreenHeader title="Pay a merchant" subtitle="Simulated payment · no real money moves" back="/" />

      <form
        className="px-5 pb-40"
        onSubmit={(event) => {
          event.preventDefault()
          if (canPay) setPinOpen(true)
        }}
      >
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
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

        <TextField
          className="mt-4"
          label="Paying to"
          value={merchant}
          onChange={(event) => {
            setMerchant(event.target.value.slice(0, 40))
            setCategory(QUICK_MERCHANTS.find((quick) => quick.merchant === event.target.value)?.category ?? 'other')
          }}
          placeholder="Merchant name"
        />

        <div className="mt-6 text-center">
          <label htmlFor="amount" className="text-sm font-semibold text-muted">
            Amount
          </label>
          <div className="mt-1 flex items-center justify-center">
            <span className="text-4xl font-extrabold text-muted">₹</span>
            <input
              id="amount"
              value={amountInput}
              onChange={(event) => setAmountInput(sanitizeAmountInput(event.target.value))}
              inputMode="decimal"
              placeholder="0"
              autoComplete="off"
              className="w-[7ch] bg-transparent text-center text-6xl font-extrabold tracking-tight text-ink outline-none placeholder:text-line-strong"
              style={{ width: `${Math.max(1, amountInput.length || 1) + 0.5}ch` }}
            />
          </div>
          {tooLarge && <p className="mt-1 text-sm font-medium text-loss">Payments are capped at ₹1,00,000</p>}
        </div>

        <div className="mt-6">
          <MultipleChips value={multiple} onChange={setMultiple} />
        </div>

        <div
          className={cn(
            'mt-6 rounded-3xl border p-4 transition-all',
            preview ? 'border-line bg-card' : 'border-dashed border-line-strong/60 bg-transparent',
          )}
          aria-live="polite"
        >
          {preview ? (
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Merchant gets</span>
                <span className="font-bold tabular-nums">{formatPaise(preview.amountPaise)}</span>
              </div>
              <div className="flex justify-center text-line-strong">
                <ArrowDown className="size-4" />
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">You pay (rounded to ₹{multiple})</span>
                <span className="text-lg font-extrabold tabular-nums">{formatPaise(preview.roundedPaise)}</span>
              </div>
              <div
                className={cn(
                  'flex items-center justify-between rounded-2xl px-3 py-2.5',
                  preview.roundUpPaise > 0 ? 'bg-gain/10 text-gain' : 'bg-subtle text-muted',
                )}
              >
                <span className="flex items-center gap-2 text-sm font-bold">
                  <PiggyBank className="size-4" /> To your round-up wallet
                </span>
                <span className="font-extrabold tabular-nums">+{formatPaise(preview.roundUpPaise)}</span>
              </div>
              {preview.roundUpPaise === 0 && (
                <p className="text-xs text-muted">Already a multiple of ₹{multiple}, so there's nothing to round up.</p>
              )}
            </div>
          ) : (
            <p className="py-2 text-center text-sm text-muted">Enter an amount to see your round-up</p>
          )}
        </div>

        <div className="pb-safe absolute inset-x-0 bottom-0 z-10 border-t border-line bg-bg/95 px-5 pt-4 backdrop-blur-md">
          <Button type="submit" size="lg" fullWidth disabled={!canPay} icon={<Lock className="size-4" />}>
            {preview ? `Pay ${formatPaise(preview.roundedPaise)}` : 'Pay'}
          </Button>
        </div>
      </form>

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
            Paying <span className="font-bold text-ink">{formatPaise(preview.roundedPaise)}</span> to{' '}
            <span className="font-bold text-ink">{merchant}</span>
            {preview.roundUpPaise > 0 && (
              <>
                {' '}· <span className="font-bold text-gain">+{formatPaise(preview.roundUpPaise)}</span> saved
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
