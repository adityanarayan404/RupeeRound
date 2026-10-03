import { cn } from '@/lib/cn'

export default function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton rounded-xl', className)} />
}

/** Placeholder for a list of transaction-style rows. */
export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-label="Loading">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-11 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  )
}
