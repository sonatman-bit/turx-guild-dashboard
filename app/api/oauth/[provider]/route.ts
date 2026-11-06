import { NextResponse } from 'next/server'
import { isOauthProvider } from '@/lib/account-links'
import { sessionFromRequest } from '@/lib/auth-email'
import {
  attachOauthState,
  authorizeUrl,
  createOauthState,
  oauthProfileRedirect,
  providerConfigured,
} from '@/lib/oauth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider: raw } = await context.params
  if (!isOauthProvider(raw)) {
    return NextResponse.redirect(oauthProfileRedirect(request, { oauth: 'error', reason: 'unknown' }))
  }
  const session = sessionFromRequest(request)
  if (!session) {
    return NextResponse.redirect(oauthProfileRedirect(request, { oauth: 'login', provider: raw }))
  }
  if (!providerConfigured(raw)) {
    return NextResponse.redirect(oauthProfileRedirect(request, { oauth: 'missing', provider: raw }))
  }
  const state = createOauthState(session.username, raw)
  const response = NextResponse.redirect(authorizeUrl(request, raw, state))
  return attachOauthState(response, state)
}
