import { cn } from '@/lib/cn'

export default function ProgressBar({
  value,
  className,
  barClassName,
}: {
  /** 0–1 */
  value: number
  className?: string
  barClassName?: string
}) {
  const clamped = Math.min(1, Math.max(0, value))
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      className={cn('h-2 overflow-hidden rounded-full bg-subtle', className)}
    >
      <div
        className={cn('h-full rounded-full bg-accent transition-[width] duration-700 ease-out', barClassName)}
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  )
}
