import type { WowClass } from '@/lib/guild-data'

export const FOREVER_ARMORY_ORIGIN = 'https://worldofwarcraft.blizzard.com'
export const FOREVER_ARMORY_REGION = 'eu'
export const TURX_GUILD_NAME = 'TURX'
export const TURX_GUILD_SLUG = 'turx'

export type ArmorySnapshot = {
  url: string
  slug: string
  found: boolean
  level: number | null
  avatarUrl: string | null
  renderUrl: string | null
  classIconUrl: string
  guildName: string | null
  guildSlug: string | null
  inTurxGuild: boolean
  characterClass: string | null
  characterRace: string | null
  hasDrakefireAmulet?: boolean
}

export type ArmoryVerificationStatus =
  | 'verified_turx'
  | 'wrong_guild'
  | 'no_guild'
  | 'not_found'
  | 'armory_unavailable'

export type ArmoryVerificationResult = {
  status: ArmoryVerificationStatus
  ok: boolean
  url: string
  slug: string
  level: number | null
  guildName: string | null
  guildSlug: string | null
  characterClass: string | null
  characterRace: string | null
  avatarUrl: string | null
  message: string
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
const GUILD_ROSTER_CACHE_TTL_MS = 10 * 60 * 1000
const FETCH_TIMEOUT_MS = 8000
const FETCH_CONCURRENCY = 4
const FOREVER_GUILD_ROSTER_QUERY_HASH =
  '5f32b85faa248d321a08645d470fb38b82be64b9abd8b5b5fd2816620546794b'

export type ArmoryGuildRosterMember = {
  slug: string
  name: string
  surname: string
  level: number | null
  rankId: number
  className: string | null
  raceName: string | null
}

type CacheEntry = { expires: number; snapshot: ArmorySnapshot | null }
const memoryCache = new Map<string, CacheEntry>()

type GuildRosterCacheEntry = {
  expires: number
  fetchedAt: number
  members: Map<string, ArmoryGuildRosterMember>
}
let guildRosterCache: GuildRosterCacheEntry | null = null

export async function loadTurxGuildRosterRanks(options?: {
  bypassCache?: boolean
}): Promise<Map<string, ArmoryGuildRosterMember>> {
  const bypassCache = Boolean(options?.bypassCache)
  if (!bypassCache && guildRosterCache && guildRosterCache.expires > Date.now()) {
    return guildRosterCache.members
  }

  try {
    const res = await fetch(`${FOREVER_ARMORY_ORIGIN}/graphql`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-wow-variant': 'forever',
        Referer: `${FOREVER_ARMORY_ORIGIN}/en-us/forever/${FOREVER_ARMORY_REGION}/armory/guild/${TURX_GUILD_SLUG}`,
        'User-Agent': 'TURX-Guild-Dashboard/1.0 (Forever Armory guild roster)',
      },
      body: JSON.stringify({
        operationName: 'GetGuildRoster',
        variables: {
          guild: {
            nameSlug: TURX_GUILD_SLUG,
            region: FOREVER_ARMORY_REGION,
          },
          showMessageOfTheDay: false,
          showRoles: false,
        },
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: FOREVER_GUILD_ROSTER_QUERY_HASH,
          },
        },
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })

    if (!res.ok) {
      return guildRosterCache?.members || new Map()
    }

    const payload = (await res.json()) as {
      data?: {
        Guild?: {
          roster?: Array<{
            rank?: { rankId?: number | null } | null
            character?: {
              name?: string | null
              surname?: string | null
              level?: number | null
              class?: { name?: string | null } | null
              race?: { name?: string | null } | null
            } | null
          }>
        }
      }
    }

    const rosterList = payload?.data?.Guild?.roster
    if (!Array.isArray(rosterList)) {
      return guildRosterCache?.members || new Map()
    }

    const map = new Map<string, ArmoryGuildRosterMember>()
    for (const entry of rosterList) {
      const charName = (entry.character?.name || '').trim()
      const charSurname = (entry.character?.surname || '').trim()
      const rankId = typeof entry.rank?.rankId === 'number' ? entry.rank.rankId : null
      if (!charName || !charSurname || rankId === null) continue
      const slug = foreverArmorySlug(charName, charSurname)
      map.set(slug, {
        slug,
        name: charName,
        surname: charSurname,
        level: typeof entry.character?.level === 'number' ? entry.character.level : null,
        rankId,
        className: entry.character?.class?.name || null,
        raceName: entry.character?.race?.name || null,
      })
    }

    guildRosterCache = {
      expires: Date.now() + GUILD_ROSTER_CACHE_TTL_MS,
      fetchedAt: Date.now(),
      members: map,
    }
    return map
  } catch {
    return guildRosterCache?.members || new Map()
  }
}

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

export function isTurxGuildMatch(guildName?: string | null, guildSlug?: string | null) {
  const slug = (guildSlug || '').trim().toLowerCase()
  const name = (guildName || '').trim().toUpperCase()
  return slug === TURX_GUILD_SLUG || name === TURX_GUILD_NAME
}

export function emptyArmory(firstName: string, lastName: string, wowClass: WowClass): ArmorySnapshot {
  return {
    url: foreverArmoryUrl(firstName, lastName),
    slug: foreverArmorySlug(firstName, lastName),
    found: false,
    level: null,
    avatarUrl: null,
    renderUrl: null,
    classIconUrl: classIconUrl(wowClass),
    guildName: null,
    guildSlug: null,
    inTurxGuild: false,
    characterClass: null,
    characterRace: null,
    hasDrakefireAmulet: false,
  }
}

type CharacterState = {
  character?: {
    level?: number
    avatar?: { url?: string }
    media?: Record<string, { url?: string } | undefined>
    gear?: Record<string, { id?: number; name?: string } | undefined>
    guild?: {
      name?: string
      slug?: string
    } | null
    class?: {
      name?: string
      slug?: string
    } | null
    race?: {
      name?: string
      slug?: string
    } | null
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

export function parseForeverCharacterHtml(
  html: string,
): Pick<
  ArmorySnapshot,
  | 'found'
  | 'level'
  | 'avatarUrl'
  | 'renderUrl'
  | 'guildName'
  | 'guildSlug'
  | 'inTurxGuild'
  | 'characterClass'
  | 'characterRace'
  | 'hasDrakefireAmulet'
> | null {
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
    const guildName = typeof character.guild?.name === 'string' && character.guild.name.trim()
      ? character.guild.name.trim()
      : null
    const guildSlug = typeof character.guild?.slug === 'string' && character.guild.slug.trim()
      ? character.guild.slug.trim().toLowerCase()
      : null
    const gearItems = Object.values(character.gear || {})
    const hasDrakefireAmulet = gearItems.some(
      (item) =>
        item?.id === 16309 ||
        (typeof item?.name === 'string' && item.name.toLowerCase().includes('drakefire amulet')),
    )
    return {
      found: true,
      level: typeof character.level === 'number' ? character.level : null,
      avatarUrl: media.avatar?.url || character.avatar?.url || media['avatar-sd']?.url || null,
      renderUrl: media['main-raw']?.url || media['main-sd-raw']?.url || null,
      guildName,
      guildSlug,
      inTurxGuild: isTurxGuildMatch(guildName, guildSlug),
      characterClass: typeof character.class?.name === 'string' ? character.class.name : null,
      characterRace: typeof character.race?.name === 'string' ? character.race.name : null,
      hasDrakefireAmulet,
    }
  } catch {
    return null
  }
}

async function fetchArmoryPage(url: string, bypassCache = false): Promise<{ status: number; html: string | null }> {
  const response = await fetch(url, {
    cache: bypassCache ? 'no-store' : 'force-cache',
    headers: {
      Accept: 'text/html',
      'User-Agent': 'TURX-Guild-Dashboard/1.0 (Forever Armory roster)',
    },
    ...(bypassCache ? {} : { next: { revalidate: 900 } }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!response.ok) return { status: response.status, html: null }
  return { status: response.status, html: await response.text() }
}

export async function loadArmorySnapshot(
  firstName: string,
  lastName: string,
  wowClass: WowClass,
  options?: { bypassCache?: boolean },
): Promise<ArmorySnapshot> {
  const base = emptyArmory(firstName, lastName, wowClass)
  const bypassCache = Boolean(options?.bypassCache)
  const cached = memoryCache.get(base.slug)
  if (!bypassCache && cached && cached.expires > Date.now()) {
    return cached.snapshot || base
  }

  try {
    const { html } = await fetchArmoryPage(base.url, bypassCache)
    const parsed = html ? parseForeverCharacterHtml(html) : null
    const snapshot: ArmorySnapshot = parsed
      ? { ...base, ...parsed }
      : bypassCache
        ? base
        : cached?.snapshot || base
    memoryCache.set(base.slug, {
      expires: Date.now() + CACHE_TTL_MS,
      snapshot: parsed ? snapshot : bypassCache ? null : cached?.snapshot || null,
    })
    return snapshot
  } catch {
    return bypassCache ? base : cached?.snapshot || base
  }
}

export async function verifyCharacterInTurxGuild(
  firstName: string,
  lastName: string,
  wowClass: WowClass = 'Warrior',
): Promise<ArmoryVerificationResult> {
  const cleanFirst = firstName.trim()
  const cleanLast = lastName.trim()
  const base = emptyArmory(cleanFirst, cleanLast, wowClass)

  if (!cleanFirst || !cleanLast) {
    return {
      status: 'not_found',
      ok: false,
      url: base.url,
      slug: base.slug,
      level: null,
      guildName: null,
      guildSlug: null,
      characterClass: null,
      characterRace: null,
      avatarUrl: null,
      message: 'Karakter adı ve soyadı boş bırakılamaz.',
    }
  }

  try {
    const { status, html } = await fetchArmoryPage(base.url, true)
    if (!html) {
      if (status === 404 || status === 500) {
        return {
          status: 'not_found',
          ok: false,
          url: base.url,
          slug: base.slug,
          level: null,
          guildName: null,
          guildSlug: null,
          characterClass: null,
          characterRace: null,
          avatarUrl: null,
          message: `"${cleanFirst} ${cleanLast}" karakteri WoW Forever Armory (EU) üzerinde bulunamadı. İsim/soyisim yazımını kontrol edin (karakterin en az Level 10 olması ve oyundan çıkış yapmış olması gerekir).`,
        }
      }
      return {
        status: 'armory_unavailable',
        ok: false,
        url: base.url,
        slug: base.slug,
        level: null,
        guildName: null,
        guildSlug: null,
        characterClass: null,
        characterRace: null,
        avatarUrl: null,
        message: 'WoW Forever Armory şu an yanıt vermiyor. Lütfen birkaç saniye sonra tekrar deneyin.',
      }
    }

    const parsed = parseForeverCharacterHtml(html)
    if (!parsed || !parsed.found) {
      return {
        status: 'not_found',
        ok: false,
        url: base.url,
        slug: base.slug,
        level: null,
        guildName: null,
        guildSlug: null,
        characterClass: null,
        characterRace: null,
        avatarUrl: null,
        message: `"${cleanFirst} ${cleanLast}" karakteri WoW Forever Armory üzerinde doğrulanamadı. Karakter isim ve soyismini tam olarak girdiğinizden emin olun.`,
      }
    }

    const snapshot: ArmorySnapshot = { ...base, ...parsed }
    memoryCache.set(base.slug, { expires: Date.now() + CACHE_TTL_MS, snapshot })

    if (parsed.inTurxGuild) {
      return {
        status: 'verified_turx',
        ok: true,
        url: base.url,
        slug: base.slug,
        level: parsed.level,
        guildName: parsed.guildName || TURX_GUILD_NAME,
        guildSlug: parsed.guildSlug || TURX_GUILD_SLUG,
        characterClass: parsed.characterClass,
        characterRace: parsed.characterRace,
        avatarUrl: parsed.avatarUrl,
        message: `${cleanFirst} ${cleanLast} (Level ${parsed.level ?? '?'}) TURX guild üyesi olarak WoW Armory'de doğrulandı!`,
      }
    }

    if (parsed.guildName) {
      return {
        status: 'wrong_guild',
        ok: false,
        url: base.url,
        slug: base.slug,
        level: parsed.level,
        guildName: parsed.guildName,
        guildSlug: parsed.guildSlug,
        characterClass: parsed.characterClass,
        characterRace: parsed.characterRace,
        avatarUrl: parsed.avatarUrl,
        message: `"${cleanFirst} ${cleanLast}" WoW Armory'de "${parsed.guildName}" guildinde görünüyor. Site kaydı için aktif olarak TURX guild listesinde yer alan main karakterinizi girmelisiniz.`,
      }
    }

    return {
      status: 'no_guild',
      ok: false,
      url: base.url,
      slug: base.slug,
      level: parsed.level,
      guildName: null,
      guildSlug: null,
      characterClass: parsed.characterClass,
      characterRace: parsed.characterRace,
      avatarUrl: parsed.avatarUrl,
      message: `"${cleanFirst} ${cleanLast}" WoW Armory'de herhangi bir guild üyesi olarak görünmüyor. Site kaydı için TURX guildinde bulunan aktif main karakterinizi girmelisiniz.`,
    }
  } catch {
    return {
      status: 'armory_unavailable',
      ok: false,
      url: base.url,
      slug: base.slug,
      level: null,
      guildName: null,
      guildSlug: null,
      characterClass: null,
      characterRace: null,
      avatarUrl: null,
      message: 'WoW Forever Armory bağlantısı zaman aşımına uğradı. Lütfen tekrar deneyin.',
    }
  }
}

export async function loadArmorySnapshots(
  characters: Array<{ firstName: string; lastName: string; wowClass: WowClass }>,
  options?: { bypassCache?: boolean },
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
      const snapshot = await loadArmorySnapshot(character.firstName, character.lastName, character.wowClass, options)
      results.set(snapshot.slug, snapshot)
    }
  }

  await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, entries.length) }, () => worker()))
  return results
}
