import { calculateRoundUp, formatPaise, type FundDTO, type UserDTO } from '@rupeeround/shared'
import {
  ChevronRight,
  Download,
  Info,
  KeyRound,
  ListChecks,
  LogOut,
  Moon,
  Repeat,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import Button from '@/components/Button'
import Card from '@/components/Card'
import MultipleChips from '@/components/MultipleChips'
import PinPad from '@/components/PinPad'
import RiskSheet, { describeRiskProfile } from '@/components/RiskSheet'
import ScreenHeader from '@/components/ScreenHeader'
import Sheet from '@/components/Sheet'
import Switch from '@/components/Switch'
import { useAuth, useUser } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { useToast } from '@/context/ToastContext'
import { api, errorMessage } from '@/lib/api'
import { formatLongDate, formatPhone, initials } from '@/lib/format'
import { canInstall, isStandalone, promptInstall, subscribeInstall } from '@/lib/install'
import { useApi } from '@/lib/useApi'

function Row({ icon: Icon, label, value, onClick, right }: { icon: LucideIcon; label: string; value?: ReactNode; onClick?: () => void; right?: ReactNode }) {
  const content = (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-subtle text-accent">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{label}</span>
        {value && <span className="block truncate text-sm text-muted">{value}</span>}
      </span>
      {right ?? (onClick && <ChevronRight className="size-5 text-muted" />)}
    </>
  )
  return onClick ? (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 py-3 text-left">
      {content}
    </button>
  ) : (
    <div className="flex items-center gap-3 py-3">{content}</div>
  )
}

function MultipleSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useUser()
  const { setUser } = useAuth()
  const toast = useToast()
  const [multiple, setMultiple] = useState(user.defaultMultiple)
  const [busy, setBusy] = useState(false)
  const example = calculateRoundUp(32_00, multiple)

  async function save() {
    setBusy(true)
    try {
      setUser(await api<UserDTO>('/me', { method: 'PATCH', body: { defaultMultiple: multiple } }))
      toast({ title: `Payments now round up to the next ₹${multiple}`, tone: 'success' })
      onClose()
    } catch (caught) {
      toast({ title: errorMessage(caught), tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Default round-up">
      <MultipleChips value={multiple} onChange={setMultiple} />
      <p className="mt-3 rounded-2xl bg-subtle/70 px-4 py-3 text-sm text-muted">
        A ₹32 payment becomes <span className="font-bold text-ink">{formatPaise(example.roundedPaise)}</span>, saving{' '}
        <span className="font-bold text-gain">{formatPaise(example.roundUpPaise)}</span>.
      </p>
      <Button className="mt-5" size="lg" fullWidth loading={busy} onClick={save}>
        Save
      </Button>
    </Sheet>
  )
}

type PinStep = 'current' | 'new' | 'confirm'
const PIN_TITLES: Record<PinStep, string> = {
  current: 'Enter your current PIN',
  new: 'Choose a new PIN',
  confirm: 'Confirm your new PIN',
}

function ChangePinSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const [step, setStep] = useState<PinStep>('current')
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(0)
  const [busy, setBusy] = useState(false)

  function reset() {
    setStep('current')
    setCurrentPin('')
    setNewPin('')
    setValue('')
    setError(null)
  }

  function fail(message: string, restart: PinStep) {
    setError(message)
    setShake((count) => count + 1)
    setValue('')
    setStep(restart)
  }

  async function onChange(next: string) {
    setValue(next)
    setError(null)
    if (next.length < 4) return

    if (step === 'current') {
      setCurrentPin(next)
      setValue('')
      setStep('new')
    } else if (step === 'new') {
      setNewPin(next)
      setValue('')
      setStep('confirm')
    } else if (next !== newPin) {
      fail("PINs don't match. Choose your new PIN again.", 'new')
    } else {
      setBusy(true)
      try {
        await api('/me/pin', { method: 'POST', body: { currentPin, newPin } })
        toast({ title: 'PIN changed', tone: 'success' })
        reset()
        onClose()
      } catch (caught) {
        fail(errorMessage(caught), 'current')
      } finally {
        setBusy(false)
      }
    }
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        if (busy) return
        reset()
        onClose()
      }}
      title={PIN_TITLES[step]}
    >
      <PinPad value={value} onChange={onChange} error={error} shakeKey={shake} disabled={busy} />
    </Sheet>
  )
}

export default function Profile() {
  const user = useUser()
  const { signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const funds = useApi<FundDTO[]>('/funds')
  const [sheet, setSheet] = useState<'multiple' | 'pin' | 'logout' | 'risk' | null>(null)
  const [installable, setInstallable] = useState(canInstall)
  const fund = funds.data?.find((candidate) => candidate.id === user.selectedFundId)

  useEffect(() => subscribeInstall(() => setInstallable(canInstall())), [])

  return (
    <>
      <ScreenHeader title="Profile" />
      <div className="space-y-4 px-5">
        <Card className="flex items-center gap-4 p-5">
          <span className="grid size-16 shrink-0 place-items-center rounded-full bg-tan text-2xl font-extrabold text-primary-strong dark:text-ink">
            {initials(user.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold">{user.name}</p>
            <p className="text-sm text-muted">{formatPhone(user.phone)}</p>
            <p className="text-xs text-muted">Member since {formatLongDate(user.createdAt)}</p>
          </div>
        </Card>

        <Card className="divide-y divide-line py-1">
          <Row icon={Repeat} label="Default round-up" value={`Next ₹${user.defaultMultiple}`} onClick={() => setSheet('multiple')} />
          <Row
            icon={TrendingUp}
            label="Saving towards"
            value={fund ? fund.shortName : 'No fund chosen'}
            onClick={() => navigate(fund ? `/invest/${fund.id}` : '/invest')}
          />
          <Row icon={ListChecks} label="Risk answers" value={describeRiskProfile(user)} onClick={() => setSheet('risk')} />
          <Row
            icon={Moon}
            label="Dark mode"
            right={<Switch label="Dark mode" checked={theme === 'dark'} onChange={(on) => setTheme(on ? 'dark' : 'light')} />}
          />
          <Row icon={KeyRound} label="Change PIN" onClick={() => setSheet('pin')} />
          {!isStandalone() && (
            <Row
              icon={Download}
              label="Install app"
              value={installable ? 'Add RupeeRound to your home screen' : "Use your browser's \"Add to Home Screen\""}
              onClick={installable ? () => void promptInstall() : undefined}
            />
          )}
        </Card>

        <Button variant="danger" size="lg" fullWidth icon={<LogOut className="size-5" />} onClick={() => setSheet('logout')}>
          Log out
        </Button>

        <p className="flex gap-2 pb-2 text-xs text-muted">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          RupeeRound is a hackathon prototype. Payments and investments are simulated and no real money moves. A real
          launch would need UPI and mutual-fund partners, KYC, and regulatory approval.
        </p>
      </div>

      {sheet === 'multiple' && <MultipleSheet open onClose={() => setSheet(null)} />}
      {sheet === 'risk' && <RiskSheet open onClose={() => setSheet(null)} />}
      <ChangePinSheet open={sheet === 'pin'} onClose={() => setSheet(null)} />
      <Sheet open={sheet === 'logout'} onClose={() => setSheet(null)} title="Log out?">
        <p className="-mt-2 text-sm text-muted">You'll need your phone number and PIN to log back in.</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="secondary" size="lg" onClick={() => setSheet(null)}>
            Cancel
          </Button>
          <Button variant="danger" size="lg" onClick={signOut}>
            Log out
          </Button>
        </div>
      </Sheet>
    </>
  )
}
