/** Animated tick in a circle, used after a payment or investment. */
export default function SuccessCheck({ size = 96 }: { size?: number }) {
  return (
    <div
      className="animate-pop grid place-items-center rounded-full bg-ink/10"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 52 52" width={size * 0.62} height={size * 0.62}>
        <circle cx="26" cy="26" r="24" className="fill-ink" />
        <path
          d="M15 27 l7 7 l15 -16"
          fill="none"
          className="stroke-bg"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="40"
          strokeDashoffset="40"
          style={{ animation: 'draw-check 420ms 260ms ease-out forwards' }}
        />
      </svg>
      <style>{'@keyframes draw-check { to { stroke-dashoffset: 0 } }'}</style>
    </div>
  )
}
