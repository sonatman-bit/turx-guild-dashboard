import { CLASS_COLORS, type WowClass } from '@/lib/guild-data'
import type { OnboardingCharacter } from '@/lib/profile-gate'
import { foreverArmorySlug, verifyCharacterInTurxGuild, type ArmoryVerificationResult } from '@/lib/wow-armory'

type RichCharacter = OnboardingCharacter & {
  id?: string
  wowClass?: string
  [key: string]: unknown
}

function isWowClass(value: unknown): value is WowClass {
  return typeof value === 'string' && value in CLASS_COLORS
}

/**
 * Verifies a user's Main character against WoW Forever Armory (EU) TURX guild.
 * Reuses existing server-side verification if the Main character's name hasn't changed,
 * and never trusts unverified client claims.
 */
export async function syncMainCharacterArmory(
  incomingCharacters: unknown[],
  previousCharacters: unknown[] = [],
  options?: { forceCheck?: boolean },
): Promise<{
  characters: RichCharacter[]
  armoryResult: ArmoryVerificationResult | null
  changed: boolean
}> {
  const chars: RichCharacter[] = Array.isArray(incomingCharacters)
    ? incomingCharacters.map((c) => ({ ...(c as RichCharacter) }))
    : []
  const prevChars: RichCharacter[] = Array.isArray(previousCharacters)
    ? (previousCharacters as RichCharacter[])
    : []

  const mainIndex = chars.findIndex(
    (c) => c.isMain === true && Boolean(c.firstName?.trim()) && Boolean(c.lastName?.trim()),
  )
  if (mainIndex < 0) {
    return { characters: chars, armoryResult: null, changed: false }
  }

  const main = chars[mainIndex]
  const mainSlug = foreverArmorySlug(main.firstName!.trim(), main.lastName!.trim())

  const prevVerifiedMatch = prevChars.find(
    (c) =>
      c.armoryVerified === true &&
      (c.armoryGuild || '').trim().toUpperCase() === 'TURX' &&
      Boolean(c.firstName?.trim()) &&
      Boolean(c.lastName?.trim()) &&
      foreverArmorySlug(c.firstName!.trim(), c.lastName!.trim()) === mainSlug,
  )

  if (prevVerifiedMatch && !options?.forceCheck) {
    chars[mainIndex] = {
      ...main,
      armoryVerified: true,
      armoryGuild: prevVerifiedMatch.armoryGuild || 'TURX',
      armoryCheckedAt: prevVerifiedMatch.armoryCheckedAt || new Date().toISOString(),
      armoryLevel: prevVerifiedMatch.armoryLevel ?? main.armoryLevel ?? null,
    }
    const changed = main.armoryVerified !== true || (main.armoryGuild || '').toUpperCase() !== 'TURX'
    return { characters: chars, armoryResult: null, changed }
  }

  const wowClass: WowClass = isWowClass(main.wowClass) ? main.wowClass : 'Warrior'
  const result = await verifyCharacterInTurxGuild(main.firstName!.trim(), main.lastName!.trim(), wowClass)
  const nowIso = new Date().toISOString()

  if (result.ok) {
    chars[mainIndex] = {
      ...main,
      armoryVerified: true,
      armoryGuild: result.guildName || 'TURX',
      armoryCheckedAt: nowIso,
      armoryLevel: result.level,
    }
    return { characters: chars, armoryResult: result, changed: true }
  }

  // If Blizzard Armory is temporarily unavailable and this character was previously verified in DB, keep previous
  if (result.status === 'armory_unavailable' && prevVerifiedMatch) {
    chars[mainIndex] = {
      ...main,
      armoryVerified: true,
      armoryGuild: prevVerifiedMatch.armoryGuild || 'TURX',
      armoryCheckedAt: prevVerifiedMatch.armoryCheckedAt || nowIso,
      armoryLevel: prevVerifiedMatch.armoryLevel ?? null,
    }
    return { characters: chars, armoryResult: result, changed: false }
  }

  chars[mainIndex] = {
    ...main,
    armoryVerified: false,
    armoryGuild: result.guildName,
    armoryCheckedAt: nowIso,
    armoryLevel: result.level,
  }
  return { characters: chars, armoryResult: result, changed: true }
}
