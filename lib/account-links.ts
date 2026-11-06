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

export type StreamNotice = {
  twitchUserId: string
  streamId: string
  notifiedAt: string
}

export type LiveStreamCard = {
  username: string
  streamer: string
  login: string
  title: string
  viewers: number
  url: string
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
