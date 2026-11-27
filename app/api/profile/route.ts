import { NextResponse } from 'next/server'
import {
  normalizeKickSlug,
  normalizeTwitchLogin,
  normalizeYoutubeHandle,
  oauthConfigured,
  publicLinks,
} from '@/lib/account-links'
import { syncMainCharacterArmory } from '@/lib/armory-account'
import { sessionFromRequest } from '@/lib/auth-email'
import { normalizeAvailability } from '@/lib/availability'
import {
  hasAvailabilityRequirement,
  hasRequiredOnboarding,
  type OnboardingCharacter,
  type OnboardingProfile,
} from '@/lib/profile-gate'
import { sanitizeStaffInterests } from '@/lib/staff-roles'
import { blobConfigured, loadGuildStore, mutateGuildStore } from '@/lib/turx-store'
import type { ArmoryVerificationResult } from '@/lib/wow-armory'

export const dynamic = 'force-dynamic'

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(request: Request) {
  try {
    if (!blobConfigured()) return json({ error: 'Hesap deposu henüz bağlı değil.' }, 503)
    const session = sessionFromRequest(request)
    if (!session) return json({ error: 'Oturum gerekli.' }, 401)
    let store = await loadGuildStore()
    let found = store.users.find((item) => item.username.toLowerCase() === session.username.toLowerCase())
    if (!found) {
      store = await loadGuildStore(true)
      found = store.users.find((item) => item.username.toLowerCase() === session.username.toLowerCase())
    }
    if (!found) return json({ error: 'Hesap bulunamadı.' }, 404)

    let characters = (found.characters || []) as OnboardingCharacter[]
    const mainChar = characters.find((c) => c.isMain && c.firstName?.trim() && c.lastName?.trim())
    if (mainChar && mainChar.armoryVerified !== true) {
      const synced = await syncMainCharacterArmory(characters, characters)
      if (synced.changed && synced.armoryResult?.ok) {
        characters = synced.characters
        await mutateGuildStore((s) => {
          const target = s.users.find((u) => u.username.toLowerCase() === session.username.toLowerCase())
          if (target) {
            target.characters = synced.characters
          }
        }).catch(() => undefined)
      }
    }

    const links = publicLinks(found.links)
    const stored = (found.profile || {}) as Record<string, unknown>
    const storedTag = typeof stored.discordTag === 'string' ? stored.discordTag : ''
    const storedBnet = typeof stored.bnetId === 'string' ? stored.bnetId : ''
    const storedTwitch = typeof stored.twitchLogin === 'string' ? stored.twitchLogin : ''
    const twitchLogin = links.twitch.login || storedTwitch
    const kickLogin = typeof stored.kickLogin === 'string' ? stored.kickLogin : ''
    const youtubeHandle = typeof stored.youtubeHandle === 'string' ? stored.youtubeHandle : ''
    const showRealNameInRoster = stored.showRealNameInRoster !== false
    const showBnetInRoster = stored.showBnetInRoster !== false
    const skipRaidsForNow = stored.skipRaidsForNow === true
    const profile = {
      ...stored,
      availability: normalizeAvailability(stored.availability),
      skipRaidsForNow,
      availabilityConfirmed:
        stored.availabilityConfirmed === true ||
        hasAvailabilityRequirement({
          skipRaidsForNow,
          availability: normalizeAvailability(stored.availability),
        }),
      showRealNameInRoster,
      showBnetInRoster,
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
      forceArmoryCheck?: boolean
    }
    const profile = { ...(body.profile || {}) } as Record<string, unknown>
    profile.availability = normalizeAvailability(profile.availability)
    profile.skipRaidsForNow = profile.skipRaidsForNow === true
    profile.availabilityConfirmed =
      profile.availabilityConfirmed === true ||
      hasAvailabilityRequirement(profile as unknown as OnboardingProfile)

    const incomingCharacters = Array.isArray(body.characters) ? body.characters : []
    const staffInterests = sanitizeStaffInterests(body.staffInterests)

    // Pre-read current user characters to verify Main character on WoW Forever Armory outside store lock
    const currentStore = await loadGuildStore()
    const currentUser = currentStore.users.find(
      (item) => item.username.toLowerCase() === session.username.toLowerCase(),
    )
    if (!currentUser) {
      return json({ error: 'Hesap bulunamadı.' }, 404)
    }

    // Enforce unique profile nickname across all other accounts (case-insensitive)
    const cleanNickname = typeof profile.nickname === 'string' ? profile.nickname.trim() : ''
    profile.nickname = cleanNickname
    if (cleanNickname) {
      const normNick = cleanNickname.toLocaleLowerCase('tr-TR')
      const takenByOther = currentStore.users.some((u) => {
        if (u.username.toLowerCase() === session.username.toLowerCase()) return false
        const otherUser = u.username.trim().toLocaleLowerCase('tr-TR')
        const otherNick =
          typeof u.profile?.nickname === 'string'
            ? u.profile.nickname.trim().toLocaleLowerCase('tr-TR')
            : ''
        return otherUser === normNick || (Boolean(otherNick) && otherNick === normNick)
      })
      if (takenByOther) {
        return json(
          {
            error: `"${cleanNickname}" profil ismi daha önce başka bir üye tarafından kullanılmış. Lütfen başka bir profil ismi seçin.`,
            field: 'nickname',
          },
          409,
        )
      }
    }

    const syncedArmory = await syncMainCharacterArmory(
      incomingCharacters,
      currentUser.characters || [],
      { forceCheck: Boolean(body.forceArmoryCheck) },
    )
    const verifiedCharacters = syncedArmory.characters
    const armoryResult: ArmoryVerificationResult | null = syncedArmory.armoryResult

    await mutateGuildStore((store) => {
      const found = store.users.find((item) => item.username.toLowerCase() === session.username.toLowerCase())
      if (!found) throw new Error('NOT_FOUND')

      const prevProfile = (found.profile || {}) as Record<string, unknown>
      const showRealName = typeof profile.showRealNameInRoster === 'boolean'
        ? profile.showRealNameInRoster
        : prevProfile.showRealNameInRoster !== false
      profile.showRealNameInRoster = showRealName
      const showBnet = typeof profile.showBnetInRoster === 'boolean'
        ? profile.showBnetInRoster
        : prevProfile.showBnetInRoster !== false
      profile.showBnetInRoster = showBnet

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

      const profileComplete = hasRequiredOnboarding(
        profile as unknown as OnboardingProfile,
        verifiedCharacters,
      )
      found.profile = profile
      found.characters = verifiedCharacters
      found.staffInterests = staffInterests
      found.onboardingComplete = profileComplete
    })

    const profileComplete = hasRequiredOnboarding(
      profile as unknown as OnboardingProfile,
      verifiedCharacters,
    )

    return json({
      ok: true,
      profileComplete,
      characters: verifiedCharacters,
      armoryResult,
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      return json({ error: 'Hesap bulunamadı.' }, 404)
    }
    console.error('profile PUT', err)
    return json({ error: 'Profil kaydedilemedi.' }, 500)
  }
}
