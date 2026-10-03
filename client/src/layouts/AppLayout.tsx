import { Outlet, useLocation } from 'react-router'
import TabBar from '@/components/TabBar'
import { cn } from '@/lib/cn'

/** Screens that manage their own scrolling (a chat with an input pinned above the tab bar). */
const FIXED_LAYOUT_PATHS = ['/advisor']

/** The tab screens share one scroll area above the bottom bar. */
export default function AppLayout() {
  const { pathname } = useLocation()
  const fixed = FIXED_LAYOUT_PATHS.includes(pathname)

  return (
    <div className="relative h-full">
      {/* Keyed by path so each tab starts scrolled to the top. */}
      <main
        key={pathname}
        className={cn(
          'animate-fade-in h-full',
          fixed ? 'overflow-hidden' : 'no-scrollbar overflow-y-auto pb-[calc(var(--tabbar-h)+3rem)]',
        )}
      >
        <Outlet />
      </main>
      <TabBar />
    </div>
  )
}
