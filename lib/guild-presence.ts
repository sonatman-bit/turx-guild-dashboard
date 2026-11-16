import { isGuildMasterEmail } from '@/lib/turx-identity'

export const DISCORD_INVITE_URL = 'https://discord.gg/8XkyjsbKWQ'
export const DISCORD_INVITE_CODE = '8XkyjsbKWQ'
export const DISCORD_GUILD_ID = '613468335379841031'
export const GM_DISCORD_USER_ID = '187553078201942016'
export const GM_DISCORD_USERNAME = 'sonatman'
export const GM_BATTLETAG = 'sonatman#2657'
export const GM_CHARACTER = 'Waffle'
export const GM_RANK = 'GM'

export type PresenceState = 'online' | 'idle' | 'dnd' | 'offline' | 'unknown'

export type GmStatusPayload = {
  discord: PresenceState
  discordLabel: string
  game: boolean | null
  gameName: string | null
  source: 'widget' | 'none'
}

const WOW_NAME = /world of warcraft|wow classic|\bwow\b|warcraft|forever/i

export function isWowActivity(name: string | null | undefined) {
  return Boolean(name && WOW_NAME.test(name))
}

export function discordLabel(state: PresenceState) {
  switch (state) {
    case 'online':
      return 'Çevrimiçi'
    case 'idle':
      return 'Boşta'
    case 'dnd':
      return 'Rahatsız etmeyin'
    case 'offline':
      return 'Çevrimdışı'
    default:
      return 'Alınamadı'
  }
}

export function matchesGmIdentity(value: string | null | undefined) {
  const text = (value || '').trim().toLowerCase()
  if (!text) return false
  return (
    text === GM_DISCORD_USERNAME ||
    text === GM_CHARACTER.toLowerCase() ||
    text.includes(GM_DISCORD_USERNAME) ||
    text.includes('waffle')
  )
}

export function emptyStatus(source: GmStatusPayload['source'] = 'none'): GmStatusPayload {
  return {
    discord: 'unknown',
    discordLabel: discordLabel('unknown'),
    game: null,
    gameName: null,
    source,
  }
}

export type DiscordPresenceMember = {
  id: string
  username: string
  discriminator?: string
  status: string
  avatar?: string | null
  avatar_url?: string | null
  game?: { name?: string } | null
  activity?: { name?: string } | null
  channel_id?: string | null
}

export type DiscordPresenceChannel = {
  id: string
  name: string
  position?: number
}

export type DiscordWidgetData = {
  id: string
  name: string
  members: DiscordPresenceMember[]
  channels: DiscordPresenceChannel[]
  presenceCount: number
}

const WIDGET_PRESENCE_TTL_MS = 45_000

const globalForPresence = globalThis as unknown as {
  __turxDiscordWidgetPresence?: {
    data: DiscordWidgetData
    fetchedAt: number
  }
}

export async function fetchDiscordWidgetData(): Promise<DiscordWidgetData> {
  const cached = globalForPresence.__turxDiscordWidgetPresence
  if (cached && Date.now() - cached.fetchedAt < WIDGET_PRESENCE_TTL_MS) {
    return cached.data
  }

  try {
    const res = await fetch(`https://discord.com/api/guilds/${DISCORD_GUILD_ID}/widget.json`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4500),
    })
    if (res.ok) {
      const json = (await res.json()) as {
        id?: string
        name?: string
        members?: DiscordPresenceMember[]
        channels?: DiscordPresenceChannel[]
        presence_count?: number
      }
      const data: DiscordWidgetData = {
        id: json.id || DISCORD_GUILD_ID,
        name: json.name || 'TURX',
        members: Array.isArray(json.members) ? json.members : [],
        channels: Array.isArray(json.channels) ? json.channels : [],
        presenceCount: json.presence_count ?? (Array.isArray(json.members) ? json.members.length : 0),
      }
      globalForPresence.__turxDiscordWidgetPresence = { data, fetchedAt: Date.now() }
      return data
    }
  } catch {
    if (cached) return cached.data
  }

  return {
    id: DISCORD_GUILD_ID,
    name: 'TURX',
    members: cached ? cached.data.members : [],
    channels: cached ? cached.data.channels : [],
    presenceCount: cached ? cached.data.presenceCount : 0,
  }
}

export async function fetchDiscordWidgetMembers(): Promise<DiscordPresenceMember[]> {
  const data = await fetchDiscordWidgetData()
  return data.members
}

export function matchDiscordMember(
  account: {
    username: string
    email?: string
    profile?: Record<string, unknown> | null
    links?: { discord?: { id?: string; username?: string }; bnet?: { battletag?: string } }
    characters?: Array<{ firstName?: string; lastName?: string }>
  },
  widgetMembers: DiscordPresenceMember[],
): DiscordPresenceMember | null {
  if (!widgetMembers || widgetMembers.length === 0) return null

  const isGm = isGuildMasterEmail(account.email || '') || matchesGmIdentity(account.username)

  // 1. Linked Discord ID match (highest priority)
  const linkedId = account.links?.discord?.id
  if (linkedId) {
    const found = widgetMembers.find((m) => m.id === linkedId)
    if (found) return found
  }

  // 2. GM identity match
  if (isGm) {
    const gmMatch = widgetMembers.find(
      (m) =>
        m.id === GM_DISCORD_USER_ID ||
        matchesGmIdentity(m.username) ||
        m.username.toLowerCase().includes('sonat') ||
        m.username.toLowerCase().includes('waffle'),
    )
    if (gmMatch) return gmMatch
  }

  // Extract candidate tokens from account
  const rawProfile = (account.profile || {}) as Record<string, unknown>
  const profileDiscordTag = typeof rawProfile.discordTag === 'string' ? rawProfile.discordTag : ''
  const linkedDiscordUsername = account.links?.discord?.username || ''
  const discordInput = (linkedDiscordUsername || profileDiscordTag || '').trim()

  const rawBnet = (account.links?.bnet?.battletag || rawProfile.bnetId || '').toString().trim()
  const bnetPrefix = rawBnet.includes('#') ? rawBnet.split('#')[0].trim() : rawBnet

  const charNames = (account.characters || [])
    .map((c) => (c.firstName || '').trim())
    .filter((n) => n.length >= 3)

  const rawFullName = typeof rawProfile.fullName === 'string' ? rawProfile.fullName.trim() : ''
  const nameParts = rawFullName
    .split(/\s+/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 3)

  const accountUsername = (account.username || '').trim()

  // Collect prioritized candidates
  const candidates: Array<{ text: string; exact: boolean; priority: number }> = []

  if (discordInput) {
    const cleaned = discordInput.replace(/^@/, '').split('#')[0].trim().toLowerCase()
    if (cleaned.length >= 3) {
      candidates.push({ text: cleaned, exact: false, priority: 1 })
    }
  }

  if (accountUsername.length >= 3) {
    candidates.push({ text: accountUsername.toLowerCase(), exact: false, priority: 2 })
  }

  if (bnetPrefix.length >= 3) {
    candidates.push({ text: bnetPrefix.toLowerCase(), exact: false, priority: 3 })
  }

  for (const cn of charNames) {
    candidates.push({ text: cn.toLowerCase(), exact: false, priority: 4 })
  }

  for (const np of nameParts) {
    candidates.push({ text: np.toLowerCase(), exact: np.length < 4, priority: 5 })
  }

  candidates.sort((a, b) => a.priority - b.priority)

  for (const cand of candidates) {
    for (const m of widgetMembers) {
      const u = (m.username || '').toLowerCase()
      if (!u) continue

      if (u === cand.text) return m

      // Split discord username into segments (e.g. "KaaN / Yalwarior", "Jamiryo/Ersin", "Avachy | Tengri", "Bahaddur / Bahadır", "Reyn | Fatih")
      const segments = u
        .split(/[\/\\|_\-\.\(\)\s]+/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 3)

      for (const seg of segments) {
        if (seg === cand.text) return m
        if (!cand.exact && cand.text.length >= 4 && (seg.includes(cand.text) || cand.text.includes(seg))) {
          return m
        }
      }

      if (!cand.exact && cand.text.length >= 4 && u.includes(cand.text)) {
        return m
      }
    }
  }

  return null
}
