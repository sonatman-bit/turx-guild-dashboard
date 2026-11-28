'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { authHeaders } from '@/lib/client-session'
import type { PublicModuleFlags } from '@/lib/raid-loot-system'
import { canAccessAdminPanel } from '@/lib/turx-identity'
import { useAuth } from './auth-provider'
import { GuildPresenceBar } from './guild-presence-bar'
import { Header, Sidebar, type TabId } from './navigation'
import { ToastProvider, useToast } from './toast'
import { AdminDashboardView } from './views/admin'
import { AttendanceTrackerView } from './views/attendance-tracker'
import { BankView } from './views/bank'
import { FeedbackView } from './views/feedback'
import { LootDistributionView } from './views/loot-distribution'
import { OverviewView } from './views/overview'
import { ProfileView } from './views/profile'
import { RaidSignupView } from './views/raid-signup'
import { RaidSignupVariantView } from './views/raid-signup-variants'
import { RecruitView } from './views/recruit'
import { RoadmapView } from './views/roadmap'
import { RosterView } from './views/roster'
import { StrategyView } from './views/strategy'

const TAB_IDS: TabId[] = [
  'overview',
  'roadmap',
  'roster',
  'applications',
  'strategy',
  'anonymous',
  'raid-signup',
  'raid-signup-1',
  'raid-signup-2',
  'raid-signup-3',
  'loot',
  'attendance',
  'bank',
  'profile',
  'admin',
]

const MODULE_TAB_MAP: Partial<Record<TabId, keyof PublicModuleFlags>> = {
  'raid-signup': 'raidSignup',
  loot: 'loot',
  attendance: 'attendance',
  bank: 'bank',
}

function DashboardShellInner() {
  const { user, profileComplete } = useAuth()
  const toast = useToast()
  const [mounted, setMounted] = useState(false)
  const navigationLocked = mounted && Boolean(user && !profileComplete)
  const canOpenAdmin = canAccessAdminPanel(user?.role)
  const [tab, setTab] = useState<TabId>('overview')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadAnonymousCount, setUnreadAnonymousCount] = useState(0)
  const [publicModules, setPublicModules] = useState<PublicModuleFlags>({
    raidSignup: false,
    loot: false,
    attendance: false,
    roadmap: false,
    bank: false,
  })
  const closeMobile = useCallback(() => setMobileOpen(false), [])
  const initialTabAppliedRef = useRef(false)
  const hadUserRef = useRef(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchPublicFlags = useCallback(async () => {
    try {
      const res = await fetch('/api/raid-system?meta=1', {
        credentials: 'same-origin',
        headers: authHeaders(),
        cache: 'no-store',
      })
      if (!res.ok) return
      const json = (await res.json()) as { publicModules?: PublicModuleFlags }
      if (json.publicModules) {
        const next = json.publicModules
        setPublicModules((prev) =>
          prev.raidSignup === next.raidSignup &&
          prev.loot === next.loot &&
          prev.attendance === next.attendance &&
          prev.roadmap === next.roadmap &&
          prev.bank === next.bank
            ? prev
            : next,
        )
      }
    } catch {
      // keep safe default (all beta)
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    void fetchPublicFlags()
  }, [mounted, user?.username, tab, fetchPublicFlags])

  useEffect(() => {
    if (!mounted) return
    const onModulesUpdated = () => {
      void fetchPublicFlags()
    }
    window.addEventListener('turx:modules-updated', onModulesUpdated)
    return () => window.removeEventListener('turx:modules-updated', onModulesUpdated)
  }, [mounted, fetchPublicFlags])

  const canAccessTab = useCallback(
    (id: TabId) => {
      if (id === 'admin' || id === 'raid-signup-1' || id === 'raid-signup-2' || id === 'raid-signup-3') {
        return canOpenAdmin
      }
      const modKey = MODULE_TAB_MAP[id]
      if (modKey) {
        return Boolean(user) && (canOpenAdmin || Boolean(publicModules[modKey]))
      }
      return true
    },
    [user, canOpenAdmin, publicModules],
  )

  useEffect(() => {
    if (!mounted) return
    if (user) hadUserRef.current = true
    if (!initialTabAppliedRef.current) {
      const requested = new URLSearchParams(window.location.search).get('tab') as TabId | null
      if (requested && TAB_IDS.includes(requested)) {
        if (canAccessTab(requested)) {
          initialTabAppliedRef.current = true
          setTab(requested)
          const url = new URL(window.location.href)
          url.searchParams.delete('tab')
          window.history.replaceState({}, '', url.pathname + url.search)
          return
        }
        return
      }
      initialTabAppliedRef.current = true
    }
    if (!user) {
      if (hadUserRef.current) {
        hadUserRef.current = false
        setTab('overview')
      }
      return
    }
    if (!profileComplete) setTab('profile')
  }, [mounted, user, profileComplete, canAccessTab])

  useEffect(() => {
    if (!canAccessTab(tab)) setTab('overview')
  }, [tab, canAccessTab])

  const select = (id: TabId) => {
    initialTabAppliedRef.current = true
    if (navigationLocked && id !== 'profile') {
      toast({
        variant: 'error',
        title: 'Profil kilidi aktif',
        description: '5 adımlı profil ve WoW Armory (TURX) doğrulamasını tamamlamadan diğer sekmelere geçilemez.',
      })
      setTab('profile')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (!canAccessTab(id)) {
      toast({
        variant: 'error',
        title: !user ? 'Üye girişi gerekli' : 'Yetki yok',
        description: !user
          ? 'Bu bölüm yalnızca TURX lonca üyelerine açıktır. Lütfen giriş yapın veya kayıt olun.'
          : 'Bu bölüm şu an yalnızca Guild Master ve Görevli (Officer) deneme yayınına açıktır.',
      })
      return
    }
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (url.searchParams.has('tab')) {
        url.searchParams.delete('tab')
        window.history.replaceState({}, '', url.pathname + url.search)
      }
    }
    setTab(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <GuildPresenceBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar
          active={tab}
          onSelect={select}
          mobileOpen={mobileOpen}
          onCloseMobile={closeMobile}
          navigationLocked={navigationLocked}
          publicModules={publicModules}
          unreadAnonymousCount={canOpenAdmin ? unreadAnonymousCount : 0}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            active={tab}
            onSelect={select}
            onOpenMobile={() => setMobileOpen(true)}
            mobileOpen={mobileOpen}
            unreadAnonymousCount={canOpenAdmin ? unreadAnonymousCount : 0}
            onUnreadAnonymousCountChange={setUnreadAnonymousCount}
          />

          <main key={tab} className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 animate-in fade-in slide-in-from-bottom-2 md:px-6 md:py-8">
            {tab === 'overview' && (
              <OverviewView onNavigate={select} canOpenRaidSignup={canAccessTab('raid-signup')} />
            )}
            {tab === 'raid-signup' && canAccessTab('raid-signup') && <RaidSignupView />}
            {tab === 'raid-signup-1' && canOpenAdmin && <RaidSignupVariantView variant={1} onNavigate={select} />}
            {tab === 'raid-signup-2' && canOpenAdmin && <RaidSignupVariantView variant={2} onNavigate={select} />}
            {tab === 'raid-signup-3' && canOpenAdmin && <RaidSignupVariantView variant={3} onNavigate={select} />}
            {tab === 'loot' && canAccessTab('loot') && <LootDistributionView />}
            {tab === 'attendance' && canAccessTab('attendance') && <AttendanceTrackerView />}
            {tab === 'roadmap' && canAccessTab('roadmap') && <RoadmapView />}
            {tab === 'roster' && canAccessTab('roster') && <RosterView />}
            {tab === 'applications' && (
              <RecruitView onNavigate={select} canOpenRoadmap={canAccessTab('roadmap')} />
            )}
            {tab === 'bank' && canAccessTab('bank') && <BankView />}
            {tab === 'strategy' && <StrategyView />}
            {tab === 'anonymous' && <FeedbackView />}
            {tab === 'profile' && <ProfileView />}
            {tab === 'admin' && canOpenAdmin && <AdminDashboardView />}
          </main>

          <footer className="border-t border-border px-6 py-5 text-center text-xs text-muted-foreground">
            <div className="mx-auto max-w-4xl space-y-2">
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                <span>TURX · TURX FOREVER · Alliance PvE (EU) — WoW: Forever lonca paneli</span>
                <span className="opacity-40">·</span>
                <Link href="/privacy" className="underline-offset-4 transition hover:text-foreground hover:underline">
                  Gizlilik Politikası (Privacy Policy)
                </Link>
                <span className="opacity-40">·</span>
                <Link href="/terms" className="underline-offset-4 transition hover:text-foreground hover:underline">
                  Kullanım Koşulları (Terms of Service)
                </Link>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground/80">
                TURX Forever is a community guild management web application for World of Warcraft: Forever (EU Alliance
                PvE) players, providing raid scheduling, roster planning, attendance tracking, and transparent loot
                distribution. Optional Google Sign-In is used solely to authenticate guild members with basic email and
                profile information.
              </p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}

export function DashboardShell() {
  return (
    <ToastProvider>
      <DashboardShellInner />
    </ToastProvider>
  )
}
