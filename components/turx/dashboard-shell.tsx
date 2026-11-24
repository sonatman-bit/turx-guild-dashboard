'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
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
import { RaidsView } from './views/raids'
import { RecruitView } from './views/recruit'
import { RoadmapView } from './views/roadmap'
import { RosterView } from './views/roster'
import { StrategyView } from './views/strategy'

const TAB_IDS: TabId[] = [
  'overview',
  'roster',
  'applications',
  'strategy',
  'raids',
  'raid-signup',
  'loot',
  'attendance',
  'roadmap',
  'bank',
  'anonymous',
  'profile',
  'admin',
]

const MODULE_TAB_MAP: Partial<Record<TabId, keyof PublicModuleFlags>> = {
  'raid-signup': 'raidSignup',
  loot: 'loot',
  attendance: 'attendance',
  roadmap: 'roadmap',
}

function DashboardShellInner() {
  const { user, profileComplete } = useAuth()
  const toast = useToast()
  const [mounted, setMounted] = useState(false)
  const navigationLocked = mounted && Boolean(user && !profileComplete)
  const canOpenAdmin = canAccessAdminPanel(user?.role)
  const [tab, setTab] = useState<TabId>('overview')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [publicModules, setPublicModules] = useState<PublicModuleFlags>({
    raidSignup: false,
    loot: false,
    attendance: false,
    roadmap: false,
  })
  const closeMobile = useCallback(() => setMobileOpen(false), [])

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
      if (json.publicModules) setPublicModules(json.publicModules)
    } catch {
      // keep safe default (all beta)
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    void fetchPublicFlags()
  }, [mounted, user?.username, tab, fetchPublicFlags])

  const canAccessTab = useCallback(
    (id: TabId) => {
      if (id === 'admin') return canOpenAdmin
      const modKey = MODULE_TAB_MAP[id]
      if (modKey) return canOpenAdmin || Boolean(publicModules[modKey])
      return true
    },
    [canOpenAdmin, publicModules],
  )

  useEffect(() => {
    if (!mounted) return
    const requested = new URLSearchParams(window.location.search).get('tab') as TabId | null
    if (requested && TAB_IDS.includes(requested) && canAccessTab(requested)) {
      setTab(requested)
      return
    }
    if (!user) {
      setTab('overview')
      return
    }
    if (!profileComplete) setTab('profile')
  }, [mounted, user, profileComplete, canAccessTab])

  useEffect(() => {
    if (!canAccessTab(tab)) setTab('overview')
  }, [tab, canAccessTab])

  const select = (id: TabId) => {
    if (navigationLocked && id !== 'profile') {
      toast({
        title: 'Profil kilidi aktif',
        description: 'Profil bilgilerini ve en az bir Main karakteri kaydetmeden diğer sekmelere geçilemez.',
      })
      setTab('profile')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (!canAccessTab(id)) {
      toast({
        title: 'Yetki yok',
        description: 'Bu bölüm şu an yalnızca Guild Master ve Görevli (Officer) deneme yayınına açıktır.',
      })
      return
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
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header active={tab} onSelect={select} onOpenMobile={() => setMobileOpen(true)} mobileOpen={mobileOpen} />

          <main key={tab} className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 animate-in fade-in slide-in-from-bottom-2 md:px-6 md:py-8">
            {tab === 'overview' && <OverviewView onNavigate={select} />}
            {tab === 'raids' && <RaidsView />}
            {tab === 'raid-signup' && canAccessTab('raid-signup') && <RaidSignupView />}
            {tab === 'loot' && canAccessTab('loot') && <LootDistributionView />}
            {tab === 'attendance' && canAccessTab('attendance') && <AttendanceTrackerView />}
            {tab === 'roadmap' && canAccessTab('roadmap') && <RoadmapView />}
            {tab === 'roster' && <RosterView />}
            {tab === 'applications' && <RecruitView />}
            {tab === 'bank' && <BankView />}
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
