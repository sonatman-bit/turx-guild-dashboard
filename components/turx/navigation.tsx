'use client'

import {
  Award,
  CalendarCheck,
  ClipboardList,
  Coins,
  LayoutDashboard,
  Lock,
  Map,
  Menu,
  MessageSquareLock,
  Pencil,
  ScrollText,
  Shield,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { PublicModuleFlags } from '@/lib/raid-loot-system'
import { isEditablePageId } from '@/lib/site-copy'
import { canAccessAdminPanel } from '@/lib/turx-identity'
import { TurxLogo } from './logo'
import { AuthNavbarWidget, useAuth } from './auth-provider'
import { useSiteCopy } from './site-copy-provider'

export type TabId =
  | 'overview'
  | 'roster'
  | 'applications'
  | 'strategy'
  | 'raid-signup'
  | 'loot'
  | 'attendance'
  | 'roadmap'
  | 'bank'
  | 'anonymous'
  | 'profile'
  | 'admin'

export type NavSection = 'public' | 'member' | 'staff'

export const NAV_ITEMS: {
  id: TabId
  label: string
  short: string
  icon: React.ComponentType<{ className?: string }>
  section: NavSection
  moduleFlag?: keyof PublicModuleFlags
}[] = [
  { id: 'overview', label: 'Genel Bakış', short: 'Dashboard', icon: LayoutDashboard, section: 'public' },
  { id: 'roadmap', label: 'Road Map', short: 'Sistem Sunumu & Rehber', icon: Map, section: 'public' },
  { id: 'roster', label: 'Guild Kadrosu', short: 'Roster & Analitik', icon: Users, section: 'public' },
  { id: 'applications', label: 'Guild Başvuru', short: 'Recruitment', icon: UserPlus, section: 'public' },
  { id: 'strategy', label: 'Strateji Merkezi', short: 'Attunement & WeakAura', icon: ScrollText, section: 'public' },
  { id: 'anonymous', label: 'Anonim Mesaj Kutusu', short: 'GM & Görevli', icon: MessageSquareLock, section: 'public' },
  { id: 'raid-signup', label: 'Raid Kayıt', short: 'Takvim & 4 Rol Panosu', icon: CalendarCheck, section: 'member', moduleFlag: 'raidSignup' },
  { id: 'loot', label: 'Loot Sistemi', short: 'Öncelik & BoE/BoP', icon: Award, section: 'member', moduleFlag: 'loot' },
  { id: 'attendance', label: 'Devam Takibi', short: 'Puan & İlk 50 Raider', icon: ClipboardList, section: 'member', moduleFlag: 'attendance' },
  { id: 'bank', label: 'Guild Bank', short: 'Malzeme Talebi', icon: Coins, section: 'member', moduleFlag: 'bank' },
  { id: 'admin', label: 'GM Yönetim Paneli', short: 'Yetkili Kontrolü', icon: Shield, section: 'staff' },
]

function NavList({
  active,
  onSelect,
  navigationLocked = false,
  publicModules,
  unreadAnonymousCount = 0,
}: {
  active: TabId
  onSelect: (id: TabId) => void
  navigationLocked?: boolean
  publicModules: PublicModuleFlags
  unreadAnonymousCount?: number
}) {
  const { user } = useAuth()
  const { copy, isGm, openEditorForPage, pageOverrideCount } = useSiteCopy()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isLoggedIn = mounted && Boolean(user)
  const showAdmin = mounted && canAccessAdminPanel(user?.role)
  const showGmEdit = mounted && isGm
  const items = NAV_ITEMS.filter((item) => {
    if (item.section === 'staff') return showAdmin
    if (item.section === 'member') {
      if (!isLoggedIn) return false
      if (item.moduleFlag) {
        return showAdmin || Boolean(publicModules[item.moduleFlag])
      }
      return true
    }
    return true
  })

  return (
    <nav aria-label="Ana menü" className="flex flex-col gap-1">
      {navigationLocked && (
        <div className="mb-2 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-[11px] leading-relaxed text-gold">
          <p className="flex items-center gap-1.5 font-semibold">
            <Lock className="size-3.5 shrink-0" />
            Profil kilidi
          </p>
          <p className="mt-1 text-muted-foreground">
            5 adımlı profil ve WoW Armory (TURX) doğrulaması tamamlanana kadar menü kapalı.
          </p>
        </div>
      )}
      {items.map((item, idx) => {
        const { id, label: defaultLabel, short: defaultShort, icon: Icon, section, moduleFlag } = item
        const label = isEditablePageId(id) ? copy(`nav.${id}.label`) || defaultLabel : defaultLabel
        const short = isEditablePageId(id) ? copy(`nav.${id}.short`) || defaultShort : defaultShort
        const prevSection = idx > 0 ? items[idx - 1].section : null
        const showMemberDivider = section === 'member' && prevSection === 'public'
        const showStaffDivider = section === 'staff' && prevSection !== null && prevSection !== 'staff'
        const isActive = active === id
        const itemLocked = navigationLocked && id !== 'profile'
        const isBetaOnly = Boolean(moduleFlag && !publicModules[moduleFlag])
        const canEditPage = showGmEdit && isEditablePageId(id)
        const customCount = canEditPage ? pageOverrideCount(id) : 0
        return (
          <div key={id} className="flex flex-col">
            {showMemberDivider && (
              <div className="my-2 flex items-center gap-2 px-3">
                <span className="h-px flex-1 bg-border/70" />
                <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/80 uppercase">
                  Üye Alanı
                </span>
                <span className="h-px flex-1 bg-border/70" />
              </div>
            )}
            {showStaffDivider && (
              <div className="my-2 flex items-center gap-2 px-3">
                <span className="h-px flex-1 bg-gold/30" />
                <span className="text-[10px] font-semibold tracking-widest text-gold/80 uppercase">
                  Yönetim
                </span>
                <span className="h-px flex-1 bg-gold/30" />
              </div>
            )}
            <div className="group/navrow relative flex items-center gap-1">
              <button
                onClick={() => onSelect(id)}
                disabled={itemLocked}
                aria-disabled={itemLocked || undefined}
                aria-current={isActive ? 'page' : undefined}
                title={itemLocked ? 'Önce profilini tamamla' : undefined}
                className={cn(
                  'group relative flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-left transition',
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
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium">{label}</span>
                    {isBetaOnly && (
                      <span className="rounded border border-gold/40 bg-gold/15 px-1.5 py-0.2 text-[9px] font-bold tracking-wider text-gold uppercase">
                        BETA
                      </span>
                    )}
                  </span>
                  {id === 'admin' && unreadAnonymousCount > 0 ? (
                    <span className="truncate text-[11px] font-medium text-red-300">
                      {unreadAnonymousCount} okunmamış anonim mesaj
                    </span>
                  ) : (
                    <span className="truncate text-[11px] text-muted-foreground">{short}</span>
                  )}
                </span>
                {id === 'admin' && unreadAnonymousCount > 0 && (
                  <span
                    className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-red-400/75 bg-red-500/20 px-2 py-0.5 text-[11px] font-black text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.45)]"
                    title={`${unreadAnonymousCount} okunmamış anonim mesaj`}
                    aria-label={`${unreadAnonymousCount} okunmamış anonim mesaj`}
                  >
                    <span className="relative flex size-2 shrink-0">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-85" />
                      <span className="relative inline-flex size-2 rounded-full bg-red-500" />
                    </span>
                    <span className="tabular-nums">{unreadAnonymousCount > 99 ? '99+' : unreadAnonymousCount}</span>
                  </span>
                )}
              </button>

              {canEditPage && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    openEditorForPage(id)
                  }}
                  title={`${label} sayfasının başlık ve metinlerini düzenle (Sadece GM)`}
                  aria-label={`${label} metinlerini düzenle`}
                  className={cn(
                    'relative flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border transition',
                    customCount > 0
                      ? 'border-gold/50 bg-gold/15 text-gold hover:bg-gold/25'
                      : 'border-transparent text-gold/55 opacity-75 hover:border-gold/40 hover:bg-gold/10 hover:text-gold hover:opacity-100',
                  )}
                >
                  <Pencil className="size-3.5" />
                  {customCount > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-gold shadow-[0_0_6px_#d4af37]"
                      aria-hidden
                    />
                  )}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </nav>
  )
}

function SidebarBody({
  active,
  onSelect,
  navigationLocked = false,
  publicModules,
  unreadAnonymousCount = 0,
}: {
  active: TabId
  onSelect: (id: TabId) => void
  navigationLocked?: boolean
  publicModules: PublicModuleFlags
  unreadAnonymousCount?: number
}) {
  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-4">
      <div className="flex items-center gap-3 px-1">
        <Image
          src="/images/crests/crest-option-1.jpg"
          alt="TURX"
          width={56}
          height={56}
          priority
          className="size-14 rounded-xl border border-gold/40 object-cover shadow-[0_0_15px_rgba(212,175,55,0.35)]"
        />
        <div>
          <p className="font-display text-2xl leading-none font-black tracking-widest text-gold text-glow-gold">TURX</p>
          <p className="mt-1 font-display text-[10px] tracking-[0.3em] text-neon">TURX FOREVER</p>
        </div>
      </div>
      <NavList
        active={active}
        onSelect={onSelect}
        navigationLocked={navigationLocked}
        publicModules={publicModules}
        unreadAnonymousCount={unreadAnonymousCount}
      />
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
  publicModules = { raidSignup: false, loot: false, attendance: false, roadmap: false, bank: false },
  unreadAnonymousCount = 0,
}: {
  active: TabId
  onSelect: (id: TabId) => void
  mobileOpen: boolean
  onCloseMobile: () => void
  navigationLocked?: boolean
  publicModules?: PublicModuleFlags
  unreadAnonymousCount?: number
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
        <SidebarBody
          active={active}
          onSelect={onSelect}
          navigationLocked={navigationLocked}
          publicModules={publicModules}
          unreadAnonymousCount={unreadAnonymousCount}
        />
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
            publicModules={publicModules}
            unreadAnonymousCount={unreadAnonymousCount}
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
  mobileOpen,
  unreadAnonymousCount = 0,
  onUnreadAnonymousCountChange,
}: {
  active: TabId
  onSelect: (id: TabId) => void
  onOpenMobile: () => void
  mobileOpen: boolean
  unreadAnonymousCount?: number
  onUnreadAnonymousCountChange?: (count: number) => void
}) {
  return (
    <header className="sticky top-11 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <button
          onClick={onOpenMobile}
          className="relative rounded-lg border border-border p-2 text-silver hover:border-neon/40 hover:text-neon lg:hidden cursor-pointer"
          aria-label="Menüyü aç"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
        >
          <Menu className="size-5" />
          {unreadAnonymousCount > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 py-0.5 text-[10px] leading-none font-black text-white shadow-[0_0_8px_rgba(239,68,68,0.85)]"
              title={`${unreadAnonymousCount} okunmamış anonim mesaj`}
            >
              {unreadAnonymousCount > 9 ? '9+' : unreadAnonymousCount}
            </span>
          )}
        </button>

        <div className="flex min-w-0 items-center gap-3">
          <Image
            src="/images/crests/crest-option-1.jpg"
            alt="TURX"
            width={36}
            height={36}
            className="size-9 rounded-lg border border-gold/40 object-cover lg:hidden"
          />
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
          <AuthNavbarWidget
            onNavigate={onSelect}
            onUnreadAnonymousCountChange={onUnreadAnonymousCountChange}
          />
        </div>
      </div>
    </header>
  )
}