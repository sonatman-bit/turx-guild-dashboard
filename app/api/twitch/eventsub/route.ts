import { NextResponse } from 'next/server'
import { normalizeTwitchLogin, type StreamRadarCard } from '@/lib/account-links'
import { eventSubMessageType, verifyTwitchEventSub } from '@/lib/twitch-eventsub'
import { announceNewStreams } from '@/lib/twitch-streams'
import { loadGuildStore } from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

type EventBody = {
  challenge?: string
  event?: {
    id?: string
    broadcaster_user_id?: string
    broadcaster_user_login?: string
    broadcaster_user_name?: string
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  if (!verifyTwitchEventSub(request, rawBody)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 403 })
  }
  const type = eventSubMessageType(request)
  const body = JSON.parse(rawBody || '{}') as EventBody
  if (type === 'webhook_callback_verification') {
    return new Response(body.challenge || '', { status: 200, headers: { 'Content-Type': 'text/plain' } })
  }
  if (type === 'notification') {
    const login = normalizeTwitchLogin(body.event?.broadcaster_user_login || '')
    if (login) {
      const store = await loadGuildStore()
      const account = store.users.find((item) => {
        const profile = (item.profile || {}) as Record<string, unknown>
        const saved = normalizeTwitchLogin(
          item.links?.twitch?.login || (typeof profile.twitchLogin === 'string' ? profile.twitchLogin : ''),
        )
        return saved === login
      })
      const card: StreamRadarCard = {
        platform: 'twitch',
        username: account?.username || login,
        streamer: body.event?.broadcaster_user_name || login,
        login,
        title: 'Yayın başladı',
        viewers: 0,
        url: `https://www.twitch.tv/${login}`,
        thumbnailUrl: `https://static-cdn.jtvnw.net/previews-ttv/live_user_${login}-440x248.jpg`,
        live: true,
        streamId: body.event?.id,
      }
      await announceNewStreams([card])
    }
  }
  return NextResponse.json({ ok: true })
}
