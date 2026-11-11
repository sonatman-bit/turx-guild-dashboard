import { BlobNotFoundError, get, put } from '@vercel/blob'
import type { AccountLinks, StreamNotice } from '@/lib/account-links'
import { isGuildMasterEmail, type GuildRank } from '@/lib/turx-identity'

export type StoredAccount = {
  username: string
  email: string
  role: GuildRank
  salt: string
  passwordHash: string
  profile?: Record<string, unknown> | null
  characters?: unknown[]
  onboardingComplete?: boolean
  staffInterests?: string[]
  links?: AccountLinks
}

export type StoredApplication = {
  id: string
  accountName: string
  charName: string
  charSurname: string
  discord: string
  race: string
  characterClass: string
  spec: string
  logs: string
  experience: string
  previousGuilds: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  date: string
}

export type StoredPollVote = {
  username: string
  optionId: string
  at: string
}

export type StoredPoll = {
  id: string
  votes: StoredPollVote[]
}

export type StoredRecruitNeed = {
  wowClass: string
  spec: string
  need: string
}

export type StoredRaidSignup = {
  id: string
  raidId: string
  username: string
  characterId: string
  characterName: string
  wowClass: string
  spec: string
  role: 'TANK' | 'HEALER' | 'MELEE' | 'RANGED'
  status: 'Confirmed' | 'Pending' | 'Declined'
  rosterStatus: 'signup' | 'roster' | 'bench'
  createdAt: string
  confirmedAt?: string
}

export type StoredRaidState = {
  raidId: string
  publishedAt?: string
  publishedBy?: string
  signups: StoredRaidSignup[]
}

export type StoredBankRequest = {
  id: string
  username: string
  item: string
  qty: number
  raid?: string
  note?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  updatedAt?: string
  reviewedBy?: string
}

export type StoredBankTransaction = {
  id: string
  who: string
  what: string
  time: string
}

export type GuildStore = {
  users: StoredAccount[]
  applications: StoredApplication[]
  polls: StoredPoll[]
  recruitmentNeeds: StoredRecruitNeed[]
  streamNotices: StreamNotice[]
  raidStates?: Record<string, StoredRaidState>
  bankRequests?: StoredBankRequest[]
  bankLedger?: StoredBankTransaction[]
}

const PATH = 'turx-guild-store.json'
const REDIS_KEY = 'turx-guild-store'

// Cache reads in memory for 60s across warm Vercel Fluid Compute invocations
// and immediately update cache on every write (mutateGuildStore).
const READ_CACHE_TTL_MS = 60_000

type StoreCacheEntry = {
  store: GuildStore
  fetchedAt: number
  etag?: string
}

const globalForStore = globalThis as unknown as {
  __turxStoreCache?: StoreCacheEntry
  __turxStoreInFlight?: Promise<GuildStore> | null
}

export function emptyStore(): GuildStore {
  return {
    users: [],
    applications: [],
    polls: [],
    recruitmentNeeds: [],
    streamNotices: [],
    raidStates: {},
    bankRequests: [],
    bankLedger: [],
  }
}

function normalizeStore(data: Partial<GuildStore> | null | undefined): GuildStore {
  if (!data || typeof data !== 'object') return emptyStore()
  return {
    users: Array.isArray(data.users) ? data.users : [],
    applications: Array.isArray(data.applications) ? data.applications : [],
    polls: Array.isArray(data.polls) ? data.polls : [],
    recruitmentNeeds: Array.isArray(data.recruitmentNeeds) ? data.recruitmentNeeds : [],
    streamNotices: Array.isArray(data.streamNotices) ? data.streamNotices : [],
    raidStates: typeof data.raidStates === 'object' && data.raidStates !== null ? data.raidStates : {},
    bankRequests: Array.isArray(data.bankRequests) ? data.bankRequests : [],
    bankLedger: Array.isArray(data.bankLedger) ? data.bankLedger : [],
  }
}

function cloneStore(store: GuildStore): GuildStore {
  return structuredClone(store)
}

export function resolveUserRole(account: { email: string; role?: GuildRank }): GuildRank {
  if (isGuildMasterEmail(account.email)) return 'Guild Master'
  const r = account.role as string | undefined
  if (r === 'Görevli' || r === 'Officer') return 'Görevli'
  if (r === 'Alt') return 'Alt'
  if (r === 'Sosyal' || r === 'Newbie' || r === 'Social') return 'Sosyal'
  if (r === 'Turx' || r === 'Member' || r === 'Raider' || r === 'Raid Leader') return 'Turx'
  return 'Turx'
}

export function roleForEmail(email: string, currentRole?: GuildRank): GuildRank {
  if (isGuildMasterEmail(email)) return 'Guild Master'
  if (currentRole && currentRole !== 'Guild Master') return resolveUserRole({ email, role: currentRole })
  return 'Turx'
}

export function publicAccount(account: StoredAccount) {
  return {
    username: account.username,
    email: account.email,
    role: resolveUserRole(account),
  }
}

function getRedisCredentials(): { url: string; token: string } | null {
  const url = (
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.STORAGE_KV_REST_API_URL ||
    process.env.STORAGE_REST_API_URL ||
    ''
  )
    .trim()
    .replace(/\/+$/, '')
  const token = (
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.STORAGE_KV_REST_API_TOKEN ||
    process.env.STORAGE_REST_API_TOKEN ||
    ''
  ).trim()
  if (url && token) return { url, token }
  return null
}

function hasBlobToken() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim())
}

export function blobConfigured() {
  return Boolean(getRedisCredentials() || hasBlobToken())
}

async function redisGetStore(creds: { url: string; token: string }): Promise<GuildStore | null> {
  const res = await fetch(`${creds.url}/get/${encodeURIComponent(REDIS_KEY)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${creds.token}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`Redis GET failed with status ${res.status}`)
  }
  const payload = (await res.json()) as { result?: string | Partial<GuildStore> | null }
  if (!payload.result) return null
  const parsed =
    typeof payload.result === 'string'
      ? (JSON.parse(payload.result) as Partial<GuildStore>)
      : payload.result
  return normalizeStore(parsed)
}

async function redisSetStore(creds: { url: string; token: string }, store: GuildStore): Promise<void> {
  const res = await fetch(`${creds.url}/set/${encodeURIComponent(REDIS_KEY)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(store),
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`Redis SET failed with status ${res.status}`)
  }
}

async function readBlobStore(): Promise<{ store: GuildStore; etag?: string }> {
  const cached = globalForStore.__turxStoreCache
  const result = await get(PATH, {
    access: 'private',
    useCache: true,
    ...(cached?.etag ? { ifNoneMatch: cached.etag } : {}),
  })
  if (!result) {
    return { store: emptyStore() }
  }
  if (result.statusCode === 304 && cached) {
    return { store: cached.store, etag: result.blob.etag || cached.etag }
  }
  if (result.statusCode !== 200 || !result.stream) {
    return { store: cached?.store ?? emptyStore(), etag: cached?.etag }
  }
  const data = (await new Response(result.stream).json()) as Partial<GuildStore>
  return {
    store: normalizeStore(data),
    etag: result.blob.etag,
  }
}

export function mergeGuildStores(current: GuildStore, incoming: Partial<GuildStore>): GuildStore {
  const base = normalizeStore(incoming)
  const target = normalizeStore(current)

  // Merge users (prefer fuller profile/characters from either side, keep current role if promoted)
  const userMap = new Map<string, StoredAccount>()
  for (const u of base.users) {
    if (u?.username) userMap.set(u.username.toLowerCase(), cloneStore({ ...emptyStore(), users: [u] }).users[0])
  }
  for (const u of target.users) {
    if (!u?.username) continue
    const key = u.username.toLowerCase()
    const prev = userMap.get(key)
    if (!prev) {
      userMap.set(key, u)
    } else {
      userMap.set(key, {
        ...prev,
        ...u,
        role: prev.role && prev.role !== 'Turx' ? prev.role : u.role || prev.role,
        profile: u.profile && Object.keys(u.profile).length > 0 ? u.profile : prev.profile,
        characters: Array.isArray(u.characters) && u.characters.length > 0 ? u.characters : prev.characters,
        staffInterests:
          Array.isArray(u.staffInterests) && u.staffInterests.length > 0 ? u.staffInterests : prev.staffInterests,
        links: { ...(prev.links || {}), ...(u.links || {}) },
      })
    }
  }

  // Merge applications by id
  const appMap = new Map<string, StoredApplication>()
  for (const a of [...base.applications, ...target.applications]) {
    if (a?.id) appMap.set(a.id, a)
  }

  // Merge polls by id
  const pollMap = new Map<string, StoredPoll>()
  for (const p of [...base.polls, ...target.polls]) {
    if (!p?.id) continue
    const existingPoll = pollMap.get(p.id)
    if (!existingPoll) {
      pollMap.set(p.id, p)
    } else {
      const voteMap = new Map<string, StoredPollVote>()
      for (const v of [...(existingPoll.votes || []), ...(p.votes || [])]) {
        if (v?.username) voteMap.set(v.username.toLowerCase(), v)
      }
      pollMap.set(p.id, { id: p.id, votes: [...voteMap.values()] })
    }
  }

  // Merge raid states
  const raidStates: Record<string, StoredRaidState> = { ...(base.raidStates || {}) }
  for (const [raidId, state] of Object.entries(target.raidStates || {})) {
    const prev = raidStates[raidId]
    if (!prev) {
      raidStates[raidId] = state
    } else {
      const signupMap = new Map<string, StoredRaidSignup>()
      for (const s of [...(prev.signups || []), ...(state.signups || [])]) {
        if (s?.id) signupMap.set(s.id, s)
      }
      raidStates[raidId] = {
        ...prev,
        ...state,
        signups: [...signupMap.values()],
      }
    }
  }

  // Merge bank requests & ledger
  const bankReqMap = new Map<string, StoredBankRequest>()
  for (const r of [...(base.bankRequests || []), ...(target.bankRequests || [])]) {
    if (r?.id) bankReqMap.set(r.id, r)
  }
  const bankLedgerMap = new Map<string, StoredBankTransaction>()
  for (const t of [...(base.bankLedger || []), ...(target.bankLedger || [])]) {
    if (t?.id) bankLedgerMap.set(t.id, t)
  }

  return {
    users: [...userMap.values()],
    applications: [...appMap.values()],
    polls: [...pollMap.values()],
    recruitmentNeeds:
      target.recruitmentNeeds.length > 0 ? target.recruitmentNeeds : base.recruitmentNeeds,
    streamNotices: target.streamNotices.length > 0 ? target.streamNotices : base.streamNotices,
    raidStates,
    bankRequests: [...bankReqMap.values()],
    bankLedger: [...bankLedgerMap.values()],
  }
}

async function fetchStoreFromBackend(): Promise<GuildStore> {
  const redis = getRedisCredentials()
  if (redis) {
    const fromRedis = await redisGetStore(redis)
    const needsBlobHydration =
      !fromRedis ||
      (fromRedis.users.length <= 2 &&
        fromRedis.applications.length === 0 &&
        fromRedis.polls.length === 0)

    if (fromRedis && !needsBlobHydration) {
      globalForStore.__turxStoreCache = {
        store: fromRedis,
        fetchedAt: Date.now(),
      }
      return fromRedis
    }

    // Auto-migrate or merge existing data from Vercel Blob to Redis when Blob becomes available
    if (hasBlobToken()) {
      try {
        const migrated = await readBlobStore()
        if (migrated.store.users.length > 0 || migrated.store.applications.length > 0 || migrated.store.polls.length > 0) {
          const merged = fromRedis ? mergeGuildStores(fromRedis, migrated.store) : migrated.store
          await redisSetStore(redis, merged)
          globalForStore.__turxStoreCache = {
            store: merged,
            fetchedAt: Date.now(),
            etag: migrated.etag,
          }
          return merged
        }
      } catch {
        // Blob might still be locked; fall back to whatever is in Redis
      }
    }

    const fallback = fromRedis ?? emptyStore()
    globalForStore.__turxStoreCache = {
      store: fallback,
      fetchedAt: Date.now(),
    }
    return fallback
  }

  if (!hasBlobToken()) return emptyStore()

  try {
    const { store, etag } = await readBlobStore()
    globalForStore.__turxStoreCache = {
      store,
      fetchedAt: Date.now(),
      etag,
    }
    return store
  } catch (err) {
    if (err instanceof BlobNotFoundError) {
      const fresh = emptyStore()
      globalForStore.__turxStoreCache = {
        store: fresh,
        fetchedAt: Date.now(),
      }
      return fresh
    }
    // If Vercel Blob quota is temporarily exhausted or rate-limited, serve from warm memory cache if available
    if (globalForStore.__turxStoreCache) {
      console.warn('Blob read failed, serving from in-memory cache:', err)
      return globalForStore.__turxStoreCache.store
    }
    console.warn('Blob read failed with cold cache, returning empty store fallback:', err)
    return emptyStore()
  }
}

async function readStore(forceRefresh = false): Promise<GuildStore> {
  if (!blobConfigured()) return emptyStore()

  const cached = globalForStore.__turxStoreCache
  if (!forceRefresh && cached && Date.now() - cached.fetchedAt < READ_CACHE_TTL_MS) {
    return cloneStore(cached.store)
  }

  if (!forceRefresh && globalForStore.__turxStoreInFlight) {
    const shared = await globalForStore.__turxStoreInFlight
    return cloneStore(shared)
  }

  const promise = fetchStoreFromBackend().finally(() => {
    globalForStore.__turxStoreInFlight = null
  })
  globalForStore.__turxStoreInFlight = promise
  const store = await promise
  return cloneStore(store)
}

async function writeStore(store: GuildStore) {
  const normalized = normalizeStore(store)
  const redis = getRedisCredentials()

  if (redis) {
    await redisSetStore(redis, normalized)
    globalForStore.__turxStoreCache = {
      store: cloneStore(normalized),
      fetchedAt: Date.now(),
    }
    return
  }

  const putResult = await put(PATH, JSON.stringify(normalized), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
    contentType: 'application/json',
  })

  globalForStore.__turxStoreCache = {
    store: cloneStore(normalized),
    fetchedAt: Date.now(),
    etag: putResult.etag,
  }
}

export async function loadGuildStore() {
  return readStore(false)
}

export async function mutateGuildStore<T>(mutator: (store: GuildStore) => T | Promise<T>) {
  // Reuse warm cache if available to avoid spending an extra Blob Simple Operation on every write
  const store = await readStore(false)
  const result = await mutator(store)
  await writeStore(store)
  return result
}

function isHex(value: string, length: number) {
  return value.length === length && /^[a-f0-9]+$/i.test(value)
}

export function findStoredUser(store: GuildStore, usernameOrEmail: string) {
  const key = usernameOrEmail.trim().toLowerCase()
  return store.users.find(
    (item) => item.username.toLowerCase() === key || item.email.toLowerCase() === key,
  )
}

export type ImportableAccount = {
  username?: string
  email?: string
  salt?: string
  passwordHash?: string
  profile?: Record<string, unknown> | null
  characters?: unknown[]
  staffInterests?: string[]
}

export function upsertMissingAccount(store: GuildStore, incoming: ImportableAccount) {
  const username = (incoming.username || '').trim()
  const email = (incoming.email || '').trim().toLowerCase()
  const salt = (incoming.salt || '').trim()
  const passwordHash = (incoming.passwordHash || '').trim()
  if (!username || !email || !isHex(salt, 32) || !isHex(passwordHash, 64)) return 'invalid'

  const incomingProfile = incoming.profile && typeof incoming.profile === 'object' ? incoming.profile : null
  const incomingChars = Array.isArray(incoming.characters) ? incoming.characters : []

  const buildLinks = (existingLinks?: AccountLinks, prof?: Record<string, unknown> | null): AccountLinks | undefined => {
    const links: AccountLinks = { ...(existingLinks || {}) }
    if (prof) {
      const bnetTag = typeof prof.bnetId === 'string' ? prof.bnetId.trim() : ''
      if (bnetTag && !links.bnet) {
        links.bnet = { id: bnetTag, battletag: bnetTag }
      }
      const discordUser = typeof prof.discordTag === 'string' ? prof.discordTag.trim().replace(/^@/, '') : ''
      if (discordUser && !links.discord) {
        links.discord = { id: discordUser, username: discordUser, globalName: discordUser }
      }
    }
    return Object.keys(links).length > 0 ? links : existingLinks
  }

  const existing = store.users.find(
    (item) => item.username.toLowerCase() === username.toLowerCase() || item.email.toLowerCase() === email,
  )
  if (existing) {
    let updated = false
    if (!existing.profile && incomingProfile) {
      existing.profile = incomingProfile
      updated = true
    }
    if ((!existing.characters || existing.characters.length === 0) && incomingChars.length > 0) {
      existing.characters = incomingChars
      updated = true
    }
    const mergedLinks = buildLinks(existing.links, (existing.profile || incomingProfile) as Record<string, unknown> | null)
    if (mergedLinks && !existing.links) {
      existing.links = mergedLinks
      updated = true
    }
    return updated ? 'added' : 'exists'
  }

  store.users.push({
    username,
    email,
    role: roleForEmail(email),
    salt,
    passwordHash,
    profile: incomingProfile,
    characters: incomingChars,
    staffInterests: Array.isArray(incoming.staffInterests) ? incoming.staffInterests : [],
    links: buildLinks(undefined, incomingProfile),
  })
  return 'added'
}
