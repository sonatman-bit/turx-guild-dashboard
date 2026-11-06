import { NextResponse } from 'next/server'
import { isOauthProvider } from '@/lib/account-links'
import { sessionFromRequest } from '@/lib/auth-email'
import { mutateGuildStore } from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = sessionFromRequest(request)
    if (!session) return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 })
    const body = (await request.json().catch(() => ({}))) as { provider?: string }
    if (!isOauthProvider(body.provider)) {
      return NextResponse.json({ error: 'Geçersiz sağlayıcı.' }, { status: 400 })
    }
    await mutateGuildStore((store) => {
      const found = store.users.find((item) => item.username.toLowerCase() === session.username.toLowerCase())
      if (!found) throw new Error('NOT_FOUND')
      const links = { ...(found.links || {}) }
      const profile = { ...(found.profile || {}) }
      if (body.provider === 'discord') {
        delete links.discord
        profile.discordConnected = false
        profile.discordTag = ''
      }
      if (body.provider === 'bnet') {
        delete links.bnet
        profile.bnetConnected = false
      }
      if (body.provider === 'twitch') {
        const twitchId = found.links?.twitch?.id
        delete links.twitch
        profile.twitchConnected = false
        profile.twitchLogin = ''
        profile.twitchDisplayName = ''
        if (twitchId) {
          store.streamNotices = (store.streamNotices || []).filter((item) => item.twitchUserId !== twitchId)
        }
      }
      found.links = links
      found.profile = profile
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Hesap bulunamadı.' }, { status: 404 })
    }
    console.error('oauth disconnect', err)
    return NextResponse.json({ error: 'Bağlantı kaldırılamadı.' }, { status: 500 })
  }
}
