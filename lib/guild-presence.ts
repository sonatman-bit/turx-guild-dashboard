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

const WOW_NAME = /world of warcraft|wow classic|\bwow\b|warcraft/i

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
