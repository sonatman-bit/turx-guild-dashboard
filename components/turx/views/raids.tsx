'use client'

import { CheckCircle2, Clock, HeartPulse, Shield, Swords, UserCheck, UserX, Users, Sparkles, UserPlus, Send } from 'lucide-react'
import { useState, useEffect } from 'react'
import { authHeaders } from '@/lib/client-session'
import { CLASS_COLORS, RAIDS, type Raid } from '@/lib/guild-data'
import { loadOnboardingCharacters } from '@/lib/profile-gate'
import { cn } from '@/lib/utils'
import { useAuth } from '../auth-provider'
import { useToast } from '../toast'
import { Badge, Field, GhostButton, GoldButton, Modal, Panel, PanelTitle, SectionHeader, inputClass } from '../ui'

type Status = 'Confirmed' | 'Pending' | 'Declined'
type ExtendedRole = 'TANK' | 'HEALER' | 'MELEE' | 'RANGED'

interface GuildCharacter {
  id: string
  name: string
  wowClass: keyof typeof CLASS_COLORS
  spec: string
  role: ExtendedRole
}

interface RaidMember extends GuildCharacter {
  status: 'roster' | 'bench' | 'signup'
}

function charactersFromAccount(username: string | undefined): GuildCharacter[] {
  if (!username || typeof window === 'undefined') return []
  return loadOnboardingCharacters(username).flatMap((character) => {
    const stored = character as GuildCharacter & { firstName?: string; lastName?: string; wowClass?: GuildCharacter['wowClass'] }
    if (!stored.wowClass || !stored.firstName) return []
    return [{
      id: stored.id || `${stored.firstName}-${stored.lastName}`,
      name: `${stored.firstName} ${stored.lastName ?? ''}`.trim(),
      wowClass: stored.wowClass,
      spec: stored.spec,
      role: stored.role,
    }]
  })
}

const STATUS_STYLES: Record<Status, string> = {
  Confirmed: 'border-success/50 bg-success/10 text-success',
  Pending: 'border-gold/50 bg-gold/10 text-gold',
  Declined: 'border-destructive/50 bg-destructive/10 text-destructive',
}

const ROLE_ICONS: Record<ExtendedRole, React.ComponentType<{ className?: string }>> = {
  TANK: Shield,
  HEALER: HeartPulse,
  MELEE: Swords,
  RANGED: Swords,
}

function getZoneTheme(zoneName: string) {
  const name = zoneName.toLowerCase()
  if (name.includes('serpentshrine') || name.includes('ssc')) {
    return {
      accentColor: 'text-cyan-400',
      badgeColor: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
      cardBorder: 'border border-border border-t-2 border-t-cyan-400',
    }
  }
  if (name.includes('tempest') || name.includes('tk')) {
    return {
      accentColor: 'text-purple-400',
      badgeColor: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
      cardBorder: 'border border-border border-t-2 border-t-purple-400',
    }
  }
  if (name.includes('hyjal') || name.includes('black temple')) {
    return {
      accentColor: 'text-emerald-400',
      badgeColor: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
      cardBorder: 'border border-border border-t-2 border-t-emerald-400',
    }
  }
  return {
    accentColor: 'text-gold',
    badgeColor: 'border-gold/40 bg-gold/10 text-gold',
    cardBorder: 'border border-border border-t-2 border-t-gold',
  }
}

function getActiveRaids(raids: Raid[]) {
  return raids.filter(() => true)
}

function RaidCard({
  raid,
  myCharacters,
  currentUsername,
  canManageRaid,
}: {
  raid: Raid
  myCharacters: GuildCharacter[]
  currentUsername?: string
  canManageRaid?: boolean
}) {
  const toast = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedChar, setSelectedChar] = useState<GuildCharacter | null>(myCharacters[0] ?? null)
  const [signedUp, setSignedUp] = useState(false)
  const [myStatus, setMyStatus] = useState<Status>('Pending')
  const [isPublished, setIsPublished] = useState(false)

  const theme = getZoneTheme(raid.name)

  const [signupPool, setSignupPool] = useState<RaidMember[]>([])
  const [publishedRoster, setPublishedRoster] = useState<RaidMember[]>([])

  useEffect(() => {
    let cancelled = false
    fetch('/api/raids')
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          raidStates?: Record<
            string,
            {
              raidId: string
              signups: Array<{
                id: string
                username: string
                characterName: string
                wowClass: keyof typeof CLASS_COLORS
                spec: string
                role: ExtendedRole
                status: Status
                rosterStatus: 'signup' | 'roster' | 'bench'
              }>
            }
          >
        }
        if (!res.ok || cancelled) return
        const raidState = data.raidStates?.[raid.id]
        if (raidState && Array.isArray(raidState.signups)) {
          const pool: RaidMember[] = []
          const roster: RaidMember[] = []
          let userSignup: (typeof raidState.signups)[number] | undefined

          for (const s of raidState.signups) {
            const member: RaidMember = {
              id: s.id,
              name: s.characterName,
              wowClass: s.wowClass in CLASS_COLORS ? s.wowClass : 'Warrior',
              spec: s.spec || 'DPS',
              role: s.role || 'MELEE',
              status: s.rosterStatus,
            }
            if (s.rosterStatus === 'roster') {
              roster.push(member)
            } else {
              pool.push(member)
            }
            if (currentUsername && s.username.toLowerCase() === currentUsername.toLowerCase()) {
              userSignup = s
            }
          }

          setSignupPool(pool)
          setPublishedRoster(roster)
          if (userSignup) {
            setSignedUp(true)
            setMyStatus(userSignup.status)
            const matched = myCharacters.find((c) => c.name === userSignup?.characterName)
            if (matched) setSelectedChar(matched)
          }
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [raid.id, currentUsername, myCharacters])

  const roles: { key: ExtendedRole; label: string }[] = [
    { key: 'TANK', label: 'Tank' },
    { key: 'HEALER', label: 'Healer' },
    { key: 'MELEE', label: 'Melee DPS' },
    { key: 'RANGED', label: 'Ranged DPS' },
  ]

  const moveToRoster = (member: RaidMember, role: ExtendedRole) => {
    setSignupPool(prev => prev.filter(m => m.id !== member.id))
    setPublishedRoster(prev => [...prev, { ...member, role, status: 'roster' }])
    void fetch('/api/raids', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'move_to_roster', raidId: raid.id, memberId: member.id, role }),
    }).catch(() => undefined)
  }

  const returnToPool = (member: RaidMember) => {
    setPublishedRoster(prev => prev.filter(m => m.id !== member.id))
    setSignupPool(prev => [...prev, { ...member, status: 'signup' }])
    void fetch('/api/raids', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'return_to_pool', raidId: raid.id, memberId: member.id }),
    }).catch(() => undefined)
  }

  const handlePublish = async () => {
    setIsPublished(true)
    try {
      const res = await fetch('/api/raids', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish', raidId: raid.id }),
      })
      if (res.ok) {
        toast({ 
          title: 'Kadro Başarıyla Yayınlandı! 🚀', 
          description: `${raid.name} resmi rosterı kaydedildi ve Discord kanalına iletildi.` 
        })
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        toast({ title: 'Yayınlama Hatası', description: data.error || 'İşlem başarısız oldu.' })
      }
    } catch {
      toast({ title: 'Bağlantı Hatası', description: 'Sunucuya ulaşılamadı.' })
    } finally {
      setTimeout(() => setIsPublished(false), 3000)
    }
  }

  const handleSignupSubmit = async () => {
    if (!selectedChar) {
      toast({ title: 'Karakter yok', description: 'Önce profilinden bir Main karakter ekle.' })
      return
    }
    setModalOpen(false)
    setSignedUp(true)
    const newSignup: RaidMember = { ...selectedChar, id: `${currentUsername || 'user'}-${selectedChar.id}`, status: 'signup' }
    const existingInPool = signupPool.some(m => m.name === selectedChar.name)
    if (!existingInPool) {
      setSignupPool(prev => [...prev, newSignup])
    }

    try {
      const res = await fetch('/api/raids', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'signup',
          raidId: raid.id,
          character: selectedChar,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        toast({ title: 'Kayıt Hatası', description: data.error || 'Ön kayıt sunucuya kaydedilemedi.' })
        return
      }
      toast({ title: 'Ön Kayıt Başarılı!', description: `${selectedChar.name} (${selectedChar.spec}) ile kayıt olundu ve sunucuya işlendi.` })
    } catch {
      toast({ title: 'Bağlantı Hatası', description: 'Sunucuya ulaşılamadı.' })
    }
  }

  const handleConfirmAttendance = async () => {
    setMyStatus('Confirmed')
    try {
      const res = await fetch('/api/raids', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', raidId: raid.id }),
      })
      if (!res.ok) {
        toast({ title: 'Hata', description: 'Katılım onaylanamadı.' })
        return
      }
      toast({ title: 'Katılım Onaylandı!', description: 'Raid katılım durumunuz sunucuda güncellendi.' })
    } catch {
      toast({ title: 'Bağlantı Hatası', description: 'Sunucuya ulaşılamadı.' })
    }
  }

  return (
    <Panel className={`flex flex-col gap-6 relative shadow-xl ${theme.cardBorder}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 pt-1">
        <div>
          <h2 className={`font-display text-2xl font-bold tracking-wide ${theme.accentColor}`}>{raid.name}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {raid.size}-Man Raid · Açılış: <span className="text-silver font-medium">{raid.unlock} @ {raid.time}</span>
          </p>
        </div>
        <Badge className={theme.badgeColor}>Phase 1 Engine</Badge>
      </div>

      {/* 4'lü Rol Sütun Matrisi */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {roles.map(({ key, label }) => {
          const membersInRole = publishedRoster.filter(m => m.role === key && m.status === 'roster')
          return (
            <div key={key} className="rounded-xl border border-border/70 bg-[#071422]/90 p-3.5 shadow-inner">
              <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-2.5">
                <span className="text-xs font-bold text-silver uppercase tracking-wider">{label}</span>
                <span className="text-xs font-extrabold text-neon tabular-nums bg-neon/10 px-1.5 py-0.5 rounded">{membersInRole.length}</span>
              </div>
              <ul className="flex flex-col gap-1.5 min-h-[90px]">
                {membersInRole.map(m => (
                  <li key={m.id} className="flex items-center justify-between text-xs bg-background/60 px-2.5 py-1.5 rounded-lg border border-border/40 transition hover:border-border">
                    <div className="flex flex-col truncate">
                      <span className="truncate font-semibold" style={{ color: CLASS_COLORS[m.wowClass] }}>{m.name}</span>
                      <span className="text-[10px] text-muted-foreground">{m.spec}</span>
                    </div>
                    <button onClick={() => returnToPool(m)} title="Havuza Geri Gönder" className="text-muted-foreground hover:text-destructive transition ml-1">
                      <UserX className="size-3.5" />
                    </button>
                  </li>
                ))}
                {membersInRole.length === 0 && (
                  <li className="text-[11px] text-muted-foreground/70 italic text-center py-6">Kadro boş</li>
                )}
              </ul>
            </div>
          )
        })}
      </div>

      {/* Oyuncu Ön Kayıt Bölümü */}
      {!signedUp ? (
        <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/40 p-4">
          <p className="text-sm text-silver font-medium flex items-center gap-1.5">
            <Sparkles className="size-4 text-gold" /> Karakter havuzundan seçim yaparak ön kayıt oluştur:
          </p>
          <GoldButton onClick={() => setModalOpen(true)} className="w-full sm:w-auto">
            <UserPlus className="size-4" /> Karakter ile Ön Kayıt Ol
          </GoldButton>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/40 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm">
              Aktif Kayıtlı Karakter: {selectedChar ? <span className="font-semibold" style={{ color: CLASS_COLORS[selectedChar.wowClass] }}>{selectedChar.name}</span> : '—'} {selectedChar ? `(${selectedChar.spec})` : ''}
            </p>
            <Badge className={STATUS_STYLES[myStatus]}>{myStatus}</Badge>
          </div>
          <div className="flex gap-2">
            <GoldButton onClick={handleConfirmAttendance}>
              <CheckCircle2 className="size-4" /> Katılımı Onayla
            </GoldButton>
            <GhostButton onClick={() => setModalOpen(true)}>
              Karakter Değiştir
            </GhostButton>
          </div>
        </div>
      )}

      {/* Officer / Subay Yönetim Paneli (Draft & Publish) */}
      <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-2">
            <Users className="size-4" /> Officer Ön Kayıt Havuzu ({signupPool.length})
          </span>
          <GoldButton 
            onClick={handlePublish} 
            className={cn("text-xs py-1.5 px-3.5 transition-all", isPublished && "bg-success text-success-foreground border-success")}
          >
            <Send className="size-3.5 mr-1" /> {isPublished ? 'Yayınlandı!' : 'Kadroyu Yayınla (Publish)'}
          </GoldButton>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {signupPool.map(m => (
            <div key={m.id} className="flex items-center gap-2.5 bg-background border border-border/80 rounded-lg px-3 py-2 text-xs shadow-sm">
              <div className="flex flex-col">
                <span className="font-semibold" style={{ color: CLASS_COLORS[m.wowClass] }}>{m.name}</span>
                <span className="text-muted-foreground text-[10px]">{m.spec} ({m.role})</span>
              </div>
              <div className="flex gap-1.5 ml-3 border-l border-border pl-2">
                <button onClick={() => moveToRoster(m, m.role)} title="Rostere Ekle" className="text-success hover:scale-110 transition">
                  <UserCheck className="size-4" />
                </button>
              </div>
            </div>
          ))}
          {signupPool.length === 0 && (
            <p className="text-xs text-muted-foreground italic py-1">Havuzda bekleyen yeni başvuru bulunmuyor.</p>
          )}
        </div>
      </div>

      {/* Karakter Seçim Modalı */}
      {modalOpen && (
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Raide Katılacak Karakteri Seçin">
          <div className="flex flex-col gap-4 py-2">
            <p className="text-sm text-muted-foreground">Hesabınıza bağlı karakter havuzundan bu raid için kullanacağınız karakteri seçin:</p>
            <div className="grid gap-2.5">
              {myCharacters.map((char) => (
                <button
                  key={char.id}
                  onClick={() => setSelectedChar(char)}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-xl border text-left transition-all',
                    selectedChar?.id === char.id ? 'border-gold bg-gold/10 shadow-sm' : 'border-border bg-background hover:border-border/80'
                  )}
                >
                  <div>
                    <div className="font-bold text-sm" style={{ color: CLASS_COLORS[char.wowClass] }}>{char.name}</div>
                    <div className="text-xs text-muted-foreground">{char.wowClass} · {char.spec}</div>
                  </div>
                  <Badge className="border-border bg-muted/30 text-xs">{char.role}</Badge>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <GhostButton onClick={() => setModalOpen(false)}>İptal</GhostButton>
              <GoldButton onClick={handleSignupSubmit}>Bu Karakterle Kaydol</GoldButton>
            </div>
          </div>
        </Modal>
      )}
    </Panel>
  )
}

export function RaidsView() {
  const { user } = useAuth()
  const myCharacters = charactersFromAccount(user?.username)
  const activeRaids = getActiveRaids(RAIDS)
  const canManageRaid = user?.role === 'Guild Master' || user?.role === 'Officer' || user?.role === 'Raid Leader'

  return (
    <div>
      <SectionHeader
        eyebrow="Raid Takvimi · 21:00 TR"
        title="PvE Raid Takvimi & Kadro Yönetim Sistemi"
        description="Karakter havuzunuzdan seçim yapın, ön kayıt oluşturun ve subay paneliyle roster'ı yönetin."
        action={
          <Badge className="border-gold/40 bg-gold/10 text-gold">
            <Clock className="size-3" /> Tüm Raid’ler 21:00’da başlar
          </Badge>
        }
      />
      <div className="grid gap-8 mt-6">
        {activeRaids.map((r) => (
          <RaidCard
            key={r.id}
            raid={r}
            myCharacters={myCharacters}
            currentUsername={user?.username}
            canManageRaid={canManageRaid}
          />
        ))}
      </div>
    </div>
  )
}