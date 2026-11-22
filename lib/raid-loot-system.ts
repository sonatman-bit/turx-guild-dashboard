import { CLASS_COLORS, type WowClass } from './guild-data'

export type RaidRoleType = 'TANK' | 'HEALER' | 'MELEE' | 'RANGED'

export type RaidEventStatus = 'SIGNUP_OPEN' | 'ROSTERS_PUBLISHED' | 'ARCHIVED'

export type ConfirmStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED_EXCUSED' | 'NO_CONFIRM'

export type AttendanceOutcome =
  | 'NONE'
  | 'ATTENDED'
  | 'BENCH_READY'
  | 'LATE'
  | 'MISSING_PREP'
  | 'NO_SHOW'
  | 'EXCUSED'
  | 'BENCH_ABSENT'

export type PrepChecklist = {
  onTime15m: boolean
  fullConsumables: boolean
  fullRepair: boolean
  fullSpells: boolean
}

export type PointBreakdown = {
  signup: number
  confirm: number
  raid: number
  penalty: number
  total: number
}

export type RaidEventSignup = {
  id: string
  username: string
  characterId: string
  characterName: string
  wowClass: WowClass
  spec: string
  role: RaidRoleType
  level: number
  signedAt: string
  /** 'POOL' | 'BENCH' | roster.id */
  assignment: string
  confirmStatus: ConfirmStatus
  confirmedAt?: string
  declinedAt?: string
  declineReason?: string
  prepChecklist?: PrepChecklist
  attendanceOutcome: AttendanceOutcome
  pointsBreakdown?: PointBreakdown
  officerNote?: string
}

export type RaidSubRoster = {
  id: string
  name: string
  leader?: string
}

export type RaidEvent = {
  id: string
  phaseId: string
  raidId: string
  raidName: string
  size: 10 | 20 | 40
  scheduledAt: string
  signupDeadline: string
  confirmDeadline: string
  status: RaidEventStatus
  notes?: string
  rosters: RaidSubRoster[]
  signups: RaidEventSignup[]
  createdBy: string
  createdAt: string
  publishedAt?: string
  publishedBy?: string
  archivedAt?: string
  archivedBy?: string
}

export type RaidPhase = {
  id: string
  name: string
  title: string
  startDate: string
  endDate: string
  raidIds: string[]
  active: boolean
}

export type PointRules = {
  raid10: number
  raid20: number
  raid40: number
  signup: number
  confirm: number
  benchReadyEqual: boolean
  latePenalty: number
  noShowPenalty: number
  excusedDeclinePenalty: number
  missingPrepPenalty: number
}

export type PublicModuleFlags = {
  raidSignup: boolean
  loot: boolean
  attendance: boolean
  roadmap: boolean
}

export type RaiderTargetSlot = {
  id: string
  specLabel: string
  wowClass: WowClass
  role: RaidRoleType
  count: number
}

export type ProfessionLead = {
  profession: string
  primaryChar: string
  primaryClass?: WowClass
  backupChar: string
  backupClass?: WowClass
  notes?: string
}

export type LootSlotAward = {
  characterName: string
  username: string
  wowClass: WowClass
  spec: string
  awardedAt: string
  awardedBy: string
  raidEventId?: string
  note?: string
}

export type LootRound = {
  roundNumber: number
  /** Same length as item.priorityOrder; null means open/waiting */
  slots: (LootSlotAward | null)[]
}

export type LootItem = {
  id: string
  phaseId: string
  raidId: string
  bossName: string
  itemName: string
  itemSlot: string
  unique?: boolean
  notes?: string
  wowheadUrl?: string
  discovered?: boolean
  /** Ordered list of Spec Labels, e.g. ['Tank Warrior', 'Tank Paladin', 'Rogue', 'Fury Warrior', 'Hunter'] */
  priorityOrder: string[]
  rounds: LootRound[]
}

export type BoeLogEntry = {
  id: string
  phaseId: string
  raidId: string
  raidName: string
  itemName: string
  droppedAt: string
  recordedBy: string
  status: 'BANKADA' | 'AH_LISTELENDI' | 'SATILDI'
  goldValue?: number
  note?: string
}

export type BopRecipeDrop = {
  id: string
  phaseId: string
  raidId: string
  raidName: string
  recipeName: string
  profession: string
  recipientName: string
  recipientClass: WowClass
  distributionType: 'MESLEK_SORUMLUSU' | 'MIN_300_ROLL'
  droppedAt: string
  recordedBy: string
  note?: string
}

export type AttendanceAdjustment = {
  id: string
  phaseId: string
  username: string
  characterName: string
  points: number
  reason: string
  createdAt: string
  createdBy: string
}

export type RoadmapAck = {
  username: string
  characterName?: string
  acknowledgedAt: string
}

export type RaidSystemSettings = {
  publicModules: PublicModuleFlags
  activePhaseId: string
  pointRules: PointRules
  roadmapVideoUrl: string
  raiderCutoffDate: string
  raiderTarget40: RaiderTargetSlot[]
  professionLeads: ProfessionLead[]
}

export type RaidSystemStore = {
  settings: RaidSystemSettings
  phases: RaidPhase[]
  events: RaidEvent[]
  lootItems: LootItem[]
  boeLogs: BoeLogEntry[]
  bopRecipes: BopRecipeDrop[]
  adjustments: AttendanceAdjustment[]
  roadmapAcks: RoadmapAck[]
}

/** Spec label → WoW class mapping for consistent class coloring everywhere */
export const SPEC_CLASS_MAP: Record<string, WowClass> = {
  'Tank Warrior': 'Warrior',
  'Protection Warrior': 'Warrior',
  'Fury Warrior': 'Warrior',
  'Arms Warrior': 'Warrior',
  Warrior: 'Warrior',
  'Tank Paladin': 'Paladin',
  'Protection Paladin': 'Paladin',
  'Holy Paladin': 'Paladin',
  'Retribution Paladin': 'Paladin',
  Paladin: 'Paladin',
  'Feral Tank': 'Druid',
  'Feral DPS': 'Druid',
  'Balance Druid': 'Druid',
  'Resto Druid': 'Druid',
  Druid: 'Druid',
  Rogue: 'Rogue',
  'Combat Rogue': 'Rogue',
  'Assassination Rogue': 'Rogue',
  Hunter: 'Hunter',
  'Marksmanship Hunter': 'Hunter',
  'Beast Mastery Hunter': 'Hunter',
  'Survival Hunter': 'Hunter',
  Mage: 'Mage',
  'Fire Mage': 'Mage',
  'Frost Mage': 'Mage',
  'Arcane Mage': 'Mage',
  Warlock: 'Warlock',
  'Destruction Warlock': 'Warlock',
  'Affliction Warlock': 'Warlock',
  'Demonology Warlock': 'Warlock',
  'Holy Priest': 'Priest',
  'Discipline Priest': 'Priest',
  'Shadow Priest': 'Priest',
  Priest: 'Priest',
  'Resto Shaman': 'Shaman',
  'Enhancement Shaman': 'Shaman',
  'Elemental Shaman': 'Shaman',
  Shaman: 'Shaman',
}

export const ALL_SPEC_LABELS = [
  'Tank Warrior',
  'Tank Paladin',
  'Feral Tank',
  'Fury Warrior',
  'Arms Warrior',
  'Rogue',
  'Feral DPS',
  'Retribution Paladin',
  'Enhancement Shaman',
  'Hunter',
  'Mage',
  'Warlock',
  'Shadow Priest',
  'Balance Druid',
  'Elemental Shaman',
  'Holy Priest',
  'Holy Paladin',
  'Resto Druid',
  'Resto Shaman',
] as const

export function getSpecWowClass(specLabel: string): WowClass {
  if (SPEC_CLASS_MAP[specLabel]) return SPEC_CLASS_MAP[specLabel]
  const lower = specLabel.toLowerCase()
  if (lower.includes('warrior')) return 'Warrior'
  if (lower.includes('paladin')) return 'Paladin'
  if (lower.includes('druid') || lower.includes('feral') || lower.includes('balance')) return 'Druid'
  if (lower.includes('rogue')) return 'Rogue'
  if (lower.includes('hunter')) return 'Hunter'
  if (lower.includes('mage')) return 'Mage'
  if (lower.includes('warlock')) return 'Warlock'
  if (lower.includes('priest')) return 'Priest'
  if (lower.includes('shaman')) return 'Shaman'
  return 'Warrior'
}

export function getSpecColor(specLabel: string): string {
  return CLASS_COLORS[getSpecWowClass(specLabel)] || '#e2e8f0'
}

export const LOOT_PRIORITY_PRESETS: { id: string; label: string; order: string[] }[] = [
  {
    id: 'phys-trinket',
    label: 'Physical Trinket / Ring (Tank > Melee > Hunter)',
    order: ['Tank Warrior', 'Tank Paladin', 'Rogue', 'Fury Warrior', 'Hunter'],
  },
  {
    id: 'tank-mitigation',
    label: 'Tank Savunma / Kalkan (War > Pal > Feral)',
    order: ['Tank Warrior', 'Tank Paladin', 'Feral Tank'],
  },
  {
    id: 'melee-dps-leather',
    label: 'Melee DPS Deri / Agi (Rogue > Feral > Fury > Hunter)',
    order: ['Rogue', 'Feral DPS', 'Fury Warrior', 'Hunter'],
  },
  {
    id: 'melee-dps-plate',
    label: 'Melee DPS Plate / Str (Fury > Tank War > Ret > Arms)',
    order: ['Fury Warrior', 'Tank Warrior', 'Retribution Paladin', 'Arms Warrior'],
  },
  {
    id: 'caster-dps',
    label: 'Caster DPS (Mage > Warlock > Shadow > Balance > Ele)',
    order: ['Mage', 'Warlock', 'Shadow Priest', 'Balance Druid', 'Elemental Shaman'],
  },
  {
    id: 'healer-all',
    label: 'Healer Genel (Priest > Paladin > Shaman > Druid)',
    order: ['Holy Priest', 'Holy Paladin', 'Resto Shaman', 'Resto Druid'],
  },
  {
    id: 'hunter-ranged',
    label: 'Ranged / Hunter Silahı (Hunter > Rogue > Fury)',
    order: ['Hunter', 'Rogue', 'Fury Warrior'],
  },
]

export const RAID_CATALOG: {
  id: string
  name: string
  size: 10 | 20 | 40
  bosses: string[]
}[] = [
  {
    id: 'barrow',
    name: 'Barrow Deeps',
    size: 10,
    bosses: [
      'Boss 1 — Barrow Guardian',
      'Boss 2 — Thane Korrgrim',
      'Boss 3 — Whispering Warden',
      'Boss 4 — Rootbound Colossus',
      'Boss 5 — Caverns Matriarch',
      'Boss 6 — Shadowed Keeper',
      'Boss 7 — Prison Overseer',
      'Boss 8 — Deep Sanctum Final',
    ],
  },
  {
    id: 'hyjal',
    name: 'Hyjal Summit',
    size: 20,
    bosses: [
      'Boss 1 — Nordrassil Outer Gate',
      'Boss 2 — Timbermaw Vanguard',
      'Boss 3 — Felwood Ravager',
      'Boss 4 — Ashwood Sentinel',
      'Boss 5 — Infernal Siegebreaker',
      'Boss 6 — Dreadlord Tactician',
      'Boss 7 — Grove Defiler',
      'Boss 8 — Doomguard Commander',
      'Boss 9 — Corrupted Ancient',
      'Boss 10 — Twilight Harbinger',
      'Boss 11 — Archimonde Vanguard',
      'Boss 12 — World Tree Warden',
      'Boss 13 — Summit Final Boss',
    ],
  },
  {
    id: 'onyxia',
    name: "Onyxia's Lair",
    size: 40,
    bosses: ['Onyxia'],
  },
]

export const DEFAULT_POINT_RULES: PointRules = {
  raid10: 4,
  raid20: 6,
  raid40: 10,
  signup: 1,
  confirm: 1,
  benchReadyEqual: true,
  latePenalty: -5,
  noShowPenalty: -10,
  excusedDeclinePenalty: 0,
  missingPrepPenalty: -3,
}

export const DEFAULT_RAIDER_TARGET_40: RaiderTargetSlot[] = [
  { id: 't-war', specLabel: 'Tank Warrior', wowClass: 'Warrior', role: 'TANK', count: 2 },
  { id: 't-pal', specLabel: 'Tank Paladin', wowClass: 'Paladin', role: 'TANK', count: 1 },
  { id: 't-dru', specLabel: 'Feral Tank', wowClass: 'Druid', role: 'TANK', count: 1 },
  { id: 'd-fury', specLabel: 'Fury Warrior', wowClass: 'Warrior', role: 'MELEE', count: 5 },
  { id: 'd-rog', specLabel: 'Rogue', wowClass: 'Rogue', role: 'MELEE', count: 5 },
  { id: 'd-ret', specLabel: 'Retribution Paladin', wowClass: 'Paladin', role: 'MELEE', count: 1 },
  { id: 'd-enh', specLabel: 'Enhancement Shaman', wowClass: 'Shaman', role: 'MELEE', count: 1 },
  { id: 'd-hun', specLabel: 'Hunter', wowClass: 'Hunter', role: 'RANGED', count: 4 },
  { id: 'd-mag', specLabel: 'Mage', wowClass: 'Mage', role: 'RANGED', count: 5 },
  { id: 'd-wl', specLabel: 'Warlock', wowClass: 'Warlock', role: 'RANGED', count: 4 },
  { id: 'd-sp', specLabel: 'Shadow Priest', wowClass: 'Priest', role: 'RANGED', count: 1 },
  { id: 'h-pri', specLabel: 'Holy Priest', wowClass: 'Priest', role: 'HEALER', count: 4 },
  { id: 'h-pal', specLabel: 'Holy Paladin', wowClass: 'Paladin', role: 'HEALER', count: 3 },
  { id: 'h-sha', specLabel: 'Resto Shaman', wowClass: 'Shaman', role: 'HEALER', count: 2 },
  { id: 'h-dru', specLabel: 'Resto Druid', wowClass: 'Druid', role: 'HEALER', count: 1 },
]

export const DEFAULT_PROFESSION_LEADS: ProfessionLead[] = [
  { profession: 'Alchemy', primaryChar: '', backupChar: '', notes: 'Flask & Raid Potion tarifleri' },
  { profession: 'Blacksmithing', primaryChar: '', backupChar: '', notes: 'Tank / Plate & Silah tarifleri' },
  { profession: 'Enchanting', primaryChar: '', backupChar: '', notes: 'Crusader, Spell Power, Healing, Stats' },
  { profession: 'Engineering', primaryChar: '', backupChar: '', notes: 'Repair Bot & Raid mühendislik' },
  { profession: 'Leatherworking', primaryChar: '', backupChar: '', notes: 'Deri / Mail & Direnç setleri' },
  { profession: 'Tailoring', primaryChar: '', backupChar: '', notes: 'Caster & Healer Cloth tarifleri' },
]

export const DEFAULT_PHASES: RaidPhase[] = [
  {
    id: 'phase-1',
    name: 'Phase 1',
    title: 'Barrow Deeps, Hyjal Summit & Onyxia',
    startDate: '2026-12-09',
    endDate: '2027-03-09',
    raidIds: ['barrow', 'hyjal', 'onyxia'],
    active: true,
  },
  {
    id: 'phase-2',
    name: 'Phase 2',
    title: 'Molten Core & Dire Maul',
    startDate: '2027-03-10',
    endDate: '2027-06-09',
    raidIds: ['molten-core'],
    active: false,
  },
  {
    id: 'phase-3',
    name: 'Phase 3',
    title: 'Blackwing Lair',
    startDate: '2027-06-10',
    endDate: '2027-09-09',
    raidIds: ['bwl'],
    active: false,
  },
]

export const STARTER_LOOT_ITEMS: LootItem[] = [
  // Onyxia's Lair (classic known drops, editable for WoW Forever adjustments)
  {
    id: 'ony-head',
    phaseId: 'phase-1',
    raidId: 'onyxia',
    bossName: 'Onyxia',
    itemName: 'Head of Onyxia (Dragonstalker / Onyxia Tooth Pendant)',
    itemSlot: 'Quest / Neck-Ring-Trinket',
    unique: true,
    discovered: true,
    notes: 'Quest ödülü: Tank ve Melee BiS. WoW Forever değişikliklerine göre güncellenebilir.',
    priorityOrder: ['Tank Warrior', 'Tank Paladin', 'Rogue', 'Fury Warrior', 'Hunter'],
    rounds: [{ roundNumber: 1, slots: [null, null, null, null, null] }],
  },
  {
    id: 'ony-deathbringer',
    phaseId: 'phase-1',
    raidId: 'onyxia',
    bossName: 'Onyxia',
    itemName: 'Deathbringer',
    itemSlot: 'One-Hand Axe',
    unique: false,
    discovered: true,
    notes: '1H Fiziksel DPS silahı',
    priorityOrder: ['Fury Warrior', 'Tank Warrior', 'Enhancement Shaman'],
    rounds: [{ roundNumber: 1, slots: [null, null, null] }],
  },
  {
    id: 'ony-viskag',
    phaseId: 'phase-1',
    raidId: 'onyxia',
    bossName: 'Onyxia',
    itemName: "Vis'kag the Bloodletter",
    itemSlot: 'One-Hand Sword',
    unique: false,
    discovered: true,
    priorityOrder: ['Rogue', 'Fury Warrior', 'Tank Warrior'],
    rounds: [{ roundNumber: 1, slots: [null, null, null] }],
  },
  {
    id: 'ony-sapphiron-drape',
    phaseId: 'phase-1',
    raidId: 'onyxia',
    bossName: 'Onyxia',
    itemName: 'Sapphiron Drape',
    itemSlot: 'Back (Caster)',
    unique: true,
    discovered: true,
    priorityOrder: ['Mage', 'Warlock', 'Shadow Priest', 'Balance Druid', 'Elemental Shaman'],
    rounds: [{ roundNumber: 1, slots: [null, null, null, null, null] }],
  },
  {
    id: 'ony-ring-binding',
    phaseId: 'phase-1',
    raidId: 'onyxia',
    bossName: 'Onyxia',
    itemName: 'Ring of Binding',
    itemSlot: 'Finger (Tank / FR)',
    unique: true,
    discovered: true,
    priorityOrder: ['Tank Warrior', 'Tank Paladin', 'Feral Tank'],
    rounds: [{ roundNumber: 1, slots: [null, null, null] }],
  },
  {
    id: 'ony-shard-scale',
    phaseId: 'phase-1',
    raidId: 'onyxia',
    bossName: 'Onyxia',
    itemName: 'Shard of the Scale',
    itemSlot: 'Trinket (Healer)',
    unique: true,
    discovered: true,
    priorityOrder: ['Holy Priest', 'Holy Paladin', 'Resto Shaman', 'Resto Druid'],
    rounds: [{ roundNumber: 1, slots: [null, null, null, null] }],
  },
  // Barrow Deeps (WoW Forever live-discovery template entries for beta testing)
  {
    id: 'bd-sample-trinket',
    phaseId: 'phase-1',
    raidId: 'barrow',
    bossName: 'Boss 2 — Thane Korrgrim',
    itemName: 'Barrow Deeps Physical Trinket (Canlı Keşif Şablonu)',
    itemSlot: 'Trinket',
    unique: true,
    discovered: false,
    notes: 'WoW Forever 9 Aralık açılışında gerçek drop düştüğünde ismini ve bossunu düzenleyebilirsiniz.',
    priorityOrder: ['Tank Warrior', 'Tank Paladin', 'Rogue', 'Fury Warrior', 'Hunter'],
    rounds: [{ roundNumber: 1, slots: [null, null, null, null, null] }],
  },
  {
    id: 'bd-sample-caster',
    phaseId: 'phase-1',
    raidId: 'barrow',
    bossName: 'Boss 8 — Deep Sanctum Final',
    itemName: 'Barrow Deeps Caster Weapon (Canlı Keşif Şablonu)',
    itemSlot: 'Main Hand / Staff',
    unique: true,
    discovered: false,
    notes: '9 Aralık sonrası gerçek drop adı ile güncelleyin.',
    priorityOrder: ['Mage', 'Warlock', 'Shadow Priest', 'Balance Druid', 'Elemental Shaman'],
    rounds: [{ roundNumber: 1, slots: [null, null, null, null, null] }],
  },
  // Hyjal Summit (WoW Forever live-discovery template entries for beta testing)
  {
    id: 'hyjal-sample-healer',
    phaseId: 'phase-1',
    raidId: 'hyjal',
    bossName: 'Boss 13 — Summit Final Boss',
    itemName: 'Nordrassil Healer Trinket (Canlı Keşif Şablonu)',
    itemSlot: 'Trinket',
    unique: true,
    discovered: false,
    notes: 'WoW Forever 9 Aralık açılışında gerçek drop düştüğünde düzenleyin.',
    priorityOrder: ['Holy Priest', 'Holy Paladin', 'Resto Shaman', 'Resto Druid'],
    rounds: [{ roundNumber: 1, slots: [null, null, null, null] }],
  },
]

export function defaultRaidSystemStore(): RaidSystemStore {
  return {
    settings: {
      publicModules: {
        raidSignup: false,
        loot: false,
        attendance: false,
        roadmap: false,
      },
      activePhaseId: 'phase-1',
      pointRules: { ...DEFAULT_POINT_RULES },
      roadmapVideoUrl: '',
      raiderCutoffDate: '2027-01-01',
      raiderTarget40: DEFAULT_RAIDER_TARGET_40.map((s) => ({ ...s })),
      professionLeads: DEFAULT_PROFESSION_LEADS.map((p) => ({ ...p })),
    },
    phases: DEFAULT_PHASES.map((p) => ({ ...p, raidIds: [...p.raidIds] })),
    events: [],
    lootItems: STARTER_LOOT_ITEMS.map((item) => ({
      ...item,
      priorityOrder: [...item.priorityOrder],
      rounds: item.rounds.map((r) => ({ ...r, slots: [...r.slots] })),
    })),
    boeLogs: [],
    bopRecipes: [],
    adjustments: [],
    roadmapAcks: [],
  }
}

export function normalizeRaidSystemStore(raw?: Partial<RaidSystemStore> | null): RaidSystemStore {
  const defaults = defaultRaidSystemStore()
  if (!raw || typeof raw !== 'object') return defaults

  const rawSettings = raw.settings || ({} as Partial<RaidSystemSettings>)
  const settings: RaidSystemSettings = {
    publicModules: {
      raidSignup: Boolean(rawSettings.publicModules?.raidSignup),
      loot: Boolean(rawSettings.publicModules?.loot),
      attendance: Boolean(rawSettings.publicModules?.attendance),
      roadmap: Boolean(rawSettings.publicModules?.roadmap),
    },
    activePhaseId: rawSettings.activePhaseId || defaults.settings.activePhaseId,
    pointRules: {
      ...defaults.settings.pointRules,
      ...(rawSettings.pointRules || {}),
    },
    roadmapVideoUrl: typeof rawSettings.roadmapVideoUrl === 'string' ? rawSettings.roadmapVideoUrl : '',
    raiderCutoffDate: rawSettings.raiderCutoffDate || defaults.settings.raiderCutoffDate,
    raiderTarget40:
      Array.isArray(rawSettings.raiderTarget40) && rawSettings.raiderTarget40.length > 0
        ? rawSettings.raiderTarget40
        : defaults.settings.raiderTarget40,
    professionLeads:
      Array.isArray(rawSettings.professionLeads) && rawSettings.professionLeads.length > 0
        ? rawSettings.professionLeads
        : defaults.settings.professionLeads,
  }

  return {
    settings,
    phases: Array.isArray(raw.phases) && raw.phases.length > 0 ? raw.phases : defaults.phases,
    events: Array.isArray(raw.events) ? raw.events : [],
    lootItems: Array.isArray(raw.lootItems) && raw.lootItems.length > 0 ? raw.lootItems : defaults.lootItems,
    boeLogs: Array.isArray(raw.boeLogs) ? raw.boeLogs : [],
    bopRecipes: Array.isArray(raw.bopRecipes) ? raw.bopRecipes : [],
    adjustments: Array.isArray(raw.adjustments) ? raw.adjustments : [],
    roadmapAcks: Array.isArray(raw.roadmapAcks) ? raw.roadmapAcks : [],
  }
}

export function raidBasePoints(size: 10 | 20 | 40, rules: PointRules): number {
  if (size === 40) return rules.raid40
  if (size === 20) return rules.raid20
  return rules.raid10
}

/**
 * Pure transparent calculation of a signup's points based on rules and outcome.
 */
export function calculateSignupPoints(
  signup: RaidEventSignup,
  size: 10 | 20 | 40,
  rules: PointRules,
): PointBreakdown {
  const base = raidBasePoints(size, rules)
  const outcome = signup.attendanceOutcome

  if (outcome === 'NONE') {
    return { signup: 0, confirm: 0, raid: 0, penalty: 0, total: 0 }
  }

  // Excused decline before deadline -> 0 penalty, signup point voided
  if (outcome === 'EXCUSED') {
    return {
      signup: 0,
      confirm: 0,
      raid: 0,
      penalty: rules.excusedDeclinePenalty,
      total: rules.excusedDeclinePenalty,
    }
  }

  // Unexcused no-show -> -10 penalty, no raid/signup bonus
  if (outcome === 'NO_SHOW') {
    return {
      signup: 0,
      confirm: 0,
      raid: 0,
      penalty: rules.noShowPenalty,
      total: rules.noShowPenalty,
    }
  }

  // Bench who was NOT ready/available -> only signup (+ confirm if given), no raid points
  if (outcome === 'BENCH_ABSENT') {
    const signupPts = rules.signup
    const confirmPts = signup.confirmStatus === 'CONFIRMED' ? rules.confirm : 0
    return {
      signup: signupPts,
      confirm: confirmPts,
      raid: 0,
      penalty: 0,
      total: signupPts + confirmPts,
    }
  }

  const signupPts = rules.signup
  const confirmPts = signup.confirmStatus === 'CONFIRMED' ? rules.confirm : 0
  let raidPts = base
  let penalty = 0

  if (outcome === 'BENCH_READY') {
    raidPts = rules.benchReadyEqual ? base : 0
  } else if (outcome === 'LATE') {
    penalty = rules.latePenalty
  } else if (outcome === 'MISSING_PREP') {
    penalty = rules.missingPrepPenalty
  }

  return {
    signup: signupPts,
    confirm: confirmPts,
    raid: raidPts,
    penalty,
    total: signupPts + confirmPts + raidPts + penalty,
  }
}

/**
 * Finds the current active round and the first open (waiting) slot index for a loot item.
 * If all slots in the latest round are filled, returns a virtual next round index so UI knows it wraps.
 */
export function getActiveLootRoundState(item: LootItem): {
  roundIndex: number
  roundNumber: number
  openSlotIndices: number[]
  primarySlotIndex: number
  allFilledInLatest: boolean
} {
  if (!item.rounds || item.rounds.length === 0) {
    return {
      roundIndex: 0,
      roundNumber: 1,
      openSlotIndices: item.priorityOrder.map((_, idx) => idx),
      primarySlotIndex: 0,
      allFilledInLatest: false,
    }
  }

  const lastIdx = item.rounds.length - 1
  const lastRound = item.rounds[lastIdx]
  const openSlotIndices: number[] = []
  for (let i = 0; i < item.priorityOrder.length; i += 1) {
    if (!lastRound.slots[i]) openSlotIndices.push(i)
  }

  if (openSlotIndices.length === 0) {
    return {
      roundIndex: lastIdx + 1,
      roundNumber: lastRound.roundNumber + 1,
      openSlotIndices: item.priorityOrder.map((_, idx) => idx),
      primarySlotIndex: 0,
      allFilledInLatest: true,
    }
  }

  return {
    roundIndex: lastIdx,
    roundNumber: lastRound.roundNumber,
    openSlotIndices,
    primarySlotIndex: openSlotIndices[0],
    allFilledInLatest: false,
  }
}

/** Check if a character already received this loot item in any previous round */
export function hasCharacterReceivedItem(item: LootItem, username: string, characterName: string): boolean {
  const uLower = username.toLowerCase()
  const cLower = characterName.toLowerCase()
  for (const round of item.rounds || []) {
    for (const slot of round.slots || []) {
      if (!slot) continue
      if (slot.username.toLowerCase() === uLower || slot.characterName.toLowerCase() === cLower) {
        return true
      }
    }
  }
  return false
}

/** Match whether a character's class/spec fits a priority spec label (e.g. "Tank Warrior") */
export function characterMatchesSpecLabel(
  char: { wowClass: string; spec: string; role?: string },
  specLabel: string,
): boolean {
  const targetClass = getSpecWowClass(specLabel)
  if (char.wowClass.toLowerCase() !== targetClass.toLowerCase()) return false

  const labelLower = specLabel.toLowerCase()
  const specLower = (char.spec || '').toLowerCase()
  const roleLower = (char.role || '').toLowerCase()

  // Pure class labels like "Rogue", "Hunter", "Mage", "Warlock" match any spec of that class
  if (labelLower === targetClass.toLowerCase()) return true

  if (labelLower.includes('tank')) {
    return roleLower === 'tank' || specLower.includes('prot') || specLower.includes('tank') || specLower.includes('feral')
  }
  if (labelLower.includes('holy') || labelLower.includes('resto') || labelLower.includes('disc')) {
    return roleLower === 'healer' || specLower.includes('holy') || specLower.includes('resto') || specLower.includes('disc')
  }
  if (labelLower.includes('fury')) return specLower.includes('fury') || (roleLower === 'melee' && !specLower.includes('arms'))
  if (labelLower.includes('arms')) return specLower.includes('arms')
  if (labelLower.includes('ret')) return specLower.includes('ret') || roleLower === 'melee'
  if (labelLower.includes('shadow')) return specLower.includes('shadow') || roleLower === 'ranged'
  if (labelLower.includes('balance')) return specLower.includes('bal') || specLower.includes('boom') || roleLower === 'ranged'
  if (labelLower.includes('feral dps')) return specLower.includes('feral') && roleLower !== 'tank'
  if (labelLower.includes('enhancement')) return specLower.includes('enh') || roleLower === 'melee'
  if (labelLower.includes('elemental')) return specLower.includes('ele') || roleLower === 'ranged'

  return true
}

export type MemberAttendanceRow = {
  username: string
  characterName: string
  wowClass: WowClass
  spec: string
  role: RaidRoleType
  level: number
  guildRank: string
  totalPoints: number
  raid10Count: number
  raid20Count: number
  raid40Count: number
  benchReadyCount: number
  lateCount: number
  noShowCount: number
  excusedCount: number
  totalPenalties: number
  history: {
    eventId: string
    date: string
    raidName: string
    size: 10 | 20 | 40
    outcome: AttendanceOutcome
    breakdown: PointBreakdown
    note?: string
  }[]
  adjustments: AttendanceAdjustment[]
}

export function formatCountdown(targetIso: string, nowMs: number): {
  expired: boolean
  label: string
  urgent: boolean
} {
  const diff = new Date(targetIso).getTime() - nowMs
  if (!Number.isFinite(diff) || diff <= 0) {
    return { expired: true, label: 'Süre Doldu', urgent: false }
  }
  const totalSec = Math.floor(diff / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60

  const parts: string[] = []
  if (days > 0) parts.push(`${days}g`)
  parts.push(`${String(hours).padStart(2, '0')}s`)
  parts.push(`${String(mins).padStart(2, '0')}dk`)
  if (days === 0) parts.push(`${String(secs).padStart(2, '0')}sn`)

  return {
    expired: false,
    label: parts.join(' '),
    urgent: diff < 24 * 3600 * 1000,
  }
}

export function formatTrDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}
