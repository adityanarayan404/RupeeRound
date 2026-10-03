import { WifiOff } from 'lucide-react'
import Button from './Button'
import Logo from './Logo'

/** Shown while the saved session is checked, or when the server can't be reached. */
export default function Splash({ offline, onRetry }: { offline?: boolean; onRetry?: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-8 text-center">
      <div className={offline ? '' : 'animate-pulse'}>
        <Logo size={72} />
      </div>
      {offline && (
        <div className="animate-rise space-y-4">
          <div className="flex items-center justify-center gap-2 text-muted">
            <WifiOff className="size-5" />
            <p className="font-semibold">Can't reach RupeeRound</p>
          </div>
          <p className="text-sm text-muted">Check your connection, or make sure the API server is running.</p>
          <Button onClick={onRetry}>Try again</Button>
        </div>
      )}
    </div>
  )
}
