import { cn } from '@/lib/cn'

interface ChoiceChipsProps<T extends string> {
  legend: string
  options: { value: T; label: string }[]
  value: T | null
  onChange: (value: T) => void
}

/** Single-choice chips, styled like MultipleChips, for short questionnaire answers. */
export default function ChoiceChips<T extends string>({ legend, options, value, onChange }: ChoiceChipsProps<T>) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-ink">{legend}</legend>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'min-h-11 rounded-2xl border px-2 py-2 text-sm leading-tight font-semibold transition-all',
              value === option.value
                ? 'border-primary bg-primary text-on-primary shadow-md shadow-black/20'
                : 'border-line bg-card text-ink hover:bg-subtle',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
