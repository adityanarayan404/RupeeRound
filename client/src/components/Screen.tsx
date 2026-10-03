import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Scrollable full-height screen for routes outside the tab layout. */
export default function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('no-scrollbar h-full overflow-y-auto', className)}>{children}</div>
}
