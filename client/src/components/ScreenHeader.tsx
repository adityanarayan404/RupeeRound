import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'

interface ScreenHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  /** Show a back button. Goes back in history, or to this path if there is none. */
  back?: string
  right?: ReactNode
}

export default function ScreenHeader({ title, subtitle, back, right }: ScreenHeaderProps) {
  const navigate = useNavigate()

  function goBack() {
    const index = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (index > 0) navigate(-1)
    else navigate(back ?? '/', { replace: true })
  }

  return (
    <header className="pt-safe sticky top-0 z-20 bg-bg/90 px-5 pb-3 backdrop-blur-md">
      <div className="flex min-h-11 items-center gap-3">
        {back !== undefined && (
          <button
            type="button"
            onClick={goBack}
            aria-label="Back"
            className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-card transition-colors hover:bg-subtle"
          >
            <ArrowLeft className="size-5" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold tracking-tight">{title}</h1>
          {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
        </div>
        {right}
      </div>
    </header>
  )
}
