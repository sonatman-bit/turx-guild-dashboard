export type OnboardingProfile = {
  fullName?: string
  birthDate?: string
  gender?: string
  bnetId?: string
  email?: string
  phoneNumber?: string
  selectedAvatar?: string
}

export type OnboardingCharacter = {
  firstName?: string
  lastName?: string
  isMain?: boolean
}

function normalizeUser(username: string) {
  return username.trim().toLowerCase()
}

export function profileStorageKey(username: string) {
  return `turx_user_profile:${normalizeUser(username)}`
}

export function charactersStorageKey(username: string) {
  return `turx_my_characters:${normalizeUser(username)}`
}

function gateStorageKey(username: string) {
  return `turx_onboarding_complete:${normalizeUser(username)}`
}

export function getOnboardingGaps(
  profile: OnboardingProfile | null | undefined,
  characters: OnboardingCharacter[] | null | undefined,
) {
  const gaps: string[] = []
  const nameParts = (profile?.fullName ?? '').trim().split(/\s+/).filter((part) => part.length > 1)
  if (nameParts.length < 2) gaps.push('Ad Soyad')
  if (!(profile?.birthDate ?? '').trim()) gaps.push('Doğum tarihi')
  if (!(profile?.gender ?? '').trim()) gaps.push('Cinsiyet')
  if (!(profile?.bnetId ?? '').trim()) gaps.push('Battle.net ID')
  if (!(profile?.email ?? '').trim() || !profile?.email?.includes('@')) gaps.push('E-posta')
  const phoneDigits = (profile?.phoneNumber ?? '').replace(/\D/g, '')
  if (phoneDigits.length < 10) gaps.push('Telefon')
  const hasMain = (characters ?? []).some(
    (character) =>
      character.isMain === true &&
      Boolean(character.firstName?.trim()) &&
      Boolean(character.lastName?.trim()),
  )
  if (!hasMain) gaps.push('En az bir Main karakter')
  return gaps
}

export function hasRequiredOnboarding(
  profile: OnboardingProfile | null | undefined,
  characters: OnboardingCharacter[] | null | undefined,
) {
  return getOnboardingGaps(profile, characters).length === 0
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  const raw = localStorage.getItem(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function loadOnboardingProfile(username: string): OnboardingProfile | null {
  return readJson<OnboardingProfile | null>(profileStorageKey(username), null)
}

export function loadOnboardingCharacters(username: string): OnboardingCharacter[] {
  return readJson<OnboardingCharacter[]>(charactersStorageKey(username), [])
}

export function saveOnboardingSnapshot(
  username: string,
  profile: unknown,
  characters: unknown,
) {
  if (typeof window === 'undefined') return
  localStorage.setItem(profileStorageKey(username), JSON.stringify(profile))
  localStorage.setItem(charactersStorageKey(username), JSON.stringify(characters))
}

export function commitOnboardingStatus(
  username: string,
  profile: OnboardingProfile,
  characters: OnboardingCharacter[],
) {
  if (typeof window === 'undefined') return false
  const complete = hasRequiredOnboarding(profile, characters)
  if (complete) {
    localStorage.setItem(gateStorageKey(username), 'complete')
  } else {
    localStorage.removeItem(gateStorageKey(username))
  }
  return complete
}

export function isOnboardingComplete(username: string | null | undefined) {
  if (!username || typeof window === 'undefined') return true
  const profile = loadOnboardingProfile(username)
  const characters = loadOnboardingCharacters(username)
  const dataComplete = hasRequiredOnboarding(profile, characters)
  const flagged = localStorage.getItem(gateStorageKey(username)) === 'complete'
  return flagged && dataComplete
}
