export const OAUTH_PROVIDERS = ['discord', 'bnet', 'twitch'] as const
export type OauthProvider = (typeof OAUTH_PROVIDERS)[number]

export type DiscordLink = {
  id: string
  username: string
  globalName?: string
}

export type BnetLink = {
  id: string
  battletag: string
}

export type TwitchLink = {
  id: string
  login: string
  displayName: string
}

export type AccountLinks = {
  discord?: DiscordLink
  bnet?: BnetLink
  twitch?: TwitchLink
}

export type StreamPlatform = 'twitch' | 'kick' | 'youtube'

export type StreamNotice = {
  platform?: StreamPlatform
  channelKey?: string
  twitchUserId?: string
  streamId: string
  notifiedAt: string
  sent?: boolean
}

export type StreamRadarCard = {
  platform: StreamPlatform
  username: string
  streamer: string
  login: string
  title: string
  viewers: number
  url: string
  thumbnailUrl: string | null
  live: boolean
  streamId?: string
}

export type LiveStreamCard = StreamRadarCard

function stripUrlPath(value: string, hosts: string[]) {
  let login = value.trim()
  login = login.replace(/^https?:\/\//i, '')
  for (const host of hosts) {
    login = login.replace(new RegExp(`^(www\\.)?${host}/`, 'i'), '')
  }
  return login.replace(/^@/, '').split(/[/?#]/)[0] || ''
}

export function normalizeTwitchLogin(value: string) {
  const login = stripUrlPath(value, ['twitch\\.tv']).toLowerCase().replace(/[^a-z0-9_]/g, '')
  return login.slice(0, 25)
}

export function normalizeKickSlug(value: string) {
  const login = stripUrlPath(value, ['kick\\.com']).toLowerCase().replace(/[^a-z0-9_-]/g, '')
  return login.slice(0, 32)
}

export function normalizeYoutubeHandle(value: string) {
  let login = value.trim()
  login = login.replace(/^https?:\/\//i, '')
  login = login.replace(/^(www\.|m\.)?youtube\.com\//i, '')
  login = login.replace(/^(www\.|m\.)?youtu\.be\//i, '')
  if (/^channel\//i.test(login)) {
    const id = login.replace(/^channel\//i, '').split(/[/?#]/)[0] || ''
    return /^UC[\w-]{20,}$/.test(id) ? id : ''
  }
  login = login.replace(/^(c|user|@)\//i, '')
  login = login.replace(/^@/, '').split(/[/?#]/)[0] || ''
  if (/^UC[\w-]{20,}$/.test(login)) return login
  login = login.replace(/[^\w.-]/g, '')
  return login.slice(0, 30)
}

export function youtubeChannelUrl(handle: string) {
  return /^UC[\w-]{20,}$/.test(handle) ? `https://www.youtube.com/channel/${handle}` : `https://www.youtube.com/@${handle}`
}

export function isOauthProvider(value: string | undefined): value is OauthProvider {
  return Boolean(value && (OAUTH_PROVIDERS as readonly string[]).includes(value))
}

export function publicLinks(links: AccountLinks | null | undefined) {
  const discord = links?.discord
  const bnet = links?.bnet
  const twitch = links?.twitch
  return {
    discord: discord
      ? { connected: true as const, username: discord.globalName || discord.username }
      : { connected: false as const, username: '' },
    bnet: bnet
      ? { connected: true as const, battletag: bnet.battletag }
      : { connected: false as const, battletag: '' },
    twitch: twitch
      ? { connected: true as const, login: twitch.login, displayName: twitch.displayName }
      : { connected: false as const, login: '', displayName: '' },
  }
}

export function oauthConfigured() {
  return {
    discord: Boolean(process.env.DISCORD_CLIENT_ID?.trim() && process.env.DISCORD_CLIENT_SECRET?.trim()),
    bnet: Boolean(process.env.BNET_CLIENT_ID?.trim() && process.env.BNET_CLIENT_SECRET?.trim()),
    twitch: Boolean(process.env.TWITCH_CLIENT_ID?.trim() && process.env.TWITCH_CLIENT_SECRET?.trim()),
  }
}
