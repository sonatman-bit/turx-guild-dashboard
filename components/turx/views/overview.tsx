'use client'

import { CalendarClock, CheckCircle2, Megaphone, Radio, Shield, Swords, Trophy } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { authHeaders, getSessionToken } from '@/lib/client-session'
import { ANNOUNCEMENTS, PHASES, RAID_DATE, RAIDS } from '@/lib/guild-data'
import type { StreamPlatform, StreamRadarCard } from '@/lib/account-links'
import { openPositionsLabel, STAFF_ROLES } from '@/lib/staff-roles'
import { cn } from '@/lib/utils'
import { useAuth } from '../auth-provider'
import type { TabId } from '../navigation'
import { StaffRoleBadge } from '../staff-role-icons'
import { useToast } from '../toast'
import { Badge, GhostButton, GoldButton, Panel, PanelTitle } from '../ui'
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

function StaffHiringHero({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { user } = useAuth()
  const toast = useToast()

  const apply = () => {
    if (!user) {
      toast({ title: 'Önce giriş yap', description: 'Göreve talip olmak için profilinden işaretlemen yeterli.' })
      return
    }
    onNavigate('profile')
  }

  return (
    <section className="glow-border relative overflow-hidden rounded-2xl" aria-labelledby="staff-title">
      <Image src="/images/hero.png" alt="" fill priority sizes="100vw" className="object-cover opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#08121e] via-[#08121e]/85 to-[#08121e]/30" />
      <div className="relative flex flex-col gap-6 p-6 md:p-8 xl:flex-row xl:items-center xl:justify-between">
        <div className="max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-azure/50 bg-azure/15 text-azure">
              <Shield className="size-3" /> Alliance PvE (EU)
            </Badge>
            <Badge className="border-gold/40 bg-gold/10 text-gold">Görevli alımı</Badge>
          </div>
          <h2 id="staff-title" className="mt-3 font-display text-3xl font-black text-balance md:text-4xl">
            TURX, ilerlemesinde <span className="text-neon text-glow-cyan">aktif rol</span> oynayacak görevliler arıyor!
          </h2>
          <p className="mt-2 text-sm text-pretty text-silver/90">
            Raid masası, alım, meslek hattı ve loot düzeni için gönüllü kadro kuruyoruz. Giriş yaptıktan sonra profilinden talip olduğun görevleri işaretle.
          </p>
          <GoldButton onClick={apply} className="mt-5">
            Göreve talip ol
          </GoldButton>
        </div>
        <ul className="grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
          {STAFF_ROLES.map((role) => (
            <li
              key={role.id}
              className="flex items-center gap-3 rounded-xl border border-neon/20 bg-[#06101c]/80 px-3 py-3"
            >
              <StaffRoleBadge id={role.id} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{role.title}</p>
                <p className="mt-0.5 text-xs font-medium text-gold">{openPositionsLabel(role.slots)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Roadmap() {
  const [selected, setSelected] = useState(0)
  const p = PHASES[selected]
  return (
    <Panel aria-labelledby="roadmap-title">
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
                className="flex flex-col items-center gap-2 rounded-lg p-1 focus-visible:outline-2 focus-visible:outline-neon"
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
      <div className="mt-3 rounded-lg border border-border bg-[#071422] p-4">
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

const PROGRESS = [
  { raid: 'Barrow Deeps', bosses: 6, killed: 0 },
  { raid: 'Hyjal Summit', bosses: 5, killed: 0 },
  { raid: "Onyxia's Lair", bosses: 1, killed: 0 },
]

const READINESS = [
  { label: 'Level 60 Raider', value: 0, total: 40 },
  { label: 'Onyxia Attunement', value: 0, total: 25 },
  { label: 'Fire Resistance Set', value: 0, total: 25 },
]

function ProgressTracker() {
  return (
    <Panel>
      <PanelTitle icon={Trophy}>TURX Progress Tracker</PanelTitle>
      <ul className="flex flex-col gap-3">
        {PROGRESS.map((r) => (
          <li key={r.raid} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-[#071422] px-3 py-2.5">
            <span className="text-sm font-medium">{r.raid}</span>
            <span className="font-display text-sm font-bold text-gold tabular-nums">
              {r.killed}/{r.bosses} <span className="text-xs text-muted-foreground">Normal</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-5 mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Launch Hazırlığı</p>
      <ul className="flex flex-col gap-3">
        {READINESS.map((r) => {
          const pct = Math.round((r.value / r.total) * 100)
          return (
            <li key={r.label}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-silver">{r.label}</span>
                <span className="text-neon tabular-nums">
                  {r.value}/{r.total}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={r.label}>
                <div className="h-full rounded-full bg-gradient-to-r from-azure to-neon" style={{ width: `${pct}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

function NextRaid({ onNavigate }: { onNavigate: (t: TabId) => void }) {
  const c = useCountdown(RAID_DATE)
  return (
    <Panel className="flex flex-col">
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
      <GhostButton className="mt-6 w-full" onClick={() => onNavigate('raids')}>
        Raid Kaydına Git
      </GhostButton>
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
    <Panel>
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
      <ul className="flex flex-col gap-2">
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

function DiscordFeed() {
  return (
    <Panel>
      <PanelTitle icon={Megaphone} action={<Badge className="border-[#5865f2]/50 bg-[#5865f2]/15 text-[#a5adff]">#duyurular</Badge>}>
        Discord Duyuruları
      </PanelTitle>
      <ul className="flex flex-col gap-3">
        {ANNOUNCEMENTS.length === 0 && (
          <li className="text-sm text-muted-foreground">Henüz duyuru yok.</li>
        )}
        {ANNOUNCEMENTS.map((a) => (
          <li key={a.text} className="border-l-2 border-gold/50 pl-3">
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-gold">{a.author}</span>
              <span className="text-[11px] text-neon">{a.rank}</span>
              <span className="text-[11px] text-muted-foreground">· {a.time}</span>
            </p>
            <p className="mt-1 text-sm leading-relaxed text-pretty text-silver/90">{a.text}</p>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

export function OverviewView({ onNavigate }: { onNavigate: (t: TabId) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <HeroLanding onNavigate={onNavigate} />
      <StaffHiringHero onNavigate={onNavigate} />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Roadmap />
        </div>
        <NextRaid onNavigate={onNavigate} />
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <ProgressTracker />
        <StreamRadar />
        <DiscordFeed />
      </div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <CheckCircle2 className="size-3.5 text-success" /> Tüm saatler Türkiye saatine (UTC+3) göredir.
      </p>
    </div>
  )
}
