import { NextResponse } from 'next/server'
import {
  DISCORD_GUILD_ID,
  DISCORD_INVITE_URL,
  matchesGmIdentity,
  type PresenceState,
} from '@/lib/guild-presence'
import { loadGuildStore, resolveUserRole } from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

export type DiscordVoiceMember = {
  id: string
  username: string
  avatarUrl: string
  status: PresenceState
  game?: string | null
  mute?: boolean
  deaf?: boolean
}

export type DiscordVoiceChannel = {
  id: string
  name: string
  memberCount: number
  members: DiscordVoiceMember[]
}

export type DiscordOfficer = {
  id: string
  name: string
  role: 'Guild Master' | 'Görevli' | 'Officer'
  status: PresenceState
  avatarUrl: string
  game?: string | null
}

export type DiscordOnlineMember = {
  id: string
  username: string
  avatarUrl: string
  status: PresenceState
  game: string | null
  channelId?: string | null
  channelName?: string | null
  isGm?: boolean
  isOfficer?: boolean
}

export type DiscordWidgetResponse = {
  guildName: string
  presenceCount: number
  voiceCount: number
  totalMembers: number
  instantInvite: string
  members: DiscordOnlineMember[]
  voiceChannels: DiscordVoiceChannel[]
  officers: DiscordOfficer[]
  source: 'live' | 'fallback'
}

type RawWidgetMember = {
  id: string
  username: string
  discriminator: string
  avatar?: string | null
  avatar_url?: string
  status: string
  channel_id?: string | null
  mute?: boolean
  deaf?: boolean
  game?: { name?: string } | null
  activity?: { name?: string } | null
}

type RawWidgetChannel = {
  id: string
  name: string
  position?: number
}

type RawWidgetPayload = {
  id: string
  name: string
  instant_invite?: string
  channels?: RawWidgetChannel[]
  members?: RawWidgetMember[]
  presence_count?: number
}

function normalizeStatus(value: string | undefined): PresenceState {
  if (value === 'online' || value === 'idle' || value === 'dnd' || value === 'offline') {
    return value
  }
  return 'online'
}

const WIDGET_CACHE_TTL_MS = 60_000

const globalForWidget = globalThis as unknown as {
  __turxDiscordWidgetCache?: {
    payload: DiscordWidgetResponse
    fetchedAt: number
  }
}

export async function GET() {
  const cached = globalForWidget.__turxDiscordWidgetCache
  if (cached && Date.now() - cached.fetchedAt < WIDGET_CACHE_TTL_MS) {
    return NextResponse.json(cached.payload, {
      status: 200,
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    })
  }

  let widgetData: RawWidgetPayload | null = null

  try {
    const res = await fetch(`https://discord.com/api/guilds/${DISCORD_GUILD_ID}/widget.json`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4500),
    })
    if (res.ok) {
      widgetData = (await res.json()) as RawWidgetPayload
    }
  } catch {
    widgetData = null
  }

  // Load registered users from store to sync officer roles
  let storeUsers: { username: string; email: string; role: string }[] = []
  try {
    const store = await loadGuildStore()
    storeUsers = (store.users || []).map((u) => ({
      username: u.username,
      email: u.email,
      role: resolveUserRole(u),
    }))
  } catch {
    storeUsers = []
  }

  // If live widget is available
  if (widgetData && Array.isArray(widgetData.members)) {
    const rawMembers = widgetData.members
    const rawChannels = Array.isArray(widgetData.channels) ? widgetData.channels : []
    const presenceCount = widgetData.presence_count ?? rawMembers.length

    // Build channel lookup map
    const channelMap = new Map<string, string>()
    for (const ch of rawChannels) {
      if (ch.id && ch.name) channelMap.set(ch.id, ch.name)
    }

    // Voice channels
    const voiceChannels: DiscordVoiceChannel[] = rawChannels
      .map((ch) => {
        const inThisChannel = rawMembers
          .filter((m) => m.channel_id === ch.id)
          .map((m) => ({
            id: m.id,
            username: m.username,
            avatarUrl: m.avatar_url || '/placeholder-user.jpg',
            status: normalizeStatus(m.status),
            game: m.game?.name || m.activity?.name || null,
            mute: m.mute,
            deaf: m.deaf,
          }))

        return {
          id: ch.id,
          name: ch.name || 'Ses kanalı',
          memberCount: inThisChannel.length,
          members: inThisChannel,
        }
      })
      .filter((ch) => ch.memberCount > 0)

    const voiceCount = rawMembers.filter((m) => Boolean(m.channel_id)).length

    // Map all live online members
    const onlineMembers: DiscordOnlineMember[] = rawMembers.map((m) => {
      const isGm = matchesGmIdentity(m.username)
      const isOfficerInStore = storeUsers.some(
        (u) =>
          (u.role === 'Görevli' || u.role === 'Officer') &&
          u.username.toLowerCase() === m.username.toLowerCase(),
      )
      const gameName = m.game?.name || m.activity?.name || null
      const chName = m.channel_id ? channelMap.get(m.channel_id) || 'Ses Kanalı' : null

      return {
        id: m.id,
        username: m.username,
        avatarUrl: m.avatar_url || '/placeholder-user.jpg',
        status: normalizeStatus(m.status),
        game: gameName,
        channelId: m.channel_id || null,
        channelName: chName,
        isGm,
        isOfficer: isOfficerInStore,
      }
    })

    // Sort: GM > Officer > In voice > Playing game > Status (online > idle > dnd) > Alphabetical
    onlineMembers.sort((a, b) => {
      if (a.isGm && !b.isGm) return -1
      if (!a.isGm && b.isGm) return 1
      if (a.isOfficer && !b.isOfficer) return -1
      if (!a.isOfficer && b.isOfficer) return 1
      if (a.channelId && !b.channelId) return -1
      if (!a.channelId && b.channelId) return 1
      if (a.game && !b.game) return -1
      if (!a.game && b.game) return 1
      const weight: Record<string, number> = { online: 3, idle: 2, dnd: 1, offline: 0, unknown: 0 }
      const diff = (weight[b.status] || 0) - (weight[a.status] || 0)
      if (diff !== 0) return diff
      return a.username.localeCompare(b.username, 'tr-TR')
    })

    // Identify officers in Discord widget
    const liveOfficers: DiscordOfficer[] = []

    for (const m of rawMembers) {
      const isGm = matchesGmIdentity(m.username)
      const officerUser = storeUsers.find(
        (u) =>
          (u.role === 'Görevli' || u.role === 'Officer') &&
          u.username.toLowerCase() === m.username.toLowerCase(),
      )

      if (isGm) {
        liveOfficers.unshift({
          id: m.id,
          name: m.username.toLowerCase().includes('waffle') ? 'Waffle | Sonat' : `${m.username} | GM`,
          role: 'Guild Master',
          status: normalizeStatus(m.status),
          avatarUrl: m.avatar_url || '/images/avatar.png',
          game: m.game?.name || m.activity?.name || null,
        })
      } else if (officerUser) {
        liveOfficers.push({
          id: m.id,
          name: m.username,
          role: 'Görevli',
          status: normalizeStatus(m.status),
          avatarUrl: m.avatar_url || '/placeholder-user.jpg',
          game: m.game?.name || m.activity?.name || null,
        })
      }
    }

    if (!liveOfficers.some((o) => o.role === 'Guild Master')) {
      liveOfficers.unshift({
        id: 'officer-gm',
        name: 'Waffle | Sonat',
        role: 'Guild Master',
        status: 'online',
        avatarUrl: '/images/avatar.png',
        game: 'World of Warcraft: Forever',
      })
    }

    // Attempt to fetch exact approximate_member_count from Discord invite API
    let totalMembers = Math.max(presenceCount * 5, 215)
    try {
      const inviteUrl = widgetData.instant_invite || DISCORD_INVITE_URL
      const code = inviteUrl.split('/').pop()?.split('?')[0]?.trim()
      if (code) {
        const invRes = await fetch(`https://discord.com/api/v10/invites/${code}?with_counts=true`, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(3000),
        })
        if (invRes.ok) {
          const invJson = (await invRes.json()) as { approximate_member_count?: number }
          if (typeof invJson.approximate_member_count === 'number' && invJson.approximate_member_count > 0) {
            totalMembers = invJson.approximate_member_count
          }
        }
      }
    } catch {
      // fallback to computed estimate
    }

    const responsePayload: DiscordWidgetResponse = {
      guildName: widgetData.name || 'TURX',
      presenceCount,
      voiceCount,
      totalMembers,
      instantInvite: widgetData.instant_invite || DISCORD_INVITE_URL,
      members: onlineMembers,
      voiceChannels,
      officers: liveOfficers,
      source: 'live',
    }

    globalForWidget.__turxDiscordWidgetCache = {
      payload: responsePayload,
      fetchedAt: Date.now(),
    }

    return NextResponse.json(responsePayload, {
      status: 200,
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    })
  }

  // Graceful fallback payload if widget cannot be contacted
  const fallbackPayload: DiscordWidgetResponse = {
    guildName: 'TURX',
    presenceCount: 42,
    voiceCount: 0,
    totalMembers: 215,
    instantInvite: DISCORD_INVITE_URL,
    members: [],
    voiceChannels: [],
    officers: [
      {
        id: 'officer-gm',
        name: 'Waffle | Sonat',
        role: 'Guild Master',
        status: 'online',
        avatarUrl: '/images/avatar.png',
        game: 'World of Warcraft: Forever',
      },
    ],
    source: 'fallback',
  }

  return NextResponse.json(fallbackPayload, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  })
}
