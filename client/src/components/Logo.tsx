import { cn } from '@/lib/cn'

/** Coin with a rising arrow: spare change that grows. */
export default function Logo({ size = 56, withName = false, className }: { size?: number; withName?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
        <defs>
          <linearGradient id="rr-logo-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#A47864" />
            <stop offset="1" stopColor="#56443E" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="18" fill="url(#rr-logo-bg)" />
        <circle cx="32" cy="32" r="19" fill="#F1F0E2" />
        <circle cx="32" cy="32" r="15" fill="none" stroke="#C39D88" strokeWidth="1.5" />
        <path
          d="M23 38 l6.5 -6.5 l4.5 4 l8 -9"
          fill="none"
          stroke="#8B645A"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M36.5 26.5 h5.5 v5.5" fill="none" stroke="#8B645A" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {withName && <span className="text-2xl font-extrabold tracking-tight">RupeeRound</span>}
    </div>
  )
}
