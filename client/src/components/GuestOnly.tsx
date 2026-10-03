import { Navigate, Outlet } from 'react-router'
import { useAuth } from '@/context/AuthContext'
import Splash from './Splash'

/** Login/onboarding screens. Signed-in users skip them; new accounts go to setup first. */
export default function GuestOnly() {
  const { status, user, retry } = useAuth()

  if (status === 'loading') return <Splash />
  if (status === 'offline') return <Splash offline onRetry={retry} />
  if (status === 'authed' && user) {
    return <Navigate to={user.selectedFundId ? '/' : '/setup'} replace />
  }
  return <Outlet />
}
