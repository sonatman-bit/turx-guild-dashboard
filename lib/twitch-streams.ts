import { normalizeTwitchLogin, type LiveStreamCard, type StreamNotice } from '@/lib/account-links'
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

let appToken: { value: string; expires: number } | null = null
let liveCache: { at: number; live: LiveStreamCard[] } | null = null
const LIVE_CACHE_MS = 45_000

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

function previewUrl(template: string | undefined) {
  if (!template) return null
  return template.replace('{width}', '440').replace('{height}', '248')
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

async function notifyDiscord(card: LiveStreamCard) {
  const webhook = streamWebhookUrl()
  if (!webhook) return
  const response = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [
        {
          title: '🔴 TURX yayını başladı',
          color: 0x9146ff,
          fields: [
            { name: 'Site kullanıcı adı', value: card.username, inline: true },
            { name: 'Yayıncı adı', value: card.streamer, inline: true },
            { name: 'Yayın başlığı', value: card.title || 'Başlıksız', inline: false },
            { name: 'Twitch', value: card.url, inline: false },
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

export async function refreshLiveStreams() {
  if (!twitchConfigured()) return [] as LiveStreamCard[]
  if (liveCache && liveCache.at + LIVE_CACHE_MS > Date.now()) {
    return liveCache.live
  }

  const store = await loadGuildStore()
  const linked = store.users.flatMap((account) => {
    const profile = (account.profile || {}) as Record<string, unknown>
    const login = normalizeTwitchLogin(
      account.links?.twitch?.login || (typeof profile.twitchLogin === 'string' ? profile.twitchLogin : ''),
    )
    if (!login) return []
    return [{ username: account.username, login }]
  })
  const helix = await helixLiveStreams(linked.map((item) => item.login))
  const byLogin = new Map(linked.map((item) => [item.login, item]))
  const live: LiveStreamCard[] = helix.flatMap((stream) => {
    const login = stream.user_login?.toLowerCase()
    const member = login ? byLogin.get(login) : undefined
    if (!member || !login) return []
    return [
      {
        username: member.username,
        streamer: stream.user_name || login,
        login,
        title: (stream.title || '').trim() || 'WoW: Forever',
        viewers: typeof stream.viewer_count === 'number' ? stream.viewer_count : 0,
        url: `https://www.twitch.tv/${login}`,
        thumbnailUrl: previewUrl(stream.thumbnail_url),
      },
    ]
  })

  liveCache = { at: Date.now(), live }

  {
    const notices = Array.isArray(store.streamNotices) ? store.streamNotices : []
    const fresh: StreamNotice[] = []
    for (const stream of helix) {
      if (!stream.user_id || !stream.id) continue
      const member = stream.user_login ? byLogin.get(stream.user_login.toLowerCase()) : undefined
      if (!member) continue
      const already = notices.find((item) => item.twitchUserId === stream.user_id && item.streamId === stream.id)
      if (already) {
        fresh.push(already)
        continue
      }
      const card = live.find((item) => item.login === stream.user_login?.toLowerCase())
      if (card) await notifyDiscord(card)
      fresh.push({
        twitchUserId: stream.user_id,
        streamId: stream.id,
        notifiedAt: new Date().toISOString(),
      })
    }
    const changed =
      fresh.length !== notices.length ||
      fresh.some((item, index) => item.streamId !== notices[index]?.streamId || item.twitchUserId !== notices[index]?.twitchUserId)
    if (changed) {
      await mutateGuildStore((next) => {
        next.streamNotices = fresh
      })
    }
  }

  return live
}
