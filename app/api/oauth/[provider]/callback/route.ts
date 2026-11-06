import { NextResponse } from 'next/server'
import { isOauthProvider } from '@/lib/account-links'
import {
  clearOauthState,
  exchangeOauthCode,
  oauthProfileRedirect,
  oauthStateFromRequest,
  readOauthState,
} from '@/lib/oauth'
import { mutateGuildStore } from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider: raw } = await context.params
  const url = new URL(request.url)
  const finish = (params: Record<string, string>) => {
    const response = NextResponse.redirect(oauthProfileRedirect(request, params))
    return clearOauthState(response)
  }

  if (!isOauthProvider(raw)) return finish({ oauth: 'error', reason: 'unknown' })
  if (url.searchParams.get('error')) return finish({ oauth: 'denied', provider: raw })

  const code = url.searchParams.get('code') || ''
  const stateParam = url.searchParams.get('state') || ''
  const cookieState = oauthStateFromRequest(request) || ''
  const parsed = readOauthState(stateParam) || readOauthState(cookieState)
  if (!code || !parsed || parsed.provider !== raw) {
    return finish({ oauth: 'error', provider: raw, reason: 'state' })
  }

  try {
    const linked = await exchangeOauthCode(request, raw, code)
    await mutateGuildStore((store) => {
      const found = store.users.find((item) => item.username.toLowerCase() === parsed.username.toLowerCase())
      if (!found) throw new Error('NOT_FOUND')
      found.links = { ...(found.links || {}), ...linked }
      const profile = { ...(found.profile || {}) }
      if (linked.discord) {
        profile.discordTag = linked.discord.globalName || linked.discord.username
        profile.discordConnected = true
      }
      if (linked.bnet) {
        profile.bnetId = linked.bnet.battletag
        profile.bnetConnected = true
      }
      if (linked.twitch) {
        profile.twitchLogin = linked.twitch.login
        profile.twitchDisplayName = linked.twitch.displayName
        profile.twitchConnected = true
      }
      found.profile = profile
    })
    return finish({ oauth: 'ok', provider: raw })
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      return finish({ oauth: 'login', provider: raw })
    }
    console.error('oauth callback', raw, err)
    return finish({ oauth: 'error', provider: raw })
  }
}
