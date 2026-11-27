'use client'

import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

type ToastVariant = 'success' | 'info' | 'error'
type Toast = { id: number; title: string; description?: string; variant: ToastVariant }

const ToastContext = createContext<((t: Omit<Toast, 'id' | 'variant'> & { variant?: ToastVariant }) => void) | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

const icons = { success: CheckCircle2, info: Info, error: XCircle }
const variantStyles: Record<
  ToastVariant,
  { card: string; iconWrap: string; title: string }
> = {
  success: {
    card: 'border-emerald-400/70 bg-gradient-to-br from-[#0b2329] via-[#0a1b2b] to-[#081523] shadow-[0_20px_70px_rgba(0,0,0,0.8),0_0_40px_rgba(52,211,153,0.28)]',
    iconWrap: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300',
    title: 'text-emerald-200',
  },
  info: {
    card: 'border-neon/70 bg-gradient-to-br from-[#082234] via-[#0a1b2b] to-[#081523] shadow-[0_20px_70px_rgba(0,0,0,0.8),0_0_40px_rgba(0,242,254,0.28)]',
    iconWrap: 'border-neon/50 bg-neon/15 text-neon',
    title: 'text-neon',
  },
  error: {
    card: 'border-rose-500/75 bg-gradient-to-br from-[#2a0f18] via-[#1b0e19] to-[#0c121e] shadow-[0_20px_70px_rgba(0,0,0,0.8),0_0_40px_rgba(244,63,94,0.3)]',
    iconWrap: 'border-rose-400/55 bg-rose-500/15 text-rose-300',
    title: 'text-rose-200',
  },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const push = useCallback(
    ({ variant = 'success', ...rest }: Omit<Toast, 'id' | 'variant'> & { variant?: ToastVariant }) => {
      const id = Date.now() + Math.random()
      setToasts((t) => [...t.slice(-2), { id, variant, ...rest }])
      setTimeout(() => dismiss(id), variant === 'error' ? 4800 : 3400)
    },
    [dismiss],
  )

  useEffect(() => {
    if (toasts.length === 0) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setToasts([])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toasts.length])

  return (
    <ToastContext.Provider value={push}>
      {children}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="pointer-events-none fixed inset-0 z-[120] flex flex-col items-center justify-center gap-3 p-4"
        >
          {toasts.map((t) => {
            const Icon = icons[t.variant]
            const styles = variantStyles[t.variant]
            return (
              <div
                key={t.id}
                role="status"
                onClick={() => dismiss(t.id)}
                className={cn(
                  'pointer-events-auto relative flex w-full max-w-md cursor-pointer items-center gap-4 rounded-2xl border-2 px-5 py-4 backdrop-blur-md animate-in zoom-in-95 fade-in duration-200',
                  styles.card,
                )}
              >
                <span
                  className={cn(
                    'flex size-11 shrink-0 items-center justify-center rounded-full border',
                    styles.iconWrap,
                  )}
                >
                  <Icon className="size-6" aria-hidden />
                </span>
                <div className="min-w-0 flex-1 pr-4">
                  <p className={cn('font-display text-base font-bold leading-snug', styles.title)}>{t.title}</p>
                  {t.description && (
                    <p className="mt-1 text-xs leading-relaxed text-foreground/90">{t.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    dismiss(t.id)
                  }}
                  className="absolute top-2.5 right-2.5 cursor-pointer rounded-md p-1 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                  aria-label="Bildirimi kapat"
                >
                  <X className="size-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </ToastContext.Provider>
  )
}
