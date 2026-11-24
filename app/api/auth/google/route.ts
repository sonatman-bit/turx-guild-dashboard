import { NextResponse } from 'next/server'
import { appOrigin } from '@/lib/auth-email'
import {
  attachGoogleStateCookie,
  buildGoogleAuthorizeUrl,
  createGoogleState,
  isGoogleAuthConfigured,
} from '@/lib/google-oauth'
import { blobConfigured } from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const enabled = isGoogleAuthConfigured() && blobConfigured()

  if (searchParams.get('status') === '1') {
    return NextResponse.json({ enabled }, { headers: { 'Cache-Control': 'no-store' } })
  }

  if (!enabled) {
    return NextResponse.redirect(`${appOrigin(request)}/?google_auth=disabled`)
  }

  const state = createGoogleState()
  const response = NextResponse.redirect(buildGoogleAuthorizeUrl(request, state))
  return attachGoogleStateCookie(response, state)
}
