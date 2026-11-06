import { NextResponse } from 'next/server'
import { CLASS_COLORS, type WowClass } from '@/lib/guild-data'
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

export async function GET() {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ members: [] })
    }
    const store = await loadGuildStore()
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
      return {
        ...publicAccount(account),
        profile: account.profile || null,
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
