'use client'

import { useEffect, useState } from 'react'
import {
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User,
} from 'lucide-react'
import {
  DAYS_OF_WEEK,
  defaultDayAvailability,
  defaultWeekAvailability,
  normalizeAvailability,
  type AvailabilityStatus,
} from '@/lib/availability'
import { authHeaders } from '@/lib/client-session'
import { CLASS_COLORS, racesForClass, type WowClass } from '@/lib/guild-data'
import type { GuildRank } from '@/lib/turx-identity'
import { cn } from '@/lib/utils'
import { useToast } from './toast'
import { Badge, GhostButton, GoldButton, Modal, inputClass } from './ui'

type ExtendedRole = 'TANK' | 'HEALER' | 'MELEE' | 'RANGED'

interface MemberCharacter {
  id: string
  firstName: string
  lastName: string
  wowClass: WowClass
  race: string
  spec: string
  offSpec: string
  role: ExtendedRole
  isMain: boolean
  professions: [string, string]
  attunements: { onyxia: boolean; mc: boolean; bwl: boolean; naxx: boolean }
  armoryVerified?: boolean
  armoryGuild?: string | null
  armoryLevel?: number | null
}

interface EditableProfile {
  fullName: string
  nickname: string
  birthDate: string
  gender: string
  bnetId: string
  email: string
  phoneCountry: string
  phoneNumber: string
  showRealNameInRoster: boolean
  discordTag: string
  twitchLogin: string
  kickLogin: string
  youtubeHandle: string
  skipRaidsForNow: boolean
  availability: Record<string, { status: AvailabilityStatus; startTime: string; endTime: string }>
}

const WOW_CLASSES = Object.keys(CLASS_COLORS) as WowClass[]

const CLASS_SPECS: Record<WowClass, { label: string; role: ExtendedRole }[]> = {
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
  'Herbalism', 'Leatherworking', 'Mining', 'Skinning', 'Tailoring',
]

const START_TIME_OPTIONS = ['19:00', '19:30', '20:00', '20:30', '21:00']
const END_TIME_OPTIONS = ['23:00', '23:30', '00:00', '00:30', '01:00']

export function GmMemberProfileModal({
  username,
  onClose,
  onSaved,
}: {
  username: string | null
  onClose: () => void
  onSaved: (updated: {
    username: string
    role: GuildRank
    mainCharacter: string
    wowClass: WowClass
    spec: string
  }) => void
}) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [section, setSection] = useState<'info' | 'characters' | 'availability'>('info')
  const [role, setRole] = useState<GuildRank>('Turx')
  const [accountEmail, setAccountEmail] = useState('')
  const [profile, setProfile] = useState<EditableProfile | null>(null)
  const [characters, setCharacters] = useState<MemberCharacter[]>([])
  const [nicknameError, setNicknameError] = useState<string | null>(null)

  useEffect(() => {
    if (!username) {
      setProfile(null)
      setCharacters([])
      setNicknameError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setSection('info')
    setNicknameError(null)

    fetch(`/api/admin/member-profile?username=${encodeURIComponent(username)}`, {
      credentials: 'same-origin',
      headers: authHeaders(),
      cache: 'no-store',
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean
          error?: string
          member?: {
            username: string
            email: string
            role: GuildRank
            profile: Partial<EditableProfile>
            characters: MemberCharacter[]
          }
        }
        if (cancelled) return
        if (!res.ok || !data.member) {
          toast({ variant: 'error', title: 'Profil Açılamadı', description: data.error || 'Yetki veya sunucu hatası.' })
          onClose()
          return
        }
        const m = data.member
        setRole(m.role)
        setAccountEmail(m.email || '')
        setProfile({
          fullName: m.profile.fullName || '',
          nickname: m.profile.nickname || '',
          birthDate: m.profile.birthDate || '',
          gender: m.profile.gender || 'Erkek',
          bnetId: m.profile.bnetId || '',
          email: m.profile.email || m.email || '',
          phoneCountry: m.profile.phoneCountry || '+90',
          phoneNumber: m.profile.phoneNumber || '',
          showRealNameInRoster: m.profile.showRealNameInRoster !== false,
          discordTag: m.profile.discordTag || '',
          twitchLogin: m.profile.twitchLogin || '',
          kickLogin: m.profile.kickLogin || '',
          youtubeHandle: m.profile.youtubeHandle || '',
          skipRaidsForNow: m.profile.skipRaidsForNow === true,
          availability: normalizeAvailability(m.profile.availability || defaultWeekAvailability()),
        })
        setCharacters(
          (Array.isArray(m.characters) ? m.characters : []).map((c, idx) => ({
            id: c.id || `${m.username}-${idx}`,
            firstName: c.firstName || '',
            lastName: c.lastName || '',
            wowClass: (c.wowClass && c.wowClass in CLASS_COLORS ? c.wowClass : 'Warrior') as WowClass,
            race: c.race || racesForClass('Warrior')[0],
            spec: c.spec || 'Arms',
            offSpec: c.offSpec || 'Yok',
            role: c.role || 'MELEE',
            isMain: Boolean(c.isMain),
            professions: c.professions || ['Yok', 'Yok'],
            attunements: {
              onyxia: Boolean(c.attunements?.onyxia),
              mc: Boolean(c.attunements?.mc),
              bwl: Boolean(c.attunements?.bwl),
              naxx: Boolean(c.attunements?.naxx),
            },
            armoryVerified: c.armoryVerified,
            armoryGuild: c.armoryGuild,
            armoryLevel: c.armoryLevel,
          })),
        )
      })
      .catch(() => {
        if (!cancelled) {
          toast({ variant: 'error', title: 'Bağlantı Hatası', description: 'Üye profili yüklenemedi.' })
          onClose()
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [username])

  const updateChar = (id: string, patch: Partial<MemberCharacter>) => {
    setCharacters((prev) =>
      prev.map((c) => {
        if (c.id !== id) {
          return patch.isMain ? { ...c, isMain: false } : c
        }
        const next = { ...c, ...patch }
        if (patch.wowClass && patch.wowClass !== c.wowClass) {
          const specs = CLASS_SPECS[patch.wowClass]
          next.race = racesForClass(patch.wowClass)[0]
          next.spec = specs[0].label
          next.role = specs[0].role
        }
        if (patch.spec) {
          const found = CLASS_SPECS[next.wowClass]?.find((s) => s.label === patch.spec)
          if (found) next.role = found.role
        }
        return next
      }),
    )
  }

  const addEmptyCharacter = () => {
    const isFirst = characters.length === 0
    setCharacters((prev) => [
      ...prev,
      {
        id: `gm-${Date.now()}`,
        firstName: '',
        lastName: '',
        wowClass: 'Warrior',
        race: racesForClass('Warrior')[0],
        spec: CLASS_SPECS.Warrior[0].label,
        offSpec: 'Yok',
        role: CLASS_SPECS.Warrior[0].role,
        isMain: isFirst,
        professions: ['Yok', 'Yok'],
        attunements: { onyxia: false, mc: false, bwl: false, naxx: false },
      },
    ])
  }

  const removeCharacter = (id: string) => {
    setCharacters((prev) => {
      const next = prev.filter((c) => c.id !== id)
      if (next.length > 0 && !next.some((c) => c.isMain)) next[0].isMain = true
      return next
    })
  }

  const cycleDay = (dayKey: string) => {
    if (!profile) return
    const current = profile.availability[dayKey]?.status || 'busy'
    const nextStatus: AvailabilityStatus =
      current === 'busy' ? 'available' : current === 'available' ? 'maybe' : 'busy'
    setProfile({
      ...profile,
      skipRaidsForNow: false,
      availability: {
        ...profile.availability,
        [dayKey]: { ...(profile.availability[dayKey] || defaultDayAvailability()), status: nextStatus },
      },
    })
  }

  const handleSave = async (checkArmory = false) => {
    if (!username || !profile) return
    setSaving(true)
    setNicknameError(null)
    try {
      const res = await fetch('/api/admin/member-profile', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          targetUsername: username,
          email: accountEmail,
          role,
          profile,
          characters,
          checkArmory,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string
        field?: string
        member?: {
          username: string
          role: GuildRank
          mainCharacter: string
          wowClass: WowClass
          spec: string
        }
      }
      if (!res.ok) {
        if (res.status === 409 && data.field === 'nickname') {
          setNicknameError(data.error || 'Bu profil ismi kullanılıyor.')
          setSection('info')
        }
        toast({
          variant: 'error',
          title: 'Kaydedilemedi',
          description: data.error || 'Üye profili güncellenemedi.',
        })
        return
      }
      toast({
        title: 'Üye Profili Güncellendi ✅',
        description: `${username} hesabındaki GM değişiklikleri kalıcı olarak kaydedildi.`,
      })
      if (data.member) onSaved(data.member)
      onClose()
    } catch {
      toast({ variant: 'error', title: 'Bağlantı Hatası', description: 'Sunucuya ulaşılamadı.' })
    } finally {
      setSaving(false)
    }
  }

  if (!username) return null

  return (
    <Modal
      open={Boolean(username)}
      onClose={onClose}
      title={`GM Profil Düzenleme — ${username}`}
      description="Yalnızca Guild Master (GM) bu ekrandan üyelerin tüm profil, karakter ve müsaitlik bilgilerini düzenleyip kaydedebilir."
      className="max-w-3xl"
    >
      {loading || !profile ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-gold" />
          Üye profili yükleniyor...
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Sub-tabs */}
          <div className="flex flex-wrap gap-2 border-b border-border pb-3">
            {[
              { id: 'info' as const, label: 'Kişisel & Hesap', icon: User },
              { id: 'characters' as const, label: `Karakterler (${characters.length})`, icon: Shield },
              { id: 'availability' as const, label: 'Haftalık Müsaitlik', icon: Calendar },
            ].map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSection(t.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition cursor-pointer',
                    section === t.id
                      ? 'border-gold bg-gold/15 text-gold'
                      : 'border-border bg-background/60 text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="size-3.5" />
                  {t.label}
                </button>
              )
            })}
          </div>

          {section === 'info' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-silver">Gerçek İsim Soyisim</label>
                <input
                  value={profile.fullName}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  placeholder="İsim Soyisim"
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-silver flex items-center justify-between">
                  <span>Profil İsmi / Nick</span>
                  {nicknameError && <span className="text-[10px] font-bold text-red-400">Kullanılıyor</span>}
                </label>
                <input
                  value={profile.nickname}
                  onChange={(e) => {
                    setProfile({ ...profile, nickname: e.target.value })
                    if (nicknameError) setNicknameError(null)
                  }}
                  placeholder="Profil ismi / Nick"
                  className={cn(inputClass, nicknameError && 'border-red-500/80 ring-2 ring-red-500/25')}
                />
                {nicknameError && <span className="text-[11px] text-red-400">{nicknameError}</span>}
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-silver">E-posta Adresi</label>
                <input
                  type="email"
                  value={accountEmail}
                  disabled={role === 'Guild Master'}
                  onChange={(e) => {
                    setAccountEmail(e.target.value)
                    setProfile({ ...profile, email: e.target.value })
                  }}
                  placeholder="eposta@ornek.com"
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-silver">Lonca Rütbesi</label>
                <select
                  value={role}
                  disabled={role === 'Guild Master'}
                  onChange={(e) => setRole(e.target.value as GuildRank)}
                  className={inputClass}
                >
                  {role === 'Guild Master' && <option value="Guild Master">Guild Master (GM)</option>}
                  <option value="Görevli">Görevli</option>
                  <option value="Raider">Raider</option>
                  <option value="Turx">Turx</option>
                  <option value="Alt">Alt</option>
                  <option value="Sosyal">Sosyal</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-silver">Doğum Tarihi</label>
                <input
                  type="date"
                  value={profile.birthDate}
                  onChange={(e) => setProfile({ ...profile, birthDate: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-silver">Cinsiyet</label>
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

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-silver">Battle.net Real ID</label>
                <input
                  value={profile.bnetId}
                  onChange={(e) => setProfile({ ...profile, bnetId: e.target.value })}
                  placeholder="BattleTag#1234"
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-silver">Discord Kullanıcı Adı</label>
                <input
                  value={profile.discordTag}
                  onChange={(e) => setProfile({ ...profile, discordTag: e.target.value })}
                  placeholder="Discord kullanıcı adı"
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="font-semibold text-silver">Telefon Numarası</label>
                <div className="flex gap-2">
                  <select
                    value={profile.phoneCountry}
                    onChange={(e) => setProfile({ ...profile, phoneCountry: e.target.value })}
                    className={cn(inputClass, 'w-32 shrink-0')}
                  >
                    <option value="+90">+90 (TR)</option>
                    <option value="+49">+49 (DE)</option>
                    <option value="+44">+44 (UK)</option>
                    <option value="+1">+1 (US)</option>
                    <option value="+31">+31 (NL)</option>
                    <option value="+33">+33 (FR)</option>
                    <option value="+43">+43 (AT)</option>
                  </select>
                  <input
                    value={profile.phoneNumber}
                    onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
                    placeholder="5XX XXX XX XX"
                    className={cn(inputClass, 'flex-1')}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-silver">Twitch Kanalı</label>
                <input
                  value={profile.twitchLogin}
                  onChange={(e) => setProfile({ ...profile, twitchLogin: e.target.value })}
                  placeholder="kullaniciadi"
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-silver">Kick / YouTube</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={profile.kickLogin}
                    onChange={(e) => setProfile({ ...profile, kickLogin: e.target.value })}
                    placeholder="Kick"
                    className={inputClass}
                  />
                  <input
                    value={profile.youtubeHandle}
                    onChange={(e) => setProfile({ ...profile, youtubeHandle: e.target.value })}
                    placeholder="@youtube"
                    className={inputClass}
                  />
                </div>
              </div>

              <label className="sm:col-span-2 flex items-center gap-2.5 rounded-lg border border-border bg-background/50 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.showRealNameInRoster}
                  onChange={(e) => setProfile({ ...profile, showRealNameInRoster: e.target.checked })}
                  className="accent-[#d4af37]"
                />
                <span className="text-silver font-medium">Guild Kadrosunda gerçek isim görünsün</span>
              </label>
            </div>
          )}

          {section === 'characters' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Karakter isimlerini, Main durumunu, sınıf/spec ve meslekleri düzenleyebilirsiniz.
                </span>
                <GhostButton type="button" onClick={addEmptyCharacter} className="text-xs py-1 px-2.5 cursor-pointer">
                  <Plus className="size-3.5" /> Karakter Ekle
                </GhostButton>
              </div>

              {characters.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  Bu hesapta henüz kayıtlı karakter yok.
                </p>
              ) : (
                <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1">
                  {characters.map((ch) => (
                    <div
                      key={ch.id}
                      className={cn(
                        'rounded-xl border p-3.5 flex flex-col gap-2.5',
                        ch.isMain ? 'border-gold/60 bg-gold/[0.06]' : 'border-border bg-background/60',
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateChar(ch.id, { isMain: true })}
                            className={cn(
                              'rounded-full border px-2.5 py-0.5 text-[10px] font-bold cursor-pointer',
                              ch.isMain
                                ? 'border-success/60 bg-success/20 text-success'
                                : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground',
                            )}
                          >
                            {ch.isMain ? '★ MAIN' : 'Main Yap'}
                          </button>
                          {ch.isMain && ch.armoryVerified && (ch.armoryGuild || '').toUpperCase() === 'TURX' ? (
                            <Badge className="border-success/40 bg-success/10 text-success text-[10px]">
                              <ShieldCheck className="size-3 mr-0.5" /> TURX Armory Onaylı
                            </Badge>
                          ) : ch.isMain ? (
                            <Badge className="border-amber-400/40 bg-amber-400/10 text-amber-300 text-[10px]">
                              <ShieldAlert className="size-3 mr-0.5" /> Armory Bekliyor
                            </Badge>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCharacter(ch.id)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded cursor-pointer"
                          title="Karakteri Sil"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={ch.firstName}
                          onChange={(e) => updateChar(ch.id, { firstName: e.target.value })}
                          placeholder="Karakter Adı"
                          className={inputClass}
                        />
                        <input
                          value={ch.lastName}
                          onChange={(e) => updateChar(ch.id, { lastName: e.target.value })}
                          placeholder="Karakter Soyadı"
                          className={inputClass}
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <select
                          value={ch.wowClass}
                          onChange={(e) => updateChar(ch.id, { wowClass: e.target.value as WowClass })}
                          className={inputClass}
                        >
                          {WOW_CLASSES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <select
                          value={ch.race}
                          onChange={(e) => updateChar(ch.id, { race: e.target.value })}
                          className={inputClass}
                        >
                          {racesForClass(ch.wowClass).map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        <select
                          value={ch.spec}
                          onChange={(e) => updateChar(ch.id, { spec: e.target.value })}
                          className={inputClass}
                        >
                          {CLASS_SPECS[ch.wowClass].map((s) => (
                            <option key={s.label} value={s.label}>{s.label}</option>
                          ))}
                        </select>
                        <select
                          value={ch.offSpec}
                          onChange={(e) => updateChar(ch.id, { offSpec: e.target.value })}
                          className={inputClass}
                        >
                          <option value="Yok">OS: Yok</option>
                          {CLASS_SPECS[ch.wowClass].map((s) => (
                            <option key={s.label} value={s.label}>{s.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={ch.professions[0] || 'Yok'}
                          onChange={(e) => updateChar(ch.id, { professions: [e.target.value, ch.professions[1] || 'Yok'] })}
                          className={inputClass}
                        >
                          {PROFESSIONS.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                        <select
                          value={ch.professions[1] || 'Yok'}
                          onChange={(e) => updateChar(ch.id, { professions: [ch.professions[0] || 'Yok', e.target.value] })}
                          className={inputClass}
                        >
                          {PROFESSIONS.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {section === 'availability' && (
            <div className="flex flex-col gap-4">
              <label className="flex items-center gap-3 rounded-xl border border-gold/40 bg-gold/10 p-3 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.skipRaidsForNow}
                  onChange={(e) => setProfile({ ...profile, skipRaidsForNow: e.target.checked })}
                  className="accent-[#d4af37] size-4"
                />
                <span className="font-bold text-gold">RAIDLERE KATILMAYI ŞİMDİLİK DÜŞÜNMÜYORUM</span>
              </label>

              <div className={cn('grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2', profile.skipRaidsForNow && 'opacity-50')}>
                {DAYS_OF_WEEK.map(({ key, label }) => {
                  const d = profile.availability[key] || defaultDayAvailability()
                  const cls =
                    d.status === 'available'
                      ? 'border-success/60 bg-success/15 text-success'
                      : d.status === 'maybe'
                        ? 'border-gold/60 bg-gold/15 text-gold'
                        : 'border-destructive/60 bg-destructive/10 text-destructive'
                  return (
                    <div key={key} className="flex flex-col gap-1.5 rounded-lg border border-border bg-background/60 p-2">
                      <button
                        type="button"
                        onClick={() => cycleDay(key)}
                        className={cn('rounded-md border py-1.5 text-xs font-bold cursor-pointer', cls)}
                      >
                        {label}
                        <span className="block text-[10px]">
                          {d.status === 'available' ? 'Müsait' : d.status === 'maybe' ? 'Belki' : 'Meşgul'}
                        </span>
                      </button>
                      <select
                        value={d.startTime}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            availability: {
                              ...profile.availability,
                              [key]: { ...d, startTime: e.target.value },
                            },
                          })
                        }
                        className="rounded border border-border bg-background px-1 py-0.5 text-[10px] font-mono text-silver"
                      >
                        {START_TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <select
                        value={d.endTime}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            availability: {
                              ...profile.availability,
                              [key]: { ...d, endTime: e.target.value },
                            },
                          })
                        }
                        className="rounded border border-border bg-background px-1 py-0.5 text-[10px] font-mono text-silver"
                      >
                        {END_TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border">
            <GhostButton
              type="button"
              disabled={saving}
              onClick={() => void handleSave(true)}
              className="text-xs py-2 px-3 cursor-pointer"
              title="Kaydet ve Main karakteri WoW Forever Armory'den yeniden doğrula"
            >
              <RefreshCw className={cn('size-3.5', saving && 'animate-spin')} />
              Armory Kontrolüyle Kaydet
            </GhostButton>
            <div className="flex items-center gap-2">
              <GhostButton type="button" onClick={onClose} className="text-xs py-2 px-3 cursor-pointer">
                Vazgeç
              </GhostButton>
              <GoldButton type="button" disabled={saving} onClick={() => void handleSave(false)} className="text-xs py-2 px-4 cursor-pointer">
                <Save className="size-3.5" />
                {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </GoldButton>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
