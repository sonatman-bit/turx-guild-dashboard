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

export type AttendanceFlags = {
  attended?: boolean
  benchReady?: boolean
  late?: boolean
  missingPrep?: boolean
  excused?: boolean
  noShow?: boolean
}

export type PrepChecklist = {
  onTime15m: boolean
  fullConsumables: boolean
  fullRepair: boolean
  fullSpells: boolean
  bossTactics?: boolean
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
  attendanceFlags?: AttendanceFlags
  pointsBreakdown?: PointBreakdown
  officerNote?: string
}

export type RaidSubRoster = {
  id: string
  name: string
  leader?: string
  color?: string
}

export const ROSTER_COLOR_PRESETS = [
  { id: 'gold', label: 'Altın', hex: '#d4af37' },
  { id: 'neon', label: 'Turkuaz', hex: '#00f2fe' },
  { id: 'emerald', label: 'Zümrüt', hex: '#34d399' },
  { id: 'azure', label: 'Mavi', hex: '#38bdf8' },
  { id: 'violet', label: 'Mor', hex: '#a78bfa' },
  { id: 'rose', label: 'Gül', hex: '#fb7185' },
  { id: 'amber', label: 'Kehribar', hex: '#fbbf24' },
  { id: 'orange', label: 'Turuncu', hex: '#fb923c' },
] as const

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
  benchReadyPoints?: number
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
  bank: boolean
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

export type WowItemQuality = 'legendary' | 'epic' | 'rare' | 'uncommon'

export const WOW_ITEM_QUALITY_COLORS: Record<WowItemQuality, { text: string; border: string; bg: string }> = {
  legendary: { text: '#ff8000', border: '#ff8000', bg: 'rgba(255,128,0,0.14)' },
  epic: { text: '#a335ee', border: '#a335ee', bg: 'rgba(163,53,238,0.14)' },
  rare: { text: '#0070dd', border: '#0070dd', bg: 'rgba(0,112,221,0.14)' },
  uncommon: { text: '#1eff00', border: '#1eff00', bg: 'rgba(30,255,0,0.12)' },
}

export type WowItemTooltipData = {
  quality: WowItemQuality
  itemLevel: number
  bindType?: string
  slotLeft?: string
  slotRight?: string
  damageText?: string
  speedText?: string
  dpsText?: string
  armorText?: string
  blockText?: string
  stats?: string[]
  resistances?: string[]
  requiredLevel?: number
  effects?: string[]
  flavor?: string
  sourceNote?: string
}

export const WOW_ITEM_ICON_PRESETS: { slug: string; label: string }[] = [
  { slug: 'inv_jewelry_talisman_01', label: 'Trinket (Talisman)' },
  { slug: 'inv_misc_root_02', label: 'Trinket (Caster/Healer)' },
  { slug: 'inv_battery_02', label: 'Trinket (Mana/Spirit)' },
  { slug: 'inv_sword_43', label: 'Kılıç (1H Sword)' },
  { slug: 'inv_sword_29', label: 'Çift El Kılıç (2H Sword)' },
  { slug: 'inv_hammer_23', label: 'Gürz (1H Mace)' },
  { slug: 'inv_weapon_shortblade_25', label: 'Hançer (Dagger)' },
  { slug: 'inv_weapon_crossbow_04', label: 'Arbalet / Yay (Ranged)' },
  { slug: 'inv_staff_13', label: 'Asa (Staff)' },
  { slug: 'inv_shield_17', label: 'Kalkan (Ağır/Tank)' },
  { slug: 'inv_shield_20', label: 'Kalkan (Draconian)' },
  { slug: 'inv_helmet_46', label: 'Kask (Head)' },
  { slug: 'inv_shoulder_02', label: 'Omuzluk (Shoulder)' },
  { slug: 'inv_chest_chain_15', label: 'Göğüs Zırhı (Mail/Plate)' },
  { slug: 'inv_chest_cloth_08', label: 'Cübbe (Cloth)' },
  { slug: 'inv_bracer_17', label: 'Bileklik (Wrist)' },
  { slug: 'inv_gauntlets_30', label: 'Eldiven (Hands)' },
  { slug: 'inv_belt_29', label: 'Kemer (Waist)' },
  { slug: 'inv_pants_08', label: 'Pantolon (Legs)' },
  { slug: 'inv_misc_cape_20', label: 'Pelerin (Back)' },
  { slug: 'inv_jewelry_ring_03', label: 'Yüzük (Finger)' },
  { slug: 'inv_jewelry_necklace_01', label: 'Kolye (Neck)' },
]

export function cleanWowIconSlug(slug?: string): string {
  return (slug || 'inv_misc_questionmark').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'inv_misc_questionmark'
}

export function wowItemIconUrl(slug?: string): string {
  return `/api/wow-icon/${cleanWowIconSlug(slug)}`
}

export function wowItemBlizzardFallbackUrl(slug?: string): string {
  return `https://render.worldofwarcraft.com/us/icons/56/${cleanWowIconSlug(slug)}.jpg`
}

export type LootItem = {
  id: string
  phaseId: string
  raidId: string
  bossName: string
  itemName: string
  itemSlot: string
  icon?: string
  tooltip?: WowItemTooltipData
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
      'Deepscar Matriarch',
      'Elder Tangleclaw',
      'Khalith the Dreadspinner',
      'Well of Sorrow',
      'Amethrax',
      "Del'lynar Songwood",
      'Ravus and Darlissa',
      'Sonya Darkhallow',
    ],
  },
  {
    id: 'hyjal',
    name: 'Hyjal Summit',
    size: 20,
    bosses: [
      'Bandalar',
      'Ancient of Decay',
      'Time-Lost Battalion',
      'Sylvestris Dusksong',
      'Old Gloomlurker',
      'Gharalis the Abyssal',
      'Kathris the Haunted',
      'Anara Chillwind',
      'Elder Minderel',
      'Tracker Stillwind',
      'Council of Thorns',
      'Nythus the Dreambound',
      'The Wild King',
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
  raid20: 4,
  raid40: 4,
  signup: 1,
  confirm: 1,
  benchReadyEqual: false,
  benchReadyPoints: 6,
  latePenalty: -2,
  noShowPenalty: -6,
  excusedDeclinePenalty: 0,
  missingPrepPenalty: -2,
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
  // ============ BARROW DEEPS (10-MAN) ============
  {
    id: 'prebis-bd-dreadguard',
    phaseId: 'phase-1',
    raidId: 'barrow',
    bossName: 'Deepscar Matriarch',
    itemName: "Dreadguard's Protector",
    itemSlot: 'Off Hand Shield',
    icon: 'inv_shield_17',
    wowheadUrl: 'https://www.wowhead.com/forever/item=18756/dreadguards-protector',
    unique: false,
    discovered: true,
    tooltip: {
      quality: 'rare',
      itemLevel: 62,
      bindType: 'Binds when picked up',
      slotLeft: 'Off Hand',
      slotRight: 'Shield',
      armorText: '2121 Armor',
      blockText: '39 Block',
      stats: ['+18 Strength', '+5 Stamina'],
      requiredLevel: 57,
    },
    priorityOrder: ['Tank Warrior', 'Tank Paladin', 'Enhancement Shaman'],
    rounds: [{ roundNumber: 1, slots: [null, null, null] }],
  },
  {
    id: 'prebis-bd-truestrike',
    phaseId: 'phase-1',
    raidId: 'barrow',
    bossName: 'Deepscar Matriarch',
    itemName: 'Truestrike Shoulders',
    itemSlot: 'Shoulder (Leather)',
    icon: 'inv_shoulder_02',
    wowheadUrl: 'https://www.wowhead.com/forever/item=12927/truestrike-shoulders',
    unique: false,
    discovered: true,
    tooltip: {
      quality: 'rare',
      itemLevel: 61,
      bindType: 'Binds when picked up',
      slotLeft: 'Shoulder',
      slotRight: 'Leather',
      armorText: '129 Armor',
      requiredLevel: 56,
      effects: [
        'Equip: Improves your chance to hit by 2%.',
        'Equip: +24 Attack Power.',
      ],
    },
    priorityOrder: ['Rogue', 'Feral DPS', 'Fury Warrior', 'Hunter'],
    rounds: [{ roundNumber: 1, slots: [null, null, null, null] }],
  },
  {
    id: 'prebis-bd-whipvine',
    phaseId: 'phase-1',
    raidId: 'barrow',
    bossName: 'Elder Tangleclaw',
    itemName: 'Whipvine Cord',
    itemSlot: 'Waist (Cloth)',
    icon: 'inv_belt_33',
    wowheadUrl: 'https://www.wowhead.com/forever/item=18327/whipvine-cord',
    unique: false,
    discovered: true,
    tooltip: {
      quality: 'rare',
      itemLevel: 59,
      bindType: 'Binds when picked up',
      slotLeft: 'Waist',
      slotRight: 'Cloth',
      armorText: '47 Armor',
      stats: ['+9 Intellect'],
      requiredLevel: 54,
      effects: [
        'Equip: Increases healing done by spells and effects by up to 31.',
        'Equip: Restores 6 mana per 5 sec.',
      ],
    },
    priorityOrder: ['Holy Priest', 'Resto Druid', 'Holy Paladin', 'Resto Shaman'],
    rounds: [{ roundNumber: 1, slots: [null, null, null, null] }],
  },
  {
    id: 'prebis-bd-hoj',
    phaseId: 'phase-1',
    raidId: 'barrow',
    bossName: 'Khalith the Dreadspinner',
    itemName: 'Hand of Justice',
    itemSlot: 'Trinket',
    icon: 'inv_jewelry_talisman_01',
    wowheadUrl: 'https://www.wowhead.com/forever/item=11815/hand-of-justice',
    unique: true,
    discovered: true,
    tooltip: {
      quality: 'rare',
      itemLevel: 58,
      bindType: 'Binds when picked up',
      slotLeft: 'Trinket',
      requiredLevel: 53,
      effects: [
        'Equip: 2% chance on melee hit to gain 1 extra attack.',
        'Equip: +20 Attack Power.',
      ],
    },
    priorityOrder: ['Tank Warrior', 'Rogue', 'Fury Warrior', 'Feral DPS', 'Retribution Paladin'],
    rounds: [{ roundNumber: 1, slots: [null, null, null, null, null] }],
  },
  {
    id: 'prebis-bd-briarwood',
    phaseId: 'phase-1',
    raidId: 'barrow',
    bossName: 'Well of Sorrow',
    itemName: 'Briarwood Reed',
    itemSlot: 'Trinket',
    icon: 'inv_misc_root_02',
    wowheadUrl: 'https://www.wowhead.com/forever/item=12930/briarwood-reed',
    unique: true,
    discovered: true,
    tooltip: {
      quality: 'rare',
      itemLevel: 60,
      bindType: 'Binds when picked up',
      slotLeft: 'Trinket',
      requiredLevel: 55,
      effects: ['Equip: Increases damage and healing done by magical spells and effects by up to 29.'],
    },
    priorityOrder: ['Mage', 'Warlock', 'Holy Priest', 'Shadow Priest', 'Resto Druid'],
    rounds: [{ roundNumber: 1, slots: [null, null, null, null, null] }],
  },
  {
    id: 'prebis-bd-draconian',
    phaseId: 'phase-1',
    raidId: 'barrow',
    bossName: 'Amethrax',
    itemName: 'Draconian Deflector',
    itemSlot: 'Off Hand Shield',
    icon: 'inv_shield_20',
    wowheadUrl: 'https://www.wowhead.com/forever/item=12602/draconian-deflector',
    unique: false,
    discovered: true,
    tooltip: {
      quality: 'rare',
      itemLevel: 63,
      bindType: 'Binds when picked up',
      slotLeft: 'Off Hand',
      slotRight: 'Shield',
      armorText: '2153 Armor',
      blockText: '38 Block',
      stats: ['+7 Stamina'],
      resistances: ['+10 Fire Resistance'],
      requiredLevel: 58,
      effects: ['Equip: Increased Defense +10.'],
    },
    priorityOrder: ['Tank Warrior', 'Tank Paladin'],
    rounds: [{ roundNumber: 1, slots: [null, null] }],
  },
  {
    id: 'prebis-bd-trueaim',
    phaseId: 'phase-1',
    raidId: 'barrow',
    bossName: "Del'lynar Songwood",
    itemName: 'Trueaim Gauntlets',
    itemSlot: 'Hands (Mail)',
    icon: 'inv_gauntlets_30',
    wowheadUrl: 'https://www.wowhead.com/forever/item=13255/trueaim-gauntlets',
    unique: false,
    discovered: true,
    tooltip: {
      quality: 'rare',
      itemLevel: 61,
      bindType: 'Binds when picked up',
      slotLeft: 'Hands',
      slotRight: 'Mail',
      armorText: '225 Armor',
      stats: ['+16 Agility', '+12 Stamina'],
      requiredLevel: 56,
      effects: ['Equip: Increased Bows +8.', 'Equip: Improves your chance to hit by 1%.'],
    },
    priorityOrder: ['Hunter', 'Enhancement Shaman'],
    rounds: [{ roundNumber: 1, slots: [null, null] }],
  },
  {
    id: 'prebis-bd-sublime',
    phaseId: 'phase-1',
    raidId: 'barrow',
    bossName: 'Ravus and Darlissa',
    itemName: 'Sublime Wristguards',
    itemSlot: 'Wrist (Cloth)',
    icon: 'inv_bracer_13',
    wowheadUrl: 'https://www.wowhead.com/forever/item=18497/sublime-wristguards',
    unique: false,
    discovered: true,
    tooltip: {
      quality: 'rare',
      itemLevel: 60,
      bindType: 'Binds when picked up',
      slotLeft: 'Wrist',
      slotRight: 'Cloth',
      armorText: '37 Armor',
      stats: ['+10 Intellect', '+6 Stamina', '+6 Spirit'],
      requiredLevel: 55,
      effects: ['Equip: Increases damage and healing done by magical spells and effects by up to 12.'],
    },
    priorityOrder: ['Mage', 'Warlock', 'Holy Priest', 'Balance Druid', 'Shadow Priest'],
    rounds: [{ roundNumber: 1, slots: [null, null, null, null, null] }],
  },
  {
    id: 'prebis-bd-dalrend-mh',
    phaseId: 'phase-1',
    raidId: 'barrow',
    bossName: 'Sonya Darkhallow',
    itemName: "Dal'Rend's Sacred Charge",
    itemSlot: 'Main Hand Sword',
    icon: 'inv_sword_43',
    wowheadUrl: 'https://www.wowhead.com/forever/item=12940/dalrends-sacred-charge',
    unique: true,
    discovered: true,
    tooltip: {
      quality: 'rare',
      itemLevel: 63,
      bindType: 'Binds when picked up',
      slotLeft: 'Main Hand',
      slotRight: 'Sword',
      damageText: '81 - 151 Damage',
      speedText: 'Speed 2.80',
      dpsText: '(41.4 damage per second)',
      stats: ['+4 Strength'],
      requiredLevel: 58,
      effects: ['Equip: Improves your chance to get a critical strike by 1%.'],
    },
    priorityOrder: ['Rogue', 'Fury Warrior', 'Tank Warrior'],
    rounds: [{ roundNumber: 1, slots: [null, null, null] }],
  },
  {
    id: 'prebis-bd-exalted',
    phaseId: 'phase-1',
    raidId: 'barrow',
    bossName: 'Sonya Darkhallow',
    itemName: 'Robes of the Exalted',
    itemSlot: 'Chest (Cloth)',
    icon: 'inv_chest_cloth_08',
    wowheadUrl: 'https://www.wowhead.com/forever/item=13346/robes-of-the-exalted',
    unique: false,
    discovered: true,
    tooltip: {
      quality: 'rare',
      itemLevel: 63,
      bindType: 'Binds when picked up',
      slotLeft: 'Chest',
      slotRight: 'Cloth',
      armorText: '89 Armor',
      stats: ['+5 Intellect', '+11 Spirit'],
      requiredLevel: 58,
      effects: ['Equip: Increases healing done by spells and effects by up to 62.'],
    },
    priorityOrder: ['Holy Priest', 'Resto Druid', 'Holy Paladin', 'Resto Shaman'],
    rounds: [{ roundNumber: 1, slots: [null, null, null, null] }],
  },

  // ============ HYJAL SUMMIT (20-MAN) ============
  {
    id: 'prebis-hyjal-amplifying',
    phaseId: 'phase-1',
    raidId: 'hyjal',
    bossName: 'Bandalar',
    itemName: 'Amplifying Cloak',
    itemSlot: 'Back (Cloak)',
    icon: 'inv_misc_cape_20',
    wowheadUrl: 'https://www.wowhead.com/forever/item=18350/amplifying-cloak',
    unique: false,
    discovered: true,
    tooltip: {
      quality: 'rare',
      itemLevel: 61,
      bindType: 'Binds when picked up',
      slotLeft: 'Back',
      slotRight: 'Cloth',
      armorText: '43 Armor',
      stats: ['+14 Spirit'],
      requiredLevel: 56,
      effects: ['Equip: Increases damage and healing done by magical spells and effects by up to 15.'],
    },
    priorityOrder: ['Mage', 'Warlock', 'Shadow Priest', 'Balance Druid', 'Elemental Shaman'],
    rounds: [{ roundNumber: 1, slots: [null, null, null, null, null] }],
  },
  {
    id: 'prebis-hyjal-eyerend',
    phaseId: 'phase-1',
    raidId: 'hyjal',
    bossName: 'Ancient of Decay',
    itemName: 'Eye of Rend',
    itemSlot: 'Head (Leather)',
    icon: 'inv_helmet_46',
    wowheadUrl: 'https://www.wowhead.com/forever/item=12587/eye-of-rend',
    unique: false,
    discovered: true,
    tooltip: {
      quality: 'rare',
      itemLevel: 63,
      bindType: 'Binds when picked up',
      slotLeft: 'Head',
      slotRight: 'Leather',
      armorText: '143 Armor',
      stats: ['+13 Strength', '+7 Stamina'],
      requiredLevel: 58,
      effects: ['Equip: Improves your chance to get a critical strike by 2%.'],
    },
    priorityOrder: ['Fury Warrior', 'Rogue', 'Feral DPS', 'Retribution Paladin'],
    rounds: [{ roundNumber: 1, slots: [null, null, null, null] }],
  },
  {
    id: 'prebis-hyjal-battleborn',
    phaseId: 'phase-1',
    raidId: 'hyjal',
    bossName: 'Time-Lost Battalion',
    itemName: 'Battleborn Armbraces',
    itemSlot: 'Wrist (Plate)',
    icon: 'inv_bracer_17',
    wowheadUrl: 'https://www.wowhead.com/forever/item=12936/battleborn-armbraces',
    unique: false,
    discovered: true,
    tooltip: {
      quality: 'rare',
      itemLevel: 63,
      bindType: 'Binds when picked up',
      slotLeft: 'Wrist',
      slotRight: 'Plate',
      armorText: '287 Armor',
      stats: ['+13 Strength'],
      requiredLevel: 58,
      effects: [
        'Equip: Improves your chance to hit by 1%.',
        'Equip: Improves your chance to get a critical strike by 1%.',
      ],
    },
    priorityOrder: ['Fury Warrior', 'Tank Warrior', 'Arms Warrior', 'Retribution Paladin'],
    rounds: [{ roundNumber: 1, slots: [null, null, null, null] }],
  },
  {
    id: 'prebis-hyjal-spellweaver',
    phaseId: 'phase-1',
    raidId: 'hyjal',
    bossName: 'Sylvestris Dusksong',
    itemName: "Spellweaver's Turban",
    itemSlot: 'Head (Cloth)',
    icon: 'inv_helmet_62',
    wowheadUrl: 'https://www.wowhead.com/forever/item=22267/spellweavers-turban',
    unique: false,
    discovered: true,
    tooltip: {
      quality: 'rare',
      itemLevel: 63,
      bindType: 'Binds when picked up',
      slotLeft: 'Head',
      slotRight: 'Cloth',
      armorText: '73 Armor',
      stats: ['+9 Intellect'],
      requiredLevel: 60,
      effects: [
        'Equip: Increases damage and healing done by magical spells and effects by up to 36.',
        'Equip: Improves your chance to hit with spells by 1%.',
      ],
    },
    priorityOrder: ['Mage', 'Warlock', 'Shadow Priest', 'Balance Druid', 'Elemental Shaman'],
    rounds: [{ roundNumber: 1, slots: [null, null, null, null, null] }],
  },
  {
    id: 'prebis-hyjal-blackcrow',
    phaseId: 'phase-1',
    raidId: 'hyjal',
    bossName: 'Old Gloomlurker',
    itemName: 'Blackcrow',
    itemSlot: 'Ranged Crossbow',
    icon: 'inv_weapon_crossbow_04',
    wowheadUrl: 'https://www.wowhead.com/forever/item=12651/blackcrow',
    unique: false,
    discovered: true,
    tooltip: {
      quality: 'rare',
      itemLevel: 59,
      bindType: 'Binds when picked up',
      slotLeft: 'Ranged',
      slotRight: 'Crossbow',
      damageText: '77 - 143 Damage',
      speedText: 'Speed 3.20',
      dpsText: '(34.4 damage per second)',
      stats: ['+3 Agility'],
      requiredLevel: 54,
      effects: ['Equip: Improves your chance to hit by 1%.'],
    },
    priorityOrder: ['Hunter', 'Rogue', 'Fury Warrior'],
    rounds: [{ roundNumber: 1, slots: [null, null, null] }],
  },
  {
    id: 'prebis-hyjal-elvenring',
    phaseId: 'phase-1',
    raidId: 'hyjal',
    bossName: 'Gharalis the Abyssal',
    itemName: 'Tarnished Elven Ring',
    itemSlot: 'Finger',
    icon: 'inv_jewelry_ring_03',
    wowheadUrl: 'https://www.wowhead.com/forever/item=18500/tarnished-elven-ring',
    unique: false,
    discovered: true,
    tooltip: {
      quality: 'rare',
      itemLevel: 61,
      bindType: 'Binds when picked up',
      slotLeft: 'Finger',
      stats: ['+15 Agility'],
      requiredLevel: 56,
      effects: ['Equip: Improves your chance to hit by 1%.'],
    },
    priorityOrder: ['Rogue', 'Hunter', 'Feral DPS', 'Fury Warrior', 'Tank Warrior'],
    rounds: [{ roundNumber: 1, slots: [null, null, null, null, null] }],
  },
  {
    id: 'prebis-hyjal-darkadvisor',
    phaseId: 'phase-1',
    raidId: 'hyjal',
    bossName: 'Kathris the Haunted',
    itemName: "Dark Advisor's Pendant",
    itemSlot: 'Neck',
    icon: 'inv_jewelry_necklace_02',
    wowheadUrl: 'https://www.wowhead.com/forever/item=18691/dark-advisors-pendant',
    unique: false,
    discovered: true,
    tooltip: {
      quality: 'rare',
      itemLevel: 61,
      bindType: 'Binds when picked up',
      slotLeft: 'Neck',
      stats: ['+9 Stamina', '+8 Intellect'],
      requiredLevel: 56,
      effects: ['Equip: Increases damage done by Shadow spells and effects by up to 20.'],
    },
    priorityOrder: ['Warlock', 'Shadow Priest'],
    rounds: [{ roundNumber: 1, slots: [null, null] }],
  },
  {
    id: 'prebis-hyjal-mindtap',
    phaseId: 'phase-1',
    raidId: 'hyjal',
    bossName: 'Anara Chillwind',
    itemName: 'Mindtap Talisman',
    itemSlot: 'Trinket',
    icon: 'inv_battery_02',
    wowheadUrl: 'https://www.wowhead.com/forever/item=18371/mindtap-talisman',
    unique: false,
    discovered: true,
    tooltip: {
      quality: 'rare',
      itemLevel: 61,
      bindType: 'Binds when picked up',
      slotLeft: 'Trinket',
      requiredLevel: 56,
      effects: ['Equip: Restores 11 mana per 5 sec.'],
    },
    priorityOrder: ['Holy Priest', 'Holy Paladin', 'Resto Shaman', 'Resto Druid'],
    rounds: [{ roundNumber: 1, slots: [null, null, null, null] }],
  },
  {
    id: 'prebis-hyjal-ogremagi',
    phaseId: 'phase-1',
    raidId: 'hyjal',
    bossName: 'Council of Thorns',
    itemName: 'Rod of the Ogre Magi',
    itemSlot: 'Two-Hand Staff',
    icon: 'inv_staff_32',
    wowheadUrl: 'https://www.wowhead.com/forever/item=18534/rod-of-the-ogre-magi',
    unique: false,
    discovered: true,
    tooltip: {
      quality: 'rare',
      itemLevel: 63,
      bindType: 'Binds when picked up',
      slotLeft: 'Two-Hand',
      slotRight: 'Staff',
      damageText: '102 - 154 Damage',
      speedText: 'Speed 3.30',
      dpsText: '(38.8 damage per second)',
      stats: ['+14 Intellect', '+11 Stamina', '+7 Spirit'],
      requiredLevel: 58,
      effects: [
        'Equip: Improves your chance to get a critical strike with spells by 1%.',
        'Equip: Increases damage and healing done by magical spells and effects by up to 23.',
      ],
    },
    priorityOrder: ['Mage', 'Warlock', 'Balance Druid', 'Shadow Priest'],
    rounds: [{ roundNumber: 1, slots: [null, null, null, null] }],
  },
  {
    id: 'prebis-hyjal-felstriker',
    phaseId: 'phase-1',
    raidId: 'hyjal',
    bossName: 'The Wild King',
    itemName: 'Felstriker',
    itemSlot: 'One-Hand Dagger',
    icon: 'inv_weapon_shortblade_25',
    wowheadUrl: 'https://www.wowhead.com/forever/item=12590/felstriker',
    unique: false,
    discovered: true,
    tooltip: {
      quality: 'epic',
      itemLevel: 63,
      bindType: 'Binds when picked up',
      slotLeft: 'One-Hand',
      slotRight: 'Dagger',
      damageText: '54 - 101 Damage',
      speedText: 'Speed 1.70',
      dpsText: '(45.6 damage per second)',
      requiredLevel: 58,
      effects: ['Chance on hit: All attacks are guaranteed to land and will be critical strikes for the next 3 sec.'],
    },
    priorityOrder: ['Rogue', 'Fury Warrior', 'Tank Warrior'],
    rounds: [{ roundNumber: 1, slots: [null, null, null] }],
  },

  // ============ ONYXIA'S LAIR (40-MAN) ============
  {
    id: 'prebis-ony-sgc',
    phaseId: 'phase-1',
    raidId: 'onyxia',
    bossName: 'Onyxia',
    itemName: 'Savage Gladiator Chain',
    itemSlot: 'Chest (Mail)',
    icon: 'inv_chest_chain_15',
    wowheadUrl: 'https://www.wowhead.com/forever/item=11726/savage-gladiator-chain',
    unique: false,
    discovered: true,
    tooltip: {
      quality: 'epic',
      itemLevel: 57,
      bindType: 'Binds when picked up',
      slotLeft: 'Chest',
      slotRight: 'Mail',
      armorText: '369 Armor',
      stats: ['+13 Strength', '+14 Agility', '+13 Stamina'],
      requiredLevel: 52,
      effects: ['Equip: Improves your chance to get a critical strike by 2%.'],
    },
    priorityOrder: ['Fury Warrior', 'Enhancement Shaman', 'Hunter', 'Retribution Paladin'],
    rounds: [{ roundNumber: 1, slots: [null, null, null, null] }],
  },
  {
    id: 'prebis-ony-ironfoe',
    phaseId: 'phase-1',
    raidId: 'onyxia',
    bossName: 'Onyxia',
    itemName: 'Ironfoe',
    itemSlot: 'Main Hand Mace',
    icon: 'inv_hammer_23',
    wowheadUrl: 'https://www.wowhead.com/forever/item=11684/ironfoe',
    unique: false,
    discovered: true,
    tooltip: {
      quality: 'epic',
      itemLevel: 60,
      bindType: 'Binds when picked up',
      slotLeft: 'Main Hand',
      slotRight: 'Mace',
      damageText: '73 - 136 Damage',
      speedText: 'Speed 2.40',
      dpsText: '(43.5 damage per second)',
      requiredLevel: 55,
      effects: ['Chance on hit: Grants 2 extra attacks on your next swing.'],
      flavor: '"Speak Dwarvish while wielding the fury of Ironforge."',
    },
    priorityOrder: ['Tank Warrior', 'Fury Warrior', 'Rogue', 'Enhancement Shaman'],
    rounds: [{ roundNumber: 1, slots: [null, null, null, null] }],
  },
  {
    id: 'prebis-ony-shahram',
    phaseId: 'phase-1',
    raidId: 'onyxia',
    bossName: 'Onyxia',
    itemName: 'Blackblade of Shahram',
    itemSlot: 'Two-Hand Sword',
    icon: 'inv_sword_29',
    wowheadUrl: 'https://www.wowhead.com/forever/item=12592/blackblade-of-shahram',
    unique: false,
    discovered: true,
    tooltip: {
      quality: 'epic',
      itemLevel: 63,
      bindType: 'Binds when picked up',
      slotLeft: 'Two-Hand',
      slotRight: 'Sword',
      damageText: '166 - 250 Damage',
      speedText: 'Speed 3.50',
      dpsText: '(59.4 damage per second)',
      requiredLevel: 58,
      effects: ['Chance on hit: Summon the infernal spirit of Shahram.'],
    },
    priorityOrder: ['Arms Warrior', 'Retribution Paladin', 'Fury Warrior'],
    rounds: [{ roundNumber: 1, slots: [null, null, null] }],
  },
  {
    id: 'prebis-ony-headmaster',
    phaseId: 'phase-1',
    raidId: 'onyxia',
    bossName: 'Onyxia',
    itemName: "Headmaster's Charge",
    itemSlot: 'Two-Hand Staff',
    icon: 'inv_staff_13',
    wowheadUrl: 'https://www.wowhead.com/forever/item=13937/headmasters-charge',
    unique: false,
    discovered: true,
    tooltip: {
      quality: 'epic',
      itemLevel: 62,
      bindType: 'Binds when picked up',
      slotLeft: 'Two-Hand',
      slotRight: 'Staff',
      damageText: '114 - 171 Damage',
      speedText: 'Speed 3.20',
      dpsText: '(44.5 damage per second)',
      stats: ['+20 Stamina', '+20 Intellect', '+20 Spirit'],
      requiredLevel: 57,
      effects: ['Use: Gives 20 additional intellect to party members within 30 yards. (10 Min Cooldown)'],
    },
    priorityOrder: ['Mage', 'Warlock', 'Holy Priest', 'Resto Druid', 'Balance Druid'],
    rounds: [{ roundNumber: 1, slots: [null, null, null, null, null] }],
  },
  {
    id: 'prebis-ony-blackbaron',
    phaseId: 'phase-1',
    raidId: 'onyxia',
    bossName: 'Onyxia',
    itemName: 'Cape of the Black Baron',
    itemSlot: 'Back (Cloak)',
    icon: 'inv_misc_cape_20',
    wowheadUrl: 'https://www.wowhead.com/forever/item=13340/cape-of-the-black-baron',
    unique: false,
    discovered: true,
    tooltip: {
      quality: 'rare',
      itemLevel: 63,
      bindType: 'Binds when picked up',
      slotLeft: 'Back',
      slotRight: 'Cloth',
      armorText: '45 Armor',
      stats: ['+15 Agility'],
      requiredLevel: 58,
      effects: ['Equip: +20 Attack Power.'],
    },
    priorityOrder: ['Rogue', 'Hunter', 'Feral DPS', 'Fury Warrior'],
    rounds: [{ roundNumber: 1, slots: [null, null, null, null] }],
  },
  {
    id: 'prebis-ony-banthok',
    phaseId: 'phase-1',
    raidId: 'onyxia',
    bossName: 'Onyxia',
    itemName: "Ban'thok Sash",
    itemSlot: 'Waist (Cloth)',
    icon: 'inv_belt_29',
    wowheadUrl: 'https://www.wowhead.com/forever/item=11662/banthok-sash',
    unique: false,
    discovered: true,
    tooltip: {
      quality: 'rare',
      itemLevel: 59,
      bindType: 'Binds when picked up',
      slotLeft: 'Waist',
      slotRight: 'Cloth',
      armorText: '48 Armor',
      stats: ['+11 Intellect', '+10 Stamina'],
      requiredLevel: 54,
      effects: [
        'Equip: Improves your chance to hit with spells by 1%.',
        'Equip: Increases damage and healing done by magical spells and effects by up to 12.',
      ],
    },
    priorityOrder: ['Mage', 'Warlock', 'Shadow Priest', 'Balance Druid', 'Elemental Shaman'],
    rounds: [{ roundNumber: 1, slots: [null, null, null, null, null] }],
  },
  {
    id: 'prebis-ony-skyshroud',
    phaseId: 'phase-1',
    raidId: 'onyxia',
    bossName: 'Onyxia',
    itemName: 'Skyshroud Leggings',
    itemSlot: 'Legs (Cloth)',
    icon: 'inv_pants_08',
    wowheadUrl: 'https://www.wowhead.com/forever/item=13170/skyshroud-leggings',
    unique: false,
    discovered: true,
    tooltip: {
      quality: 'rare',
      itemLevel: 60,
      bindType: 'Binds when picked up',
      slotLeft: 'Legs',
      slotRight: 'Cloth',
      armorText: '75 Armor',
      stats: ['+8 Stamina', '+8 Intellect'],
      requiredLevel: 55,
      effects: ['Equip: Increases damage and healing done by magical spells and effects by up to 34.'],
    },
    priorityOrder: ['Mage', 'Warlock', 'Shadow Priest', 'Balance Druid'],
    rounds: [{ roundNumber: 1, slots: [null, null, null, null] }],
  },
  {
    id: 'prebis-ony-painweaver',
    phaseId: 'phase-1',
    raidId: 'onyxia',
    bossName: 'Onyxia',
    itemName: 'Painweaver Band',
    itemSlot: 'Finger',
    icon: 'inv_jewelry_ring_18',
    wowheadUrl: 'https://www.wowhead.com/forever/item=13098/painweaver-band',
    unique: true,
    discovered: true,
    tooltip: {
      quality: 'rare',
      itemLevel: 63,
      bindType: 'Binds when picked up',
      slotLeft: 'Finger',
      stats: ['+7 Stamina'],
      requiredLevel: 58,
      effects: [
        'Equip: Improves your chance to get a critical strike by 1%.',
        'Equip: +16 Attack Power.',
      ],
    },
    priorityOrder: ['Fury Warrior', 'Rogue', 'Tank Warrior', 'Hunter', 'Feral DPS'],
    rounds: [{ roundNumber: 1, slots: [null, null, null, null, null] }],
  },
  {
    id: 'prebis-ony-animatedchain',
    phaseId: 'phase-1',
    raidId: 'onyxia',
    bossName: 'Onyxia',
    itemName: 'Animated Chain Necklace',
    itemSlot: 'Neck',
    icon: 'inv_jewelry_necklace_01',
    wowheadUrl: 'https://www.wowhead.com/forever/item=18723/animated-chain-necklace',
    unique: false,
    discovered: true,
    tooltip: {
      quality: 'rare',
      itemLevel: 62,
      bindType: 'Binds when picked up',
      slotLeft: 'Neck',
      stats: ['+7 Stamina', '+6 Spirit'],
      requiredLevel: 57,
      effects: ['Equip: Increases healing done by spells and effects by up to 33.'],
    },
    priorityOrder: ['Holy Priest', 'Holy Paladin', 'Resto Shaman', 'Resto Druid'],
    rounds: [{ roundNumber: 1, slots: [null, null, null, null] }],
  },
  {
    id: 'prebis-ony-dalrend-oh',
    phaseId: 'phase-1',
    raidId: 'onyxia',
    bossName: 'Onyxia',
    itemName: "Dal'Rend's Tribal Guardian",
    itemSlot: 'Off Hand Sword',
    icon: 'inv_sword_40',
    wowheadUrl: 'https://www.wowhead.com/forever/item=12939/dalrends-tribal-guardian',
    unique: true,
    discovered: true,
    tooltip: {
      quality: 'rare',
      itemLevel: 63,
      bindType: 'Binds when picked up',
      slotLeft: 'Off Hand',
      slotRight: 'Sword',
      damageText: '52 - 97 Damage',
      speedText: 'Speed 1.80',
      dpsText: '(41.4 damage per second)',
      armorText: '+100 Armor',
      requiredLevel: 58,
      effects: ['Equip: Increased Defense +7.'],
    },
    priorityOrder: ['Rogue', 'Fury Warrior', 'Tank Warrior'],
    rounds: [{ roundNumber: 1, slots: [null, null, null] }],
  },
]

const LEGACY_STARTER_IDS = new Set([
  // V1 legacy starter items
  'ony-head',
  'ony-deathbringer',
  'ony-viskag',
  'ony-sapphiron-drape',
  'ony-ring-binding',
  'ony-shard-scale',
  'bd-sample-trinket',
  'bd-sample-caster',
  'hyjal-sample-healer',
  // V2 15-item simulation starter items
  'sim-bd-hoj',
  'sim-bd-briarwood',
  'sim-bd-dalrend',
  'sim-bd-trueaim',
  'sim-bd-draconian',
  'sim-hyjal-lionheart',
  'sim-hyjal-archmage',
  'sim-hyjal-truefaith',
  'sim-hyjal-felstriker',
  'sim-hyjal-blackcrow',
  'sim-ony-sgc',
  'sim-ony-ironfoe',
  'sim-ony-banthok',
  'sim-ony-hideofthewild',
  'sim-ony-blackhand',
])

export function cloneStarterLootItems(): LootItem[] {
  return STARTER_LOOT_ITEMS.map((item) => ({
    ...item,
    tooltip: item.tooltip
      ? {
          ...item.tooltip,
          stats: item.tooltip.stats ? [...item.tooltip.stats] : undefined,
          resistances: item.tooltip.resistances ? [...item.tooltip.resistances] : undefined,
          effects: item.tooltip.effects ? [...item.tooltip.effects] : undefined,
        }
      : undefined,
    priorityOrder: [...item.priorityOrder],
    rounds: item.rounds.map((r) => ({ ...r, slots: [...r.slots] })),
  }))
}

function shouldAutoUpgradeLegacySeed(items?: LootItem[]): boolean {
  if (!Array.isArray(items) || items.length === 0) return true
  const allLegacy = items.every((it) => LEGACY_STARTER_IDS.has(it.id))
  if (!allLegacy) return false
  const anyAwarded = items.some((it) =>
    (it.rounds || []).some((r) => (r.slots || []).some((s) => s !== null)),
  )
  return !anyAwarded
}

export function defaultRaidSystemStore(): RaidSystemStore {
  return {
    settings: {
      publicModules: {
        raidSignup: false,
        loot: false,
        attendance: false,
        roadmap: false,
        bank: false,
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
    lootItems: cloneStarterLootItems(),
    boeLogs: [],
    bopRecipes: [],
    adjustments: [],
    roadmapAcks: [],
  }
}

const STARTER_ICON_BY_ID = new Map<string, string>(
  STARTER_LOOT_ITEMS.filter((it) => it.icon).map((it) => [it.id, it.icon!]),
)

const PREVIOUS_PREBIS_ICON_SLUGS = new Set([
  'inv_shield_10',
  'inv_shoulder_01',
  'inv_belt_24',
  'inv_misc_gem_pearl_03',
  'inv_shield_05',
  'inv_gauntlets_10',
  'inv_chest_cloth_31',
  'inv_misc_cape_18',
  'inv_jewelry_ring_13',
  'inv_jewelry_necklace_06',
  'inv_jewelry_talisman_08',
  'inv_hammer_09',
])

function syncStarterIcons(items: LootItem[]): LootItem[] {
  return items.map((item) => {
    const canonical = STARTER_ICON_BY_ID.get(item.id)
    if (canonical && (!item.icon || PREVIOUS_PREBIS_ICON_SLUGS.has(item.icon))) {
      return { ...item, icon: canonical }
    }
    return item
  })
}

export function normalizeRaidSystemStore(raw?: Partial<RaidSystemStore> | null): RaidSystemStore {
  const defaults = defaultRaidSystemStore()
  if (!raw || typeof raw !== 'object') return defaults

  const rawSettings = raw.settings || ({} as Partial<RaidSystemSettings>)
  const rawPr = rawSettings.pointRules
  const isLegacyDefaultPointRules = Boolean(
    rawPr &&
      rawPr.benchReadyPoints === undefined &&
      rawPr.raid10 === 4 &&
      rawPr.raid20 === 6 &&
      rawPr.raid40 === 10 &&
      rawPr.latePenalty === -5 &&
      rawPr.noShowPenalty === -10 &&
      rawPr.missingPrepPenalty === -3,
  )
  const settings: RaidSystemSettings = {
    publicModules: {
      raidSignup: Boolean(rawSettings.publicModules?.raidSignup),
      loot: Boolean(rawSettings.publicModules?.loot),
      attendance: Boolean(rawSettings.publicModules?.attendance),
      roadmap: Boolean(rawSettings.publicModules?.roadmap),
      bank: Boolean(rawSettings.publicModules?.bank),
    },
    activePhaseId: rawSettings.activePhaseId || defaults.settings.activePhaseId,
    pointRules: isLegacyDefaultPointRules
      ? { ...defaults.settings.pointRules }
      : {
          ...defaults.settings.pointRules,
          ...(rawPr || {}),
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
    lootItems: shouldAutoUpgradeLegacySeed(raw.lootItems)
      ? defaults.lootItems
      : syncStarterIcons(raw.lootItems || defaults.lootItems),
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

export function resolveAttendanceFlags(
  signup: Pick<RaidEventSignup, 'attendanceOutcome' | 'attendanceFlags'>,
): AttendanceFlags {
  if (signup.attendanceFlags) return signup.attendanceFlags
  switch (signup.attendanceOutcome) {
    case 'ATTENDED':
      return { attended: true }
    case 'BENCH_READY':
      return { benchReady: true }
    case 'LATE':
      return { attended: true, late: true }
    case 'MISSING_PREP':
      return { attended: true, missingPrep: true }
    case 'EXCUSED':
      return { excused: true }
    case 'NO_SHOW':
      return { noShow: true }
    default:
      return {}
  }
}

export function deriveOutcomeFromFlags(flags: AttendanceFlags): AttendanceOutcome {
  if (flags.noShow) return 'NO_SHOW'
  if (flags.excused) return 'EXCUSED'
  if (flags.benchReady) return 'BENCH_READY'
  if (flags.late) return 'LATE'
  if (flags.missingPrep) return 'MISSING_PREP'
  if (flags.attended) return 'ATTENDED'
  return 'NONE'
}

/**
 * Pure transparent calculation of a signup's points based on rules and outcome/flags.
 */
export function calculateSignupPoints(
  signup: RaidEventSignup,
  size: 10 | 20 | 40,
  rules: PointRules,
): PointBreakdown {
  const base = raidBasePoints(size, rules)

  if (signup.attendanceFlags) {
    const f = signup.attendanceFlags
    if (f.excused) {
      return {
        signup: 0,
        confirm: 0,
        raid: 0,
        penalty: rules.excusedDeclinePenalty,
        total: rules.excusedDeclinePenalty,
      }
    }
    if (f.noShow) {
      return {
        signup: 0,
        confirm: 0,
        raid: 0,
        penalty: rules.noShowPenalty,
        total: rules.noShowPenalty,
      }
    }
    const participated = Boolean(f.attended || f.benchReady || f.late || f.missingPrep)
    if (!participated) {
      return { signup: 0, confirm: 0, raid: 0, penalty: 0, total: 0 }
    }
    const signupPts = rules.signup
    const confirmPts = signup.confirmStatus === 'CONFIRMED' ? rules.confirm : 0
    const raidPts = f.benchReady
      ? typeof rules.benchReadyPoints === 'number'
        ? rules.benchReadyPoints
        : rules.benchReadyEqual
          ? base
          : 0
      : base
    const penalty = (f.late ? rules.latePenalty : 0) + (f.missingPrep ? rules.missingPrepPenalty : 0)
    return {
      signup: signupPts,
      confirm: confirmPts,
      raid: raidPts,
      penalty,
      total: signupPts + confirmPts + raidPts + penalty,
    }
  }

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
    raidPts =
      typeof rules.benchReadyPoints === 'number'
        ? rules.benchReadyPoints
        : rules.benchReadyEqual
          ? base
          : 0
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
  signupCount: number
  confirmCount: number
  raid10Count: number
  raid20Count: number
  raid40Count: number
  benchReadyCount: number
  lateCount: number
  missingPrepCount: number
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
