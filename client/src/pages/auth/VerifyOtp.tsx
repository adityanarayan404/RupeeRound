import { OTP_LENGTH, type OtpRequestResponse, type OtpVerifyResponse } from '@rupeeround/shared'
import { MessageSquareText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import Button from '@/components/Button'
import OtpInput from '@/components/OtpInput'
import { useToast } from '@/context/ToastContext'
import { api, errorMessage } from '@/lib/api'
import { formatPhone } from '@/lib/format'
import AuthScreen from './AuthScreen'

const RESEND_SECONDS = 30

export default function VerifyOtp() {
  const navigate = useNavigate()
  const toast = useToast()
  const state = useLocation().state as { phone?: string; demoOtp?: string } | null
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [demoOtp, setDemoOtp] = useState(state?.demoOtp)
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS)

  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = window.setTimeout(() => setSecondsLeft((seconds) => seconds - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [secondsLeft])

  async function verify(code: string) {
    if (!state?.phone) return
    setBusy(true)
    setError(null)
    try {
      const { signupToken } = await api<OtpVerifyResponse>('/auth/otp/verify', {
        method: 'POST',
        body: { phone: state.phone, otp: code },
      })
      navigate('/login/create', { replace: true, state: { phone: state.phone, signupToken } })
    } catch (caught) {
      setError(errorMessage(caught))
      setOtp('')
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    if (!state?.phone) return
    try {
      const response = await api<OtpRequestResponse>('/auth/otp/request', { method: 'POST', body: { phone: state.phone } })
      setDemoOtp(response.demoOtp)
      setSecondsLeft(RESEND_SECONDS)
      setError(null)
      toast({ title: 'New code sent', tone: 'success' })
    } catch (caught) {
      toast({ title: errorMessage(caught), tone: 'error' })
    }
  }

  if (!state?.phone) return <Navigate to="/login" replace />

  return (
    <AuthScreen
      back="/login"
      title="Verify your number"
      description={
        <>
          Enter the 6-digit code sent to <span className="font-bold text-ink">{formatPhone(state.phone)}</span>
        </>
      }
      footer={
        <Button size="lg" fullWidth loading={busy} disabled={otp.length !== OTP_LENGTH} onClick={() => verify(otp)}>
          Verify
        </Button>
      }
    >
      <OtpInput
        value={otp}
        disabled={busy}
        error={Boolean(error)}
        onChange={(value) => {
          setOtp(value)
          setError(null)
          if (value.length === OTP_LENGTH) void verify(value)
        }}
      />
      {error && <p className="mt-3 text-sm font-medium text-loss">{error}</p>}

      {demoOtp && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-subtle/70 p-4 text-sm">
          <MessageSquareText className="mt-0.5 size-5 shrink-0 text-accent" />
          <p className="text-muted">
            Demo mode: no SMS is sent. Your code is <span className="font-extrabold tracking-widest text-ink">{demoOtp}</span>
          </p>
        </div>
      )}

      <p className="mt-6 text-sm text-muted">
        Didn't get it?{' '}
        {secondsLeft > 0 ? (
          <span>Resend in {secondsLeft}s</span>
        ) : (
          <button type="button" onClick={resend} className="font-bold text-primary hover:underline">
            Resend code
          </button>
        )}
      </p>
    </AuthScreen>
  )
}
