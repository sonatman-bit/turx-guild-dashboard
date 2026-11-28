'use client'

import {
  AlertTriangle,
  Archive,
  ArrowRightLeft,
  CalendarClock,
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock,
  Cross,
  Info,
  Layers,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Shield,
  Sparkles,
  Swords,
  Target,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { ArmoryRankColorId } from '@/lib/armory-ranks'
import { CLASS_COLORS, type WowClass } from '@/lib/guild-data'
import {
  calculateSignupPoints,
  deriveOutcomeFromFlags,
  formatCountdown,
  formatTrDateTime,
  formatTrShortDateTime,
  isGuildMeetingEvent,
  PHASE1_RAID_UNLOCK_ISO,
  RAID_CATALOG,
  raidBasePoints,
  resolveAttendanceFlags,
  ROSTER_COLOR_PRESETS,
  SPECIAL_EVENT_CATALOG,
  type AttendanceFlags,
  type AttendanceOutcome,
  type PointRules,
  type PrepChecklist,
  type RaidEvent,
  type RaidEventSignup,
  type RaidRoleType,
} from '@/lib/raid-loot-system'
import { useLiveNow, useRaidSystem } from '@/lib/use-raid-system'
import { cn } from '@/lib/utils'
import { useAuth } from '../auth-provider'
import type { TabId } from '../navigation'
import { useToast } from '../toast'
import {
  Badge,
  Field,
  GhostButton,
  GoldButton,
  inputClass,
  Modal,
  Panel,
  PointsPill,
  RankPill,
} from '../ui'
import { RaidCalendarGrid } from '../raid-calendar-grid'
import { WeeklyRaidTimeline } from '../weekly-raid-timeline'

export type RaidSignupVariantId = 1 | 2 | 3
export type RaidCategoryId = 'guild-meeting' | 'barrow' | 'hyjal' | 'onyxia'

const RAID_CATEGORY_META: Record<
  RaidCategoryId,
  { label: string; short: string; sizeLabel: string; tabId: TabId; description: string }
> = {
  'guild-meeting': {
    label: 'TURX Guild Toplantısı',
    short: 'Toplantı',
    sizeLabel: 'Tüm Guild',
    tabId: 'raid-signup-2-meeting',
    description: 'Tüm seviyelere açık guild toplantıları ve canlı sistem sunumları.',
  },
  barrow: {
    label: 'Barrow Deeps',
    short: 'Barrow',
    sizeLabel: '10-Man',
    tabId: 'raid-signup-2-barrow',
    description: '10 kişilik Phase 1 giriş raidi — 2 Tank · 2 Healer · 6 DPS.',
  },
  hyjal: {
    label: 'Hyjal Summit',
    short: 'Hyjal',
    sizeLabel: '20-Man',
    tabId: 'raid-signup-2-hyjal',
    description: '20 kişilik Phase 1 progress raidi — 3 Tank · 5 Healer · 12 DPS.',
  },
  onyxia: {
    label: "Onyxia's Lair",
    short: 'Onyxia',
    sizeLabel: '40-Man',
    tabId: 'raid-signup-2-onyxia',
    description: '40 kişilik Phase 1 ejderha raidi — Drakefire Amulet zorunlu.',
  },
}

const RAID_CATEGORY_ORDER: RaidCategoryId[] = ['guild-meeting', 'barrow', 'hyjal', 'onyxia']

type RankMeta = { label: string; color?: ArmoryRankColorId; armoryRankId?: number | null }

const ROLE_META: Record<
  RaidRoleType,
  {
    label: string
    short: string
    icon: React.ComponentType<{ className?: string }>
    color: string
    chip: string
    headerBg: string
    border: string
  }
> = {
  TANK: {
    label: 'Tank',
    short: 'T',
    icon: Shield,
    color: 'text-sky-300',
    chip: 'border-sky-500/35 bg-sky-500/10 text-sky-300',
    headerBg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
  },
  HEALER: {
    label: 'Healer',
    short: 'H',
    icon: Cross,
    color: 'text-emerald-300',
    chip: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300',
    headerBg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
  MELEE: {
    label: 'Melee DPS',
    short: 'M',
    icon: Swords,
    color: 'text-amber-300',
    chip: 'border-amber-500/35 bg-amber-500/10 text-amber-300',
    headerBg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  RANGED: {
    label: 'Ranged DPS',
    short: 'R',
    icon: Target,
    color: 'text-purple-300',
    chip: 'border-purple-500/35 bg-purple-500/10 text-purple-300',
    headerBg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
  },
}

const ROLE_ORDER: RaidRoleType[] = ['TANK', 'HEALER', 'MELEE', 'RANGED']

function toDateTimeLocal(ms: number) {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function defaultRaidScheduleMs(raidId = 'barrow') {
  const weekAhead = new Date(Date.now() + 7 * 86_400_000)
  weekAhead.setHours(21, 0, 0, 0)
  if (!isGuildMeetingEvent(raidId)) {
    const unlock = new Date(PHASE1_RAID_UNLOCK_ISO)
    unlock.setHours(21, 0, 0, 0)
    if (weekAhead.getTime() < unlock.getTime()) return unlock.getTime()
  }
  return weekAhead.getTime()
}

function shortRosterLabel(name: string, index: number): string {
  const trimmed = name.trim()
  if (trimmed.length <= 14) return trimmed
  if (trimmed.toLowerCase().includes('toplantı') || trimmed.toLowerCase().includes('tüm guild')) {
    return 'Katılımcılar'
  }
  return `Grup ${index + 1}`
}

function CountdownPill({ targetIso, className }: { targetIso: string; className?: string }) {
  const nowMs = useLiveNow(1000)
  const cd = formatCountdown(targetIso, nowMs)
  return (
    <span
      className={cn(
        'font-mono font-semibold tabular-nums',
        cd.expired ? 'text-rose-400' : cd.urgent ? 'text-amber-300' : 'text-foreground',
        className,
      )}
    >
      {cd.label}
    </span>
  )
}

function ConfirmDot({ status, published }: { status: RaidEventSignup['confirmStatus']; published: boolean }) {
  if (status === 'CONFIRMED') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-md border border-emerald-500/35 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300"
        title="Katılım onaylandı"
      >
        <Check className="size-2.5" /> Onaylı
      </span>
    )
  }
  if (status === 'DECLINED_EXCUSED') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-md border border-rose-500/35 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300"
        title="Mazeretli iptal"
      >
        İptal
      </span>
    )
  }
  if (published) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-md border border-amber-500/35 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300"
        title="Konfirmasyon bekliyor"
      >
        Bekliyor
      </span>
    )
  }
  return (
    <span className="text-[10px] text-muted-foreground/70">İmzalı</span>
  )
}

/** Compact assignment control that NEVER stretches the card or hides character names */
function CompactAssignControl({
  signup,
  event,
  busy,
  onAssign,
  mode = 'select',
}: {
  signup: RaidEventSignup
  event: RaidEvent
  busy: boolean
  onAssign: (signupId: string, assignment: string) => void
  mode?: 'select' | 'quick-chips'
}) {
  if (mode === 'quick-chips' && event.rosters.length <= 2) {
    return (
      <div className="inline-flex shrink-0 items-center gap-1">
        {event.rosters.map((r, idx) => {
          const active = signup.assignment === r.id
          return (
            <button
              key={r.id}
              type="button"
              disabled={busy || active}
              onClick={() => onAssign(signup.id, r.id)}
              title={`${r.name} grubuna taşı`}
              className={cn(
                'cursor-pointer rounded border px-1.5 py-0.5 text-[10px] font-semibold transition disabled:cursor-default',
                active
                  ? 'border-gold/55 bg-gold/20 text-gold'
                  : 'border-border/70 bg-[#081524] text-muted-foreground hover:border-neon/50 hover:text-neon',
              )}
            >
              {event.rosters.length === 1 ? 'Kadro' : `G${idx + 1}`}
            </button>
          )
        })}
        <button
          type="button"
          disabled={busy || signup.assignment === 'BENCH'}
          onClick={() => onAssign(signup.id, 'BENCH')}
          title="Yedek (Bench) listesine taşı"
          className={cn(
            'cursor-pointer rounded border px-1.5 py-0.5 text-[10px] font-semibold transition disabled:cursor-default',
            signup.assignment === 'BENCH'
              ? 'border-cyan-400/55 bg-cyan-500/20 text-cyan-200'
              : 'border-border/70 bg-[#081524] text-muted-foreground hover:border-cyan-400/50 hover:text-cyan-300',
          )}
        >
          Bench
        </button>
        {signup.assignment !== 'POOL' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onAssign(signup.id, 'POOL')}
            title="İmza havuzuna geri al"
            className="cursor-pointer rounded border border-border/60 bg-[#081524] px-1.5 py-0.5 text-[10px] text-muted-foreground hover:border-rose-400/50 hover:text-rose-300"
          >
            Havuz
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="relative inline-flex shrink-0 items-center">
      <ArrowRightLeft className="pointer-events-none absolute left-2 size-3 text-muted-foreground/75" />
      <select
        disabled={busy}
        value={signup.assignment}
        onChange={(e) => onAssign(signup.id, e.target.value)}
        aria-label={`${signup.characterName} grup ataması`}
        className="w-[116px] cursor-pointer truncate rounded-md border border-border/80 bg-[#091829] py-1 pr-2 pl-6 text-[11px] font-medium text-silver transition hover:border-neon/50 focus:border-neon focus:outline-none"
      >
        <option value="POOL">Havuz</option>
        {event.rosters.map((r, idx) => (
          <option key={r.id} value={r.id}>
            {shortRosterLabel(r.name, idx)}
          </option>
        ))}
        <option value="BENCH">Bench</option>
      </select>
    </div>
  )
}

const VARIANT_META: Record<
  RaidSignupVariantId,
  { badge: string; title: string; subtitle: string; tabId: TabId }
> = {
  1: {
    badge: 'ALTERNATİF 1 · MİNİMALİST',
    title: 'Raid Kayıt 1 — Minimalist & Sade Liste',
    subtitle: 'Çift kutu yok. Üstte tek etkinlik şeridi, altta tam genişlikte sade tablo satırları — sıfır üst üste binme.',
    tabId: 'raid-signup-1',
  },
  2: {
    badge: 'ALTERNATİF 2 · TAKVİM & ROL PANOSU',
    title: 'Raid Kayıt 2 — Takvim & 4 Rol Sütunlu Pano',
    subtitle: 'Pazartesi başlangıçlı -2/+2 hafta & aylık takvim. Gelecek raidler ışıklı yeşil, geçmiş/arşiv raidler kırmızı flu görünür; altta 4 rol sütunlu kadro açılır.',
    tabId: 'raid-signup-2',
  },
  3: {
    badge: 'ALTERNATİF 3 · KOMUTA MERKEZİ',
    title: 'Raid Kayıt 3 — Sol Takvim + Geniş Sekmeli Alan',
    subtitle: 'Solda aktif etkinlik listesi, sağda %100 genişlikte sekmeli grup/havuz/bench yönetimi ve tek tık taşıma.',
    tabId: 'raid-signup-3',
  },
}

export function RaidSignupVariantView({
  variant,
  filterRaidId,
  onNavigate,
}: {
  variant: RaidSignupVariantId
  filterRaidId?: RaidCategoryId
  onNavigate?: (tab: TabId) => void
}) {
  const { user } = useAuth()
  const toast = useToast()
  const { data, loading, busy, error, postAction } = useRaidSystem()

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [showCycle, setShowCycle] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [confirmModalEvent, setConfirmModalEvent] = useState<RaidEvent | null>(null)
  const [declineModalEvent, setDeclineModalEvent] = useState<RaidEvent | null>(null)
  const [archiveModalEvent, setArchiveModalEvent] = useState<RaidEvent | null>(null)
  const [addMemberModalEvent, setAddMemberModalEvent] = useState<RaidEvent | null>(null)

  // Shared section focus per variant
  const [v1Section, setV1Section] = useState<string>('all')
  const [v2RosterId, setV2RosterId] = useState<string>('all')
  const [v2CalendarFilter, setV2CalendarFilter] = useState<string>(filterRaidId || 'all')
  const [v3Tab, setV3Tab] = useState<string>('first-roster')
  const [showPostRaid, setShowPostRaid] = useState(false)

  // Inline roster rename state
  const [editingRosterId, setEditingRosterId] = useState<string | null>(null)
  const [editRosterName, setEditRosterName] = useState('')
  const [editRosterColor, setEditRosterColor] = useState('#d4af37')

  // Create form state
  const [newRaidId, setNewRaidId] = useState('barrow')
  const [newScheduledAt, setNewScheduledAt] = useState(() => toDateTimeLocal(defaultRaidScheduleMs('barrow')))
  const [newSignupDeadline, setNewSignupDeadline] = useState(() =>
    toDateTimeLocal(defaultRaidScheduleMs('barrow') - 3 * 86_400_000),
  )
  const [newConfirmDeadline, setNewConfirmDeadline] = useState(() =>
    toDateTimeLocal(defaultRaidScheduleMs('barrow') - 1 * 86_400_000),
  )
  const [deadlinesAuto, setDeadlinesAuto] = useState(true)
  const [newNotes, setNewNotes] = useState('')

  // Confirm / Decline / Archive / Manual Add states
  const [prepChecklist, setPrepChecklist] = useState<PrepChecklist>({
    onTime15m: true,
    fullConsumables: true,
    fullRepair: true,
    fullSpells: true,
    bossTactics: true,
  })
  const [declineReason, setDeclineReason] = useState('')
  const [openNextWeekOnArchive, setOpenNextWeekOnArchive] = useState(true)
  const [manualAddUsername, setManualAddUsername] = useState('')
  const [manualAddAssignment, setManualAddAssignment] = useState('POOL')

  const rs = data?.raidSystem
  const isOfficer = Boolean(data?.isOfficer)
  const guildMembers = data?.guildMembers || []

  const pointsByUser = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of data?.attendanceLeaderboard || []) {
      map.set(row.username.toLowerCase(), row.totalPoints)
    }
    return map
  }, [data?.attendanceLeaderboard])

  const rankByUser = useMemo(() => {
    const map = new Map<string, RankMeta>()
    for (const m of guildMembers) {
      map.set(m.username.toLowerCase(), {
        label: m.armoryRankLabel || m.guildRank,
        color: m.armoryRankColor,
        armoryRankId: m.armoryRankId,
      })
    }
    return map
  }, [guildMembers])

  const myMain = useMemo(
    () => guildMembers.find((m) => m.username.toLowerCase() === (user?.username || '').toLowerCase()) || null,
    [guildMembers, user?.username],
  )

  const allEventsSorted = useMemo(
    () => [...(rs?.events || [])].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    [rs?.events],
  )

  const allActiveEvents = useMemo(
    () => allEventsSorted.filter((e) => e.status !== 'ARCHIVED'),
    [allEventsSorted],
  )

  const activeEvents = useMemo(
    () =>
      filterRaidId
        ? allActiveEvents.filter((e) => e.raidId === filterRaidId)
        : allActiveEvents,
    [allActiveEvents, filterRaidId],
  )

  const openCreateForRaid = (preferredRaidId?: string, dateKey?: string) => {
    const targetId =
      preferredRaidId && preferredRaidId !== 'all'
        ? preferredRaidId
        : filterRaidId || (v2CalendarFilter !== 'all' ? v2CalendarFilter : 'barrow')
    let schedMs = defaultRaidScheduleMs(targetId)
    if (dateKey) {
      const parsed = new Date(`${dateKey}T21:00:00+03:00`).getTime()
      if (Number.isFinite(parsed)) {
        schedMs = parsed
      }
    }
    setNewRaidId(targetId)
    setNewScheduledAt(toDateTimeLocal(schedMs))
    setNewSignupDeadline(toDateTimeLocal(schedMs - 3 * 86_400_000))
    setNewConfirmDeadline(toDateTimeLocal(schedMs - 1 * 86_400_000))
    setDeadlinesAuto(true)
    setCreateOpen(true)
  }

  useEffect(() => {
    if (variant === 2) {
      if (allEventsSorted.length > 0 && !allEventsSorted.some((e) => e.id === selectedEventId)) {
        const nextActive = allActiveEvents[0]
        setSelectedEventId(nextActive ? nextActive.id : allEventsSorted[allEventsSorted.length - 1].id)
      }
      return
    }
    if (activeEvents.length > 0 && !activeEvents.some((e) => e.id === selectedEventId)) {
      setSelectedEventId(activeEvents[0].id)
    }
  }, [variant, activeEvents, allActiveEvents, allEventsSorted, selectedEventId])

  const selectedEvent =
    variant === 2
      ? allEventsSorted.find((e) => e.id === selectedEventId) || allActiveEvents[0] || allEventsSorted[0] || null
      : activeEvents.find((e) => e.id === selectedEventId) || activeEvents[0] || null

  // Keep variant 3 tab synced when switching events
  useEffect(() => {
    if (!selectedEvent) return
    setShowPostRaid(false)
    setV1Section('all')
    setV2RosterId('all')
    setV3Tab(selectedEvent.rosters[0]?.id || 'POOL')
  }, [selectedEvent?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const runAction = async (payload: Record<string, unknown>, successMsg: string) => {
    try {
      await postAction(payload)
      toast({ title: 'Başarılı', description: successMsg })
      return true
    } catch (err) {
      toast({
        variant: 'error',
        title: 'İşlem Başarısız',
        description: err instanceof Error ? err.message : 'Bir hata oluştu.',
      })
      return false
    }
  }

  const createDateValidationError = useMemo(() => {
    const schedMs = new Date(newScheduledAt).getTime()
    const signupMs = new Date(newSignupDeadline).getTime()
    const confirmMs = new Date(newConfirmDeadline).getTime()
    if (!Number.isFinite(schedMs) || !Number.isFinite(signupMs) || !Number.isFinite(confirmMs)) {
      return 'Lütfen geçerli tarih ve saat değerleri girin.'
    }
    if (!isGuildMeetingEvent(newRaidId) && schedMs < new Date(PHASE1_RAID_UNLOCK_ISO).getTime()) {
      return 'Gerçek raidler Phase 1 açılış tarihi olan 9 Aralık 2026 öncesine planlanamaz.'
    }
    if (!(signupMs < confirmMs && confirmMs < schedMs)) {
      return 'Tarih sırası geçersiz: İmza kapanışı < Konfirmasyon kapanışı < Etkinlik başlangıcı olmalıdır.'
    }
    return null
  }, [newRaidId, newScheduledAt, newSignupDeadline, newConfirmDeadline])

  const handleScheduledChange = (val: string) => {
    setNewScheduledAt(val)
    if (!deadlinesAuto) return
    const dt = new Date(val).getTime()
    if (Number.isFinite(dt)) {
      setNewSignupDeadline(toDateTimeLocal(dt - 3 * 86_400_000))
      setNewConfirmDeadline(toDateTimeLocal(dt - 1 * 86_400_000))
    }
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (createDateValidationError) {
      toast({ variant: 'error', title: 'Geçersiz Tarih', description: createDateValidationError })
      return
    }
    const def =
      RAID_CATALOG.find((r) => r.id === newRaidId) ||
      SPECIAL_EVENT_CATALOG.find((r) => r.id === newRaidId) ||
      RAID_CATALOG[0]
    const ok = await runAction(
      {
        action: 'create_event',
        raidId: def.id,
        raidName: def.name,
        size: def.size,
        scheduledAt: new Date(newScheduledAt).toISOString(),
        signupDeadline: new Date(newSignupDeadline).toISOString(),
        confirmDeadline: new Date(newConfirmDeadline).toISOString(),
        notes: newNotes,
      },
      `${def.name} takvime eklendi.`,
    )
    if (ok) {
      setCreateOpen(false)
      setNewNotes('')
      setDeadlinesAuto(true)
    }
  }

  const handleSignup = async (ev: RaidEvent) => {
    if (!user) {
      toast({ variant: 'info', title: 'Giriş Gerekli', description: 'İmza atmak için oturum açın.' })
      return
    }
    const char = myMain || {
      characterId: `${user.username}-main`,
      characterName: user.username,
      wowClass: 'Warrior' as WowClass,
      spec: 'DPS',
      role: 'MELEE' as RaidRoleType,
      level: 60,
    }
    await runAction(
      {
        action: 'signup',
        eventId: ev.id,
        character: {
          id: char.characterId,
          name: char.characterName,
          wowClass: char.wowClass,
          spec: char.spec,
          role: char.role,
          level: char.level,
        },
      },
      `${ev.raidName} için imzanız kaydedildi (+${rs?.settings.pointRules.signup ?? 1}p).`,
    )
  }

  const handleConfirmSubmit = async () => {
    if (!confirmModalEvent) return
    const allChecked =
      prepChecklist.onTime15m &&
      prepChecklist.fullConsumables &&
      prepChecklist.fullRepair &&
      prepChecklist.fullSpells &&
      Boolean(prepChecklist.bossTactics)
    if (!allChecked) {
      toast({ variant: 'error', title: 'Hazırlık Onayı Eksik', description: '5 raid hazırlık şartını onaylamanız gerekir.' })
      return
    }
    const ok = await runAction(
      { action: 'confirm', eventId: confirmModalEvent.id, prepChecklist },
      `Katılımınız teyit edildi (+${rs?.settings.pointRules.confirm ?? 1} puan).`,
    )
    if (ok) setConfirmModalEvent(null)
  }

  const handleDeclineSubmit = async () => {
    if (!declineModalEvent) return
    const ok = await runAction(
      { action: 'decline_excused', eventId: declineModalEvent.id, reason: declineReason },
      'Mazeretli iptal bildiriminiz kaydedildi.',
    )
    if (ok) {
      setDeclineModalEvent(null)
      setDeclineReason('')
    }
  }

  const handleFinalizeArchive = async () => {
    if (!archiveModalEvent) return
    const shouldOpenNext = !isGuildMeetingEvent(archiveModalEvent.raidId) && openNextWeekOnArchive
    const ok = await runAction(
      { action: 'finalize_and_archive', eventId: archiveModalEvent.id, openNextWeek: shouldOpenNext },
      'Etkinlik arşivlendi ve puanlar Devam Takibine işlendi!',
    )
    if (ok) setArchiveModalEvent(null)
  }

  if (loading) {
    return (
      <Panel className="py-12 text-center text-sm text-muted-foreground">
        Raid kayıt tasarımı yükleniyor...
      </Panel>
    )
  }

  if (error || !rs) {
    return (
      <Panel className="border-rose-500/30 py-10 text-center text-sm text-rose-300">
        {error || 'Veriler alınamadı.'}
      </Panel>
    )
  }

  const rules = rs.settings.pointRules
  const meta = VARIANT_META[variant]
  const categoryMeta = filterRaidId ? RAID_CATEGORY_META[filterRaidId] : null

  // Helper: player CTA buttons for the currently selected event
  const renderPlayerCta = (ev: RaidEvent, compact = false) => {
    const isMeeting = isGuildMeetingEvent(ev.raidId)
    const myEntry = ev.signups.find(
      (s) => user?.username && s.username.toLowerCase() === user.username.toLowerCase(),
    )
    const myLevel = myMain?.level ?? 0
    const isBelowLevel60 = Boolean(!isMeeting && user?.username && myLevel < 60)
    const signupExpired = new Date(ev.signupDeadline).getTime() <= Date.now()
    const confirmExpired = new Date(ev.confirmDeadline).getTime() <= Date.now()

    if (!myEntry) {
      if (isBelowLevel60) {
        return (
          <div className="flex items-center gap-2">
            <GhostButton
              type="button"
              disabled={busy}
              onClick={() => void runAction({ action: 'refresh_my_armory_level' }, 'WoW Armory seviyeniz güncellendi.')}
              className="px-2.5 py-1.5 text-xs"
            >
              <RefreshCw className="size-3.5" /> Armory Yenile
            </GhostButton>
            <GoldButton disabled className="px-3 py-1.5 text-xs opacity-55">
              <Lock className="size-3.5" /> Lv60 Gerekli
            </GoldButton>
          </div>
        )
      }
      return (
        <GoldButton
          disabled={busy || (signupExpired && !isOfficer)}
          onClick={() => void handleSignup(ev)}
          className={cn(compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-xs')}
        >
          <UserCheck className="size-3.5" />
          {isMeeting ? `Toplantıya İmza At (+${rules.signup}p)` : `İmza At (+${rules.signup}p)`}
        </GoldButton>
      )
    }

    return (
      <div className="flex flex-wrap items-center gap-2">
        {ev.status === 'ROSTERS_PUBLISHED' && myEntry.confirmStatus !== 'CONFIRMED' && (
          <GoldButton
            disabled={busy || (confirmExpired && !isOfficer)}
            onClick={() => setConfirmModalEvent(ev)}
            className="px-3 py-1.5 text-xs"
          >
            <CheckCircle2 className="size-3.5" />
            Onayla (+{rules.confirm}p)
          </GoldButton>
        )}
        {myEntry.confirmStatus !== 'DECLINED_EXCUSED' && (
          <GhostButton
            disabled={busy}
            onClick={() =>
              ev.status === 'SIGNUP_OPEN'
                ? void runAction({ action: 'withdraw_signup', eventId: ev.id }, 'İmzanız geri çekildi.')
                : setDeclineModalEvent(ev)
            }
            className="border-rose-500/35 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10"
          >
            <XCircle className="size-3.5" />
            {ev.status === 'SIGNUP_OPEN' ? 'İmzayı Geri Çek' : 'Mazeretli İptal'}
          </GhostButton>
        )}
      </div>
    )
  }

  // Helper: inline roster title & edit controls
  const renderRosterHeaderActions = (ev: RaidEvent, rosterId: string, rosterName: string, rosterColor: string) => {
    if (!isOfficer) return null
    const isEditing = editingRosterId === rosterId
    if (isEditing) {
      return (
        <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={editRosterName}
            maxLength={48}
            autoFocus
            onChange={(e) => setEditRosterName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && editRosterName.trim()) {
                e.preventDefault()
                void runAction(
                  { action: 'update_roster', eventId: ev.id, rosterId, name: editRosterName.trim(), color: editRosterColor },
                  'Grup güncellendi.',
                )
                setEditingRosterId(null)
              } else if (e.key === 'Escape') {
                setEditingRosterId(null)
              }
            }}
            className={cn(inputClass, 'h-7 w-44 px-2 py-0.5 text-xs')}
          />
          <button
            type="button"
            disabled={busy || !editRosterName.trim()}
            onClick={() => {
              void runAction(
                { action: 'update_roster', eventId: ev.id, rosterId, name: editRosterName.trim(), color: editRosterColor },
                'Grup güncellendi.',
              )
              setEditingRosterId(null)
            }}
            className="cursor-pointer rounded border border-emerald-500/40 bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-300"
          >
            Kaydet
          </button>
          <button
            type="button"
            onClick={() => setEditingRosterId(null)}
            className="cursor-pointer rounded border border-border px-2 py-1 text-[11px] text-muted-foreground"
          >
            İptal
          </button>
        </div>
      )
    }

    return (
      <div className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={() => {
            setEditingRosterId(rosterId)
            setEditRosterName(rosterName)
            setEditRosterColor(rosterColor)
          }}
          className="cursor-pointer rounded p-1 text-muted-foreground/80 hover:bg-white/10 hover:text-foreground"
          title="Grup adını düzenle"
        >
          <Pencil className="size-3" />
        </button>
        {ev.rosters.length > 1 && (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void runAction(
                { action: 'remove_roster', eventId: ev.id, rosterId },
                'Grup silindi, oyuncular havuza döndü.',
              )
            }
            className="cursor-pointer rounded p-1 text-muted-foreground/80 hover:bg-rose-500/15 hover:text-rose-400"
            title="Grubu sil"
          >
            <Trash2 className="size-3" />
          </button>
        )}
      </div>
    )
  }

  // Helper: shared Post-Raid compact view inside any variant
  const renderPostRaidPanel = (ev: RaidEvent) => {
    const eventHasStarted = new Date(ev.scheduledAt).getTime() <= Date.now()
    const basePts = raidBasePoints(ev.size, rules)
    const nonEmptyRosters = ev.rosters.filter((r) => ev.signups.some((s) => s.assignment === r.id))
    const benchMembers = ev.signups.filter((s) => s.assignment === 'BENCH')
    const totalRequired = nonEmptyRosters.length + (benchMembers.length > 0 ? 1 : 0)
    const totalApproved =
      nonEmptyRosters.filter((r) => Boolean(r.scoredBy)).length +
      (benchMembers.length > 0 && ev.benchScoredBy ? 1 : 0)
    const canArchive = eventHasStarted && totalRequired > 0 && totalApproved === totalRequired

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/30 bg-[#081626] px-4 py-3">
          <div className="text-xs">
            <p className="font-display text-sm font-bold text-gold">Raid Sonu Puanlama &amp; Arşiv</p>
            <p className="mt-0.5 text-muted-foreground">
              {eventHasStarted
                ? `Onaylanan gruplar: ${totalApproved}/${totalRequired}. Tüm gruplar onaylandığında arşivleme açılır.`
                : `Etkinlik henüz başlamadı (${formatTrDateTime(ev.scheduledAt)}). Puanlama ve arşivleme başlangıç saatinde açılır.`}
            </p>
          </div>
          <GoldButton
            disabled={busy || !canArchive}
            onClick={() => setArchiveModalEvent(ev)}
            className="px-3 py-1.5 text-xs"
          >
            <Archive className="size-3.5" /> Arşivle ({totalApproved}/{totalRequired})
          </GoldButton>
        </div>

        {ev.rosters.map((r) => {
          const members = ev.signups.filter((s) => s.assignment === r.id)
          if (members.length === 0) return null
          const isScored = Boolean(r.scoredBy)
          const unscoredCount = members.filter(
            (m) => m.attendanceOutcome === 'NONE' && m.confirmStatus !== 'DECLINED_EXCUSED',
          ).length
          return (
            <div key={r.id} className="overflow-hidden rounded-xl border border-border/80 bg-[#071422]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <span>{r.name}</span>
                  <span className="text-muted-foreground">({members.length})</span>
                  {isScored && <Badge className="border-emerald-500/40 bg-emerald-500/15 text-[10px] text-emerald-300">Onaylandı</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <GhostButton
                    disabled={busy || !eventHasStarted}
                    onClick={() =>
                      void runAction(
                        {
                          action: 'set_attendance_outcome',
                          eventId: ev.id,
                          updates: members.map((m) => ({
                            signupId: m.id,
                            flags: m.confirmStatus === 'DECLINED_EXCUSED' ? { excused: true } : { attended: true },
                            outcome: m.confirmStatus === 'DECLINED_EXCUSED' ? 'EXCUSED' : 'ATTENDED',
                          })),
                        },
                        `Tüm grup Katıldı (+${basePts}p) işaretlendi.`,
                      )
                    }
                    className="px-2.5 py-1 text-[11px]"
                  >
                    <Check className="size-3" /> Tümünü Katıldı (+{basePts}p)
                  </GhostButton>
                  <button
                    type="button"
                    disabled={busy || !eventHasStarted || (!isScored && unscoredCount > 0)}
                    onClick={() =>
                      void runAction(
                        { action: 'mark_roster_scored', eventId: ev.id, rosterId: r.id, scored: !isScored },
                        isScored ? 'Grup onayı kaldırıldı.' : 'Grup onaylandı.',
                      )
                    }
                    className="cursor-pointer rounded-lg border border-gold/45 bg-gold/15 px-2.5 py-1 text-[11px] font-semibold text-gold disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {isScored ? 'Onayı Kaldır' : 'Grubu Onayla'}
                  </button>
                </div>
              </div>
              <div className="divide-y divide-border/40">
                {members.map((s) => {
                  const defaultOutcome: AttendanceOutcome =
                    s.attendanceOutcome !== 'NONE'
                      ? s.attendanceOutcome
                      : s.confirmStatus === 'DECLINED_EXCUSED'
                        ? 'EXCUSED'
                        : 'NONE'
                  const activeFlags: AttendanceFlags = s.attendanceFlags
                    ? s.attendanceFlags
                    : resolveAttendanceFlags({ attendanceOutcome: defaultOutcome })
                  const isUnscored = deriveOutcomeFromFlags(activeFlags) === 'NONE'
                  const bd = calculateSignupPoints(
                    { ...s, attendanceOutcome: deriveOutcomeFromFlags(activeFlags), attendanceFlags: activeFlags },
                    ev.size,
                    rules,
                  )
                  const setFlags = (next: AttendanceFlags) =>
                    void runAction(
                      {
                        action: 'set_attendance_outcome',
                        eventId: ev.id,
                        signupId: s.id,
                        flags: next,
                        outcome: deriveOutcomeFromFlags(next),
                      },
                      'Durum güncellendi.',
                    )

                  return (
                    <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs">
                      <span className="font-semibold" style={{ color: CLASS_COLORS[s.wowClass] }}>
                        {s.characterName} <span className="font-normal text-muted-foreground">({s.spec})</span>
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(
                          [
                            ['attended', `Katıldı +${basePts}p`, { attended: true }],
                            ['benchReady', `Yedek +${rules.benchReadyPoints ?? 6}p`, { benchReady: true }],
                            ['excused', 'Mazeret 0p', { excused: true }],
                            ['noShow', `No-Show ${rules.noShowPenalty}p`, { noShow: true }],
                          ] as const
                        ).map(([k, lbl, nextObj]) => (
                          <button
                            key={k}
                            type="button"
                            disabled={busy || !eventHasStarted}
                            onClick={() => setFlags(activeFlags[k] ? {} : nextObj)}
                            className={cn(
                              'cursor-pointer rounded border px-2 py-0.5 text-[11px] font-medium disabled:cursor-not-allowed disabled:opacity-45',
                              activeFlags[k]
                                ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200'
                                : 'border-border/70 text-muted-foreground hover:text-foreground',
                            )}
                          >
                            {lbl}
                          </button>
                        ))}
                        <span className="ml-2 w-20 text-right font-mono font-bold text-gold">
                          {isUnscored ? 'İncelenmedi' : `${bd.total > 0 ? `+${bd.total}` : bd.total}p`}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* BETA Comparison Switcher Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/35 bg-gradient-to-r from-gold/10 via-[#081728] to-neon/10 px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded border border-gold/50 bg-gold/20 px-2 py-0.5 text-[10px] font-black tracking-wider text-gold uppercase">
              {categoryMeta ? `RAİD KAYIT 2 · ${categoryMeta.sizeLabel}` : meta.badge}
            </span>
            <h1 className="font-display text-base font-bold text-foreground sm:text-lg">
              {categoryMeta ? categoryMeta.label : meta.title}
            </h1>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {categoryMeta ? categoryMeta.description : meta.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {([1, 2, 3] as RaidSignupVariantId[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onNavigate?.(VARIANT_META[v].tabId)}
              className={cn(
                'cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition',
                variant === v
                  ? 'border-gold bg-gold/20 text-gold'
                  : 'border-border/80 bg-[#071422] text-muted-foreground hover:border-neon/40 hover:text-foreground',
              )}
            >
              {v === 1 ? '1 · Minimalist' : v === 2 ? '2 · Takvim & Rol' : '3 · Komuta'}
            </button>
          ))}
          <GhostButton type="button" onClick={() => setShowCycle((s) => !s)} className="px-2.5 py-1.5 text-xs">
            <CalendarClock className="size-3.5" /> Döngü
          </GhostButton>
          {isOfficer && (
            <GoldButton onClick={() => openCreateForRaid(filterRaidId)} className="px-3 py-1.5 text-xs">
              <CalendarPlus className="size-3.5" />
              {categoryMeta ? `Yeni ${categoryMeta.short} Aç` : 'Yeni Raid'}
            </GoldButton>
          )}
        </div>
      </div>

      {showCycle && (
        <Panel className="border-neon/30 bg-[#081728]">
          <WeeklyRaidTimeline rules={rules} />
        </Panel>
      )}

      {variant !== 2 && activeEvents.length === 0 ? (
        <Panel className="border-dashed border-border/80 py-14 text-center">
          <Swords className="mx-auto size-10 text-gold/55" />
          <p className="mt-3 font-display text-lg font-bold text-foreground">
            {categoryMeta
              ? `Şu an açık ${categoryMeta.label} takvimi yok`
              : 'Şu an aktif etkinlik yok'}
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            {categoryMeta
              ? isOfficer
                ? `Yeni bir ${categoryMeta.label} (${categoryMeta.sizeLabel}) etkinliği açtığınızda 4 rol sütunlu kadro panosu burada görünecektir.`
                : `Officerlar yeni ${categoryMeta.label} takvimi açtığında buradan tek tıkla imza atabilirsiniz.`
              : 'Yeni Raid düğmesiyle bir etkinlik açabilirsiniz.'}
          </p>
          {isOfficer && (
            <div className="mt-4 flex justify-center">
              <GoldButton onClick={() => openCreateForRaid(filterRaidId)} className="px-4 py-2 text-xs">
                <CalendarPlus className="size-4" />
                {categoryMeta ? `${categoryMeta.label} (${categoryMeta.sizeLabel}) Aç` : 'Yeni Raid Aç'}
              </GoldButton>
            </div>
          )}
        </Panel>
      ) : (
        <>
          {/* ======================================================================== */}
          {/* ALTERNATİF 1 — MİNİMALİST & FERAH TEK SATIR LİSTE                       */}
          {/* ======================================================================== */}
          {variant === 1 && selectedEvent && (() => {
            const ev = selectedEvent
            const poolSignups = ev.signups.filter((s) => s.assignment === 'POOL')
            const benchSignups = ev.signups.filter((s) => s.assignment === 'BENCH')
            const isMeeting = isGuildMeetingEvent(ev.raidId)

            const groups = [
              ...ev.rosters.map((r, idx) => ({
                id: r.id,
                kind: 'roster' as const,
                name: r.name,
                color: r.color || ROSTER_COLOR_PRESETS[idx % ROSTER_COLOR_PRESETS.length].hex,
                members: ev.signups
                  .filter((s) => s.assignment === r.id)
                  .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)),
              })),
              {
                id: 'POOL',
                kind: 'pool' as const,
                name: 'İmza Havuzu (Atama Bekleyen)',
                color: '#00f2fe',
                members: poolSignups,
              },
              {
                id: 'BENCH',
                kind: 'bench' as const,
                name: `Yedek / Bench (+${rules.benchReadyPoints ?? 6}p)`,
                color: '#22d3ee',
                members: benchSignups,
              },
            ]

            const visibleGroups =
              v1Section === 'all' ? groups.filter((g) => g.kind === 'roster' || g.members.length > 0) : groups.filter((g) => g.id === v1Section)

            return (
              <div className="space-y-5">
                {/* Single Clean Event Pill Selector — NO duplicate giant box! */}
                {activeEvents.length > 1 && (
                  <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
                    {activeEvents.map((item) => {
                      const active = item.id === ev.id
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedEventId(item.id)}
                          className={cn(
                            'inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition',
                            active
                              ? 'border-gold/70 bg-gold/15 text-gold'
                              : 'border-border/70 bg-[#071422] text-muted-foreground hover:border-border hover:text-foreground',
                          )}
                        >
                          <span>{item.raidName}</span>
                          <span className="font-mono text-[11px] opacity-75">· {item.signups.length}</span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Minimalist Flat Summary Header */}
                <div className="rounded-2xl border border-border/75 bg-[#071422]/90 px-5 py-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-xl font-bold text-gold">{ev.raidName}</h2>
                        <span className="rounded-md border border-border/70 bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-silver">
                          {isMeeting ? 'Tüm Guild' : `${ev.size}-Man`}
                        </span>
                        <span
                          className={cn(
                            'rounded-md px-2 py-0.5 text-[11px] font-semibold',
                            ev.status === 'ROSTERS_PUBLISHED'
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-neon/10 text-neon',
                          )}
                        >
                          {ev.status === 'ROSTERS_PUBLISHED' ? 'Roster Yayında' : 'İmza Açık'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{formatTrDateTime(ev.scheduledAt)}</span>
                        <span>
                          İmza Kapanış: <CountdownPill targetIso={ev.signupDeadline} className="text-neon" />
                        </span>
                        <span>
                          Onay Kapanış: <CountdownPill targetIso={ev.confirmDeadline} className="text-gold" />
                        </span>
                      </div>
                      {ev.notes && <p className="max-w-3xl pt-1 text-xs leading-relaxed text-silver/80">{ev.notes}</p>}
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {renderPlayerCta(ev, true)}
                    </div>
                  </div>

                  {/* Minimalist Filter & Officer Bar */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPostRaid(false)
                          setV1Section('all')
                        }}
                        className={cn(
                          'cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition',
                          !showPostRaid && v1Section === 'all'
                            ? 'bg-white/10 text-foreground'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        Tümü ({ev.signups.length})
                      </button>
                      {groups.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            setShowPostRaid(false)
                            setV1Section(g.id)
                          }}
                          className={cn(
                            'cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition',
                            !showPostRaid && v1Section === g.id
                              ? 'bg-gold/15 text-gold'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          {g.kind === 'pool' ? 'Havuz' : g.kind === 'bench' ? 'Bench' : shortRosterLabel(g.name, 0)} ({g.members.length})
                        </button>
                      ))}
                      {isOfficer && (
                        <button
                          type="button"
                          onClick={() => setShowPostRaid(true)}
                          className={cn(
                            'cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition',
                            showPostRaid ? 'bg-gold/15 text-gold' : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          Puanlama &amp; Arşiv
                        </button>
                      )}
                    </div>

                    {isOfficer && !showPostRaid && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <GhostButton
                          disabled={busy}
                          onClick={() => {
                            setManualAddUsername(guildMembers[0]?.username || '')
                            setManualAddAssignment(ev.rosters[0]?.id || 'POOL')
                            setAddMemberModalEvent(ev)
                          }}
                          className="px-2.5 py-1 text-[11px]"
                        >
                          <UserPlus className="size-3" /> Üye Ekle
                        </GhostButton>
                        <GhostButton
                          disabled={busy}
                          onClick={() =>
                            void runAction({ action: 'add_roster', eventId: ev.id }, 'Yeni grup oluşturuldu.')
                          }
                          className="px-2.5 py-1 text-[11px]"
                        >
                          <Plus className="size-3" /> Grup Ekle
                        </GhostButton>
                        <GoldButton
                          disabled={busy}
                          onClick={() =>
                            void runAction({ action: 'publish_rosters', eventId: ev.id }, 'Roster yayınlandı!')
                          }
                          className="px-2.5 py-1 text-[11px]"
                        >
                          <Send className="size-3" /> Yayınla
                        </GoldButton>
                      </div>
                    )}
                  </div>
                </div>

                {/* Full-Width Clean Minimalist Table Rows — ZERO text wrapping / overlap */}
                {showPostRaid && isOfficer ? (
                  renderPostRaidPanel(ev)
                ) : (
                  <div className="space-y-4">
                    {visibleGroups.map((grp) => {
                      const tCount = grp.members.filter((m) => m.role === 'TANK').length
                      const hCount = grp.members.filter((m) => m.role === 'HEALER').length
                      const dCount = grp.members.filter((m) => m.role === 'MELEE' || m.role === 'RANGED').length

                      return (
                        <div
                          key={grp.id}
                          className="overflow-hidden rounded-xl border border-border/70 bg-[#071422]/80"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <span className="size-2 rounded-full" style={{ backgroundColor: grp.color }} />
                              <h3 className="font-display text-sm font-bold text-foreground">{grp.name}</h3>
                              <span className="font-mono text-xs text-muted-foreground">
                                {grp.kind === 'roster' && !isMeeting
                                  ? `${grp.members.length}/${ev.size}`
                                  : `${grp.members.length} kişi`}
                              </span>
                              {grp.kind === 'roster' && renderRosterHeaderActions(ev, grp.id, grp.name, grp.color)}
                            </div>
                            <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                              <span className="text-sky-300">T:{tCount}</span>
                              <span className="text-emerald-300">H:{hCount}</span>
                              <span className="text-amber-300">D:{dCount}</span>
                            </div>
                          </div>

                          {grp.members.length === 0 ? (
                            <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                              Bu listede henüz oyuncu yok.
                            </p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[680px] text-left text-xs">
                                <thead>
                                  <tr className="border-b border-border/40 text-[10px] tracking-wider text-muted-foreground/80 uppercase">
                                    <th className="py-2 pr-3 pl-4 font-semibold">Karakter</th>
                                    <th className="px-3 py-2 font-semibold">Rol / Spec</th>
                                    <th className="px-3 py-2 font-semibold">Rütbe &amp; Puan</th>
                                    <th className="px-3 py-2 font-semibold">Durum</th>
                                    {isOfficer && <th className="py-2 pr-4 pl-3 text-right font-semibold">Grup</th>}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/35">
                                  {grp.members.map((s) => {
                                    const rk = rankByUser.get(s.username.toLowerCase())
                                    const pts = pointsByUser.get(s.username.toLowerCase()) ?? 0
                                    const rm = ROLE_META[s.role]
                                    const RIcon = rm.icon
                                    return (
                                      <tr key={s.id} className="transition hover:bg-white/[0.025]">
                                        <td className="py-2.5 pr-3 pl-4 whitespace-nowrap">
                                          <span
                                            className="font-semibold"
                                            style={{ color: CLASS_COLORS[s.wowClass] || '#fff' }}
                                          >
                                            {s.characterName}
                                          </span>
                                          {s.level < 60 && (
                                            <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] text-amber-300">
                                              Lv{s.level}
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2.5 whitespace-nowrap">
                                          <span className={cn('inline-flex items-center gap-1.5', rm.color)}>
                                            <RIcon className="size-3.5 shrink-0" />
                                            <span className="font-medium text-silver">{s.spec}</span>
                                            <span className="text-[10px] text-muted-foreground">({rm.short})</span>
                                          </span>
                                        </td>
                                        <td className="px-3 py-2.5 whitespace-nowrap">
                                          <span className="inline-flex items-center gap-1.5">
                                            {rk && (
                                              <RankPill
                                                label={rk.label}
                                                color={rk.color}
                                                armoryRankId={rk.armoryRankId}
                                              />
                                            )}
                                            <PointsPill points={pts} />
                                          </span>
                                        </td>
                                        <td className="px-3 py-2.5 whitespace-nowrap">
                                          <ConfirmDot
                                            status={s.confirmStatus}
                                            published={ev.status === 'ROSTERS_PUBLISHED'}
                                          />
                                        </td>
                                        {isOfficer && (
                                          <td className="py-2.5 pr-4 pl-3 text-right whitespace-nowrap">
                                            <CompactAssignControl
                                              signup={s}
                                              event={ev}
                                              busy={busy}
                                              mode="select"
                                              onAssign={(sid, asg) =>
                                                void runAction(
                                                  { action: 'assign_member', eventId: ev.id, signupId: sid, assignment: asg },
                                                  'Atama güncellendi.',
                                                )
                                              }
                                            />
                                          </td>
                                        )}
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })()}

          {/* ======================================================================== */}
          {/* ALTERNATİF 2 — TAKVİM (-2/+2 HAFTA & AYLIK) + 4 ROL SÜTUNLU RAID PANOSU */}
          {/* ======================================================================== */}
          {variant === 2 && (() => {
            const ev = selectedEvent
            const isArchivedSelected = ev?.status === 'ARCHIVED'

            return (
              <div className="space-y-5">
                {/* Monday-First 5-Week (-2/+2) & Monthly Calendar */}
                <RaidCalendarGrid
                  events={allEventsSorted}
                  selectedEventId={ev?.id || null}
                  onSelectEvent={(clicked) => {
                    setSelectedEventId(clicked.id)
                    setShowPostRaid(false)
                  }}
                  isOfficer={isOfficer}
                  onQuickCreateForDate={(dateKey) => openCreateForRaid(v2CalendarFilter, dateKey)}
                  raidTypeFilter={v2CalendarFilter}
                  onRaidTypeFilterChange={(rid) => setV2CalendarFilter(rid)}
                />

                {!ev ? (
                  <Panel className="border-dashed border-border/80 py-10 text-center">
                    <CalendarClock className="mx-auto size-8 text-muted-foreground/60" />
                    <p className="mt-2 font-display text-base font-bold text-foreground">
                      Takvimden bir etkinlik seçin
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isOfficer
                        ? 'Gelecek bir gün kutusunun sağ üstündeki + simgesiyle veya üstteki Yeni Raid düğmesiyle takvime raid ekleyebilirsiniz.'
                        : 'Yeşil ışıklı raid kutularına tıklayarak kadroyu görebilir ve imza atabilirsiniz.'}
                    </p>
                  </Panel>
                ) : isArchivedSelected ? (
                  (() => {
                    const archiveGroups = [
                      ...ev.rosters.map((r, rIdx) => ({
                        id: r.id,
                        name: r.name,
                        color: r.color || ROSTER_COLOR_PRESETS[rIdx % ROSTER_COLOR_PRESETS.length].hex,
                        members: ev.signups.filter((s) => s.assignment === r.id),
                      })),
                      ...(ev.signups.some((s) => s.assignment === 'BENCH')
                        ? [
                            {
                              id: 'BENCH',
                              name: 'Yedek / Bench',
                              color: '#22d3ee',
                              members: ev.signups.filter((s) => s.assignment === 'BENCH'),
                            },
                          ]
                        : []),
                    ]
                    return (
                      <Panel className="border-rose-500/35 bg-gradient-to-br from-rose-950/30 via-[#081524] to-[#071220] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-500/25 pb-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="font-display text-lg font-bold text-rose-200">{ev.raidName}</h2>
                              <Badge className="border-rose-500/40 bg-rose-500/15 text-rose-300">
                                <Archive className="size-3" /> Arşivlendi
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatTrDateTime(ev.scheduledAt)} · Arşivleyen: {ev.archivedBy || '—'} ·{' '}
                              {ev.signups.length} katılımcı
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 space-y-4">
                          {archiveGroups.map((grp) => (
                            <div key={grp.id} className="overflow-hidden rounded-xl border border-border/60 bg-[#071422]/85">
                              <div className="flex items-center justify-between border-b border-border/50 px-4 py-2 text-xs">
                                <span className="font-display font-bold" style={{ color: grp.color }}>
                                  {grp.name} ({grp.members.length})
                                </span>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="border-b border-border/40 text-[10px] text-muted-foreground uppercase">
                                      <th className="py-1.5 pr-3 pl-4">Karakter</th>
                                      <th className="px-3 py-1.5">Durum</th>
                                      <th className="px-3 py-1.5 text-right">İmza/Onay</th>
                                      <th className="px-3 py-1.5 text-right">Raid/Yedek</th>
                                      <th className="px-3 py-1.5 text-right">Ceza</th>
                                      <th className="py-1.5 pr-4 pl-3 text-right">Net Puan</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border/35">
                                    {grp.members.map((s) => {
                                      const bd = s.pointsBreakdown || calculateSignupPoints(s, ev.size, rules)
                                      return (
                                        <tr key={s.id}>
                                          <td className="py-2 pr-3 pl-4 font-semibold" style={{ color: CLASS_COLORS[s.wowClass] || '#fff' }}>
                                            {s.characterName}{' '}
                                            <span className="font-normal text-muted-foreground">({s.spec})</span>
                                          </td>
                                          <td className="px-3 py-2 text-silver">{s.attendanceOutcome}</td>
                                          <td className="px-3 py-2 text-right font-mono text-cyan-300">+{bd.signup + bd.confirm}</td>
                                          <td className="px-3 py-2 text-right font-mono text-emerald-300">+{bd.raid}</td>
                                          <td className="px-3 py-2 text-right font-mono text-rose-400">
                                            {bd.penalty < 0 ? bd.penalty : '0'}
                                          </td>
                                          <td className="py-2 pr-4 pl-3 text-right font-mono font-bold text-gold">
                                            {bd.total > 0 ? `+${bd.total}` : bd.total}p
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Panel>
                    )
                  })()
                ) : (() => {
                  const poolSignups = ev.signups.filter((s) => s.assignment === 'POOL')
                  const benchSignups = ev.signups.filter((s) => s.assignment === 'BENCH')
                  const isMeeting = isGuildMeetingEvent(ev.raidId)
                  const visibleRosters =
                    v2RosterId === 'all' ? ev.rosters : ev.rosters.filter((r) => r.id === v2RosterId)
                  const isPastNotArchived = new Date(ev.scheduledAt).getTime() < Date.now()

                  return (
                    <>
                      {/* Unified Selected Event Command Bar */}
                      <Panel
                        className={cn(
                          'p-4',
                          isPastNotArchived
                            ? 'border-rose-500/40 bg-gradient-to-br from-rose-950/25 via-[#081626] to-[#071220]'
                            : 'border-emerald-400/40 bg-gradient-to-br from-emerald-950/25 via-[#081626] to-[#071220]',
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                'size-2.5 rounded-full',
                                isPastNotArchived
                                  ? 'bg-rose-400'
                                  : 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]',
                              )}
                            />
                            <h2 className="font-display text-xl font-bold text-gold">{ev.raidName}</h2>
                            <Badge className="border-purple-400/35 bg-purple-500/15 text-purple-200">
                              {isMeeting ? 'Tüm Guild' : `${ev.size}-Man`}
                            </Badge>
                            <Badge
                              className={
                                isPastNotArchived
                                  ? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                                  : 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                              }
                            >
                              {isPastNotArchived
                                ? 'Süresi Geçti · Arşiv Bekliyor'
                                : ev.status === 'ROSTERS_PUBLISHED'
                                  ? 'Roster Yayında'
                                  : 'İmza Açık'}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-[#071422]/85 px-3 py-1.5 text-[11px]">
                              <span className="text-muted-foreground">
                                <Clock className="mr-1 inline size-3 text-neon" />
                                İmza: <CountdownPill targetIso={ev.signupDeadline} className="text-neon" />
                              </span>
                              <span className="text-border">|</span>
                              <span className="text-muted-foreground">
                                Onay: <CountdownPill targetIso={ev.confirmDeadline} className="text-gold" />
                              </span>
                            </div>
                            {renderPlayerCta(ev, true)}
                          </div>
                        </div>

                        {ev.notes && <p className="mt-2 text-xs text-silver/85">{ev.notes}</p>}

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3 text-xs">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="mr-1 text-silver">{formatTrDateTime(ev.scheduledAt)}</span>
                            {ev.rosters.length > 1 && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowPostRaid(false)
                                    setV2RosterId('all')
                                  }}
                                  className={cn(
                                    'cursor-pointer rounded-md border px-2 py-0.5 text-[11px] font-semibold',
                                    !showPostRaid && v2RosterId === 'all'
                                      ? 'border-gold/50 bg-gold/15 text-gold'
                                      : 'border-border/70 text-muted-foreground',
                                  )}
                                >
                                  Tüm Gruplar
                                </button>
                                {ev.rosters.map((r, idx) => (
                                  <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => {
                                      setShowPostRaid(false)
                                      setV2RosterId(r.id)
                                    }}
                                    className={cn(
                                      'cursor-pointer rounded-md border px-2 py-0.5 text-[11px] font-semibold',
                                      !showPostRaid && v2RosterId === r.id
                                        ? 'border-neon/50 bg-neon/15 text-neon'
                                        : 'border-border/70 text-muted-foreground',
                                    )}
                                  >
                                    {shortRosterLabel(r.name, idx)}
                                  </button>
                                ))}
                              </>
                            )}
                          </div>

                          {isOfficer && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <GhostButton
                                onClick={() => setShowPostRaid((v) => !v)}
                                className={cn('px-2.5 py-1 text-[11px]', showPostRaid && 'border-gold/60 bg-gold/15 text-gold')}
                              >
                                <Archive className="size-3" /> {showPostRaid ? 'Panoya Dön' : 'Puanlama & Arşiv'}
                              </GhostButton>
                              <GhostButton
                                disabled={busy}
                                onClick={() => {
                                  setManualAddUsername(guildMembers[0]?.username || '')
                                  setManualAddAssignment(ev.rosters[0]?.id || 'POOL')
                                  setAddMemberModalEvent(ev)
                                }}
                                className="px-2.5 py-1 text-[11px]"
                              >
                                <UserPlus className="size-3" /> Üye Ekle
                              </GhostButton>
                              <GhostButton
                                disabled={busy}
                                onClick={() =>
                                  void runAction({ action: 'add_roster', eventId: ev.id }, 'Yeni grup eklendi.')
                                }
                                className="px-2.5 py-1 text-[11px]"
                              >
                                <Plus className="size-3" /> Grup
                              </GhostButton>
                              <GoldButton
                                disabled={busy}
                                onClick={() =>
                                  void runAction({ action: 'publish_rosters', eventId: ev.id }, 'Roster yayınlandı!')
                                }
                                className="px-2.5 py-1 text-[11px]"
                              >
                                <Send className="size-3" /> Yayınla
                              </GoldButton>
                            </div>
                          )}
                        </div>
                      </Panel>

                {showPostRaid && isOfficer ? (
                  renderPostRaidPanel(ev)
                ) : (
                  <>
                    {/* Full-Width 4-Role Column Boards for Each Roster */}
                    {visibleRosters.map((roster, rIdx) => {
                      const members = ev.signups.filter((s) => s.assignment === roster.id)
                      const color = roster.color || ROSTER_COLOR_PRESETS[rIdx % ROSTER_COLOR_PRESETS.length].hex

                      return (
                        <Panel
                          key={roster.id}
                          className="relative overflow-hidden p-4"
                          style={{ borderColor: `${color}45` }}
                        >
                          <div
                            className="pointer-events-none absolute inset-x-0 top-0 h-0.5"
                            style={{ backgroundColor: color }}
                          />
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
                              <h3 className="font-display text-base font-bold" style={{ color }}>
                                {roster.name}
                              </h3>
                              <span className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-xs text-silver">
                                {isMeeting ? `${members.length} katılımcı` : `${members.length}/${ev.size}`}
                              </span>
                              {renderRosterHeaderActions(ev, roster.id, roster.name, color)}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px]">
                              {ROLE_ORDER.map((rk) => {
                                const cnt = members.filter((m) => m.role === rk).length
                                return (
                                  <span key={rk} className={cn('rounded border px-2 py-0.5 font-mono font-semibold', ROLE_META[rk].chip)}>
                                    {ROLE_META[rk].label.split(' ')[0]}: {cnt}
                                  </span>
                                )
                              })}
                            </div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            {ROLE_ORDER.map((roleKey) => {
                              const rm = ROLE_META[roleKey]
                              const RIcon = rm.icon
                              const list = members.filter((m) => m.role === roleKey)
                              return (
                                <div
                                  key={roleKey}
                                  className={cn('flex flex-col rounded-xl border bg-[#06111e]/90', rm.border)}
                                >
                                  <div className={cn('flex items-center justify-between rounded-t-xl px-3 py-2 text-xs font-bold', rm.headerBg, rm.color)}>
                                    <span className="flex items-center gap-1.5">
                                      <RIcon className="size-3.5" />
                                      {rm.label}
                                    </span>
                                    <span className="font-mono">{list.length}</span>
                                  </div>
                                  <div className="flex-1 space-y-2 p-2.5">
                                    {list.length === 0 ? (
                                      <p className="py-4 text-center text-[11px] text-muted-foreground/60">Boş</p>
                                    ) : (
                                      list.map((s) => {
                                        const rk = rankByUser.get(s.username.toLowerCase())
                                        const pts = pointsByUser.get(s.username.toLowerCase()) ?? 0
                                        return (
                                          <div
                                            key={s.id}
                                            className="rounded-lg border border-border/65 bg-[#0a1a2c] px-3 py-2 transition hover:border-border"
                                          >
                                            <div className="flex items-center justify-between gap-2">
                                              <span
                                                className="truncate text-xs font-bold"
                                                style={{ color: CLASS_COLORS[s.wowClass] || '#fff' }}
                                                title={s.characterName}
                                              >
                                                {s.characterName}
                                              </span>
                                              <ConfirmDot
                                                status={s.confirmStatus}
                                                published={ev.status === 'ROSTERS_PUBLISHED'}
                                              />
                                            </div>
                                            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                                              <span className="text-muted-foreground">
                                                {s.spec}
                                                {s.level < 60 && (
                                                  <span className="ml-1 text-amber-300">· Lv{s.level}</span>
                                                )}
                                              </span>
                                              <span className="inline-flex items-center gap-1">
                                                {rk && <RankPill label={rk.label} color={rk.color} armoryRankId={rk.armoryRankId} />}
                                                <PointsPill points={pts} />
                                              </span>
                                            </div>
                                            {isOfficer && (
                                              <div className="mt-2 flex justify-end border-t border-border/40 pt-1.5">
                                                <CompactAssignControl
                                                  signup={s}
                                                  event={ev}
                                                  busy={busy}
                                                  mode="quick-chips"
                                                  onAssign={(sid, asg) =>
                                                    void runAction(
                                                      { action: 'assign_member', eventId: ev.id, signupId: sid, assignment: asg },
                                                      'Atama güncellendi.',
                                                    )
                                                  }
                                                />
                                              </div>
                                            )}
                                          </div>
                                        )
                                      })
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </Panel>
                      )
                    })}

                    {/* Full-Width Bottom Strips for Pool & Bench — NEVER squeezed into a narrow sidebar */}
                    <div className="grid gap-4 lg:grid-cols-2">
                      <Panel className="border-neon/25 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="flex items-center gap-2 font-display text-sm font-bold text-neon">
                            <Users className="size-4" /> İmza Havuzu (Atama Bekleyen)
                          </h3>
                          <Badge className="border-neon/35 bg-neon/10 text-neon">{poolSignups.length}</Badge>
                        </div>
                        {poolSignups.length === 0 ? (
                          <p className="py-3 text-center text-xs text-muted-foreground">Havuzda bekleyen imza yok.</p>
                        ) : (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {poolSignups.map((s) => {
                              const rk = rankByUser.get(s.username.toLowerCase())
                              const pts = pointsByUser.get(s.username.toLowerCase()) ?? 0
                              return (
                                <div key={s.id} className="rounded-lg border border-border/70 bg-[#071422] p-2.5 text-xs">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="truncate font-bold" style={{ color: CLASS_COLORS[s.wowClass] }}>
                                      {s.characterName}
                                    </span>
                                    <span className="inline-flex shrink-0 items-center gap-1">
                                      {rk && <RankPill label={rk.label} color={rk.color} armoryRankId={rk.armoryRankId} />}
                                      <PointsPill points={pts} />
                                    </span>
                                  </div>
                                  <div className="mt-1.5 flex items-center justify-between gap-2">
                                    <span className="text-[11px] text-muted-foreground">{s.spec} · {ROLE_META[s.role].short}</span>
                                    {isOfficer && (
                                      <CompactAssignControl
                                        signup={s}
                                        event={ev}
                                        busy={busy}
                                        mode="quick-chips"
                                        onAssign={(sid, asg) =>
                                          void runAction(
                                            { action: 'assign_member', eventId: ev.id, signupId: sid, assignment: asg },
                                            'Atama güncellendi.',
                                          )
                                        }
                                      />
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </Panel>

                      <Panel className="border-cyan-500/25 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="flex items-center gap-2 font-display text-sm font-bold text-cyan-300">
                            <UserMinus className="size-4" /> Yedek / Bench (+{rules.benchReadyPoints ?? 6}p)
                          </h3>
                          <Badge className="border-cyan-500/35 bg-cyan-500/10 text-cyan-300">{benchSignups.length}</Badge>
                        </div>
                        {benchSignups.length === 0 ? (
                          <p className="py-3 text-center text-xs text-muted-foreground">Henüz bench atanmadı.</p>
                        ) : (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {benchSignups.map((s) => {
                              const rk = rankByUser.get(s.username.toLowerCase())
                              const pts = pointsByUser.get(s.username.toLowerCase()) ?? 0
                              return (
                                <div key={s.id} className="rounded-lg border border-border/70 bg-[#071422] p-2.5 text-xs">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="truncate font-bold" style={{ color: CLASS_COLORS[s.wowClass] }}>
                                      {s.characterName}
                                    </span>
                                    <span className="inline-flex shrink-0 items-center gap-1">
                                      {rk && <RankPill label={rk.label} color={rk.color} armoryRankId={rk.armoryRankId} />}
                                      <PointsPill points={pts} />
                                    </span>
                                  </div>
                                  <div className="mt-1.5 flex items-center justify-between gap-2">
                                    <span className="text-[11px] text-muted-foreground">{s.spec} · {ROLE_META[s.role].short}</span>
                                    {isOfficer && (
                                      <CompactAssignControl
                                        signup={s}
                                        event={ev}
                                        busy={busy}
                                        mode="quick-chips"
                                        onAssign={(sid, asg) =>
                                          void runAction(
                                            { action: 'assign_member', eventId: ev.id, signupId: sid, assignment: asg },
                                            'Atama güncellendi.',
                                          )
                                        }
                                      />
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </Panel>
                    </div>
                  </>
                )}
                    </>
                  )
                })()}
              </div>
            )
          })()}

          {/* ======================================================================== */}
          {/* ALTERNATİF 3 — KOMUTA MERKEZİ (SOL TAKVİM + SAĞ GENİŞ SEKMELİ ALAN)      */}
          {/* ======================================================================== */}
          {variant === 3 && selectedEvent && (() => {
            const ev = selectedEvent
            const poolSignups = ev.signups.filter((s) => s.assignment === 'POOL')
            const benchSignups = ev.signups.filter((s) => s.assignment === 'BENCH')
            const isMeeting = isGuildMeetingEvent(ev.raidId)

            const activeRoster = ev.rosters.find((r) => r.id === v3Tab) || null
            const activeList: RaidEventSignup[] =
              v3Tab === 'POOL'
                ? poolSignups
                : v3Tab === 'BENCH'
                  ? benchSignups
                  : ev.signups
                      .filter((s) => s.assignment === v3Tab)
                      .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role))

            return (
              <div className="grid gap-5 lg:grid-cols-12">
                {/* Left Compact Events Rail */}
                <div className="space-y-2.5 lg:col-span-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                      Aktif Etkinlikler ({activeEvents.length})
                    </span>
                  </div>
                  {activeEvents.map((item) => {
                    const selected = item.id === ev.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedEventId(item.id)}
                        className={cn(
                          'w-full cursor-pointer rounded-xl border p-3.5 text-left transition',
                          selected
                            ? 'border-gold/65 bg-gradient-to-br from-gold/15 via-[#0b1d30] to-[#071422] shadow-[0_0_20px_rgba(212,175,55,0.12)]'
                            : 'border-border/70 bg-[#071422]/80 hover:border-neon/40',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-display text-sm font-bold leading-snug text-gold">{item.raidName}</p>
                          <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-silver">
                            {item.signups.length}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-silver/80">{formatTrShortDateTime(item.scheduledAt)}</p>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{isGuildMeetingEvent(item.raidId) ? 'Tüm Guild' : `${item.size}-Man`}</span>
                          <CountdownPill targetIso={item.signupDeadline} className="text-neon" />
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Right Full-Width Workspace */}
                <div className="space-y-4 lg:col-span-9">
                  <Panel className="border-border/80 bg-[#081626] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-display text-lg font-bold text-foreground">{ev.raidName}</h2>
                          <Badge className="border-neon/35 bg-neon/10 text-[11px] text-neon">
                            {ev.status === 'ROSTERS_PUBLISHED' ? 'Yayında' : 'İmza Açık'}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatTrDateTime(ev.scheduledAt)} · İmza:{' '}
                          <CountdownPill targetIso={ev.signupDeadline} className="text-neon" /> · Onay:{' '}
                          <CountdownPill targetIso={ev.confirmDeadline} className="text-gold" />
                        </p>
                        {ev.notes && <p className="mt-1.5 text-xs text-silver/85">{ev.notes}</p>}
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {renderPlayerCta(ev, true)}
                      </div>
                    </div>

                    {/* Horizontal Group / Pool / Bench Tabs */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {ev.rosters.map((r, idx) => {
                          const cnt = ev.signups.filter((s) => s.assignment === r.id).length
                          const active = !showPostRaid && v3Tab === r.id
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => {
                                setShowPostRaid(false)
                                setV3Tab(r.id)
                              }}
                              className={cn(
                                'cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                                active
                                  ? 'border-gold/60 bg-gold/15 text-gold'
                                  : 'border-border/70 bg-[#071422] text-muted-foreground hover:text-foreground',
                              )}
                            >
                              {shortRosterLabel(r.name, idx)}{' '}
                              <span className="font-mono opacity-80">
                                ({isMeeting ? cnt : `${cnt}/${ev.size}`})
                              </span>
                            </button>
                          )
                        })}
                        <button
                          type="button"
                          onClick={() => {
                            setShowPostRaid(false)
                            setV3Tab('POOL')
                          }}
                          className={cn(
                            'cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                            !showPostRaid && v3Tab === 'POOL'
                              ? 'border-neon/60 bg-neon/15 text-neon'
                              : 'border-border/70 bg-[#071422] text-muted-foreground hover:text-foreground',
                          )}
                        >
                          Havuz ({poolSignups.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowPostRaid(false)
                            setV3Tab('BENCH')
                          }}
                          className={cn(
                            'cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                            !showPostRaid && v3Tab === 'BENCH'
                              ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-200'
                              : 'border-border/70 bg-[#071422] text-muted-foreground hover:text-foreground',
                          )}
                        >
                          Bench ({benchSignups.length})
                        </button>
                        {isOfficer && (
                          <button
                            type="button"
                            onClick={() => setShowPostRaid(true)}
                            className={cn(
                              'cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                              showPostRaid
                                ? 'border-amber-400/60 bg-amber-500/15 text-amber-200'
                                : 'border-border/70 bg-[#071422] text-muted-foreground hover:text-foreground',
                            )}
                          >
                            Puanlama &amp; Arşiv
                          </button>
                        )}
                      </div>

                      {isOfficer && !showPostRaid && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <GhostButton
                            disabled={busy}
                            onClick={() => {
                              setManualAddUsername(guildMembers[0]?.username || '')
                              setManualAddAssignment(activeRoster?.id || 'POOL')
                              setAddMemberModalEvent(ev)
                            }}
                            className="px-2.5 py-1 text-[11px]"
                          >
                            <UserPlus className="size-3" /> Üye Ekle
                          </GhostButton>
                          <GhostButton
                            disabled={busy}
                            onClick={() =>
                              void runAction({ action: 'add_roster', eventId: ev.id }, 'Yeni grup oluşturuldu.')
                            }
                            className="px-2.5 py-1 text-[11px]"
                          >
                            <Plus className="size-3" /> Grup
                          </GhostButton>
                          <GoldButton
                            disabled={busy}
                            onClick={() =>
                              void runAction({ action: 'publish_rosters', eventId: ev.id }, 'Roster yayınlandı!')
                            }
                            className="px-2.5 py-1 text-[11px]"
                          >
                            <Send className="size-3" /> Yayınla
                          </GoldButton>
                        </div>
                      )}
                    </div>
                  </Panel>

                  {/* Active Tab Content — Wide Spacious Player Rows */}
                  {showPostRaid && isOfficer ? (
                    renderPostRaidPanel(ev)
                  ) : (
                    <Panel className="border-border/80 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-sm font-bold text-gold">
                            {v3Tab === 'POOL'
                              ? 'İmza Havuzu (Atama Bekleyen)'
                              : v3Tab === 'BENCH'
                                ? `Yedek / Bench (+${rules.benchReadyPoints ?? 6}p)`
                                : activeRoster?.name || 'Kadro'}
                          </h3>
                          {activeRoster &&
                            renderRosterHeaderActions(
                              ev,
                              activeRoster.id,
                              activeRoster.name,
                              activeRoster.color || '#d4af37',
                            )}
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          {ROLE_ORDER.map((rk) => (
                            <span key={rk} className={ROLE_META[rk].color}>
                              {ROLE_META[rk].short}:{activeList.filter((m) => m.role === rk).length}
                            </span>
                          ))}
                        </div>
                      </div>

                      {activeList.length === 0 ? (
                        <p className="py-10 text-center text-xs text-muted-foreground">
                          Bu sekmede henüz oyuncu bulunmuyor.
                        </p>
                      ) : (
                        <div className="grid gap-2 md:grid-cols-2">
                          {activeList.map((s) => {
                            const rk = rankByUser.get(s.username.toLowerCase())
                            const pts = pointsByUser.get(s.username.toLowerCase()) ?? 0
                            const rm = ROLE_META[s.role]
                            const RIcon = rm.icon
                            return (
                              <div
                                key={s.id}
                                className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-[#071422] px-3.5 py-2.5 transition hover:border-border"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <RIcon className={cn('size-3.5 shrink-0', rm.color)} />
                                    <span
                                      className="truncate text-xs font-bold"
                                      style={{ color: CLASS_COLORS[s.wowClass] || '#fff' }}
                                      title={s.characterName}
                                    >
                                      {s.characterName}
                                    </span>
                                    {rk && <RankPill label={rk.label} color={rk.color} armoryRankId={rk.armoryRankId} />}
                                    <PointsPill points={pts} />
                                  </div>
                                  <div className="mt-1 flex items-center gap-2 pl-5 text-[11px] text-muted-foreground">
                                    <span>{s.spec}</span>
                                    {s.level < 60 && <span className="text-amber-300">· Lv{s.level}</span>}
                                    <span>·</span>
                                    <ConfirmDot
                                      status={s.confirmStatus}
                                      published={ev.status === 'ROSTERS_PUBLISHED'}
                                    />
                                  </div>
                                </div>

                                {isOfficer && (
                                  <CompactAssignControl
                                    signup={s}
                                    event={ev}
                                    busy={busy}
                                    mode="quick-chips"
                                    onAssign={(sid, asg) =>
                                      void runAction(
                                        { action: 'assign_member', eventId: ev.id, signupId: sid, assignment: asg },
                                        'Atama güncellendi.',
                                      )
                                    }
                                  />
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </Panel>
                  )}
                </div>
              </div>
            )
          })()}
        </>
      )}

      {/* Shared Modals (Create, Confirm, Decline, Archive, Manual Add) */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Yeni Raid Takvimi Aç"
        description="Gün ve saat belirleyerek tek imza havuzu açın."
      >
        <form onSubmit={handleCreateEvent} className="space-y-4">
          <Field label="Raid / Etkinlik Seçimi">
            <select
              className={inputClass}
              value={newRaidId}
              onChange={(e) => setNewRaidId(e.target.value)}
            >
              <optgroup label="Raidler">
                {RAID_CATALOG.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.size}-Man)
                  </option>
                ))}
              </optgroup>
              <optgroup label="Özel Guild Etkinlikleri">
                {SPECIAL_EVENT_CATALOG.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} (Tüm Guild)
                  </option>
                ))}
              </optgroup>
            </select>
          </Field>
          <Field label="Tarih ve Saat (TR · UTC+3)">
            <input
              type="datetime-local"
              required
              className={inputClass}
              value={newScheduledAt}
              onChange={(e) => handleScheduledChange(e.target.value)}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="İmza Kapanış">
              <input
                type="datetime-local"
                required
                className={inputClass}
                value={newSignupDeadline}
                onChange={(e) => {
                  setDeadlinesAuto(false)
                  setNewSignupDeadline(e.target.value)
                }}
              />
            </Field>
            <Field label="Konfirmasyon Kapanış">
              <input
                type="datetime-local"
                required
                className={inputClass}
                value={newConfirmDeadline}
                onChange={(e) => {
                  setDeadlinesAuto(false)
                  setNewConfirmDeadline(e.target.value)
                }}
              />
            </Field>
          </div>
          {createDateValidationError && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-400" />
              <span>{createDateValidationError}</span>
            </div>
          )}
          <Field label="Officer Notu (Opsiyonel)">
            <input
              type="text"
              className={inputClass}
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <GhostButton type="button" onClick={() => setCreateOpen(false)}>İptal</GhostButton>
            <GoldButton type="submit" disabled={busy || Boolean(createDateValidationError)}>
              Takvimi Aç
            </GoldButton>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(confirmModalEvent)}
        onClose={() => setConfirmModalEvent(null)}
        title="Katılım Konfirmasyonu & Hazırlık Kontrolü"
      >
        <div className="space-y-3">
          {(
            [
              ['onTime15m', 'Raid saatinden 15 dakika önce alanda hazır olacağım.'],
              ['fullConsumables', 'Full Consumables eksiksiz getireceğim.'],
              ['fullRepair', 'Ekipmanım %100 Repair durumunda olacak.'],
              ['fullSpells', 'Tüm sınıf yeteneklerim güncel.'],
              ['bossTactics', 'Boss taktiklerini biliyorum.'],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/70 bg-[#071422] p-3 text-xs text-foreground"
            >
              <input
                type="checkbox"
                checked={Boolean(prepChecklist[key])}
                onChange={(e) => setPrepChecklist((prev) => ({ ...prev, [key]: e.target.checked }))}
                className="mt-0.5 size-4 accent-[#00f2fe]"
              />
              <span>{label}</span>
            </label>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <GhostButton type="button" onClick={() => setConfirmModalEvent(null)}>Vazgeç</GhostButton>
            <GoldButton type="button" disabled={busy} onClick={() => void handleConfirmSubmit()}>
              Katılımımı Teyit Et (+{rules.confirm}p)
            </GoldButton>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(declineModalEvent)}
        onClose={() => setDeclineModalEvent(null)}
        title="Mazeretli İptal Bildirimi"
      >
        <div className="space-y-4">
          <Field label="Mazeret / Açıklama">
            <input
              type="text"
              className={inputClass}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <GhostButton type="button" onClick={() => setDeclineModalEvent(null)}>Vazgeç</GhostButton>
            <GoldButton type="button" disabled={busy} onClick={() => void handleDeclineSubmit()}>İptal Bildir</GoldButton>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(archiveModalEvent)}
        onClose={() => setArchiveModalEvent(null)}
        title="Etkinliği Arşivle & Puanları İşle"
      >
        <div className="space-y-4">
          {archiveModalEvent && !isGuildMeetingEvent(archiveModalEvent.raidId) && (
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gold/30 bg-gold/5 p-3 text-xs text-foreground">
              <input
                type="checkbox"
                checked={openNextWeekOnArchive}
                onChange={(e) => setOpenNextWeekOnArchive(e.target.checked)}
                className="mt-0.5 size-4 accent-[#d4af37]"
              />
              <span>Bir sonraki haftanın (+7 gün) raidini hemen aç</span>
            </label>
          )}
          <div className="flex justify-end gap-2">
            <GhostButton type="button" onClick={() => setArchiveModalEvent(null)}>İptal</GhostButton>
            <GoldButton type="button" disabled={busy} onClick={() => void handleFinalizeArchive()}>
              Arşivle ve Puanları Dağıt
            </GoldButton>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(addMemberModalEvent)}
        onClose={() => setAddMemberModalEvent(null)}
        title="Officer: Oyuncu Ekle"
      >
        <div className="space-y-4">
          <Field label="Guild Üyesi">
            <select
              className={inputClass}
              value={manualAddUsername}
              onChange={(e) => setManualAddUsername(e.target.value)}
            >
              {guildMembers.map((m) => (
                <option key={m.username} value={m.username}>
                  {m.characterName} — {m.wowClass} ({m.spec})
                </option>
              ))}
            </select>
          </Field>
          {addMemberModalEvent && (
            <Field label="Atanacak Grup">
              <select
                className={inputClass}
                value={manualAddAssignment}
                onChange={(e) => setManualAddAssignment(e.target.value)}
              >
                <option value="POOL">İmza Havuzu</option>
                {addMemberModalEvent.rosters.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
                <option value="BENCH">Yedek (Bench)</option>
              </select>
            </Field>
          )}
          <div className="flex justify-end gap-2">
            <GhostButton type="button" onClick={() => setAddMemberModalEvent(null)}>İptal</GhostButton>
            <GoldButton
              type="button"
              disabled={busy || !manualAddUsername || !addMemberModalEvent}
              onClick={async () => {
                if (!addMemberModalEvent) return
                const ok = await runAction(
                  {
                    action: 'officer_add_signup',
                    eventId: addMemberModalEvent.id,
                    username: manualAddUsername,
                    assignment: manualAddAssignment,
                  },
                  'Üye etkinliğe eklendi.',
                )
                if (ok) setAddMemberModalEvent(null)
              }}
            >
              Ekle
            </GoldButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}
