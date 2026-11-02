'use client'

import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    panelRef.current?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prev?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'glow-border relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-[#0b1b2d] p-6 shadow-[0_0_60px_rgb(0_242_254/0.15)] animate-in fade-in zoom-in-95 sm:rounded-2xl',
          className,
        )}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="font-display text-xl font-bold text-gold">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          <button
            data-close
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
            aria-label="Kapat"
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function Panel({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn('panel p-5', className)} {...props}>
      {children}
    </section>
  )
}

export function PanelTitle({
  icon: Icon,
  children,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 font-display text-sm font-bold tracking-wider text-silver uppercase">
        {Icon && <Icon className="size-4 text-neon" />}
        {children}
      </h3>
      {action}
    </div>
  )
}

export function GoldButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-[#e8c65a] to-[#b8922a] px-4 py-2 text-sm font-semibold text-[#1a1305] shadow-[0_0_20px_rgb(212_175_55/0.3)] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export function GhostButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg border border-neon/30 bg-neon/5 px-4 py-2 text-sm font-medium text-neon transition hover:bg-neon/10 hover:shadow-[0_0_16px_rgb(0_242_254/0.25)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium tracking-wide text-silver uppercase">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

export const inputClass =
  'w-full rounded-lg border border-input bg-[#071422] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-neon focus:outline-none focus:ring-2 focus:ring-neon/20'

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap', className)}>
      {children}
    </span>
  )
}

export function SectionHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-neon uppercase">{eyebrow}</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-balance text-foreground md:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-pretty text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}
