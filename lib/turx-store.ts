import { BlobNotFoundError, get, put } from '@vercel/blob'
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

export type GuildStore = {
  users: StoredAccount[]
  applications: StoredApplication[]
  polls: StoredPoll[]
}

const PATH = 'turx-guild-store.json'

export function emptyStore(): GuildStore {
  return { users: [], applications: [], polls: [] }
}

export function roleForEmail(email: string): GuildRank {
  return isGuildMasterEmail(email) ? 'Guild Master' : 'Member'
}

export function publicAccount(account: StoredAccount) {
  return {
    username: account.username,
    email: account.email,
    role: roleForEmail(account.email),
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
