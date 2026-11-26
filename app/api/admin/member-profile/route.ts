import { NextResponse } from 'next/server'
import {
  normalizeKickSlug,
  normalizeTwitchLogin,
  normalizeYoutubeHandle,
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
import { isGuildMasterEmail, normalizeGuildRank, type GuildRank } from '@/lib/turx-identity'
import { blobConfigured, loadGuildStore, mutateGuildStore, resolveUserRole } from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

async function verifyGmCaller(request: Request) {
  const session = sessionFromRequest(request)
  if (!session) return { ok: false as const, status: 401, error: 'Oturum gerekli.' }
  const store = await loadGuildStore(true)
  const caller = store.users.find((u) => u.username.toLowerCase() === session.username.toLowerCase())
  if (!caller) return { ok: false as const, status: 404, error: 'Oturum hesabı bulunamadı.' }
  const isGm = isGuildMasterEmail(caller.email) || resolveUserRole(caller) === 'Guild Master'
  if (!isGm) {
    return {
      ok: false as const,
      status: 403,
      error: 'Bu alana yalnızca Guild Master (GM) erişebilir.',
    }
  }
  return { ok: true as const, store, caller }
}

export async function GET(request: Request) {
  try {
    if (!blobConfigured()) return json({ error: 'Hesap deposu bağlı değil.' }, 503)
    const auth = await verifyGmCaller(request)
    if (!auth.ok) return json({ error: auth.error }, auth.status)

    const { searchParams } = new URL(request.url)
    const targetUsername = (searchParams.get('username') || '').trim()
    if (!targetUsername) return json({ error: 'Kullanıcı adı gerekli.' }, 400)

    const found = auth.store.users.find(
      (u) => u.username.toLowerCase() === targetUsername.toLowerCase(),
    )
    if (!found) return json({ error: 'Kullanıcı bulunamadı.' }, 404)

    const links = publicLinks(found.links)
    const stored = (found.profile || {}) as Record<string, unknown>
    const storedTag = typeof stored.discordTag === 'string' ? stored.discordTag : ''
    const storedBnet = typeof stored.bnetId === 'string' ? stored.bnetId : ''
    const storedTwitch = typeof stored.twitchLogin === 'string' ? stored.twitchLogin : ''
    const twitchLogin = links.twitch.login || storedTwitch
    const kickLogin = typeof stored.kickLogin === 'string' ? stored.kickLogin : ''
    const youtubeHandle = typeof stored.youtubeHandle === 'string' ? stored.youtubeHandle : ''
    const skipRaidsForNow = stored.skipRaidsForNow === true
    const normalizedAv = normalizeAvailability(stored.availability)

    const profile = {
      ...stored,
      fullName: typeof stored.fullName === 'string' ? stored.fullName : '',
      nickname: typeof stored.nickname === 'string' ? stored.nickname : '',
      birthDate: typeof stored.birthDate === 'string' ? stored.birthDate : '',
      gender: typeof stored.gender === 'string' ? stored.gender : 'Erkek',
      email: typeof stored.email === 'string' && stored.email.trim() ? stored.email : found.email,
      phoneCountry: typeof stored.phoneCountry === 'string' ? stored.phoneCountry : '+90',
      phoneNumber: typeof stored.phoneNumber === 'string' ? stored.phoneNumber : '',
      selectedAvatar: typeof stored.selectedAvatar === 'string' ? stored.selectedAvatar : 'Druid',
      showRealNameInRoster: stored.showRealNameInRoster !== false,
      availability: normalizedAv,
      skipRaidsForNow,
      availabilityConfirmed:
        stored.availabilityConfirmed === true ||
        hasAvailabilityRequirement({ skipRaidsForNow, availability: normalizedAv }),
      discordConnected: links.discord.connected || Boolean(storedTag),
      discordTag: links.discord.username || storedTag,
      bnetConnected: links.bnet.connected || Boolean(storedBnet),
      bnetId: links.bnet.battletag || storedBnet,
      twitchConnected: Boolean(twitchLogin),
      twitchLogin,
      twitchDisplayName: links.twitch.displayName || twitchLogin,
      kickLogin,
      youtubeHandle,
    }

    return json({
      ok: true,
      member: {
        username: found.username,
        email: found.email,
        role: resolveUserRole(found),
        onboardingComplete: Boolean(found.onboardingComplete),
        profile,
        characters: Array.isArray(found.characters) ? found.characters : [],
        staffInterests: sanitizeStaffInterests(found.staffInterests),
      },
    })
  } catch (err) {
    console.error('admin/member-profile GET', err)
    return json({ error: 'Üye profili okunamadı.' }, 500)
  }
}

export async function PUT(request: Request) {
  try {
    if (!blobConfigured()) return json({ error: 'Hesap deposu bağlı değil.' }, 503)
    const auth = await verifyGmCaller(request)
    if (!auth.ok) return json({ error: auth.error }, auth.status)

    const body = (await request.json().catch(() => ({}))) as {
      targetUsername?: string
      email?: string
      role?: GuildRank
      profile?: Record<string, unknown>
      characters?: OnboardingCharacter[]
      staffInterests?: unknown
      checkArmory?: boolean
    }

    const targetUsername = (body.targetUsername || '').trim()
    if (!targetUsername) return json({ error: 'Hedef kullanıcı adı zorunludur.' }, 400)

    const currentTarget = auth.store.users.find(
      (u) => u.username.toLowerCase() === targetUsername.toLowerCase(),
    )
    if (!currentTarget) return json({ error: 'Hedef kullanıcı bulunamadı.' }, 404)

    const profile = { ...((currentTarget.profile || {}) as Record<string, unknown>), ...(body.profile || {}) }
    profile.availability = normalizeAvailability(profile.availability)
    profile.skipRaidsForNow = profile.skipRaidsForNow === true
    profile.availabilityConfirmed =
      profile.availabilityConfirmed === true ||
      hasAvailabilityRequirement(profile as unknown as OnboardingProfile)

    // Check nickname uniqueness across OTHER accounts
    const cleanNickname = typeof profile.nickname === 'string' ? profile.nickname.trim() : ''
    profile.nickname = cleanNickname
    if (cleanNickname) {
      const normNick = cleanNickname.toLocaleLowerCase('tr-TR')
      const conflict = auth.store.users.some((u) => {
        if (u.username.toLowerCase() === currentTarget.username.toLowerCase()) return false
        const otherUser = u.username.trim().toLocaleLowerCase('tr-TR')
        const otherNick =
          typeof u.profile?.nickname === 'string'
            ? u.profile.nickname.trim().toLocaleLowerCase('tr-TR')
            : ''
        return otherUser === normNick || (Boolean(otherNick) && otherNick === normNick)
      })
      if (conflict) {
        return json(
          {
            error: `"${cleanNickname}" profil ismi başka bir üye tarafından kullanılıyor. Lütfen farklı bir isim seçin.`,
            field: 'nickname',
          },
          409,
        )
      }
    }

    // Check email uniqueness if changed
    const nextAccountEmail =
      typeof body.email === 'string' && body.email.trim()
        ? body.email.trim().toLowerCase()
        : typeof profile.email === 'string' && profile.email.trim()
          ? profile.email.trim().toLowerCase()
          : currentTarget.email
    if (nextAccountEmail !== currentTarget.email.toLowerCase()) {
      const emailTaken = auth.store.users.some(
        (u) =>
          u.username.toLowerCase() !== currentTarget.username.toLowerCase() &&
          u.email.trim().toLowerCase() === nextAccountEmail,
      )
      if (emailTaken) {
        return json({ error: `"${nextAccountEmail}" e-posta adresi başka bir hesapta kayıtlı.` }, 409)
      }
    }

    const incomingChars = Array.isArray(body.characters)
      ? body.characters
      : ((currentTarget.characters || []) as OnboardingCharacter[])

    let finalCharacters = incomingChars
    if (body.checkArmory) {
      const synced = await syncMainCharacterArmory(incomingChars, currentTarget.characters || [], {
        forceCheck: true,
      })
      finalCharacters = synced.characters
    }

    let updatedSummary: {
      username: string
      role: GuildRank
      mainCharacter: string
      wowClass: string
      spec: string
    } | null = null

    await mutateGuildStore((store) => {
      const target = store.users.find(
        (u) => u.username.toLowerCase() === currentTarget.username.toLowerCase(),
      )
      if (!target) throw new Error('NOT_FOUND')

      const isTargetGm = isGuildMasterEmail(target.email) || resolveUserRole(target) === 'Guild Master'
      if (!isTargetGm && body.role && body.role !== 'Guild Master') {
        target.role = normalizeGuildRank(body.role)
      }
      if (!isTargetGm && nextAccountEmail) {
        target.email = nextAccountEmail
      }
      profile.email = typeof profile.email === 'string' && profile.email.trim() ? profile.email.trim() : target.email

      const links = { ...(target.links || {}) }
      const bnetTag = typeof profile.bnetId === 'string' ? profile.bnetId.trim() : ''
      if (bnetTag) {
        links.bnet = { id: bnetTag, battletag: bnetTag }
        profile.bnetConnected = true
        profile.bnetId = bnetTag
      } else {
        delete links.bnet
        profile.bnetConnected = false
      }

      const discordUser =
        typeof profile.discordTag === 'string' ? profile.discordTag.trim().replace(/^@/, '') : ''
      if (discordUser) {
        links.discord = { id: discordUser, username: discordUser, globalName: discordUser }
        profile.discordConnected = true
        profile.discordTag = discordUser
      } else {
        delete links.discord
        profile.discordConnected = false
      }

      target.links = links

      const twitchLogin = normalizeTwitchLogin(String(profile.twitchLogin || ''))
      profile.twitchLogin = twitchLogin
      profile.twitchDisplayName = twitchLogin
      profile.twitchConnected = Boolean(twitchLogin)
      profile.kickLogin = normalizeKickSlug(String(profile.kickLogin || ''))
      profile.youtubeHandle = normalizeYoutubeHandle(String(profile.youtubeHandle || ''))

      target.profile = profile
      target.characters = finalCharacters
      if (body.staffInterests !== undefined) {
        target.staffInterests = sanitizeStaffInterests(body.staffInterests)
      }
      target.onboardingComplete = hasRequiredOnboarding(
        profile as unknown as OnboardingProfile,
        finalCharacters,
      )

      const main =
        (finalCharacters as Array<{ firstName?: string; lastName?: string; wowClass?: string; spec?: string; isMain?: boolean }>).find(
          (c) => c.isMain,
        ) ||
        (finalCharacters as Array<{ firstName?: string; lastName?: string; wowClass?: string; spec?: string; isMain?: boolean }>)[0]

      updatedSummary = {
        username: target.username,
        role: resolveUserRole(target),
        mainCharacter: main ? `${main.firstName || ''} ${main.lastName || ''}`.trim() || '—' : '—',
        wowClass: main?.wowClass || 'Warrior',
        spec: main?.spec || '—',
      }
    })

    return json({ ok: true, member: updatedSummary })
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      return json({ error: 'Kullanıcı bulunamadı.' }, 404)
    }
    console.error('admin/member-profile PUT', err)
    return json({ error: 'Üye profili kaydedilemedi.' }, 500)
  }
}
