import type { NavSource } from '@rupeeround/shared'
import { cn } from '@/lib/cn'

const LABELS: Record<NavSource, string> = {
  live: 'Live NAV · mfapi.in',
  cached: 'Saved NAV · refreshing soon',
  demo: 'Demo NAV · live data unavailable',
}

export default function NavBadge({ source }: { source: NavSource }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted">
      <span
        className={cn(
          'size-1.5 rounded-full',
          source === 'live' && 'bg-gain',
          source === 'cached' && 'bg-accent-soft',
          source === 'demo' && 'bg-loss',
        )}
      />
      {LABELS[source]}
    </span>
  )
}
