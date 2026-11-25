import { NextResponse } from 'next/server'
import { createSessionToken, sessionFromRequest } from '@/lib/auth-email'
import { hasRequiredOnboarding, type OnboardingCharacter, type OnboardingProfile } from '@/lib/profile-gate'
import { blobConfigured, loadGuildStore, publicAccount } from '@/lib/turx-store'

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
    const characters = (found.characters || []) as OnboardingCharacter[]
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
