export type ArmoryRankColorId =
  | 'gold'
  | 'neon'
  | 'emerald'
  | 'azure'
  | 'violet'
  | 'rose'
  | 'amber'
  | 'silver'

export type ArmoryRankMapping = {
  /** WoW Forever Armory numeric rankId: 0 = Guild Master, 1 = Rank 1, 2 = Rank 2, ... */
  rankId: number
  /** Custom display label shown across the entire dashboard (e.g. GM, Officer, Raider, Turx) */
  label: string
  /** Badge color theme */
  color: ArmoryRankColorId
}

export type ResolvedDisplayRank = {
  label: string
  color: ArmoryRankColorId
  armoryRankId: number | null
  source: 'armory' | 'site'
}

export const ARMORY_RANK_COLOR_STYLES: Record<
  ArmoryRankColorId,
  { badgeClass: string; swatchHex: string; name: string }
> = {
  gold: {
    badgeClass: 'border-gold/55 bg-gold/15 text-gold',
    swatchHex: '#d4af37',
    name: 'Altın',
  },
  neon: {
    badgeClass: 'border-neon/50 bg-neon/12 text-neon',
    swatchHex: '#00f2fe',
    name: 'Turkuaz',
  },
  emerald: {
    badgeClass: 'border-emerald-500/50 bg-emerald-500/12 text-emerald-300',
    swatchHex: '#34d399',
    name: 'Zümrüt',
  },
  azure: {
    badgeClass: 'border-sky-400/50 bg-sky-500/12 text-sky-300',
    swatchHex: '#38bdf8',
    name: 'Mavi',
  },
  violet: {
    badgeClass: 'border-purple-400/50 bg-purple-500/12 text-purple-300',
    swatchHex: '#a78bfa',
    name: 'Mor',
  },
  rose: {
    badgeClass: 'border-rose-400/50 bg-rose-500/12 text-rose-300',
    swatchHex: '#fb7185',
    name: 'Gül',
  },
  amber: {
    badgeClass: 'border-amber-400/50 bg-amber-500/12 text-amber-300',
    swatchHex: '#fbbf24',
    name: 'Kehribar',
  },
  silver: {
    badgeClass: 'border-slate-500/50 bg-slate-500/12 text-slate-300',
    swatchHex: '#94a3b8',
    name: 'Gümüş',
  },
}

export const DEFAULT_ARMORY_RANK_MAPPINGS: ArmoryRankMapping[] = [
  { rankId: 0, label: 'GM', color: 'gold' },
  { rankId: 1, label: 'Officer', color: 'neon' },
  { rankId: 2, label: 'Raider', color: 'emerald' },
  { rankId: 3, label: 'Turx', color: 'azure' },
  { rankId: 4, label: 'Alt', color: 'violet' },
  { rankId: 5, label: 'Sosyal', color: 'silver' },
]

export function isArmoryRankColorId(val: unknown): val is ArmoryRankColorId {
  return typeof val === 'string' && val in ARMORY_RANK_COLOR_STYLES
}

export function formatArmoryRankKey(rankId: number): string {
  return rankId === 0 ? 'Rank 0 (Guild Master)' : `Rank ${rankId}`
}

export function normalizeArmoryRankMappings(raw?: unknown): ArmoryRankMapping[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_ARMORY_RANK_MAPPINGS.map((m) => ({ ...m }))
  }
  const seen = new Set<number>()
  const cleaned: ArmoryRankMapping[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const obj = item as Partial<ArmoryRankMapping>
    const rankId = Math.max(0, Math.min(20, Math.floor(Number(obj.rankId))))
    if (!Number.isFinite(rankId) || seen.has(rankId)) continue
    const label = typeof obj.label === 'string' ? obj.label.trim().slice(0, 32) : ''
    if (!label) continue
    seen.add(rankId)
    cleaned.push({
      rankId,
      label,
      color: isArmoryRankColorId(obj.color) ? obj.color : 'silver',
    })
  }
  if (cleaned.length === 0) {
    return DEFAULT_ARMORY_RANK_MAPPINGS.map((m) => ({ ...m }))
  }
  cleaned.sort((a, b) => a.rankId - b.rankId)
  return cleaned
}

export function fallbackColorForSiteRank(siteRank?: string | null): ArmoryRankColorId {
  const r = (siteRank || '').trim().toLowerCase()
  if (r === 'guild master' || r === 'gm') return 'gold'
  if (r === 'görevli' || r === 'officer') return 'neon'
  if (r === 'raider' || r === 'raid leader') return 'emerald'
  if (r === 'turx') return 'azure'
  if (r === 'alt') return 'violet'
  return 'silver'
}

export function resolveArmoryDisplayRank(
  armoryRankId: number | null | undefined,
  mappings: ArmoryRankMapping[] | null | undefined,
  fallbackSiteRank?: string | null,
): ResolvedDisplayRank {
  const list = normalizeArmoryRankMappings(mappings)
  if (typeof armoryRankId === 'number' && Number.isFinite(armoryRankId) && armoryRankId >= 0) {
    const matched = list.find((m) => m.rankId === armoryRankId)
    if (matched) {
      return {
        label: matched.label,
        color: matched.color,
        armoryRankId,
        source: 'armory',
      }
    }
    return {
      label: armoryRankId === 0 ? 'GM' : `Rank ${armoryRankId}`,
      color: armoryRankId === 0 ? 'gold' : 'silver',
      armoryRankId,
      source: 'armory',
    }
  }

  const cleanFallback = (fallbackSiteRank || 'Turx').trim() || 'Turx'
  return {
    label: cleanFallback === 'Guild Master' ? 'GM' : cleanFallback,
    color: fallbackColorForSiteRank(cleanFallback),
    armoryRankId: null,
    source: 'site',
  }
}
