import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { oauthConfigured, type OauthProvider } from '@/lib/account-links'
import { appOrigin } from '@/lib/auth-email'

const STATE_COOKIE = 'turx_oauth_state'
const STATE_TTL_MS = 10 * 60 * 1000

function authSecret() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET missing')
  return secret
}

function equal(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

function sign(payload: string) {
  return createHmac('sha256', authSecret()).update(`oauth:${payload}`).digest('base64url')
}

export function oauthRedirectUri(request: Request, provider: OauthProvider) {
  return `${appOrigin(request)}/api/oauth/${provider}/callback`
}

export function oauthProfileRedirect(request: Request, params: Record<string, string>) {
  const url = new URL(`${appOrigin(request)}/`)
  url.searchParams.set('tab', 'profile')
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url.toString()
}

export function createOauthState(username: string, provider: OauthProvider) {
  const payload = Buffer.from(
    JSON.stringify({
      u: username,
      p: provider,
      n: randomBytes(12).toString('hex'),
      exp: Date.now() + STATE_TTL_MS,
    }),
  ).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function readOauthState(token: string): { username: string; provider: OauthProvider } | null {
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null
  if (!equal(signature, sign(payload))) return null
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      u?: string
      p?: OauthProvider
      exp?: number
    }
    if (!parsed.u || (parsed.p !== 'discord' && parsed.p !== 'bnet' && parsed.p !== 'twitch')) return null
    if (typeof parsed.exp !== 'number' || parsed.exp < Date.now()) return null
    return { username: parsed.u, provider: parsed.p }
  } catch {
    return null
  }
}

export function attachOauthState(response: NextResponse, token: string) {
  response.cookies.set(STATE_COOKIE, token, {
    path: '/',
    maxAge: Math.floor(STATE_TTL_MS / 1000),
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  })
  return response
}

export function clearOauthState(response: NextResponse) {
  response.cookies.set(STATE_COOKIE, '', { path: '/', maxAge: 0 })
  return response
}

export function oauthStateFromRequest(request: Request) {
  const cookie = request.headers.get('cookie') || ''
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${STATE_COOKIE}=([^;]*)`, 'i'))
  if (!match?.[1]) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

export function authorizeUrl(request: Request, provider: OauthProvider, state: string) {
  const redirectUri = oauthRedirectUri(request, provider)
  if (provider === 'discord') {
    const url = new URL('https://discord.com/api/oauth2/authorize')
    url.searchParams.set('client_id', process.env.DISCORD_CLIENT_ID!.trim())
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', 'identify')
    url.searchParams.set('state', state)
    url.searchParams.set('prompt', 'consent')
    return url.toString()
  }
  if (provider === 'bnet') {
    const url = new URL('https://oauth.battle.net/authorize')
    url.searchParams.set('client_id', process.env.BNET_CLIENT_ID!.trim())
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', 'openid')
    url.searchParams.set('state', state)
    return url.toString()
  }
  const url = new URL('https://id.twitch.tv/oauth2/authorize')
  url.searchParams.set('client_id', process.env.TWITCH_CLIENT_ID!.trim())
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('state', state)
  url.searchParams.set('force_verify', 'true')
  return url.toString()
}

async function formPost(url: string, body: URLSearchParams, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
    body,
    signal: AbortSignal.timeout(8000),
  })
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `oauth_token_${response.status}`)
  }
  return data
}

export async function exchangeOauthCode(request: Request, provider: OauthProvider, code: string) {
  const redirectUri = oauthRedirectUri(request, provider)
  if (provider === 'discord') {
    const token = await formPost(
      'https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!.trim(),
        client_secret: process.env.DISCORD_CLIENT_SECRET!.trim(),
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    )
    const access = String(token.access_token || '')
    const me = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access}` },
      signal: AbortSignal.timeout(8000),
    })
    const user = (await me.json()) as { id?: string; username?: string; global_name?: string }
    if (!me.ok || !user.id || !user.username) throw new Error('discord_profile')
    return {
      discord: {
        id: user.id,
        username: user.username,
        globalName: user.global_name || undefined,
      },
    }
  }

  if (provider === 'bnet') {
    const basic = Buffer.from(
      `${process.env.BNET_CLIENT_ID!.trim()}:${process.env.BNET_CLIENT_SECRET!.trim()}`,
    ).toString('base64')
    const token = await formPost(
      'https://oauth.battle.net/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
      { Authorization: `Basic ${basic}` },
    )
    const access = String(token.access_token || '')
    const me = await fetch('https://oauth.battle.net/userinfo', {
      headers: { Authorization: `Bearer ${access}` },
      signal: AbortSignal.timeout(8000),
    })
    const user = (await me.json()) as { sub?: string; id?: number; battletag?: string }
    const battletag = user.battletag || ''
    const id = String(user.sub || user.id || battletag)
    if (!me.ok || !battletag) throw new Error('bnet_profile')
    return { bnet: { id, battletag } }
  }

  const token = await formPost(
    'https://id.twitch.tv/oauth2/token',
    new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID!.trim(),
      client_secret: process.env.TWITCH_CLIENT_SECRET!.trim(),
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  )
  const access = String(token.access_token || '')
  const me = await fetch('https://api.twitch.tv/helix/users', {
    headers: {
      Authorization: `Bearer ${access}`,
      'Client-Id': process.env.TWITCH_CLIENT_ID!.trim(),
    },
    signal: AbortSignal.timeout(8000),
  })
  const body = (await me.json()) as { data?: Array<{ id?: string; login?: string; display_name?: string }> }
  const user = body.data?.[0]
  if (!me.ok || !user?.id || !user.login) throw new Error('twitch_profile')
  return {
    twitch: {
      id: user.id,
      login: user.login,
      displayName: user.display_name || user.login,
    },
  }
}

export function providerConfigured(provider: OauthProvider) {
  return oauthConfigured()[provider]
}
