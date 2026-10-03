import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useOverlayRoot } from '@/context/OverlayContext'

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

/** Bottom sheet that slides up inside the phone frame. */
export default function Sheet({ open, onClose, title, children }: SheetProps) {
  const overlay = useOverlayRoot()
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  // Move focus into the sheet so typing (e.g. a PIN) doesn't go to the field underneath.
  useEffect(() => {
    if (open && overlay) dialogRef.current?.focus({ preventScroll: true })
  }, [open, overlay])

  if (!open || !overlay) return null

  return createPortal(
    <div className="pointer-events-auto absolute inset-0 z-40 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 bg-[#1f1410]/45 backdrop-blur-[2px]"
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-sheet-up pb-safe no-scrollbar relative max-h-[92%] overflow-y-auto rounded-t-[32px] bg-card px-5 pt-3 shadow-2xl outline-none"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line-strong/50" />
        {title && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid size-9 place-items-center rounded-full bg-subtle text-muted hover:text-ink"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    overlay,
  )
}
