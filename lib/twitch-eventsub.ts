import { createHmac, timingSafeEqual } from 'crypto'
import { configuredAppOrigin } from '@/lib/auth-email'

const MESSAGE_ID = 'twitch-eventsub-message-id'
const MESSAGE_TIMESTAMP = 'twitch-eventsub-message-timestamp'
const MESSAGE_SIGNATURE = 'twitch-eventsub-message-signature'
const MESSAGE_TYPE = 'twitch-eventsub-message-type'

function eventSubSecret() {
  const raw = (process.env.TWITCH_EVENTSUB_SECRET || process.env.AUTH_SECRET || 'turx-stream-eventsub').trim()
  return raw.slice(0, 100).padEnd(10, 'x')
}

export function eventSubCallbackUrl() {
  return `${configuredAppOrigin()}/api/twitch/eventsub`
}

export function verifyTwitchEventSub(request: Request, rawBody: string) {
  const messageId = request.headers.get(MESSAGE_ID) || ''
  const timestamp = request.headers.get(MESSAGE_TIMESTAMP) || ''
  const signature = request.headers.get(MESSAGE_SIGNATURE) || ''
  if (!messageId || !timestamp || !signature.startsWith('sha256=')) return false
  const expected = `sha256=${createHmac('sha256', eventSubSecret()).update(messageId + timestamp + rawBody).digest('hex')}`
  const left = Buffer.from(signature)
  const right = Buffer.from(expected)
  return left.length === right.length && timingSafeEqual(left, right)
}

export function eventSubMessageType(request: Request) {
  return request.headers.get(MESSAGE_TYPE) || ''
}

export async function ensureTwitchOnlineSubscriptions(
  token: string,
  clientId: string,
  userIds: string[],
) {
  if (userIds.length === 0) return
  const existing = new Set<string>()
  let cursor = ''
  for (let page = 0; page < 5; page += 1) {
    const url = new URL('https://api.twitch.tv/helix/eventsub/subscriptions')
    if (cursor) url.searchParams.set('after', cursor)
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, 'Client-Id': clientId },
      signal: AbortSignal.timeout(8000),
    })
    const body = (await response.json()) as {
      data?: Array<{ type?: string; status?: string; condition?: { broadcaster_user_id?: string } }>
      pagination?: { cursor?: string }
    }
    if (!response.ok) throw new Error(`eventsub_list_${response.status}`)
    for (const item of body.data || []) {
      if (item.type === 'stream.online' && item.status === 'enabled' && item.condition?.broadcaster_user_id) {
        existing.add(item.condition.broadcaster_user_id)
      }
    }
    cursor = body.pagination?.cursor || ''
    if (!cursor) break
  }

  const callback = eventSubCallbackUrl()
  const secret = eventSubSecret()
  for (const userId of userIds) {
    if (existing.has(userId)) continue
    const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Client-Id': clientId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'stream.online',
        version: '1',
        condition: { broadcaster_user_id: userId },
        transport: { method: 'webhook', callback, secret },
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok && response.status !== 409) {
      console.error('eventsub subscribe', userId, response.status, await response.text().catch(() => ''))
    }
  }
}
