import { BatteryFull, Signal, Wifi } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { OverlayContext } from '@/context/OverlayContext'

/** Fake iOS-style status bar, shown only inside the desktop phone frame. */
function StatusBar() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])
  const time = now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: false })

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 z-[80] hidden h-11 items-center justify-between px-8 text-[15px] font-semibold text-ink md:flex"
    >
      <span className="tabular-nums">{time}</span>
      <div className="flex items-center gap-1.5">
        <Signal className="size-4" strokeWidth={2.5} />
        <Wifi className="size-4" strokeWidth={2.5} />
        <BatteryFull className="size-5" strokeWidth={2} />
      </div>
    </div>
  )
}

/**
 * Full screen on a phone; on a laptop or projector the app sits inside a
 * centred 390×844 phone with a dynamic island and status bar.
 */
export default function PhoneFrame({ children }: { children: ReactNode }) {
  const [overlay, setOverlay] = useState<HTMLDivElement | null>(null)

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-backdrop md:p-6">
      <div className="phone relative h-dvh w-full overflow-hidden bg-bg md:h-[844px] md:max-h-[calc(100dvh-3rem)] md:w-[390px] md:rounded-[56px] md:border-[12px] md:border-frame md:shadow-[0_40px_80px_-20px_rgba(40,25,20,0.45)]">
        <div
          aria-hidden
          className="absolute top-2.5 left-1/2 z-[90] hidden h-[30px] w-[108px] -translate-x-1/2 rounded-full bg-frame md:block"
        />
        <StatusBar />
        <OverlayContext.Provider value={overlay}>
          <div className="relative h-full">{children}</div>
        </OverlayContext.Provider>
        <div ref={setOverlay} className="pointer-events-none absolute inset-0 z-50" />
      </div>
    </div>
  )
}
