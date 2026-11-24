import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { appOrigin } from '@/lib/auth-email'

const GOOGLE_STATE_COOKIE = 'turx_google_state'
const STATE_TTL_MS = 10 * 60 * 1000

export function isGoogleAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim())
}

function authSecret() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET missing')
  return secret
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

function sign(payload: string) {
  return createHmac('sha256', authSecret()).update(`google-auth:${payload}`).digest('base64url')
}

export function createGoogleState(): string {
  const payload = Buffer.from(
    JSON.stringify({ n: randomBytes(16).toString('hex'), exp: Date.now() + STATE_TTL_MS }),
  ).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function verifyGoogleState(token: string | null | undefined): boolean {
  if (!token) return false
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return false
  if (!safeEqual(signature, sign(payload))) return false
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp?: number }
    return typeof parsed.exp === 'number' && parsed.exp >= Date.now()
  } catch {
    return false
  }
}

export function attachGoogleStateCookie(response: NextResponse, state: string) {
  response.cookies.set(GOOGLE_STATE_COOKIE, state, {
    path: '/',
    maxAge: Math.floor(STATE_TTL_MS / 1000),
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  })
  return response
}

export function clearGoogleStateCookie(response: NextResponse) {
  response.cookies.set(GOOGLE_STATE_COOKIE, '', { path: '/', maxAge: 0 })
  return response
}

export function googleStateFromRequest(request: Request): string | null {
  const cookie = request.headers.get('cookie') || ''
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${GOOGLE_STATE_COOKIE}=([^;]*)`, 'i'))
  if (!match?.[1]) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

export function googleRedirectUri(request: Request): string {
  return `${appOrigin(request)}/api/auth/google/callback`
}

export function buildGoogleAuthorizeUrl(request: Request, state: string): string {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!.trim())
  url.searchParams.set('redirect_uri', googleRedirectUri(request))
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid email profile')
  url.searchParams.set('state', state)
  url.searchParams.set('prompt', 'select_account')
  return url.toString()
}

export async function exchangeGoogleCode(request: Request, code: string): Promise<{
  email: string
  emailVerified: boolean
  name: string
}> {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
      client_secret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
      redirect_uri: googleRedirectUri(request),
      grant_type: 'authorization_code',
    }),
    signal: AbortSignal.timeout(8000),
  })
  const tokenData = (await tokenRes.json().catch(() => ({}))) as { access_token?: string; error?: string }
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(tokenData.error || `google_token_${tokenRes.status}`)
  }

  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
    signal: AbortSignal.timeout(8000),
  })
  const userData = (await userRes.json().catch(() => ({}))) as {
    email?: string
    email_verified?: boolean
    name?: string
  }
  if (!userRes.ok || !userData.email) {
    throw new Error(`google_userinfo_${userRes.status}`)
  }

  return {
    email: userData.email.trim().toLowerCase(),
    emailVerified: Boolean(userData.email_verified),
    name: (userData.name || '').trim(),
  }
}
