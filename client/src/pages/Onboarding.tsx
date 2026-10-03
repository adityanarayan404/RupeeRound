import { ArrowRight, PiggyBank, Sparkles, TrendingUp, Utensils } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import Button from '@/components/Button'
import Logo from '@/components/Logo'
import ProgressRing from '@/components/ProgressRing'
import { cn } from '@/lib/cn'
import { ONBOARDED_KEY, storage } from '@/lib/storage'

function PayArt() {
  return (
    <div className="w-60 -rotate-3 rounded-[28px] border border-line bg-card p-5 shadow-xl shadow-primary/10">
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-subtle text-accent">
          <Utensils className="size-6" />
        </span>
        <div>
          <p className="font-bold">College Canteen</p>
          <p className="text-xs text-muted">Lunch · today</p>
        </div>
      </div>
      <p className="mt-6 text-xs font-semibold text-muted">Bill amount</p>
      <p className="text-5xl font-extrabold tracking-tight">₹32</p>
    </div>
  )
}

function RoundUpArt() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-3 text-4xl font-extrabold">
        <span className="rounded-2xl bg-card px-4 py-3 text-muted line-through decoration-2">₹32</span>
        <ArrowRight className="size-7 text-accent" />
        <span className="rounded-2xl bg-primary px-4 py-3 text-on-primary shadow-lg shadow-primary/30">₹35</span>
      </div>
      <div className="flex items-center gap-2 rounded-full border border-gain/30 bg-gain/10 px-4 py-2 font-bold text-gain">
        <PiggyBank className="size-5" />
        +₹3 to your round-up wallet
      </div>
    </div>
  )
}

function InvestArt() {
  return (
    <div className="flex flex-col items-center gap-5">
      <ProgressRing value={0.62} size={132} stroke={12}>
        <div className="text-center">
          <p className="text-2xl font-extrabold">₹620</p>
          <p className="text-xs font-semibold text-muted">of ₹1,000</p>
        </div>
      </ProgressRing>
      <div className="flex gap-2">
        {['Large Cap', 'Mid Cap', 'Small Cap'].map((label) => (
          <span key={label} className="rounded-full border border-line bg-card px-3 py-1.5 text-xs font-bold">
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

const SLIDES: { title: string; body: string; art: ReactNode }[] = [
  {
    title: 'Pay like you always do',
    body: 'Pay ₹32 at the canteen. RupeeRound rounds it up to the next ₹5, ₹10 or whatever step you pick.',
    art: <PayArt />,
  },
  {
    title: 'Spare change, saved',
    body: 'The extra ₹3 lands in your round-up wallet. Small amounts you would never notice start to add up.',
    art: <RoundUpArt />,
  },
  {
    title: 'Invest when it adds up',
    body: "Once your wallet reaches a fund's minimum, invest it in a Large, Mid or Small Cap fund. Until then it simply carries forward.",
    art: <InvestArt />,
  },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const last = index === SLIDES.length - 1

  function finish() {
    storage.set(ONBOARDED_KEY, '1')
    navigate('/login', { replace: true })
  }

  function goTo(next: number) {
    const track = trackRef.current
    if (!track) return
    track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="pt-safe flex items-center justify-between px-5">
        <Logo size={36} />
        {!last && (
          <button type="button" onClick={finish} className="rounded-full px-3 py-2 text-sm font-semibold text-muted hover:text-ink">
            Skip
          </button>
        )}
      </div>

      <div
        ref={trackRef}
        onScroll={(event) => {
          const track = event.currentTarget
          setIndex(Math.round(track.scrollLeft / track.clientWidth))
        }}
        className="no-scrollbar flex flex-1 snap-x snap-mandatory overflow-x-auto"
      >
        {SLIDES.map((slide, slideIndex) => (
          <section
            key={slide.title}
            aria-hidden={slideIndex !== index}
            className="flex w-full shrink-0 snap-center flex-col px-7"
          >
            <div className="grid flex-1 place-items-center">{slide.art}</div>
            <div className="pb-4">
              <h1 className="text-3xl font-extrabold tracking-tight">{slide.title}</h1>
              <p className="mt-3 text-base leading-relaxed text-muted">{slide.body}</p>
            </div>
          </section>
        ))}
      </div>

      <div className="pb-safe px-7">
        <div className="mb-6 flex gap-2" aria-label={`Slide ${index + 1} of ${SLIDES.length}`}>
          {SLIDES.map((slide, dotIndex) => (
            <button
              key={slide.title}
              type="button"
              aria-label={`Go to slide ${dotIndex + 1}`}
              onClick={() => goTo(dotIndex)}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                dotIndex === index ? 'w-8 bg-primary' : 'w-2 bg-line-strong/60',
              )}
            />
          ))}
        </div>
        <Button
          size="lg"
          fullWidth
          onClick={() => (last ? finish() : goTo(index + 1))}
          icon={last ? <Sparkles className="size-5" /> : undefined}
        >
          {last ? 'Get started' : 'Next'}
        </Button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
          <TrendingUp className="size-3.5" />
          Hackathon prototype · payments and investments are simulated
        </p>
      </div>
    </div>
  )
}
