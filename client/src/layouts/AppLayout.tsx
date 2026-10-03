import { Outlet, useLocation } from 'react-router'
import TabBar from '@/components/TabBar'

/** The four tabs share one scroll area above the bottom bar. */
export default function AppLayout() {
  const { pathname } = useLocation()

  return (
    <div className="relative h-full">
      {/* Keyed by path so each tab starts scrolled to the top. */}
      <main key={pathname} className="no-scrollbar animate-fade-in h-full overflow-y-auto pb-[calc(var(--safe-bottom)+7rem)]">
        <Outlet />
      </main>
      <TabBar />
    </div>
  )
}
