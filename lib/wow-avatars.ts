export type WowAvatarCategory = 'Sınıflar' | 'Alliance Irkları' | 'Efsanevi Eşyalar' | 'WoW Efsaneleri'

export type WowAvatar = {
  id: string
  name: string
  category: WowAvatarCategory
  src: string
  description?: string
}

export const WOW_AVATARS: WowAvatar[] = [
  // 1. Sınıflar (9 Adet)
  { id: 'class-warrior', name: 'Savaşçı (Warrior)', category: 'Sınıflar', src: '/images/avatars/class-warrior.jpg', description: 'Klasik Savaşçı simgesi' },
  { id: 'class-paladin', name: 'Kutsal Şövalye (Paladin)', category: 'Sınıflar', src: '/images/avatars/class-paladin.jpg', description: 'Alliance Kutsal Işık muhafızı' },
  { id: 'class-hunter', name: 'Avcı (Hunter)', category: 'Sınıflar', src: '/images/avatars/class-hunter.jpg', description: 'Vahşi doğa ve nişancılık ustası' },
  { id: 'class-rogue', name: 'Düzenbaz (Rogue)', category: 'Sınıflar', src: '/images/avatars/class-rogue.jpg', description: 'Gölgelerin ve zehrin efendisi' },
  { id: 'class-priest', name: 'Rahip (Priest)', category: 'Sınıflar', src: '/images/avatars/class-priest.jpg', description: 'Işık ve gölge dengesi' },
  { id: 'class-shaman', name: 'Şaman (Shaman)', category: 'Sınıflar', src: '/images/avatars/class-shaman.jpg', description: 'Elementlerin kadim gücü' },
  { id: 'class-mage', name: 'Büyücü (Mage)', category: 'Sınıflar', src: '/images/avatars/class-mage.jpg', description: 'Arcane, Fire ve Frost büyücüsü' },
  { id: 'class-warlock', name: 'Kara Büyücü (Warlock)', category: 'Sınıflar', src: '/images/avatars/class-warlock.jpg', description: 'İblisler ve fel alevi' },
  { id: 'class-druid', name: 'Doğa Muhafızı (Druid)', category: 'Sınıflar', src: '/images/avatars/class-druid.jpg', description: 'Şekil değiştiren doğa bekçisi' },

  // 2. Alliance Irkları & Sancak (9 Adet)
  { id: 'alliance-crest', name: 'Alliance Aslan Sancağı', category: 'Alliance Irkları', src: '/images/avatars/alliance-crest.jpg', description: 'Şanlı Alliance arması' },
  { id: 'race-human-m', name: 'İnsan (Erkek)', category: 'Alliance Irkları', src: '/images/avatars/race-human-m.jpg', description: 'Stormwind cesur savaşçısı' },
  { id: 'race-human-f', name: 'İnsan (Kadın)', category: 'Alliance Irkları', src: '/images/avatars/race-human-f.jpg', description: 'Stormwind asil kahramanı' },
  { id: 'race-dwarf-m', name: 'Cüce (Erkek)', category: 'Alliance Irkları', src: '/images/avatars/race-dwarf-m.jpg', description: 'Ironforge dağ muhafızı' },
  { id: 'race-dwarf-f', name: 'Cüce (Kadın)', category: 'Alliance Irkları', src: '/images/avatars/race-dwarf-f.jpg', description: 'Ironforge usta demircisi' },
  { id: 'race-nightelf-m', name: 'Gece Elfi (Erkek)', category: 'Alliance Irkları', src: '/images/avatars/race-nightelf-m.jpg', description: 'Darnassus orman koruyucusu' },
  { id: 'race-nightelf-f', name: 'Gece Elfi (Kadın)', category: 'Alliance Irkları', src: '/images/avatars/race-nightelf-f.jpg', description: 'Elune rahibesi ve okçusu' },
  { id: 'race-gnome-m', name: 'Gnom (Erkek)', category: 'Alliance Irkları', src: '/images/avatars/race-gnome-m.jpg', description: 'Gnomeregan dahi mühendisi' },
  { id: 'race-gnome-f', name: 'Gnom (Kadın)', category: 'Alliance Irkları', src: '/images/avatars/race-gnome-f.jpg', description: 'Gnomeregan kurnaz mucidi' },

  // 3. Efsanevi Eşyalar (6 Adet)
  { id: 'item-thunderfury', name: 'Thunderfury', category: 'Efsanevi Eşyalar', src: '/images/avatars/item-thunderfury.jpg', description: 'Blessed Blade of the Windseeker' },
  { id: 'item-sulfuras', name: 'Sulfuras', category: 'Efsanevi Eşyalar', src: '/images/avatars/item-sulfuras.jpg', description: 'Hand of Ragnaros' },
  { id: 'item-atiesh', name: 'Atiesh', category: 'Efsanevi Eşyalar', src: '/images/avatars/item-atiesh.jpg', description: 'Greatstaff of the Guardian (Medivh)' },
  { id: 'item-warglaive', name: 'Warglaive of Azzinoth', category: 'Efsanevi Eşyalar', src: '/images/avatars/item-warglaive.jpg', description: 'İllidan’ın efsanevi çift bıçağı' },
  { id: 'item-lion-shield', name: 'Aslan Yürekli Kalkan', category: 'Efsanevi Eşyalar', src: '/images/avatars/item-lion-shield.jpg', description: 'Alliance Grand Marshal kalkanı' },
  { id: 'item-iron-helm', name: 'Savaşçı Demir Miğferi', category: 'Efsanevi Eşyalar', src: '/images/avatars/item-iron-helm.jpg', description: 'Ağır zırhlı klasik miğfer' },

  // 4. WoW Efsaneleri & Bosslar (6 Adet)
  { id: 'boss-ragnaros', name: 'Ragnaros the Firelord', category: 'WoW Efsaneleri', src: '/images/avatars/boss-ragnaros.jpg', description: 'Molten Core alev hükümdarı' },
  { id: 'boss-onyxia', name: 'Onyxia', category: 'WoW Efsaneleri', src: '/images/avatars/boss-onyxia.jpg', description: 'Black Dragonflight ejderha kraliçesi' },
  { id: 'boss-nefarian', name: 'Nefarian', category: 'WoW Efsaneleri', src: '/images/avatars/boss-nefarian.jpg', description: 'Blackwing Lair lordu' },
  { id: 'boss-cthun', name: 'C\'Thun', category: 'WoW Efsaneleri', src: '/images/avatars/boss-cthun.jpg', description: 'Ahn\'Qiraj kadim Old God' },
  { id: 'boss-illidan', name: 'Illidan Stormrage', category: 'WoW Efsaneleri', src: '/images/avatars/boss-illidan.jpg', description: 'You Are Not Prepared!' },
  { id: 'boss-lichking', name: 'The Lich King', category: 'WoW Efsaneleri', src: '/images/avatars/boss-lichking.jpg', description: 'Arthas Menethil' },
]

export const WOW_AVATAR_CATEGORIES: WowAvatarCategory[] = [
  'Sınıflar',
  'Alliance Irkları',
  'Efsanevi Eşyalar',
  'WoW Efsaneleri',
]

export function getAvatarSrc(idOrClass?: string | null): string {
  if (!idOrClass) return '/images/avatars/class-warrior.jpg'
  const trimmed = idOrClass.trim()
  if (!trimmed) return '/images/avatars/class-warrior.jpg'

  // Exact ID match
  const found = WOW_AVATARS.find((a) => a.id === trimmed)
  if (found) return found.src

  // Direct class match (e.g. 'Warrior', 'Paladin', 'Druid')
  const classKey = `class-${trimmed.toLowerCase()}`
  const foundClass = WOW_AVATARS.find((a) => a.id === classKey)
  if (foundClass) return foundClass.src

  // Direct image path fallback
  if (trimmed.startsWith('/') || trimmed.startsWith('http')) {
    return trimmed
  }

  return '/images/avatars/class-warrior.jpg'
}

export function getAvatarName(idOrClass?: string | null): string {
  if (!idOrClass) return 'Savaşçı'
  const trimmed = idOrClass.trim()
  const found = WOW_AVATARS.find((a) => a.id === trimmed)
  if (found) return found.name
  const classKey = `class-${trimmed.toLowerCase()}`
  const foundClass = WOW_AVATARS.find((a) => a.id === classKey)
  if (foundClass) return foundClass.name
  return trimmed
}
