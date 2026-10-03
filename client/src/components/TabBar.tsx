import { CircleUser, House, IndianRupee, Target, TrendingUp, type LucideIcon } from 'lucide-react'
import { Link, NavLink } from 'react-router'
import { cn } from '@/lib/cn'

function Tab({ to, label, icon: Icon }: { to: string; label: string; icon: LucideIcon }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-semibold transition-colors',
          isActive ? 'text-primary' : 'text-muted/70 hover:text-muted',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="size-6" strokeWidth={isActive ? 2.4 : 1.9} />
          {label}
        </>
      )}
    </NavLink>
  )
}

/** Home · Invest · (Pay) · Goals · Profile, with Pay raised in the middle. */
export default function TabBar() {
  return (
    <nav
      aria-label="Main"
      className="absolute inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 px-2 pb-[var(--safe-bottom)] backdrop-blur-md"
    >
      <div className="flex items-end">
        <Tab to="/" label="Home" icon={House} />
        <Tab to="/invest" label="Invest" icon={TrendingUp} />
        <div className="flex flex-1 justify-center">
          <Link
            to="/pay"
            aria-label="Pay and round up"
            className="-mt-7 mb-1 flex flex-col items-center gap-1 text-[11px] font-bold text-primary"
          >
            <span className="grid size-16 place-items-center rounded-full bg-primary text-on-primary shadow-lg shadow-primary/40 ring-4 ring-bg transition-transform active:scale-95">
              <IndianRupee className="size-7" strokeWidth={2.4} />
            </span>
            Pay
          </Link>
        </div>
        <Tab to="/goals" label="Goals" icon={Target} />
        <Tab to="/profile" label="Profile" icon={CircleUser} />
      </div>
    </nav>
  )
}
