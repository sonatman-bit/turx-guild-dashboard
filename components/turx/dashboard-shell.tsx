'use client'

import { useCallback, useEffect, useState } from 'react'
import { canAccessAdminPanel } from '@/lib/turx-identity'
import { useAuth } from './auth-provider'
import { GuildPresenceBar } from './guild-presence-bar'
import { Header, Sidebar, type TabId } from './navigation'
import { ToastProvider, useToast } from './toast'
import { AdminDashboardView } from './views/admin'
import { BankView } from './views/bank'
import { FeedbackView } from './views/feedback'
import { OverviewView } from './views/overview'
import { ProfileView } from './views/profile'
import { RaidsView } from './views/raids'
import { RecruitView } from './views/recruit'
import { RosterView } from './views/roster'
import { StrategyView } from './views/strategy'

const TAB_IDS: TabId[] = ['overview', 'roster', 'applications', 'strategy', 'raids', 'bank', 'anonymous', 'profile', 'admin']

function DashboardShellInner() {
  const { user, profileComplete } = useAuth()
  const toast = useToast()
  const [mounted, setMounted] = useState(false)
  const navigationLocked = mounted && Boolean(user && !profileComplete)
  const canOpenAdmin = canAccessAdminPanel(user?.role)
  const [tab, setTab] = useState<TabId>('overview')
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeMobile = useCallback(() => setMobileOpen(false), [])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const requested = new URLSearchParams(window.location.search).get('tab')
    if (requested && TAB_IDS.includes(requested as TabId) && (requested !== 'admin' || canOpenAdmin)) {
      setTab(requested as TabId)
      return
    }
    if (!user) {
      setTab('overview')
      return
    }
    if (!profileComplete) setTab('profile')
  }, [mounted, user, profileComplete, canOpenAdmin])

  useEffect(() => {
    if (tab === 'admin' && !canOpenAdmin) setTab('overview')
  }, [tab, canOpenAdmin])

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
    if (id === 'admin' && !canOpenAdmin) {
      toast({
        title: 'Yetki yok',
        description: 'GM Yönetim Paneli yalnızca Guild Master ve Görevli hesaplarına açıktır.',
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
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header active={tab} onSelect={select} onOpenMobile={() => setMobileOpen(true)} mobileOpen={mobileOpen} />

          <main key={tab} className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 animate-in fade-in slide-in-from-bottom-2 md:px-6 md:py-8">
            {tab === 'overview' && <OverviewView onNavigate={select} />}
            {tab === 'raids' && <RaidsView />}
            {tab === 'roster' && <RosterView />}
            {tab === 'applications' && <RecruitView />}
            {tab === 'bank' && <BankView />}
            {tab === 'strategy' && <StrategyView />}
            {tab === 'anonymous' && <FeedbackView />}
            {tab === 'profile' && <ProfileView />}
            {tab === 'admin' && canOpenAdmin && <AdminDashboardView />}
          </main>

          <footer className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
            TURX · TURX FOREVER · Alliance PvE (EU) — WoW: Forever lonca paneli
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
