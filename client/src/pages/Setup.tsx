import {
  DEFAULT_ROUND_UP_MULTIPLE,
  calculateRoundUp,
  formatPaise,
  type FundDTO,
  type UserDTO,
} from '@rupeeround/shared'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import Button from '@/components/Button'
import FundCard from '@/components/FundCard'
import MultipleChips from '@/components/MultipleChips'
import Screen from '@/components/Screen'
import Skeleton from '@/components/Skeleton'
import { ErrorMessage } from '@/components/StateMessage'
import { useAuth, useUser } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { api, errorMessage } from '@/lib/api'
import { firstName } from '@/lib/format'
import { useApi } from '@/lib/useApi'

const EXAMPLE_PAISE = 32_00

/** First-run setup: round-up step and which fund the wallet saves towards. */
export default function Setup() {
  const user = useUser()
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const funds = useApi<FundDTO[]>('/funds')
  const [multiple, setMultiple] = useState(user.defaultMultiple || DEFAULT_ROUND_UP_MULTIPLE)
  const [fundId, setFundId] = useState<string | null>(user.selectedFundId)
  const [busy, setBusy] = useState(false)

  const example = calculateRoundUp(EXAMPLE_PAISE, multiple)

  async function finish() {
    if (!fundId) return
    setBusy(true)
    try {
      const updated = await api<UserDTO>('/me', {
        method: 'PATCH',
        body: { defaultMultiple: multiple, selectedFundId: fundId },
      })
      setUser(updated)
      toast({ title: "You're all set", description: 'Make a payment to see your first round-up.', tone: 'success' })
      navigate('/', { replace: true })
    } catch (caught) {
      toast({ title: errorMessage(caught), tone: 'error' })
      setBusy(false)
    }
  }

  return (
    <Screen>
      <div className="pt-safe animate-rise px-5 pb-36">
        <p className="mt-4 text-sm font-semibold text-accent">Hi {firstName(user.name)} 👋</p>
        <h1 className="font-display mt-1 text-[31px]">Set up your round-ups</h1>
        <p className="mt-2 text-muted">You can change both of these later from your profile.</p>

        <section className="mt-8">
          <h2 className="eyebrow mb-3">1. Pick your round-up step</h2>
          <MultipleChips value={multiple} onChange={setMultiple} />
          <div className="mt-3 flex items-center justify-between rounded-2xl bg-subtle/70 px-4 py-3 text-sm">
            <span className="text-muted">A ₹32 payment becomes</span>
            <span className="flex items-center gap-2 font-semibold">
              {formatPaise(example.roundedPaise)}
              <ArrowRight className="size-4 text-muted" />
              <span className="text-gain">+{formatPaise(example.roundUpPaise)} saved</span>
            </span>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="eyebrow">2. Choose a fund to save towards</h2>
          <p className="mb-3 text-sm text-muted">
            Your wallet invests here once it reaches the fund minimum. Minimums are demo values.
          </p>
          {funds.loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-44 rounded-3xl" />
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
                  mode="select"
                  selected={fund.id === fundId}
                  onClick={() => setFundId(fund.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="pb-safe absolute inset-x-0 bottom-0 z-10 border-t border-line bg-bg/95 px-5 pt-4 backdrop-blur-md">
        <Button size="lg" fullWidth disabled={!fundId} loading={busy} onClick={finish}>
          Start saving
        </Button>
      </div>
    </Screen>
  )
}
