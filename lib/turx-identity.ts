export type GuildRank =
  | 'Guild Master'
  | 'Görevli'
  | 'Turx'
  | 'Alt'
  | 'Sosyal'
  // Legacy aliases for backward compatibility:
  | 'Officer'
  | 'Member'
  | 'Raid Leader'
  | 'Raider'

export const PRIMARY_GUILD_RANKS = ['Guild Master', 'Görevli', 'Turx', 'Alt', 'Sosyal'] as const
export type PrimaryGuildRank = (typeof PRIMARY_GUILD_RANKS)[number]

export const GM_EMAIL = 'sonatman@hotmail.com'
export const DATA_EPOCH = '2026-11-03-auth-passwords'
const DATA_EPOCH_KEY = 'turx_data_epoch'

export function isGuildMasterEmail(email: string | null | undefined) {
  return (email ?? '').trim().toLowerCase() === GM_EMAIL
}

export function canAccessAdminPanel(role: string | null | undefined) {
  return role === 'Guild Master' || role === 'Görevli' || role === 'Officer'
}

export function normalizeGuildRank(role: string | null | undefined): PrimaryGuildRank {
  if (role === 'Guild Master') return 'Guild Master'
  if (role === 'Görevli' || role === 'Officer') return 'Görevli'
  if (role === 'Alt') return 'Alt'
  if (role === 'Sosyal' || role === 'Newbie' || role === 'Social') return 'Sosyal'
  return 'Turx'
}

export function wipeLegacyTurxData() {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(DATA_EPOCH_KEY) === DATA_EPOCH) return

  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (key?.startsWith('turx_')) keys.push(key)
  }
  keys.forEach((key) => localStorage.removeItem(key))
  localStorage.setItem(DATA_EPOCH_KEY, DATA_EPOCH)
}
