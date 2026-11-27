import type { WowClass } from './guild-data'
import { normalizeRaidSystemStore, RAID_CATALOG } from './raid-loot-system'
import type { GuildStore } from './turx-store'
import {
  foreverArmorySlug,
  loadArmorySnapshots,
  loadTurxGuildRosterRanks,
  type ArmoryGuildRosterMember,
} from './wow-armory'

export type RaidProgressEntry = {
  raidId: string
  raidName: string
  size: 10 | 20 | 40
  bosses: number
  killed: number
  attunementRequired: boolean
  attunementLabel: string
}

export type GuildProgressTrackerState = {
  lastSyncedAt: string
  source: 'cron' | 'manual' | 'live'
  scheduleLabel: string
  raids: RaidProgressEntry[]
  level60Count: number
  level60Target: number
  onyxiaAttunedCount: number
  onyxiaAttunedTarget: number
  totalArmoryMembers: number
  armoryDetectedOnyxiaCount: number
}

type StoredCharacter = {
  firstName?: string
  lastName?: string
  wowClass?: string
  level?: number
  armoryLevel?: number | null
  armoryRankId?: number | null
  isMain?: boolean
  attunements?: {
    onyxia?: boolean
    mc?: boolean
    bwl?: boolean
    naxx?: boolean
  }
}

export function defaultRaidProgressEntries(): RaidProgressEntry[] {
  return RAID_CATALOG.map((r) => ({
    raidId: r.id,
    raidName: r.name,
    size: r.size,
    bosses: r.bosses.length,
    killed: 0,
    attunementRequired: r.id === 'onyxia',
    attunementLabel: r.id === 'onyxia' ? 'Drakefire Amulet (Zorunlu)' : 'Attunement Yok',
  }))
}

function inferKillsFromRaidSystem(store: GuildStore): Map<string, number> {
  const rs = normalizeRaidSystemStore(store.raidSystem)
  const bossesByRaid = new Map<string, Set<string>>()

  // Any loot item that has been awarded in at least 1 round implies that boss was killed
  for (const item of rs.lootItems || []) {
    const hasAward = (item.rounds || []).some(
      (r) =>
        (Array.isArray(r.slots) && r.slots.some(Boolean)) ||
        (Array.isArray(r.tierAwards) && r.tierAwards.some((arr) => Array.isArray(arr) && arr.length > 0)),
    )
    if (!hasAward) continue
    const set = bossesByRaid.get(item.raidId) || new Set<string>()
    if (item.bossName?.trim()) set.add(item.bossName.trim().toLowerCase())
    bossesByRaid.set(item.raidId, set)
  }

  // Also check archived raid events (e.g. if Onyxia was archived with attendees -> 1/1)
  for (const ev of rs.events || []) {
    if (ev.status !== 'ARCHIVED') continue
    const attended = ev.signups.some(
      (s) => s.attendanceOutcome === 'ATTENDED' || s.attendanceFlags?.attended,
    )
    if (!attended) continue
    if (ev.raidId === 'onyxia') {
      const set = bossesByRaid.get('onyxia') || new Set<string>()
      set.add('onyxia')
      bossesByRaid.set('onyxia', set)
    }
  }

  const counts = new Map<string, number>()
  for (const [raidId, set] of bossesByRaid.entries()) {
    counts.set(raidId, set.size)
  }
  return counts
}

export function computeLiveProgressSnapshot(
  store: GuildStore,
  armoryRosterMap?: Map<string, ArmoryGuildRosterMember>,
): GuildProgressTrackerState {
  const prev = store.progressTracker
  const inferredKills = inferKillsFromRaidSystem(store)

  const raids = defaultRaidProgressEntries().map((base) => {
    const prevRaid = prev?.raids?.find((r) => r.raidId === base.raidId)
    const killed = Math.min(
      base.bosses,
      Math.max(prevRaid?.killed || 0, inferredKills.get(base.raidId) || 0),
    )
    return {
      ...base,
      killed,
    }
  })

  // Count Level 60 raiders from live Armory roster (if available) + registered main characters
  let armoryLvl60 = 0
  if (armoryRosterMap && armoryRosterMap.size > 0) {
    for (const m of armoryRosterMap.values()) {
      if (typeof m.level === 'number' && m.level >= 60) {
        armoryLvl60 += 1
      }
    }
  }

  let registeredLvl60Mains = 0
  let onyxiaAttunedMains = 0

  for (const u of store.users || []) {
    const chars = Array.isArray(u.characters) ? (u.characters as StoredCharacter[]) : []
    const main = chars.find((c) => c.isMain) || chars[0]
    if (!main) continue

    const slug =
      main.firstName?.trim() && main.lastName?.trim()
        ? foreverArmorySlug(main.firstName, main.lastName)
        : ''
    const armoryMatch = slug && armoryRosterMap ? armoryRosterMap.get(slug) : undefined
    const effectiveLevel =
      (typeof armoryMatch?.level === 'number' && armoryMatch.level > 0 ? armoryMatch.level : null) ??
      (typeof main.armoryLevel === 'number' && main.armoryLevel > 0 ? main.armoryLevel : null) ??
      (typeof main.level === 'number' ? main.level : 0)

    if (effectiveLevel >= 60) registeredLvl60Mains += 1
    if (main.attunements?.onyxia) onyxiaAttunedMains += 1
  }

  const level60Count =
    armoryRosterMap && armoryRosterMap.size > 0
      ? Math.max(armoryLvl60, registeredLvl60Mains)
      : Math.max(prev?.level60Count || 0, registeredLvl60Mains)

  return {
    lastSyncedAt: prev?.lastSyncedAt || new Date().toISOString(),
    source: prev?.source || 'live',
    scheduleLabel: 'Her Çarşamba 05:00 (TR)',
    raids,
    level60Count,
    level60Target: 40,
    onyxiaAttunedCount: onyxiaAttunedMains,
    onyxiaAttunedTarget: 40,
    totalArmoryMembers:
      armoryRosterMap && armoryRosterMap.size > 0
        ? armoryRosterMap.size
        : prev?.totalArmoryMembers || 0,
    armoryDetectedOnyxiaCount: prev?.armoryDetectedOnyxiaCount || 0,
  }
}

export async function runWeeklyProgressSync(
  loadStore: () => Promise<GuildStore>,
  mutateStore: (fn: (store: GuildStore) => void) => Promise<unknown>,
  source: 'cron' | 'manual',
): Promise<GuildProgressTrackerState> {
  const [initialStore, armoryRosterMap] = await Promise.all([
    loadStore(),
    loadTurxGuildRosterRanks({ bypassCache: true }),
  ])

  // Check Level 60 registered main characters on WoW Armory for Drakefire Amulet (Onyxia attunement)
  const lvl60Lookup: Array<{ firstName: string; lastName: string; wowClass: WowClass }> = []
  for (const u of initialStore.users || []) {
    const chars = Array.isArray(u.characters) ? (u.characters as StoredCharacter[]) : []
    for (const c of chars) {
      const fn = (c.firstName || '').trim()
      const ln = (c.lastName || '').trim()
      if (!fn || !ln) continue
      const match = armoryRosterMap.get(foreverArmorySlug(fn, ln))
      const lvl = match?.level ?? c.armoryLevel ?? c.level ?? 0
      if (lvl >= 55) {
        lvl60Lookup.push({
          firstName: fn,
          lastName: ln,
          wowClass: ((c.wowClass as WowClass) || 'Warrior'),
        })
      }
    }
  }

  const charSnapshots =
    lvl60Lookup.length > 0
      ? await loadArmorySnapshots(lvl60Lookup, { bypassCache: true })
      : new Map()

  let armoryDetectedOnyxiaCount = 0
  let finalState: GuildProgressTrackerState | null = null

  await mutateStore((store) => {
    for (const u of store.users || []) {
      if (!Array.isArray(u.characters)) continue
      for (const raw of u.characters) {
        const c = raw as StoredCharacter
        const fn = (c.firstName || '').trim()
        const ln = (c.lastName || '').trim()
        if (!fn || !ln) continue
        const slug = foreverArmorySlug(fn, ln)
        const rosterMatch = armoryRosterMap.get(slug)
        if (rosterMatch) {
          if (typeof rosterMatch.level === 'number' && rosterMatch.level > 0) {
            c.armoryLevel = rosterMatch.level
          }
          c.armoryRankId = rosterMatch.rankId
        }
        const snap = charSnapshots.get(slug)
        if (snap?.found) {
          if (typeof snap.level === 'number' && snap.level > 0) {
            c.armoryLevel = snap.level
          }
          if (snap.hasDrakefireAmulet) {
            c.attunements = {
              onyxia: true,
              mc: Boolean(c.attunements?.mc),
              bwl: Boolean(c.attunements?.bwl),
              naxx: Boolean(c.attunements?.naxx),
            }
            armoryDetectedOnyxiaCount += 1
          }
        }
      }
    }

    const computed = computeLiveProgressSnapshot(store, armoryRosterMap)
    computed.lastSyncedAt = new Date().toISOString()
    computed.source = source
    computed.armoryDetectedOnyxiaCount = armoryDetectedOnyxiaCount
    store.progressTracker = computed
    finalState = computed
  })

  return finalState || computeLiveProgressSnapshot(initialStore, armoryRosterMap)
}
