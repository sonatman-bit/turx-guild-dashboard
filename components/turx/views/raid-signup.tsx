'use client'

import {
  AlertTriangle,
  Archive,
  ArrowRightLeft,
  CalendarClock,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Cross,
  Layers,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Shield,
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
import { RaidCalendarGrid } from '../raid-calendar-grid'
import { useToast } from '../toast'
import {
  Badge,
  Field,
  GhostButton,
  GoldButton,
  inputClass,
  Modal,
  Panel,
  PanelTitle,
  PointsPill,
  RankPill,
  SectionHeader,
} from '../ui'
import { WeeklyRaidTimeline } from '../weekly-raid-timeline'

type RankMeta = { label: string; color?: ArmoryRankColorId; armoryRankId?: number | null }

type SameWeekConflict = {
  eventId: string
  dayLabel: string
  assignmentLabel: string
  severity: 'assigned' | 'bench' | 'pool'
}

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

function formatShortDayTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      timeZone: 'Europe/Istanbul',
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

/** Finds same-raid events within ±6 days where the same player is already signed up / assigned */
function getSameWeekConflicts(
  currentEvent: RaidEvent,
  allEvents: RaidEvent[],
  username: string,
): SameWeekConflict[] {
  const curMs = new Date(currentEvent.scheduledAt).getTime()
  const uLower = username.toLowerCase()
  const conflicts: SameWeekConflict[] = []

  for (const other of allEvents) {
    if (other.id === currentEvent.id) continue
    if (other.raidId !== currentEvent.raidId) continue
    const otherMs = new Date(other.scheduledAt).getTime()
    if (!Number.isFinite(curMs) || !Number.isFinite(otherMs)) continue
    if (Math.abs(otherMs - curMs) > 6 * 86_400_000) continue

    const match = other.signups.find(
      (s) => s.username.toLowerCase() === uLower && s.confirmStatus !== 'DECLINED_EXCUSED',
    )
    if (!match) continue

    const dayLabel = formatShortDayTime(other.scheduledAt)
    if (match.assignment === 'BENCH') {
      conflicts.push({
        eventId: other.id,
        dayLabel,
        assignmentLabel: 'Bench',
        severity: 'bench',
      })
    } else if (match.assignment !== 'POOL') {
      const rName = other.rosters.find((r) => r.id === match.assignment)?.name || 'Roster'
      conflicts.push({
        eventId: other.id,
        dayLabel,
        assignmentLabel: rName,
        severity: 'assigned',
      })
    } else {
      conflicts.push({
        eventId: other.id,
        dayLabel,
        assignmentLabel: 'Havuzda',
        severity: 'pool',
      })
    }
  }

  return conflicts
}

/** Isolated 1-second timer so parent views and open modals never re-render every second */
function CountdownValue({
  targetIso,
  accentClass,
  className,
}: {
  targetIso: string
  accentClass: string
  className?: string
}) {
  const nowMs = useLiveNow(1000)
  const cd = formatCountdown(targetIso, nowMs)
  return (
    <span
      className={cn(
        'font-mono font-semibold tabular-nums',
        cd.expired ? 'text-rose-400' : cd.urgent ? 'text-amber-300' : accentClass,
        className,
      )}
    >
      {cd.label}
    </span>
  )
}

function shortRosterLabel(name: string, index: number): string {
  const trimmed = name.trim()
  if (trimmed.length <= 14) return trimmed
  if (trimmed.toLowerCase().includes('toplantı') || trimmed.toLowerCase().includes('tüm guild')) {
    return 'Katılımcılar'
  }
  return `Grup ${index + 1}`
}

const OUTCOME_OPTIONS: { value: AttendanceOutcome; label: string; tone: string }[] = [
  { value: 'ATTENDED', label: 'Katıldı', tone: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10' },
  { value: 'BENCH_READY', label: 'Bench Hazır', tone: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10' },
  { value: 'LATE', label: 'Geç Kaldı (-2p)', tone: 'text-amber-300 border-amber-500/40 bg-amber-500/10' },
  { value: 'MISSING_PREP', label: 'Eksik Hazırlık (-2p)', tone: 'text-orange-300 border-orange-500/40 bg-orange-500/10' },
  { value: 'EXCUSED', label: 'Mazeretli İptal (0p)', tone: 'text-slate-300 border-slate-500/40 bg-slate-500/10' },
  { value: 'BENCH_ABSENT', label: 'Bench (Hazır Değil)', tone: 'text-slate-400 border-slate-600/40 bg-slate-700/20' },
  { value: 'NO_SHOW', label: 'Gelmedi / No-Show (-6p)', tone: 'text-rose-300 border-rose-500/40 bg-rose-500/10' },
  { value: 'NONE', label: 'Puan Dışı', tone: 'text-muted-foreground border-border bg-transparent' },
]

function outcomeBadge(outcome: AttendanceOutcome, flags?: AttendanceFlags) {
  if (flags && flags.late && flags.missingPrep) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1">
        <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-300">Geç Kaldı (-2p)</Badge>
        <Badge className="border-orange-500/40 bg-orange-500/10 text-orange-300">Eksik Hazırlık (-2p)</Badge>
      </span>
    )
  }
  const found = OUTCOME_OPTIONS.find((o) => o.value === outcome) || OUTCOME_OPTIONS[OUTCOME_OPTIONS.length - 1]
  return <Badge className={found.tone}>{found.label}</Badge>
}

function ConfirmDot({ status, published }: { status: RaidEventSignup['confirmStatus']; published: boolean }) {
  if (status === 'CONFIRMED') {
    return (
      <span
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-emerald-500/35 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300"
        title="Katılım onaylandı"
      >
        <Check className="size-2.5" /> Onaylı
      </span>
    )
  }
  if (status === 'DECLINED_EXCUSED') {
    return (
      <span
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-rose-500/35 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300"
        title="Mazeretli iptal"
      >
        İptal
      </span>
    )
  }
  if (published) {
    return (
      <span
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-500/35 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300"
        title="Konfirmasyon bekliyor"
      >
        Bekliyor
      </span>
    )
  }
  return <span className="shrink-0 text-[10px] text-muted-foreground/75">İmzalı</span>
}

/** Compact assignment control that NEVER stretches cards or truncates character names */
function CompactAssignControl({
  signup,
  event,
  busy,
  onAssign,
}: {
  signup: RaidEventSignup
  event: RaidEvent
  busy: boolean
  onAssign: (signupId: string, assignment: string) => void
}) {
  if (event.rosters.length <= 2) {
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
    if (weekAhead.getTime() < unlock.getTime()) {
      return unlock.getTime()
    }
  }
  return weekAhead.getTime()
}

export function RaidSignupView() {
  const { user } = useAuth()
  const toast = useToast()
  const { data, loading, busy, error, postAction } = useRaidSystem()

  const [showCycle, setShowCycle] = useState(false)
  const [calendarFilter, setCalendarFilter] = useState<string>('all')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editModalEvent, setEditModalEvent] = useState<RaidEvent | null>(null)
  const [confirmModalEvent, setConfirmModalEvent] = useState<RaidEvent | null>(null)
  const [declineModalEvent, setDeclineModalEvent] = useState<RaidEvent | null>(null)
  const [archiveModalEvent, setArchiveModalEvent] = useState<RaidEvent | null>(null)
  const [addMemberModalEvent, setAddMemberModalEvent] = useState<RaidEvent | null>(null)

  // Create Raid form state
  const [newRaidId, setNewRaidId] = useState('barrow')
  const [newRaidName, setNewRaidName] = useState('')
  const [newScheduledAt, setNewScheduledAt] = useState(() => toDateTimeLocal(defaultRaidScheduleMs('barrow')))
  const [newSignupDeadline, setNewSignupDeadline] = useState(() =>
    toDateTimeLocal(defaultRaidScheduleMs('barrow') - 3 * 86_400_000),
  )
  const [newConfirmDeadline, setNewConfirmDeadline] = useState(() =>
    toDateTimeLocal(defaultRaidScheduleMs('barrow') - 1 * 86_400_000),
  )
  const [deadlinesAuto, setDeadlinesAuto] = useState(true)
  const [newNotes, setNewNotes] = useState('')

  // Edit Raid form state
  const [editRaidId, setEditRaidId] = useState('barrow')
  const [editRaidName, setEditRaidName] = useState('')
  const [editScheduledAt, setEditScheduledAt] = useState('')
  const [editSignupDeadline, setEditSignupDeadline] = useState('')
  const [editConfirmDeadline, setEditConfirmDeadline] = useState('')
  const [editDeadlinesAuto, setEditDeadlinesAuto] = useState(false)
  const [editNotes, setEditNotes] = useState('')

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

  const activeEvents = useMemo(
    () => allEventsSorted.filter((e) => e.status !== 'ARCHIVED'),
    [allEventsSorted],
  )

  // Default selection: nearest upcoming active raid, otherwise latest archived event
  useEffect(() => {
    if (allEventsSorted.length === 0) {
      setSelectedEventId(null)
      return
    }
    if (!allEventsSorted.some((e) => e.id === selectedEventId)) {
      const now = Date.now()
      const nextUpcoming = activeEvents.find((e) => new Date(e.scheduledAt).getTime() >= now) || activeEvents[0]
      setSelectedEventId(nextUpcoming ? nextUpcoming.id : allEventsSorted[allEventsSorted.length - 1].id)
    }
  }, [allEventsSorted, activeEvents, selectedEventId])

  const selectedEvent =
    allEventsSorted.find((e) => e.id === selectedEventId) || activeEvents[0] || allEventsSorted[0] || null

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

  const openCreateModal = (preferredRaidId?: string, dateKey?: string) => {
    const targetId =
      preferredRaidId && preferredRaidId !== 'all'
        ? preferredRaidId
        : calendarFilter !== 'all'
          ? calendarFilter
          : 'barrow'
    let schedMs = defaultRaidScheduleMs(targetId)
    if (dateKey) {
      const parsed = new Date(`${dateKey}T21:00:00+03:00`).getTime()
      if (Number.isFinite(parsed)) {
        schedMs = parsed
      }
    }
    setNewRaidId(targetId)
    setNewRaidName('')
    setNewScheduledAt(toDateTimeLocal(schedMs))
    setNewSignupDeadline(toDateTimeLocal(schedMs - 3 * 86_400_000))
    setNewConfirmDeadline(toDateTimeLocal(schedMs - 1 * 86_400_000))
    setDeadlinesAuto(true)
    setCreateOpen(true)
  }

  const openEditModal = (ev: RaidEvent) => {
    setEditModalEvent(ev)
    setEditRaidId(ev.raidId)
    setEditRaidName(ev.raidName)
    const schedMs = new Date(ev.scheduledAt).getTime()
    const signupMs = new Date(ev.signupDeadline).getTime()
    const confirmMs = new Date(ev.confirmDeadline).getTime()
    setEditScheduledAt(Number.isFinite(schedMs) ? toDateTimeLocal(schedMs) : '')
    setEditSignupDeadline(Number.isFinite(signupMs) ? toDateTimeLocal(signupMs) : '')
    setEditConfirmDeadline(Number.isFinite(confirmMs) ? toDateTimeLocal(confirmMs) : '')
    setEditDeadlinesAuto(false)
    setEditNotes(ev.notes || '')
  }

  const handleScheduledChange = (val: string) => {
    setNewScheduledAt(val)
    if (!deadlinesAuto) return
    const dt = new Date(val).getTime()
    if (Number.isFinite(dt)) {
      setNewSignupDeadline(toDateTimeLocal(dt - 3 * 86_400_000))
      setNewConfirmDeadline(toDateTimeLocal(dt - 1 * 86_400_000))
    }
  }

  const resetDeadlinesToAuto = () => {
    setDeadlinesAuto(true)
    const dt = new Date(newScheduledAt).getTime()
    if (Number.isFinite(dt)) {
      setNewSignupDeadline(toDateTimeLocal(dt - 3 * 86_400_000))
      setNewConfirmDeadline(toDateTimeLocal(dt - 1 * 86_400_000))
    }
  }

  const handleEditScheduledChange = (val: string) => {
    setEditScheduledAt(val)
    if (!editDeadlinesAuto) return
    const dt = new Date(val).getTime()
    if (Number.isFinite(dt)) {
      setEditSignupDeadline(toDateTimeLocal(dt - 3 * 86_400_000))
      setEditConfirmDeadline(toDateTimeLocal(dt - 1 * 86_400_000))
    }
  }

  const resetEditDeadlinesToAuto = () => {
    setEditDeadlinesAuto(true)
    const dt = new Date(editScheduledAt).getTime()
    if (Number.isFinite(dt)) {
      setEditSignupDeadline(toDateTimeLocal(dt - 3 * 86_400_000))
      setEditConfirmDeadline(toDateTimeLocal(dt - 1 * 86_400_000))
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

  const editValidationError = useMemo(() => {
    if (!editModalEvent) return null
    if (!editRaidName.trim()) {
      return 'Etkinlik / raid adı boş bırakılamaz.'
    }
    if (editModalEvent.status === 'ARCHIVED') return null
    const schedMs = new Date(editScheduledAt).getTime()
    const signupMs = new Date(editSignupDeadline).getTime()
    const confirmMs = new Date(editConfirmDeadline).getTime()
    if (!Number.isFinite(schedMs) || !Number.isFinite(signupMs) || !Number.isFinite(confirmMs)) {
      return 'Lütfen geçerli tarih ve saat değerleri girin.'
    }
    if (!isGuildMeetingEvent(editRaidId) && schedMs < new Date(PHASE1_RAID_UNLOCK_ISO).getTime()) {
      return 'Gerçek raidler Phase 1 açılış tarihi olan 9 Aralık 2026 öncesine planlanamaz.'
    }
    if (!(signupMs < confirmMs && confirmMs < schedMs)) {
      return 'Tarih sırası geçersiz: İmza kapanışı < Konfirmasyon kapanışı < Etkinlik başlangıcı olmalıdır.'
    }
    return null
  }, [editModalEvent, editRaidId, editRaidName, editScheduledAt, editSignupDeadline, editConfirmDeadline])

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
    const finalName = newRaidName.trim() || def.name
    const ok = await runAction(
      {
        action: 'create_event',
        raidId: def.id,
        raidName: finalName,
        size: def.size,
        scheduledAt: new Date(newScheduledAt).toISOString(),
        signupDeadline: new Date(newSignupDeadline).toISOString(),
        confirmDeadline: new Date(newConfirmDeadline).toISOString(),
        notes: newNotes,
      },
      `${finalName} (${isGuildMeetingEvent(def.id) ? 'Tüm Guild' : `${def.size}-man`}) takvime eklendi.`,
    )
    if (ok) {
      setCreateOpen(false)
      setNewRaidName('')
      setNewNotes('')
      setDeadlinesAuto(true)
    }
  }

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editModalEvent) return
    if (editValidationError) {
      toast({ variant: 'error', title: 'Geçersiz Bilgi', description: editValidationError })
      return
    }
    const def =
      RAID_CATALOG.find((r) => r.id === editRaidId) ||
      SPECIAL_EVENT_CATALOG.find((r) => r.id === editRaidId)
    const payload: Record<string, unknown> = {
      action: 'update_event',
      eventId: editModalEvent.id,
      raidName: editRaidName.trim(),
      notes: editNotes,
    }
    if (editModalEvent.status !== 'ARCHIVED') {
      payload.raidId = editRaidId
      payload.size = def?.size ?? editModalEvent.size
      payload.scheduledAt = new Date(editScheduledAt).toISOString()
      payload.signupDeadline = new Date(editSignupDeadline).toISOString()
      payload.confirmDeadline = new Date(editConfirmDeadline).toISOString()
    }
    const ok = await runAction(payload, `"${editRaidName.trim()}" bilgileri güncellendi.`)
    if (ok) {
      setEditModalEvent(null)
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
      toast({
        variant: 'error',
        title: 'Hazırlık Onayı Eksik',
        description: 'Konfirmasyon için 5 raid hazırlık şartını onaylamanız gerekir.',
      })
      return
    }
    const confirmPts = rs?.settings.pointRules.confirm ?? 1
    const ok = await runAction(
      {
        action: 'confirm',
        eventId: confirmModalEvent.id,
        prepChecklist,
      },
      `Katılımınız teyit edildi (+${confirmPts} puan). Raid saatinden 15 dk önce alanda görüşürüz!`,
    )
    if (ok) setConfirmModalEvent(null)
  }

  const handleDeclineSubmit = async () => {
    if (!declineModalEvent) return
    const ok = await runAction(
      {
        action: 'decline_excused',
        eventId: declineModalEvent.id,
        reason: declineReason,
      },
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
      {
        action: 'finalize_and_archive',
        eventId: archiveModalEvent.id,
        openNextWeek: shouldOpenNext,
      },
      shouldOpenNext
        ? 'Raid arşivlendi, puanlar Devam Takibine işlendi ve gelecek haftanın raidi açıldı!'
        : 'Etkinlik arşivlendi ve puanlar Devam Takibine işlendi!',
    )
    if (ok) {
      setArchiveModalEvent(null)
    }
  }

  if (loading) {
    return (
      <Panel className="py-12 text-center text-sm text-muted-foreground">
        Raid kayıt takvimi yükleniyor...
      </Panel>
    )
  }

  if (error || !rs) {
    return (
      <Panel className="border-rose-500/30 py-10 text-center">
        <p className="text-sm text-rose-300">{error || 'Veriler alınamadı.'}</p>
      </Panel>
    )
  }

  const rules = rs.settings.pointRules

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="TURX RAID TAKVİMİ · PAZARTESİ BAŞLANGIÇLI"
        title="Raid Kayıt & 4 Rol Panosu"
        description="Gelecek raidler takvimde yeşil ışıklı, geçmiş ve arşivlenen raidler kırmızı flu görünür. Bir etkinliğe tıklayıp 4 rol sütunlu kadroyu inceleyebilir, imza ve konfirmasyon verebilirsiniz."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <GhostButton
              type="button"
              onClick={() => setShowCycle((v) => !v)}
              className={cn(
                'px-3 py-1.5 text-xs',
                showCycle && 'border-neon/60 bg-neon/15 text-neon shadow-[0_0_16px_rgb(0_242_254/0.2)]',
              )}
            >
              <CalendarClock className="size-3.5" />
              {showCycle ? 'Döngüyü Gizle' : 'Haftalık Döngü'}
            </GhostButton>
            {isOfficer && (
              <GoldButton onClick={() => openCreateModal()}>
                <CalendarPlus className="size-4" />
                Yeni Raid Aç
              </GoldButton>
            )}
          </div>
        }
      />

      {showCycle && (
        <Panel className="border-neon/35 bg-gradient-to-br from-[#0c1f34] via-[#091829] to-[#071220] animate-in fade-in slide-in-from-top-2">
          <PanelTitle
            icon={CalendarClock}
            action={
              <Badge className="border-neon/35 bg-neon/10 font-mono text-[11px] text-neon">
                T-7 → T-3 → T-1 → T-0
              </Badge>
            }
          >
            Bir Haftalık Raid Döngüsü
          </PanelTitle>
          <WeeklyRaidTimeline rules={rules} />
        </Panel>
      )}

      {/* Monday-First 5-Week (-2/+2) & Monthly Calendar */}
      <RaidCalendarGrid
        events={allEventsSorted}
        selectedEventId={selectedEvent?.id || null}
        onSelectEvent={(clicked) => setSelectedEventId(clicked.id)}
        currentUsername={user?.username || null}
        isOfficer={isOfficer}
        onQuickCreateForDate={(dateKey) => openCreateModal(calendarFilter, dateKey)}
        raidTypeFilter={calendarFilter}
        onRaidTypeFilterChange={(rid) => setCalendarFilter(rid)}
      />

      {/* Selected Event Workspace (Active/Upcoming 4-Role Board OR Archived Score Breakdown) */}
      {!selectedEvent ? (
        <Panel className="border-dashed border-border/80 py-12 text-center">
          <CalendarClock className="mx-auto size-10 text-muted-foreground/60" />
          <p className="mt-3 font-display text-lg font-bold text-foreground">
            Takvimde henüz etkinlik yok
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isOfficer
              ? 'Gelecek bir gün kutusunun sağ üstündeki + düğmesiyle veya yukarıdaki "Yeni Raid Aç" butonuyla takvime raid ekleyebilirsiniz.'
              : 'Officerlar yeni haftanın raidlerini açtığında takvimde yeşil ışıklı olarak görünecektir.'}
          </p>
        </Panel>
      ) : selectedEvent.status === 'ARCHIVED' ? (
        <ArchivedEventPanel
          event={selectedEvent}
          rules={rules}
          pointsByUser={pointsByUser}
          rankByUser={rankByUser}
          canEdit={Boolean(data?.isGm)}
          onEditEvent={() => openEditModal(selectedEvent)}
        />
      ) : (
        <EventWorkspace
          key={selectedEvent.id}
          event={selectedEvent}
          allEvents={rs.events}
          pointsByUser={pointsByUser}
          rankByUser={rankByUser}
          isOfficer={isOfficer}
          busy={busy}
          currentUsername={user?.username || null}
          myMain={myMain}
          rules={rules}
          onSignup={() => void handleSignup(selectedEvent)}
          onRefreshArmoryLevel={() =>
            void runAction(
              { action: 'refresh_my_armory_level' },
              'WoW Armory seviyeniz güncellendi.',
            )
          }
          onWithdraw={() =>
            void runAction(
              { action: 'withdraw_signup', eventId: selectedEvent.id },
              'İmzanız geri çekildi.',
            )
          }
          onOpenConfirm={() => setConfirmModalEvent(selectedEvent)}
          onOpenDecline={() => setDeclineModalEvent(selectedEvent)}
          onAddRoster={() =>
            void runAction(
              { action: 'add_roster', eventId: selectedEvent.id },
              `Yeni grup (Grup ${selectedEvent.rosters.length + 1}) oluşturuldu.`,
            )
          }
          onUpdateRoster={(rosterId, updates) =>
            void runAction(
              { action: 'update_roster', eventId: selectedEvent.id, rosterId, ...updates },
              'Grup adı ve rengi güncellendi.',
            )
          }
          onRemoveRoster={(rosterId) =>
            void runAction(
              { action: 'remove_roster', eventId: selectedEvent.id, rosterId },
              'Grup silindi, oyuncular imza havuzuna döndürüldü.',
            )
          }
          onAssign={(signupId, assignment) =>
            void runAction(
              { action: 'assign_member', eventId: selectedEvent.id, signupId, assignment },
              'Oyuncu ataması güncellendi.',
            )
          }
          onPublish={() =>
            void runAction(
              { action: 'publish_rosters', eventId: selectedEvent.id },
              'Tüm gruplar ve Bench yayınlandı! Oyuncular konfirmasyon verebilir.',
            )
          }
          onSetOutcome={(signupId, flags) =>
            void runAction(
              {
                action: 'set_attendance_outcome',
                eventId: selectedEvent.id,
                signupId,
                flags,
                outcome: deriveOutcomeFromFlags(flags),
              },
              'Katılım durumu ve puan önizlemesi güncellendi.',
            )
          }
          onBatchSetOutcome={(updates, msg) =>
            void runAction(
              {
                action: 'set_attendance_outcome',
                eventId: selectedEvent.id,
                updates: updates.map((u) => ({
                  signupId: u.signupId,
                  flags: u.flags,
                  outcome: deriveOutcomeFromFlags(u.flags),
                })),
              },
              msg,
            )
          }
          onMarkRosterScored={(rosterId, scored) =>
            void runAction(
              { action: 'mark_roster_scored', eventId: selectedEvent.id, rosterId, scored },
              scored ? 'Grup puanlaması onaylandı.' : 'Grup puanlama onayı kaldırıldı.',
            )
          }
          onOpenArchive={() => setArchiveModalEvent(selectedEvent)}
          onOpenAddMember={() => {
            setManualAddUsername(guildMembers[0]?.username || '')
            setManualAddAssignment(selectedEvent.rosters[0]?.id || 'POOL')
            setAddMemberModalEvent(selectedEvent)
          }}
          onEditEvent={() => openEditModal(selectedEvent)}
          onDeleteEvent={() => {
            const confirmed = window.confirm(
              `"${selectedEvent.raidName}" (${formatTrDateTime(selectedEvent.scheduledAt)}) etkinliğini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
            )
            if (!confirmed) return
            void runAction(
              { action: 'delete_event', eventId: selectedEvent.id },
              'Raid etkinliği silindi.',
            )
          }}
        />
      )}

      {/* Create Event Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Yeni Raid Takvimi Aç"
        description="Gün ve saat belirleyerek tek imza havuzu açın. İmza sayısına göre birden fazla roster grubu oluşturabilirsiniz."
      >
        <form onSubmit={handleCreateEvent} className="space-y-4">
          <Field label="Raid / Etkinlik Türü">
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
              <optgroup label="Özel Guild Etkinlikleri (Tüm Seviyeler)">
                {SPECIAL_EVENT_CATALOG.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} (Tüm Guild)
                  </option>
                ))}
              </optgroup>
            </select>
          </Field>

          <Field
            label="Özel Başlık / Raid Adı (Opsiyonel)"
            hint="Boş bırakırsanız seçili raid türü adı kullanılır."
          >
            <input
              type="text"
              maxLength={90}
              className={inputClass}
              placeholder="Örn: Barrow Deeps · Grup 1 (Hızlı Run)"
              value={newRaidName}
              onChange={(e) => setNewRaidName(e.target.value)}
            />
          </Field>

          <Field
            label="Raid Tarih ve Saati (TR · UTC+3)"
            hint={
              deadlinesAuto
                ? 'Otomatik mod: İmza kapanışı -3 gün, konfirmasyon kapanışı -1 gün olarak otomatik güncellenir.'
                : 'Manuel mod aktif: Kapanış tarihleri elle ayarlandı ve başlangıç değişince korunur.'
            }
          >
            <input
              type="datetime-local"
              required
              className={inputClass}
              value={newScheduledAt}
              onChange={(e) => handleScheduledChange(e.target.value)}
            />
          </Field>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-silver">
                Son Tarihler ({deadlinesAuto ? 'Otomatik (-3g / -1g)' : 'Elle Ayarlandı'})
              </span>
              {!deadlinesAuto && (
                <button
                  type="button"
                  onClick={resetDeadlinesToAuto}
                  className="cursor-pointer font-semibold text-neon hover:underline"
                >
                  Otomatiğe Sıfırla (-3g / -1g)
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="İmza Kapanış (TR)">
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
              <Field label="Konfirmasyon Kapanış (TR)">
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
          </div>

          {createDateValidationError && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-400" />
              <span>{createDateValidationError}</span>
            </div>
          )}

          <Field label="İçerik / Officer Notu (Opsiyonel)">
            <textarea
              rows={3}
              maxLength={600}
              className={cn(inputClass, 'min-h-[78px] resize-y py-2')}
              placeholder="Örn: Onyxia Cloak zorunlu, 20:45 summon hazır. Flask & Buff Food eksiksiz gelin."
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <GhostButton type="button" onClick={() => setCreateOpen(false)}>
              İptal
            </GhostButton>
            <GoldButton type="submit" disabled={busy || Boolean(createDateValidationError)}>
              <CalendarPlus className="size-4" />
              Takvimi Aç
            </GoldButton>
          </div>
        </form>
      </Modal>

      {/* Edit Event Modal */}
      <Modal
        open={Boolean(editModalEvent)}
        onClose={() => setEditModalEvent(null)}
        title="Raid / Etkinlik Bilgilerini Düzenle"
        description={
          editModalEvent?.status === 'ARCHIVED'
            ? 'Arşivlenmiş etkinlikte yalnızca başlık ve içerik notunu güncelleyebilirsiniz.'
            : 'Etkinliğin adını, türünü, tarih-saatini, son tarihlerini ve içerik açıklamasını güncelleyin.'
        }
      >
        <form onSubmit={handleUpdateEvent} className="space-y-4">
          <Field label="Etkinlik / Raid Adı">
            <input
              type="text"
              required
              maxLength={90}
              className={inputClass}
              placeholder="Raid veya etkinlik adını girin..."
              value={editRaidName}
              onChange={(e) => setEditRaidName(e.target.value)}
            />
          </Field>

          {editModalEvent?.status !== 'ARCHIVED' && (
            <>
              <Field label="Raid Türü / Kapasite">
                <select
                  className={inputClass}
                  value={editRaidId}
                  onChange={(e) => setEditRaidId(e.target.value)}
                >
                  <optgroup label="Raidler">
                    {RAID_CATALOG.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.size}-Man)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Özel Guild Etkinlikleri (Tüm Seviyeler)">
                    {SPECIAL_EVENT_CATALOG.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} (Tüm Guild)
                      </option>
                    ))}
                  </optgroup>
                </select>
              </Field>

              <Field
                label="Raid Tarih ve Saati (TR · UTC+3)"
                hint={
                  editDeadlinesAuto
                    ? 'Otomatik mod: Başlangıç değiştiğinde imza (-3g) ve konfirmasyon (-1g) otomatik kaydırılır.'
                    : 'Mevcut son tarihler korunur; isterseniz alttan elle güncelleyebilir veya otomatiğe sıfırlayabilirsiniz.'
                }
              >
                <input
                  type="datetime-local"
                  required
                  className={inputClass}
                  value={editScheduledAt}
                  onChange={(e) => handleEditScheduledChange(e.target.value)}
                />
              </Field>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-silver">
                    Son Tarihler ({editDeadlinesAuto ? 'Otomatik (-3g / -1g)' : 'Elle / Mevcut'})
                  </span>
                  <button
                    type="button"
                    onClick={resetEditDeadlinesToAuto}
                    className="cursor-pointer font-semibold text-neon hover:underline"
                  >
                    Otomatiğe Sıfırla (-3g / -1g)
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="İmza Kapanış (TR)">
                    <input
                      type="datetime-local"
                      required
                      className={inputClass}
                      value={editSignupDeadline}
                      onChange={(e) => {
                        setEditDeadlinesAuto(false)
                        setEditSignupDeadline(e.target.value)
                      }}
                    />
                  </Field>
                  <Field label="Konfirmasyon Kapanış (TR)">
                    <input
                      type="datetime-local"
                      required
                      className={inputClass}
                      value={editConfirmDeadline}
                      onChange={(e) => {
                        setEditDeadlinesAuto(false)
                        setEditConfirmDeadline(e.target.value)
                      }}
                    />
                  </Field>
                </div>
              </div>
            </>
          )}

          {editValidationError && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-400" />
              <span>{editValidationError}</span>
            </div>
          )}

          <Field label="İçerik / Açıklama / Officer Notu">
            <textarea
              rows={4}
              maxLength={600}
              className={cn(inputClass, 'min-h-[96px] resize-y py-2')}
              placeholder="Etkinlik detayları, gerekli consumable/attunement notları veya duyuru metni..."
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <GhostButton type="button" onClick={() => setEditModalEvent(null)}>
              İptal
            </GhostButton>
            <GoldButton type="submit" disabled={busy || Boolean(editValidationError)}>
              <Check className="size-4" />
              Değişiklikleri Kaydet
            </GoldButton>
          </div>
        </form>
      </Modal>

      {/* Confirm + Prep Checklist Modal */}
      <Modal
        open={Boolean(confirmModalEvent)}
        onClose={() => setConfirmModalEvent(null)}
        title="Katılım Konfirmasyonu & Hazırlık Kontrolü"
        description={
          confirmModalEvent
            ? `${confirmModalEvent.raidName} (${formatTrDateTime(confirmModalEvent.scheduledAt)}) için katılımınızı teyit edin (+${rules.confirm} puan).`
            : undefined
        }
      >
        <div className="space-y-3">
          {(
            [
              ['onTime15m', 'Raid saatinden 15 dakika önce (20:45) raid alanında hazır olacağım.'],
              ['fullConsumables', 'Full Consumables (Flask, Elixir, Potions, Buff Food) eksiksiz getireceğim.'],
              ['fullRepair', 'Ekipmanım %100 Repair durumunda olacak.'],
              ['fullSpells', 'Tüm sınıf yeteneklerim (Full Class Spells Trained) güncel.'],
              ['bossTactics', 'Boss taktiklerini biliyorum.'],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/70 bg-[#071422] p-3 text-xs text-foreground hover:border-neon/40"
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
          <div className="flex justify-end gap-2 pt-3">
            <GhostButton type="button" onClick={() => setConfirmModalEvent(null)}>
              Vazgeç
            </GhostButton>
            <GoldButton type="button" disabled={busy} onClick={() => void handleConfirmSubmit()}>
              <CheckCircle2 className="size-4" />
              Katılımımı Teyit Et (+{rules.confirm} puan)
            </GoldButton>
          </div>
        </div>
      </Modal>

      {/* Excused Decline Modal */}
      <Modal
        open={Boolean(declineModalEvent)}
        onClose={() => setDeclineModalEvent(null)}
        title="Mazeretli İptal Bildirimi"
        description="Konfirmasyon süresi bitmeden mazeret bildirirseniz ceza puanı (0p) uygulanmaz; yerinize yedek planlanır."
      >
        <div className="space-y-4">
          <Field label="Mazeret / Açıklama">
            <input
              type="text"
              className={inputClass}
              placeholder="Örn: İş/seyahat sebebiyle bu hafta katılamayacağım."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <GhostButton type="button" onClick={() => setDeclineModalEvent(null)}>
              Vazgeç
            </GhostButton>
            <GoldButton type="button" disabled={busy} onClick={() => void handleDeclineSubmit()}>
              İptal Bildir
            </GoldButton>
          </div>
        </div>
      </Modal>

      {/* Finalize & Archive Modal */}
      <Modal
        open={Boolean(archiveModalEvent)}
        onClose={() => setArchiveModalEvent(null)}
        title="Etkinliği Tamamla, Puanları İşle & Arşivle"
        description="Onayladığınızda bu etkinlik arşive taşınır, işaretlenen tüm katılımcı ve bench puanları Devam Takibine kalıcı olarak eklenir."
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
              <span>
                <strong className="text-gold">Bir sonraki haftanın (+7 gün) raidini hemen aç</strong>
                <span className="mt-0.5 block text-muted-foreground">
                  Aynı raid, aynı saat ve yeni geri sayımlarla bir sonraki haftanın imza havuzu otomatik oluşturulur.
                </span>
              </span>
            </label>
          )}
          <div className="flex justify-end gap-2">
            <GhostButton type="button" onClick={() => setArchiveModalEvent(null)}>
              İptal
            </GhostButton>
            <GoldButton type="button" disabled={busy} onClick={() => void handleFinalizeArchive()}>
              <Archive className="size-4" />
              Arşivle ve Puanları Dağıt
            </GoldButton>
          </div>
        </div>
      </Modal>

      {/* Officer Manual Add Member Modal */}
      <Modal
        open={Boolean(addMemberModalEvent)}
        onClose={() => setAddMemberModalEvent(null)}
        title="Officer: Oyuncu Ekle (Acil Yedek / Manuel)"
        description="İmza süresini kaçırmış veya son dakika çağrılan guild üyesini doğrudan gruba ekleyin."
      >
        <div className="space-y-4">
          <Field label="Guild Üyesi (Main Karakter)">
            <select
              className={inputClass}
              value={manualAddUsername}
              onChange={(e) => setManualAddUsername(e.target.value)}
            >
              {guildMembers.map((m) => {
                const pts = pointsByUser.get(m.username.toLowerCase()) ?? 0
                return (
                  <option key={m.username} value={m.username}>
                    {m.characterName} [{pts > 0 ? `+${pts}p` : `${pts}p`}] — {m.wowClass} ({m.spec}) [{m.guildRank}]
                  </option>
                )
              })}
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
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
                <option value="BENCH">Yedek (Bench)</option>
              </select>
            </Field>
          )}
          <div className="flex justify-end gap-2">
            <GhostButton type="button" onClick={() => setAddMemberModalEvent(null)}>
              İptal
            </GhostButton>
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
                  'Üye raide eklendi.',
                )
                if (ok) setAddMemberModalEvent(null)
              }}
            >
              <UserPlus className="size-4" />
              Ekle
            </GoldButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function ArchivedEventPanel({
  event,
  rules,
  pointsByUser,
  rankByUser,
  canEdit = false,
  onEditEvent,
}: {
  event: RaidEvent
  rules: PointRules
  pointsByUser: Map<string, number>
  rankByUser: Map<string, RankMeta>
  canEdit?: boolean
  onEditEvent?: () => void
}) {
  const isMeeting = isGuildMeetingEvent(event.raidId)
  const archiveGroups: {
    id: string
    name: string
    color: string
    scoredBy?: string
    members: RaidEventSignup[]
  }[] = [
    ...event.rosters.map((r, rIdx) => ({
      id: r.id,
      name: r.name,
      color: r.color || ROSTER_COLOR_PRESETS[rIdx % ROSTER_COLOR_PRESETS.length].hex,
      scoredBy: r.scoredBy,
      members: event.signups.filter((s) => s.assignment === r.id),
    })),
  ]

  const archivedBench = event.signups.filter((s) => s.assignment === 'BENCH')
  if (archivedBench.length > 0) {
    archiveGroups.push({
      id: 'BENCH',
      name: 'Yedek / Bench',
      color: '#22d3ee',
      scoredBy: event.benchScoredBy,
      members: archivedBench,
    })
  }
  const knownIds = new Set([...event.rosters.map((r) => r.id), 'BENCH'])
  const archivedPool = event.signups.filter((s) => !knownIds.has(s.assignment))
  if (archivedPool.length > 0) {
    archiveGroups.push({
      id: 'POOL',
      name: 'Atanmamış Havuz / İptal',
      color: '#94a3b8',
      members: archivedPool,
    })
  }

  return (
    <Panel className="border-rose-500/35 bg-gradient-to-br from-rose-950/30 via-[#081524] to-[#071220]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-500/25 pb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="size-2.5 rounded-full bg-rose-400/80" />
            <h2 className="font-display text-xl font-bold text-rose-200">{event.raidName}</h2>
            <Badge className={isMeeting ? 'border-purple-400/35 bg-purple-500/15 text-purple-200' : 'border-gold/30 bg-gold/10 text-gold'}>
              {isMeeting ? 'Tüm Guild' : `${event.size}-Man`}
            </Badge>
            <Badge className="border-rose-500/40 bg-rose-500/15 text-rose-300">
              <Archive className="size-3" /> Arşivlendi
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Raid Tarihi: {formatTrDateTime(event.scheduledAt)} · Arşivleyen: {event.archivedBy || '—'}
          </p>
          {event.notes && (
            <p className="mt-1 whitespace-pre-line text-xs text-amber-200/85">Not: {event.notes}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-xs text-muted-foreground">
            Toplam Kayıt: <strong className="text-foreground">{event.signups.length}</strong> · Grup Sayısı:{' '}
            <strong className="text-foreground">{event.rosters.length}</strong>
          </div>
          {canEdit && onEditEvent && (
            <GhostButton type="button" onClick={onEditEvent} className="px-3 py-1.5 text-xs">
              <Pencil className="size-3.5" />
              Düzenle
            </GhostButton>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {archiveGroups.map((grp) => (
          <div
            key={grp.id}
            className="relative overflow-hidden rounded-xl border bg-[#071422]/85 p-3.5"
            style={{ borderColor: `${grp.color}45` }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-0.5"
              style={{ backgroundColor: grp.color }}
            />
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
              <div className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: grp.color, boxShadow: `0 0 8px ${grp.color}` }}
                />
                <h4 className="font-display text-sm font-bold" style={{ color: grp.color }}>
                  {grp.name}
                </h4>
                <span className="text-[11px] text-muted-foreground">({grp.members.length} kişi)</span>
              </div>
              {grp.scoredBy && (
                <Badge className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-300">
                  ✓ Puanlayan: {grp.scoredBy}
                </Badge>
              )}
            </div>

            {grp.members.length === 0 ? (
              <p className="py-2 text-xs text-muted-foreground">Bu grupta kayıtlı oyuncu yok.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground uppercase">
                      <th className="py-1.5 pr-3">Karakter</th>
                      <th className="py-1.5 pr-3">Konfirme</th>
                      <th className="py-1.5 pr-3">Sonuç</th>
                      <th className="py-1.5 pr-3 text-right">İmza/Konf.</th>
                      <th className="py-1.5 pr-3 text-right">Raid/Yedek</th>
                      <th className="py-1.5 pr-3 text-right">Ceza</th>
                      <th className="py-1.5 text-right">Net Puan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/35">
                    {grp.members.map((s) => {
                      const bd = s.pointsBreakdown || calculateSignupPoints(s, event.size, rules)
                      const rk = rankByUser.get(s.username.toLowerCase())
                      return (
                        <tr key={s.id} className="hover:bg-white/[0.02]">
                          <td className="py-2 pr-3 font-semibold" style={{ color: CLASS_COLORS[s.wowClass] || '#fff' }}>
                            <span className="inline-flex flex-wrap items-center gap-1.5">
                              <span>{s.characterName}</span>
                              {rk && (
                                <RankPill label={rk.label} color={rk.color} armoryRankId={rk.armoryRankId} />
                              )}
                              <PointsPill points={pointsByUser.get(s.username.toLowerCase()) ?? 0} />
                            </span>
                            <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">({s.spec})</span>
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground">
                            {s.confirmStatus === 'CONFIRMED'
                              ? 'Konfirme'
                              : s.confirmStatus === 'DECLINED_EXCUSED'
                                ? 'Mazeretli İptal'
                                : 'Konfirme Yok'}
                          </td>
                          <td className="py-2 pr-3">{outcomeBadge(s.attendanceOutcome, s.attendanceFlags)}</td>
                          <td className="py-2 pr-3 text-right font-mono text-cyan-300">+{bd.signup + bd.confirm}</td>
                          <td className="py-2 pr-3 text-right font-mono text-emerald-300">+{bd.raid}</td>
                          <td className="py-2 pr-3 text-right font-mono text-rose-400">
                            {bd.penalty < 0 ? bd.penalty : '0'}
                          </td>
                          <td className="py-2 text-right font-mono font-bold text-gold">
                            {bd.total > 0 ? `+${bd.total}` : bd.total}p
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </Panel>
  )
}

function EventWorkspace({
  event,
  allEvents,
  pointsByUser,
  rankByUser,
  isOfficer,
  busy,
  currentUsername,
  myMain,
  rules,
  onSignup,
  onRefreshArmoryLevel,
  onWithdraw,
  onOpenConfirm,
  onOpenDecline,
  onAddRoster,
  onUpdateRoster,
  onRemoveRoster,
  onAssign,
  onPublish,
  onSetOutcome,
  onBatchSetOutcome,
  onMarkRosterScored,
  onOpenArchive,
  onOpenAddMember,
  onEditEvent,
  onDeleteEvent,
}: {
  event: RaidEvent
  allEvents: RaidEvent[]
  pointsByUser: Map<string, number>
  rankByUser: Map<string, RankMeta>
  isOfficer: boolean
  busy: boolean
  currentUsername: string | null
  myMain: {
    username: string
    characterId: string
    characterName: string
    wowClass: WowClass
    spec: string
    role: RaidRoleType
    level: number
    guildRank: string
  } | null
  rules: PointRules
  onSignup: () => void
  onRefreshArmoryLevel: () => void
  onWithdraw: () => void
  onOpenConfirm: () => void
  onOpenDecline: () => void
  onAddRoster: () => void
  onUpdateRoster: (rosterId: string, updates: { name?: string; color?: string }) => void
  onRemoveRoster: (rosterId: string) => void
  onAssign: (signupId: string, assignment: string) => void
  onPublish: () => void
  onSetOutcome: (signupId: string, flags: AttendanceFlags) => void
  onBatchSetOutcome: (updates: { signupId: string; flags: AttendanceFlags }[], successMsg: string) => void
  onMarkRosterScored: (rosterId: string, scored: boolean) => void
  onOpenArchive: () => void
  onOpenAddMember: () => void
  onEditEvent: () => void
  onDeleteEvent: () => void
}) {
  const [viewMode, setViewMode] = useState<'rosters' | 'postraid'>('rosters')
  const [rosterFilterId, setRosterFilterId] = useState<string>('all')
  const [editingRosterId, setEditingRosterId] = useState<string | null>(null)
  const [editRosterName, setEditRosterName] = useState('')
  const [editRosterColor, setEditRosterColor] = useState('#d4af37')
  const [postraidGroupFilter, setPostraidGroupFilter] = useState<string>('all')
  const [collapsedPostraidGroups, setCollapsedPostraidGroups] = useState<Record<string, boolean>>({})

  const signupExpired = new Date(event.signupDeadline).getTime() <= Date.now()
  const confirmExpired = new Date(event.confirmDeadline).getTime() <= Date.now()
  const eventHasStarted = new Date(event.scheduledAt).getTime() <= Date.now()
  const isMeeting = isGuildMeetingEvent(event.raidId)

  const myEntry = event.signups.find(
    (s) => currentUsername && s.username.toLowerCase() === currentUsername.toLowerCase(),
  )
  const poolSignups = event.signups.filter((s) => s.assignment === 'POOL')
  const benchSignups = event.signups.filter((s) => s.assignment === 'BENCH')

  const myAssignmentLabel = !myEntry
    ? null
    : myEntry.assignment === 'POOL'
      ? 'İmza Havuzunda (Roster bekleniyor)'
      : myEntry.assignment === 'BENCH'
        ? `Yedek (Bench) — Hazır beklersen +${rules.benchReadyPoints ?? 6}p!`
        : event.rosters.find((r) => r.id === myEntry.assignment)?.name || myEntry.assignment

  const baseRaidPts = raidBasePoints(event.size, rules)
  const visibleRosters =
    rosterFilterId === 'all' ? event.rosters : event.rosters.filter((r) => r.id === rosterFilterId)

  const myLevel = myMain?.level ?? 0
  const isBelowLevel60 = Boolean(!isMeeting && currentUsername && myLevel < 60)

  return (
    <div className="space-y-5">
      {/* Unified Selected Event Command Banner */}
      <Panel
        className={cn(
          'p-4 sm:p-5',
          eventHasStarted
            ? 'border-rose-500/40 bg-gradient-to-br from-rose-950/25 via-[#091829] to-[#071220]'
            : 'border-emerald-400/35 bg-gradient-to-br from-emerald-950/20 via-[#0b1f33] to-[#071220]',
        )}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'size-2.5 shrink-0 rounded-full',
                  eventHasStarted
                    ? 'bg-rose-400'
                    : 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]',
                )}
              />
              <h2 className="font-display text-xl font-bold text-gold sm:text-2xl">{event.raidName}</h2>
              {isOfficer && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={onEditEvent}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-gold/35 bg-gold/10 px-2 py-1 text-[11px] font-semibold text-gold transition hover:border-gold/60 hover:bg-gold/20 disabled:opacity-50"
                  title="Raid adını, tarihini veya içeriğini düzenle"
                >
                  <Pencil className="size-3" />
                  Düzenle
                </button>
              )}
              <Badge
                className={
                  isMeeting
                    ? 'border-purple-400/40 bg-purple-500/15 text-purple-200'
                    : 'border-gold/40 bg-gold/10 text-gold'
                }
              >
                {isMeeting ? 'Tüm Guild · Tüm Seviyeler' : `${event.size}-Man`}
              </Badge>
              <Badge
                className={
                  eventHasStarted
                    ? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                    : event.status === 'ROSTERS_PUBLISHED'
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                      : 'border-neon/40 bg-neon/10 text-neon'
                }
              >
                {eventHasStarted
                  ? 'Süresi Geçti · Puanlama & Arşiv Bekliyor'
                  : event.status === 'ROSTERS_PUBLISHED'
                    ? 'Roster Yayında — Konfirmasyon Açık'
                    : 'İmza Toplama Aşaması'}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-silver">{formatTrDateTime(event.scheduledAt)}</p>
            {event.notes && (
              <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-amber-200/90">
                Not: {event.notes}
              </p>
            )}
          </div>

          {/* Countdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="rounded-xl border border-neon/25 bg-[#071422] px-3.5 py-2 text-center">
              <p className="text-[10px] tracking-wider text-muted-foreground uppercase">
                <Clock className="mr-1 inline size-3 text-neon" />
                İmza Kapanış
              </p>
              <CountdownValue targetIso={event.signupDeadline} accentClass="text-neon" className="text-sm font-bold" />
              <p className="mt-0.5 text-[10px] text-muted-foreground">{formatTrShortDateTime(event.signupDeadline)}</p>
            </div>
            <div className="rounded-xl border border-gold/25 bg-[#071422] px-3.5 py-2 text-center">
              <p className="text-[10px] tracking-wider text-muted-foreground uppercase">Konfirme Kapanış</p>
              <CountdownValue targetIso={event.confirmDeadline} accentClass="text-gold" className="text-sm font-bold" />
              <p className="mt-0.5 text-[10px] text-muted-foreground">{formatTrShortDateTime(event.confirmDeadline)}</p>
            </div>
          </div>
        </div>

        {/* Player Status & CTA Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-[#071422]/85 px-4 py-3">
          <div className="text-xs">
            {myEntry ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">Durumun:</span>
                <span className="inline-flex items-center gap-1.5">
                  <strong style={{ color: CLASS_COLORS[myEntry.wowClass] }}>{myEntry.characterName}</strong>
                  {(() => {
                    const rk = rankByUser.get(myEntry.username.toLowerCase())
                    return rk ? (
                      <RankPill label={rk.label} color={rk.color} armoryRankId={rk.armoryRankId} />
                    ) : null
                  })()}
                  <PointsPill points={pointsByUser.get(myEntry.username.toLowerCase()) ?? 0} />
                </span>
                <Badge className="border-neon/30 bg-neon/10 text-neon">{myAssignmentLabel}</Badge>
                {myEntry.confirmStatus === 'CONFIRMED' && (
                  <Badge className="border-emerald-500/40 bg-emerald-500/15 text-emerald-300">
                    Konfirme Edildi (+{rules.confirm}p)
                  </Badge>
                )}
                {myEntry.confirmStatus === 'DECLINED_EXCUSED' && (
                  <Badge className="border-rose-500/40 bg-rose-500/15 text-rose-300">Mazeretli İptal</Badge>
                )}
              </div>
            ) : isBelowLevel60 ? (
              <span className="flex items-center gap-1.5 text-amber-300">
                <Lock className="size-3.5 shrink-0" />
                <span>
                  {myLevel > 0 ? (
                    <>
                      WoW Armory verisine göre karakteriniz (<strong>{myMain?.characterName}</strong>) şu an{' '}
                      <strong>Level {myLevel}</strong>. Raidlere yalnızca <strong>Level 60</strong> karakterler imza atabilir.
                    </>
                  ) : (
                    <>
                      WoW Armory üzerinden karakterinizin <strong>Level 60</strong> olduğu doğrulandığında raidlere imza atabilirsiniz.
                    </>
                  )}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">
                {isMeeting
                  ? 'Bu guild toplantısına henüz imza atmadınız. Tüm seviyeler imza atabilir — ilk puanlarınız bu demo ile başlar!'
                  : 'Bu raide henüz imza atmadınız. Tek imza havuzuna kaydolun, Officerlar uygun gruba atasın.'}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!myEntry ? (
              isBelowLevel60 ? (
                <>
                  <GhostButton
                    type="button"
                    disabled={busy}
                    onClick={onRefreshArmoryLevel}
                    className="px-3 py-1.5 text-xs"
                    title="Yeni 60 olduysanız WoW Armory seviyenizi yeniden kontrol eder"
                  >
                    <RefreshCw className="size-3.5" />
                    Armory Yenile
                  </GhostButton>
                  <GoldButton disabled className="opacity-55">
                    <Lock className="size-4" />
                    Level 60 Gerekli{myLevel > 0 ? ` (Lv${myLevel})` : ''}
                  </GoldButton>
                </>
              ) : (
                <GoldButton disabled={busy || (signupExpired && !isOfficer)} onClick={onSignup}>
                  <UserCheck className="size-4" />
                  {isMeeting ? `Toplantıya İmza At (+${rules.signup}p)` : `Raide İmza At (+${rules.signup}p)`}
                </GoldButton>
              )
            ) : (
              <>
                {event.status === 'ROSTERS_PUBLISHED' && myEntry.confirmStatus !== 'CONFIRMED' && (
                  <GoldButton disabled={busy || (confirmExpired && !isOfficer)} onClick={onOpenConfirm}>
                    <CheckCircle2 className="size-4" />
                    Katılımı Konfirme Et (+{rules.confirm}p)
                  </GoldButton>
                )}
                {myEntry.confirmStatus !== 'DECLINED_EXCUSED' && (
                  <GhostButton
                    disabled={busy}
                    onClick={event.status === 'SIGNUP_OPEN' ? onWithdraw : onOpenDecline}
                    className="border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
                  >
                    <XCircle className="size-4" />
                    {event.status === 'SIGNUP_OPEN' ? 'İmzayı Geri Çek' : 'Mazeretli İptal (0p)'}
                  </GhostButton>
                )}
              </>
            )}
          </div>
        </div>

        {/* Sub-Toolbar: Roster Filter Pills + Officer Controls */}
        {(event.rosters.length > 1 || isOfficer) && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {isOfficer && (
                <>
                  <button
                    type="button"
                    onClick={() => setViewMode('rosters')}
                    className={cn(
                      'cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                      viewMode === 'rosters'
                        ? 'border-neon/50 bg-neon/15 text-neon'
                        : 'border-border text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Layers className="mr-1.5 inline size-3.5" />
                    1. Roster Panosu ({event.rosters.length} Grup)
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('postraid')}
                    className={cn(
                      'cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                      viewMode === 'postraid'
                        ? 'border-gold/50 bg-gold/15 text-gold'
                        : 'border-border text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Archive className="mr-1.5 inline size-3.5" />
                    2. Raid Sonu Puanlama &amp; Arşiv
                  </button>
                </>
              )}

              {viewMode === 'rosters' && event.rosters.length > 1 && (
                <div className="ml-1 flex flex-wrap items-center gap-1 border-l border-border/60 pl-2">
                  <button
                    type="button"
                    onClick={() => setRosterFilterId('all')}
                    className={cn(
                      'cursor-pointer rounded-md border px-2 py-1 text-[11px] font-semibold transition',
                      rosterFilterId === 'all'
                        ? 'border-gold/50 bg-gold/15 text-gold'
                        : 'border-border/70 text-muted-foreground hover:text-foreground',
                    )}
                  >
                    Tüm Gruplar
                  </button>
                  {event.rosters.map((r, idx) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRosterFilterId(r.id)}
                      className={cn(
                        'cursor-pointer rounded-md border px-2 py-1 text-[11px] font-semibold transition',
                        rosterFilterId === r.id
                          ? 'border-neon/50 bg-neon/15 text-neon'
                          : 'border-border/70 text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {shortRosterLabel(r.name, idx)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isOfficer && (
              <div className="flex flex-wrap items-center gap-2">
                <GhostButton disabled={busy} onClick={onOpenAddMember} className="px-3 py-1.5 text-xs">
                  <UserPlus className="size-3.5" />
                  Üye Ekle
                </GhostButton>
                <GhostButton disabled={busy} onClick={onAddRoster} className="px-3 py-1.5 text-xs">
                  <Plus className="size-3.5" />
                  Yeni Grup Ekle
                </GhostButton>
                <GoldButton disabled={busy} onClick={onPublish} className="px-3 py-1.5 text-xs">
                  <Send className="size-3.5" />
                  {event.status === 'ROSTERS_PUBLISHED' ? 'Rosterı Güncelle & Duyur' : 'Rosterları Yayınla'}
                </GoldButton>
                <button
                  type="button"
                  disabled={busy}
                  onClick={onDeleteEvent}
                  className="cursor-pointer rounded-lg border border-rose-500/30 p-1.5 text-rose-400 transition hover:bg-rose-500/10"
                  title="Raid etkinliğini sil"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </Panel>

      {/* Mode 1: Full-Width 4-Role Column Raid Board + Spacious Bottom Pool & Bench */}
      {viewMode === 'rosters' && (
        <div className="space-y-5">
          {visibleRosters.map((roster, rosterIndex) => {
            const members = event.signups.filter((s) => s.assignment === roster.id)
            const confirmedCount = members.filter((m) => m.confirmStatus === 'CONFIRMED').length
            const rosterColor =
              roster.color || ROSTER_COLOR_PRESETS[rosterIndex % ROSTER_COLOR_PRESETS.length].hex
            const isEditingThis = editingRosterId === roster.id

            const saveRosterEdit = () => {
              const trimmed = editRosterName.trim()
              if (!trimmed) return
              onUpdateRoster(roster.id, { name: trimmed, color: editRosterColor })
              setEditingRosterId(null)
            }

            return (
              <Panel
                key={roster.id}
                className="relative overflow-hidden p-4"
                style={{ borderColor: `${rosterColor}50` }}
              >
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-1"
                  style={{ backgroundColor: rosterColor }}
                />

                {/* Roster Header + Inline Rename & Color Picker */}
                <div className="mb-3.5 border-b border-border/60 pb-3">
                  {isEditingThis && isOfficer ? (
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={editRosterName}
                          maxLength={48}
                          autoFocus
                          placeholder="Grup adı..."
                          onChange={(e) => setEditRosterName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              saveRosterEdit()
                            } else if (e.key === 'Escape') {
                              setEditingRosterId(null)
                            }
                          }}
                          className={cn(inputClass, 'h-8 min-w-[200px] flex-1 px-2.5 py-1 text-xs font-semibold')}
                        />
                        <button
                          type="button"
                          disabled={busy || !editRosterName.trim()}
                          onClick={saveRosterEdit}
                          className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
                        >
                          <Check className="size-3.5" />
                          Kaydet
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingRosterId(null)}
                          className="h-8 cursor-pointer rounded-lg border border-border px-2.5 text-xs text-muted-foreground hover:text-foreground"
                        >
                          İptal
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="mr-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                          Renk:
                        </span>
                        {ROSTER_COLOR_PRESETS.map((preset) => {
                          const selected = editRosterColor.toLowerCase() === preset.hex.toLowerCase()
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => setEditRosterColor(preset.hex)}
                              title={preset.label}
                              className={cn(
                                'size-5 cursor-pointer rounded-full border-2 transition-transform hover:scale-110',
                                selected
                                  ? 'scale-110 border-white shadow-[0_0_8px_rgba(255,255,255,0.6)]'
                                  : 'border-black/40',
                              )}
                              style={{ backgroundColor: preset.hex }}
                            />
                          )
                        })}
                        <label
                          className="ml-1 inline-flex cursor-pointer items-center gap-1 rounded-md border border-border/80 bg-[#071422] px-1.5 py-0.5 text-[10px] text-silver hover:border-neon/50"
                          title="Özel renk seç"
                        >
                          <input
                            type="color"
                            value={editRosterColor}
                            onChange={(e) => setEditRosterColor(e.target.value)}
                            className="size-3.5 cursor-pointer border-0 bg-transparent p-0"
                          />
                          Özel
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: rosterColor, boxShadow: `0 0 8px ${rosterColor}` }}
                        />
                        <h3 className="font-display text-base font-bold" style={{ color: rosterColor }}>
                          {roster.name}
                        </h3>
                        <span className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-xs text-silver">
                          {isMeeting ? `${members.length} katılımcı` : `${members.length}/${event.size}`}
                        </span>
                        <span className="text-[11px] text-emerald-300">{confirmedCount} Konfirme</span>
                        {isOfficer && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setEditingRosterId(roster.id)
                              setEditRosterName(roster.name)
                              setEditRosterColor(rosterColor)
                            }}
                            className="cursor-pointer rounded p-1 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                            title="Grup adını ve rengini düzenle"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                        )}
                        {isOfficer && event.rosters.length > 1 && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onRemoveRoster(roster.id)}
                            className="cursor-pointer rounded p-1 text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-400"
                            title="Grubu sil"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        {ROLE_ORDER.map((rk) => {
                          const cnt = members.filter((m) => m.role === rk).length
                          return (
                            <span
                              key={rk}
                              className={cn('rounded border px-2 py-0.5 font-mono font-semibold', ROLE_META[rk].chip)}
                            >
                              {ROLE_META[rk].label.split(' ')[0]}: {cnt}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 4 Role Columns: Tank / Healer / Melee DPS / Ranged DPS */}
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
                        <div
                          className={cn(
                            'flex items-center justify-between rounded-t-xl px-3 py-2 text-xs font-bold',
                            rm.headerBg,
                            rm.color,
                          )}
                        >
                          <span className="flex items-center gap-1.5">
                            <RIcon className="size-3.5" />
                            {rm.label}
                          </span>
                          <span className="font-mono">{list.length}</span>
                        </div>
                        <div className="flex-1 space-y-2 p-2.5">
                          {list.length === 0 ? (
                            <p className="py-5 text-center text-[11px] text-muted-foreground/60">Boş</p>
                          ) : (
                            list.map((s) => {
                              const rk = rankByUser.get(s.username.toLowerCase())
                              const pts = pointsByUser.get(s.username.toLowerCase()) ?? 0
                              const conflicts = getSameWeekConflicts(event, allEvents, s.username)
                              return (
                                <div
                                  key={s.id}
                                  className={cn(
                                    'rounded-lg border px-3 py-2 transition',
                                    conflicts.some((c) => c.severity === 'assigned')
                                      ? 'border-amber-400/50 bg-amber-500/[0.05]'
                                      : 'border-border/65 bg-[#0a1a2c] hover:border-border',
                                  )}
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
                                      published={event.status === 'ROSTERS_PUBLISHED'}
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
                                      {rk && (
                                        <RankPill
                                          label={rk.label}
                                          color={rk.color}
                                          armoryRankId={rk.armoryRankId}
                                        />
                                      )}
                                      <PointsPill points={pts} />
                                    </span>
                                  </div>
                                  {s.confirmStatus === 'DECLINED_EXCUSED' && s.declineReason && (
                                    <p className="mt-1 text-[10px] text-rose-300/90">
                                      Mazeret: {s.declineReason}
                                    </p>
                                  )}
                                  {conflicts.length > 0 && (
                                    <div className="mt-1.5 flex items-start gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200">
                                      <AlertTriangle className="mt-0.5 size-3 shrink-0 text-amber-400" />
                                      <span>
                                        Aynı hafta:{' '}
                                        {conflicts
                                          .map((c) => `${c.dayLabel} (${c.assignmentLabel})`)
                                          .join(', ')}
                                      </span>
                                    </div>
                                  )}
                                  {isOfficer && (
                                    <div className="mt-2 flex justify-end border-t border-border/40 pt-1.5">
                                      <CompactAssignControl
                                        signup={s}
                                        event={event}
                                        busy={busy}
                                        onAssign={onAssign}
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

          {/* Full-Width Bottom Strips for Signup Pool & Bench */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel className="border-neon/25 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-display text-sm font-bold text-neon">
                  <Users className="size-4" /> İmza Havuzu (Atama Bekleyen)
                </h3>
                <Badge className="border-neon/35 bg-neon/10 text-neon">{poolSignups.length}</Badge>
              </div>
              {poolSignups.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Havuzda bekleyen imza yok.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {poolSignups.map((s) => {
                    const rk = rankByUser.get(s.username.toLowerCase())
                    const pts = pointsByUser.get(s.username.toLowerCase()) ?? 0
                    const conflicts = getSameWeekConflicts(event, allEvents, s.username)
                    return (
                      <div
                        key={s.id}
                        className={cn(
                          'rounded-lg border p-2.5 text-xs',
                          conflicts.some((c) => c.severity === 'assigned')
                            ? 'border-amber-400/50 bg-amber-500/[0.04]'
                            : 'border-border/70 bg-[#071422]',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="truncate font-bold"
                            style={{ color: CLASS_COLORS[s.wowClass] || '#fff' }}
                            title={s.characterName}
                          >
                            {s.characterName}
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-1">
                            {rk && (
                              <RankPill label={rk.label} color={rk.color} armoryRankId={rk.armoryRankId} />
                            )}
                            <PointsPill points={pts} />
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-muted-foreground">
                            {s.spec} · {ROLE_META[s.role].label.split(' ')[0]}
                            {s.level < 60 && <span className="ml-1 text-amber-300">· Lv{s.level}</span>}
                          </span>
                          {isOfficer ? (
                            <CompactAssignControl
                              signup={s}
                              event={event}
                              busy={busy}
                              onAssign={onAssign}
                            />
                          ) : (
                            <ConfirmDot
                              status={s.confirmStatus}
                              published={event.status === 'ROSTERS_PUBLISHED'}
                            />
                          )}
                        </div>
                        {conflicts.length > 0 && (
                          <div className="mt-1.5 flex items-start gap-1 text-[10px] text-amber-300">
                            <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                            <span>
                              Aynı hafta: {conflicts.map((c) => `${c.dayLabel} (${c.assignmentLabel})`).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </Panel>

            <Panel className="border-cyan-500/25 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-display text-sm font-bold text-cyan-300">
                  <UserMinus className="size-4" /> Yedek / Bench (Hazır = +{rules.benchReadyPoints ?? 6}p)
                </h3>
                <Badge className="border-cyan-500/35 bg-cyan-500/10 text-cyan-300">
                  {benchSignups.length}
                </Badge>
              </div>
              {benchSignups.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Henüz bench atanmadı.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {benchSignups.map((s) => {
                    const rk = rankByUser.get(s.username.toLowerCase())
                    const pts = pointsByUser.get(s.username.toLowerCase()) ?? 0
                    const conflicts = getSameWeekConflicts(event, allEvents, s.username)
                    return (
                      <div
                        key={s.id}
                        className={cn(
                          'rounded-lg border p-2.5 text-xs',
                          conflicts.some((c) => c.severity === 'assigned')
                            ? 'border-amber-400/50 bg-amber-500/[0.04]'
                            : 'border-border/70 bg-[#071422]',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="truncate font-bold"
                            style={{ color: CLASS_COLORS[s.wowClass] || '#fff' }}
                            title={s.characterName}
                          >
                            {s.characterName}
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-1">
                            {rk && (
                              <RankPill label={rk.label} color={rk.color} armoryRankId={rk.armoryRankId} />
                            )}
                            <PointsPill points={pts} />
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span>
                              {s.spec} · {ROLE_META[s.role].label.split(' ')[0]}
                            </span>
                            <ConfirmDot
                              status={s.confirmStatus}
                              published={event.status === 'ROSTERS_PUBLISHED'}
                            />
                          </span>
                          {isOfficer && (
                            <CompactAssignControl
                              signup={s}
                              event={event}
                              busy={busy}
                              onAssign={onAssign}
                            />
                          )}
                        </div>
                        {conflicts.length > 0 && (
                          <div className="mt-1.5 flex items-start gap-1 text-[10px] text-amber-300">
                            <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                            <span>
                              Aynı hafta: {conflicts.map((c) => `${c.dayLabel} (${c.assignmentLabel})`).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}

      {/* Mode 2: Post-Raid Attendance Processing & Archiving (Officer/GM) — Grouped by Roster */}
      {viewMode === 'postraid' && isOfficer && (() => {
        const nonEmptyRosters = event.rosters.filter((r) =>
          event.signups.some((s) => s.assignment === r.id),
        )
        const scoredRostersCount = nonEmptyRosters.filter((r) => Boolean(r.scoredBy)).length
        const benchRequired = benchSignups.length > 0
        const totalRequiredGroups = nonEmptyRosters.length + (benchRequired ? 1 : 0)
        const totalApprovedGroups = scoredRostersCount + (benchRequired && event.benchScoredBy ? 1 : 0)
        const allGroupsScored = totalRequiredGroups > 0 && totalApprovedGroups === totalRequiredGroups
        const canArchiveNow = eventHasStarted && allGroupsScored

        const postraidSections: {
          id: string
          kind: 'roster' | 'bench' | 'pool'
          name: string
          color: string
          scoredBy?: string
          members: RaidEventSignup[]
        }[] = [
          ...event.rosters.map((r, rIdx) => ({
            id: r.id,
            kind: 'roster' as const,
            name: r.name,
            color: r.color || ROSTER_COLOR_PRESETS[rIdx % ROSTER_COLOR_PRESETS.length].hex,
            scoredBy: r.scoredBy,
            members: event.signups.filter((s) => s.assignment === r.id),
          })),
          ...(benchSignups.length > 0
            ? [
                {
                  id: 'BENCH',
                  kind: 'bench' as const,
                  name: 'Yedek / Bench',
                  color: '#22d3ee',
                  scoredBy: event.benchScoredBy,
                  members: benchSignups,
                },
              ]
            : []),
          ...(poolSignups.length > 0
            ? [
                {
                  id: 'POOL',
                  kind: 'pool' as const,
                  name: 'Atanmamış Havuz / İptal',
                  color: '#94a3b8',
                  members: poolSignups,
                },
              ]
            : []),
        ]

        const visibleSections =
          postraidGroupFilter === 'all'
            ? postraidSections
            : postraidSections.filter((sec) => sec.id === postraidGroupFilter)

        return (
          <div className="space-y-4">
            <Panel className="border-gold/35">
              <PanelTitle
                icon={Archive}
                action={
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className={
                        allGroupsScored
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                          : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                      }
                    >
                      Onaylanan Gruplar: {totalApprovedGroups} / {totalRequiredGroups}
                    </Badge>
                    <GoldButton
                      disabled={busy || !canArchiveNow}
                      onClick={onOpenArchive}
                      title={
                        !eventHasStarted
                          ? 'Etkinlik başlangıç saati gelmeden arşivleme yapılamaz.'
                          : !allGroupsScored
                            ? 'Arşivlemeden önce tüm dolu grupların puanlamasını onaylamalısınız.'
                            : 'Etkinliği arşivle ve puanları Devam Takibine işle'
                      }
                    >
                      <Archive className="size-4" />
                      Tamamla, Puanları İşle &amp; Arşivle
                    </GoldButton>
                  </div>
                }
              >
                Raid Sonu Katılım İşleme — {event.raidName}
              </PanelTitle>

              {!eventHasStarted && (
                <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200">
                  <Lock className="mt-0.5 size-4 shrink-0 text-amber-300" />
                  <span>
                    <strong>Etkinlik henüz başlamadı ({formatTrDateTime(event.scheduledAt)}).</strong> Puanlama, grup onayı ve arşivleme işlemleri etkinlik saati geldiğinde otomatik olarak açılır.
                  </span>
                </div>
              )}

              <p className="mb-3 text-xs text-muted-foreground">
                Her satır başlangıçta <strong className="text-silver">&quot;İncelenmedi&quot;</strong> olarak açılır. Etkinlik bitince officer kendi grubundaki oyuncuların fiilî durumunu işaretleyip{' '}
                <strong className="text-emerald-300">&quot;Grubu Onayla&quot;</strong> düğmesine basar. Tüm dolu gruplar onaylandığında arşivleme açılır.
              </p>

              {/* Quick Group Filter Bar */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPostraidGroupFilter('all')}
                  className={cn(
                    'cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                    postraidGroupFilter === 'all'
                      ? 'border-gold/60 bg-gold/15 text-gold'
                      : 'border-border bg-[#071422] text-muted-foreground hover:text-foreground',
                  )}
                >
                  Tüm Gruplar ({event.signups.length})
                </button>
                {postraidSections.map((sec) => {
                  const selected = postraidGroupFilter === sec.id
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => setPostraidGroupFilter(sec.id)}
                      className={cn(
                        'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                        selected
                          ? 'bg-white/10 text-foreground'
                          : 'border-border bg-[#071422] text-muted-foreground hover:text-foreground',
                      )}
                      style={selected ? { borderColor: sec.color, color: sec.color } : undefined}
                    >
                      <span className="size-2 rounded-full" style={{ backgroundColor: sec.color }} />
                      <span>{sec.name}</span>
                      <span className="opacity-70">({sec.members.length})</span>
                      {sec.scoredBy && <CheckCircle2 className="size-3.5 text-emerald-400" />}
                    </button>
                  )
                })}
              </div>
            </Panel>

            {/* Separate Scoring Card Per Group */}
            {visibleSections.map((sec) => {
              const isCollapsed = Boolean(collapsedPostraidGroups[sec.id])
              const isScored = Boolean(sec.scoredBy)
              const unscoredInSec = sec.members.filter(
                (m) => m.attendanceOutcome === 'NONE' && m.confirmStatus !== 'DECLINED_EXCUSED',
              ).length

              return (
                <Panel
                  key={sec.id}
                  className="relative overflow-hidden"
                  style={{ borderColor: `${sec.color}55` }}
                >
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-1"
                    style={{ backgroundColor: sec.color }}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedPostraidGroups((prev) => ({ ...prev, [sec.id]: !prev[sec.id] }))
                      }
                      aria-expanded={!isCollapsed}
                      className="group flex cursor-pointer items-center gap-2 text-left"
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: sec.color, boxShadow: `0 0 8px ${sec.color}` }}
                      />
                      <h3 className="font-display text-base font-bold" style={{ color: sec.color }}>
                        {sec.name}
                      </h3>
                      <ChevronDown
                        className={cn(
                          'size-4 text-muted-foreground transition-transform duration-200 group-hover:text-foreground',
                          isCollapsed && '-rotate-90',
                        )}
                      />
                      <span className="text-xs text-muted-foreground">({sec.members.length} oyuncu)</span>
                      {isScored && (
                        <Badge className="border-emerald-500/40 bg-emerald-500/15 text-[11px] text-emerald-300">
                          <CheckCircle2 className="size-3" />
                          Onaylandı · {sec.scoredBy}
                        </Badge>
                      )}
                      {!isScored && unscoredInSec > 0 && sec.kind !== 'pool' && (
                        <Badge className="border-amber-500/35 bg-amber-500/10 text-[10px] text-amber-300">
                          {unscoredInSec} İncelenmedi
                        </Badge>
                      )}
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                      {sec.kind === 'roster' && sec.members.length > 0 && (
                        <GhostButton
                          type="button"
                          disabled={busy || !eventHasStarted}
                          onClick={() =>
                            onBatchSetOutcome(
                              sec.members.map((m) => ({
                                signupId: m.id,
                                flags:
                                  m.confirmStatus === 'DECLINED_EXCUSED'
                                    ? { excused: true }
                                    : { attended: true },
                              })),
                              `${sec.name} üyeleri "Katıldı (+${baseRaidPts}p)" olarak işaretlendi.`,
                            )
                          }
                          className="px-2.5 py-1.5 text-[11px]"
                        >
                          <Check className="size-3.5" />
                          Tümünü Katıldı (+{baseRaidPts}p)
                        </GhostButton>
                      )}
                      {sec.kind === 'bench' && sec.members.length > 0 && (
                        <GhostButton
                          type="button"
                          disabled={busy || !eventHasStarted}
                          onClick={() =>
                            onBatchSetOutcome(
                              sec.members.map((m) => ({
                                signupId: m.id,
                                flags:
                                  m.confirmStatus === 'DECLINED_EXCUSED'
                                    ? { excused: true }
                                    : { benchReady: true },
                              })),
                              `Bench üyeleri "Yedek (+${rules.benchReadyPoints ?? 6}p)" olarak işaretlendi.`,
                            )
                          }
                          className="px-2.5 py-1.5 text-[11px]"
                        >
                          <Check className="size-3.5" />
                          Tümünü Yedek (+{rules.benchReadyPoints ?? 6}p)
                        </GhostButton>
                      )}
                      {(sec.kind === 'roster' || sec.kind === 'bench') && sec.members.length > 0 && (
                        <button
                          type="button"
                          disabled={busy || !eventHasStarted || (!isScored && unscoredInSec > 0)}
                          onClick={() => onMarkRosterScored(sec.id, !isScored)}
                          title={
                            !eventHasStarted
                              ? 'Etkinlik başlamadan onaylanamaz'
                              : !isScored && unscoredInSec > 0
                                ? `Önce incelenmemiş ${unscoredInSec} oyuncunun durumunu işaretleyin`
                                : undefined
                          }
                          className={cn(
                            'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45',
                            isScored
                              ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
                              : 'border-gold/50 bg-gold/15 text-gold hover:bg-gold/25',
                          )}
                        >
                          <CheckCircle2 className="size-3.5" />
                          {isScored ? 'Onayı Kaldır' : sec.kind === 'bench' ? 'Bench Onayla' : 'Grubu Onayla'}
                        </button>
                      )}
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="mt-3">
                      {sec.members.length === 0 ? (
                        <p className="py-4 text-center text-xs text-muted-foreground">
                          Bu grupta atanmış oyuncu yok.
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-border/60 text-muted-foreground uppercase">
                                <th className="py-2 pr-3">Karakter</th>
                                <th className="py-2 pr-3">Konfirmasyon</th>
                                <th className="py-2 pr-3">Ana Durum (Tek Seçim) &amp; Cezalar</th>
                                <th className="py-2 text-right">Hesaplanan Puan</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                              {sec.members.map((s) => {
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
                                const previewBreakdown = calculateSignupPoints(
                                  {
                                    ...s,
                                    attendanceOutcome: deriveOutcomeFromFlags(activeFlags),
                                    attendanceFlags: activeFlags,
                                  },
                                  event.size,
                                  rules,
                                )

                                const toggleFlag = (key: keyof AttendanceFlags) => {
                                  if (!eventHasStarted) return
                                  const nextVal = !activeFlags[key]
                                  let next: AttendanceFlags = { ...activeFlags }
                                  if (key === 'attended') {
                                    next = nextVal ? { attended: true } : {}
                                  } else if (key === 'benchReady') {
                                    next = nextVal ? { benchReady: true } : {}
                                  } else if (key === 'late') {
                                    next = nextVal
                                      ? { attended: true, late: true, missingPrep: Boolean(activeFlags.missingPrep) }
                                      : {
                                          attended: Boolean(activeFlags.attended || activeFlags.missingPrep),
                                          missingPrep: Boolean(activeFlags.missingPrep),
                                        }
                                  } else if (key === 'missingPrep') {
                                    next = nextVal
                                      ? { attended: true, late: Boolean(activeFlags.late), missingPrep: true }
                                      : {
                                          attended: Boolean(activeFlags.attended || activeFlags.late),
                                          late: Boolean(activeFlags.late),
                                        }
                                  } else if (key === 'excused') {
                                    next = nextVal ? { excused: true } : {}
                                  } else if (key === 'noShow') {
                                    next = nextVal ? { noShow: true } : {}
                                  }
                                  onSetOutcome(s.id, next)
                                }

                                const primaryItems: {
                                  key: keyof AttendanceFlags
                                  label: string
                                  pts: string
                                  activeCls: string
                                }[] = [
                                  {
                                    key: 'attended',
                                    label: 'Katıldı',
                                    pts: `+${baseRaidPts}p`,
                                    activeCls: 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200',
                                  },
                                  {
                                    key: 'benchReady',
                                    label: 'Yedek',
                                    pts: `+${rules.benchReadyPoints ?? 6}p`,
                                    activeCls: 'border-gold/60 bg-gold/15 text-gold',
                                  },
                                  {
                                    key: 'excused',
                                    label: 'Mazeret',
                                    pts: '0p',
                                    activeCls: 'border-slate-400/60 bg-slate-500/20 text-slate-200',
                                  },
                                  {
                                    key: 'noShow',
                                    label: 'No-Show',
                                    pts: `${rules.noShowPenalty}p`,
                                    activeCls: 'border-rose-500/60 bg-rose-500/15 text-rose-200',
                                  },
                                ]

                                const penaltyItems: {
                                  key: keyof AttendanceFlags
                                  label: string
                                  pts: string
                                  activeCls: string
                                  accentCls: string
                                }[] = [
                                  {
                                    key: 'late',
                                    label: 'Geç',
                                    pts: `${rules.latePenalty}p`,
                                    activeCls: 'border-amber-500/60 bg-amber-500/15 text-amber-200',
                                    accentCls: 'accent-amber-400',
                                  },
                                  {
                                    key: 'missingPrep',
                                    label: 'Eksik',
                                    pts: `${rules.missingPrepPenalty}p`,
                                    activeCls: 'border-orange-500/60 bg-orange-500/15 text-orange-200',
                                    accentCls: 'accent-orange-400',
                                  },
                                ]

                                const penaltiesDisabled =
                                  busy ||
                                  !eventHasStarted ||
                                  Boolean(activeFlags.excused || activeFlags.noShow || activeFlags.benchReady)

                                return (
                                  <tr key={s.id} className="hover:bg-white/[0.02]">
                                    <td
                                      className="py-2.5 pr-3 font-semibold"
                                      style={{ color: CLASS_COLORS[s.wowClass] || '#fff' }}
                                    >
                                      <span className="inline-flex flex-wrap items-center gap-1.5">
                                        <span>{s.characterName}</span>
                                        {(() => {
                                          const rk = rankByUser.get(s.username.toLowerCase())
                                          return rk ? (
                                            <RankPill
                                              label={rk.label}
                                              color={rk.color}
                                              armoryRankId={rk.armoryRankId}
                                            />
                                          ) : null
                                        })()}
                                        <PointsPill points={pointsByUser.get(s.username.toLowerCase()) ?? 0} />
                                      </span>
                                      <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                                        ({s.spec})
                                      </span>
                                    </td>
                                    <td className="py-2.5 pr-3">
                                      <Badge
                                        className={
                                          s.confirmStatus === 'CONFIRMED'
                                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                                            : s.confirmStatus === 'DECLINED_EXCUSED'
                                              ? 'border-slate-500/40 bg-slate-500/10 text-slate-300'
                                              : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                                        }
                                      >
                                        {s.confirmStatus === 'CONFIRMED'
                                          ? 'Onaylı'
                                          : s.confirmStatus === 'DECLINED_EXCUSED'
                                            ? 'Mazeretli İptal'
                                            : 'Onay Bekliyor'}
                                      </Badge>
                                    </td>
                                    <td className="py-2.5 pr-3">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <div className="inline-flex flex-wrap items-center gap-1">
                                          {primaryItems.map((item) => {
                                            const selected = Boolean(activeFlags[item.key])
                                            return (
                                              <button
                                                key={item.key}
                                                type="button"
                                                disabled={busy || !eventHasStarted}
                                                onClick={() => toggleFlag(item.key)}
                                                className={cn(
                                                  'inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition select-none disabled:cursor-not-allowed disabled:opacity-45',
                                                  selected
                                                    ? item.activeCls
                                                    : 'border-border/60 bg-[#071422]/80 text-muted-foreground hover:border-border hover:text-silver',
                                                )}
                                              >
                                                <span>{item.label}</span>
                                                <span className="font-mono text-[10px] opacity-80">{item.pts}</span>
                                              </button>
                                            )
                                          })}
                                        </div>

                                        <span className="hidden h-4 w-px bg-border/70 sm:inline-block" aria-hidden />

                                        <div className="inline-flex flex-wrap items-center gap-1">
                                          {penaltyItems.map((item) => {
                                            const checked = Boolean(activeFlags[item.key])
                                            return (
                                              <label
                                                key={item.key}
                                                className={cn(
                                                  'inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition select-none',
                                                  penaltiesDisabled && 'pointer-events-none opacity-40',
                                                  checked
                                                    ? item.activeCls
                                                    : 'border-border/60 bg-[#071422]/80 text-muted-foreground hover:border-border hover:text-silver',
                                                )}
                                              >
                                                <input
                                                  type="checkbox"
                                                  disabled={penaltiesDisabled}
                                                  checked={checked}
                                                  onChange={() => toggleFlag(item.key)}
                                                  className={cn('size-3 cursor-pointer', item.accentCls)}
                                                />
                                                <span>{item.label}</span>
                                                <span className="font-mono text-[10px] opacity-80">{item.pts}</span>
                                              </label>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-2.5 text-right font-mono font-bold">
                                      {isUnscored ? (
                                        <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-sans text-[11px] font-semibold text-amber-300">
                                          İncelenmedi
                                        </span>
                                      ) : (
                                        <>
                                          <span
                                            className={
                                              previewBreakdown.total > 0
                                                ? 'text-emerald-300'
                                                : previewBreakdown.total < 0
                                                  ? 'text-rose-400'
                                                  : 'text-muted-foreground'
                                            }
                                          >
                                            {previewBreakdown.total > 0 ? `+${previewBreakdown.total}` : previewBreakdown.total}p
                                          </span>
                                          <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                                            (İmza:{previewBreakdown.signup}, Onay:{previewBreakdown.confirm},{' '}
                                            {activeFlags.benchReady ? 'Yedek' : 'Raid'}:{previewBreakdown.raid}
                                            {previewBreakdown.penalty < 0 ? `, Ceza:${previewBreakdown.penalty}` : ''})
                                          </span>
                                        </>
                                      )}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </Panel>
              )
            })}
          </div>
        )
      })()}
    </div>
  )
}
