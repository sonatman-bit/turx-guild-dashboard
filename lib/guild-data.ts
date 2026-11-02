export const LAUNCH_DATE = '2026-11-04T19:00:00+03:00'
export const RAID_DATE = '2026-12-09T21:00:00+03:00'

export type WowClass = 'Warrior' | 'Paladin' | 'Hunter' | 'Rogue' | 'Priest' | 'Mage' | 'Warlock' | 'Druid'

export const CLASS_COLORS: Record<WowClass, string> = {
  Warrior: '#C69B6D',
  Paladin: '#F48CBA',
  Hunter: '#AAD372',
  Rogue: '#FFF468',
  Priest: '#FFFFFF',
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

export const MEMBERS: Member[] = [
  { name: 'Aslanyürek', level: 60, race: 'Human', wowClass: 'Warrior', spec: 'Protection', role: 'Tank', rank: 'Guild Master', attendance: 98, type: 'Main', professions: ['Blacksmithing', 'Mining'], parse: 94, player: 'Kaan' },
  { name: 'Işıkkalkan', level: 60, race: 'Dwarf', wowClass: 'Paladin', spec: 'Holy', role: 'Healer', rank: 'Officer', attendance: 96, type: 'Main', professions: ['Alchemy', 'Herbalism'], parse: 88, player: 'Mert' },
  { name: 'Gölgekesen', level: 60, race: 'Human', wowClass: 'Rogue', spec: 'Combat', role: 'DPS', rank: 'Officer', attendance: 93, type: 'Main', professions: ['Engineering', 'Skinning'], parse: 97, player: 'Emre' },
  { name: 'Ayzehir', level: 60, race: 'Night Elf', wowClass: 'Druid', spec: 'Restoration', role: 'Healer', rank: 'Raider', attendance: 91, type: 'Main', professions: ['Herbalism', 'Alchemy'], parse: 82, player: 'Selin' },
  { name: 'Buzokçu', level: 60, race: 'Gnome', wowClass: 'Mage', spec: 'Frost', role: 'DPS', rank: 'Raider', attendance: 89, type: 'Main', professions: ['Tailoring', 'Enchanting'], parse: 91, player: 'Burak' },
  { name: 'Ruhçağıran', level: 60, race: 'Human', wowClass: 'Warlock', spec: 'Destruction', role: 'DPS', rank: 'Raider', attendance: 87, type: 'Main', professions: ['Tailoring', 'Enchanting'], parse: 86, player: 'Deniz' },
  { name: 'Kartalgöz', level: 60, race: 'Night Elf', wowClass: 'Hunter', spec: 'Marksmanship', role: 'DPS', rank: 'Raider', attendance: 84, type: 'Main', professions: ['Leatherworking', 'Skinning'], parse: 79, player: 'Cem' },
  { name: 'Nurdua', level: 60, race: 'Dwarf', wowClass: 'Priest', spec: 'Holy', role: 'Healer', rank: 'Raider', attendance: 95, type: 'Main', professions: ['Tailoring', 'First Aid'], parse: 90, player: 'Ayşe' },
  { name: 'Demirdağ', level: 60, race: 'Dwarf', wowClass: 'Warrior', spec: 'Fury', role: 'DPS', rank: 'Raider', attendance: 82, type: 'Main', professions: ['Mining', 'Engineering'], parse: 75, player: 'Onur' },
  { name: 'Yıldızoku', level: 58, race: 'Night Elf', wowClass: 'Druid', spec: 'Balance', role: 'DPS', rank: 'Social', attendance: 41, type: 'Main', professions: ['Herbalism', 'Skinning'], parse: 52, player: 'Elif' },
  { name: 'Kanatkırık', level: 60, race: 'Human', wowClass: 'Paladin', spec: 'Retribution', role: 'DPS', rank: 'Raider', attendance: 78, type: 'Main', professions: ['Blacksmithing', 'Mining'], parse: 68, player: 'Tolga' },
  { name: 'Kıvılcım', level: 60, race: 'Gnome', wowClass: 'Mage', spec: 'Fire', role: 'DPS', rank: 'Raider', attendance: 86, type: 'Main', professions: ['Enchanting', 'Tailoring'], parse: 95, player: 'Zeynep' },
  { name: 'Taşbaşlı', level: 60, race: 'Dwarf', wowClass: 'Hunter', spec: 'Beast Mastery', role: 'DPS', rank: 'Social', attendance: 35, type: 'Alt', mainOf: 'Aslanyürek', professions: ['Leatherworking', 'Skinning'], parse: 61, player: 'Kaan' },
  { name: 'Sisperde', level: 52, race: 'Human', wowClass: 'Rogue', spec: 'Subtlety', role: 'DPS', rank: 'Social', attendance: 12, type: 'Alt', mainOf: 'Gölgekesen', professions: ['Alchemy', 'Herbalism'], parse: 44, player: 'Emre' },
  { name: 'Şafakışığı', level: 60, race: 'Human', wowClass: 'Priest', spec: 'Shadow', role: 'DPS', rank: 'Raider', attendance: 80, type: 'Alt', mainOf: 'Işıkkalkan', professions: ['Tailoring', 'Enchanting'], parse: 72, player: 'Mert' },
  { name: 'Kalkanbey', level: 60, race: 'Human', wowClass: 'Warrior', spec: 'Protection', role: 'Tank', rank: 'Officer', attendance: 92, type: 'Main', professions: ['Blacksmithing', 'Mining'], parse: 85, player: 'Arda' },
]

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

export const ANNOUNCEMENTS = [
  { author: 'Aslanyürek', rank: 'Guild Master', time: '2 saat önce', text: 'Launch gecesi 19:00’da Stormwind Trade District’te toplanıyoruz. Leveling grupları Discord’da #leveling kanalında.' },
  { author: 'Işıkkalkan', rank: 'Officer', time: '5 saat önce', text: 'Phase 1 Loot Council kuralları güncellendi. Strateji sekmesinden okumayı unutmayın.' },
  { author: 'Gölgekesen', rank: 'Officer', time: 'Dün', text: 'Onyxia Attunement zinciri için Pazar 20:00’de grup çıkıyoruz. Kayıtlar #attunement kanalında.' },
]

export const STREAMS = [
  { name: 'TurxKaan', title: 'WoW: Forever hazırlık — Talent planlaması', viewers: 1243, live: true },
  { name: 'SelinHeals', title: 'Resto Druid rehberi | Forever Classic+', viewers: 412, live: true },
  { name: 'EmreRogue', title: 'Combat Rogue BIS listesi', viewers: 0, live: false },
]

export const BANK_ITEMS = [
  { name: 'Major Healing Potion', category: 'Potions', qty: 140, max: 200 },
  { name: 'Greater Fire Protection Potion', category: 'Potions', qty: 48, max: 120 },
  { name: 'Flask of the Titans', category: 'Potions', qty: 12, max: 40 },
  { name: 'Elixir of the Mongoose', category: 'Potions', qty: 86, max: 120 },
  { name: 'Arcanite Bar', category: 'Gems', qty: 22, max: 40 },
  { name: 'Large Brilliant Shard', category: 'Gems', qty: 64, max: 100 },
  { name: 'Huge Emerald', category: 'Gems', qty: 7, max: 20 },
  { name: 'Enchant Weapon — Crusader', category: 'Enchants', qty: 9, max: 20 },
  { name: 'Enchant Chest — Greater Stats', category: 'Enchants', qty: 15, max: 30 },
  { name: 'Enchant Weapon — Spell Power', category: 'Enchants', qty: 4, max: 15 },
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
  { name: 'Onyxia Attunement (Drakefire Amulet)', done: 18, total: 25 },
  { name: 'Hyjal Summit — Vault Anahtarı', done: 11, total: 25 },
  { name: 'Barrow Deeps — Mührü', done: 22, total: 25 },
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
  { wowClass: 'Mage' as WowClass, specs: [{ spec: 'Frost', need: 'Orta' }, { spec: 'Fire', need: 'Düşük' }] },
  { wowClass: 'Warlock' as WowClass, specs: [{ spec: 'Destruction', need: 'Yüksek' }] },
  { wowClass: 'Druid' as WowClass, specs: [{ spec: 'Restoration', need: 'Yüksek' }, { spec: 'Feral', need: 'Orta' }] },
]

export const ACTIVE_POLL = {
  question: 'Phase 1 için ana loot sistemimiz ne olsun?',
  endsIn: '2 gün 4 saat',
  options: [
    { id: 'lc', label: 'Loot Council', votes: 42 },
    { id: 'epgp', label: 'EPGP', votes: 31 },
    { id: 'dkp', label: 'DKP', votes: 18 },
    { id: 'hybrid', label: 'Hibrit (LC + Soft Reserve)', votes: 9 },
  ],
}
