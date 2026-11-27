'use client'

import {
  AlertTriangle,
  Archive,
  CalendarClock,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Info,
  Layers,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { CLASS_COLORS, type WowClass } from '@/lib/guild-data'
import {
  calculateSignupPoints,
  deriveOutcomeFromFlags,
  formatCountdown,
  formatTrDateTime,
  RAID_CATALOG,
  resolveAttendanceFlags,
  ROSTER_COLOR_PRESETS,
  type AttendanceFlags,
  type AttendanceOutcome,
  type PrepChecklist,
  type RaidEvent,
  type RaidEventSignup,
  type RaidRoleType,
} from '@/lib/raid-loot-system'
import { useLiveNow, useRaidSystem } from '@/lib/use-raid-system'
import { cn } from '@/lib/utils'
import { useAuth } from '../auth-provider'
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
  SectionHeader,
} from '../ui'
import { WeeklyRaidTimeline } from '../weekly-raid-timeline'

type SameWeekConflict = {
  eventId: string
  dayLabel: string
  assignmentLabel: string
  severity: 'assigned' | 'bench' | 'pool'
}

function formatShortDayTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('tr-TR', {
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
        'font-mono font-semibold',
        cd.expired ? 'text-rose-400' : cd.urgent ? 'text-amber-300' : accentClass,
        className,
      )}
    >
      {cd.label}
    </span>
  )
}

const OUTCOME_OPTIONS: { value: AttendanceOutcome; label: string; tone: string }[] = [
  { value: 'ATTENDED', label: 'Katıldı (+4p)', tone: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10' },
  { value: 'BENCH_READY', label: 'Bench Hazır (+6p)', tone: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10' },
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
        <Badge className="text-amber-300 border-amber-500/40 bg-amber-500/10">Geç Kaldı (-2p)</Badge>
        <Badge className="text-orange-300 border-orange-500/40 bg-orange-500/10">Eksik Hazırlık (-2p)</Badge>
      </span>
    )
  }
  const found = OUTCOME_OPTIONS.find((o) => o.value === outcome) || OUTCOME_OPTIONS[OUTCOME_OPTIONS.length - 1]
  return <Badge className={found.tone}>{found.label}</Badge>
}

function defaultDateTimeLocal(daysAhead: number, hour = 21) {
  const d = new Date(Date.now() + daysAhead * 86_400_000)
  d.setHours(hour, 0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function RaidSignupView() {
  const { user } = useAuth()
  const toast = useToast()
  const { data, loading, busy, error, postAction } = useRaidSystem()

  const [subTab, setSubTab] = useState<'active' | 'archive'>('active')
  const [showCycle, setShowCycle] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [confirmModalEvent, setConfirmModalEvent] = useState<RaidEvent | null>(null)
  const [declineModalEvent, setDeclineModalEvent] = useState<RaidEvent | null>(null)
  const [archiveModalEvent, setArchiveModalEvent] = useState<RaidEvent | null>(null)
  const [addMemberModalEvent, setAddMemberModalEvent] = useState<RaidEvent | null>(null)

  // Create Raid form state
  const [newRaidId, setNewRaidId] = useState('barrow')
  const [newScheduledAt, setNewScheduledAt] = useState(() => defaultDateTimeLocal(7, 21))
  const [newSignupDeadline, setNewSignupDeadline] = useState(() => defaultDateTimeLocal(4, 21))
  const [newConfirmDeadline, setNewConfirmDeadline] = useState(() => defaultDateTimeLocal(6, 21))
  const [newNotes, setNewNotes] = useState('')

  // Confirm checklist state
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
  const myMain = useMemo(
    () => guildMembers.find((m) => m.username.toLowerCase() === (user?.username || '').toLowerCase()) || null,
    [guildMembers, user?.username],
  )

  const activeEvents = useMemo(
    () =>
      (rs?.events || [])
        .filter((e) => e.status !== 'ARCHIVED')
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    [rs?.events],
  )

  const archivedEvents = useMemo(
    () =>
      (rs?.events || [])
        .filter((e) => e.status === 'ARCHIVED')
        .sort((a, b) => (b.archivedAt || b.scheduledAt).localeCompare(a.archivedAt || a.scheduledAt)),
    [rs?.events],
  )

  useEffect(() => {
    if (subTab === 'active') {
      if (activeEvents.length > 0 && !activeEvents.some((e) => e.id === selectedEventId)) {
        setSelectedEventId(activeEvents[0].id)
      }
    }
  }, [activeEvents, selectedEventId, subTab])

  const selectedEvent = activeEvents.find((e) => e.id === selectedEventId) || activeEvents[0] || null

  const runAction = async (payload: Record<string, unknown>, successMsg: string) => {
    try {
      await postAction(payload)
      toast({ title: 'Başarılı', description: successMsg })
      return true
    } catch (err) {
      toast({
        title: 'İşlem Başarısız',
        description: err instanceof Error ? err.message : 'Bir hata oluştu.',
      })
      return false
    }
  }

  const handleRaidPresetChange = (raidId: string) => {
    setNewRaidId(raidId)
  }

  const handleScheduledChange = (val: string) => {
    setNewScheduledAt(val)
    const dt = new Date(val).getTime()
    if (Number.isFinite(dt)) {
      const toLocal = (ms: number) => {
        const d = new Date(ms)
        const pad = (n: number) => String(n).padStart(2, '0')
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
      }
      setNewSignupDeadline(toLocal(dt - 3 * 86_400_000))
      setNewConfirmDeadline(toLocal(dt - 1 * 86_400_000))
    }
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    const def = RAID_CATALOG.find((r) => r.id === newRaidId) || RAID_CATALOG[0]
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
      `${def.name} (${def.size}-man) imza takvimine eklendi.`,
    )
    if (ok) {
      setCreateOpen(false)
      setNewNotes('')
    }
  }

  const handleSignup = async (ev: RaidEvent) => {
    if (!user) {
      toast({ title: 'Giriş Gerekli', description: 'İmza atmak için oturum açın.' })
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
    const ok = await runAction(
      {
        action: 'finalize_and_archive',
        eventId: archiveModalEvent.id,
        openNextWeek: openNextWeekOnArchive,
      },
      openNextWeekOnArchive
        ? 'Raid arşivlendi, puanlar Devam Takibine işlendi ve gelecek haftanın raidi açıldı!'
        : 'Raid arşivlendi ve puanlar Devam Takibine işlendi!',
    )
    if (ok) {
      setArchiveModalEvent(null)
      setSubTab('archive')
    }
  }

  if (loading) {
    return (
      <Panel className="py-12 text-center text-sm text-muted-foreground">
        Raid kayıt sistemi yükleniyor...
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
        eyebrow="TURX RAID SİSTEMİ · BETA"
        title="Raid Kayıt & Çoklu Roster Yönetimi"
        description="Her raid gün ve saat belirtilerek tek imza havuzuyla açılır. Officerlar gelen imzalardan gerektiği kadar grup (Grup 1, Grup 2, ...) ve Bench oluşturup yayınlar; oyuncular geri sayım bitmeden konfirmasyon verir."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-border bg-[#071422] p-1">
              <button
                onClick={() => setSubTab('active')}
                className={cn(
                  'cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition',
                  subTab === 'active' ? 'bg-neon/15 text-neon' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Aktif Raidler ({activeEvents.length})
              </button>
              <button
                onClick={() => setSubTab('archive')}
                className={cn(
                  'cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition',
                  subTab === 'archive' ? 'bg-gold/15 text-gold' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Arşiv ({archivedEvents.length})
              </button>
            </div>
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
              <GoldButton onClick={() => setCreateOpen(true)}>
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

      {subTab === 'active' && (
        <>
          {activeEvents.length === 0 ? (
            <Panel className="py-12 text-center">
              <CalendarClock className="mx-auto size-10 text-muted-foreground/60" />
              <p className="mt-3 font-display text-lg font-bold text-foreground">Şu an açık raid takvimi yok</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {isOfficer
                  ? 'Yukarıdaki "Yeni Raid Aç" butonuyla Barrow Deeps, Hyjal Summit veya Onyxia takvimi açabilirsiniz.'
                  : 'Officerlar yeni haftanın raidlerini açtığında burada geri sayımla birlikte görünecektir.'}
              </p>
            </Panel>
          ) : (
            <>
              {/* Event Cards Selector */}
              <div className="grid gap-4 md:grid-cols-3">
                {activeEvents.map((ev) => {
                  const isSelected = selectedEvent?.id === ev.id
                  const myEntry = ev.signups.find(
                    (s) => s.username.toLowerCase() === (user?.username || '').toLowerCase(),
                  )
                  const assignedCount = ev.signups.filter((s) => s.assignment !== 'POOL' && s.assignment !== 'BENCH').length
                  const benchCount = ev.signups.filter((s) => s.assignment === 'BENCH').length

                  return (
                    <button
                      key={ev.id}
                      onClick={() => setSelectedEventId(ev.id)}
                      className={cn(
                        'panel cursor-pointer p-4 text-left transition',
                        isSelected
                          ? 'border-neon/60 bg-gradient-to-br from-neon/10 to-transparent shadow-[0_0_24px_rgb(0_242_254/0.14)]'
                          : 'hover:border-gold/40',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-display text-base font-bold text-gold">{ev.raidName}</span>
                            <Badge className="border-gold/30 bg-gold/10 text-gold">{ev.size}-Man</Badge>
                          </div>
                          <p className="mt-1 text-xs text-silver">{formatTrDateTime(ev.scheduledAt)}</p>
                        </div>
                        <Badge
                          className={
                            ev.status === 'ROSTERS_PUBLISHED'
                              ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                              : 'border-neon/40 bg-neon/10 text-neon'
                          }
                        >
                          {ev.status === 'ROSTERS_PUBLISHED' ? 'Roster Yayında' : 'İmza Açık'}
                        </Badge>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                        <div className="rounded-lg border border-border/70 bg-[#071422]/80 px-2.5 py-1.5">
                          <span className="block text-muted-foreground">İmza Kapanış</span>
                          <CountdownValue targetIso={ev.signupDeadline} accentClass="text-neon" />
                        </div>
                        <div className="rounded-lg border border-border/70 bg-[#071422]/80 px-2.5 py-1.5">
                          <span className="block text-muted-foreground">Konfirme Kapanış</span>
                          <CountdownValue targetIso={ev.confirmDeadline} accentClass="text-gold" />
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          <strong className="text-foreground">{ev.signups.length}</strong> imza ·{' '}
                          <strong className="text-foreground">{ev.rosters.length}</strong> grup ({assignedCount} atanmış, {benchCount} bench)
                        </span>
                        {myEntry && (
                          <Badge
                            className={
                              myEntry.confirmStatus === 'CONFIRMED'
                                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                                : myEntry.confirmStatus === 'DECLINED_EXCUSED'
                                  ? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                                  : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                            }
                          >
                            {myEntry.confirmStatus === 'CONFIRMED'
                              ? 'Konfirme'
                              : myEntry.confirmStatus === 'DECLINED_EXCUSED'
                                ? 'İptal'
                                : 'İmzalı'}
                          </Badge>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Selected Raid Event Workspace */}
              {selectedEvent && (
                <EventWorkspace
                  event={selectedEvent}
                  allEvents={rs.events}
                  pointsByUser={pointsByUser}
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
                  onDeleteEvent={() =>
                    void runAction(
                      { action: 'delete_event', eventId: selectedEvent.id },
                      'Raid etkinliği silindi.',
                    )
                  }
                />
              )}
            </>
          )}
        </>
      )}

      {subTab === 'archive' && (
        <div className="space-y-4">
          {archivedEvents.length === 0 ? (
            <Panel className="py-12 text-center">
              <Archive className="mx-auto size-10 text-muted-foreground/60" />
              <p className="mt-3 font-display text-lg font-bold text-foreground">Henüz arşivlenmiş raid yok</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Bir raid tamamlanıp Officer tarafından &quot;Tamamla &amp; Arşivle&quot; dendiğinde tüm katılımcılar (Bench dahil) ve aldıkları puan/cezalar burada saklanır.
              </p>
            </Panel>
          ) : (
            archivedEvents.map((ev) => {
              const archiveGroups: {
                id: string
                name: string
                color: string
                scoredBy?: string
                members: RaidEventSignup[]
              }[] = [
                ...ev.rosters.map((r, rIdx) => ({
                  id: r.id,
                  name: r.name,
                  color: r.color || ROSTER_COLOR_PRESETS[rIdx % ROSTER_COLOR_PRESETS.length].hex,
                  scoredBy: r.scoredBy,
                  members: ev.signups.filter((s) => s.assignment === r.id),
                })),
              ]
              const archivedBench = ev.signups.filter((s) => s.assignment === 'BENCH')
              if (archivedBench.length > 0) {
                archiveGroups.push({
                  id: 'BENCH',
                  name: 'Yedek / Bench',
                  color: '#22d3ee',
                  scoredBy: ev.benchScoredBy,
                  members: archivedBench,
                })
              }
              const knownIds = new Set([...ev.rosters.map((r) => r.id), 'BENCH'])
              const archivedPool = ev.signups.filter((s) => !knownIds.has(s.assignment))
              if (archivedPool.length > 0) {
                archiveGroups.push({
                  id: 'POOL',
                  name: 'Atanmamış Havuz / İptal',
                  color: '#94a3b8',
                  members: archivedPool,
                })
              }

              return (
                <Panel key={ev.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-lg font-bold text-gold">{ev.raidName}</h3>
                        <Badge className="border-gold/30 bg-gold/10 text-gold">{ev.size}-Man</Badge>
                        <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">Arşivlendi</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Raid Tarihi: {formatTrDateTime(ev.scheduledAt)} · Arşivleyen: {ev.archivedBy || '—'}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Toplam Kayıt: <strong className="text-foreground">{ev.signups.length}</strong> · Grup Sayısı:{' '}
                      <strong className="text-foreground">{ev.rosters.length}</strong>
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
                                  const bd = s.pointsBreakdown || calculateSignupPoints(s, ev.size, rules)
                                  return (
                                    <tr key={s.id} className="hover:bg-white/[0.02]">
                                      <td className="py-2 pr-3 font-semibold" style={{ color: CLASS_COLORS[s.wowClass] || '#fff' }}>
                                        <span className="inline-flex items-center gap-1.5">
                                          <span>{s.characterName}</span>
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
                                        {bd.total > 0 ? `+${bd.total}` : bd.total}
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
            })
          )}
        </div>
      )}

      {/* Create Event Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Yeni Raid Takvimi Aç"
        description="Gün ve saat belirleyerek tek imza havuzu açın. İmza sayısına göre birden fazla roster grubu oluşturabilirsiniz."
      >
        <form onSubmit={handleCreateEvent} className="space-y-4">
          <Field label="Raid Seçimi">
            <select
              className={inputClass}
              value={newRaidId}
              onChange={(e) => handleRaidPresetChange(e.target.value)}
            >
              {RAID_CATALOG.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.size}-Man)
                </option>
              ))}
            </select>
          </Field>

          <Field label="Raid Tarih ve Saati" hint="Varsayılan olarak imza kapanışı -3 gün, konfirmasyon kapanışı -1 gün ayarlanır.">
            <input
              type="datetime-local"
              required
              className={inputClass}
              value={newScheduledAt}
              onChange={(e) => handleScheduledChange(e.target.value)}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="İmza Kapanış (Geri Sayım)">
              <input
                type="datetime-local"
                required
                className={inputClass}
                value={newSignupDeadline}
                onChange={(e) => setNewSignupDeadline(e.target.value)}
              />
            </Field>
            <Field label="Konfirmasyon Kapanış">
              <input
                type="datetime-local"
                required
                className={inputClass}
                value={newConfirmDeadline}
                onChange={(e) => setNewConfirmDeadline(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Officer Notu (Opsiyonel)">
            <input
              type="text"
              className={inputClass}
              placeholder="Örn: Onyxia Cloak zorunlu, 20:45 summon hazır."
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <GhostButton type="button" onClick={() => setCreateOpen(false)}>
              İptal
            </GhostButton>
            <GoldButton type="submit" disabled={busy}>
              <CalendarPlus className="size-4" />
              Takvimi Aç
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
        title="Raidi Tamamla, Puanları İşle & Arşivle"
        description="Onayladığınızda bu raid arşive taşınır, tüm katılımcı ve bench puanları Devam Takibine kalıcı olarak eklenir."
      >
        <div className="space-y-4">
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

function EventWorkspace({
  event,
  allEvents,
  pointsByUser,
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
  onDeleteEvent,
}: {
  event: RaidEvent
  allEvents: RaidEvent[]
  pointsByUser: Map<string, number>
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
  rules: {
    raid10: number
    raid20: number
    raid40: number
    signup: number
    confirm: number
    benchReadyEqual: boolean
    benchReadyPoints?: number
    latePenalty: number
    noShowPenalty: number
    excusedDeclinePenalty: number
    missingPrepPenalty: number
  }
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
  onDeleteEvent: () => void
}) {
  const [viewMode, setViewMode] = useState<'rosters' | 'postraid'>('rosters')
  const [editingRosterId, setEditingRosterId] = useState<string | null>(null)
  const [editRosterName, setEditRosterName] = useState('')
  const [editRosterColor, setEditRosterColor] = useState('#d4af37')
  const [postraidGroupFilter, setPostraidGroupFilter] = useState<string>('all')
  const [collapsedPostraidGroups, setCollapsedPostraidGroups] = useState<Record<string, boolean>>({})
  const signupExpired = new Date(event.signupDeadline).getTime() <= Date.now()
  const confirmExpired = new Date(event.confirmDeadline).getTime() <= Date.now()

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
        ? 'Yedek (Bench) — Hazır beklersen tam raid puanı!'
        : event.rosters.find((r) => r.id === myEntry.assignment)?.name || myEntry.assignment

  return (
    <div className="space-y-5">
      {/* Header & Player Action Banner */}
      <Panel className="border-gold/30 bg-gradient-to-br from-[#0d2238] via-[#091829] to-[#071220]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl font-bold text-gold">{event.raidName}</h2>
              <Badge className="border-gold/40 bg-gold/10 text-gold">{event.size}-Man</Badge>
              <Badge
                className={
                  event.status === 'ROSTERS_PUBLISHED'
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                    : 'border-neon/40 bg-neon/10 text-neon'
                }
              >
                {event.status === 'ROSTERS_PUBLISHED' ? 'Roster Yayınlandı — Konfirmasyon Açık' : 'İmza Toplama Aşaması'}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-silver">{formatTrDateTime(event.scheduledAt)}</p>
            {event.notes && <p className="mt-1 text-xs text-amber-200/90">Not: {event.notes}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-neon/25 bg-[#071422] px-3.5 py-2 text-center">
              <p className="text-[10px] tracking-wider text-muted-foreground uppercase">İmza Kapanış</p>
              <CountdownValue targetIso={event.signupDeadline} accentClass="text-neon" className="text-sm font-bold" />
            </div>
            <div className="rounded-xl border border-gold/25 bg-[#071422] px-3.5 py-2 text-center">
              <p className="text-[10px] tracking-wider text-muted-foreground uppercase">Konfirme Kapanış</p>
              <CountdownValue targetIso={event.confirmDeadline} accentClass="text-gold" className="text-sm font-bold" />
            </div>
          </div>
        </div>

        {/* Player CTA Bar */}
        {(() => {
          const myLevel = myMain?.level ?? 0
          const isBelowLevel60 = Boolean(currentUsername && myLevel < 60)
          return (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-[#071422]/85 px-4 py-3">
              <div className="text-xs">
                {myEntry ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">Durumun:</span>
                    <span className="inline-flex items-center gap-1.5">
                      <strong style={{ color: CLASS_COLORS[myEntry.wowClass] }}>{myEntry.characterName}</strong>
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
                    Bu raide henüz imza atmadınız. Tek imza havuzuna kaydolun, Officerlar uygun gruba atasın.
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
                      Raide İmza At (+{rules.signup}p)
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
          )
        })()}

        {/* Officer Toolbar */}
        {isOfficer && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setViewMode('rosters')}
                className={cn(
                  'cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                  viewMode === 'rosters'
                    ? 'border-neon/50 bg-neon/15 text-neon'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                <Layers className="mr-1.5 inline size-3.5" />
                1. Roster Planlama ({event.rosters.length} Grup)
              </button>
              <button
                onClick={() => setViewMode('postraid')}
                className={cn(
                  'cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                  viewMode === 'postraid'
                    ? 'border-gold/50 bg-gold/15 text-gold'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                <Archive className="mr-1.5 inline size-3.5" />
                2. Raid Sonu Puanlama & Arşiv
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <GhostButton disabled={busy} onClick={onOpenAddMember} className="px-3 py-1.5 text-xs">
                <UserPlus className="size-3.5" />
                Üye Ekle
              </GhostButton>
              <GhostButton disabled={busy} onClick={onAddRoster} className="px-3 py-1.5 text-xs">
                <Plus className="size-3.5" />
                Yeni Grup (Roster) Ekle
              </GhostButton>
              <GoldButton disabled={busy} onClick={onPublish} className="px-3 py-1.5 text-xs">
                <Send className="size-3.5" />
                {event.status === 'ROSTERS_PUBLISHED' ? 'Rosterı Güncelle & Duyur' : 'Rosterları Yayınla'}
              </GoldButton>
              <button
                disabled={busy}
                onClick={onDeleteEvent}
                className="cursor-pointer rounded-lg border border-rose-500/30 p-1.5 text-rose-400 hover:bg-rose-500/10"
                title="Raid etkinliğini sil"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        )}
      </Panel>

      {/* Mode 1: Multi-Roster Builder & Display */}
      {viewMode === 'rosters' && (
        <div className="grid gap-5 xl:grid-cols-12">
          {/* Left: Signup Pool + Bench */}
          <div className="space-y-5 xl:col-span-4">
            <Panel>
              <PanelTitle icon={Users} action={<Badge className="border-neon/30 bg-neon/10 text-neon">{poolSignups.length}</Badge>}>
                İmza Havuzu (Atama Bekleyen)
              </PanelTitle>
              {poolSignups.length === 0 ? (
                <p className="text-xs text-muted-foreground">Havuzda bekleyen imza yok.</p>
              ) : (
                <div className="space-y-2">
                  {poolSignups.map((s) => (
                    <SignupRowCard
                      key={s.id}
                      signup={s}
                      event={event}
                      points={pointsByUser.get(s.username.toLowerCase()) ?? 0}
                      conflicts={getSameWeekConflicts(event, allEvents, s.username)}
                      isOfficer={isOfficer}
                      busy={busy}
                      onAssign={onAssign}
                    />
                  ))}
                </div>
              )}
            </Panel>

            <Panel className="border-cyan-500/25">
              <PanelTitle
                icon={UserMinus}
                action={<Badge className="border-cyan-500/30 bg-cyan-500/10 text-cyan-300">{benchSignups.length}</Badge>}
              >
                Yedek / Bench (Hazır = +{rules.benchReadyPoints ?? 6}p)
              </PanelTitle>
              {benchSignups.length === 0 ? (
                <p className="text-xs text-muted-foreground">Henüz bench atanmadı.</p>
              ) : (
                <div className="space-y-2">
                  {benchSignups.map((s) => (
                    <SignupRowCard
                      key={s.id}
                      signup={s}
                      event={event}
                      points={pointsByUser.get(s.username.toLowerCase()) ?? 0}
                      conflicts={getSameWeekConflicts(event, allEvents, s.username)}
                      isOfficer={isOfficer}
                      busy={busy}
                      onAssign={onAssign}
                    />
                  ))}
                </div>
              )}
            </Panel>
          </div>

          {/* Right: Multiple Sub-Rosters (Grup 1, Grup 2, ...) */}
          <div className="space-y-5 xl:col-span-8">
            <div className="grid gap-4 md:grid-cols-2">
              {event.rosters.map((roster, rosterIndex) => {
                const members = event.signups.filter((s) => s.assignment === roster.id)
                const tanks = members.filter((m) => m.role === 'TANK')
                const healers = members.filter((m) => m.role === 'HEALER')
                const dps = members.filter((m) => m.role === 'MELEE' || m.role === 'RANGED')
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
                    className="relative overflow-hidden"
                    style={{ borderColor: `${rosterColor}55` }}
                  >
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 h-1"
                      style={{ backgroundColor: rosterColor }}
                    />
                    <div className="mb-3 border-b border-border/60 pb-2.5">
                      {isEditingThis && isOfficer ? (
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-2">
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
                              className={cn(inputClass, 'h-8 flex-1 px-2.5 py-1 text-xs font-semibold')}
                            />
                            <button
                              type="button"
                              disabled={busy || !editRosterName.trim()}
                              onClick={saveRosterEdit}
                              className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
                              title="Kaydet"
                            >
                              <Check className="size-3.5" />
                              Kaydet
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingRosterId(null)}
                              className="h-8 cursor-pointer rounded-lg border border-border px-2 text-xs text-muted-foreground hover:text-foreground"
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
                                    selected ? 'scale-110 border-white shadow-[0_0_8px_rgba(255,255,255,0.6)]' : 'border-black/40',
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
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="size-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: rosterColor, boxShadow: `0 0 8px ${rosterColor}` }}
                              />
                              <h3
                                className="truncate font-display text-base font-bold"
                                style={{ color: rosterColor }}
                              >
                                {roster.name}
                              </h3>
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
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              {members.length}/{event.size} Oyuncu · <span className="text-emerald-300">{confirmedCount} Konfirme</span>
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5 text-[11px]">
                            <Badge className="border-sky-500/30 bg-sky-500/10 text-sky-300">T:{tanks.length}</Badge>
                            <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">H:{healers.length}</Badge>
                            <Badge className="border-rose-500/30 bg-rose-500/10 text-rose-300">D:{dps.length}</Badge>
                            {isOfficer && event.rosters.length > 1 && (
                              <button
                                disabled={busy}
                                onClick={() => onRemoveRoster(roster.id)}
                                className="ml-1 cursor-pointer rounded p-1 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-400"
                                title="Grubu sil"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {members.length === 0 ? (
                      <p className="py-6 text-center text-xs text-muted-foreground">
                        İmza havuzundan oyuncuları bu gruba atayın.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {[...tanks, ...healers, ...dps].map((s) => (
                          <SignupRowCard
                            key={s.id}
                            signup={s}
                            event={event}
                            points={pointsByUser.get(s.username.toLowerCase()) ?? 0}
                            conflicts={getSameWeekConflicts(event, allEvents, s.username)}
                            isOfficer={isOfficer}
                            busy={busy}
                            onAssign={onAssign}
                          />
                        ))}
                      </div>
                    )}
                  </Panel>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Post-Raid Attendance Processing & Archiving (Officer/GM) — Grouped by Roster */}
      {viewMode === 'postraid' && isOfficer && (() => {
        const scoredRostersCount = event.rosters.filter((r) => Boolean(r.scoredBy)).length
        const allRostersScored = event.rosters.length > 0 && scoredRostersCount === event.rosters.length

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
          {
            id: 'BENCH',
            kind: 'bench' as const,
            name: 'Yedek / Bench',
            color: '#22d3ee',
            scoredBy: event.benchScoredBy,
            members: benchSignups,
          },
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
                        allRostersScored
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                          : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                      }
                    >
                      Onaylanan Gruplar: {scoredRostersCount} / {event.rosters.length}
                    </Badge>
                    <GoldButton disabled={busy} onClick={onOpenArchive}>
                      <Archive className="size-4" />
                      Tamamla, Puanları İşle &amp; Arşivle
                    </GoldButton>
                  </div>
                }
              >
                Raid Sonu Katılım İşleme — {event.raidName}
              </PanelTitle>
              <p className="mb-3 text-xs text-muted-foreground">
                Her officer aşağıdan kendi grubunu seçip oyuncuların puanlamasını ayrı ayrı yapabilir ve{' '}
                <strong className="text-emerald-300">&quot;Grubu Onayla&quot;</strong> ile tamamlayabilir. Tüm gruplar hazır olduğunda raid arşivlenir ve puanlar Devam Takibine işlenir.
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
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: sec.color }}
                      />
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
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                      {sec.kind === 'roster' && sec.members.length > 0 && (
                        <GhostButton
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            onBatchSetOutcome(
                              sec.members.map((m) => ({
                                signupId: m.id,
                                flags:
                                  m.confirmStatus === 'DECLINED_EXCUSED'
                                    ? { excused: true }
                                    : { attended: true },
                              })),
                              `${sec.name} üyeleri "Katıldı (+${rules.raid10}p)" olarak işaretlendi.`,
                            )
                          }
                          className="px-2.5 py-1.5 text-[11px]"
                        >
                          <Check className="size-3.5" />
                          Tümünü Katıldı (+{rules.raid10}p)
                        </GhostButton>
                      )}
                      {sec.kind === 'bench' && sec.members.length > 0 && (
                        <GhostButton
                          type="button"
                          disabled={busy}
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
                      {(sec.kind === 'roster' || sec.kind === 'bench') && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onMarkRosterScored(sec.id, !isScored)}
                          className={cn(
                            'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50',
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
                                <th className="py-2 pr-3">Raid Sonu Durumu (Tik ile Seçin)</th>
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
                                      : s.assignment === 'BENCH'
                                        ? s.confirmStatus === 'CONFIRMED'
                                          ? 'BENCH_READY'
                                          : 'BENCH_ABSENT'
                                        : s.assignment !== 'POOL'
                                          ? 'ATTENDED'
                                          : 'NONE'
                                const activeFlags: AttendanceFlags = s.attendanceFlags
                                  ? s.attendanceFlags
                                  : resolveAttendanceFlags({ attendanceOutcome: defaultOutcome })
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

                                const checkItems: {
                                  key: keyof AttendanceFlags
                                  label: string
                                  pts: string
                                  activeCls: string
                                  accentCls: string
                                }[] = [
                                  {
                                    key: 'attended',
                                    label: 'Katıldı',
                                    pts: `+${rules.raid10}p`,
                                    activeCls: 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200',
                                    accentCls: 'accent-emerald-400',
                                  },
                                  {
                                    key: 'benchReady',
                                    label: 'Yedek',
                                    pts: `+${rules.benchReadyPoints ?? 6}p`,
                                    activeCls: 'border-gold/60 bg-gold/15 text-gold',
                                    accentCls: 'accent-amber-400',
                                  },
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
                                  {
                                    key: 'excused',
                                    label: 'Mazeret',
                                    pts: '0p',
                                    activeCls: 'border-slate-400/60 bg-slate-500/20 text-slate-200',
                                    accentCls: 'accent-slate-400',
                                  },
                                  {
                                    key: 'noShow',
                                    label: 'No-Show',
                                    pts: `${rules.noShowPenalty}p`,
                                    activeCls: 'border-rose-500/60 bg-rose-500/15 text-rose-200',
                                    accentCls: 'accent-rose-500',
                                  },
                                ]

                                return (
                                  <tr key={s.id} className="hover:bg-white/[0.02]">
                                    <td
                                      className="py-2.5 pr-3 font-semibold"
                                      style={{ color: CLASS_COLORS[s.wowClass] || '#fff' }}
                                    >
                                      <span className="inline-flex items-center gap-1.5">
                                        <span>{s.characterName}</span>
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
                                          ? 'Konfirme'
                                          : s.confirmStatus === 'DECLINED_EXCUSED'
                                            ? 'Mazeretli İptal'
                                            : 'Konfirme Yok'}
                                      </Badge>
                                    </td>
                                    <td className="py-2.5 pr-3">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        {checkItems.map((item) => {
                                          const checked = Boolean(activeFlags[item.key])
                                          return (
                                            <label
                                              key={item.key}
                                              className={cn(
                                                'inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold transition select-none',
                                                busy && 'pointer-events-none opacity-50',
                                                checked
                                                  ? item.activeCls
                                                  : 'border-border/60 bg-[#071422]/80 text-muted-foreground hover:border-border hover:text-silver',
                                              )}
                                            >
                                              <input
                                                type="checkbox"
                                                disabled={busy}
                                                checked={checked}
                                                onChange={() => toggleFlag(item.key)}
                                                className={cn('size-3.5 cursor-pointer', item.accentCls)}
                                              />
                                              <span>{item.label}</span>
                                              <span className="font-mono text-[10px] opacity-80">{item.pts}</span>
                                            </label>
                                          )
                                        })}
                                      </div>
                                    </td>
                                    <td className="py-2.5 text-right font-mono font-bold">
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
                                        (İmza/K:{previewBreakdown.signup + previewBreakdown.confirm}, Raid:{previewBreakdown.raid}
                                        {previewBreakdown.penalty < 0 ? `, Ceza:${previewBreakdown.penalty}` : ''})
                                      </span>
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

function SignupRowCard({
  signup,
  event,
  points,
  conflicts,
  isOfficer,
  busy,
  onAssign,
}: {
  signup: RaidEventSignup
  event: RaidEvent
  points: number
  conflicts: SameWeekConflict[]
  isOfficer: boolean
  busy: boolean
  onAssign: (signupId: string, assignment: string) => void
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-[#071422]/90 px-3 py-2 text-xs',
        conflicts.some((c) => c.severity === 'assigned')
          ? 'border-amber-400/50 bg-amber-500/[0.04]'
          : 'border-border/70',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-semibold" style={{ color: CLASS_COLORS[signup.wowClass] || '#fff' }}>
            {signup.characterName}
          </span>
          <PointsPill points={points} />
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground">{signup.role}</span>
          {signup.level < 60 && (
            <span className="rounded bg-amber-500/15 px-1 text-[10px] text-amber-300">Lv{signup.level}</span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span>{signup.spec}</span>
          {signup.confirmStatus === 'CONFIRMED' && <span className="text-emerald-400">✓ Konfirme</span>}
          {signup.confirmStatus === 'DECLINED_EXCUSED' && (
            <span className="text-rose-400">✗ İptal{signup.declineReason ? ` (${signup.declineReason})` : ''}</span>
          )}
          {signup.confirmStatus === 'PENDING' && event.status === 'ROSTERS_PUBLISHED' && (
            <span className="text-amber-300">⏳ Konfirme Bekliyor</span>
          )}
        </div>
        {conflicts.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {conflicts.map((c) => (
              <span
                key={c.eventId}
                title={`Aynı hafta (${event.raidName}) — ${c.dayLabel}: ${c.assignmentLabel}`}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold',
                  c.severity === 'assigned'
                    ? 'border-amber-400/50 bg-amber-500/15 text-amber-200'
                    : c.severity === 'bench'
                      ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200'
                      : 'border-sky-400/35 bg-sky-500/10 text-sky-200',
                )}
              >
                {c.severity === 'pool' ? (
                  <Info className="size-3 shrink-0" />
                ) : (
                  <AlertTriangle className="size-3 shrink-0" />
                )}
                {c.severity === 'assigned'
                  ? `${c.dayLabel} (${c.assignmentLabel}) atanmış`
                  : c.severity === 'bench'
                    ? `${c.dayLabel} (Bench)`
                    : `${c.dayLabel} de imzalı`}
              </span>
            ))}
          </div>
        )}
      </div>

      {isOfficer && (
        <select
          disabled={busy}
          value={signup.assignment}
          onChange={(e) => onAssign(signup.id, e.target.value)}
          className="rounded-md border border-input bg-[#0b1b2d] px-2 py-1 text-[11px] text-foreground focus:border-neon focus:outline-none"
        >
          <option value="POOL">Havuz</option>
          {event.rosters.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
          <option value="BENCH">Bench (Yedek)</option>
        </select>
      )}
    </div>
  )
}
