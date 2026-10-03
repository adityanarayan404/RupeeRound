import { Navigate, Outlet } from 'react-router'
import { useAuth } from '@/context/AuthContext'
import { ONBOARDED_KEY, storage } from '@/lib/storage'
import Splash from './Splash'

/** Signed-in screens. Guests go to onboarding the first time, then to login. */
export default function RequireAuth() {
  const { status, retry } = useAuth()

  if (status === 'loading') return <Splash />
  if (status === 'offline') return <Splash offline onRetry={retry} />
  if (status === 'guest') {
    return <Navigate to={storage.get(ONBOARDED_KEY) ? '/login' : '/welcome'} replace />
  }
  return <Outlet />
}
