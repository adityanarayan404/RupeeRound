import type { AuthResponse } from '@rupeeround/shared'
import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import PinPad from '@/components/PinPad'
import { useAuth } from '@/context/AuthContext'
import { api, errorMessage } from '@/lib/api'
import { formatPhone } from '@/lib/format'
import AuthScreen from './AuthScreen'

export default function EnterPin() {
  const { signIn } = useAuth()
  const state = useLocation().state as { phone?: string } | null
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(0)
  const [busy, setBusy] = useState(false)

  async function login(phone: string, value: string) {
    setBusy(true)
    try {
      signIn(await api<AuthResponse>('/auth/login', { method: 'POST', body: { phone, pin: value } }))
    } catch (caught) {
      setError(errorMessage(caught))
      setShake((count) => count + 1)
      setPin('')
      setBusy(false)
    }
  }

  if (!state?.phone) return <Navigate to="/login" replace />
  const phone = state.phone

  return (
    <AuthScreen
      back="/login"
      title="Welcome back"
      description={
        <>
          Enter the PIN for <span className="font-bold text-ink">{formatPhone(phone)}</span>
        </>
      }
    >
      <div className="flex flex-1 flex-col justify-end pb-6">
        <PinPad
          value={pin}
          onChange={(value) => {
            setPin(value)
            setError(null)
            if (value.length === 4) void login(phone, value)
          }}
          error={error}
          shakeKey={shake}
          disabled={busy}
        />
        <Link to="/login" replace className="mt-2 self-center text-sm font-semibold text-muted hover:text-ink">
          Not you? Change number
        </Link>
      </div>
    </AuthScreen>
  )
}
