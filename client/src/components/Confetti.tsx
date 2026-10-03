import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useOverlayRoot } from '@/context/OverlayContext'

const COLORS = ['#A47864', '#C39D88', '#E4C7B8', '#8B645A', '#BAAA91', '#4F7D52', '#F1F0E2']
const DURATION_MS = 2600

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rotation: number
  spin: number
  color: string
  round: boolean
}

/** One burst of confetti inside the phone frame. Skipped for reduced-motion users. */
export default function Confetti() {
  const overlay = useOverlayRoot()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const ratio = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    canvas.width = width * ratio
    canvas.height = height * ratio
    context.scale(ratio, ratio)

    const particles: Particle[] = Array.from({ length: 140 }, () => ({
      x: width / 2 + (Math.random() - 0.5) * 60,
      y: height * 0.32,
      vx: (Math.random() - 0.5) * 11,
      vy: -Math.random() * 12 - 4,
      size: 5 + Math.random() * 6,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      round: Math.random() < 0.3,
    }))

    const start = performance.now()
    let frame = 0
    function draw(now: number) {
      const elapsed = now - start
      context!.clearRect(0, 0, width, height)
      context!.globalAlpha = Math.max(0, 1 - elapsed / DURATION_MS)
      for (const particle of particles) {
        particle.vy += 0.32
        particle.vx *= 0.99
        particle.x += particle.vx
        particle.y += particle.vy
        particle.rotation += particle.spin
        context!.save()
        context!.translate(particle.x, particle.y)
        context!.rotate(particle.rotation)
        context!.fillStyle = particle.color
        if (particle.round) {
          context!.beginPath()
          context!.arc(0, 0, particle.size / 2, 0, Math.PI * 2)
          context!.fill()
        } else {
          context!.fillRect(-particle.size / 2, -particle.size / 4, particle.size, particle.size / 2)
        }
        context!.restore()
      }
      if (elapsed < DURATION_MS) frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [overlay])

  if (!overlay) return null
  return createPortal(<canvas ref={canvasRef} aria-hidden className="absolute inset-0 z-[60] h-full w-full" />, overlay)
}
