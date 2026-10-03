import type { AuthResponse } from '@rupeeround/shared'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import Button from '@/components/Button'
import PinPad from '@/components/PinPad'
import TextField from '@/components/TextField'
import { useAuth } from '@/context/AuthContext'
import { ApiError, api, errorMessage } from '@/lib/api'
import AuthScreen from './AuthScreen'

type Step = 'name' | 'pin' | 'confirm'

export default function CreateAccount() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const state = useLocation().state as { phone?: string; signupToken?: string } | null
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(0)
  const [busy, setBusy] = useState(false)

  if (!state?.signupToken) return <Navigate to="/login" replace />
  const signupToken = state.signupToken

  async function register() {
    setBusy(true)
    try {
      const auth = await api<AuthResponse>('/auth/register', {
        method: 'POST',
        body: { signupToken, name: name.trim(), pin },
      })
      signIn(auth) // GuestOnly then sends the new user to /setup
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'signup_expired') {
        navigate('/login', { replace: true })
        return
      }
      setError(errorMessage(caught))
      setConfirmPin('')
      setBusy(false)
    }
  }

  function onConfirmChange(value: string) {
    setConfirmPin(value)
    setError(null)
    if (value.length < 4) return
    if (value !== pin) {
      setError("PINs don't match. Try again.")
      setShake((count) => count + 1)
      setConfirmPin('')
      return
    }
    void register()
  }

  if (step === 'name') {
    const submitName = (event: FormEvent) => {
      event.preventDefault()
      if (name.trim()) setStep('pin')
    }
    return (
      <form onSubmit={submitName} className="h-full">
        <AuthScreen
          back="/login"
          title="What should we call you?"
          description="This is how you'll appear in the app."
          footer={
            <Button type="submit" size="lg" fullWidth disabled={!name.trim()}>
              Continue
            </Button>
          }
        >
          <TextField
            label="Your name"
            value={name}
            onChange={(event) => setName(event.target.value.slice(0, 40))}
            autoComplete="name"
            placeholder="e.g. Aarav Sharma"
            autoFocus
          />
        </AuthScreen>
      </form>
    )
  }

  return (
    <AuthScreen
      key={step}
      title={step === 'pin' ? 'Create a 4-digit PIN' : 'Confirm your PIN'}
      description={step === 'pin' ? "You'll use it to log in and to confirm every payment." : 'Enter the same PIN again.'}
    >
      <div className="flex flex-1 flex-col justify-end pb-6">
        {step === 'pin' ? (
          <PinPad
            value={pin}
            onChange={(value) => {
              setPin(value)
              if (value.length === 4) window.setTimeout(() => setStep('confirm'), 150)
            }}
          />
        ) : (
          <>
            <PinPad value={confirmPin} onChange={onConfirmChange} error={error} shakeKey={shake} disabled={busy} />
            <button
              type="button"
              onClick={() => {
                setStep('pin')
                setPin('')
                setConfirmPin('')
                setError(null)
              }}
              className="mt-2 self-center text-sm font-semibold text-muted hover:text-ink"
            >
              Start over
            </button>
          </>
        )}
      </div>
    </AuthScreen>
  )
}
