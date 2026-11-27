'use client'

import { Crown, Search, Star, Wrench, Shield, Swords, Cross, Target } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { authHeaders } from '@/lib/client-session'
import { CLASS_COLORS, type WowClass } from '@/lib/guild-data'
import { cn } from '@/lib/utils'
import { classIconUrl, type ArmorySnapshot } from '@/lib/wow-armory'
import { useToast } from '../toast'
import { useAuth, type GuildRank } from '../auth-provider' // Auth entegrasyonu
import { RosterSummarySection, type RosterSummaryStats } from '../roster-summary'
import { Badge, Panel, PointsPill, SectionHeader, inputClass } from '../ui'

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

type ServerCharacter = StoredCharacter & { firstName?: string; lastName?: string; armory?: ArmorySnapshot | null }

type ServerMember = {
  username: string
  role: GuildRank
  profile?: { fullName?: string; showRealName?: boolean } | null
  bnet?: {
    tag: string
    connected: boolean
    online: boolean
    inGame?: boolean
    gameTitle?: string | null
  }
  discord?: {
    tag: string
    connected: boolean
    online: boolean
    status?: string
    channel?: string | null
  }
  characters?: ServerCharacter[]
}

interface RosterMemberRow {
  id: string
  username: string
  charName: string
  realName: string
  level: number | null
  race: string
  wowClass: WowClass
  spec: string
  offSpec: string
  role: ExtendedRole
  rank: GuildRank
  bnet?: {
    tag: string
    connected: boolean
    online: boolean
    inGame?: boolean
    gameTitle?: string | null
  }
  discord?: {
    tag: string
    connected: boolean
    online: boolean
    status?: string
    channel?: string | null
  }
  type: 'Main' | 'Alt'
  professions: [string, string]
  attunements: {
    onyxia: boolean
    hyjal: boolean
  }
  armoryUrl: string | null
  avatarUrl: string | null
  renderUrl: string | null
  classIconUrl: string
}

const RANK_STYLES: Record<string, string> = {
  'Guild Master': 'border-gold/60 bg-gold/15 text-gold',
  'Görevli': 'border-neon/50 bg-neon/10 text-neon',
  'Raider': 'border-gold/50 bg-gold/15 text-gold',
  'Turx': 'border-azure/50 bg-azure/10 text-azure',
  'Alt': 'border-purple-500/40 bg-purple-500/10 text-purple-300',
  'Sosyal': 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  'Officer': 'border-neon/50 bg-neon/10 text-neon',
  'Raid Leader': 'border-azure/50 bg-azure/10 text-azure',
  'Member': 'border-border text-muted-foreground',
}

function isWowClass(value: string | undefined): value is WowClass {
  return Boolean(value && value in CLASS_COLORS)
}

function mapServerMembers(accounts: ServerMember[]): RosterMemberRow[] {
  return accounts.flatMap((account) => {
    const chars = Array.isArray(account.characters) ? account.characters : []
    const displayName = (account.profile?.fullName || '').trim()
    return chars
      .filter((character) => character.firstName?.trim() && character.lastName?.trim())
      .map((character, index) => {
        const wowClass = isWowClass(character.wowClass) ? character.wowClass : 'Warrior'
        return {
          id: character.id || `${account.username}-${index}`,
          username: account.username,
          charName: `${character.firstName} ${character.lastName}`,
          realName: displayName,
          level: typeof character.armory?.level === 'number' ? character.armory.level : null,
          race: character.race || '—',
          wowClass,
          spec: character.spec || '—',
          offSpec: character.offSpec || 'Yok',
          role: character.role || 'MELEE',
          rank: account.role,
          bnet: account.bnet,
          discord: account.discord,
          type: character.isMain ? 'Main' : 'Alt',
          professions: character.professions || ['Yok', 'Yok'],
          attunements: {
            onyxia: Boolean(character.attunements?.onyxia),
            hyjal: Boolean(character.attunements?.hyjal),
          },
          armoryUrl: character.armory?.url || null,
          avatarUrl: character.armory?.avatarUrl || character.armory?.renderUrl || null,
          renderUrl: character.armory?.renderUrl || null,
          classIconUrl: character.armory?.classIconUrl || classIconUrl(wowClass),
        }
      })
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

export function RosterView() {
  const toast = useToast()
  const { user } = useAuth()
  const currentUserRole = user?.role || 'Turx'

  const [query, setQuery] = useState('')
  const [cls, setCls] = useState<WowClass | 'all'>('all')
  const [role, setRole] = useState<string | 'all'>('all')
  const [rank, setRank] = useState<GuildRank | 'all'>('all')
  const [professionFilter, setProfessionFilter] = useState<string>('all')
  const [hideAlts, setHideAlts] = useState(false)

  const [defaultMembers, setDefaultMembers] = useState<RosterMemberRow[]>([])
  const [pointsByUser, setPointsByUser] = useState<Map<string, number> | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/roster', { credentials: 'same-origin', headers: authHeaders(), cache: 'no-store' })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as { members?: ServerMember[] }
        if (!response.ok || cancelled) return
        setDefaultMembers(mapServerMembers(Array.isArray(data.members) ? data.members : []))
      })
      .catch(() => {
        if (!cancelled) setDefaultMembers([])
      })

    if (!user) {
      setPointsByUser(null)
    } else {
      fetch('/api/raid-system', { credentials: 'same-origin', headers: authHeaders(), cache: 'no-store' })
        .then(async (response) => {
          const data = (await response.json().catch(() => ({}))) as {
            locked?: boolean
            isOfficer?: boolean
            publicModules?: { attendance?: boolean }
            attendanceLeaderboard?: { username: string; totalPoints: number }[]
          }
          if (!response.ok || cancelled || data.locked) return
          if (!data.isOfficer && !data.publicModules?.attendance) return
          const map = new Map<string, number>()
          for (const row of data.attendanceLeaderboard || []) {
            map.set(row.username.toLowerCase(), row.totalPoints)
          }
          setPointsByUser(map)
        })
        .catch(() => undefined)
    }

    return () => {
      cancelled = true
    }
  }, [user?.username])

  const rosterMembers = defaultMembers

  const summaryStats = useMemo<RosterSummaryStats>(() => {
    const wowClasses = Object.keys(CLASS_COLORS) as WowClass[]
    const mainClasses = Object.fromEntries(wowClasses.map((c) => [c, 0])) as Record<WowClass, number>
    const altClasses = Object.fromEntries(wowClasses.map((c) => [c, 0])) as Record<WowClass, number>
    const mains = rosterMembers.filter((m) => m.type === 'Main')
    const alts = rosterMembers.filter((m) => m.type === 'Alt')
    for (const m of mains) mainClasses[m.wowClass] = (mainClasses[m.wowClass] || 0) + 1
    for (const m of alts) altClasses[m.wowClass] = (altClasses[m.wowClass] || 0) + 1
    return {
      totalPlayers: new Set(rosterMembers.map((m) => m.realName || m.username)).size,
      totalCharacters: rosterMembers.length,
      mainCount: mains.length,
      altCount: alts.length,
      mainRoles: {
        tank: mains.filter((m) => m.role === 'TANK').length,
        healer: mains.filter((m) => m.role === 'HEALER').length,
        dps: mains.filter((m) => m.role === 'MELEE' || m.role === 'RANGED').length,
      },
      mainClasses,
      altClasses,
    }
  }, [rosterMembers])

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
        description="WoW: Forever Alliance lonca kadrosu, sınıf dağılımı ve anlık Battle.net / Discord durumu"
      />

      <RosterSummarySection stats={summaryStats} />

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
              <option value="Görevli">Görevli</option>
              <option value="Turx">Turx</option>
              <option value="Alt">Alt</option>
              <option value="Sosyal">Sosyal</option>
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
                {['Karakter / Oyuncu', 'Level', 'Race', 'Class / Spec / Rol', 'Guild Rank', 'Battle.net', 'Discord', 'Main/Alt', 'Meslekler'].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((m) => (
                <tr key={m.id} className="transition hover:bg-neon/[0.03]">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2.5">
                      {m.avatarUrl ? (
                        <img
                          src={m.avatarUrl}
                          alt={`${m.charName} portresi`}
                          width={40}
                          height={40}
                          className="size-10 shrink-0 rounded-md border border-border object-cover"
                        />
                      ) : (
                        <img
                          src={m.classIconUrl}
                          alt=""
                          width={40}
                          height={40}
                          className="size-10 shrink-0 rounded-md border border-border"
                        />
                      )}
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 font-bold" style={{ color: CLASS_COLORS[m.wowClass] }}>
                          {m.rank === 'Guild Master' && <Crown className="size-3.5 text-gold shrink-0" />}
                          {m.armoryUrl ? (
                            <a
                              href={m.armoryUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline underline-offset-2"
                              aria-label={`${m.charName} Forever Armory`}
                            >
                              {m.charName}
                            </a>
                          ) : (
                            m.charName
                          )}
                          {pointsByUser && m.type === 'Main' && (
                            <PointsPill points={pointsByUser.get(m.username.toLowerCase()) ?? 0} />
                          )}
                        </span>
                        {m.realName ? (
                          <span className="block text-xs text-silver font-medium">{m.realName}</span>
                        ) : null}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {m.level == null ? '—' : `Level ${m.level}`}
                  </td>
                  <td className="px-4 py-3 text-silver">{m.race}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 font-semibold" style={{ color: CLASS_COLORS[m.wowClass] }}>
                      <img
                        src={m.classIconUrl}
                        alt=""
                        width={18}
                        height={18}
                        className="size-[18px] shrink-0 rounded-sm border border-black/40"
                      />
                      {m.wowClass} ({m.spec})
                    </span>
                    <span className="block text-xs text-muted-foreground">OS: {m.offSpec}</span>
                    <span className="block text-xs font-semibold mt-0.5">
                      <RoleIcon role={m.role} /> <span className="text-silver">{m.role}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={RANK_STYLES[m.rank]}>{m.rank}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {m.bnet?.connected || m.bnet?.inGame ? (
                      <div
                        className="flex flex-col gap-0.5"
                        title={
                          m.bnet.inGame
                            ? `Oyunda: ${m.bnet.gameTitle || 'World of Warcraft: Forever'}`
                            : m.bnet.online
                              ? 'Battle.net Çevrimiçi'
                              : 'Battle.net Çevrimdışı'
                        }
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "size-2.5 rounded-full shrink-0 transition-colors",
                              m.bnet.inGame
                                ? "bg-emerald-400 shadow-[0_0_8px_rgb(52,211,153/0.9)] animate-pulse"
                                : m.bnet.online
                                  ? "bg-emerald-400 shadow-[0_0_6px_rgb(52,211,153/0.8)]"
                                  : "bg-red-500/80 shadow-[0_0_6px_rgb(239,68,68/0.5)]"
                            )}
                          />
                          <span
                            className={cn(
                              "font-mono text-xs truncate max-w-[125px]",
                              m.bnet.inGame
                                ? "text-white font-semibold"
                                : m.bnet.online
                                  ? "text-silver font-medium"
                                  : "text-muted-foreground/75"
                            )}
                          >
                            {m.bnet.tag || m.charName.split(' ')[0]}
                          </span>
                        </div>
                        {m.bnet.inGame ? (
                          <div className="flex items-center gap-1 pl-4">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              Oyunda
                            </span>
                            {m.bnet.gameTitle && !m.bnet.gameTitle.toLowerCase().includes('world of warcraft') ? (
                              <span className="text-[10px] text-muted-foreground truncate max-w-[80px]" title={m.bnet.gameTitle}>
                                {m.bnet.gameTitle}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-muted-foreground/50 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {m.discord?.connected ? (
                      <div
                        className="flex flex-col gap-0.5"
                        title={
                          m.discord.online
                            ? (m.discord.status === 'idle'
                                ? 'Discord Boşta'
                                : m.discord.status === 'dnd'
                                  ? 'Discord Rahatsız Etmeyin'
                                  : 'Discord Çevrimiçi')
                            : 'Discord Çevrimdışı'
                        }
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "size-2.5 rounded-full shrink-0 transition-colors",
                              m.discord.online
                                ? (m.discord.status === 'idle'
                                    ? "bg-amber-400 shadow-[0_0_8px_rgb(251,191,36/0.8)]"
                                    : m.discord.status === 'dnd'
                                      ? "bg-rose-400 shadow-[0_0_8px_rgb(251,113,133/0.8)]"
                                      : "bg-emerald-400 shadow-[0_0_8px_rgb(52,211,153/0.8)]")
                                : "bg-red-500/80 shadow-[0_0_6px_rgb(239,68,68/0.5)]"
                            )}
                          />
                          <span className="text-xs text-silver font-medium truncate max-w-[125px]">
                            @{m.discord.tag}
                          </span>
                        </div>
                        {m.discord.channel ? (
                          <span className="text-[10px] text-cyan-400/90 font-mono flex items-center gap-1 pl-4 truncate max-w-[125px]" title={`Ses Kanalında: ${m.discord.channel}`}>
                            🎙️ {m.discord.channel}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-muted-foreground/50 text-xs">—</span>
                    )}
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
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
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
          {' · '}Level ve portre Forever Armory’den gelir (karakter oyundan çıkınca güncellenir).
        </p>
      </Panel>
    </div>
  )
}