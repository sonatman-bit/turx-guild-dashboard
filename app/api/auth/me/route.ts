import { NextResponse } from 'next/server'
import { syncMainCharacterArmory } from '@/lib/armory-account'
import { createSessionToken, sessionFromRequest } from '@/lib/auth-email'
import { hasRequiredOnboarding, type OnboardingCharacter, type OnboardingProfile } from '@/lib/profile-gate'
import { blobConfigured, loadGuildStore, mutateGuildStore, publicAccount } from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ error: 'Hesap deposu bağlı değil.' }, { status: 503 })
    }
    const session = sessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }
    const store = await loadGuildStore(true)
    const found = store.users.find((u) => u.username.toLowerCase() === session.username.toLowerCase())
    if (!found) {
      return NextResponse.json({ authenticated: false }, { status: 404 })
    }
    const profile = (found.profile || null) as OnboardingProfile | null
    let characters = (found.characters || []) as OnboardingCharacter[]
    const mainChar = characters.find((c) => c.isMain && c.firstName?.trim() && c.lastName?.trim())
    if (mainChar && mainChar.armoryVerified !== true) {
      const synced = await syncMainCharacterArmory(characters, characters)
      if (synced.changed && synced.armoryResult?.ok) {
        characters = synced.characters
        await mutateGuildStore((s) => {
          const target = s.users.find((u) => u.username.toLowerCase() === found.username.toLowerCase())
          if (target) target.characters = synced.characters
        }).catch(() => undefined)
      }
    }
    const token = createSessionToken(found.username)
    return NextResponse.json(
      {
        ok: true,
        user: publicAccount(found),
        token,
        profileComplete: hasRequiredOnboarding(profile, characters),
        profile,
        characters,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    console.error('auth me', err)
    return NextResponse.json({ error: 'Oturum okunamadı.' }, { status: 500 })
  }
}
