'use client'

import {
  Award,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coins,
  Crown,
  Dices,
  HelpCircle,
  Play,
  Presentation,
  RotateCcw,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { CLASS_COLORS } from '@/lib/guild-data'
import { DEFAULT_POINT_RULES, DEFAULT_RAIDER_TARGET_40, getSpecColor } from '@/lib/raid-loot-system'
import { useRaidSystem } from '@/lib/use-raid-system'
import { cn } from '@/lib/utils'
import { useAuth } from '../auth-provider'
import { useToast } from '../toast'
import { Badge, GhostButton, GoldButton, Panel, PanelTitle, SectionHeader } from '../ui'
import { WeeklyRaidTimeline } from '../weekly-raid-timeline'

const SLIDE_TITLES = [
  '1. Vizyon & Zaman Çizelgesi',
  '2. Haftalık Raid Döngüsü',
  '3. İnteraktif Puan Simülatörü',
  '4. Şeffaf Loot Kutu Rotasyonu',
  '5. 1 Ocak 2027: Raider Kadrosu',
  '6. SSS & Sistem Onayı',
]

const DEMO_ORDER = ['Tank Warrior', 'Tank Paladin', 'Rogue', 'Fury Warrior', 'Hunter'] as const

type DemoStep = {
  dropNo: number
  round: number
  slotIndex: number
  winnerName: string
  winnerClass: keyof typeof CLASS_COLORS
  narration: string
}

const DEMO_STEPS: DemoStep[] = [
  {
    dropNo: 1,
    round: 1,
    slotIndex: 0,
    winnerName: 'Demir Kalkan',
    winnerClass: 'Warrior',
    narration:
      '1. Drop: Öncelik 1. Tank Warrior kutusunda. Raidde 2 Tank Warrior var → Devam puanı yüksek olan (eşitse zar kazananı) "Demir Kalkan" alır!',
  },
  {
    dropNo: 2,
    round: 1,
    slotIndex: 2,
    winnerName: 'Gölge Hançer',
    winnerClass: 'Rogue',
    narration:
      '2. Drop: Sıra 2. Tank Paladin kutusunda ama o gün raidde Tank Paladin YOK! Sıradaki uygun 3. Rogue ("Gölge Hançer") alır; 2. Tank Paladin kutusu AÇIK (Bekleyen Öncelik) kalır!',
  },
  {
    dropNo: 3,
    round: 1,
    slotIndex: 1,
    winnerName: 'Işık Koruması',
    winnerClass: 'Paladin',
    narration:
      '3. Drop: Ertesi hafta Tank Paladin raidde! Açık bekleyen 2. Tank Paladin kutusu ilk önceliği geri alır → "Işık Koruması" kazanır!',
  },
  {
    dropNo: 4,
    round: 1,
    slotIndex: 3,
    winnerName: 'Öfke Baltası',
    winnerClass: 'Warrior',
    narration: '4. Drop: Açık sıradaki 4. Fury Warrior kutusuna gider → "Öfke Baltası" kazanır.',
  },
  {
    dropNo: 5,
    round: 1,
    slotIndex: 4,
    winnerName: 'Keskin Ok',
    winnerClass: 'Hunter',
    narration: '5. Drop: Son kutu olan 5. Hunter dolar → "Keskin Ok". Tur 1 tamamen bitti! Bir sonraki drop ile Tur 2 başa döner.',
  },
  {
    dropNo: 6,
    round: 2,
    slotIndex: 0,
    winnerName: 'Çelik Siper',
    winnerClass: 'Warrior',
    narration:
      '6. Drop (TUR 2 BAŞLADI!): Sıra başa (1. Tank Warrior) döndü! Demir Kalkan bu itemı zaten aldığı için sıradaki 2. Tank Warrior "Çelik Siper" alır!',
  },
]

const FAQ_ITEMS = [
  {
    q: 'Officer kararıyla Bench (Yedek) kalırsam puan kaybeder miyim?',
    a: 'Hayır! Officer kararıyla veya kendi kararınızla Bench bekleyen ve raid saatinde oyunda/Discord\'da hazır bulunan oyuncular, Officer takibiyle raide girmiş gibi EŞİT (tam) raid puanı alır.',
  },
  {
    q: 'Raide imza attım ama işim çıktı, -10 ceza yer miyim?',
    a: 'Konfirmasyon kapanış süresinden (raidten 24 saat öncesinden) ÖNCE sistemden "Mazeretli İptal" bildirirseniz ceza puanı (0p) uygulanmaz. -10 puan cezası yalnızca konfirmasyon verip gelmeyen veya haber vermeden kaybolan (No-Show) oyunculara uygulanır.',
  },
  {
    q: 'Loot sırasında benim sınıfım var ama ben o gün raidde değildim, hakkım yanar mı?',
    a: 'Hayır, kutu mantığımız sayesinde hakkınız yanmaz! O gün sıradaki sınıf raidde yoksa bir sonraki sınıf kendi kutusunu doldurur; sizin kutunuz "Bekleyen Öncelik" olarak açık kalır ve bir sonraki düşüşte öncelik tekrar size gelir.',
  },
  {
    q: 'Aynı gün ve saate 30 kişi 10-man Barrow Deeps için imza atarsa ne olur?',
    a: 'Her raid için tek imza havuzu açılır. Officerlar gelen imza sayısına göre aynı etkinlik içinde Grup 1, Grup 2, Grup 3 ve Bench şeklinde birden fazla roster yayınlayabilir.',
  },
  {
    q: 'BoE itemlar ve BoP tarifler nasıl dağıtılır?',
    a: 'Tüm BoE itemlar istisnasız Guild Bankasına gelir (consumable/repair fonu) amaçlı alınır. Tüm BoP tarifler ilk düşüşte guildin belirlediği Meslek Sorumlusuna verilir (guild üyelerine ücretsiz craft şartıyla); aynı tarif tekrar düşerse min 300 mesleğe sahip olanlar anında öğrenmek şartıyla rollar.',
  },
  {
    q: '1 Ocak 2027 tarihinde Raider rütbesi nasıl verilecek?',
    a: '1 Ocak 2027\'ye kadar tüm LvL 60 Main karakterler TURX rütbesiyle puan biriktirir. 1 Ocak\'ta yayınlanan isimsiz 40-man sınıf/spec kontenjanına göre en yüksek devam puanına sahip oyunculara GM tarafından Raider rütbesi verilir.',
  },
]

function toEmbedUrl(url: string): string | null {
  const clean = url.trim()
  if (!clean) return null
  try {
    const u = new URL(clean)
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}`
    }
    if (u.hostname === 'youtu.be' && u.pathname.length > 1) {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`
    }
    if (u.hostname.includes('loom.com') && u.pathname.includes('/share/')) {
      return clean.replace('/share/', '/embed/')
    }
    return clean
  } catch {
    return null
  }
}

export function RoadmapView() {
  const { user } = useAuth()
  const toast = useToast()
  const { data, busy, postAction } = useRaidSystem()

  const [mode, setMode] = useState<'scroll' | 'slides'>('scroll')
  const [slideIndex, setSlideIndex] = useState(0)

  // Interactive Point Simulator state
  const [sim10, setSim10] = useState(1)
  const [sim20, setSim20] = useState(1)
  const [sim40, setSim40] = useState(1)
  const [simBench, setSimBench] = useState(0)
  const [simLate, setSimLate] = useState(0)
  const [simNoShow, setSimNoShow] = useState(0)

  // Interactive Loot Rotation Demo state
  const [demoStepCount, setDemoStepCount] = useState(0)

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const rs = data?.raidSystem
  const rules = rs?.settings.pointRules || DEFAULT_POINT_RULES
  const target40 = rs?.settings.raiderTarget40 || DEFAULT_RAIDER_TARGET_40
  const videoEmbed = toEmbedUrl(rs?.settings.roadmapVideoUrl || '')
  const acks = rs?.roadmapAcks || []
  const totalGuildMembers = data?.guildMembers?.length || 0
  const myAck = useMemo(
    () => acks.find((a) => user && a.username.toLowerCase() === user.username.toLowerCase()) || null,
    [acks, user],
  )

  useEffect(() => {
    if (mode !== 'slides') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setSlideIndex((i) => Math.min(SLIDE_TITLES.length - 1, i + 1))
      } else if (e.key === 'ArrowLeft') {
        setSlideIndex((i) => Math.max(0, i - 1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode])

  // Simulated Weekly Points calculation
  const simTotalRaids = sim10 + sim20 + sim40 + simBench
  const simSignupConfirm = simTotalRaids * (rules.signup + rules.confirm)
  const simRaidPoints =
    sim10 * rules.raid10 +
    sim20 * rules.raid20 +
    sim40 * rules.raid40 +
    simBench * (rules.benchReadyEqual ? rules.raid20 : 0)
  const simPenalties = simLate * rules.latePenalty + simNoShow * rules.noShowPenalty
  const simTotal = simSignupConfirm + simRaidPoints + simPenalties

  // Compute demo board state from demoStepCount
  const demoBoard = useMemo(() => {
    const activeSteps = DEMO_STEPS.slice(0, demoStepCount)
    const currentRound = demoStepCount >= 6 ? 2 : 1
    const slots: ({ name: string; wowClass: keyof typeof CLASS_COLORS } | null)[] = [null, null, null, null, null]
    for (const st of activeSteps) {
      if (st.round === currentRound) {
        slots[st.slotIndex] = { name: st.winnerName, wowClass: st.winnerClass }
      }
    }
    const primaryOpen = slots.findIndex((s) => s === null)
    const lastStep = activeSteps[activeSteps.length - 1] || null
    return { currentRound, slots, primaryOpen, lastStep }
  }, [demoStepCount])

  const handleAcknowledge = async () => {
    if (!user) {
      toast({ title: 'Oturum Gerekli', description: 'Onay vermek için giriş yapmalısınız.' })
      return
    }
    try {
      await postAction({ action: 'acknowledge_roadmap' })
      toast({
        title: 'Onayınız Kaydedildi!',
        description: 'TURX Raid & Loot Road Map sistemini okuduğunuz kaydedildi.',
      })
    } catch (err) {
      toast({
        title: 'Hata',
        description: err instanceof Error ? err.message : 'Onay kaydedilemedi.',
      })
    }
  }

  const sections = [
    // SLIDE 0: VISION & TIMELINE
    <Panel key="s0" className="border-gold/35 bg-gradient-to-br from-[#0e243a] via-[#091829] to-[#071220]">
      <PanelTitle icon={Sparkles}>1. Büyük Resim: Fazlar & 1 Ocak 2027 Hedefi</PanelTitle>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-silver">
        TURX FOREVER loncasında <strong className="text-gold">torpilsiz, %100 şeffaf ve disiplin ödüllendiren</strong> yeni Raid & Loot sistemine geçiyoruz. Tüm puanlar, devam kayıtları ve loot sıralamaları 7/24 web sitemizde tüm oyunculara açık takip edilir.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-neon/35 bg-[#071422]/90 p-4">
          <Badge className="border-neon/40 bg-neon/10 text-neon">9 Aralık 2026</Badge>
          <h3 className="mt-2 font-display text-lg font-bold text-foreground">Phase 1 & Puan Yarışı</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Barrow Deeps (10m), Hyjal Summit (20m) ve Onyxia&apos;s Lair (40m) açılır. Tüm LvL 60 Main karakterler{' '}
            <strong className="text-neon">TURX</strong> rütbesiyle eşit şartlarda devam puanı biriktirmeye başlar.
          </p>
        </div>
        <div className="rounded-xl border border-gold/50 bg-gold/[0.07] p-4 shadow-[0_0_25px_rgb(212_175_55/0.12)]">
          <Badge className="border-gold/50 bg-gold/15 text-gold">1 Ocak 2027</Badge>
          <h3 className="mt-2 font-display text-lg font-bold text-gold">40-Man Core & Raider Rütbesi</h3>
          <p className="mt-1 text-xs leading-relaxed text-silver">
            İsimsiz olarak yayınlanan 40 kişilik sınıf/spec şablonuna göre her sınıftan <strong>en yüksek devam puanlı</strong> oyuncular <strong className="text-gold">Raider</strong> rütbesini kazanır.
          </p>
        </div>
        <div className="rounded-xl border border-purple-400/35 bg-[#071422]/90 p-4">
          <Badge className="border-purple-400/40 bg-purple-500/10 text-purple-300">Her 3 Ayda Bir</Badge>
          <h3 className="mt-2 font-display text-lg font-bold text-foreground">Yeni Faz, Taze Rekabet</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Her 3 ayda bir yeni faz ve yeni raid grubu eklenir. Her fazın kendi raidleri ve item öncelik listesi ayrı takip edilir.
          </p>
        </div>
      </div>
    </Panel>,

    // SLIDE 1: WEEKLY RAID CYCLE (VISUAL TIMELINE)
    <Panel key="s1" className="border-neon/35 bg-gradient-to-br from-[#0c1f34] via-[#091829] to-[#071220]">
      <PanelTitle
        icon={CalendarClock}
        action={
          <Badge className="border-neon/35 bg-neon/10 font-mono text-[11px] text-neon">
            T-7 → T-3 → T-1 → T-0
          </Badge>
        }
      >
        2. Bir Haftalık Raid Döngüsü
      </PanelTitle>
      <WeeklyRaidTimeline rules={rules} />
    </Panel>,

    // SLIDE 2: INTERACTIVE POINT SIMULATOR
    <Panel key="s2" className="border-gold/30">
      <PanelTitle icon={Sparkles}>3. Puanlama Sistemi & İnteraktif Haftalık Simülatör</PanelTitle>
      <p className="mb-4 text-xs text-muted-foreground">
        Aşağıdaki sayıları değiştirerek bir haftada ne kadar devam puanı kazanacağınızı (veya geç kalma / habersiz gelmemenin etkisini) anında test edin!
      </p>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-8">
          {[
            { label: `10-Man Raid (+${rules.raid10}p + ${rules.signup + rules.confirm}p imza/konf.)`, val: sim10, set: setSim10, max: 3, tone: 'text-neon' },
            { label: `20-Man Raid (+${rules.raid20}p + ${rules.signup + rules.confirm}p imza/konf.)`, val: sim20, set: setSim20, max: 2, tone: 'text-sky-300' },
            { label: `40-Man Raid (+${rules.raid40}p + ${rules.signup + rules.confirm}p imza/konf.)`, val: sim40, set: setSim40, max: 2, tone: 'text-gold' },
            { label: `Bench Hazır Bekleme (Eşit Raid Puanı!)`, val: simBench, set: setSimBench, max: 3, tone: 'text-emerald-300' },
            { label: `Raide Geç Kalma (${rules.latePenalty}p)`, val: simLate, set: setSimLate, max: 3, tone: 'text-amber-300' },
            { label: `Habersiz Gelmeme / No-Show (${rules.noShowPenalty}p)`, val: simNoShow, set: setSimNoShow, max: 2, tone: 'text-rose-400' },
          ].map((ctrl) => (
            <div key={ctrl.label} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-[#071422] px-3.5 py-3">
              <span className={cn('text-xs font-medium', ctrl.tone)}>{ctrl.label}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => ctrl.set(Math.max(0, ctrl.val - 1))}
                  className="size-7 cursor-pointer rounded-md border border-border bg-[#0b1b2d] text-sm font-bold text-foreground hover:border-neon"
                >
                  −
                </button>
                <span className="w-6 text-center font-mono text-sm font-bold text-foreground">{ctrl.val}</span>
                <button
                  onClick={() => ctrl.set(Math.min(ctrl.max, ctrl.val + 1))}
                  className="size-7 cursor-pointer rounded-md border border-border bg-[#0b1b2d] text-sm font-bold text-foreground hover:border-neon"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-gold/40 bg-gradient-to-b from-gold/15 via-[#0b1b2d] to-[#071422] p-5 lg:col-span-4">
          <div>
            <p className="text-[11px] font-semibold tracking-widest text-gold uppercase">Simülasyon Sonucu</p>
            <p className={cn('mt-2 font-display text-5xl font-black', simTotal >= 0 ? 'text-gold text-glow-gold' : 'text-rose-400')}>
              {simTotal > 0 ? `+${simTotal}` : simTotal}
              <span className="ml-1 text-lg font-normal text-silver">puan</span>
            </p>
          </div>
          <div className="mt-4 space-y-1.5 border-t border-border/60 pt-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">İmza + Konfirmasyon:</span>
              <span className="font-mono text-cyan-300">+{simSignupConfirm}p</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Raid + Bench Hazır:</span>
              <span className="font-mono text-emerald-300">+{simRaidPoints}p</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cezalar:</span>
              <span className="font-mono text-rose-400">{simPenalties}p</span>
            </div>
          </div>
        </div>
      </div>
    </Panel>,

    // SLIDE 3: INTERACTIVE LOOT ROTATION DEMO
    <Panel key="s3" className="border-neon/35">
      <PanelTitle
        icon={Award}
        action={
          <div className="flex items-center gap-2">
            <GhostButton onClick={() => setDemoStepCount(0)} className="px-3 py-1.5 text-xs">
              <RotateCcw className="size-3.5" />
              Sıfırla
            </GhostButton>
            <GoldButton
              onClick={() => setDemoStepCount((n) => (n >= DEMO_STEPS.length ? 0 : n + 1))}
              className="px-3 py-1.5 text-xs"
            >
              <Play className="size-3.5" />
              {demoStepCount >= DEMO_STEPS.length ? 'Baştan Oynat' : `Item Düştü Simüle Et (${demoStepCount}/${DEMO_STEPS.length})`}
            </GoldButton>
          </div>
        }
      >
        4. Şeffaf Loot Kutu Rotasyonu (Canlı Demo!)
      </PanelTitle>

      <div className="mb-4 rounded-xl border border-gold/30 bg-[#071422] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-display text-base font-bold text-gold">Örnek Item: Dragonscale Trinket</span>
            <Badge className="border-gold/40 bg-gold/10 text-gold">Aktif Tur #{demoBoard.currentRound}</Badge>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-silver">
            <Dices className="size-4 text-amber-300" />
            Aynı Spec: Önce Devam Puanı → Eşitse Zar!
          </span>
        </div>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          {DEMO_ORDER.map((specLabel, idx) => {
            const filled = demoBoard.slots[idx]
            const isNext = !filled && idx === demoBoard.primaryOpen
            const isSkippedWaiting =
              !filled && idx < Math.max(-1, ...demoBoard.slots.map((s, si) => (s ? si : -1)))
            return (
              <div
                key={specLabel}
                className={cn(
                  'rounded-xl border p-3 transition',
                  filled
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : isNext
                      ? 'border-gold bg-gold/10 shadow-[0_0_20px_rgb(212_175_55/0.2)]'
                      : 'border-border/70 bg-[#0b1b2d]/60',
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold" style={{ color: getSpecColor(specLabel) }}>
                    {idx + 1}. {specLabel}
                  </span>
                  {isNext && (
                    <span className="rounded-full bg-gold/25 px-1.5 py-0.5 text-[9px] font-bold text-gold uppercase">
                      {isSkippedWaiting ? 'Bekleyen Öncelik' : 'Sırada'}
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  {filled ? (
                    <p className="text-sm font-bold" style={{ color: CLASS_COLORS[filled.wowClass] }}>
                      {filled.name}
                    </p>
                  ) : (
                    <p className="text-xs italic text-muted-foreground">Boş kutu...</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-3 rounded-lg border border-neon/25 bg-neon/5 px-3.5 py-2.5 text-xs text-foreground">
          {demoBoard.lastStep ? (
            <p>{demoBoard.lastStep.narration}</p>
          ) : (
            <p className="text-muted-foreground">
              Yukarıdaki <strong className="text-gold">&quot;Item Düştü Simüle Et&quot;</strong> butonuna basarak 2. Tank Paladin raidde yokken kutusunun nasıl korunduğunu ve 5. drop sonrası sıranın başa nasıl döndüğünü izleyin!
            </p>
          )}
        </div>
      </div>

      {/* BoE & BoP Rules */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gold/30 bg-[#071422] p-4">
          <p className="flex items-center gap-2 font-display text-sm font-bold text-gold">
            <Coins className="size-4" />
            BoE Eşyalar → Guild Banka
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            Raidlerde düşen tüm BoE itemlar istisnasız Guild Bankasına gelir amaçlı (flask, potion, repair desteği) alınır ve sitede şeffaf olarak listelenir.
          </p>
        </div>
        <div className="rounded-xl border border-neon/30 bg-[#071422] p-4">
          <p className="flex items-center gap-2 font-display text-sm font-bold text-neon">
            <BookOpen className="size-4" />
            BoP Tarifler → Meslek Sorumlusu & Min 300 Roll
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            Tüm BoP tarifler ilk düşüşte guildin belirlediği Meslek Sorumlusuna verilir. Aynı tarif tekrar düşerse o meslekte <strong>min 300</strong> olanlar <strong>anında öğrenmek şartıyla</strong> rollar.
          </p>
        </div>
      </div>
    </Panel>,

    // SLIDE 4: JAN 1 2027 40-MAN RAIDER TARGET
    <Panel key="s4" className="border-gold/35">
      <PanelTitle icon={Crown}>5. 1 Ocak 2027: İsimsiz 40-Man Raider Kontenjanı</PanelTitle>
      <p className="mb-4 text-xs text-silver">
        1 Ocak 2027 tarihine kadar tüm LvL 60 Main karakterler <strong className="text-neon">TURX</strong> rütbesiyle yarışır. 1 Ocak&apos;ta aşağıdaki isimsiz kadro ihtiyacına göre en yüksek devam puanlı oyuncular <strong className="text-gold">Raider</strong> rütbesine terfi eder.
      </p>

      <div className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {target40
          .filter((s) => s.count > 0)
          .map((slot) => (
            <div
              key={slot.id}
              className="flex items-center justify-between rounded-xl border border-border/70 bg-[#071422] px-3.5 py-2.5"
            >
              <span className="text-xs font-bold" style={{ color: CLASS_COLORS[slot.wowClass] }}>
                {slot.specLabel}
              </span>
              <Badge className="border-gold/40 bg-gold/10 font-mono text-gold">{slot.count}</Badge>
            </div>
          ))}
      </div>
    </Panel>,

    // SLIDE 5: FAQ & ACKNOWLEDGEMENT
    <div key="s5" className="space-y-5">
      <Panel>
        <PanelTitle icon={HelpCircle}>6. Sıkça Sorulan Sorular (SSS)</PanelTitle>
        <div className="space-y-2">
          {FAQ_ITEMS.map((item, idx) => {
            const open = openFaq === idx
            return (
              <div key={item.q} className="rounded-xl border border-border/70 bg-[#071422]">
                <button
                  onClick={() => setOpenFaq(open ? null : idx)}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left text-xs font-semibold text-foreground"
                >
                  <span>{item.q}</span>
                  <ChevronDown className={cn('size-4 shrink-0 text-neon transition', open && 'rotate-180')} />
                </button>
                {open && (
                  <p className="border-t border-border/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                    {item.a}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </Panel>

      {/* Read & Acknowledge Banner */}
      <Panel className="border-emerald-500/35 bg-gradient-to-r from-emerald-500/10 via-[#0a1c30] to-gold/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 font-display text-base font-bold text-foreground">
              <ShieldCheck className="size-5 text-emerald-400" />
              Sistemi İnceledin mi? Onayını Kaydet!
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Şu ana kadar <strong className="text-emerald-300">{acks.length}</strong>
              {totalGuildMembers > 0 ? ` / ${totalGuildMembers}` : ''} guild üyesi Road Map sunumunu okuyup onayladı.
            </p>
          </div>
          {myAck ? (
            <Badge className="border-emerald-500/50 bg-emerald-500/15 px-4 py-2 text-xs font-bold text-emerald-300">
              <CheckCircle2 className="size-4" />
              Onayladın ({new Date(myAck.acknowledgedAt).toLocaleDateString('tr-TR')})
            </Badge>
          ) : (
            <GoldButton disabled={busy} onClick={() => void handleAcknowledge()}>
              <CheckCircle2 className="size-4" />
              Kuralları Okudum & Anladım
            </GoldButton>
          )}
        </div>

        {data?.isOfficer && acks.length > 0 && (
          <div className="mt-4 border-t border-border/50 pt-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-silver">
              <Users className="size-3.5 text-neon" />
              Onaylayan Üyeler ({acks.length}):
            </p>
            <div className="flex flex-wrap gap-1.5">
              {acks.map((a) => (
                <Badge key={a.username} className="border-emerald-500/30 bg-emerald-500/10 text-[11px] text-emerald-200">
                  {a.characterName || a.username}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Panel>
    </div>,
  ]

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="TURX FOREVER · OYUNCU REHBERİ & SUNUM"
        title="Road Map: Yeni Raid & Loot Sistemi"
        description="Canlıya geçmeden önce tüm lonca üyelerinin yeni sistemi 3 dakikada kavraması için hazırlanan interaktif sunum. Discord toplantıları için Slayt Moduna geçebilirsiniz."
        action={
          <div className="inline-flex rounded-lg border border-border bg-[#071422] p-1">
            <button
              onClick={() => setMode('scroll')}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition',
                mode === 'scroll' ? 'bg-neon/15 text-neon' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <ScrollText className="size-3.5" />
              Rehber Modu
            </button>
            <button
              onClick={() => setMode('slides')}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition',
                mode === 'slides' ? 'bg-gold/15 text-gold' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Presentation className="size-3.5" />
              Sunum (Slayt) Modu
            </button>
          </div>
        }
      />

      {/* Optional Intro Video Section */}
      {videoEmbed ? (
        <Panel className="border-gold/35 overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border/70 px-5 py-3">
            <span className="flex items-center gap-2 font-display text-sm font-bold text-gold">
              <Video className="size-4" />
              Kısa Sistem Tanıtım Videosu
            </span>
          </div>
          <div className="aspect-video w-full bg-black">
            <iframe
              src={videoEmbed}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="TURX Road Map Tanıtım Videosu"
            />
          </div>
        </Panel>
      ) : data?.isGm ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-gold/35 bg-gold/5 px-4 py-3 text-xs text-silver">
          <span className="flex items-center gap-2">
            <Video className="size-4 text-gold" />
            <span>
              <strong>GM İpucu:</strong> Sunum Modunu kullanarak Discord&apos;da 2 dakikalık kısa tanıtım videosu kaydedip{' '}
              <em>Devam Takibi → GM Ayarları</em> kısmından YouTube/Loom linkini eklediğinizde video otomatik burada görünür!
            </span>
          </span>
        </div>
      ) : null}

      {mode === 'scroll' ? (
        <div className="space-y-6">{sections}</div>
      ) : (
        <div className="space-y-4">
          {/* Slide Progress Bar & Controls */}
          <Panel className="border-gold/30 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge className="border-gold/40 bg-gold/15 font-mono text-gold">
                  Slayt {slideIndex + 1} / {SLIDE_TITLES.length}
                </Badge>
                <span className="font-display text-sm font-bold text-foreground">{SLIDE_TITLES[slideIndex]}</span>
              </div>
              <div className="flex items-center gap-2">
                <GhostButton
                  disabled={slideIndex === 0}
                  onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
                  className="px-3 py-1.5 text-xs"
                >
                  <ChevronLeft className="size-4" />
                  Önceki
                </GhostButton>
                <GoldButton
                  disabled={slideIndex === SLIDE_TITLES.length - 1}
                  onClick={() => setSlideIndex((i) => Math.min(SLIDE_TITLES.length - 1, i + 1))}
                  className="px-3 py-1.5 text-xs"
                >
                  Sonraki
                  <ChevronRight className="size-4" />
                </GoldButton>
              </div>
            </div>
            <div className="mt-3 flex gap-1.5">
              {SLIDE_TITLES.map((t, idx) => (
                <button
                  key={t}
                  onClick={() => setSlideIndex(idx)}
                  title={t}
                  className={cn(
                    'h-1.5 flex-1 cursor-pointer rounded-full transition',
                    idx === slideIndex ? 'bg-gold' : idx < slideIndex ? 'bg-neon/60' : 'bg-white/10',
                  )}
                />
              ))}
            </div>
          </Panel>

          <div className="animate-in fade-in slide-in-from-right-2">{sections[slideIndex]}</div>
        </div>
      )}
    </div>
  )
}
