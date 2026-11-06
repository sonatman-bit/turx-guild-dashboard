'use client'

import {
  CalendarClock,
  Coins,
  LayoutDashboard,
  Lock,
  Menu,
  MessageSquareLock,
  ScrollText,
  Shield,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { canAccessAdminPanel } from '@/lib/turx-identity'
import { TurxLogo } from './logo'
import { AuthNavbarWidget, useAuth } from './auth-provider'

export type TabId = 'overview' | 'roster' | 'applications' | 'strategy' | 'raids' | 'bank' | 'anonymous' | 'profile' | 'admin'

export const NAV_ITEMS: { id: TabId; label: string; short: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Genel Bakış', short: 'Dashboard', icon: LayoutDashboard },
  { id: 'roster', label: 'Guild Kadrosu', short: 'Roster & Analitik', icon: Users },
  { id: 'applications', label: 'Guild Başvuru', short: 'Recruitment', icon: UserPlus },
  { id: 'strategy', label: 'Strateji Merkezi', short: 'Attunement & WeakAura', icon: ScrollText },
  { id: 'raids', label: 'Raid Takvimi', short: 'Kadro Onay Sistemi', icon: CalendarClock },
  { id: 'bank', label: 'Guild Bankası', short: 'Malzeme Talebi', icon: Coins },
  { id: 'anonymous', label: 'Anonim Mesaj Kutusu', short: 'GM & Officer', icon: MessageSquareLock },
  { id: 'admin', label: 'GM Yönetim Paneli', short: 'Yetkili Kontrolü', icon: Shield },
]

function NavList({
  active,
  onSelect,
  navigationLocked = false,
}: {
  active: TabId
  onSelect: (id: TabId) => void
  navigationLocked?: boolean
}) {
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const showAdmin = mounted && canAccessAdminPanel(user?.role)
  const items = NAV_ITEMS.filter((item) => item.id !== 'admin' || showAdmin)

  return (
    <nav aria-label="Ana menü" className="flex flex-col gap-1">
      {navigationLocked && (
        <div className="mb-2 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-[11px] leading-relaxed text-gold">
          <p className="flex items-center gap-1.5 font-semibold">
            <Lock className="size-3.5 shrink-0" />
            Profil kilidi
          </p>
          <p className="mt-1 text-muted-foreground">
            Profil bilgileri ve en az bir Main karakter kaydedilene kadar menü kapalı.
          </p>
        </div>
      )}
      {items.map(({ id, label, short, icon: Icon }) => {
        const isActive = active === id
        const itemLocked = navigationLocked && id !== 'profile'
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            disabled={itemLocked}
            aria-disabled={itemLocked || undefined}
            aria-current={isActive ? 'page' : undefined}
            title={itemLocked ? 'Önce profilini tamamla' : undefined}
            className={cn(
              'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition',
              itemLocked
                ? 'cursor-not-allowed opacity-45'
                : isActive
                  ? 'cursor-pointer bg-gradient-to-r from-neon/15 to-transparent text-foreground'
                  : 'cursor-pointer text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-foreground',
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

function SidebarBody({
  active,
  onSelect,
  navigationLocked = false,
}: {
  active: TabId
  onSelect: (id: TabId) => void
  navigationLocked?: boolean
}) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center gap-3 px-1">
        <TurxLogo className="h-14 w-auto drop-shadow-[0_0_12px_rgb(0_242_254/0.35)]" />
        <div>
          <p className="font-display text-2xl leading-none font-black tracking-widest text-gold text-glow-gold">TURX</p>
          <p className="mt-1 font-display text-[10px] tracking-[0.3em] text-neon">TURX FOREVER</p>
        </div>
      </div>
      <NavList active={active} onSelect={onSelect} navigationLocked={navigationLocked} />
      <div className="mt-auto rounded-xl border border-gold/25 bg-gradient-to-br from-gold/10 to-transparent p-4">
        <div className="flex items-center gap-2 text-gold">
          <Shield className="size-4" />
          <span className="font-display text-xs font-bold tracking-wider">ALLIANCE PvE (EU)</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          WoW: Forever Classic+ · İlk günden Phase 1 raid hazırlıkları
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
  navigationLocked = false,
}: {
  active: TabId
  onSelect: (id: TabId) => void
  mobileOpen: boolean
  onCloseMobile: () => void
  navigationLocked?: boolean
}) {
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseMobile()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mobileOpen, onCloseMobile])

  return (
    <>
      <aside className="sticky top-11 hidden h-[calc(100dvh-2.75rem)] w-72 shrink-0 border-r border-sidebar-border bg-sidebar/90 backdrop-blur lg:block">
        <SidebarBody active={active} onSelect={onSelect} navigationLocked={navigationLocked} />
      </aside>

      <div className={cn('fixed inset-0 z-[60] lg:hidden', mobileOpen ? 'pointer-events-auto' : 'pointer-events-none')}>
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
            className="absolute top-4 right-3 rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground cursor-pointer"
            aria-label="Menüyü kapat"
          >
            <X className="size-5" />
          </button>
          <SidebarBody
            active={active}
            navigationLocked={navigationLocked}
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

export function Header({ 
  active, 
  onSelect, 
  onOpenMobile, 
  mobileOpen 
}: { 
  active: TabId
  onSelect: (id: TabId) => void
  onOpenMobile: () => void
  mobileOpen: boolean 
}) {
  return (
    <header className="sticky top-11 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <button
          onClick={onOpenMobile}
          className="rounded-lg border border-border p-2 text-silver hover:border-neon/40 hover:text-neon lg:hidden cursor-pointer"
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
              <span className="hidden font-display text-xs tracking-[0.25em] text-neon sm:inline">FOREVER</span>
            </p>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full border border-azure/40 bg-azure/10 px-3 py-1 text-xs font-semibold text-azure md:inline-flex">
            <Shield className="size-3.5" />
            Alliance PvE (EU)
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <AuthNavbarWidget onNavigate={onSelect} />
        </div>
      </div>
    </header>
  )
}