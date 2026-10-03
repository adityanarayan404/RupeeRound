import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export default function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-3xl border border-line bg-card p-4', className)} {...rest} />
}
