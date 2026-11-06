import type { WowClass } from '@/lib/guild-data'

export const FOREVER_ARMORY_ORIGIN = 'https://worldofwarcraft.blizzard.com'
export const FOREVER_ARMORY_REGION = 'eu'

export type ArmorySnapshot = {
  url: string
  slug: string
  level: number | null
  avatarUrl: string | null
  renderUrl: string | null
  classIconUrl: string
}

const CLASS_ICON_SLUG: Record<WowClass, string> = {
  Warrior: 'warrior',
  Paladin: 'paladin',
  Hunter: 'hunter',
  Rogue: 'rogue',
  Priest: 'priest',
  Shaman: 'shaman',
  Mage: 'mage',
  Warlock: 'warlock',
  Druid: 'druid',
}

const CACHE_TTL_MS = 15 * 60 * 1000
const FETCH_TIMEOUT_MS = 6000
const FETCH_CONCURRENCY = 4

type CacheEntry = { expires: number; snapshot: ArmorySnapshot | null }
const memoryCache = new Map<string, CacheEntry>()

export function foreverArmorySlug(firstName: string, lastName: string) {
  return `${firstName.trim()}-${lastName.trim()}`.normalize('NFC').toLowerCase()
}

export function foreverArmoryUrl(firstName: string, lastName: string) {
  const slug = foreverArmorySlug(firstName, lastName)
  return `${FOREVER_ARMORY_ORIGIN}/en-us/forever/${FOREVER_ARMORY_REGION}/armory/character/${encodeURI(slug)}`
}

export function classIconUrl(wowClass: WowClass) {
  return `https://render.worldofwarcraft.com/us/icons/56/classicon_${CLASS_ICON_SLUG[wowClass]}.jpg`
}

export function emptyArmory(firstName: string, lastName: string, wowClass: WowClass): ArmorySnapshot {
  return {
    url: foreverArmoryUrl(firstName, lastName),
    slug: foreverArmorySlug(firstName, lastName),
    level: null,
    avatarUrl: null,
    renderUrl: null,
    classIconUrl: classIconUrl(wowClass),
  }
}

type CharacterState = {
  character?: {
    level?: number
    avatar?: { url?: string }
    media?: Record<string, { url?: string } | undefined>
  }
}

function extractJsonObject(source: string, start: number) {
  if (source[start] !== '{') return null
  let depth = 0
  let inString = false
  let escape = false
  for (let index = start; index < source.length; index += 1) {
    const char = source[index]
    if (inString) {
      if (escape) {
        escape = false
      } else if (char === '\\') {
        escape = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }
    if (char === '"') {
      inString = true
      continue
    }
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) return source.slice(start, index + 1)
    }
  }
  return null
}

export function parseForeverCharacterHtml(html: string): Pick<ArmorySnapshot, 'level' | 'avatarUrl' | 'renderUrl'> | null {
  const marker = 'var characterProfileInitialState = '
  const markerAt = html.indexOf(marker)
  const jsonStart = markerAt >= 0 ? html.indexOf('{', markerAt) : html.indexOf('{"character":')
  if (jsonStart < 0) return null
  const raw = extractJsonObject(html, jsonStart)
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as CharacterState
    const character = data.character
    if (!character) return null
    const media = character.media || {}
    return {
      level: typeof character.level === 'number' ? character.level : null,
      avatarUrl: media.avatar?.url || character.avatar?.url || media['avatar-sd']?.url || null,
      renderUrl: media['main-raw']?.url || media['main-sd-raw']?.url || null,
    }
  } catch {
    return null
  }
}

async function fetchArmoryPage(url: string) {
  const response = await fetch(url, {
    cache: 'force-cache',
    headers: {
      Accept: 'text/html',
      'User-Agent': 'TURX-Guild-Dashboard/1.0 (Forever Armory roster)',
    },
    next: { revalidate: 900 },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!response.ok) return null
  return response.text()
}

export async function loadArmorySnapshot(firstName: string, lastName: string, wowClass: WowClass): Promise<ArmorySnapshot> {
  const base = emptyArmory(firstName, lastName, wowClass)
  const cached = memoryCache.get(base.slug)
  if (cached && cached.expires > Date.now()) {
    return cached.snapshot || base
  }

  try {
    const html = await fetchArmoryPage(base.url)
    const parsed = html ? parseForeverCharacterHtml(html) : null
    const snapshot: ArmorySnapshot = parsed
      ? { ...base, ...parsed }
      : cached?.snapshot || base
    memoryCache.set(base.slug, { expires: Date.now() + CACHE_TTL_MS, snapshot: parsed ? snapshot : cached?.snapshot || null })
    return snapshot
  } catch {
    return cached?.snapshot || base
  }
}

export async function loadArmorySnapshots(
  characters: Array<{ firstName: string; lastName: string; wowClass: WowClass }>,
) {
  const unique = new Map<string, { firstName: string; lastName: string; wowClass: WowClass }>()
  for (const character of characters) {
    const slug = foreverArmorySlug(character.firstName, character.lastName)
    if (slug === '-') continue
    if (!unique.has(slug)) unique.set(slug, character)
  }

  const entries = [...unique.values()]
  const results = new Map<string, ArmorySnapshot>()
  let cursor = 0

  async function worker() {
    while (cursor < entries.length) {
      const index = cursor
      cursor += 1
      const character = entries[index]
      const snapshot = await loadArmorySnapshot(character.firstName, character.lastName, character.wowClass)
      results.set(snapshot.slug, snapshot)
    }
  }

  await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, entries.length) }, () => worker()))
  return results
}
