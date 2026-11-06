export const LAUNCH_DATE = '2026-11-04T19:00:00+03:00'
export const RAID_DATE = '2026-12-09T21:00:00+03:00'

export type WowClass = 'Warrior' | 'Paladin' | 'Hunter' | 'Rogue' | 'Priest' | 'Shaman' | 'Mage' | 'Warlock' | 'Druid'

export const CLASS_COLORS: Record<WowClass, string> = {
  Warrior: '#C69B6D',
  Paladin: '#F48CBA',
  Hunter: '#AAD372',
  Rogue: '#FFF468',
  Priest: '#FFFFFF',
  Shaman: '#0070DD',
  Mage: '#3FC7EB',
  Warlock: '#8788EE',
  Druid: '#FF7C0A',
}

export type Role = 'Tank' | 'Healer' | 'DPS'
export type Rank = 'Guild Master' | 'Officer' | 'Raider' | 'Social'

export type Member = {
  name: string
  level: number
  race: 'Human' | 'Dwarf' | 'Night Elf' | 'Gnome'
  wowClass: WowClass
  spec: string
  role: Role
  rank: Rank
  attendance: number
  type: 'Main' | 'Alt'
  mainOf?: string
  professions: string[]
  parse: number
  player: string
}

export const MEMBERS: Member[] = []

export type Raid = {
  id: string
  name: string
  size: number
  unlock: string
  time: string
  tanks: number
  healers: number
  dps: number
}

export const RAIDS: Raid[] = [
  { id: 'barrow', name: 'Barrow Deeps', size: 10, unlock: '9 Aralık 2026', time: '21:00', tanks: 2, healers: 2, dps: 6 },
  { id: 'hyjal', name: 'Hyjal Summit', size: 20, unlock: '9 Aralık 2026', time: '21:00', tanks: 3, healers: 5, dps: 12 },
  { id: 'onyxia', name: "Onyxia's Lair", size: 40, unlock: '9 Aralık 2026', time: '21:00', tanks: 4, healers: 10, dps: 26 },
]

export const PHASES = [
  { phase: 'Phase 1', title: 'Barrow Deeps, Hyjal, Onyxia', date: '9 Aralık 2026', status: 'next' as const, items: ['Barrow Deeps (10)', 'Hyjal Summit (20)', "Onyxia's Lair (40)"] },
  { phase: 'Phase 2', title: 'Molten Core & Dire Maul', date: 'Q1 2027', status: 'future' as const, items: ['Molten Core (40)', 'Dire Maul Tribute', 'World Bosses'] },
  { phase: 'Phase 3', title: 'Blackwing Lair', date: 'Q2 2027', status: 'future' as const, items: ['Blackwing Lair (40)', 'Darkmoon Faire', 'Yeni Attunement'] },
  { phase: 'Phase 4', title: "Zul'Gurub & Forever+", date: 'Q3 2027', status: 'future' as const, items: ["Zul'Gurub (20)", 'Forever+ Dungeon', 'Yeni Talent Ağacı'] },
  { phase: 'Phase 5', title: 'Ahn’Qiraj', date: 'Q4 2027', status: 'future' as const, items: ['AQ20 / AQ40', 'Gates Event', 'Kalimdor Ödülleri'] },
]

export const ANNOUNCEMENTS: { author: string; rank: string; time: string; text: string }[] = []

export const STREAMS: { name: string; title: string; viewers: number; live: boolean }[] = []

export const BANK_ITEMS = [
  { name: 'Major Healing Potion', category: 'Potions', qty: 0, max: 200 },
  { name: 'Greater Fire Protection Potion', category: 'Potions', qty: 0, max: 120 },
  { name: 'Flask of the Titans', category: 'Potions', qty: 0, max: 40 },
  { name: 'Elixir of the Mongoose', category: 'Potions', qty: 0, max: 120 },
  { name: 'Arcanite Bar', category: 'Gems', qty: 0, max: 40 },
  { name: 'Large Brilliant Shard', category: 'Gems', qty: 0, max: 100 },
  { name: 'Huge Emerald', category: 'Gems', qty: 0, max: 20 },
  { name: 'Enchant Weapon — Crusader', category: 'Enchants', qty: 0, max: 20 },
  { name: 'Enchant Chest — Greater Stats', category: 'Enchants', qty: 0, max: 30 },
  { name: 'Enchant Weapon — Spell Power', category: 'Enchants', qty: 0, max: 15 },
]

export const CONSUMABLES = [
  { name: 'Flask (Titans / Supreme Power / Distilled Wisdom)', required: true },
  { name: 'Greater Fire Protection Potion (Onyxia)', required: true },
  { name: 'Major Healing / Mana Potion x10', required: true },
  { name: 'Rol uyumlu Elixir (Mongoose / Greater Arcane)', required: true },
  { name: 'Buff Food (Smoked Desert Dumplings / Nightfin Soup)', required: false },
  { name: 'Weapon Oil / Sharpening Stone', required: false },
]

export const BOSS_TACTICS = [
  {
    raid: 'Barrow Deeps',
    boss: 'Thane Korrgrim',
    summary: 'İki tank sırayla Frost Armor stack’ini sıfırlar. Spirit Totem’leri DPS hızlıca indirmeli; 3. totemde raid merkezde toplanır.',
    tips: ['Tank swap: 4 stack', 'Totem önceliği: Spirit > Frost', 'Healer’lar Frost Nova sonrası dispel'],
  },
  {
    raid: 'Hyjal Summit',
    boss: 'Archimonde’un Gölgesi',
    summary: 'Air Burst geldiğinde Tears of the Goddess kullanılır. Doomfire hattından uzak durun; Fear sırasında Tremor yerine Fear Ward rotasyonu.',
    tips: ['Fear Ward rotasyonu: 3 Priest', 'Doomfire: kenara kaçın', 'Burst faz: %25 altı'],
  },
  {
    raid: "Onyxia's Lair",
    boss: 'Onyxia',
    summary: 'Phase 2’de Fireball ve Whelp kontrolü kritik. Phase 3’te Deep Breath için Fire Resistance ve Fear Ward şart.',
    tips: ['Phase 2: Ranged dağınık', 'Whelp’ler: AoE grubu', 'Phase 3: Tank önünde Fear Ward'],
  },
]

export const ATTUNEMENTS = [
  { name: 'Onyxia Attunement (Drakefire Amulet)', done: 0, total: 25 },
  { name: 'Hyjal Summit — Vault Anahtarı', done: 0, total: 25 },
  { name: 'Barrow Deeps — Mührü', done: 0, total: 25 },
]

export const WEAKAURAS = [
  { title: 'TURX Raid Cooldown Tracker', type: 'WeakAura', code: '!WA:2!TURX9xkzVPnUYyFv1Kc2Yk0Barrow+Hyjal+Onyxia_CD_TRACKER_v3.2_ForeverEU' },
  { title: 'Onyxia Deep Breath Uyarısı', type: 'WeakAura', code: '!WA:2!TURXonyBreathAlert9mL0q8RkVa_Phase3_FearWardTimer_v1.4' },
  { title: 'Tank Taunt Macro', type: 'Macro', code: '#showtooltip Taunt\n/cast [@mouseover,harm,nodead][] Taunt\n/raid >> %t Taunt kullanıldı! <<' },
  { title: 'Healer Mana Bildirimi', type: 'Macro', code: '/run local p=UnitPower("player",0)/UnitPowerMax("player",0)*100 SendChatMessage(format("Mana: %%d%%%%",p),"RAID")' },
]

export const ADDONS = [
  { name: 'Deadly Boss Mods (DBM)', required: true },
  { name: 'WeakAuras 2', required: true },
  { name: 'Details! Damage Meter', required: true },
  { name: 'RCLootCouncil Classic', required: true },
  { name: 'Questie', required: false },
  { name: 'AtlasLoot Classic', required: false },
]

export const RECRUITMENT = [
  { wowClass: 'Warrior' as WowClass, specs: [{ spec: 'Protection', need: 'Düşük' }, { spec: 'Fury', need: 'Orta' }] },
  { wowClass: 'Paladin' as WowClass, specs: [{ spec: 'Holy', need: 'Yüksek' }, { spec: 'Retribution', need: 'Kapalı' }] },
  { wowClass: 'Hunter' as WowClass, specs: [{ spec: 'Marksmanship', need: 'Orta' }] },
  { wowClass: 'Rogue' as WowClass, specs: [{ spec: 'Combat', need: 'Düşük' }] },
  { wowClass: 'Priest' as WowClass, specs: [{ spec: 'Holy', need: 'Yüksek' }, { spec: 'Shadow', need: 'Orta' }] },
  { wowClass: 'Shaman' as WowClass, specs: [{ spec: 'Restoration', need: 'Yüksek' }, { spec: 'Enhancement', need: 'Orta' }] },
  { wowClass: 'Mage' as WowClass, specs: [{ spec: 'Frost', need: 'Orta' }, { spec: 'Fire', need: 'Düşük' }] },
  { wowClass: 'Warlock' as WowClass, specs: [{ spec: 'Destruction', need: 'Yüksek' }] },
  { wowClass: 'Druid' as WowClass, specs: [{ spec: 'Restoration', need: 'Yüksek' }, { spec: 'Feral', need: 'Orta' }] },
]

export const ACTIVE_POLL = {
  id: 'phase1-loot',
  question: 'Phase 1 için ana loot sistemimiz ne olsun?',
  endsIn: '2 gün 4 saat',
  options: [
    { id: 'lc', label: 'Loot Council' },
    { id: 'epgp', label: 'EPGP' },
    { id: 'dkp', label: 'DKP' },
    { id: 'hybrid', label: 'Hibrit (LC + Soft Reserve)' },
  ],
}
