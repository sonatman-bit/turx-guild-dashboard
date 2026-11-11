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

async function fetchStoreFromBackend(): Promise<GuildStore> {
  const redis = getRedisCredentials()
  if (redis) {
    const fromRedis = await redisGetStore(redis)
    if (fromRedis) {
      globalForStore.__turxStoreCache = {
        store: fromRedis,
        fetchedAt: Date.now(),
      }
      return fromRedis
    }
    // Auto-migrate existing data from Vercel Blob to Redis on first read if Blob is available
    if (hasBlobToken()) {
      try {
        const migrated = await readBlobStore()
        await redisSetStore(redis, migrated.store)
        globalForStore.__turxStoreCache = {
          store: migrated.store,
          fetchedAt: Date.now(),
          etag: migrated.etag,
        }
        return migrated.store
      } catch {
        // Blob might be empty or rate-limited; start fresh in Redis
      }
    }
    const fresh = emptyStore()
    globalForStore.__turxStoreCache = {
      store: fresh,
      fetchedAt: Date.now(),
    }
    return fresh
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
  const exists = store.users.some(
    (item) => item.username.toLowerCase() === username.toLowerCase() || item.email.toLowerCase() === email,
  )
  if (exists) return 'exists'
  store.users.push({
    username,
    email,
    role: roleForEmail(email),
    salt,
    passwordHash,
    profile: incoming.profile || null,
    characters: Array.isArray(incoming.characters) ? incoming.characters : [],
    staffInterests: Array.isArray(incoming.staffInterests) ? incoming.staffInterests : [],
  })
  return 'added'
}
