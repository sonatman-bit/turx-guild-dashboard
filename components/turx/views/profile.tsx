'use client'

import { useState, useEffect } from 'react'
import { CLASS_COLORS } from '@/lib/guild-data'
import {
  commitOnboardingStatus,
  getOnboardingGaps,
  loadOnboardingCharacters,
  loadOnboardingProfile,
  saveOnboardingSnapshot,
} from '@/lib/profile-gate'
import { cn } from '@/lib/utils'
import { useAuth } from '../auth-provider'
import { useToast } from '../toast'
import { Badge, GhostButton, GoldButton, Panel, SectionHeader, inputClass } from '../ui'
import { Plus, Trash2, Shield, Calendar, Link2, CheckCircle2, Edit3, Wrench, Clock, Swords, Wand2, Sparkles, Footprints, Flame, Cross, Target, Anchor, Lock } from 'lucide-react'

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

const WOW_CLASSES = Object.keys(CLASS_COLORS) as (keyof typeof CLASS_COLORS)[]

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
  { key: 'Warrior' as const, label: 'Warrior', color: CLASS_COLORS.Warrior, icon: Swords, bg: 'bg-[#C69B6D]/20' },
  { key: 'Paladin' as const, label: 'Paladin', color: CLASS_COLORS.Paladin, icon: Shield, bg: 'bg-[#F48CBA]/20' },
  { key: 'Hunter' as const, label: 'Hunter', color: CLASS_COLORS.Hunter, icon: Target, bg: 'bg-[#AAD372]/20' },
  { key: 'Rogue' as const, label: 'Rogue', color: CLASS_COLORS.Rogue, icon: Footprints, bg: 'bg-[#FFF468]/20' },
  { key: 'Priest' as const, label: 'Priest', color: CLASS_COLORS.Priest, icon: Cross, bg: 'bg-white/20' },
  { key: 'Shaman' as const, label: 'Shaman', color: CLASS_COLORS.Shaman, icon: Anchor, bg: 'bg-[#0070DD]/20' },
  { key: 'Mage' as const, label: 'Mage', color: CLASS_COLORS.Mage, icon: Wand2, bg: 'bg-[#3FC7EB]/20' },
  { key: 'Warlock' as const, label: 'Warlock', color: CLASS_COLORS.Warlock, icon: Flame, bg: 'bg-[#8788EE]/20' },
  { key: 'Druid' as const, label: 'Druid', color: CLASS_COLORS.Druid, icon: Sparkles, bg: 'bg-[#FF7C0A]/20' },
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

function emptyProfile(email: string): UserProfileData {
  return {
    fullName: '',
    nickname: '',
    birthDate: '',
    gender: 'Erkek',
    bnetId: '',
    email,
    phoneCountry: '+90',
    phoneNumber: '',
    selectedAvatar: 'Druid',
    discordConnected: false,
    discordTag: '',
    bnetConnected: false,
    availability: Object.fromEntries(
      DAYS_OF_WEEK.map((day) => [day.key, { status: 'none' as AvailabilityStatus, startTime: '21:00', endTime: '00:00' }]),
    ),
  }
}

export function ProfileView() {
  const toast = useToast()
  const { user, profileComplete, refreshProfileGate } = useAuth()
  const [ready, setReady] = useState(false)
  const [profile, setProfile] = useState<UserProfileData>(() => emptyProfile(''))
  const [characters, setCharacters] = useState<GuildCharacter[]>([])

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
    if (!user) {
      setProfile(emptyProfile(''))
      setCharacters([])
      setReady(false)
      return
    }

    const savedProfile = loadOnboardingProfile(user.username) as Partial<UserProfileData> | null
    const savedCharacters = loadOnboardingCharacters(user.username) as GuildCharacter[]
    setProfile(
      savedProfile
        ? { ...emptyProfile(user.email), ...savedProfile, selectedAvatar: savedProfile.selectedAvatar || 'Druid' }
        : emptyProfile(user.email),
    )
    setCharacters(Array.isArray(savedCharacters) ? savedCharacters : [])
    setReady(true)
  }, [user])

  useEffect(() => {
    if (!ready || !user) return
    saveOnboardingSnapshot(user.username, profile, characters)
  }, [profile, characters, ready, user])

  const persistGate = (nextProfile: UserProfileData, nextCharacters: GuildCharacter[]) => {
    if (!user) return false
    saveOnboardingSnapshot(user.username, nextProfile, nextCharacters)
    const complete = commitOnboardingStatus(user.username, nextProfile, nextCharacters)
    refreshProfileGate()
    return complete
  }

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast({ title: 'Giriş gerekli', description: 'Profil kaydetmek için önce oturum açın.' })
      return
    }
    const complete = persistGate(profile, characters)
    if (!complete) {
      const gaps = getOnboardingGaps(profile, characters).join(', ')
      toast({
        title: 'Profil kilitli kaldı',
        description: `Eksik: ${gaps}. Kaydettikten sonra diğer sekmelere geçebilirsin.`,
      })
      return
    }
    toast({ title: 'Profil Güncellendi', description: 'Hesap bilgileriniz kaydedildi. Lonca paneli açıldı.' })
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

    const nextCharacters = [...characters, newChar]
    setCharacters(nextCharacters)
    setNewFirstName('')
    setNewLastName('')
    setProf1('Yok')
    setProf2('Yok')
    setAttOny(false)
    setAttMc(false)
    setAttBwl(false)
    setAttNaxx(false)
    const unlocked = persistGate(profile, nextCharacters)
    toast({
      title: 'Karakter Eklendi!',
      description: unlocked
        ? `${newChar.firstName} ${newChar.lastName} eklendi. Profil kilidi açıldı.`
        : `${newChar.firstName} ${newChar.lastName} (${newChar.spec}) havuzunuza eklendi. Kişisel bilgileri de kaydet.`,
    })
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
  const onboardingGaps = getOnboardingGaps(profile, characters)

  if (!user) {
    return (
      <div className="flex flex-col gap-4">
        <SectionHeader
          eyebrow="Hesap"
          title="Profil için giriş gerekli"
          description="Karakter havuzu ve kişisel kayıt bilgileri yalnızca oturum açmış üyeler içindir."
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
      <SectionHeader
        eyebrow="Hesap & Roster Yönetimi"
        title="Kullanıcı Profili & Karakter Havuzu"
        description="Lonca kayıt bilgileriniz, haftalık müsaitliğiniz ve Main/Alt karakter havuzunuz."
      />

      {!profileComplete && (
        <Panel className="border-gold/40 bg-gold/10 p-4">
          <p className="flex items-center gap-2 font-display text-sm font-bold text-gold">
            <Lock className="size-4" />
            Zorunlu onboarding
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Ad soyad, doğum tarihi, cinsiyet, Battle.net ID, e-posta, telefon ve en az bir Main karakter
            kaydedilene kadar diğer sekmeler kilitli.
            {onboardingGaps.length > 0 ? ` Eksik: ${onboardingGaps.join(', ')}.` : ''}
          </p>
        </Panel>
      )}

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
                <GoldButton type="submit">{profileComplete ? 'Değişiklikleri Kaydet' : 'Kaydet ve Kilidi Aç'}</GoldButton>
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