import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { appOrigin, attachSessionCookie, createSessionToken } from '@/lib/auth-email'
import {
  clearGoogleStateCookie,
  exchangeGoogleCode,
  googleStateFromRequest,
  isGoogleAuthConfigured,
  verifyGoogleState,
} from '@/lib/google-oauth'
import { hashPassword, randomSalt } from '@/lib/password'
import { hasRequiredOnboarding, type OnboardingCharacter, type OnboardingProfile } from '@/lib/profile-gate'
import { blobConfigured, mutateGuildStore, roleForEmail } from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

function sanitizeUsernameFromEmail(email: string, existingUsernames: Set<string>): string {
  const prefix = email.split('@')[0] || 'turx'
  let base = prefix.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 20)
  if (base.length < 2) base = 'turxuser'
  if (!existingUsernames.has(base.toLowerCase())) return base
  for (let i = 2; i < 9999; i += 1) {
    const candidate = `${base.slice(0, 16)}${i}`
    if (!existingUsernames.has(candidate.toLowerCase())) return candidate
  }
  return `turx_${randomBytes(3).toString('hex')}`
}

export async function GET(request: Request) {
  const origin = appOrigin(request)
  const fail = (reason: string) =>
    clearGoogleStateCookie(NextResponse.redirect(`${origin}/?google_auth=error&reason=${encodeURIComponent(reason)}`))

  if (!isGoogleAuthConfigured() || !blobConfigured()) {
    return fail('disabled')
  }

  const url = new URL(request.url)
  if (url.searchParams.get('error')) {
    return fail('cancelled')
  }

  const code = url.searchParams.get('code') || ''
  const stateParam = url.searchParams.get('state') || ''
  const cookieState = googleStateFromRequest(request) || ''
  if (!code || !stateParam || stateParam !== cookieState || !verifyGoogleState(stateParam)) {
    return fail('state')
  }

  try {
    const googleUser = await exchangeGoogleCode(request, code)
    if (!googleUser.email || !googleUser.emailVerified) {
      return fail('unverified')
    }

    let resolvedUsername = ''
    let needsOnboarding = false
    const salt = randomSalt()
    const randomPasswordHash = await hashPassword(randomBytes(24).toString('hex'), salt)

    await mutateGuildStore((store) => {
      const existing = store.users.find(
        (u) => u.email.trim().toLowerCase() === googleUser.email,
      )
      if (existing) {
        resolvedUsername = existing.username
        const prof = (existing.profile || null) as OnboardingProfile | null
        const chars = (existing.characters || []) as OnboardingCharacter[]
        needsOnboarding = !hasRequiredOnboarding(prof, chars)
        return
      }

      const taken = new Set(store.users.map((u) => u.username.toLowerCase()))
      const username = sanitizeUsernameFromEmail(googleUser.email, taken)
      resolvedUsername = username
      needsOnboarding = true

      store.users.push({
        username,
        email: googleUser.email,
        role: roleForEmail(googleUser.email),
        salt,
        passwordHash: randomPasswordHash,
        profile: {
          email: googleUser.email,
          ...(googleUser.name ? { fullName: googleUser.name } : {}),
        },
        characters: [],
        onboardingComplete: false,
      })
    })

    const token = createSessionToken(resolvedUsername)
    const redirectUrl = needsOnboarding
      ? `${origin}/?tab=profile&google_auth=ok`
      : `${origin}/?google_auth=ok`

    const response = clearGoogleStateCookie(NextResponse.redirect(redirectUrl))
    return attachSessionCookie(response, token)
  } catch (err) {
    console.error('google auth callback', err)
    return fail('exchange')
  }
}
