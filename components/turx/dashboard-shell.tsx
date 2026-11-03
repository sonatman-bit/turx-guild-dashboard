'use client'

import { useCallback, useState } from 'react'
import { Header, Sidebar, type TabId } from './navigation'
import { ToastProvider } from './toast'
import { AdminDashboardView } from './views/admin'
import { BankView } from './views/bank'
import { FeedbackView } from './views/feedback'
import { OverviewView } from './views/overview'
import { ProfileView } from './views/profile'
import { RaidsView } from './views/raids'
import { RecruitView } from './views/recruit'
import { RosterView } from './views/roster'
import { StrategyView } from './views/strategy'
import { User } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DashboardShell() {
  const [tab, setTab] = useState<TabId>('overview')
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeMobile = useCallback(() => setMobileOpen(false), [])

  const select = (id: TabId) => {
    setTab(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <ToastProvider>
      <div className="flex min-h-dvh">
        <Sidebar active={tab} onSelect={select} mobileOpen={mobileOpen} onCloseMobile={closeMobile} />
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
            {tab === 'admin' && <AdminDashboardView />}
          </main>
          
          <footer className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
            TURX · TURX FOREVER · Alliance PvE (EU) — WoW: Forever lonca paneli
          </footer>
        </div>
      </div>
    </ToastProvider>
  )
}