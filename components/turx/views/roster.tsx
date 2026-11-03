'use client'

import { BarChart3, Crown, Search, UserCheck, Users, Star, Wrench, Shield, Swords, Cross, Target } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { CLASS_COLORS, type WowClass } from '@/lib/guild-data'
import { cn } from '@/lib/utils'
import { useToast } from '../toast'
import { useAuth, type GuildRank } from '../auth-provider' // Auth entegrasyonu
import { Badge, Panel, PanelTitle, SectionHeader, inputClass } from '../ui'

type ExtendedRole = 'TANK' | 'HEALER' | 'MELEE' | 'RANGED'

interface StoredCharacter {
  id: string
  firstName: string
  lastName: string
  wowClass: WowClass
  race: string
  spec: string
  offSpec?: string
  role: ExtendedRole
  isMain: boolean
  professions?: [string, string]
  attunements?: {
    onyxia?: boolean
    hyjal?: boolean
  }
}

type ServerCharacter = StoredCharacter & { firstName?: string; lastName?: string }

type ServerMember = {
  username: string
  role: GuildRank
  profile?: { fullName?: string } | null
  characters?: ServerCharacter[]
}

interface RosterMemberRow {
  id: string
  charName: string
  realName: string
  level: number
  race: string
  wowClass: WowClass
  spec: string
  offSpec: string
  role: ExtendedRole
  rank: GuildRank
  type: 'Main' | 'Alt'
  professions: [string, string]
  attunements: {
    onyxia: boolean
    hyjal: boolean
  }
}

const RANK_STYLES: Record<GuildRank, string> = {
  'Guild Master': 'border-gold/60 bg-gold/15 text-gold',
  'Officer': 'border-neon/50 bg-neon/10 text-neon',
  'Raid Leader': 'border-azure/50 bg-azure/10 text-azure',
  'Raider': 'border-success/40 bg-success/10 text-success',
  'Member': 'border-border text-muted-foreground',
}

function isWowClass(value: string | undefined): value is WowClass {
  return Boolean(value && value in CLASS_COLORS)
}

function mapServerMembers(accounts: ServerMember[]): RosterMemberRow[] {
  return accounts.flatMap((account) => {
    const chars = Array.isArray(account.characters) ? account.characters : []
    const displayName = (account.profile?.fullName || account.username).trim()
    return chars
      .filter((character) => character.firstName?.trim() && character.lastName?.trim())
      .map((character, index) => ({
        id: character.id || `${account.username}-${index}`,
        charName: `${character.firstName} ${character.lastName}`,
        realName: displayName,
        level: 1,
        race: character.race || '—',
        wowClass: isWowClass(character.wowClass) ? character.wowClass : 'Warrior',
        spec: character.spec || '—',
        offSpec: character.offSpec || 'Yok',
        role: character.role || 'MELEE',
        rank: account.role,
        type: character.isMain ? 'Main' : 'Alt',
        professions: character.professions || ['Yok', 'Yok'],
        attunements: {
          onyxia: Boolean(character.attunements?.onyxia),
          hyjal: Boolean(character.attunements?.hyjal),
        },
      }))
  })
}

function RoleIcon({ role }: { role: ExtendedRole }) {
  switch (role) {
    case 'TANK': return <Shield className="size-3.5 text-azure inline mr-1" />
    case 'HEALER': return <Cross className="size-3.5 text-success inline mr-1" />
    case 'MELEE': return <Swords className="size-3.5 text-gold inline mr-1" />
    case 'RANGED': return <Target className="size-3.5 text-neon inline mr-1" />
    default: return null
  }
}

function ClassBreakdown({ members }: { members: RosterMemberRow[] }) {
  const counts = Object.keys(CLASS_COLORS).map((c) => ({
    wowClass: c as WowClass,
    count: members.filter((m) => m.wowClass === c).length,
  }))
  const max = Math.max(...counts.map((c) => c.count), 1)
  return (
    <Panel>
      <PanelTitle icon={BarChart3}>Class Dağılımı</PanelTitle>
      <ul className="flex flex-col gap-2">
        {counts.map((c) => (
          <li key={c.wowClass} className="flex items-center gap-2 text-xs">
            <span className="w-16 shrink-0" style={{ color: CLASS_COLORS[c.wowClass] }}>
              {c.wowClass}
            </span>
            <span className="h-2 flex-1 rounded-full bg-muted">
              <span
                className="block h-full rounded-full"
                style={{ width: `${(c.count / max) * 100}%`, backgroundColor: CLASS_COLORS[c.wowClass] }}
              />
            </span>
            <span className="w-4 text-right text-silver tabular-nums">{c.count}</span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

export function RosterView() {
  const toast = useToast()
  const { user } = useAuth() // Aktif oturum ve rütbe bilgisi
  const currentUserRole = user?.role || 'Member'
  
  // Sadece GM veya Officer rütbeleri yönetim yapabilir
  const canManageRanks = currentUserRole === 'Guild Master' || currentUserRole === 'Officer'

  const [query, setQuery] = useState('')
  const [cls, setCls] = useState<WowClass | 'all'>('all')
  const [role, setRole] = useState<string | 'all'>('all')
  const [rank, setRank] = useState<GuildRank | 'all'>('all')
  const [professionFilter, setProfessionFilter] = useState<string>('all')
  const [hideAlts, setHideAlts] = useState(false)

  const [defaultMembers, setDefaultMembers] = useState<RosterMemberRow[]>([])

  useEffect(() => {
    let cancelled = false
    fetch('/api/roster')
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as { members?: ServerMember[] }
        if (!response.ok || cancelled) return
        setDefaultMembers(mapServerMembers(Array.isArray(data.members) ? data.members : []))
      })
      .catch(() => {
        if (!cancelled) setDefaultMembers([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const rosterMembers = defaultMembers

  const handleRankChange = (memberId: string, newRank: GuildRank) => {
    if (!canManageRanks) {
      toast({ title: 'Yetki Hatası', description: 'Bu işlem için GM veya Officer yetkisi gereklidir.' })
      return
    }

    setDefaultMembers(prev => prev.map(m => m.id === memberId ? { ...m, rank: newRank } : m))
    toast({
      title: 'Guild Rank Güncellendi',
      description: `Üyenin yeni rütbesi başarıyla "${newRank}" olarak ayarlandı.`,
    })
  }

  const players = new Set(rosterMembers.map((m) => m.realName)).size
  const totalChars = rosterMembers.length

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR')
    return rosterMembers.filter((m) => {
      const matchesQuery = !q || [m.charName, m.realName, m.wowClass, m.role, m.spec, m.offSpec].some((v) => v.toLocaleLowerCase('tr-TR').includes(q))
      const matchesClass = cls === 'all' || m.wowClass === cls
      const matchesRole = role === 'all' || m.role === role
      const matchesRank = rank === 'all' || m.rank === rank
      const matchesProf = professionFilter === 'all' || m.professions.includes(professionFilter)
      const matchesAlt = !hideAlts || m.type === 'Main'

      return matchesQuery && matchesClass && matchesRole && matchesRank && matchesProf && matchesAlt
    })
  }, [query, cls, role, rank, professionFilter, hideAlts, rosterMembers])

  return (
    <div className="flex flex-col gap-8 pb-10">
      <SectionHeader
        eyebrow="Phase 1 Hazırlıkları"
        title="Guild Kadrosu & Roster Yönetimi"
        description={`Aktif Oturum Rütbesi: ${currentUserRole} ${canManageRanks ? '· (Yönetim Yetkisi Aktif)' : '· (Salt Okunur)'}`}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Panel className="flex items-start gap-4 self-start">
          <span className="rounded-lg bg-neon/10 p-2.5 text-neon"><Users className="size-5" /></span>
          <div>
            <p className="text-xs text-muted-foreground">Toplam Oyuncu</p>
            <p className="font-display text-3xl font-black text-foreground tabular-nums">{players}</p>
            <p className="text-xs text-silver/80">Discord onaylı</p>
          </div>
        </Panel>
        <Panel className="flex items-start gap-4 self-start">
          <span className="rounded-lg bg-gold/10 p-2.5 text-gold"><UserCheck className="size-5" /></span>
          <div>
            <p className="text-xs text-muted-foreground">Karakter Havuzu</p>
            <p className="font-display text-3xl font-black text-foreground tabular-nums">{totalChars}</p>
            <p className="text-xs text-silver/80">{rosterMembers.filter(m => m.type === 'Main').length} Main · {rosterMembers.filter(m => m.type === 'Alt').length} Alt</p>
          </div>
        </Panel>
        <ClassBreakdown members={rosterMembers} />
      </div>

      <Panel className="mt-6 p-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Karakter, Gerçek İsim, Sınıf, Spec ara..."
              className={cn(inputClass, 'pl-9')}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <select aria-label="Class filtresi" value={cls} onChange={(e) => setCls(e.target.value as WowClass | 'all')} className={inputClass}>
              <option value="all">Tüm Sınıflar</option>
              {Object.keys(CLASS_COLORS).map((c) => (<option key={c}>{c}</option>))}
            </select>
            <select aria-label="Role filtresi" value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
              <option value="all">Tüm Roller</option>
              <option value="TANK">Tank</option>
              <option value="HEALER">Healer</option>
              <option value="MELEE">Melee</option>
              <option value="RANGED">Ranged</option>
            </select>
            <select aria-label="Rank filtresi" value={rank} onChange={(e) => setRank(e.target.value as GuildRank | 'all')} className={inputClass}>
              <option value="all">Tüm Ranklar</option>
              <option value="Guild Master">Guild Master</option>
              <option value="Officer">Officer</option>
              <option value="Raid Leader">Raid Leader</option>
              <option value="Raider">Raider</option>
              <option value="Member">Member</option>
            </select>
            <select aria-label="Meslek filtresi" value={professionFilter} onChange={(e) => setProfessionFilter(e.target.value)} className={inputClass}>
              <option value="all">Tüm Meslekler</option>
              <option value="Alchemy">Alchemy</option>
              <option value="Blacksmithing">Blacksmithing</option>
              <option value="Enchanting">Enchanting</option>
              <option value="Engineering">Engineering</option>
              <option value="Herbalism">Herbalism</option>
              <option value="Leatherworking">Leatherworking</option>
              <option value="Mining">Mining</option>
              <option value="Skinning">Skinning</option>
              <option value="Tailoring">Tailoring</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-2.5 bg-card/40 border-b border-border">
          <span className="text-xs text-muted-foreground">Tablo Görünüm Ayarları</span>
          <button
            type="button"
            onClick={() => setHideAlts(!hideAlts)}
            className={cn(
              "relative flex items-center h-7 w-36 rounded-full p-1 transition-colors duration-300 focus:outline-none cursor-pointer border text-xs font-semibold",
              hideAlts ? "bg-gold/20 border-gold/60 text-gold shadow-[0_0_10px_rgb(212,175,55/0.2)]" : "bg-background border-border text-muted-foreground"
            )}
          >
            <span className="w-full text-center">{hideAlts ? '✨ Sadece Mainler' : '👥 Tüm Karakterler'}</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <caption className="sr-only">Lonca üye listesi</caption>
            <thead className="text-xs tracking-wider text-muted-foreground uppercase">
              <tr className="border-b border-border">
                {['Karakter / Oyuncu', 'Level', 'Race', 'Class / Spec / Rol', 'Guild Rank', 'Main/Alt', 'Meslekler', 'Attunements'].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((m) => (
                <tr key={m.id} className="transition hover:bg-neon/[0.03]">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 font-bold" style={{ color: CLASS_COLORS[m.wowClass] }}>
                      {m.rank === 'Guild Master' && <Crown className="size-3.5 text-gold shrink-0" />}
                      {m.charName}
                    </span>
                    <span className="block text-xs text-silver font-medium">{m.realName}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">Level {m.level}</td>
                  <td className="px-4 py-3 text-silver">{m.race}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold" style={{ color: CLASS_COLORS[m.wowClass] }}>{m.wowClass} ({m.spec})</span>
                    <span className="block text-xs text-muted-foreground">OS: {m.offSpec}</span>
                    <span className="block text-xs font-semibold mt-0.5">
                      <RoleIcon role={m.role} /> <span className="text-silver">{m.role}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge className={RANK_STYLES[m.rank]}>{m.rank}</Badge>
                      {/* Sadece GM veya Officer yetkisi varsa rank değiştirme select'i gösterilir */}
                      {canManageRanks && (
                        <select
                          aria-label="Üye rütbesini değiştir"
                          value={m.rank}
                          onChange={(e) => handleRankChange(m.id, e.target.value as GuildRank)}
                          className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px] text-foreground cursor-pointer hover:border-gold/50 transition"
                        >
                          <option value="Guild Master">Guild Master</option>
                          <option value="Officer">Officer</option>
                          <option value="Raid Leader">Raid Leader</option>
                          <option value="Raider">Raider</option>
                          <option value="Member">Member</option>
                        </select>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={m.type === 'Main' ? 'border-gold/40 text-gold bg-gold/10' : 'border-border text-silver bg-muted/30'}>
                      {m.type === 'Main' && <Star className="size-3 fill-gold mr-1 inline" />}
                      {m.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-silver">
                    <span className="flex items-center gap-1">
                      <Wrench className="size-3 text-muted-foreground" /> {m.professions.join(', ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className={cn("px-1.5 py-0.5 rounded border", m.attunements?.onyxia ? "border-success/40 bg-success/10 text-success" : "border-border text-muted-foreground")}>Ony</span>
                      <span className={cn("px-1.5 py-0.5 rounded border", m.attunements?.hyjal ? "border-success/40 bg-success/10 text-success" : "border-border text-muted-foreground")}>Hyjal</span>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    {rosterMembers.length === 0
                      ? 'Henüz kayıtlı karakter yok. Üyeler profilini doldurunca burada görünür.'
                      : 'Aramanızı eşleşen karakter bulunamadı.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
          {filtered.length} / {rosterMembers.length} karakter gösteriliyor
        </p>
      </Panel>
    </div>
  )
}