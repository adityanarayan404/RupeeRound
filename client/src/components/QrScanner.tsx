import jsQR from 'jsqr'
import { Camera, ImageUp, Store, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useOverlayRoot } from '@/context/OverlayContext'
import { demoUpiQr, parseUpiQr, type ScannedPayment } from '@/lib/upi'

interface QrScannerProps {
  onResult: (payment: ScannedPayment) => void
  onClose: () => void
}

type CameraState = 'starting' | 'live' | 'unavailable' | 'denied'

/** Largest side we decode at; smaller is faster and still reads QR codes fine. */
const DECODE_SIZE = 480

/** Finds a QR code in an image/video frame drawn onto `canvas`. */
function decode(canvas: HTMLCanvasElement, source: CanvasImageSource, width: number, height: number): string | null {
  const scale = Math.min(1, DECODE_SIZE / Math.max(width, height))
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  const image = context.getImageData(0, 0, canvas.width, canvas.height)
  return jsQR(image.data, image.width, image.height, { inversionAttempts: 'attemptBoth' })?.data ?? null
}

/**
 * Full-screen UPI QR scanner inside the phone frame.
 * Live camera where the browser allows it (HTTPS or localhost), plus a
 * "scan from photo" fallback that works everywhere.
 */
export default function QrScanner({ onResult, onClose }: QrScannerProps) {
  const overlay = useOverlayRoot()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [camera, setCamera] = useState<CameraState>('starting')
  const [hint, setHint] = useState<string | null>(null)
  const doneRef = useRef(false)

  function handleText(text: string): boolean {
    const payment = parseUpiQr(text)
    if (!payment) {
      setHint("That QR isn't a UPI payment code. Try a shop's UPI QR.")
      return false
    }
    doneRef.current = true
    navigator.vibrate?.(40)
    onResult(payment)
    return true
  }

  // Live camera: open the back camera and look for a QR a few times a second.
  useEffect(() => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCamera('unavailable')
      return
    }
    let stream: MediaStream | null = null
    let timer = 0
    let cancelled = false

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then(async (media) => {
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop())
          return
        }
        stream = media
        const video = videoRef.current
        if (!video) return
        video.srcObject = media
        await video.play().catch(() => {})
        setCamera('live')

        const scan = () => {
          if (cancelled || doneRef.current) return
          const canvas = canvasRef.current
          if (canvas && video.videoWidth) {
            const text = decode(canvas, video, video.videoWidth, video.videoHeight)
            if (text && handleText(text)) return
          }
          timer = window.setTimeout(scan, 160)
        }
        scan()
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setCamera((error as Error).name === 'NotAllowedError' ? 'denied' : 'unavailable')
      })

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      stream?.getTracks().forEach((track) => track.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Photo fallback: decode a picture of a QR (opens the camera app on phones).
  function onPhoto(file: File | undefined) {
    if (!file) return
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      const canvas = canvasRef.current
      const text = canvas ? decode(canvas, image, image.naturalWidth, image.naturalHeight) : null
      URL.revokeObjectURL(url)
      if (!text) setHint("Couldn't find a QR code in that photo. Try again, closer and in focus.")
      else handleText(text)
    }
    image.src = url
  }

  if (!overlay) return null

  const message =
    camera === 'denied'
      ? 'Camera permission was blocked. Allow it in your browser settings, or scan from a photo.'
      : camera === 'unavailable'
        ? 'Live camera needs HTTPS (or localhost). Scan from a photo instead; it works everywhere.'
        : null

  return createPortal(
    <div className="animate-fade-in pointer-events-auto absolute inset-0 z-[65] flex flex-col bg-black text-white">
      <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />
      {/* Darken everything except the viewfinder. */}
      <div aria-hidden className="absolute inset-0 bg-black/45" />

      <div className="pt-safe relative flex items-center justify-between px-5">
        <div>
          <p className="font-display text-[18px]">Scan to pay</p>
          <p className="text-[13px] text-white/60">Any UPI QR · simulated payment</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close scanner"
          className="grid size-10 place-items-center rounded-full bg-white/10 backdrop-blur hover:bg-white/20"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-8">
        <div className="relative size-64">
          {/* Viewfinder corners */}
          {['top-0 left-0 border-t-2 border-l-2 rounded-tl-3xl', 'top-0 right-0 border-t-2 border-r-2 rounded-tr-3xl', 'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-3xl', 'bottom-0 right-0 border-b-2 border-r-2 rounded-br-3xl'].map(
            (corner) => (
              <span key={corner} className={`absolute size-10 border-white ${corner}`} />
            ),
          )}
          {camera === 'live' ? (
            <span className="absolute inset-x-4 top-4 h-0.5 animate-[scan-line_2.2s_ease-in-out_infinite] rounded-full bg-white/80 shadow-[0_0_16px_rgba(255,255,255,0.7)]" />
          ) : (
            <div className="absolute inset-0 grid place-items-center">
              <Camera className="size-10 text-white/40" />
            </div>
          )}
        </div>
        <p className="mt-6 max-w-[260px] text-center text-sm text-white/75" role="status">
          {hint ?? message ?? (camera === 'starting' ? 'Opening camera…' : 'Point at a shop’s UPI QR code')}
        </p>
      </div>

      <div className="pb-safe relative space-y-2.5 px-5">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            onPhoto(event.target.files?.[0])
            event.target.value = ''
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-white font-semibold text-black active:scale-[0.98]"
        >
          <ImageUp className="size-5" /> Scan from photo
        </button>
        <button
          type="button"
          onClick={() => handleText(demoUpiQr())}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white/10 font-medium text-white backdrop-blur active:scale-[0.98]"
        >
          <Store className="size-4" /> Use a demo shop QR
        </button>
      </div>
      <style>{'@keyframes scan-line { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(220px) } }'}</style>
    </div>,
    overlay,
  )
}
