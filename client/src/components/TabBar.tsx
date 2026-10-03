import { Bot, House, QrCode, ReceiptText, TrendingUp, type LucideIcon } from 'lucide-react'
import { Link, NavLink } from 'react-router'
import { cn } from '@/lib/cn'

/** Shared label style so every tab's text sits on the same line. */
const LABEL = 'text-[9.5px] leading-none font-medium tracking-[-0.01em] whitespace-nowrap'

function Tab({ to, label, icon: Icon }: { to: string; label: string; icon: LucideIcon }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center justify-center gap-[5px] transition-colors',
          isActive ? 'text-ink' : 'text-muted/70 hover:text-muted',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="size-[19px]" strokeWidth={isActive ? 2.1 : 1.7} />
          <span className={LABEL}>{label}</span>
        </>
      )}
    </NavLink>
  )
}

/** Home · Transactions · (Scan) · Portfolio · AI Advisor: five equal columns, Scan exactly in the middle. Settings opens from the profile avatar on Home. */
export default function TabBar() {
  return (
    <nav
      aria-label="Main"
      className="absolute inset-x-0 bottom-0 z-30 border-t border-line bg-bg/75 pb-[var(--safe-bottom)] backdrop-blur-xl"
    >
      {/* 54px tall: keep in sync with --tabbar-h in index.css */}
      <div className="grid h-[54px] grid-cols-5">
        <Tab to="/" label="Home" icon={House} />
        <Tab to="/transactions" label="Transactions" icon={ReceiptText} />
        <Link
          to="/pay?scan=1"
          aria-label="Scan and pay"
          className="relative flex flex-col items-center justify-center gap-[5px] text-ink"
        >
          {/* The circle floats above the bar; an invisible spacer keeps the label level with the others. */}
          <span className="absolute -top-[22px] left-1/2 grid size-[52px] -translate-x-1/2 place-items-center rounded-full bg-primary text-on-primary shadow-lg shadow-black/30 ring-4 ring-bg transition-transform active:scale-95">
            <QrCode className="size-6" strokeWidth={2} />
          </span>
          <span aria-hidden className="size-[19px]" />
          <span className={cn(LABEL, 'font-semibold tracking-[0.12em] uppercase')}>Scan</span>
        </Link>
        <Tab to="/portfolio" label="Portfolio" icon={TrendingUp} />
        <Tab to="/advisor" label="AI Advisor" icon={Bot} />
      </div>
    </nav>
  )
}
