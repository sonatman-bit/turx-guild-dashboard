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

export function resolveUserRole(account: { email: string; role?: GuildRank }): GuildRank {
  if (isGuildMasterEmail(account.email)) return 'Guild Master'
  const r = account.role
  if (r === 'Officer' || r === 'Raid Leader' || r === 'Raider' || r === 'Member') {
    return r
  }
  return 'Member'
}

export function roleForEmail(email: string, currentRole?: GuildRank): GuildRank {
  if (isGuildMasterEmail(email)) return 'Guild Master'
  if (currentRole && currentRole !== 'Guild Master') return currentRole
  return 'Member'
}

export function publicAccount(account: StoredAccount) {
  return {
    username: account.username,
    email: account.email,
    role: resolveUserRole(account),
  }
}

export function blobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim())
}

async function readStore(): Promise<GuildStore> {
  if (!blobConfigured()) return emptyStore()
  try {
    const result = await get(PATH, { access: 'private', useCache: false })
    if (!result || result.statusCode !== 200 || !result.stream) return emptyStore()
    const data = (await new Response(result.stream).json()) as Partial<GuildStore>
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
  } catch (err) {
    if (err instanceof BlobNotFoundError) return emptyStore()
    throw err
  }
}

async function writeStore(store: GuildStore) {
  await put(PATH, JSON.stringify(store), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
    contentType: 'application/json',
  })
}

export async function loadGuildStore() {
  return readStore()
}

export async function mutateGuildStore<T>(mutator: (store: GuildStore) => T | Promise<T>) {
  const store = await readStore()
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
