'use client'

import { CalendarClock, CheckCircle2, Minus, Plus, Radio, RefreshCw, ShieldCheck, Swords, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { authHeaders } from '@/lib/client-session'
import { PHASES, RAID_DATE, RAIDS } from '@/lib/guild-data'
import type { StreamPlatform, StreamRadarCard } from '@/lib/account-links'
import { defaultRaidProgressEntries, type GuildProgressTrackerState } from '@/lib/progress-tracker'
import { canAccessAdminPanel } from '@/lib/turx-identity'
import { cn } from '@/lib/utils'
import { useAuth } from '../auth-provider'
import type { TabId } from '../navigation'
import { useToast } from '../toast'
import { Badge, GhostButton, Panel, PanelTitle } from '../ui'
import { HeroLanding } from '../hero-landing'

function useCountdown(target: string) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  if (now === null) return null
  const diff = Math.max(0, new Date(target).getTime() - now)
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    mins: Math.floor((diff / 60_000) % 60),
    secs: Math.floor((diff / 1000) % 60),
  }
}

const pad = (n: number | undefined) => (n === undefined ? '--' : String(n).padStart(2, '0'))

function Roadmap() {
  const [selected, setSelected] = useState(0)
  const p = PHASES[selected]
  return (
    <Panel aria-labelledby="roadmap-title" className="flex h-full flex-col justify-between">
      <div>
        <PanelTitle icon={CalendarClock}>
          <span id="roadmap-title">WoW: Forever Phase Roadmap</span>
        </PanelTitle>
        <div className="overflow-x-auto pb-2">
          <ol className="relative flex min-w-[560px] justify-between">
            <span className="absolute top-4 right-6 left-6 h-px bg-gradient-to-r from-neon via-gold/60 to-border" aria-hidden />
            {PHASES.map((ph, i) => (
              <li key={ph.phase} className="relative flex flex-1 flex-col items-center">
                <button
                  onClick={() => setSelected(i)}
                  aria-pressed={selected === i}
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-lg p-1 focus-visible:outline-2 focus-visible:outline-neon"
                >
                  <span
                    className={cn(
                      'flex size-8 items-center justify-center rounded-full border-2 text-xs font-bold transition',
                      ph.status === 'next' ? 'border-neon bg-neon/20 text-neon shadow-[0_0_16px_#00f2fe]' : 'border-border bg-card text-muted-foreground',
                      selected === i && 'scale-110 border-gold text-gold',
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className={cn('text-xs font-semibold', selected === i ? 'text-gold' : 'text-silver')}>{ph.phase}</span>
                  <span className="text-[11px] text-muted-foreground">{ph.date}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-[#071422] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-display font-bold text-gold">
            {p.phase}: {p.title}
          </p>
          <Badge className={p.status === 'next' ? 'border-neon/50 text-neon' : 'border-border text-muted-foreground'}>
            {p.status === 'next' ? 'Sıradaki' : 'Planlanan'}
          </Badge>
        </div>
        <ul className="mt-3 flex flex-wrap gap-2">
          {p.items.map((it) => (
            <li key={it} className="rounded-md border border-border bg-card px-2.5 py-1 text-xs text-silver">
              {it}
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  )
}

function ProgressTracker() {
  const { user } = useAuth()
  const toast = useToast()
  const isStaff = canAccessAdminPanel(user?.role)
  const [syncing, setSyncing] = useState(false)
  const [progress, setProgress] = useState<GuildProgressTrackerState>({
    lastSyncedAt: '',
    source: 'live',
    scheduleLabel: 'Her Çarşamba 05:00 (TR)',
    raids: defaultRaidProgressEntries(),
    level60Count: 0,
    level60Target: 40,
    onyxiaAttunedCount: 0,
    onyxiaAttunedTarget: 40,
    totalArmoryMembers: 0,
    armoryDetectedOnyxiaCount: 0,
  })

  useEffect(() => {
    let cancelled = false
    fetch('/api/progress', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) return
        const json = (await res.json().catch(() => ({}))) as { progress?: GuildProgressTrackerState }
        if (!cancelled && json.progress) {
          setProgress(json.progress)
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const handleManualSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ action: 'sync' }),
      })
      const json = (await res.json().catch(() => ({}))) as { progress?: GuildProgressTrackerState; error?: string }
      if (!res.ok || !json.progress) {
        toast({ title: 'Senkronize Edilemedi', description: json.error || 'İşlem başarısız.' })
        return
      }
      setProgress(json.progress)
      toast({
        title: 'Progress Güncellendi',
        description: `WoW Armory'den ${json.progress.level60Count} Lv60 ve ${json.progress.onyxiaAttunedCount} Onyxia Attunement güncellendi.`,
      })
    } catch {
      toast({ title: 'Bağlantı Hatası', description: 'Senkronizasyon başarısız oldu.' })
    } finally {
      setSyncing(false)
    }
  }

  const handleAdjustKills = async (raidId: string, nextKilled: number) => {
    setSyncing(true)
    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ action: 'update_kills', raidId, killed: nextKilled }),
      })
      const json = (await res.json().catch(() => ({}))) as { progress?: GuildProgressTrackerState; error?: string }
      if (res.ok && json.progress) {
        setProgress(json.progress)
      }
    } finally {
      setSyncing(false)
    }
  }

  const readiness = [
    {
      label: 'Level 60 Raider (WoW Armory)',
      value: progress.level60Count,
      total: progress.level60Target || 40,
    },
    {
      label: "Onyxia's Lair Attunement (Drakefire Amulet)",
      value: progress.onyxiaAttunedCount,
      total: progress.onyxiaAttunedTarget || 40,
    },
  ]

  return (
    <Panel className="flex h-full flex-col justify-between">
      <div>
        <PanelTitle
          icon={Trophy}
          action={
            isStaff ? (
              <button
                type="button"
                disabled={syncing}
                onClick={() => void handleManualSync()}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-neon/35 bg-neon/10 px-2 py-1 text-[10px] font-semibold text-neon transition hover:bg-neon/20 disabled:opacity-50"
                title="WoW Armory'den Lv60 ve Attunement verilerini şimdi güncelle"
              >
                <RefreshCw className={cn('size-3', syncing && 'animate-spin')} />
                Güncelle
              </button>
            ) : (
              <Badge className="border-neon/30 bg-neon/10 text-[10px] text-neon">Haftalık Oto-Sync</Badge>
            )
          }
        >
          TURX Progress Tracker
        </PanelTitle>

        <ul className="flex flex-col gap-2.5">
          {progress.raids.map((r) => (
            <li
              key={r.raidId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-[#071422] px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{r.raidName}</span>
                  <span className="text-[10px] text-muted-foreground">{r.size}-Man</span>
                </div>
                <span
                  className={cn(
                    'mt-0.5 inline-flex items-center gap-1 text-[10px]',
                    r.attunementRequired ? 'text-amber-300' : 'text-emerald-400/80',
                  )}
                >
                  <ShieldCheck className="size-3" />
                  {r.attunementLabel}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {isStaff && (
                  <button
                    type="button"
                    disabled={syncing || r.killed <= 0}
                    onClick={() => void handleAdjustKills(r.raidId, r.killed - 1)}
                    className="cursor-pointer rounded border border-border/70 p-0.5 text-muted-foreground hover:border-gold/50 hover:text-gold disabled:opacity-30"
                    title="Boss sayısını azalt"
                  >
                    <Minus className="size-3" />
                  </button>
                )}
                <span className="font-display text-sm font-bold text-gold tabular-nums">
                  {r.killed}/{r.bosses} <span className="text-xs text-muted-foreground">Boss</span>
                </span>
                {isStaff && (
                  <button
                    type="button"
                    disabled={syncing || r.killed >= r.bosses}
                    onClick={() => void handleAdjustKills(r.raidId, r.killed + 1)}
                    className="cursor-pointer rounded border border-border/70 p-0.5 text-muted-foreground hover:border-gold/50 hover:text-gold disabled:opacity-30"
                    title="Boss sayısını artır"
                  >
                    <Plus className="size-3" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-5 mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Phase 1 Hazırlık &amp; Attunement
        </p>
        <ul className="flex flex-col gap-3">
          {readiness.map((r) => {
            const pct = Math.min(100, Math.round((r.value / Math.max(1, r.total)) * 100))
            return (
              <li key={r.label}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-silver">{r.label}</span>
                  <span className="font-mono font-semibold text-neon tabular-nums">
                    {r.value}/{r.total}
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={r.label}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-azure to-neon transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <p className="mt-4 border-t border-border/50 pt-2.5 text-[11px] text-muted-foreground">
        Her <strong>Çarşamba 05:00 (TR)</strong> otomatik güncellenir
        {progress.lastSyncedAt ? (
          <>
            {' · '}Son kontrol:{' '}
            {new Date(progress.lastSyncedAt).toLocaleDateString('tr-TR', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </>
        ) : null}
      </p>
    </Panel>
  )
}

function NextRaid({
  onNavigate,
  canOpenRaidSignup,
}: {
  onNavigate: (t: TabId) => void
  canOpenRaidSignup?: boolean
}) {
  const c = useCountdown(RAID_DATE)
  return (
    <Panel className="flex h-full flex-col justify-between">
      <div>
        <PanelTitle icon={Swords}>Sıradaki Raid</PanelTitle>
        <p className="font-display text-xl font-bold text-gold">Phase 1 Açılışı</p>
        <p className="text-sm text-muted-foreground">9 Aralık 2026 · 21:00 (TR)</p>
        <p className="mt-4 font-display text-3xl font-black text-neon tabular-nums text-glow-cyan">
          {c ? `${c.days}g ${pad(c.hours)}:${pad(c.mins)}:${pad(c.secs)}` : '--g --:--:--'}
        </p>
        <ul className="mt-4 flex flex-col gap-1.5 text-sm">
          {RAIDS.map((r) => (
            <li key={r.id} className="flex justify-between text-silver">
              <span>{r.name}</span>
              <span className="text-muted-foreground">{r.size}-Man</span>
            </li>
          ))}
        </ul>
      </div>
      {canOpenRaidSignup && (
        <GhostButton className="mt-6 w-full cursor-pointer" onClick={() => onNavigate('raid-signup')}>
          Raid Kaydına Git
        </GhostButton>
      )}
    </Panel>
  )
}

const PLATFORM_BADGE: Record<StreamPlatform, { label: string; className: string }> = {
  twitch: { label: 'Twitch', className: 'border-[#9146ff]/50 bg-[#9146ff]/15 text-[#c4a5ff]' },
  kick: { label: 'Kick', className: 'border-[#53fc18]/40 bg-[#53fc18]/10 text-[#9dff8a]' },
  youtube: { label: 'YouTube', className: 'border-red-500/40 bg-red-500/10 text-red-300' },
}

function StreamRadar() {
  const [channels, setChannels] = useState<StreamRadarCard[]>([])

  useEffect(() => {
    let cancelled = false
    const load = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      fetch('/api/streams')
        .then(async (response) => {
          const data = (await response.json().catch(() => ({}))) as { channels?: StreamRadarCard[]; live?: StreamRadarCard[] }
          if (cancelled) return
          if (Array.isArray(data.channels)) setChannels(data.channels)
          else if (Array.isArray(data.live)) setChannels(data.live)
        })
        .catch(() => {
          if (!cancelled) setChannels([])
        })
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') load()
    }
    load()
    const timer = window.setInterval(load, 120_000)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  return (
    <Panel className="flex h-full flex-col">
      <PanelTitle
        icon={Radio}
        action={
          <span className="flex gap-1">
            <Badge className={PLATFORM_BADGE.twitch.className}>Twitch</Badge>
            <Badge className={PLATFORM_BADGE.kick.className}>Kick</Badge>
            <Badge className={PLATFORM_BADGE.youtube.className}>YouTube</Badge>
          </span>
        }
      >
        Stream Radar
      </PanelTitle>
      <ul className="flex flex-1 flex-col gap-2">
        {channels.length === 0 && (
          <li className="rounded-lg border border-border bg-[#071422] p-3 text-sm text-muted-foreground">
            Kayıtlı kanal yok. Profiline Twitch, Kick veya YouTube kanal adını yaz.
          </li>
        )}
        {channels.map((stream) =>
          stream.live ? (
            <li key={`${stream.platform}-${stream.username}-${stream.login}`} className="overflow-hidden rounded-lg border border-border bg-[#071422]">
              <a href={stream.url} target="_blank" rel="noopener noreferrer" className="block">
                {stream.thumbnailUrl ? (
                  <img
                    src={stream.thumbnailUrl}
                    alt={`${stream.streamer} yayın önizlemesi`}
                    className="h-36 w-full object-cover"
                  />
                ) : null}
              </a>
              <div className="flex items-center gap-3 p-3">
                <span className="relative flex size-2.5 shrink-0">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    <span className="text-foreground">{stream.username}</span>
                    <span className="text-muted-foreground"> · </span>
                    <a href={stream.url} target="_blank" rel="noopener noreferrer" className="text-[#c4a5ff] hover:underline">
                      {stream.streamer}
                    </a>
                    <Badge className="ml-2 border-success/40 bg-success/15 text-success">Online</Badge>
                    <Badge className={cn('ml-1', PLATFORM_BADGE[stream.platform].className)}>{PLATFORM_BADGE[stream.platform].label}</Badge>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{stream.title}</p>
                </div>
                <span className="text-xs text-silver tabular-nums">{stream.viewers.toLocaleString('tr-TR')} izleyici</span>
              </div>
            </li>
          ) : (
            <li
              key={`${stream.platform}-${stream.username}-${stream.login}`}
              className="flex items-center gap-2 rounded-md border border-border/60 bg-[#071422]/80 px-3 py-1.5 text-sm"
            >
              <span className="size-2 shrink-0 rounded-full bg-muted-foreground/50" />
              <span className="min-w-0 truncate">
                <span className="font-medium text-silver">{stream.username}</span>
                <span className="text-muted-foreground"> · </span>
                <a href={stream.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:underline">
                  {stream.platform === 'youtube' && !stream.login.startsWith('UC') ? `@${stream.login}` : stream.login}
                </a>
              </span>
              <Badge className="ml-auto shrink-0 border-border bg-transparent text-muted-foreground">Offline</Badge>
            </li>
          ),
        )}
      </ul>
    </Panel>
  )
}

export function OverviewView({
  onNavigate,
  canOpenRaidSignup = false,
}: {
  onNavigate: (t: TabId) => void
  canOpenRaidSignup?: boolean
}) {
  return (
    <div className="flex flex-col gap-6">
      <HeroLanding onNavigate={onNavigate} />
      <div className="grid items-stretch gap-6 xl:grid-cols-3">
        <div className="flex xl:col-span-2">
          <div className="w-full">
            <Roadmap />
          </div>
        </div>
        <div className="flex">
          <div className="w-full">
            <NextRaid onNavigate={onNavigate} canOpenRaidSignup={canOpenRaidSignup} />
          </div>
        </div>
      </div>
      <div className="grid items-stretch gap-6 md:grid-cols-2">
        <ProgressTracker />
        <StreamRadar />
      </div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <CheckCircle2 className="size-3.5 text-success" /> Tüm saatler Türkiye saatine (UTC+3) göredir.
      </p>
    </div>
  )
}
