'use client'

import { useEffect, useState } from 'react'
import {
  DISCORD_INVITE_URL,
  GM_BATTLETAG,
  GM_CHARACTER,
  GM_DISCORD_USERNAME,
  GM_RANK,
  emptyStatus,
  type GmStatusPayload,
  type PresenceState,
} from '@/lib/guild-presence'
import { cn } from '@/lib/utils'

function DiscordMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M20.317 4.37a19.8 19.8 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.11 13.11 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
      />
    </svg>
  )
}

function StatusDot({
  state,
  active,
}: {
  state: PresenceState | 'game-on' | 'game-off' | 'game-unknown'
  active?: boolean
}) {
  const tone =
    state === 'online' || state === 'game-on'
      ? 'bg-success shadow-[0_0_8px_rgb(62_224_127/0.8)]'
      : state === 'idle'
        ? 'bg-gold shadow-[0_0_8px_rgb(212_175_55/0.7)]'
        : state === 'dnd'
          ? 'bg-destructive shadow-[0_0_8px_rgb(239_83_80/0.7)]'
          : state === 'unknown' || state === 'game-unknown'
            ? 'bg-muted-foreground/50'
            : 'bg-muted-foreground/70'

  return (
    <span className="relative inline-flex size-2.5 shrink-0" aria-hidden>
      {active && (
        <span className={cn('absolute inset-0 animate-ping rounded-full opacity-60', tone)} />
      )}
      <span className={cn('relative size-2.5 rounded-full', tone)} />
    </span>
  )
}

export function GuildPresenceBar() {
  const [status, setStatus] = useState<GmStatusPayload>(emptyStatus())

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const response = await fetch('/api/gm-status', { cache: 'no-store' })
        const data = (await response.json()) as GmStatusPayload
        if (!cancelled && data) setStatus(data)
      } catch {
        if (!cancelled) setStatus(emptyStatus())
      }
    }
    void load()
    const timer = window.setInterval(load, 45_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  const discordOnline = status.discord === 'online' || status.discord === 'idle' || status.discord === 'dnd'
  const gameState = status.game === true ? 'game-on' : status.game === false ? 'game-off' : 'game-unknown'
  const gameLabel =
    status.game === true ? status.gameName || 'WoW çevrimiçi' : status.game === false ? 'Oyunda değil' : 'Oyun durumu alınamadı'

  return (
    <div className="sticky top-0 z-50 h-11 border-b border-border bg-[#071019]/95 text-xs backdrop-blur-md">
      <div className="flex h-full items-center gap-3 overflow-x-auto px-3 md:px-6">
        <p className="flex shrink-0 items-center gap-2 text-foreground">
          <span className="font-display font-black tracking-wider text-gold">{GM_CHARACTER}</span>
          <span className="rounded-full border border-gold/50 bg-gold/10 px-1.5 py-0.5 text-[10px] font-semibold text-gold">
            {GM_RANK}
          </span>
        </p>

        <span className="hidden h-4 w-px shrink-0 bg-border sm:block" aria-hidden />

        <p className="flex shrink-0 items-center gap-1.5" title={`Discord: ${status.discordLabel}`}>
          <StatusDot state={status.discord} active={discordOnline} />
          <span className="text-muted-foreground">Discord</span>
          <span className="font-medium text-silver">@{GM_DISCORD_USERNAME}</span>
          <span className={cn(discordOnline ? 'text-success' : 'text-muted-foreground')}>{status.discordLabel}</span>
        </p>

        <p className="flex shrink-0 items-center gap-1.5" title={`Battle.net ${GM_BATTLETAG}`}>
          <StatusDot state={gameState} active={status.game === true} />
          <span className="text-muted-foreground">WoW</span>
          <span className="font-medium text-silver">{GM_BATTLETAG}</span>
          <span className={cn(status.game === true ? 'text-success' : 'text-muted-foreground')}>{gameLabel}</span>
        </p>

        <a
          href={DISCORD_INVITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-full border border-[#5865F2]/70 bg-[#5865F2] px-3 py-1.5 font-semibold text-white shadow-[0_0_16px_rgb(88_101_242/0.35)] transition hover:bg-[#4752c4]"
        >
          <DiscordMark className="size-4" />
          Discord’a katıl
        </a>
      </div>
    </div>
  )
}
