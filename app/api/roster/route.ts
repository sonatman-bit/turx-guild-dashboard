import { NextResponse } from 'next/server'
import { sessionFromRequest } from '@/lib/auth-email'
import { CLASS_COLORS, type WowClass } from '@/lib/guild-data'
import { isGuildMasterEmail } from '@/lib/turx-identity'
import { blobConfigured, loadGuildStore, publicAccount } from '@/lib/turx-store'
import { emptyArmory, foreverArmorySlug, loadArmorySnapshots, type ArmorySnapshot } from '@/lib/wow-armory'

export const dynamic = 'force-dynamic'

type StoredCharacter = {
  firstName?: string
  lastName?: string
  wowClass?: string
}

function isWowClass(value: string | undefined): value is WowClass {
  return Boolean(value && value in CLASS_COLORS)
}

export async function GET(request: Request) {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ members: [] })
    }
    const session = sessionFromRequest(request)
    const store = await loadGuildStore()
    const isGmOrOfficer = session
      ? store.users.some(
          (u) =>
            u.username.toLowerCase() === session.username.toLowerCase() &&
            (isGuildMasterEmail(u.email) || u.role === 'Officer' || u.role === 'Guild Master'),
        )
      : false

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

    const armoryBySlug = await loadArmorySnapshots(lookup)

    const members = store.users.map((account) => {
      const characters = Array.isArray(account.characters) ? (account.characters as StoredCharacter[]) : []
      const pub = publicAccount(account)
      const rawProfile = (account.profile || {}) as Record<string, unknown>
      const isSelf = session && session.username.toLowerCase() === account.username.toLowerCase()

      // PII sanitization: Visitors and regular users must never receive private PII (phone, birthdate, gender, private email)
      const sanitizedProfile = {
        fullName: typeof rawProfile.fullName === 'string' && rawProfile.fullName.trim()
          ? rawProfile.fullName.trim()
          : account.username,
        selectedAvatar: typeof rawProfile.selectedAvatar === 'string' ? rawProfile.selectedAvatar : undefined,
      }

      return {
        username: pub.username,
        role: pub.role,
        // Only return email if viewer is GM/Officer or own profile
        email: isGmOrOfficer || isSelf ? pub.email : undefined,
        profile: sanitizedProfile,
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
