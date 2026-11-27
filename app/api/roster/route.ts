import { NextResponse } from 'next/server'
import { sessionFromRequest } from '@/lib/auth-email'
import { CLASS_COLORS, type WowClass } from '@/lib/guild-data'
import { isGuildMasterEmail } from '@/lib/turx-identity'
import {
  fetchDiscordWidgetData,
  isWowActivity,
  matchesGmIdentity,
  matchDiscordMember,
} from '@/lib/guild-presence'
import { blobConfigured, loadGuildStore, publicAccount } from '@/lib/turx-store'
import { emptyArmory, foreverArmorySlug, loadArmorySnapshots, type ArmorySnapshot } from '@/lib/wow-armory'

export const dynamic = 'force-dynamic'

type StoredCharacter = {
  firstName?: string
  lastName?: string
  wowClass?: string
  role?: string
  isMain?: boolean
}

function isWowClass(value: string | undefined): value is WowClass {
  return Boolean(value && value in CLASS_COLORS)
}

function buildPublicSummary(users: Awaited<ReturnType<typeof loadGuildStore>>['users']) {
  const wowClasses = Object.keys(CLASS_COLORS) as WowClass[]
  const mainClasses = Object.fromEntries(wowClasses.map((c) => [c, 0])) as Record<WowClass, number>
  const altClasses = Object.fromEntries(wowClasses.map((c) => [c, 0])) as Record<WowClass, number>
  const players = new Set<string>()
  let totalCharacters = 0
  let mainCount = 0
  let altCount = 0
  let tank = 0
  let healer = 0
  let dps = 0

  for (const account of users) {
    const rawProfile = (account.profile || {}) as Record<string, unknown>
    const showRealName = rawProfile.showRealNameInRoster !== false
    const rawFullName = typeof rawProfile.fullName === 'string' && rawProfile.fullName.trim()
      ? rawProfile.fullName.trim()
      : ''
    const displayRealName = showRealName ? (rawFullName || account.username) : ''
    const playerKey = displayRealName || account.username

    const chars = Array.isArray(account.characters) ? (account.characters as StoredCharacter[]) : []
    for (const character of chars) {
      if (!character.firstName?.trim() || !character.lastName?.trim()) continue
      players.add(playerKey)
      totalCharacters += 1
      const wowClass: WowClass = isWowClass(character.wowClass) ? character.wowClass : 'Warrior'
      if (character.isMain) {
        mainCount += 1
        mainClasses[wowClass] += 1
        const role = (character.role || 'MELEE').toUpperCase()
        if (role === 'TANK') tank += 1
        else if (role === 'HEALER') healer += 1
        else dps += 1
      } else {
        altCount += 1
        altClasses[wowClass] += 1
      }
    }
  }

  return {
    totalPlayers: players.size,
    totalCharacters,
    mainCount,
    altCount,
    mainRoles: { tank, healer, dps },
    mainClasses,
    altClasses,
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const summaryOnly = searchParams.get('summary') === '1'

    if (!blobConfigured()) {
      return summaryOnly
        ? NextResponse.json({ summary: buildPublicSummary([]) })
        : NextResponse.json({ members: [] })
    }

    const store = await loadGuildStore()

    // Public summary for Guild Başvuru page (no member PII exposed)
    if (summaryOnly) {
      return NextResponse.json(
        { summary: buildPublicSummary(store.users) },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }

    // Optional session: external visitors can view Guild Kadrosu (emails remain hidden)
    const session = sessionFromRequest(request)

    const isGmOrOfficer = Boolean(
      session &&
        store.users.some(
          (u) =>
            u.username.toLowerCase() === session.username.toLowerCase() &&
            (isGuildMasterEmail(u.email) || u.role === 'Officer' || u.role === 'Görevli' || u.role === 'Guild Master'),
        ),
    )

    const lookup: Array<{ firstName: string; lastName: string; wowClass: WowClass }> = []

    for (const account of store.users) {
      const characters = Array.isArray(account.characters) ? (account.characters as StoredCharacter[]) : []
      for (const character of characters) {
        const firstName = character.firstName?.trim() || ''
        const lastName = character.lastName?.trim() || ''
        if (!firstName || !lastName) continue
        lookup.push({
          firstName,
          lastName,
          wowClass: isWowClass(character.wowClass) ? character.wowClass : 'Warrior',
        })
      }
    }

    const [armoryBySlug, widgetData] = await Promise.all([
      loadArmorySnapshots(lookup),
      fetchDiscordWidgetData(),
    ])

    const widgetMembers = widgetData.members
    const channelMap = new Map<string, string>()
    for (const ch of widgetData.channels) {
      if (ch.id && ch.name) channelMap.set(ch.id, ch.name)
    }

    const members = store.users.map((account) => {
      const characters = Array.isArray(account.characters) ? (account.characters as StoredCharacter[]) : []
      const pub = publicAccount(account)
      const rawProfile = (account.profile || {}) as Record<string, unknown>
      const isSelf = session && session.username.toLowerCase() === account.username.toLowerCase()
      const isGm = isGuildMasterEmail(account.email) || matchesGmIdentity(account.username)

      const showRealName = rawProfile.showRealNameInRoster !== false
      const rawFullName = typeof rawProfile.fullName === 'string' && rawProfile.fullName.trim()
        ? rawProfile.fullName.trim()
        : ''

      // If privacy toggle is turned off by user, hide real name from roster
      const displayRealName = showRealName ? (rawFullName || account.username) : ''

      const sanitizedProfile = {
        fullName: displayRealName,
        showRealName,
        selectedAvatar: typeof rawProfile.selectedAvatar === 'string' ? rawProfile.selectedAvatar : undefined,
      }

      // Smart match against live Discord widget
      const discordMatch = matchDiscordMember(
        {
          username: account.username,
          email: account.email,
          profile: rawProfile,
          links: account.links,
          characters,
        },
        widgetMembers,
      )

      // Discord presence calculation
      const profileDiscordTag = (account.links?.discord?.username || rawProfile.discordTag || '')
        .toString()
        .trim()
        .replace(/^@/, '')
      const resolvedDiscordTag = profileDiscordTag || (discordMatch ? discordMatch.username : '')
      const discordConnected = Boolean(resolvedDiscordTag)
      const discordOnline = Boolean(
        (discordMatch && (discordMatch.status === 'online' || discordMatch.status === 'idle' || discordMatch.status === 'dnd')) ||
        (isGm && discordMatch?.status !== 'offline')
      )
      const discordStatus = discordMatch?.status || (discordOnline ? 'online' : 'offline')
      const voiceChannel = discordMatch?.channel_id ? (channelMap.get(discordMatch.channel_id) || 'Ses Kanalı') : null

      // Battle.net / In-Game presence calculation
      const bnetTag = (account.links?.bnet?.battletag || rawProfile.bnetId || '').toString().trim()
      const bnetConnected = Boolean(account.links?.bnet?.battletag || rawProfile.bnetConnected || bnetTag)

      const isPlayingWow = Boolean(discordMatch && isWowActivity(discordMatch.game?.name || discordMatch.activity?.name))
      const inVoice = Boolean(discordMatch?.channel_id)
      const isPlayingAnyGame = Boolean(discordMatch?.game?.name || discordMatch?.activity?.name)

      // In-game is true if playing WoW / Forever, in guild voice/raid channel, or is GM active
      const inGame = Boolean(isGm || isPlayingWow || inVoice || isPlayingAnyGame)
      const gameTitle =
        discordMatch?.game?.name ||
        discordMatch?.activity?.name ||
        (inVoice ? (voiceChannel ? `Seste: ${voiceChannel}` : 'WoW Guild Sesi') : (isGm || isPlayingWow ? 'World of Warcraft: Forever' : null))

      // Battle.net online status: true if actively in-game OR if connected and online on Discord
      const bnetOnline = inGame || (bnetConnected && discordOnline)

      return {
        username: pub.username,
        role: pub.role,
        // Only return email if viewer is GM/Officer or own profile
        email: isGmOrOfficer || isSelf ? pub.email : undefined,
        profile: sanitizedProfile,
        bnet: {
          tag: bnetTag,
          connected: bnetConnected,
          online: bnetOnline,
          inGame,
          gameTitle,
        },
        discord: {
          tag: resolvedDiscordTag,
          connected: discordConnected,
          online: discordOnline,
          status: discordStatus,
          channel: voiceChannel,
        },
        characters: characters.map((character) => {
          const firstName = character.firstName?.trim() || ''
          const lastName = character.lastName?.trim() || ''
          const wowClass = isWowClass(character.wowClass) ? character.wowClass : 'Warrior'
          const armory: ArmorySnapshot | null =
            firstName && lastName
              ? armoryBySlug.get(foreverArmorySlug(firstName, lastName)) ||
                emptyArmory(firstName, lastName, wowClass)
              : null
          return {
            ...character,
            armory,
          }
        }),
      }
    })

    return NextResponse.json(
      { members },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    console.error('roster GET', err)
    return NextResponse.json({ error: 'Kadro okunamadı.' }, { status: 500 })
  }
}
