'use client'

import { useState, useEffect } from 'react'
import { CLASS_COLORS } from '@/lib/guild-data'
import { cn } from '@/lib/utils'
import { useToast } from '../toast'
import { Badge, GhostButton, GoldButton, Panel, SectionHeader, inputClass } from '../ui'
import { User, Plus, Trash2, Shield, Calendar, Link2, CheckCircle2, AlertCircle, Edit3, Globe, Wrench, Check, Clock, Swords, Wand2, Sparkles, Footprints, Flame, Cross, Target, Anchor, Star } from 'lucide-react'

type ExtendedRole = 'TANK' | 'HEALER' | 'MELEE' | 'RANGED'
type AvailabilityStatus = 'none' | 'available' | 'maybe' | 'busy'

interface GuildCharacter {
  id: string
  firstName: string
  lastName: string
  wowClass: keyof typeof CLASS_COLORS
  race: string
  spec: string
  offSpec: string
  role: ExtendedRole
  isMain: boolean
  professions: [string, string]
  attunements: {
    onyxia: boolean
    mc: boolean
    bwl: boolean
    naxx: boolean
  }
}

interface UserProfileData {
  fullName: string
  nickname: string
  birthDate: string
  gender: string
  bnetId: string
  email: string
  phoneCountry: string
  phoneNumber: string
  selectedAvatar: string
  discordConnected: boolean
  discordTag: string
  bnetConnected: boolean
  availability: Record<string, { status: AvailabilityStatus; startTime: string; endTime: string }>
}

const WOW_CLASSES: (keyof typeof CLASS_COLORS)[] = [
  'Druid', 'Warrior', 'Shaman', 'Mage', 'Paladin', 'Priest', 'Rogue', 'Warlock', 'Hunter'
]

const CLASS_RACES: Record<keyof typeof CLASS_COLORS, string[]> = {
  Druid: ['Night Elf', 'Skyborn'],
  Warrior: ['Night Elf', 'Human', 'Dwarf', 'Skyborn'],
  Shaman: ['Dwarf'],
  Mage: ['Human', 'Gnome', 'Skyborn'],
  Paladin: ['Human', 'Dwarf'],
  Priest: ['Human', 'Dwarf', 'Night Elf'],
  Rogue: ['Human', 'Night Elf', 'Gnome', 'Skyborn'],
  Warlock: ['Human', 'Gnome'],
  Hunter: ['Night Elf', 'Dwarf', 'Skyborn'],
}

const CLASS_SPECS: Record<keyof typeof CLASS_COLORS, { label: string; role: ExtendedRole }[]> = {
  Druid: [
    { label: 'Feral Tank', role: 'TANK' },
    { label: 'Feral DPS', role: 'MELEE' },
    { label: 'Restoration', role: 'HEALER' },
    { label: 'Balance', role: 'RANGED' },
  ],
  Warrior: [
    { label: 'Protection', role: 'TANK' },
    { label: 'Arms', role: 'MELEE' },
    { label: 'Fury', role: 'MELEE' },
  ],
  Shaman: [
    { label: 'Restoration', role: 'HEALER' },
    { label: 'Enhancement', role: 'MELEE' },
    { label: 'Elemental', role: 'RANGED' },
  ],
  Mage: [
    { label: 'Fire', role: 'RANGED' },
    { label: 'Frost', role: 'RANGED' },
    { label: 'Arcane', role: 'RANGED' },
  ],
  Paladin: [
    { label: 'Protection', role: 'TANK' },
    { label: 'Holy', role: 'HEALER' },
    { label: 'Retribution', role: 'MELEE' },
  ],
  Priest: [
    { label: 'Holy', role: 'HEALER' },
    { label: 'Discipline', role: 'HEALER' },
    { label: 'Shadow', role: 'RANGED' },
  ],
  Rogue: [
    { label: 'Combat', role: 'MELEE' },
    { label: 'Assassination', role: 'MELEE' },
    { label: 'Subtlety', role: 'MELEE' },
  ],
  Warlock: [
    { label: 'Affliction', role: 'RANGED' },
    { label: 'Destruction', role: 'RANGED' },
    { label: 'Demonology', role: 'RANGED' },
  ],
  Hunter: [
    { label: 'Beast Mastery', role: 'RANGED' },
    { label: 'Marksmanship', role: 'RANGED' },
    { label: 'Survival', role: 'RANGED' },
  ],
}

const PROFESSIONS = [
  'Yok', 'Alchemy', 'Blacksmithing', 'Enchanting', 'Engineering', 
  'Herbalism', 'Leatherworking', 'Mining', 'Skinning', 'Tailoring'
]

const AVATAR_CLASSES = [
  { key: 'Warrior', label: 'Warrior', color: '#C79C6E', icon: Swords, bg: 'bg-[#C79C6E]/20' },
  { key: 'Paladin', label: 'Paladin', color: '#F58CBA', icon: Shield, bg: 'bg-[#F58CBA]/20' },
  { key: 'Hunter', label: 'Hunter', color: '#ABD473', icon: Target, bg: 'bg-[#ABD473]/20' },
  { key: 'Rogue', label: 'Rogue', color: '#FFF569', icon: Footprints, bg: 'bg-[#FFF569]/20' },
  { key: 'Priest', label: 'Priest', color: '#FFFFFF', icon: Cross, bg: 'bg-white/20' },
  { key: 'Shaman', label: 'Shaman', color: '#0070DE', icon: Anchor, bg: 'bg-[#0070DE]/20' },
  { key: 'Mage', label: 'Mage', color: '#69CCF0', icon: Wand2, bg: 'bg-[#69CCF0]/20' },
  { key: 'Warlock', label: 'Warlock', color: '#9482C9', icon: Flame, bg: 'bg-[#9482C9]/20' },
  { key: 'Druid', label: 'Druid', color: '#FF7D0A', icon: Sparkles, bg: 'bg-[#FF7D0A]/20' },
]

const START_TIME_OPTIONS = ['19:00', '19:30', '20:00', '20:30', '21:00']
const END_TIME_OPTIONS = ['23:00', '23:30', '00:00', '00:30', '01:00']

const DAYS_OF_WEEK = [
  { key: 'pzt', label: 'PZT' },
  { key: 'sal', label: 'SAL' },
  { key: 'car', label: 'ÇAR' },
  { key: 'per', label: 'PER' },
  { key: 'cum', label: 'CUM' },
  { key: 'cmt', label: 'CMT' },
  { key: 'paz', label: 'PAZ' },
]

export function ProfileView() {
  const toast = useToast()

  const [profile, setProfile] = useState<UserProfileData>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('turx_user_profile')
      if (saved) {
        try { 
          const parsed = JSON.parse(saved)
          return { ...parsed, selectedAvatar: parsed.selectedAvatar || 'Druid' } 
        } catch (e) { /* fallback */ }
      }
    }
    return {
      fullName: 'Sonat Düşmez',
      nickname: 'Waffle',
      birthDate: '1990-05-15',
      gender: 'Erkek',
      bnetId: 'Sonat#2154',
      email: 'sonat@dstkompresor.com',
      phoneCountry: '+90',
      phoneNumber: '532 000 0000',
      selectedAvatar: 'Druid',
      discordConnected: true,
      discordTag: 'sonatman',
      bnetConnected: false,
      availability: {
        pzt: { status: 'available', startTime: '21:00', endTime: '00:00' },
        sal: { status: 'busy', startTime: '21:00', endTime: '00:00' },
        car: { status: 'available', startTime: '21:00', endTime: '00:00' },
        per: { status: 'busy', startTime: '21:00', endTime: '00:00' },
        cum: { status: 'maybe', startTime: '21:00', endTime: '00:00' },
        cmt: { status: 'available', startTime: '20:00', endTime: '01:00' },
        paz: { status: 'available', startTime: '21:00', endTime: '00:00' },
      }
    }
  })

  const [characters, setCharacters] = useState<GuildCharacter[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('turx_my_characters')
      if (saved) {
        try { return JSON.parse(saved) } catch (e) { /* fallback */ }
      }
    }
    return [
      { id: 'c1', firstName: 'Sonat', lastName: 'Waffle', wowClass: 'Druid', race: 'Skyborn', spec: 'Feral Tank', offSpec: 'Restoration', role: 'TANK', isMain: true, professions: ['Engineering', 'Mining'], attunements: { onyxia: true, mc: true, bwl: true, naxx: false } },
      { id: 'c2', firstName: 'Waffle', lastName: 'Gear', wowClass: 'Mage', race: 'Skyborn', spec: 'Fire', offSpec: 'Frost', role: 'RANGED', isMain: false, professions: ['Tailoring', 'Enchanting'], attunements: { onyxia: true, mc: false, bwl: false, naxx: false } },
    ]
  })

  const [editingCharId, setEditingCharId] = useState<string | null>(null)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editSpec, setEditSpec] = useState('')
  const [editOffSpec, setEditOffSpec] = useState('')
  const [editProf1, setEditProf1] = useState('Yok')
  const [editProf2, setEditProf2] = useState('Yok')
  const [editAttOny, setEditAttOny] = useState(false)
  const [editAttMc, setEditAttMc] = useState(false)
  const [editAttBwl, setEditAttBwl] = useState(false)
  const [editAttNaxx, setEditAttNaxx] = useState(false)

  const [newFirstName, setNewFirstName] = useState('')
  const [newLastName, setNewLastName] = useState('')
  const [newClass, setNewClass] = useState<keyof typeof CLASS_COLORS>('Druid')
  const [newRace, setNewRace] = useState(CLASS_RACES['Druid'][0])
  const [newSpec, setNewSpec] = useState(CLASS_SPECS['Druid'][0].label)
  const [newOffSpec, setNewOffSpec] = useState(CLASS_SPECS['Druid'][1]?.label || 'Yok')
  const [newRole, setNewRole] = useState<ExtendedRole>(CLASS_SPECS['Druid'][0].role)
  const [prof1, setProf1] = useState('Yok')
  const [prof2, setProf2] = useState('Yok')
  const [attOny, setAttOny] = useState(false)
  const [attMc, setAttMc] = useState(false)
  const [attBwl, setAttBwl] = useState(false)
  const [attNaxx, setAttNaxx] = useState(false)

  const handleClassChange = (cls: keyof typeof CLASS_COLORS) => {
    setNewClass(cls)
    const races = CLASS_RACES[cls]
    setNewRace(races[0])
    const specs = CLASS_SPECS[cls]
    setNewSpec(specs[0].label)
    setNewOffSpec(specs[1] ? specs[1].label : 'Yok')
    setNewRole(specs[0].role)
  }

  const handleSpecChange = (specLabel: string) => {
    setNewSpec(specLabel)
    const found = CLASS_SPECS[newClass].find(s => s.label === specLabel)
    if (found) {
      setNewRole(found.role)
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('turx_user_profile', JSON.stringify(profile))
    }
  }, [profile])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('turx_my_characters', JSON.stringify(characters))
    }
  }, [characters])

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    toast({ title: 'Profil Güncellendi', description: 'Hesap bilgileriniz başarıyla kaydedildi.' })
  }

  const cycleAvailability = (dayKey: string) => {
    setProfile(prev => {
      const current = prev.availability[dayKey]?.status || 'busy'
      let nextStatus: AvailabilityStatus = 'available'
      if (current === 'available') nextStatus = 'maybe'
      else if (current === 'maybe') nextStatus = 'busy'
      else if (current === 'busy') nextStatus = 'available'

      return {
        ...prev,
        availability: {
          ...prev.availability,
          [dayKey]: { ...(prev.availability[dayKey] || {}), status: nextStatus }
        }
      }
    })
  }

  const updateDayTime = (dayKey: string, field: 'startTime' | 'endTime', val: string) => {
    setProfile(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        [dayKey]: { 
          ...(prev.availability[dayKey] || { status: 'available', startTime: '21:00', endTime: '00:00' }), 
          [field]: val 
        }
      }
    }))
  }

  const handleSetMain = (id: string) => {
    setCharacters(characters.map(char => ({
      ...char,
      isMain: char.id === id
    })))
    toast({ title: 'Ana Karakter Güncellendi', description: 'Main karakteriniz başarıyla değiştirildi.' })
  }

  const handleStartEdit = (char: GuildCharacter) => {
    setEditingCharId(char.id)
    setEditFirstName(char.firstName)
    setEditLastName(char.lastName)
    setEditSpec(char.spec)
    setEditOffSpec(char.offSpec)
    setEditProf1(char.professions?.[0] || 'Yok')
    setEditProf2(char.professions?.[1] || 'Yok')
    setEditAttOny(char.attunements?.onyxia || false)
    setEditAttMc(char.attunements?.mc || false)
    setEditAttBwl(char.attunements?.bwl || false)
    setEditAttNaxx(char.attunements?.naxx || false)
  }

  const handleSaveEdit = (id: string) => {
    setCharacters(characters.map(char => {
      if (char.id === id) {
        return {
          ...char,
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          spec: editSpec,
          offSpec: editOffSpec,
          professions: [editProf1, editProf2],
          attunements: {
            onyxia: editAttOny,
            mc: editAttMc,
            bwl: editAttBwl,
            naxx: editAttNaxx
          }
        }
      }
      return char
    }))
    setEditingCharId(null)
    toast({ title: 'Karakter Güncellendi', description: 'Değişiklikler başarıyla kaydedildi.' })
  }

  const handleAddCharacter = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFirstName.trim() || !newLastName.trim()) {
      toast({ title: 'Hata', description: 'Lütfen karakterin adını ve soyadını girin.' })
      return
    }

    const isFirstCharacter = characters.length === 0

    const newChar: GuildCharacter = {
      id: Date.now().toString(),
      firstName: newFirstName.trim(),
      lastName: newLastName.trim(),
      wowClass: newClass,
      race: newRace,
      spec: newSpec,
      offSpec: newOffSpec,
      role: newRole,
      isMain: isFirstCharacter,
      professions: [prof1, prof2],
      attunements: { onyxia: attOny, mc: attMc, bwl: attBwl, naxx: attNaxx }
    }

    setCharacters([...characters, newChar])
    setNewFirstName('')
    setNewLastName('')
    setProf1('Yok')
    setProf2('Yok')
    setAttOny(false)
    setAttMc(false)
    setAttBwl(false)
    setAttNaxx(false)
    toast({ title: 'Karakter Eklendi!', description: `${newChar.firstName} ${newChar.lastName} (${newChar.spec}) havuzunuza eklendi.` })
  }

  const handleDeleteCharacter = (id: string) => {
    if (characters.length <= 1) {
      toast({ title: 'Silinemez', description: 'En az bir karakteriniz kalmalıdır.' })
      return
    }
    const remaining = characters.filter(c => c.id !== id)
    if (!remaining.some(c => c.isMain)) {
      remaining[0].isMain = true
    }
    setCharacters(remaining)
    toast({ title: 'Karakter Silindi', description: 'Karakter havuzunuzdan kaldırıldı.' })
  }

  const displayName = profile.nickname.trim() ? `${profile.nickname} (${profile.fullName})` : profile.fullName
  const activeAvatarClass = AVATAR_CLASSES.find(a => a.key === profile.selectedAvatar) || AVATAR_CLASSES[0]
  const ActiveAvatarIcon = activeAvatarClass.icon

  return (
    <div className="flex flex-col gap-8 pb-10">
      <SectionHeader
        eyebrow="Hesap & Roster Yönetimi"
        title="Kullanıcı Profili & Karakter Havuzu"
        description="Lonca kayıt bilgileriniz, haftalık müsaitliğiniz ve Main/Alt karakter havuzunuz."
      />

      <Panel className="border-gold/30 bg-gradient-to-r from-card/90 via-card/70 to-card/90 p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div 
              className={cn("relative size-20 rounded-2xl border-2 overflow-hidden shadow-lg flex items-center justify-center font-display font-black", activeAvatarClass.bg)}
              style={{ borderColor: activeAvatarClass.color, color: activeAvatarClass.color }}
            >
              <ActiveAvatarIcon className="size-10" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-2xl font-bold tracking-wide text-gold">
                  {displayName}
                </h2>
                <Badge className="border-gold/40 bg-gold/10 text-gold text-xs px-2.5 py-0.5">
                  Member
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1 text-silver font-medium">
                  <span className="text-neon">Bnet:</span> {profile.bnetId || 'Bağlı Değil'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-silver font-medium">
                  <span className="text-azure">Discord:</span> @{profile.discordTag}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="border-success/40 bg-success/10 text-success px-3 py-1 text-xs">
              <CheckCircle2 className="size-3.5 mr-1.5" /> Lonca Üyesi Onaylı
            </Badge>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="flex flex-col gap-8 lg:col-span-2">
          
          <Panel className="flex flex-col gap-6">
            <h3 className="font-display text-lg font-bold text-gold flex items-center gap-2 border-b border-border pb-3">
              <Edit3 className="size-4" /> Kişisel & Kayıt Bilgileri
            </h3>
            <form onSubmit={handleProfileUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-silver">Gerçek İsim Soyisim *</label>
                <input
                  type="text"
                  value={profile.fullName}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-silver">Profil İsmi / Nick (Opsiyonel)</label>
                <input
                  type="text"
                  value={profile.nickname}
                  onChange={(e) => setProfile({ ...profile, nickname: e.target.value })}
                  placeholder="Örn: Waffle"
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-silver">Doğum Tarihi *</label>
                <input
                  type="date"
                  value={profile.birthDate}
                  onChange={(e) => setProfile({ ...profile, birthDate: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-silver">Cinsiyet *</label>
                <select
                  value={profile.gender}
                  onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                  className={inputClass}
                >
                  <option value="Erkek">Erkek</option>
                  <option value="Kadın">Kadın</option>
                  <option value="Belirtmek İstemiyorum">Belirtmek İstemiyorum</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-silver">Battle.net Real ID *</label>
                <input
                  type="text"
                  value={profile.bnetId}
                  onChange={(e) => setProfile({ ...profile, bnetId: e.target.value })}
                  placeholder="Battletag#1234"
                  className={inputClass}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-silver">E-posta Adresi *</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-silver">Telefon Numarası *</label>
                <div className="flex gap-2">
                  <select
                    value={profile.phoneCountry}
                    onChange={(e) => setProfile({ ...profile, phoneCountry: e.target.value })}
                    className={cn(inputClass, "w-36 shrink-0")}
                  >
                    <option value="+90">🇹🇷 +90 (TR)</option>
                    <option value="+49">🇩🇪 +49 (DE)</option>
                    <option value="+44">🇬🇧 +44 (UK)</option>
                    <option value="+1">🇺🇸 +1 (US)</option>
                    <option value="+31">🇳🇱 +31 (NL)</option>
                    <option value="+33">🇫🇷 +33 (FR)</option>
                    <option value="+43">🇦🇹 +43 (AT)</option>
                  </select>
                  <input
                    type="tel"
                    value={profile.phoneNumber}
                    onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
                    placeholder="532 123 45 67"
                    className={cn(inputClass, "flex-1")}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 md:col-span-2 pt-2 border-t border-border">
                <label className="text-xs font-semibold text-silver">Profil Avatarı (WoW Sınıf Simgesi)</label>
                <div className="grid grid-cols-3 sm:grid-cols-9 gap-2">
                  {AVATAR_CLASSES.map((av) => {
                    const isSelected = profile.selectedAvatar === av.key
                    const IconComp = av.icon
                    return (
                      <button
                        key={av.key}
                        type="button"
                        onClick={() => setProfile({ ...profile, selectedAvatar: av.key })}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-1.5",
                          isSelected 
                            ? "border-gold bg-gold/15 shadow-md scale-105" 
                            : "border-border bg-background/50 hover:border-border/80"
                        )}
                        style={{ color: av.color }}
                      >
                        <IconComp className="size-5" />
                        <span className="text-[10px] font-bold">{av.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="md:col-span-2 flex justify-end mt-2">
                <GoldButton type="submit">Değişiklikleri Kaydet</GoldButton>
              </div>
            </form>
          </Panel>

          <Panel className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-lg font-bold text-gold flex items-center gap-2">
                <Calendar className="size-4" /> Haftalık Müsaitlik & Saat Aralığı
              </h3>
              <span className="text-xs text-muted-foreground">UTC+3 (Türkiye Saati)</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Günlere tıklayarak durumunuzu belirleyin: <span className="text-success font-semibold">Yeşil (Müsait)</span> → <span className="text-gold font-semibold">Sarı (Belki)</span> → <span className="text-destructive font-semibold">Kırmızı (Meşgul)</span>. Açılır menülerden başlama ve bitiş saatlerini yarım saatlik artışlarla seçin.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
              {DAYS_OF_WEEK.map(({ key, label }) => {
                const dayData = profile.availability[key] || { status: 'busy', startTime: '21:00', endTime: '00:00' }
                
                let statusBg = 'border-destructive/60 bg-destructive/10 text-destructive'
                let statusText = 'Meşgul'
                if (dayData.status === 'available') {
                  statusBg = 'border-success/60 bg-success/10 text-success shadow-[0_0_12px_rgb(62_224_127/0.15)]'
                  statusText = 'Müsait'
                } else if (dayData.status === 'maybe') {
                  statusBg = 'border-gold/60 bg-gold/10 text-gold shadow-[0_0_12px_rgb(212,175,55/0.15)]'
                  statusText = 'Belki'
                }

                return (
                  <div key={key} className="flex flex-col gap-2 rounded-xl border border-border bg-background/60 p-3">
                    <button
                      type="button"
                      onClick={() => cycleAvailability(key)}
                      className={cn(
                        "flex flex-col items-center justify-center py-2.5 rounded-lg border transition-all cursor-pointer font-display font-bold",
                        statusBg
                      )}
                    >
                      <span className="text-sm">{label}</span>
                      <span className="text-[11px] mt-0.5 tracking-wide">{statusText}</span>
                    </button>

                    <div className="flex flex-col gap-1.5 pt-1">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="size-3" /> Başlangıç
                      </div>
                      <select
                        value={dayData.startTime}
                        onChange={(e) => updateDayTime(key, 'startTime', e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-2 py-1 text-[11px] text-silver font-mono"
                      >
                        {START_TIME_OPTIONS.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-1">
                        <Clock className="size-3" /> Bitiş
                      </div>
                      <select
                        value={dayData.endTime}
                        onChange={(e) => updateDayTime(key, 'endTime', e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-2 py-1 text-[11px] text-silver font-mono"
                      >
                        {END_TIME_OPTIONS.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )
              })}
            </div>
          </Panel>

          <Panel className="flex flex-col gap-4">
            <h3 className="font-display text-lg font-bold text-gold flex items-center gap-2 border-b border-border pb-3">
              <Link2 className="size-4" /> Hesap Bağlantıları
            </h3>
            <div className="grid gap-3">
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-background/50">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-azure/10 border border-azure/30 flex items-center justify-center text-azure font-bold">DS</div>
                  <div>
                    <div className="font-bold text-sm text-silver">Discord Hesabı</div>
                    <div className="text-xs text-muted-foreground">@{profile.discordTag}</div>
                  </div>
                </div>
                <Badge className="border-azure/40 bg-azure/10 text-azure">Birincil Bağlı</Badge>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-background/50">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-neon/10 border border-neon/30 flex items-center justify-center text-neon font-bold">BN</div>
                  <div>
                    <div className="font-bold text-sm text-silver">Battle.net Hesabı</div>
                    <div className="text-xs text-muted-foreground">{profile.bnetId || 'Karakterleri senkronize etmek için bağlayın'}</div>
                  </div>
                </div>
                <GoldButton onClick={() => {
                  setProfile({ ...profile, bnetConnected: true })
                  toast({ title: 'Battle.net Bağlandı!', description: 'Armory verileri başarıyla eşitlendi.' })
                }} className="text-xs py-1.5 px-3">
                  + Hesap Bağla
                </GoldButton>
              </div>
            </div>
          </Panel>

        </div>

        <div className="flex flex-col gap-6">
          <Panel className="flex flex-col gap-4">
            <h3 className="font-display text-lg font-bold text-gold flex items-center gap-2 border-b border-border pb-3">
              <Shield className="size-4" /> Karakter Havuzum ({characters.length})
            </h3>
            <p className="text-xs text-muted-foreground">
              Havuzdaki karakterleriniz. Kayar anahtarı kullanarak ana karakterinizi belirleyebilirsiniz:
            </p>

            <div className="grid gap-3 max-h-[440px] overflow-y-auto pr-1">
              {characters.map((char) => {
                const isEditing = editingCharId === char.id

                return (
                  <div
                    key={char.id}
                    className={cn(
                      "flex flex-col gap-2 p-3.5 rounded-xl border transition-all shadow-sm",
                      char.isMain ? "border-gold/60 bg-gold/5" : "border-border bg-background/60"
                    )}
                  >
                    {isEditing ? (
                      <div className="flex flex-col gap-3 py-1">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                          <span className="text-xs font-bold text-gold uppercase tracking-wider">Karakteri Düzenle</span>
                          <button
                            type="button"
                            onClick={() => setEditingCharId(null)}
                            className="text-xs text-muted-foreground hover:text-silver"
                          >
                            İptal
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={editFirstName}
                            onChange={(e) => setEditFirstName(e.target.value)}
                            className={inputClass}
                            placeholder="İsim"
                          />
                          <input
                            type="text"
                            value={editLastName}
                            onChange={(e) => setEditLastName(e.target.value)}
                            className={inputClass}
                            placeholder="Soyisim"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={editSpec}
                            onChange={(e) => setEditSpec(e.target.value)}
                            className={inputClass}
                          >
                            {CLASS_SPECS[char.wowClass]?.map((sp) => (
                              <option key={sp.label} value={sp.label}>{sp.label}</option>
                            ))}
                          </select>
                          <select
                            value={editOffSpec}
                            onChange={(e) => setEditOffSpec(e.target.value)}
                            className={inputClass}
                          >
                            <option value="Yok">Yok</option>
                            {CLASS_SPECS[char.wowClass]?.filter(s => s.label !== editSpec).map((sp) => (
                              <option key={sp.label} value={sp.label}>{sp.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={editProf1}
                            onChange={(e) => setEditProf1(e.target.value)}
                            className={inputClass}
                          >
                            {PROFESSIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                          <select
                            value={editProf2}
                            onChange={(e) => setEditProf2(e.target.value)}
                            className={inputClass}
                          >
                            {PROFESSIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>

                        <div className="grid grid-cols-4 gap-2 text-[11px] pt-1">
                          <label className="flex items-center gap-1 text-silver"><input type="checkbox" checked={editAttOny} onChange={(e) => setEditAttOny(e.target.checked)} /> Ony</label>
                          <label className="flex items-center gap-1 text-silver"><input type="checkbox" checked={editAttMc} onChange={(e) => setEditAttMc(e.target.checked)} /> MC</label>
                          <label className="flex items-center gap-1 text-silver"><input type="checkbox" checked={editAttBwl} onChange={(e) => setEditAttBwl(e.target.checked)} /> BWL</label>
                          <label className="flex items-center gap-1 text-silver"><input type="checkbox" checked={editAttNaxx} onChange={(e) => setEditAttNaxx(e.target.checked)} /> Naxx</label>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <GoldButton type="button" onClick={() => handleSaveEdit(char.id)} className="text-xs py-1 px-4">
                            Değişiklikleri Kaydet
                          </GoldButton>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm" style={{ color: CLASS_COLORS[char.wowClass] }}>
                                {char.firstName} {char.lastName}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {char.wowClass} ({char.race}) · <span className="text-silver">{char.spec}</span> {char.offSpec && char.offSpec !== 'Yok' && <span className="text-muted-foreground text-[10px]">(OS: {char.offSpec})</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSetMain(char.id)}
                              className={cn(
                                "relative flex items-center h-7 w-24 rounded-full p-1 transition-colors duration-300 focus:outline-none cursor-pointer border",
                                char.isMain ? "bg-success/20 border-success/60 shadow-[0_0_10px_rgb(62_224_127/0.3)]" : "bg-background border-border"
                              )}
                              title="Main / Alt durumunu değiştirmek için tıklayın"
                            >
                              <div className={cn("absolute flex items-center justify-center h-5 w-11 rounded-full text-[10px] font-bold transition-all duration-300 shadow-md", char.isMain ? "translate-x-12 bg-success text-success-foreground" : "translate-x-0 bg-muted text-muted-foreground")}>
                                {char.isMain ? 'MAIN' : 'ALT'}
                              </div>
                              <span className={cn("absolute left-2.5 text-[9px] font-bold transition-opacity", char.isMain ? "opacity-100 text-success" : "opacity-40 text-muted-foreground")}>MAIN</span>
                              <span className={cn("absolute right-2.5 text-[9px] font-bold transition-opacity", !char.isMain ? "opacity-100 text-silver" : "opacity-40 text-muted-foreground")}>ALT</span>
                            </button>

                            <Badge className="border-border bg-muted/30 text-[10px]">{char.role}</Badge>
                            
                            <button
                              type="button"
                              onClick={() => handleStartEdit(char)}
                              className="text-muted-foreground hover:text-gold transition p-1 rounded hover:bg-gold/10"
                              title="Düzenle"
                            >
                              <Edit3 className="size-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteCharacter(char.id)}
                              className="text-muted-foreground hover:text-destructive transition p-1 rounded hover:bg-destructive/10"
                              title="Sil"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/60 text-[11px]">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Wrench className="size-3" /> {char.professions?.[0] || 'Yok'}, {char.professions?.[1] || 'Yok'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1 text-[10px]">
                          <span className="text-muted-foreground">Attunement:</span>
                          <span className={cn("px-1.5 py-0.5 rounded border", char.attunements?.onyxia ? "border-success/40 bg-success/10 text-success" : "border-border text-muted-foreground")}>Ony</span>
                          <span className={cn("px-1.5 py-0.5 rounded border", char.attunements?.mc ? "border-success/40 bg-success/10 text-success" : "border-border text-muted-foreground")}>MC</span>
                          <span className={cn("px-1.5 py-0.5 rounded border", char.attunements?.bwl ? "border-success/40 bg-success/10 text-success" : "border-border text-muted-foreground")}>BWL</span>
                          <span className={cn("px-1.5 py-0.5 rounded border", char.attunements?.naxx ? "border-success/40 bg-success/10 text-success" : "border-border text-muted-foreground")}>Naxx</span>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            <form onSubmit={handleAddCharacter} className="flex flex-col gap-3 mt-4 pt-4 border-t border-border">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gold">Yeni Karakter Ekle</h4>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-silver">İsim</label>
                  <input
                    type="text"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="Waffle"
                    className={inputClass}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-silver">Soyisim</label>
                  <input
                    type="text"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="Sonat"
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-silver">Sınıf</label>
                  <select
                    value={newClass}
                    onChange={(e) => handleClassChange(e.target.value as keyof typeof CLASS_COLORS)}
                    className={inputClass}
                  >
                    {WOW_CLASSES.map((cls) => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-silver">Irk</label>
                  <select
                    value={newRace}
                    onChange={(e) => setNewRace(e.target.value)}
                    className={inputClass}
                  >
                    {CLASS_RACES[newClass].map((race) => (
                      <option key={race} value={race}>{race}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-silver">Main Spec</label>
                  <select
                    value={newSpec}
                    onChange={(e) => handleSpecChange(e.target.value)}
                    className={inputClass}
                  >
                    {CLASS_SPECS[newClass].map((sp) => (
                      <option key={sp.label} value={sp.label}>{sp.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-silver">Off-Spec (OS)</label>
                  <select
                    value={newOffSpec}
                    onChange={(e) => setNewOffSpec(e.target.value)}
                    className={inputClass}
                  >
                    <option value="Yok">Yok</option>
                    {CLASS_SPECS[newClass].filter(s => s.label !== newSpec).map((sp) => (
                      <option key={sp.label} value={sp.label}>{sp.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-silver">1. Meslek</label>
                  <select
                    value={prof1}
                    onChange={(e) => setProf1(e.target.value)}
                    className={inputClass}
                  >
                    {PROFESSIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-silver">2. Meslek</label>
                  <select
                    value={prof2}
                    onChange={(e) => setProf2(e.target.value)}
                    className={inputClass}
                  >
                    {PROFESSIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1 pt-1">
                <label className="text-[11px] font-semibold text-silver">Attunement Durumları</label>
                <div className="grid grid-cols-4 gap-2">
                  <label className="flex items-center gap-1.5 text-[11px] text-silver cursor-pointer">
                    <input type="checkbox" checked={attOny} onChange={(e) => setAttOny(e.target.checked)} className="rounded border-border bg-background text-gold focus:ring-0" /> Ony
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-silver cursor-pointer">
                    <input type="checkbox" checked={attMc} onChange={(e) => setAttMc(e.target.checked)} className="rounded border-border bg-background text-gold focus:ring-0" /> MC
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-silver cursor-pointer">
                    <input type="checkbox" checked={attBwl} onChange={(e) => setAttBwl(e.target.checked)} className="rounded border-border bg-background text-gold focus:ring-0" /> BWL
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-silver cursor-pointer">
                    <input type="checkbox" checked={attNaxx} onChange={(e) => setAttNaxx(e.target.checked)} className="rounded border-border bg-background text-gold focus:ring-0" /> Naxx
                  </label>
                </div>
              </div>

              <GoldButton type="submit" className="w-full mt-2 text-xs py-2">
                <Plus className="size-3.5 mr-1" /> Karakteri Havuza Ekle
              </GoldButton>
            </form>
          </Panel>
        </div>

      </div>
    </div>
  )
}