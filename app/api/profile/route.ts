import { NextResponse } from 'next/server'
import {
  normalizeKickSlug,
  normalizeTwitchLogin,
  normalizeYoutubeHandle,
  oauthConfigured,
  publicLinks,
} from '@/lib/account-links'
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
    const kickLogin = typeof stored.kickLogin === 'string' ? stored.kickLogin : ''
    const youtubeHandle = typeof stored.youtubeHandle === 'string' ? stored.youtubeHandle : ''
    const showRealNameInRoster = stored.showRealNameInRoster !== false
    const profile = {
      ...stored,
      showRealNameInRoster,
      discordConnected: links.discord.connected || Boolean(storedTag),
      discordTag: links.discord.username || storedTag,
      bnetConnected: links.bnet.connected || Boolean(storedBnet),
      bnetId: links.bnet.battletag || storedBnet,
      twitchConnected: Boolean(twitchLogin),
      twitchLogin,
      twitchDisplayName: links.twitch.displayName || twitchLogin,
      kickLogin,
      youtubeHandle,
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

      const prevProfile = (found.profile || {}) as Record<string, unknown>
      const showRealName = typeof profile.showRealNameInRoster === 'boolean'
        ? profile.showRealNameInRoster
        : prevProfile.showRealNameInRoster !== false
      profile.showRealNameInRoster = showRealName

      // Keep links in sync with profile bnet / discord
      const links = { ...(found.links || {}) }
      const bnetTag = typeof profile.bnetId === 'string' ? profile.bnetId.trim() : ''
      if (bnetTag) {
        links.bnet = { id: bnetTag, battletag: bnetTag }
        profile.bnetConnected = true
        profile.bnetId = bnetTag
      } else if (!links.bnet) {
        profile.bnetConnected = false
      } else {
        profile.bnetConnected = true
        profile.bnetId = links.bnet.battletag
      }

      const discordUser = typeof profile.discordTag === 'string' ? profile.discordTag.trim().replace(/^@/, '') : ''
      if (discordUser) {
        links.discord = { id: discordUser, username: discordUser, globalName: discordUser }
        profile.discordConnected = true
        profile.discordTag = discordUser
      } else if (!links.discord) {
        profile.discordConnected = false
      } else {
        profile.discordConnected = true
        profile.discordTag = links.discord.username
      }

      found.links = links

      const twitchLogin = links.twitch?.login || normalizeTwitchLogin(String(profile.twitchLogin || ''))
      profile.twitchLogin = twitchLogin
      profile.twitchDisplayName = links.twitch?.displayName || twitchLogin
      profile.twitchConnected = Boolean(twitchLogin)
      profile.kickLogin = normalizeKickSlug(String(profile.kickLogin || ''))
      profile.youtubeHandle = normalizeYoutubeHandle(String(profile.youtubeHandle || ''))
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
