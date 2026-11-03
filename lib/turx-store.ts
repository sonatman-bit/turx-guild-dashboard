import { list, put } from '@vercel/blob'
import { isGuildMasterEmail, type GuildRank } from '@/lib/turx-identity'

export type StoredAccount = {
  username: string
  email: string
  role: GuildRank
  salt: string
  passwordHash: string
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

export type GuildStore = {
  users: StoredAccount[]
  applications: StoredApplication[]
}

const PATH = 'turx-guild-store.json'

export function emptyStore(): GuildStore {
  return { users: [], applications: [] }
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
  const result = await list({ prefix: PATH, limit: 50 })
  const blob = result.blobs.find((item) => item.pathname === PATH || item.pathname.endsWith(`/${PATH}`))
  if (!blob) return emptyStore()
  const response = await fetch(blob.url)
  if (!response.ok) return emptyStore()
  const data = (await response.json()) as Partial<GuildStore>
  return {
    users: Array.isArray(data.users) ? data.users : [],
    applications: Array.isArray(data.applications) ? data.applications : [],
  }
}

async function writeStore(store: GuildStore) {
  await put(PATH, JSON.stringify(store), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
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
