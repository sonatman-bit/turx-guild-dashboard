'use client'

import {
  CalendarClock,
  Coins,
  LayoutDashboard,
  Menu,
  MessageSquareLock,
  ScrollText,
  Shield,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import Image from 'next/image'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { TurxLogo } from './logo'

export type TabId = 'overview' | 'raids' | 'roster' | 'bank' | 'strategy' | 'recruit' | 'feedback'

export const NAV_ITEMS: { id: TabId; label: string; short: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Genel Bakış', short: 'Dashboard', icon: LayoutDashboard },
  { id: 'raids', label: 'PvE Raid Takvimi', short: 'Kadro Onay Sistemi', icon: CalendarClock },
  { id: 'roster', label: 'Lonca Kadrosu', short: 'Roster & Analitik', icon: Users },
  { id: 'bank', label: 'Guild Bankası', short: 'Malzeme Talebi', icon: Coins },
  { id: 'strategy', label: 'Strateji Merkezi', short: 'Attunement & WeakAura', icon: ScrollText },
  { id: 'recruit', label: 'Başvuru', short: 'Recruitment', icon: UserPlus },
  { id: 'feedback', label: 'Anonim Mesaj Kutusu', short: 'GM & Officer', icon: MessageSquareLock },
]

function NavList({ active, onSelect }: { active: TabId; onSelect: (id: TabId) => void }) {
  return (
    <nav aria-label="Ana menü" className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ id, label, short, icon: Icon }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition',
              isActive
                ? 'bg-gradient-to-r from-neon/15 to-transparent text-foreground'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-foreground',
            )}
          >
            {isActive && (
              <span className="absolute top-1/2 left-0 h-6 w-0.5 -translate-y-1/2 rounded-full bg-neon shadow-[0_0_10px_#00f2fe]" />
            )}
            <Icon className={cn('size-5 shrink-0', isActive ? 'text-neon' : 'text-muted-foreground group-hover:text-silver')} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{label}</span>
              <span className="truncate text-[11px] text-muted-foreground">{short}</span>
            </span>
          </button>
        )
      })}
    </nav>
  )
}

function SidebarBody({ active, onSelect }: { active: TabId; onSelect: (id: TabId) => void }) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center gap-3 px-1">
        <TurxLogo className="h-14 w-auto drop-shadow-[0_0_12px_rgb(0_242_254/0.35)]" />
        <div>
          <p className="font-display text-2xl leading-none font-black tracking-widest text-gold text-glow-gold">TURX</p>
          <p className="mt-1 font-display text-[10px] tracking-[0.3em] text-neon">TURX FOREVER</p>
        </div>
      </div>
      <NavList active={active} onSelect={onSelect} />
      <div className="mt-auto rounded-xl border border-gold/25 bg-gradient-to-br from-gold/10 to-transparent p-4">
        <div className="flex items-center gap-2 text-gold">
          <Shield className="size-4" />
          <span className="font-display text-xs font-bold tracking-wider">ALLIANCE PvE (EU)</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          WoW: Forever Classic+ · Haftalık Raid: Çarşamba & Pazar 21:00 (TR)
        </p>
      </div>
    </div>
  )
}

export function Sidebar({
  active,
  onSelect,
  mobileOpen,
  onCloseMobile,
}: {
  active: TabId
  onSelect: (id: TabId) => void
  mobileOpen: boolean
  onCloseMobile: () => void
}) {
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseMobile()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mobileOpen, onCloseMobile])

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 border-r border-sidebar-border bg-sidebar/90 backdrop-blur lg:block">
        <SidebarBody active={active} onSelect={onSelect} />
      </aside>

      <div className={cn('fixed inset-0 z-50 lg:hidden', mobileOpen ? 'pointer-events-auto' : 'pointer-events-none')}>
        <div
          className={cn('absolute inset-0 bg-black/70 transition-opacity', mobileOpen ? 'opacity-100' : 'opacity-0')}
          onClick={onCloseMobile}
          aria-hidden
        />
        <aside
          id="mobile-nav"
          aria-label="Mobil menü"
          aria-hidden={!mobileOpen}
          inert={!mobileOpen}
          className={cn(
            'absolute inset-y-0 left-0 w-[84%] max-w-xs border-r border-sidebar-border bg-sidebar shadow-2xl transition-transform duration-300',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <button
            onClick={onCloseMobile}
            className="absolute top-4 right-3 rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            aria-label="Menüyü kapat"
          >
            <X className="size-5" />
          </button>
          <SidebarBody
            active={active}
            onSelect={(id) => {
              onSelect(id)
              onCloseMobile()
            }}
          />
        </aside>
      </div>
    </>
  )
}

export function Header({ onOpenMobile, mobileOpen }: { onOpenMobile: () => void; mobileOpen: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <button
          onClick={onOpenMobile}
          className="rounded-lg border border-border p-2 text-silver hover:border-neon/40 hover:text-neon lg:hidden"
          aria-label="Menüyü aç"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
        >
          <Menu className="size-5" />
        </button>

        <div className="flex min-w-0 items-center gap-3">
          <TurxLogo className="h-9 w-auto lg:hidden" />
          <div className="min-w-0">
            <p className="flex items-baseline gap-2">
              <span className="font-display text-lg font-black tracking-widest text-gold">TURX</span>
              <span className="hidden font-display text-xs tracking-[0.25em] text-neon sm:inline">TURX FOREVER</span>
            </p>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full border border-azure/40 bg-azure/10 px-3 py-1 text-xs font-semibold text-azure md:inline-flex">
            <Shield className="size-3.5" />
            Alliance PvE (EU)
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3 rounded-full border border-border bg-card/70 py-1 pr-1 pl-1 sm:pr-3">
          <div className="relative">
            <Image
              src="/images/avatar.png"
              alt="Aslanyürek Discord avatarı"
              width={36}
              height={36}
              className="size-9 rounded-full border border-gold/50 object-cover"
            />
            <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-card bg-success" aria-hidden />
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-semibold" style={{ color: '#C69B6D' }}>
              Aslanyürek
            </p>
            <p className="text-[11px] text-muted-foreground">Officer · Kaan#0420</p>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full border border-success/50 bg-success/10 px-2.5 py-1 text-[11px] font-bold tracking-wide text-success shadow-[0_0_14px_rgb(62_224_127/0.35)] md:inline-flex">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            Raid Ready
          </span>
        </div>
      </div>
    </header>
  )
}
