import { ROUND_UP_MULTIPLES } from '@rupeeround/shared'
import { cn } from '@/lib/cn'

interface MultipleChipsProps {
  value: number
  onChange: (multiple: number) => void
  label?: string
}

/** ₹5 / ₹10 / ₹20 / ₹50 / ₹100 round-up step picker. */
export default function MultipleChips({ value, onChange, label = 'Round up to the next' }: MultipleChipsProps) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-muted">{label}</legend>
      <div className="grid grid-cols-5 gap-2">
        {ROUND_UP_MULTIPLES.map((multiple) => (
          <button
            key={multiple}
            type="button"
            aria-pressed={value === multiple}
            onClick={() => onChange(multiple)}
            className={cn(
              'h-11 rounded-2xl border text-sm font-semibold transition-all',
              value === multiple
                ? 'border-primary bg-primary text-on-primary shadow-md shadow-black/20'
                : 'border-line bg-card text-ink hover:bg-subtle',
            )}
          >
            ₹{multiple}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
