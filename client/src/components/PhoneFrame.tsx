import { BatteryFull, Signal, Wifi } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { OverlayContext } from '@/context/OverlayContext'

/** iOS-style status bar around the Dynamic Island, shown only inside the desktop frame. */
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
      className="pointer-events-none absolute inset-x-0 top-0 z-[80] hidden h-[54px] items-center justify-between px-9 pt-1 text-[14px] font-semibold text-ink md:flex"
    >
      <span className="w-16 tabular-nums">{time}</span>
      <div className="flex w-16 items-center justify-end gap-1.5">
        <Signal className="size-4" strokeWidth={2.5} />
        <Wifi className="size-4" strokeWidth={2.5} />
        <BatteryFull className="size-5" strokeWidth={2} />
      </div>
    </div>
  )
}

/**
 * Full screen on a phone. On a laptop or projector the app sits inside an
 * 6.5-inch phone frame (414×896, e.g. iPhone 11 Pro Max), scaled down on short screens so the
 * proportions never change.
 */
export default function PhoneFrame({ children }: { children: ReactNode }) {
  const [overlay, setOverlay] = useState<HTMLDivElement | null>(null)

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-backdrop md:bg-[radial-gradient(ellipse_at_top,#1a1411_0%,#000_60%)] md:p-6">
      <div className="phone relative h-dvh w-full overflow-hidden bg-bg md:aspect-[414/896] md:h-auto md:w-[min(414px,calc((100dvh-3rem)*414/896))] md:rounded-[60px] md:border-[11px] md:border-frame md:shadow-[0_0_0_1.5px_#4a4846,0_50px_100px_-20px_rgba(0,0,0,0.8)]">
        {/* Dynamic Island */}
        <div
          aria-hidden
          className="absolute top-[11px] left-1/2 z-[90] hidden h-[34px] w-[122px] -translate-x-1/2 rounded-full bg-black md:block"
        />
        <StatusBar />
        <OverlayContext.Provider value={overlay}>
          <div className="relative h-full">{children}</div>
        </OverlayContext.Provider>
        <div ref={setOverlay} className="pointer-events-none absolute inset-0 z-50" />
        {/* Home indicator */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-2 left-1/2 z-[90] hidden h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-ink/80 md:block"
        />
      </div>
    </div>
  )
}
