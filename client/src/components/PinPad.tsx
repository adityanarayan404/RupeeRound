import { Delete } from 'lucide-react'
import { useEffect } from 'react'
import { cn } from '@/lib/cn'

interface PinPadProps {
  value: string
  onChange: (value: string) => void
  length?: number
  error?: string | null
  /** Change this (e.g. a counter) to replay the shake animation. */
  shakeKey?: number
  disabled?: boolean
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'] as const

/** PIN dots plus a big numeric keypad. Physical keyboards work too, for desktop demos. */
export default function PinPad({ value, onChange, length = 4, error, shakeKey = 0, disabled }: PinPadProps) {
  function press(key: string) {
    if (disabled) return
    if (key === 'back') onChange(value.slice(0, -1))
    else if (value.length < length) onChange(value + key)
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      if (/^\d$/.test(event.key)) press(event.key)
      else if (event.key === 'Backspace') press('back')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  return (
    <div className="flex flex-col items-center">
      <div key={shakeKey} className={cn('flex gap-4', shakeKey > 0 && 'animate-shake')} aria-label={`${value.length} of ${length} digits entered`}>
        {Array.from({ length }, (_, index) => (
          <span
            key={index}
            className={cn(
              'size-4 rounded-full border-2 transition-all',
              index < value.length ? 'scale-110 border-primary bg-primary' : 'border-line-strong',
              error && 'border-loss',
              error && index < value.length && 'bg-loss',
            )}
          />
        ))}
      </div>
      <p className={cn('mt-3 h-5 text-sm font-medium', error ? 'text-loss' : 'text-transparent')} role="alert">
        {error ?? '.'}
      </p>
      <div className="mt-4 grid w-full max-w-[300px] grid-cols-3 gap-3">
        {KEYS.map((key, index) =>
          key === '' ? (
            <span key={index} />
          ) : (
            <button
              key={index}
              type="button"
              disabled={disabled}
              onClick={() => press(key)}
              aria-label={key === 'back' ? 'Delete' : key}
              className="grid h-16 place-items-center rounded-2xl text-2xl font-semibold text-ink transition-colors hover:bg-subtle active:bg-line disabled:opacity-50"
            >
              {key === 'back' ? <Delete className="size-6" /> : key}
            </button>
          ),
        )}
      </div>
    </div>
  )
}
