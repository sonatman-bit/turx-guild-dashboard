import { NextResponse } from 'next/server'
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
    const profile = (found.profile || null) as OnboardingProfile | null
    const characters = (found.characters || []) as OnboardingCharacter[]
    return json({
      profile,
      characters,
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
    const profile = body.profile || {}
    const characters = Array.isArray(body.characters) ? body.characters : []
    const staffInterests = sanitizeStaffInterests(body.staffInterests)
    const profileComplete = hasRequiredOnboarding(profile, characters)

    await mutateGuildStore((store) => {
      const found = store.users.find((item) => item.username.toLowerCase() === session.username.toLowerCase())
      if (!found) throw new Error('NOT_FOUND')
      found.profile = profile as Record<string, unknown>
      found.characters = characters
      found.staffInterests = staffInterests
      found.onboardingComplete = profileComplete
    })

    return json({ ok: true, profileComplete })
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      return json({ error: 'Hesap bulunamadı.' }, 404)
    }
    console.error('profile PUT', err)
    return json({ error: 'Profil kaydedilemedi.' }, 500)
  }
}
