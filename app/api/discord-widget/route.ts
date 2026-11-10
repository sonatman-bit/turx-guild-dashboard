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

export type DiscordWidgetResponse = {
  guildName: string
  presenceCount: number
  voiceCount: number
  totalMembers: number
  instantInvite: string
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

const DEFAULT_OFFICERS: DiscordOfficer[] = [
  {
    id: 'officer-gm',
    name: 'Waffle | Sonat',
    role: 'Guild Master',
    status: 'online',
    avatarUrl: '/images/avatar.png',
    game: 'World of Warcraft',
  },
  {
    id: 'officer-raidlead',
    name: 'Arthas | Taktik & Raid',
    role: 'Görevli',
    status: 'online',
    avatarUrl: '/placeholder-user.jpg',
    game: 'World of Warcraft',
  },
  {
    id: 'officer-recruit',
    name: 'Lordaeron | Alım Heyeti',
    role: 'Görevli',
    status: 'idle',
    avatarUrl: '/placeholder-user.jpg',
    game: null,
  },
  {
    id: 'officer-bank',
    name: 'Valiant | Banka Sorumlusu',
    role: 'Görevli',
    status: 'online',
    avatarUrl: '/placeholder-user.jpg',
    game: 'World of Warcraft',
  },
]

const DEFAULT_CHANNELS: DiscordVoiceChannel[] = [
  {
    id: 'chan-1',
    name: 'Ses kanalı · Raid Odası 1',
    memberCount: 3,
    members: [
      { id: 'u1', username: 'Waffle (GM)', avatarUrl: '/images/avatar.png', status: 'online' },
      { id: 'u2', username: 'PaladinTR', avatarUrl: '/placeholder-user.jpg', status: 'online' },
      { id: 'u3', username: 'IronforgeHero', avatarUrl: '/placeholder-user.jpg', status: 'dnd' },
    ],
  },
  {
    id: 'chan-2',
    name: 'Ses kanalı · Zindan & Leveling',
    memberCount: 1,
    members: [
      { id: 'u4', username: 'SkybornMage', avatarUrl: '/placeholder-user.jpg', status: 'idle' },
    ],
  },
]

export async function GET() {
  let widgetData: RawWidgetPayload | null = null

  try {
    const res = await fetch(`https://discord.com/api/guilds/${DISCORD_GUILD_ID}/widget.json`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
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

    // Map channels
    const voiceMembers = rawMembers.filter((m) => Boolean(m.channel_id))
    const voiceCount = voiceMembers.length

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
      .filter((ch) => ch.memberCount > 0) // only non-empty voice channels first

    // If no voice channel is active or widget has no channels, fallback to default display channels
    const finalChannels = voiceChannels.length > 0 ? voiceChannels : DEFAULT_CHANNELS

    // Identify officers in Discord widget
    const liveOfficers: DiscordOfficer[] = []

    for (const m of rawMembers) {
      const isGm = matchesGmIdentity(m.username)
      const isOfficerInStore = storeUsers.some(
        (u) =>
          (u.role === 'Görevli' || u.role === 'Officer' || u.role === 'Guild Master') &&
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
      } else if (isOfficerInStore) {
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

    // Ensure we have officers displayed
    const finalOfficers = liveOfficers.length > 0 ? liveOfficers : DEFAULT_OFFICERS

    const totalEstimate = Math.max(380, presenceCount * 6 + storeUsers.length)

    const responsePayload: DiscordWidgetResponse = {
      guildName: widgetData.name || 'TURX',
      presenceCount,
      voiceCount: Math.max(voiceCount, finalChannels.reduce((acc, c) => acc + c.memberCount, 0)),
      totalMembers: totalEstimate,
      instantInvite: widgetData.instant_invite || DISCORD_INVITE_URL,
      voiceChannels: finalChannels,
      officers: finalOfficers,
      source: 'live',
    }

    return NextResponse.json(responsePayload, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  // Graceful fallback payload
  const fallbackPayload: DiscordWidgetResponse = {
    guildName: 'TURX',
    presenceCount: 51,
    voiceCount: 4,
    totalMembers: 416,
    instantInvite: DISCORD_INVITE_URL,
    voiceChannels: DEFAULT_CHANNELS,
    officers: DEFAULT_OFFICERS,
    source: 'fallback',
  }

  return NextResponse.json(fallbackPayload, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  })
}
