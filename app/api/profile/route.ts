import { NextResponse } from 'next/server'
import { normalizeTwitchLogin, oauthConfigured, publicLinks } from '@/lib/account-links'
import { sessionFromRequest } from '@/lib/auth-email'
import { hasRequiredOnboarding, type OnboardingCharacter, type OnboardingProfile } from '@/lib/profile-gate'
import { sanitizeStaffInterests } from '@/lib/staff-roles'
import { blobConfigured, loadGuildStore, mutateGuildStore } from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(request: Request) {
  try {
    if (!blobConfigured()) return json({ error: 'Hesap deposu henüz bağlı değil.' }, 503)
    const session = sessionFromRequest(request)
    if (!session) return json({ error: 'Oturum gerekli.' }, 401)
    const store = await loadGuildStore()
    const found = store.users.find((item) => item.username.toLowerCase() === session.username.toLowerCase())
    if (!found) return json({ error: 'Hesap bulunamadı.' }, 404)
    const links = publicLinks(found.links)
    const stored = (found.profile || {}) as Record<string, unknown>
    const storedTag = typeof stored.discordTag === 'string' ? stored.discordTag : ''
    const storedBnet = typeof stored.bnetId === 'string' ? stored.bnetId : ''
    const storedTwitch = typeof stored.twitchLogin === 'string' ? stored.twitchLogin : ''
    const twitchLogin = links.twitch.login || storedTwitch
    const profile = {
      ...stored,
      discordConnected: links.discord.connected,
      discordTag: links.discord.username || storedTag,
      bnetConnected: links.bnet.connected,
      bnetId: links.bnet.battletag || storedBnet,
      twitchConnected: Boolean(twitchLogin),
      twitchLogin,
      twitchDisplayName: links.twitch.displayName || twitchLogin,
    } as unknown as OnboardingProfile
    const characters = (found.characters || []) as OnboardingCharacter[]
    return json({
      profile,
      characters,
      links,
      oauth: oauthConfigured(),
      staffInterests: sanitizeStaffInterests(found.staffInterests),
      profileComplete: hasRequiredOnboarding(profile, characters),
    })
  } catch (err) {
    console.error('profile GET', err)
    return json({ error: 'Profil okunamadı.' }, 500)
  }
}

export async function PUT(request: Request) {
  try {
    if (!blobConfigured()) return json({ error: 'Hesap deposu henüz bağlı değil.' }, 503)
    const session = sessionFromRequest(request)
    if (!session) return json({ error: 'Oturum gerekli.' }, 401)
    const body = (await request.json()) as {
      profile?: OnboardingProfile
      characters?: OnboardingCharacter[]
      staffInterests?: unknown
    }
    const profile = { ...(body.profile || {}) } as Record<string, unknown>
    const characters = Array.isArray(body.characters) ? body.characters : []
    const staffInterests = sanitizeStaffInterests(body.staffInterests)

    await mutateGuildStore((store) => {
      const found = store.users.find((item) => item.username.toLowerCase() === session.username.toLowerCase())
      if (!found) throw new Error('NOT_FOUND')
      const links = publicLinks(found.links)
      profile.discordConnected = links.discord.connected
      profile.discordTag = links.discord.username || profile.discordTag || ''
      profile.bnetConnected = links.bnet.connected
      if (links.bnet.battletag) profile.bnetId = links.bnet.battletag
      const twitchLogin = links.twitch.login || normalizeTwitchLogin(String(profile.twitchLogin || ''))
      profile.twitchLogin = twitchLogin
      profile.twitchDisplayName = links.twitch.displayName || twitchLogin
      profile.twitchConnected = Boolean(twitchLogin)
      const profileComplete = hasRequiredOnboarding(profile as OnboardingProfile, characters)
      found.profile = profile
      found.characters = characters
      found.staffInterests = staffInterests
      found.onboardingComplete = profileComplete
    })

    const profileComplete = hasRequiredOnboarding(profile as OnboardingProfile, characters)

    return json({ ok: true, profileComplete })
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      return json({ error: 'Hesap bulunamadı.' }, 404)
    }
    console.error('profile PUT', err)
    return json({ error: 'Profil kaydedilemedi.' }, 500)
  }
}
