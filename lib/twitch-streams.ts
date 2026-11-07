import {
  normalizeKickSlug,
  normalizeTwitchLogin,
  normalizeYoutubeHandle,
  youtubeChannelUrl,
  type StreamNotice,
  type StreamPlatform,
  type StreamRadarCard,
} from '@/lib/account-links'
import { loadGuildStore, mutateGuildStore } from '@/lib/turx-store'

type HelixStream = {
  id?: string
  user_id?: string
  user_login?: string
  user_name?: string
  title?: string
  viewer_count?: number
  thumbnail_url?: string
}

type LinkedChannel = {
  platform: StreamPlatform
  username: string
  login: string
  url: string
}

type KickChannel = {
  slug?: string
  user?: { username?: string }
  livestream?: {
    id?: number | string
    session_title?: string
    viewer_count?: number
    thumbnail?: { url?: string } | string
    is_live?: boolean
  } | null
}

let appToken: { value: string; expires: number } | null = null
let radarCache: { at: number; channels: StreamRadarCard[] } | null = null
const LIVE_CACHE_MS = 45_000
const FETCH_CONCURRENCY = 4

function twitchConfigured() {
  return Boolean(process.env.TWITCH_CLIENT_ID?.trim() && process.env.TWITCH_CLIENT_SECRET?.trim())
}

function streamWebhookUrl() {
  return (
    process.env.DISCORD_STREAM_WEBHOOK_URL?.trim() ||
    process.env.DISCORD_RECRUITMENT_WEBHOOK_URL?.trim() ||
    ''
  )
}

function previewUrl(template: string | undefined) {
  if (!template) return null
  return template.replace('{width}', '440').replace('{height}', '248')
}

function kickThumb(value: KickChannel['livestream']) {
  if (!value?.thumbnail) return null
  return typeof value.thumbnail === 'string' ? value.thumbnail : value.thumbnail.url || null
}

function browserHeaders() {
  return {
    Accept: 'application/json,text/html',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  }
}

async function mapPool<T, R>(items: T[], worker: (item: T) => Promise<R>) {
  const results: R[] = []
  let cursor = 0
  async function run() {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await worker(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, items.length || 1) }, () => run()))
  return results
}

function offlineCard(channel: LinkedChannel): StreamRadarCard {
  return {
    platform: channel.platform,
    username: channel.username,
    streamer: channel.login,
    login: channel.login,
    title: '',
    viewers: 0,
    url: channel.url,
    thumbnailUrl: null,
    live: false,
  }
}

function sortRadar(channels: StreamRadarCard[]) {
  return [...channels].sort((a, b) => {
    if (a.live !== b.live) return a.live ? -1 : 1
    return a.username.localeCompare(b.username, 'tr')
  })
}

async function twitchAppToken() {
  if (appToken && appToken.expires > Date.now() + 30_000) return appToken.value
  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID!.trim(),
      client_secret: process.env.TWITCH_CLIENT_SECRET!.trim(),
      grant_type: 'client_credentials',
    }),
    signal: AbortSignal.timeout(8000),
  })
  const data = (await response.json()) as { access_token?: string; expires_in?: number }
  if (!response.ok || !data.access_token) throw new Error('twitch_app_token')
  appToken = {
    value: data.access_token,
    expires: Date.now() + Math.max(60, data.expires_in || 3600) * 1000,
  }
  return appToken.value
}

async function helixLiveStreams(logins: string[]) {
  if (logins.length === 0) return [] as HelixStream[]
  const token = await twitchAppToken()
  const live: HelixStream[] = []
  for (let index = 0; index < logins.length; index += 100) {
    const batch = logins.slice(index, index + 100)
    const url = new URL('https://api.twitch.tv/helix/streams')
    for (const login of batch) url.searchParams.append('user_login', login)
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID!.trim(),
      },
      signal: AbortSignal.timeout(8000),
    })
    const body = (await response.json()) as { data?: HelixStream[] }
    if (!response.ok) throw new Error(`twitch_streams_${response.status}`)
    live.push(...(body.data || []))
  }
  return live
}

async function kickLive(slug: string) {
  const response = await fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(slug)}`, {
    headers: browserHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) return null
  const body = (await response.json()) as KickChannel
  const livestream = body.livestream
  if (!livestream || livestream.is_live === false) return null
  return {
    id: String(livestream.id || ''),
    streamer: body.user?.username || body.slug || slug,
    title: (livestream.session_title || '').trim() || 'Kick yayını',
    viewers: typeof livestream.viewer_count === 'number' ? livestream.viewer_count : 0,
    thumbnailUrl: kickThumb(livestream),
  }
}

function decodeText(value: string) {
  return value
    .replace(/\\u0026/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

async function youtubeLive(handle: string) {
  const liveUrl = /^UC[\w-]{20,}$/.test(handle)
    ? `https://www.youtube.com/channel/${handle}/live`
    : `https://www.youtube.com/@${handle}/live`
  const response = await fetch(liveUrl, {
    headers: { ...browserHeaders(), Accept: 'text/html' },
    redirect: 'follow',
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) return null
  const html = await response.text()
  if (!/"isLiveNow"\s*:\s*true/.test(html)) return null
  const videoId = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/)?.[1]
  const title =
    html.match(/"title":\{"simpleText":"([^"]+)"\}/)?.[1] ||
    html.match(/"title":\{"runs":\[\{"text":"([^"]+)"\}\]/)?.[1] ||
    html.match(/<meta name="title" content="([^"]+)"/)?.[1] ||
    'YouTube yayını'
  return {
    id: videoId || handle,
    streamer: handle.startsWith('UC') ? handle : `@${handle}`,
    title: decodeText(title),
    viewers: Number(html.match(/"viewCount":"(\d+)"/)?.[1] || 0),
    thumbnailUrl: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null,
    url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : liveUrl,
  }
}

async function notifyDiscord(card: StreamRadarCard) {
  const webhook = streamWebhookUrl()
  if (!webhook) return
  const platformLabel = card.platform === 'twitch' ? 'Twitch' : card.platform === 'kick' ? 'Kick' : 'YouTube'
  const response = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [
        {
          title: '🟢 TURX yayını başladı',
          color: card.platform === 'youtube' ? 0xff0000 : card.platform === 'kick' ? 0x53fc18 : 0x9146ff,
          fields: [
            { name: 'Site kullanıcı adı', value: card.username, inline: true },
            { name: 'Yayıncı adı', value: card.streamer, inline: true },
            { name: 'Platform', value: platformLabel, inline: true },
            { name: 'Yayın başlığı', value: card.title || 'Başlıksız', inline: false },
            { name: platformLabel, value: card.url, inline: false },
          ],
          image: card.thumbnailUrl ? { url: card.thumbnailUrl } : undefined,
          footer: { text: 'TURX Stream Radar' },
          timestamp: new Date().toISOString(),
        },
      ],
    }),
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) {
    console.error('stream discord webhook', response.status, await response.text().catch(() => ''))
  }
}

function collectChannels(store: Awaited<ReturnType<typeof loadGuildStore>>) {
  const channels: LinkedChannel[] = []
  for (const account of store.users) {
    const profile = (account.profile || {}) as Record<string, unknown>
    const twitch = normalizeTwitchLogin(
      account.links?.twitch?.login || (typeof profile.twitchLogin === 'string' ? profile.twitchLogin : ''),
    )
    if (twitch) {
      channels.push({
        platform: 'twitch',
        username: account.username,
        login: twitch,
        url: `https://www.twitch.tv/${twitch}`,
      })
    }
    const kick = normalizeKickSlug(typeof profile.kickLogin === 'string' ? profile.kickLogin : '')
    if (kick) {
      channels.push({
        platform: 'kick',
        username: account.username,
        login: kick,
        url: `https://kick.com/${kick}`,
      })
    }
    const youtube = normalizeYoutubeHandle(typeof profile.youtubeHandle === 'string' ? profile.youtubeHandle : '')
    if (youtube) {
      channels.push({
        platform: 'youtube',
        username: account.username,
        login: youtube,
        url: youtubeChannelUrl(youtube),
      })
    }
  }
  return channels
}

export async function refreshLiveStreams() {
  if (radarCache && radarCache.at + LIVE_CACHE_MS > Date.now()) {
    return radarCache.channels
  }

  const store = await loadGuildStore()
  const linked = collectChannels(store)
  const cards = new Map<string, StreamRadarCard>()
  for (const channel of linked) {
    cards.set(`${channel.platform}:${channel.login}:${channel.username}`, offlineCard(channel))
  }

  const twitchLinked = linked.filter((item) => item.platform === 'twitch')
  let twitchFailed = false
  if (twitchConfigured() && twitchLinked.length > 0) {
    try {
      const helix = await helixLiveStreams([...new Set(twitchLinked.map((item) => item.login))])
      const byLogin = new Map(helix.map((stream) => [stream.user_login?.toLowerCase() || '', stream]))
      for (const channel of twitchLinked) {
        const stream = byLogin.get(channel.login)
        if (!stream) continue
        cards.set(`${channel.platform}:${channel.login}:${channel.username}`, {
          platform: 'twitch',
          username: channel.username,
          streamer: stream.user_name || channel.login,
          login: channel.login,
          title: (stream.title || '').trim() || 'WoW: Forever',
          viewers: typeof stream.viewer_count === 'number' ? stream.viewer_count : 0,
          url: channel.url,
          thumbnailUrl: previewUrl(stream.thumbnail_url),
          live: true,
          streamId: stream.id,
        })
      }
    } catch (err) {
      twitchFailed = true
      console.error('twitch radar', err)
    }
  }

  await mapPool(
    linked.filter((item) => item.platform === 'kick'),
    async (channel) => {
      try {
        const live = await kickLive(channel.login)
        if (!live) return
        cards.set(`${channel.platform}:${channel.login}:${channel.username}`, {
          platform: 'kick',
          username: channel.username,
          streamer: live.streamer,
          login: channel.login,
          title: live.title,
          viewers: live.viewers,
          url: channel.url,
          thumbnailUrl: live.thumbnailUrl,
          live: true,
          streamId: live.id,
        })
      } catch (err) {
        console.error('kick radar', channel.login, err)
      }
    },
  )

  await mapPool(
    linked.filter((item) => item.platform === 'youtube'),
    async (channel) => {
      try {
        const live = await youtubeLive(channel.login)
        if (!live) return
        cards.set(`${channel.platform}:${channel.login}:${channel.username}`, {
          platform: 'youtube',
          username: channel.username,
          streamer: live.streamer,
          login: channel.login,
          title: live.title,
          viewers: live.viewers,
          url: live.url,
          thumbnailUrl: live.thumbnailUrl,
          live: true,
          streamId: live.id,
        })
      } catch (err) {
        console.error('youtube radar', channel.login, err)
      }
    },
  )

  const channels = sortRadar([...cards.values()])
  if (!twitchFailed) {
    radarCache = { at: Date.now(), channels }
  }

  {
    const notices = Array.isArray(store.streamNotices) ? store.streamNotices : []
    const liveCards = channels.filter((item) => item.live)
    const fresh: StreamNotice[] = []
    for (const card of liveCards) {
      const streamId = card.streamId || `${card.platform}:${card.login}`
      const channelKey = `${card.platform}:${card.login}`
      const already = notices.find(
        (item) =>
          (item.channelKey === channelKey || item.twitchUserId === card.login) && item.streamId === streamId,
      )
      if (already) {
        fresh.push(already)
        continue
      }
      await notifyDiscord(card)
      fresh.push({
        platform: card.platform,
        channelKey,
        streamId,
        notifiedAt: new Date().toISOString(),
      })
    }
    const changed =
      fresh.length !== notices.length ||
      fresh.some(
        (item, index) =>
          item.streamId !== notices[index]?.streamId ||
          (item.channelKey || item.twitchUserId) !== (notices[index]?.channelKey || notices[index]?.twitchUserId),
      )
    if (changed) {
      await mutateGuildStore((next) => {
        next.streamNotices = fresh
      })
    }
  }

  return channels
}
