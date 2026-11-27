'use client'

import {
  AlertTriangle,
  Ban,
  CalendarPlus,
  CheckCheck,
  Clock,
  Lock,
  PenLine,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Swords,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { DEFAULT_POINT_RULES, type PointRules } from '@/lib/raid-loot-system'
import { cn } from '@/lib/utils'
import { Badge } from './ui'

const DAYS_TR = [
  { short: 'Pzt', full: 'Pazartesi' },
  { short: 'Sal', full: 'Salı' },
  { short: 'Çar', full: 'Çarşamba' },
  { short: 'Per', full: 'Perşembe' },
  { short: 'Cum', full: 'Cuma' },
  { short: 'Cmt', full: 'Cumartesi' },
  { short: 'Paz', full: 'Pazar' },
] as const

type PhaseId = 'signup' | 'roster' | 'confirm' | 'lock' | 'raid'

interface TimelineStop {
  offset: number // 7 down to 0
  tLabel: string
  phase: PhaseId
  isMilestone: boolean
  title: string
  sublabel: string
  timeBadge?: string
}

const TIMELINE_STOPS: TimelineStop[] = [
  {
    offset: 7,
    tLabel: 'T-7',
    phase: 'signup',
    isMilestone: true,
    title: 'AÇILIŞ',
    sublabel: 'En az 7 gün önce',
    timeBadge: 'İmza Başlar',
  },
  {
    offset: 6,
    tLabel: 'T-6',
    phase: 'signup',
    isMilestone: false,
    title: 'İmza Açık',
    sublabel: 'Tek tık kayıt',
  },
  {
    offset: 5,
    tLabel: 'T-5',
    phase: 'signup',
    isMilestone: false,
    title: 'İmza Açık',
    sublabel: 'Tek havuz',
  },
  {
    offset: 4,
    tLabel: 'T-4',
    phase: 'signup',
    isMilestone: false,
    title: 'Son 24s İmza',
    sublabel: 'İmzalar toplanır',
  },
  {
    offset: 3,
    tLabel: 'T-3',
    phase: 'roster',
    isMilestone: true,
    title: 'ROSTER',
    sublabel: 'İmza kapanır',
    timeBadge: 'Hızlı Yayın',
  },
  {
    offset: 2,
    tLabel: 'T-2',
    phase: 'confirm',
    isMilestone: false,
    title: 'Onay Açık',
    sublabel: 'Konfirmasyon',
  },
  {
    offset: 1,
    tLabel: 'T-1',
    phase: 'lock',
    isMilestone: true,
    title: 'KİLİT',
    sublabel: '24 saat kala',
    timeBadge: 'Her Şey Kilit',
  },
  {
    offset: 0,
    tLabel: 'T-0',
    phase: 'raid',
    isMilestone: true,
    title: 'RAID!',
    sublabel: '20:45 Alanda',
    timeBadge: '21:00 Pull',
  },
]

function dayForOffset(raidDayIndex: number, offset: number) {
  return DAYS_TR[(raidDayIndex - offset + 7) % 7]
}

export function WeeklyRaidTimeline({
  rules = DEFAULT_POINT_RULES,
  compact = false,
}: {
  rules?: PointRules
  compact?: boolean
}) {
  // Default: Çarşamba (index 2 — EU WoW reset & Phase 1 launch day)
  const [raidDayIndex, setRaidDayIndex] = useState(2)
  const [activePhase, setActivePhase] = useState<PhaseId | null>(null)

  const raidDay = DAYS_TR[raidDayIndex]
  const rosterDay = dayForOffset(raidDayIndex, 3)
  const lockDay = dayForOffset(raidDayIndex, 1)

  const isHighlighted = (phase: PhaseId) => activePhase === null || activePhase === phase
  const togglePhase = (phase: PhaseId) => setActivePhase((cur) => (cur === phase ? null : phase))

  const stageCards: {
    id: PhaseId
    step: string
    window: string
    title: string
    icon: React.ComponentType<{ className?: string }>
    accentBorder: string
    accentTop: string
    accentText: string
    accentBg: string
    pillText: string
    bullets: { icon: React.ComponentType<{ className?: string }>; text: string; highlight?: string }[]
  }[] = [
    {
      id: 'signup',
      step: '01',
      window: `T-7 → T-3 (${raidDay.short} → ${rosterDay.short})`,
      title: 'İmza Dönemi',
      icon: PenLine,
      accentBorder: 'border-neon/35 hover:border-neon/70',
      accentTop: 'from-neon via-cyan-400 to-sky-400',
      accentText: 'text-neon',
      accentBg: 'bg-neon/10 border-neon/30 text-neon',
      pillText: `+${rules.signup}p`,
      bullets: [
        { icon: CalendarPlus, text: 'En az 7 gün önce açılır' },
        { icon: Sparkles, text: 'Tek havuzda tek tık imza' },
        { icon: Clock, text: '3 gün kalaya kadar açık' },
      ],
    },
    {
      id: 'roster',
      step: '02',
      window: `T-3 (${rosterDay.short} · 21:00)`,
      title: 'Hızlı Roster Yayını',
      icon: Zap,
      accentBorder: 'border-sky-400/35 hover:border-sky-400/70',
      accentTop: 'from-sky-400 via-blue-400 to-indigo-400',
      accentText: 'text-sky-300',
      accentBg: 'bg-sky-500/12 border-sky-400/35 text-sky-300',
      pillText: 'Anında Yayın',
      bullets: [
        { icon: Send, text: 'İmza kapanır kapanmaz roster açıklanır' },
        { icon: Sparkles, text: 'Grup 1, 2, 3... + Bench' },
        { icon: ShieldCheck, text: `Bench hazır = +${rules.benchReadyPoints ?? 6}p` },
      ],
    },
    {
      id: 'confirm',
      step: '03',
      window: `T-3 → T-1 (${rosterDay.short} → ${lockDay.short})`,
      title: 'Konfirmasyon',
      icon: CheckCheck,
      accentBorder: 'border-gold/40 hover:border-gold/80',
      accentTop: 'from-gold via-amber-400 to-yellow-300',
      accentText: 'text-gold',
      accentBg: 'bg-gold/12 border-gold/35 text-gold',
      pillText: `+${rules.confirm}p`,
      bullets: [
        { icon: CheckCheck, text: 'Son 24 saate kadar onay ver' },
        { icon: ShieldCheck, text: 'Bench dahil herkes onaylar' },
        { icon: AlertTriangle, text: 'Mazeretli iptal bu sürede', highlight: `${rules.excusedDeclinePenalty}p` },
      ],
    },
    {
      id: 'lock',
      step: '04',
      window: `T-1 → T-0 (${lockDay.short} 21:00 → ${raidDay.short})`,
      title: '24s Kilit & Raid',
      icon: Lock,
      accentBorder: 'border-rose-400/35 hover:border-emerald-400/70',
      accentTop: 'from-rose-400 via-amber-400 to-emerald-400',
      accentText: 'text-rose-300',
      accentBg: 'bg-rose-500/12 border-rose-400/35 text-rose-300',
      pillText: 'KİLİT',
      bullets: [
        { icon: Lock, text: '24 saat kala her şey kilitlenir' },
        { icon: Swords, text: '20:45 Alanda (-15 dk) · 21:00 Pull' },
        { icon: Sparkles, text: 'Consumables&Buffs · %100 Repair&Train · Boss Taktikleri' },
      ],
    },
  ]

  return (
    <div className="space-y-5">
      {/* Interactive Raid Day Picker Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-[#06111e]/90 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-neon/35 bg-neon/10 text-neon">
            <RefreshCw className="size-4" />
          </span>
          <div>
            <p className="text-xs font-bold tracking-wide text-foreground">
              Örnek Raid Günü Seç:{' '}
              <span className="text-emerald-300">{raidDay.full} · 21:00</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              Gün seçerek 7 günlük döngünün takvimde nasıl işlediğini anında görün
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Örnek raid günü seçimi">
          {DAYS_TR.map((d, idx) => {
            const selected = idx === raidDayIndex
            return (
              <button
                key={d.short}
                type="button"
                onClick={() => setRaidDayIndex(idx)}
                className={cn(
                  'cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-bold transition',
                  selected
                    ? 'border border-emerald-400/60 bg-emerald-500/20 text-emerald-200 shadow-[0_0_14px_rgb(62_224_127/0.25)]'
                    : 'border border-border/60 bg-[#0b1b2d]/80 text-muted-foreground hover:border-neon/40 hover:text-foreground',
                )}
              >
                {d.short}
              </button>
            )
          })}
        </div>
      </div>

      {/* DESKTOP GRAPHICAL 8-POINT WEEKLY TIMELINE (md+) */}
      <div className="hidden rounded-2xl border border-border/80 bg-gradient-to-b from-[#081728] via-[#06111e] to-[#081728] p-5 shadow-inner md:block">
        {/* Layer 1: Proportional Phase Duration Ribbons */}
        <div className="relative mb-5 h-11">
          {/* Phase 1 Ribbon: T-7 -> T-3 (4 days = 50% width, centered from 6.25% to 56.25%) */}
          <button
            type="button"
            onClick={() => togglePhase('signup')}
            onMouseEnter={() => setActivePhase('signup')}
            onMouseLeave={() => setActivePhase(null)}
            className={cn(
              'absolute top-0 left-[6.25%] flex h-9 w-[50%] cursor-pointer items-center justify-between gap-2 rounded-full border border-neon/45 bg-gradient-to-r from-neon/20 via-cyan-500/15 to-sky-500/20 px-3.5 text-left transition-all',
              isHighlighted('signup')
                ? 'opacity-100 shadow-[0_0_22px_rgb(0_242_254/0.18)]'
                : 'opacity-35',
            )}
          >
            <span className="flex items-center gap-1.5 truncate text-[11px] font-bold tracking-wide text-neon uppercase">
              <PenLine className="size-3.5 shrink-0" />
              <span className="truncate">İmza Toplama · 4 Gün</span>
            </span>
            <span className="shrink-0 rounded-full bg-neon/20 px-2 py-0.5 font-mono text-[10px] font-bold text-neon">
              +{rules.signup}p
            </span>
          </button>

          {/* Phase 2 Ribbon: T-3 -> T-1 (2 days = 25% width, from 56.25% to 81.25%) */}
          <button
            type="button"
            onClick={() => togglePhase('confirm')}
            onMouseEnter={() => setActivePhase('confirm')}
            onMouseLeave={() => setActivePhase(null)}
            className={cn(
              'absolute top-0 left-[56.25%] flex h-9 w-[25%] cursor-pointer items-center justify-between gap-1 rounded-full border border-gold/50 bg-gradient-to-r from-sky-500/15 via-gold/20 to-amber-500/20 px-2.5 text-left transition-all lg:px-3',
              isHighlighted('confirm') || activePhase === 'roster'
                ? 'opacity-100 shadow-[0_0_22px_rgb(212_175_55/0.18)]'
                : 'opacity-35',
            )}
          >
            <span className="flex items-center gap-1 truncate text-[11px] font-bold tracking-wide text-gold uppercase">
              <CheckCheck className="size-3.5 shrink-0" />
              <span className="truncate">
                Konfirmasyon<span className="hidden xl:inline"> · 48s</span>
              </span>
            </span>
            <span className="shrink-0 rounded-full bg-gold/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-gold">
              +{rules.confirm}p
            </span>
          </button>

          {/* Phase 3 Ribbon: T-1 -> T-0 (24h = 12.5% width, from 81.25% to 93.75%) */}
          <button
            type="button"
            onClick={() => togglePhase('lock')}
            onMouseEnter={() => setActivePhase('lock')}
            onMouseLeave={() => setActivePhase(null)}
            className={cn(
              'absolute top-0 left-[81.25%] flex h-9 w-[12.5%] cursor-pointer items-center justify-center gap-1 rounded-full border border-rose-400/55 bg-gradient-to-r from-rose-500/25 to-amber-500/20 px-1.5 transition-all',
              isHighlighted('lock') || activePhase === 'raid'
                ? 'opacity-100 shadow-[0_0_18px_rgb(244_63_94/0.25)]'
                : 'opacity-35',
            )}
          >
            <Lock className="size-3 shrink-0 text-rose-300" />
            <span className="truncate text-[10px] font-extrabold tracking-wide text-rose-200 uppercase">
              24s<span className="hidden xl:inline"> Kilit</span>
            </span>
          </button>
        </div>

        {/* Layer 2: Connected 8-Day Track with Glowing Rails & Nodes */}
        <div className="relative">
          {/* Background Base Rail */}
          <div className="pointer-events-none absolute top-[54px] right-[6.25%] left-[6.25%] h-1.5 rounded-full bg-white/5" />

          {/* Glowing Colored Rail Segments */}
          <div
            className={cn(
              'pointer-events-none absolute top-[54px] left-[6.25%] h-1.5 w-[50%] rounded-l-full bg-gradient-to-r from-neon via-cyan-400 to-sky-400 transition-opacity',
              isHighlighted('signup') ? 'opacity-95 shadow-[0_0_14px_rgb(0_242_254/0.55)]' : 'opacity-25',
            )}
          />
          <div
            className={cn(
              'pointer-events-none absolute top-[54px] left-[56.25%] h-1.5 w-[25%] bg-gradient-to-r from-sky-400 via-gold to-amber-400 transition-opacity',
              isHighlighted('confirm') || activePhase === 'roster'
                ? 'opacity-95 shadow-[0_0_14px_rgb(212_175_55/0.55)]'
                : 'opacity-25',
            )}
          />
          <div
            className={cn(
              'pointer-events-none absolute top-[54px] left-[81.25%] h-1.5 w-[12.5%] rounded-r-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-opacity',
              isHighlighted('lock') || activePhase === 'raid'
                ? 'opacity-95 shadow-[0_0_14px_rgb(244_63_94/0.55)]'
                : 'opacity-25',
            )}
          />

          {/* 8-Column Day Stops */}
          <div className="relative z-10 grid grid-cols-8 gap-1">
            {TIMELINE_STOPS.map((stop) => {
              const day = dayForOffset(raidDayIndex, stop.offset)
              const active =
                isHighlighted(stop.phase) ||
                (stop.phase === 'roster' && activePhase === 'confirm') ||
                (stop.phase === 'raid' && activePhase === 'lock')

              const nodeColors =
                stop.phase === 'signup'
                  ? {
                      ring: 'border-neon bg-[#071b2b] text-neon shadow-[0_0_18px_rgb(0_242_254/0.45)]',
                      dot: 'border-neon/80 bg-[#071b2b] shadow-[0_0_10px_rgb(0_242_254/0.5)]',
                      dayText: 'text-neon',
                      badge: 'border-neon/35 bg-neon/10 text-neon',
                    }
                  : stop.phase === 'roster'
                    ? {
                        ring: 'border-sky-400 bg-[#071c30] text-sky-300 shadow-[0_0_20px_rgb(56_189_248/0.5)]',
                        dot: 'border-sky-400 bg-[#071c30]',
                        dayText: 'text-sky-300',
                        badge: 'border-sky-400/40 bg-sky-500/15 text-sky-200',
                      }
                    : stop.phase === 'confirm'
                      ? {
                          ring: 'border-gold bg-[#1e1a0b] text-gold shadow-[0_0_18px_rgb(212_175_55/0.45)]',
                          dot: 'border-gold/90 bg-[#1e1a0b] shadow-[0_0_10px_rgb(212_175_55/0.5)]',
                          dayText: 'text-gold',
                          badge: 'border-gold/35 bg-gold/10 text-gold',
                        }
                      : stop.phase === 'lock'
                        ? {
                            ring: 'border-rose-400 bg-[#250e18] text-rose-300 shadow-[0_0_20px_rgb(244_63_94/0.55)]',
                            dot: 'border-rose-400 bg-[#250e18]',
                            dayText: 'text-rose-300',
                            badge: 'border-rose-400/45 bg-rose-500/15 text-rose-200',
                          }
                        : {
                            ring: 'border-emerald-400 bg-[#07241a] text-emerald-300 shadow-[0_0_24px_rgb(62_224_127/0.6)]',
                            dot: 'border-emerald-400 bg-[#07241a]',
                            dayText: 'text-emerald-300',
                            badge: 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200',
                          }

              const MilestoneIcon =
                stop.offset === 7
                  ? CalendarPlus
                  : stop.offset === 3
                    ? Zap
                    : stop.offset === 1
                      ? Lock
                      : Swords

              return (
                <button
                  key={stop.tLabel}
                  type="button"
                  onClick={() => togglePhase(stop.phase === 'raid' ? 'lock' : stop.phase)}
                  onMouseEnter={() => setActivePhase(stop.phase === 'raid' ? 'lock' : stop.phase)}
                  onMouseLeave={() => setActivePhase(null)}
                  className={cn(
                    'group flex cursor-pointer flex-col items-center text-center transition-all',
                    active ? 'opacity-100' : 'opacity-35',
                  )}
                >
                  {/* Day Name + T-Offset Header */}
                  <div className="mb-2 flex flex-col items-center">
                    <span
                      className={cn(
                        'font-display text-xs font-extrabold tracking-wider uppercase',
                        stop.isMilestone ? nodeColors.dayText : 'text-silver',
                      )}
                    >
                      {day.short}
                    </span>
                    <span className="font-mono text-[10px] font-semibold text-muted-foreground">
                      {stop.tLabel}
                    </span>
                  </div>

                  {/* Rail Node Circle */}
                  <div className="flex h-11 items-center justify-center">
                    {stop.isMilestone ? (
                      <span
                        className={cn(
                          'flex size-11 items-center justify-center rounded-full border-2 transition-transform group-hover:scale-110',
                          nodeColors.ring,
                        )}
                      >
                        <MilestoneIcon className="size-5" />
                      </span>
                    ) : (
                      <span
                        className={cn(
                          'flex size-4 items-center justify-center rounded-full border-2 transition-transform group-hover:scale-125',
                          nodeColors.dot,
                        )}
                      >
                        <span
                          className={cn(
                            'size-1.5 rounded-full',
                            stop.phase === 'signup' ? 'bg-neon' : 'bg-gold',
                          )}
                        />
                      </span>
                    )}
                  </div>

                  {/* Labels Below Node */}
                  <div className="mt-2.5 flex flex-col items-center gap-1 px-0.5">
                    {stop.isMilestone ? (
                      <>
                        <span
                          className={cn(
                            'rounded-md border px-2 py-0.5 text-[10px] font-extrabold tracking-wider uppercase',
                            nodeColors.badge,
                          )}
                        >
                          {stop.title}
                        </span>
                        <span className="text-[11px] leading-tight font-semibold text-foreground">
                          {stop.timeBadge}
                        </span>
                        <span className="text-[10px] leading-tight text-muted-foreground">
                          {stop.sublabel}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] font-semibold text-silver/90">{stop.title}</span>
                        <span className="text-[10px] text-muted-foreground/75">{stop.sublabel}</span>
                      </>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Layer 3: Continuous Weekly Loop Return Bar */}
        <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-gradient-to-r from-neon/[0.06] via-[#071525] to-emerald-500/[0.08] px-4 py-2 text-[11px]">
          <span className="flex items-center gap-2 font-medium text-silver">
            <RefreshCw className="size-3.5 shrink-0 text-emerald-400" />
            <span>
              <strong className="text-emerald-300">Sürekli Döngü:</strong> Raid bitince puanlar işlenir, arşivlenir ve{' '}
              <strong className="text-neon">gelecek haftanın raidi</strong> anında açılır.
            </span>
          </span>
          <Badge className="border-emerald-500/35 bg-emerald-500/10 font-mono text-[10px] text-emerald-300">
            T-0 ↻ T-7
          </Badge>
        </div>
      </div>

      {/* MOBILE VERTICAL GRAPHICAL TIMELINE (< md) */}
      <div className="rounded-2xl border border-border/80 bg-[#06111e] p-4 md:hidden">
        <div className="relative space-y-2.5 pl-7">
          {/* Vertical Gradient Spine */}
          <div
            className="pointer-events-none absolute top-3 bottom-3 left-[13px] w-0.5 rounded-full"
            style={{
              background:
                'linear-gradient(to bottom, #00f2fe 0%, #38bdf8 55%, #d4af37 74%, #fb7185 87%, #3ee07f 100%)',
            }}
          />

          {TIMELINE_STOPS.map((stop) => {
            const day = dayForOffset(raidDayIndex, stop.offset)
            const dotClass =
              stop.phase === 'signup'
                ? 'border-neon bg-[#071b2b] text-neon'
                : stop.phase === 'roster'
                  ? 'border-sky-400 bg-[#071c30] text-sky-300'
                  : stop.phase === 'confirm'
                    ? 'border-gold bg-[#1e1a0b] text-gold'
                    : stop.phase === 'lock'
                      ? 'border-rose-400 bg-[#250e18] text-rose-300'
                      : 'border-emerald-400 bg-[#07241a] text-emerald-300'

            const MilestoneIcon =
              stop.offset === 7
                ? CalendarPlus
                : stop.offset === 3
                  ? Zap
                  : stop.offset === 1
                    ? Lock
                    : Swords

            return (
              <div
                key={stop.tLabel}
                className={cn(
                  'relative flex items-center justify-between gap-2 rounded-xl border px-3 py-2',
                  stop.isMilestone
                    ? 'border-border/90 bg-[#0b1b2d]/90'
                    : 'border-border/40 bg-[#081524]/60 py-1.5',
                )}
              >
                {/* Spine Node */}
                <span
                  className={cn(
                    'absolute flex items-center justify-center rounded-full border-2',
                    stop.isMilestone ? '-left-[26px] size-6' : '-left-[21px] size-3.5',
                    dotClass,
                  )}
                >
                  {stop.isMilestone && <MilestoneIcon className="size-3" />}
                </span>

                <div className="flex min-w-0 items-center gap-2">
                  <span className="w-12 shrink-0 font-mono text-[11px] font-bold text-muted-foreground">
                    {day.short} {stop.tLabel}
                  </span>
                  <span className={cn('truncate text-xs font-bold', stop.isMilestone ? 'text-foreground' : 'text-silver/80')}>
                    {stop.isMilestone ? `${stop.title} · ${stop.timeBadge}` : stop.title}
                  </span>
                </div>

                <span className="shrink-0 text-[10px] text-muted-foreground">{stop.sublabel}</span>
              </div>
            )
          })}
        </div>

        {/* Mobile loop footer */}
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] px-3 py-2 text-[11px] text-silver">
          <span className="flex items-center gap-1.5">
            <RefreshCw className="size-3.5 shrink-0 text-emerald-400" />
            Raid bitince arşivlenir & yeni hafta açılır
          </span>
          <span className="font-mono text-[10px] font-bold text-emerald-300">T-0 ↻ T-7</span>
        </div>
      </div>

      {/* 4 ULTRA-CONCISE VISUAL STAGE CARDS (Icon + Short Bullets, Minimal Text) */}
      {!compact && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stageCards.map((card) => {
            const Icon = card.icon
            const highlighted = isHighlighted(card.id)
            return (
              <div
                key={card.id}
                onMouseEnter={() => setActivePhase(card.id)}
                onMouseLeave={() => setActivePhase(null)}
                onClick={() => togglePhase(card.id)}
                className={cn(
                  'relative cursor-pointer overflow-hidden rounded-xl border bg-[#071422] p-4 transition-all',
                  card.accentBorder,
                  highlighted ? 'opacity-100' : 'opacity-45',
                )}
              >
                <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', card.accentTop)} />

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'flex size-8 items-center justify-center rounded-lg border',
                        card.accentBg,
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <p className="font-mono text-[10px] font-semibold text-muted-foreground">
                        {card.window}
                      </p>
                      <h4 className={cn('font-display text-sm font-bold', card.accentText)}>
                        {card.title}
                      </h4>
                    </div>
                  </div>
                  <Badge className={cn('font-mono text-[10px] font-bold', card.accentBg)}>
                    {card.pillText}
                  </Badge>
                </div>

                <ul className="mt-3 space-y-1.5 border-t border-border/50 pt-3">
                  {card.bullets.map((b) => {
                    const BIcon = b.icon
                    return (
                      <li key={b.text} className="flex items-center gap-2 text-xs text-silver">
                        <BIcon className={cn('size-3.5 shrink-0 opacity-85', card.accentText)} />
                        <span className="leading-snug">
                          {b.text}
                          {b.highlight && (
                            <span className="ml-1.5 rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                              {b.highlight}
                            </span>
                          )}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      )}

      {/* ULTRA-COMPACT VISUAL RULES STRIP (At-a-Glance Chips, Zero Paragraphs) */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] px-3 py-2.5 text-xs">
          <span className="flex items-center gap-1.5 font-semibold text-emerald-200">
            <ShieldCheck className="size-4 shrink-0 text-emerald-400" />
            Bench Hazır
          </span>
          <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[11px] font-bold text-emerald-300">
            {typeof rules.benchReadyPoints === 'number'
              ? `+${rules.benchReadyPoints}p`
              : rules.benchReadyEqual
                ? '= Tam Puan'
                : 'Ayrı'}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/[0.06] px-3 py-2.5 text-xs">
          <span className="flex items-center gap-1.5 font-semibold text-cyan-200">
            <Clock className="size-4 shrink-0 text-cyan-400" />
            İptal (&gt;24s)
          </span>
          <span className="rounded-md bg-cyan-500/20 px-1.5 py-0.5 font-mono text-[11px] font-bold text-cyan-300">
            {rules.excusedDeclinePenalty}p
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2.5 text-xs">
          <span className="flex items-center gap-1.5 font-semibold text-amber-200">
            <Clock className="size-4 shrink-0 text-amber-400" />
            Geç Kalma
          </span>
          <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-300">
            {rules.latePenalty}p
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-xl border border-orange-500/30 bg-orange-500/[0.06] px-3 py-2.5 text-xs">
          <span className="flex items-center gap-1.5 font-semibold text-orange-200">
            <AlertTriangle className="size-4 shrink-0 text-orange-400" />
            Eksik Hazırlık
          </span>
          <span className="rounded-md bg-orange-500/20 px-1.5 py-0.5 font-mono text-[11px] font-bold text-orange-300">
            {rules.missingPrepPenalty}p
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-500/35 bg-rose-500/[0.08] px-3 py-2.5 text-xs sm:col-span-2 lg:col-span-1">
          <span className="flex items-center gap-1.5 font-semibold text-rose-200">
            <Ban className="size-4 shrink-0 text-rose-400" />
            No-Show
          </span>
          <span className="rounded-md bg-rose-500/20 px-1.5 py-0.5 font-mono text-[11px] font-bold text-rose-300">
            {rules.noShowPenalty}p
          </span>
        </div>
      </div>
    </div>
  )
}
