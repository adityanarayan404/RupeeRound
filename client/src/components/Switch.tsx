import { cn } from '@/lib/cn'

export default function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-7 w-12 shrink-0 rounded-full transition-colors',
        checked ? 'bg-primary' : 'bg-line-strong/60',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 size-6 rounded-full bg-card shadow transition-transform',
          checked && 'translate-x-5',
        )}
      />
    </button>
  )
}
