import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { cn } from '@/lib/cn'

interface ScreenHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  /** Show a back button. Goes back in history, or to this path if there is none. */
  back?: string
  right?: ReactNode
}

/** Walks up to the element that actually scrolls (the screen, not the window). */
function scrollParent(element: HTMLElement | null): HTMLElement | null {
  let node = element?.parentElement ?? null
  while (node) {
    const { overflowY } = getComputedStyle(node)
    if (overflowY === 'auto' || overflowY === 'scroll') return node
    node = node.parentElement
  }
  return null
}

/**
 * Large serif title that stays pinned. Transparent at the top of the screen;
 * once you scroll it gains a frosted background and the title eases smaller.
 */
export default function ScreenHeader({ title, subtitle, back, right }: ScreenHeaderProps) {
  const navigate = useNavigate()
  const headerRef = useRef<HTMLElement>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const scroller = scrollParent(headerRef.current)
    if (!scroller) return
    const onScroll = () => setScrolled(scroller.scrollTop > 8)
    onScroll()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [])

  function goBack() {
    const index = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (index > 0) navigate(-1)
    else navigate(back ?? '/', { replace: true })
  }

  return (
    <header
      ref={headerRef}
      className={cn(
        'pt-safe sticky top-0 z-20 px-5 pb-3 transition-[background-color,border-color,backdrop-filter] duration-300',
        scrolled ? 'border-b border-line bg-bg/75 backdrop-blur-xl' : 'border-b border-transparent bg-transparent',
      )}
    >
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
          <h1
            className={cn(
              'font-display origin-left truncate text-[27px] transition-transform duration-300 ease-out',
              scrolled && 'scale-[0.82]',
            )}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className={cn(
                'truncate text-[13px] text-muted transition-[opacity,height] duration-300',
                scrolled ? 'h-0 opacity-0' : 'h-5 opacity-100',
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
        {right}
      </div>
    </header>
  )
}
