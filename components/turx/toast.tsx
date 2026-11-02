'use client'

import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useState } from 'react'
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
const accents = {
  success: 'text-success border-success/40',
  info: 'text-neon border-neon/40',
  error: 'text-destructive border-destructive/40',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const push = useCallback(
    ({ variant = 'success', ...rest }: Omit<Toast, 'id' | 'variant'> & { variant?: ToastVariant }) => {
      const id = Date.now() + Math.random()
      setToasts((t) => [...t.slice(-3), { id, variant, ...rest }])
      setTimeout(() => dismiss(id), 3800)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => {
          const Icon = icons[t.variant]
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-lg border bg-[#0a1a2b]/95 p-4 shadow-[0_0_30px_rgb(0_242_254/0.12)] backdrop-blur animate-in slide-in-from-right-8 fade-in',
                accents[t.variant],
              )}
            >
              <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{t.title}</p>
                {t.description && <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                aria-label="Bildirimi kapat"
              >
                <X className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
