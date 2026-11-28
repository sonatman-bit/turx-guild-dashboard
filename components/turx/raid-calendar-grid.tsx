'use client'

import {
  Archive,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCcw,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { isGuildMeetingEvent, type RaidEvent } from '@/lib/raid-loot-system'
import { cn } from '@/lib/utils'

const WEEKDAYS_MON_FIRST = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'] as const

const MONTH_NAMES_TR = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
] as const

const MONTH_SHORT_TR = [
  'Oca',
  'Şub',
  'Mar',
  'Nis',
  'May',
  'Haz',
  'Tem',
  'Ağu',
  'Eyl',
  'Eki',
  'Kas',
  'Ara',
] as const

function trDateKey(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function trTimeLabel(iso: string): string {
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      timeZone: 'Europe/Istanbul',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

function parseKey(key: string): { y: number; m: number; d: number } {
  const [y, m, d] = key.split('-').map(Number)
  return { y, m, d }
}

function keyFromUtcDate(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDaysUtc(d: Date, days: number): Date {
  const next = new Date(d.getTime())
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

/** Monday = 0, Tuesday = 1, ..., Sunday = 6 */
function mondayIndexUtc(d: Date): number {
  return (d.getUTCDay() + 6) % 7
}

function shortEventTitle(ev: RaidEvent): string {
  if (isGuildMeetingEvent(ev.raidId)) return 'Toplantı'
  if (ev.raidId === 'barrow') return 'Barrow'
  if (ev.raidId === 'hyjal') return 'Hyjal'
  if (ev.raidId === 'onyxia') return 'Onyxia'
  return ev.raidName.slice(0, 14)
}

export type CalendarViewMode = '5weeks' | 'month'

type CalendarDayCell = {
  key: string
  dayNum: number
  monthIndex: number
  year: number
  inCurrentMonth: boolean
  isToday: boolean
  isPastDay: boolean
}

export function RaidCalendarGrid({
  events,
  selectedEventId,
  onSelectEvent,
  isOfficer = false,
  onQuickCreateForDate,
  raidTypeFilter = 'all',
  onRaidTypeFilterChange,
}: {
  events: RaidEvent[]
  selectedEventId: string | null
  onSelectEvent: (event: RaidEvent) => void
  isOfficer?: boolean
  onQuickCreateForDate?: (dateKey: string) => void
  raidTypeFilter?: string
  onRaidTypeFilterChange?: (raidId: string) => void
}) {
  const todayKey = useMemo(() => trDateKey(new Date()), [])
  const todayParts = useMemo(() => parseKey(todayKey), [todayKey])

  const [mode, setMode] = useState<CalendarViewMode>('5weeks')
  /** Offset in weeks for '5weeks' mode (0 = -2w .. current .. +2w) */
  const [weekShift, setWeekShift] = useState(0)
  /** Month cursor for 'month' mode */
  const [monthCursor, setMonthCursor] = useState<{ y: number; m: number }>(() => ({
    y: todayParts.y,
    m: todayParts.m,
  }))

  const filteredEvents = useMemo(
    () =>
      raidTypeFilter === 'all'
        ? events
        : events.filter((e) => e.raidId === raidTypeFilter),
    [events, raidTypeFilter],
  )

  const eventsByDate = useMemo(() => {
    const map = new Map<string, RaidEvent[]>()
    for (const ev of filteredEvents) {
      const k = trDateKey(ev.scheduledAt)
      const list = map.get(k) || []
      list.push(ev)
      map.set(k, list)
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    }
    return map
  }, [filteredEvents])

  const { rows, rangeTitle, weekLabels } = useMemo(() => {
    const todayUtc = new Date(Date.UTC(todayParts.y, todayParts.m - 1, todayParts.d))
    const thisMonday = addDaysUtc(todayUtc, -mondayIndexUtc(todayUtc))

    if (mode === '5weeks') {
      const startMonday = addDaysUtc(thisMonday, (-2 + weekShift) * 7)
      const builtRows: CalendarDayCell[][] = []
      const labels: string[] = []

      for (let w = 0; w < 5; w += 1) {
        const rel = w - 2 + weekShift
        labels.push(
          rel === 0 ? 'Bu Hafta' : rel > 0 ? `+${rel} Hafta` : `${rel} Hafta`,
        )
        const weekRow: CalendarDayCell[] = []
        for (let d = 0; d < 7; d += 1) {
          const cur = addDaysUtc(startMonday, w * 7 + d)
          const key = keyFromUtcDate(cur)
          weekRow.push({
            key,
            dayNum: cur.getUTCDate(),
            monthIndex: cur.getUTCMonth(),
            year: cur.getUTCFullYear(),
            inCurrentMonth: true,
            isToday: key === todayKey,
            isPastDay: key < todayKey,
          })
        }
        builtRows.push(weekRow)
      }

      const first = builtRows[0][0]
      const last = builtRows[4][6]
      const title =
        first.monthIndex === last.monthIndex
          ? `${first.dayNum} – ${last.dayNum} ${MONTH_NAMES_TR[last.monthIndex]} ${last.year}`
          : `${first.dayNum} ${MONTH_SHORT_TR[first.monthIndex]} – ${last.dayNum} ${MONTH_SHORT_TR[last.monthIndex]} ${last.year}`

      return { rows: builtRows, rangeTitle: title, weekLabels: labels }
    }

    // Full month mode (Monday-first)
    const firstOfMonth = new Date(Date.UTC(monthCursor.y, monthCursor.m - 1, 1))
    const lastOfMonth = new Date(Date.UTC(monthCursor.y, monthCursor.m, 0))
    const gridStart = addDaysUtc(firstOfMonth, -mondayIndexUtc(firstOfMonth))
    const gridEnd = addDaysUtc(lastOfMonth, 6 - mondayIndexUtc(lastOfMonth))

    const builtRows: CalendarDayCell[][] = []
    const labels: string[] = []
    let cursor = gridStart
    while (cursor.getTime() <= gridEnd.getTime()) {
      const diffWeeks = Math.round((cursor.getTime() - thisMonday.getTime()) / (7 * 86_400_000))
      labels.push(
        diffWeeks === 0
          ? 'Bu Hafta'
          : diffWeeks > 0
            ? `+${diffWeeks}H`
            : `${diffWeeks}H`,
      )
      const weekRow: CalendarDayCell[] = []
      for (let d = 0; d < 7; d += 1) {
        const cur = addDaysUtc(cursor, d)
        const key = keyFromUtcDate(cur)
        weekRow.push({
          key,
          dayNum: cur.getUTCDate(),
          monthIndex: cur.getUTCMonth(),
          year: cur.getUTCFullYear(),
          inCurrentMonth: cur.getUTCMonth() === monthCursor.m - 1 && cur.getUTCFullYear() === monthCursor.y,
          isToday: key === todayKey,
          isPastDay: key < todayKey,
        })
      }
      builtRows.push(weekRow)
      cursor = addDaysUtc(cursor, 7)
    }

    return {
      rows: builtRows,
      rangeTitle: `${MONTH_NAMES_TR[monthCursor.m - 1]} ${monthCursor.y}`,
      weekLabels: labels,
    }
  }, [mode, weekShift, monthCursor, todayParts, todayKey])

  const stepPrev = () => {
    if (mode === '5weeks') {
      setWeekShift((w) => w - 1)
    } else {
      setMonthCursor((c) => (c.m === 1 ? { y: c.y - 1, m: 12 } : { y: c.y, m: c.m - 1 }))
    }
  }

  const stepNext = () => {
    if (mode === '5weeks') {
      setWeekShift((w) => w + 1)
    } else {
      setMonthCursor((c) => (c.m === 12 ? { y: c.y + 1, m: 1 } : { y: c.y, m: c.m + 1 }))
    }
  }

  const resetToday = () => {
    setWeekShift(0)
    setMonthCursor({ y: todayParts.y, m: todayParts.m })
  }

  const nowMs = Date.now()

  const FILTER_CHIPS = [
    { id: 'all', label: 'Tümü' },
    { id: 'guild-meeting', label: 'Toplantı' },
    { id: 'barrow', label: 'Barrow 10m' },
    { id: 'hyjal', label: 'Hyjal 20m' },
    { id: 'onyxia', label: 'Onyxia 40m' },
  ]

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-[#081728] via-[#071422] to-[#06111e] shadow-xl">
      {/* Top Toolbar: Range Navigation + Mode Switcher + Raid Filters */}
      <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-border/80 bg-[#06101c] p-0.5">
            <button
              type="button"
              onClick={stepPrev}
              className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
              title={mode === '5weeks' ? '1 hafta geri' : 'Önceki ay'}
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-[165px] px-2 text-center font-display text-sm font-bold text-gold">
              {rangeTitle}
            </span>
            <button
              type="button"
              onClick={stepNext}
              className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
              title={mode === '5weeks' ? '1 hafta ileri' : 'Sonraki ay'}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={resetToday}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border/75 bg-[#06101c] px-2.5 py-1.5 text-[11px] font-semibold text-silver transition hover:border-gold/50 hover:text-gold"
          >
            <RotateCcw className="size-3" /> Bugün
          </button>

          <div className="inline-flex rounded-lg border border-border/80 bg-[#06101c] p-0.5 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setMode('5weeks')}
              className={cn(
                'inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 transition',
                mode === '5weeks'
                  ? 'bg-emerald-500/20 text-emerald-300 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.4)]'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <CalendarDays className="size-3.5" />
              -2 / +2 Hafta
            </button>
            <button
              type="button"
              onClick={() => setMode('month')}
              className={cn(
                'inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 transition',
                mode === 'month'
                  ? 'bg-gold/20 text-gold shadow-[inset_0_0_0_1px_rgba(212,175,55,0.4)]'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Calendar className="size-3.5" />
              Aylık
            </button>
          </div>
        </div>

        {/* Filter Chips & Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {onRaidTypeFilterChange && (
            <div className="flex flex-wrap items-center gap-1">
              {FILTER_CHIPS.map((chip) => {
                const active = raidTypeFilter === chip.id
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => onRaidTypeFilterChange(chip.id)}
                    className={cn(
                      'cursor-pointer rounded-md border px-2 py-1 text-[11px] font-semibold transition',
                      active
                        ? 'border-neon/60 bg-neon/15 text-neon'
                        : 'border-border/60 bg-[#06101c] text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {chip.label}
                  </button>
                )
              })}
            </div>
          )}

          <div className="flex items-center gap-3 text-[10px] font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 text-emerald-300">
              <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
              Gelecek / Aktif
            </span>
            <span className="inline-flex items-center gap-1.5 text-rose-300/80">
              <span className="size-2 rounded-full bg-rose-500/70" />
              Geçmiş / Arşiv
            </span>
          </div>
        </div>
      </div>

      {/* Calendar Grid (Monday-First: Pzt → Paz) */}
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          {/* Weekday Header Row */}
          <div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))] border-b border-border/60 bg-[#06101c]/90 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            <div className="flex items-center justify-center border-r border-border/50 px-2 py-2 text-[10px] text-muted-foreground/70">
              Hafta
            </div>
            {WEEKDAYS_MON_FIRST.map((dayName, idx) => (
              <div
                key={dayName}
                className={cn(
                  'px-2.5 py-2 text-center',
                  idx >= 5 ? 'text-gold/75' : 'text-silver/85',
                )}
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* Week Rows */}
          <div className="divide-y divide-border/45">
            {rows.map((week, wIdx) => {
              const isCurrentWeekRow = week.some((c) => c.isToday)
              const wLabel = weekLabels[wIdx] || ''

              return (
                <div
                  key={week[0].key}
                  className={cn(
                    'grid grid-cols-[72px_repeat(7,minmax(0,1fr))]',
                    isCurrentWeekRow && 'bg-gold/[0.03]',
                  )}
                >
                  {/* Week Offset Label Column */}
                  <div
                    className={cn(
                      'flex flex-col items-center justify-center border-r border-border/50 px-1.5 py-2 text-center',
                      isCurrentWeekRow
                        ? 'border-l-2 border-l-gold bg-gold/[0.08]'
                        : 'bg-[#06101c]/50',
                    )}
                  >
                    <span
                      className={cn(
                        'font-mono text-[10px] leading-tight font-bold',
                        isCurrentWeekRow ? 'text-gold' : 'text-muted-foreground/80',
                      )}
                    >
                      {wLabel}
                    </span>
                  </div>

                  {/* 7 Day Boxes (Pzt..Paz) */}
                  {week.map((cell) => {
                    const dayEvents = eventsByDate.get(cell.key) || []
                    return (
                      <div
                        key={cell.key}
                        className={cn(
                          'group relative flex min-h-[96px] flex-col gap-1 border-r border-border/35 p-1.5 transition last:border-r-0',
                          !cell.inCurrentMonth && 'bg-[#040a13]/70 opacity-40',
                          cell.isToday && 'bg-gold/[0.07] ring-1 ring-inset ring-gold/45',
                          cell.isPastDay && cell.inCurrentMonth && !cell.isToday && 'bg-[#050d18]/65',
                        )}
                      >
                        {/* Day Number Header */}
                        <div className="flex items-center justify-between gap-1 px-0.5">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 font-mono text-[11px] font-bold',
                              cell.isToday
                                ? 'text-gold'
                                : cell.isPastDay
                                  ? 'text-muted-foreground/65'
                                  : 'text-silver/90',
                            )}
                          >
                            <span>{cell.dayNum}</span>
                            {(cell.dayNum === 1 || (mode === '5weeks' && cell.isToday)) && (
                              <span className="font-sans text-[10px] font-semibold opacity-80">
                                {MONTH_SHORT_TR[cell.monthIndex]}
                              </span>
                            )}
                          </span>

                          <div className="flex items-center gap-1">
                            {cell.isToday && (
                              <span className="rounded bg-gold/25 px-1 py-0.2 text-[9px] font-black tracking-wide text-gold uppercase">
                                Bugün
                              </span>
                            )}
                            {isOfficer && !cell.isPastDay && onQuickCreateForDate && (
                              <button
                                type="button"
                                onClick={() => onQuickCreateForDate(cell.key)}
                                title={`${cell.dayNum} ${MONTH_NAMES_TR[cell.monthIndex]} tarihine yeni raid aç`}
                                className="cursor-pointer rounded border border-emerald-400/40 bg-emerald-500/15 p-0.5 text-emerald-300 opacity-0 transition group-hover:opacity-100 hover:bg-emerald-500/30"
                              >
                                <Plus className="size-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Events in this Day Cell */}
                        <div className="flex flex-1 flex-col gap-1">
                          {dayEvents.map((ev) => {
                            const isPastOrArchived =
                              ev.status === 'ARCHIVED' || new Date(ev.scheduledAt).getTime() < nowMs
                            const isSelected = selectedEventId === ev.id
                            const timeStr = trTimeLabel(ev.scheduledAt)
                            const title = shortEventTitle(ev)

                            return (
                              <button
                                key={ev.id}
                                type="button"
                                onClick={() => onSelectEvent(ev)}
                                title={`${ev.raidName} · ${timeStr} TR (${ev.signups.length} kayıt)${
                                  isPastOrArchived ? ' — Geçmiş / Arşiv' : ' — Aktif / Gelecek'
                                }`}
                                className={cn(
                                  'w-full cursor-pointer rounded-lg border px-2 py-1.5 text-left transition-all',
                                  isPastOrArchived
                                    ? 'border-rose-500/35 bg-rose-950/40 text-rose-200/75 opacity-75 backdrop-blur-[1px] hover:border-rose-400/55 hover:opacity-100'
                                    : 'border-emerald-400/75 bg-gradient-to-r from-emerald-500/20 via-emerald-500/15 to-teal-500/15 text-emerald-100 shadow-[0_0_16px_rgba(16,185,129,0.32)] hover:border-emerald-300 hover:shadow-[0_0_22px_rgba(16,185,129,0.5)]',
                                  isSelected &&
                                    (isPastOrArchived
                                      ? 'opacity-100 ring-2 ring-rose-400/80 shadow-[0_0_14px_rgba(244,63,94,0.35)]'
                                      : 'ring-2 ring-gold shadow-[0_0_22px_rgba(52,211,153,0.55)]'),
                                )}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="flex min-w-0 items-center gap-1">
                                    {isPastOrArchived ? (
                                      <Archive className="size-2.5 shrink-0 text-rose-400/80" />
                                    ) : (
                                      <span className="relative flex size-2 shrink-0">
                                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                                        <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                                      </span>
                                    )}
                                    <span className="truncate text-[11px] font-bold leading-tight">
                                      {title}
                                    </span>
                                  </span>
                                  <span
                                    className={cn(
                                      'shrink-0 rounded px-1 font-mono text-[9px] font-bold',
                                      isPastOrArchived
                                        ? 'bg-rose-500/20 text-rose-300'
                                        : 'bg-emerald-400/25 text-emerald-200',
                                    )}
                                  >
                                    {ev.signups.length}
                                  </span>
                                </div>
                                <div className="mt-0.5 flex items-center justify-between gap-1 font-mono text-[9px] opacity-85">
                                  <span>{timeStr}</span>
                                  <span>
                                    {isPastOrArchived
                                      ? ev.status === 'ARCHIVED'
                                        ? 'Arşiv'
                                        : 'Geçti'
                                      : isGuildMeetingEvent(ev.raidId)
                                        ? 'Guild'
                                        : `${ev.size}m`}
                                  </span>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
