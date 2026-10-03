import type { AuthResponse, UserDTO } from '@rupeeround/shared'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, api, setUnauthorizedHandler, tokenStore } from '@/lib/api'
import { clearApiCache } from '@/lib/useApi'

/** offline = we have a token but couldn't reach the server to check it. */
export type AuthStatus = 'loading' | 'authed' | 'guest' | 'offline'

interface AuthContextValue {
  status: AuthStatus
  user: UserDTO | null
  signIn: (auth: AuthResponse) => void
  signOut: () => void
  setUser: (user: UserDTO) => void
  retry: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() => (tokenStore.get() ? 'loading' : 'guest'))
  const [user, setUserState] = useState<UserDTO | null>(null)

  const signOut = useCallback(() => {
    tokenStore.clear()
    clearApiCache()
    setUserState(null)
    setStatus('guest')
  }, [])

  const restoreSession = useCallback(async () => {
    if (!tokenStore.get()) {
      setStatus('guest')
      return
    }
    setStatus('loading')
    try {
      setUserState(await api<UserDTO>('/me'))
      setStatus('authed')
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) signOut()
      else setStatus('offline')
    }
  }, [signOut])

  useEffect(() => {
    void restoreSession()
  }, [restoreSession])

  useEffect(() => {
    setUnauthorizedHandler(signOut)
    return () => setUnauthorizedHandler(null)
  }, [signOut])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      signIn: (auth) => {
        tokenStore.set(auth.token)
        clearApiCache()
        setUserState(auth.user)
        setStatus('authed')
      },
      signOut,
      setUser: setUserState,
      retry: () => void restoreSession(),
    }),
    [status, user, signOut, restoreSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

/** For screens behind RequireAuth, where the user is always loaded. */
export function useUser(): UserDTO {
  const { user } = useAuth()
  if (!user) throw new Error('useUser called without a signed-in user')
  return user
}
