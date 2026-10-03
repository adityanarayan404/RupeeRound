import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label: string
  prefix?: ReactNode
  hint?: ReactNode
  error?: string | null
}

export default function TextField({ label, prefix, hint, error, className, id, ...rest }: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-muted">
        {label}
      </label>
      <div
        className={cn(
          'flex h-14 items-center gap-2 rounded-2xl border bg-card px-4 transition-colors focus-within:border-accent',
          error ? 'border-loss' : 'border-line',
        )}
      >
        {prefix && <span className="font-semibold text-muted">{prefix}</span>}
        <input
          id={inputId}
          aria-invalid={Boolean(error)}
          className="h-full min-w-0 flex-1 bg-transparent text-base font-semibold text-ink outline-none placeholder:font-medium placeholder:text-muted/50"
          {...rest}
        />
      </div>
      {error ? (
        <p className="mt-1.5 text-sm font-medium text-loss">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-sm text-muted">{hint}</p>
      )}
    </div>
  )
}
