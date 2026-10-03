import { useRef } from 'react'
import { cn } from '@/lib/cn'

interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  length?: number
  error?: boolean
  disabled?: boolean
}

/** Six boxes over one real input, so paste and SMS autofill both work. */
export default function OtpInput({ value, onChange, length = 6, error, disabled }: OtpInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="relative" onClick={() => inputRef.current?.focus()}>
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, length))}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        disabled={disabled}
        aria-label="One-time password"
        className="peer absolute inset-0 opacity-0"
      />
      <div className="flex justify-between gap-2">
        {Array.from({ length }, (_, index) => {
          const active = index === Math.min(value.length, length - 1)
          return (
            <span
              key={index}
              className={cn(
                'grid h-14 flex-1 place-items-center rounded-2xl border-2 bg-card text-2xl font-semibold transition-colors',
                error ? 'border-loss text-loss' : 'border-line',
                !error && active && 'peer-focus:border-accent',
              )}
            >
              {value[index] ?? ''}
            </span>
          )
        })}
      </div>
    </div>
  )
}
