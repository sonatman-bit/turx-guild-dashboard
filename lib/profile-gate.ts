import type { AvailabilityStatus } from './availability'

export type OnboardingProfile = {
  fullName?: string
  nickname?: string
  birthDate?: string
  gender?: string
  bnetId?: string
  email?: string
  phoneNumber?: string
  selectedAvatar?: string
  showRealNameInRoster?: boolean
  showBnetInRoster?: boolean
  discordTag?: string
  discordConnected?: boolean
  bnetConnected?: boolean
  skipRaidsForNow?: boolean
  availabilityConfirmed?: boolean
  availability?: Record<string, { status?: AvailabilityStatus; startTime?: string; endTime?: string }>
}

export type OnboardingCharacter = {
  firstName?: string
  lastName?: string
  isMain?: boolean
  armoryVerified?: boolean
  armoryGuild?: string | null
  armoryCheckedAt?: string
  armoryLevel?: number | null
}

export type ProfileFieldErrorMap = {
  fullName?: string
  birthDate?: string
  gender?: string
  bnetId?: string
  email?: string
  phoneNumber?: string
  availability?: string
  mainCharacter?: string
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

export function hasAvailabilityRequirement(profile: OnboardingProfile | null | undefined): boolean {
  if (!profile) return false
  if (profile.skipRaidsForNow === true) return true
  const av = profile.availability
  if (!av || typeof av !== 'object') return false
  const dayKeys = ['pzt', 'sal', 'car', 'crs', 'per', 'cum', 'cmt', 'paz']
  return dayKeys.some((key) => {
    const item = av[key]
    return item && (item.status === 'available' || item.status === 'maybe')
  })
}

export function getMainCharacter(characters: OnboardingCharacter[] | null | undefined): OnboardingCharacter | null {
  if (!Array.isArray(characters)) return null
  return (
    characters.find(
      (character) =>
        character.isMain === true &&
        Boolean(character.firstName?.trim()) &&
        Boolean(character.lastName?.trim()),
    ) || null
  )
}

export function hasVerifiedTurxMain(characters: OnboardingCharacter[] | null | undefined): boolean {
  const main = getMainCharacter(characters)
  if (!main) return false
  return main.armoryVerified === true && (main.armoryGuild || '').trim().toUpperCase() === 'TURX'
}

export function getProfileFieldErrors(
  profile: OnboardingProfile | null | undefined,
  characters: OnboardingCharacter[] | null | undefined,
): ProfileFieldErrorMap {
  const errors: ProfileFieldErrorMap = {}

  const nameParts = (profile?.fullName ?? '').trim().split(/\s+/).filter((part) => part.length > 1)
  if (nameParts.length < 2) {
    errors.fullName = 'İsim ve soyisim en az 2 kelime olarak girilmelidir.'
  }
  if (!(profile?.birthDate ?? '').trim()) {
    errors.birthDate = 'Doğum tarihi alanı boş bırakılamaz.'
  }
  if (!(profile?.gender ?? '').trim()) {
    errors.gender = 'Cinsiyet seçimi zorunludur.'
  }
  if (!(profile?.bnetId ?? '').trim()) {
    errors.bnetId = 'Battle.net Real ID alanı zorunludur (Örn: BattleTag#1234).'
  }
  if (!(profile?.email ?? '').trim() || !profile?.email?.includes('@')) {
    errors.email = 'Geçerli bir e-posta adresi girilmelidir.'
  }
  const phoneDigits = (profile?.phoneNumber ?? '').replace(/\D/g, '')
  if (phoneDigits.length < 10) {
    errors.phoneNumber = 'En az 10 haneli geçerli bir telefon numarası girilmelidir.'
  }
  if (!hasAvailabilityRequirement(profile)) {
    errors.availability =
      'En az bir günü Müsait/Belki olarak işaretleyin veya "Raidlere katılmayı şimdilik düşünmüyorum" seçeneğini seçin.'
  }
  const main = getMainCharacter(characters)
  if (!main) {
    errors.mainCharacter = 'En az bir aktif Main karakter eklemeniz zorunludur.'
  } else if (!hasVerifiedTurxMain(characters)) {
    errors.mainCharacter =
      'Main karakteriniz WoW Forever Armory üzerinden TURX guild üyesi olarak doğrulanmalıdır.'
  }

  return errors
}

export function getOnboardingGaps(
  profile: OnboardingProfile | null | undefined,
  characters: OnboardingCharacter[] | null | undefined,
) {
  const errors = getProfileFieldErrors(profile, characters)
  const gaps: string[] = []
  if (errors.mainCharacter) {
    gaps.push(getMainCharacter(characters) ? 'WoW Armory (TURX) doğrulaması' : 'En az bir Main karakter')
  }
  if (errors.fullName) gaps.push('Ad Soyad')
  if (errors.birthDate) gaps.push('Doğum tarihi')
  if (errors.gender) gaps.push('Cinsiyet')
  if (errors.bnetId) gaps.push('Battle.net ID')
  if (errors.email) gaps.push('E-posta')
  if (errors.phoneNumber) gaps.push('Telefon')
  if (errors.availability) gaps.push('Haftalık Raid Müsaitliği')
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
