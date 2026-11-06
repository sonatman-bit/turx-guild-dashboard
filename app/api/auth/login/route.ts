import { NextResponse } from 'next/server'
import { attachSessionCookie, createSessionToken } from '@/lib/auth-email'
import { verifyPassword } from '@/lib/password'
import { hasRequiredOnboarding, type OnboardingCharacter, type OnboardingProfile } from '@/lib/profile-gate'
import { blobConfigured, findStoredUser, loadGuildStore, publicAccount } from '@/lib/turx-store'

export async function POST(request: Request) {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ error: 'Hesap deposu henüz bağlı değil.' }, { status: 503 })
    }
    const body = (await request.json()) as { username?: string; password?: string }
    const username = (body.username || '').trim()
    const password = body.password || ''
    if (!username || !password) {
      return NextResponse.json({ error: 'Kullanıcı adı ve şifre gerekli.' }, { status: 400 })
    }

    const store = await loadGuildStore()
    const found = findStoredUser(store, username)
    if (!found) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    const matches = await verifyPassword(password, found.salt, found.passwordHash)
    if (!matches) {
      return NextResponse.json({ error: 'bad_password' }, { status: 401 })
    }
    const profile = (found.profile || null) as OnboardingProfile | null
    const characters = (found.characters || []) as OnboardingCharacter[]
    const token = createSessionToken(found.username)
    return attachSessionCookie(
      NextResponse.json({
        ok: true,
        user: publicAccount(found),
        token,
        profileComplete: hasRequiredOnboarding(profile, characters),
        profile,
        characters,
      }),
      token,
    )
  } catch (err) {
    console.error('auth login', err)
    return NextResponse.json({ error: 'Giriş doğrulanamadı.' }, { status: 500 })
  }
}
