import { NextResponse } from 'next/server'
import { sessionFromRequest } from '@/lib/auth-email'
import { publicLinks } from '@/lib/account-links'
import { blobConfigured, loadGuildStore, mutateGuildStore } from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ error: 'Hesap deposu henüz bağlı değil.' }, { status: 503 })
    }

    const session = sessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      provider?: string
      value?: string
    }

    const provider = body.provider?.toLowerCase()
    const value = (body.value || '').trim()

    if (provider !== 'discord' && provider !== 'bnet') {
      return NextResponse.json({ error: 'Geçersiz sağlayıcı. Sadece "discord" veya "bnet" desteklenir.' }, { status: 400 })
    }

    if (!value) {
      return NextResponse.json(
        { error: provider === 'discord' ? 'Discord kullanıcı adı boş olamaz.' : 'BattleTag boş olamaz.' },
        { status: 400 },
      )
    }

    let updatedAccount: { username: string; links: ReturnType<typeof publicLinks> } | null = null

    await mutateGuildStore((store) => {
      const found = store.users.find((u) => u.username.toLowerCase() === session.username.toLowerCase())
      if (!found) throw new Error('NOT_FOUND')

      const links = { ...(found.links || {}) }
      const profile = { ...(found.profile || {}) }

      if (provider === 'discord') {
        const cleanTag = value.replace(/^@/, '')
        links.discord = {
          id: cleanTag,
          username: cleanTag,
          globalName: cleanTag,
        }
        profile.discordConnected = true
        profile.discordTag = cleanTag
      } else if (provider === 'bnet') {
        links.bnet = {
          id: value,
          battletag: value,
        }
        profile.bnetConnected = true
        profile.bnetId = value
      }

      found.links = links
      found.profile = profile
      updatedAccount = {
        username: found.username,
        links: publicLinks(found.links),
      }
    })

    return NextResponse.json({ ok: true, account: updatedAccount })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Hesap bulunamadı.' }, { status: 404 })
    }
    console.error('oauth connect error', err)
    return NextResponse.json({ error: 'Hesap bağlantısı kaydedilemedi.' }, { status: 500 })
  }
}
