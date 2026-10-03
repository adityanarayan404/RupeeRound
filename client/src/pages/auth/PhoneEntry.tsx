import { PHONE_REGEX, type CheckPhoneResponse, type OtpRequestResponse } from '@rupeeround/shared'
import { ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import Button from '@/components/Button'
import Logo from '@/components/Logo'
import Screen from '@/components/Screen'
import TextField from '@/components/TextField'
import { api, errorMessage } from '@/lib/api'

export default function PhoneEntry() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const valid = PHONE_REGEX.test(phone)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!valid) {
      setError('Enter your 10-digit mobile number')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const { exists } = await api<CheckPhoneResponse>('/auth/check-phone', { method: 'POST', body: { phone } })
      if (exists) {
        navigate('/login/pin', { state: { phone } })
      } else {
        const otp = await api<OtpRequestResponse>('/auth/otp/request', { method: 'POST', body: { phone } })
        navigate('/login/otp', { state: { phone, demoOtp: otp.demoOtp } })
      }
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <form onSubmit={submit} className="pt-safe pb-safe flex min-h-full flex-col px-6">
        <div className="animate-rise mt-10 flex-1">
          <Logo size={64} />
          <h1 className="mt-8 text-3xl font-extrabold tracking-tight">Enter your mobile number</h1>
          <p className="mt-2 text-muted">We'll use it to log you in. New here? We'll verify it with a one-time code.</p>

          <TextField
            className="mt-8"
            label="Mobile number"
            prefix="+91"
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))
              setError(null)
            }}
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="98765 43210"
            autoFocus
            error={error}
          />

          <div className="mt-6 rounded-2xl border border-dashed border-line-strong/60 bg-subtle/60 p-4 text-sm">
            <p className="font-semibold">Demo account</p>
            <p className="mt-0.5 text-muted">
              Phone <span className="font-bold text-ink">98765 43210</span> · PIN{' '}
              <span className="font-bold text-ink">1234</span>
            </p>
            <button
              type="button"
              onClick={() => setPhone('9876543210')}
              className="mt-2 text-sm font-bold text-primary underline-offset-2 hover:underline"
            >
              Use demo number
            </button>
          </div>
        </div>

        <Button type="submit" size="lg" fullWidth loading={busy} disabled={!valid}>
          Continue
        </Button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted">
          <ShieldCheck className="size-3.5" /> Your PIN is stored encrypted, never in plain text
        </p>
      </form>
    </Screen>
  )
}
