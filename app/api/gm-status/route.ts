import { NextResponse } from 'next/server'
import {
  DISCORD_GUILD_ID,
  discordLabel,
  emptyStatus,
  isWowActivity,
  matchesGmIdentity,
  type GmStatusPayload,
  type PresenceState,
} from '@/lib/guild-presence'

export const dynamic = 'force-dynamic'

type WidgetMember = {
  username?: string
  status?: string
  activity?: { name?: string } | null
  game?: { name?: string } | null
}

function json(data: GmStatusPayload, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

function asPresence(value: string | undefined): PresenceState | null {
  if (value === 'online' || value === 'idle' || value === 'dnd' || value === 'offline') return value
  return null
}

async function readJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(4000),
  })
  if (!response.ok) return null
  return (await response.json()) as T
}

function fromWidget(members: WidgetMember[]): GmStatusPayload {
  const found = members.find((member) => matchesGmIdentity(member.username))
  if (!found) {
    return {
      discord: 'offline',
      discordLabel: discordLabel('offline'),
      game: false,
      gameName: null,
      source: 'widget',
    }
  }
  const discord = asPresence(found.status) || 'online'
  const gameName = found.game?.name || found.activity?.name || null
  return {
    discord,
    discordLabel: discordLabel(discord),
    game: isWowActivity(gameName),
    gameName,
    source: 'widget',
  }
}

export async function GET() {
  try {
    const widget = await readJson<{ members?: WidgetMember[] }>(
      `https://discord.com/api/guilds/${DISCORD_GUILD_ID}/widget.json`,
    )
    if (widget && Array.isArray(widget.members)) {
      return json(fromWidget(widget.members))
    }

    return json(emptyStatus('none'))
  } catch (err) {
    console.error('gm-status', err)
    return json(emptyStatus('none'))
  }
}
