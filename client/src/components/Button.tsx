import { LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size = 'md' | 'lg' | 'sm'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
  icon?: ReactNode
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary shadow-md shadow-primary/25 hover:bg-primary-strong',
  secondary: 'bg-subtle text-ink hover:bg-tan/70',
  outline: 'border border-line-strong/70 bg-card text-ink hover:bg-subtle',
  ghost: 'text-primary hover:bg-subtle',
  danger: 'bg-loss/10 text-loss hover:bg-loss/15',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm rounded-xl',
  md: 'h-12 px-5 text-[15px] rounded-2xl',
  lg: 'h-14 px-6 text-base rounded-2xl',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <LoaderCircle className="size-5 animate-spin" /> : icon}
      {children}
    </button>
  )
}
