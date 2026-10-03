import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface ProgressRingProps {
  /** 0–1 */
  value: number
  size?: number
  stroke?: number
  complete?: boolean
  children?: ReactNode
}

export default function ProgressRing({ value, size = 64, stroke = 7, complete, children }: ProgressRingProps) {
  const clamped = Math.min(1, Math.max(0, value))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-subtle" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          className={cn(
            'transition-[stroke-dashoffset] duration-700 ease-out',
            complete ? 'stroke-gain' : 'stroke-accent',
          )}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}
