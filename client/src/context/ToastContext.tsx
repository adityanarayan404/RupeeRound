import { CircleAlert, CircleCheck, Info } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'
import { useOverlayRoot } from './OverlayContext'

type Tone = 'success' | 'error' | 'info'

interface Toast {
  id: number
  title: string
  description?: string
  tone: Tone
}

type ShowToast = (toast: { title: string; description?: string; tone?: Tone }) => void

const ToastContext = createContext<ShowToast | null>(null)

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info }

export default function ToastProvider({ children }: { children: ReactNode }) {
  const overlay = useOverlayRoot()
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = useCallback<ShowToast>(({ title, description, tone = 'info' }) => {
    const id = Date.now() + Math.random()
    setToasts((current) => [...current.slice(-2), { id, title, description, tone }])
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3200)
  }, [])

  const value = useMemo(() => show, [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {overlay &&
        createPortal(
          <div
            aria-live="polite"
            className="pointer-events-none absolute inset-x-0 top-[calc(var(--safe-top)+8px)] z-[70] flex flex-col items-center gap-2 px-4"
          >
            {toasts.map((toast) => {
              const Icon = ICONS[toast.tone]
              return (
                <div
                  key={toast.id}
                  role="status"
                  className="animate-toast pointer-events-auto flex w-full items-start gap-3 rounded-2xl border border-line bg-card px-4 py-3 shadow-lg shadow-black/10"
                >
                  <Icon
                    className={cn(
                      'mt-0.5 size-5 shrink-0',
                      toast.tone === 'success' && 'text-gain',
                      toast.tone === 'error' && 'text-loss',
                      toast.tone === 'info' && 'text-accent',
                    )}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{toast.title}</p>
                    {toast.description && <p className="text-xs text-muted">{toast.description}</p>}
                  </div>
                </div>
              )
            })}
          </div>,
          overlay,
        )}
    </ToastContext.Provider>
  )
}

export function useToast(): ShowToast {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
