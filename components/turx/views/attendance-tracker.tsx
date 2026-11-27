'use client'

import {
  ChevronDown,
  ChevronRight,
  Crown,
  Eye,
  EyeOff,
  Lock,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sliders,
  Trash2,
  Trophy,
  Unlock,
  Video,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { CLASS_COLORS } from '@/lib/guild-data'
import {
  characterMatchesSpecLabel,
  formatTrDateTime,
  type PointRules,
  type PublicModuleFlags,
  type RaiderTargetSlot,
} from '@/lib/raid-loot-system'
import { useRaidSystem } from '@/lib/use-raid-system'
import { cn } from '@/lib/utils'
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

export function AttendanceTrackerView() {
  const toast = useToast()
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | undefined>(undefined)
  const { data, loading, busy, error, postAction } = useRaidSystem(selectedPhaseId)

  const [subTab, setSubTab] = useState<'leaderboard' | 'raider40' | 'gm-settings'>('leaderboard')
  const [search, setSearch] = useState('')
  const [onlyLvl60, setOnlyLvl60] = useState(true)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)

  // Manual adjustment modal (Officer/GM)
  const [adjModalOpen, setAdjModalOpen] = useState(false)
  const [adjUsername, setAdjUsername] = useState('')
  const [adjPoints, setAdjPoints] = useState('0')
  const [adjReason, setAdjReason] = useState('')

  // GM settings local draft states
  const [rulesDraft, setRulesDraft] = useState<PointRules | null>(null)
  const [videoDraft, setVideoDraft] = useState<string | null>(null)
  const [targetsDraft, setTargetsDraft] = useState<RaiderTargetSlot[] | null>(null)
  const [newPhaseModalOpen, setNewPhaseModalOpen] = useState(false)
  const [newPhaseName, setNewPhaseName] = useState('')
  const [newPhaseTitle, setNewPhaseTitle] = useState('')
  const [newPhaseStart, setNewPhaseStart] = useState('2027-03-10')
  const [newPhaseEnd, setNewPhaseEnd] = useState('2027-06-09')

  const rs = data?.raidSystem
  const isOfficer = Boolean(data?.isOfficer)
  const isGm = Boolean(data?.isGm)
  const leaderboard = data?.attendanceLeaderboard || []
  const guildMembers = data?.guildMembers || []

  const filteredRows = useMemo(() => {
    return leaderboard.filter((row) => {
      if (onlyLvl60 && row.level < 60) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const hay = `${row.characterName} ${row.username} ${row.wowClass} ${row.spec} ${row.guildRank}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [leaderboard, onlyLvl60, search])

  const runAction = async (payload: Record<string, unknown>, successMsg: string) => {
    try {
      await postAction(payload)
      toast({ title: 'Kaydedildi', description: successMsg })
      return true
    } catch (err) {
      toast({
        title: 'Hata',
        description: err instanceof Error ? err.message : 'İşlem başarısız.',
      })
      return false
    }
  }

  if (loading) {
    return (
      <Panel className="py-12 text-center text-sm text-muted-foreground">
        Devam puanı verileri yükleniyor...
      </Panel>
    )
  }

  if (error || !rs) {
    return (
      <Panel className="border-rose-500/30 py-10 text-center text-sm text-rose-300">
        {error || 'Devam takibi yüklenemedi.'}
      </Panel>
    )
  }

  const currentPhaseId = selectedPhaseId || rs.settings.activePhaseId
  const currentPhase = rs.phases.find((p) => p.id === currentPhaseId)
  const activeTargets = targetsDraft || rs.settings.raiderTarget40
  const total40Slots = activeTargets.reduce((sum, s) => sum + s.count, 0)
  const effectiveRules = rulesDraft || rs.settings.pointRules
  const effectiveVideo = videoDraft !== null ? videoDraft : rs.settings.roadmapVideoUrl

  const togglePublicModule = async (key: keyof PublicModuleFlags) => {
    const nextVal = !rs.settings.publicModules[key]
    await runAction(
      {
        action: 'update_settings',
        publicModules: { [key]: nextVal },
      },
      nextVal ? 'Modül tüm guild üyelerine açıldı!' : 'Modül tekrar Beta (sadece GM & Officer) moduna alındı.',
    )
  }

  const toggleAllPublic = async (openAll: boolean) => {
    await runAction(
      {
        action: 'update_settings',
        publicModules: {
          raidSignup: openAll,
          loot: openAll,
          attendance: openAll,
          roadmap: openAll,
          bank: openAll,
        },
      },
      openAll ? 'Tüm yeni Raid & Loot modülleri canlıya alındı!' : 'Tüm modüller Beta (GM & Officer) moduna alındı.',
    )
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={`${currentPhase?.name || 'Phase 1'} · ŞEFFAF PUAN TAKİBİ`}
        title="Devam Takibi & 1 Ocak 2027 Raider Sıralaması"
        description="LvL 60 Main karakterlerin faz bazlı raid puanları, hazır bekleyen bench puanları ve ceza kayıtları tarihsel detaylarıyla 7/24 online takip edilir."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={currentPhaseId}
              onChange={(e) => setSelectedPhaseId(e.target.value)}
              className="rounded-lg border border-gold/40 bg-[#071422] px-3 py-2 text-xs font-semibold text-gold"
            >
              {rs.phases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.title} {p.active ? '(Aktif)' : ''}
                </option>
              ))}
            </select>
            <div className="inline-flex rounded-lg border border-border bg-[#071422] p-1">
              <button
                onClick={() => setSubTab('leaderboard')}
                className={cn(
                  'cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition',
                  subTab === 'leaderboard' ? 'bg-neon/15 text-neon' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Puan Listesi
              </button>
              <button
                onClick={() => setSubTab('raider40')}
                className={cn(
                  'cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition',
                  subTab === 'raider40' ? 'bg-gold/15 text-gold' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                1 Ocak 40-Man Raider
              </button>
              {isGm && (
                <button
                  onClick={() => setSubTab('gm-settings')}
                  className={cn(
                    'cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition',
                    subTab === 'gm-settings'
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  GM Ayarları
                </button>
              )}
            </div>
          </div>
        }
      />

      {/* SUB-TAB 1: ATTENDANCE LEADERBOARD */}
      {subTab === 'leaderboard' && (
        <Panel>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative min-w-[220px] flex-1 max-w-md">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Karakter, sınıf veya rütbe ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(inputClass, 'pl-8 text-xs')}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-silver">
                <input
                  type="checkbox"
                  checked={onlyLvl60}
                  onChange={(e) => setOnlyLvl60(e.target.checked)}
                  className="size-4 accent-[#00f2fe]"
                />
                Sadece LvL 60 Main Karakterler
              </label>
              {isOfficer && (
                <GhostButton
                  onClick={() => {
                    setAdjUsername(guildMembers[0]?.username || '')
                    setAdjPoints('0')
                    setAdjReason('')
                    setAdjModalOpen(true)
                  }}
                  className="px-3 py-1.5 text-xs"
                >
                  <Plus className="size-3.5" />
                  Manuel Puan / Ceza Ekle
                </GhostButton>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/70 text-muted-foreground uppercase">
                  <th className="py-2.5 pr-2">#</th>
                  <th className="py-2.5 pr-3">Karakter (Main)</th>
                  <th className="py-2.5 pr-3">Rütbe</th>
                  <th className="py-2.5 pr-3 text-center">10m / 20m / 40m</th>
                  <th className="py-2.5 pr-3 text-center">Bench Hazır</th>
                  <th className="py-2.5 pr-3 text-center">Geç / No-Show</th>
                  <th className="py-2.5 pr-3 text-right">Cezalar</th>
                  <th className="py-2.5 text-right">Toplam Puan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-muted-foreground">
                      Gösterilecek karakter kaydı bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => {
                    const isExpanded = expandedUser === row.username
                    return (
                      <>
                        <tr
                          key={row.username}
                          onClick={() => setExpandedUser(isExpanded ? null : row.username)}
                          className="cursor-pointer transition hover:bg-white/[0.03]"
                        >
                          <td className="py-3 pr-2 font-mono text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              {isExpanded ? <ChevronDown className="size-3.5 text-neon" /> : <ChevronRight className="size-3.5" />}
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-3 pr-3">
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className="font-bold"
                                style={{ color: CLASS_COLORS[row.wowClass] || '#fff' }}
                              >
                                {row.characterName}
                              </span>
                              <PointsPill points={row.totalPoints} />
                            </span>
                            <span className="ml-1.5 text-[11px] text-muted-foreground">
                              {row.spec} · Lv{row.level}
                            </span>
                          </td>
                          <td className="py-3 pr-3">
                            <Badge
                              className={
                                row.guildRank === 'Raider'
                                  ? 'border-gold/50 bg-gold/15 text-gold'
                                  : row.guildRank === 'Guild Master'
                                    ? 'border-amber-400/50 bg-amber-500/15 text-amber-300'
                                    : row.guildRank === 'Görevli'
                                      ? 'border-neon/40 bg-neon/10 text-neon'
                                      : 'border-border bg-white/5 text-silver'
                              }
                            >
                              {row.guildRank}
                            </Badge>
                          </td>
                          <td className="py-3 pr-3 text-center font-mono text-silver">
                            {row.raid10Count} / {row.raid20Count} / {row.raid40Count}
                          </td>
                          <td className="py-3 pr-3 text-center font-mono text-cyan-300">{row.benchReadyCount}</td>
                          <td className="py-3 pr-3 text-center font-mono">
                            <span className="text-amber-300">{row.lateCount}</span>
                            {' / '}
                            <span className="text-rose-400">{row.noShowCount}</span>
                          </td>
                          <td className="py-3 pr-3 text-right font-mono text-rose-400">
                            {row.totalPenalties < 0 ? row.totalPenalties : '0'}
                          </td>
                          <td className="py-3 text-right font-mono text-sm font-bold text-gold">
                            {row.totalPoints > 0 ? `+${row.totalPoints}` : row.totalPoints}p
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr key={`${row.username}-detail`} className="bg-[#06101c]">
                            <td colSpan={8} className="px-4 py-3">
                              <p className="mb-2 text-[11px] font-semibold tracking-wider text-neon uppercase">
                                Tarihsel Raid & Puan Dökümü — {row.characterName}
                              </p>
                              {row.history.length === 0 && row.adjustments.length === 0 ? (
                                <p className="text-xs text-muted-foreground">Bu fazda henüz arşivlenmiş raid kaydı yok.</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {row.history.map((h) => (
                                    <div
                                      key={`${h.eventId}-${h.date}`}
                                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 bg-[#0a192a] px-3 py-1.5 text-[11px]"
                                    >
                                      <div>
                                        <span className="font-semibold text-foreground">{h.raidName} ({h.size}m)</span>
                                        <span className="ml-2 text-muted-foreground">{formatTrDateTime(h.date)}</span>
                                      </div>
                                      <div className="flex items-center gap-3 font-mono">
                                        <span className="text-muted-foreground">{h.outcome}</span>
                                        <span className="text-cyan-300">İmza/K:+{h.breakdown.signup + h.breakdown.confirm}</span>
                                        <span className="text-emerald-300">Raid:+{h.breakdown.raid}</span>
                                        {h.breakdown.penalty < 0 && (
                                          <span className="text-rose-400">Ceza:{h.breakdown.penalty}</span>
                                        )}
                                        <strong className="text-gold">
                                          {h.breakdown.total > 0 ? `+${h.breakdown.total}` : h.breakdown.total}p
                                        </strong>
                                      </div>
                                    </div>
                                  ))}
                                  {row.adjustments.map((adj) => (
                                    <div
                                      key={adj.id}
                                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-purple-500/30 bg-purple-500/5 px-3 py-1.5 text-[11px]"
                                    >
                                      <div>
                                        <span className="font-semibold text-purple-300">Manuel Düzeltme:</span>{' '}
                                        <span className="text-foreground">{adj.reason}</span>
                                        <span className="ml-2 text-muted-foreground">({adj.createdBy})</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <strong className={cn('font-mono', adj.points >= 0 ? 'text-emerald-300' : 'text-rose-400')}>
                                          {adj.points > 0 ? `+${adj.points}` : adj.points}p
                                        </strong>
                                        {isOfficer && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              void runAction(
                                                { action: 'delete_attendance_adjustment', id: adj.id },
                                                'Manuel puan düzeltmesi silindi.',
                                              )
                                            }}
                                            className="cursor-pointer text-rose-400 hover:text-rose-300"
                                          >
                                            <Trash2 className="size-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* SUB-TAB 2: 1 OCAK 2027 40-MAN RAIDER SELECTION */}
      {subTab === 'raider40' && (
        <div className="space-y-5">
          <Panel className="border-gold/35 bg-gradient-to-br from-gold/10 via-[#0a1c30] to-transparent">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Crown className="size-5 text-gold" />
                  <h2 className="font-display text-lg font-bold text-gold">
                    1 Ocak 2027 — İsimsiz 40-Man Core Roster & Raider Ataması
                  </h2>
                </div>
                <p className="mt-1 max-w-3xl text-xs text-silver">
                  1 Ocak 2027 tarihine kadar tüm LvL 60 karakterler <strong className="text-neon">TURX</strong> rütbesiyle devam puanı biriktirir. Aşağıdaki isimsiz sınıf/spec kontenjanına göre her sınıftan <strong>en yüksek devam puanına sahip</strong> oyunculara GM tarafından <strong className="text-gold">Raider</strong> rütbesi verilir.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="border-gold/40 bg-gold/15 px-3 py-1 text-sm font-bold text-gold">
                  Hedef Kadro: {total40Slots} / 40
                </Badge>
                {isGm && (
                  <GhostButton
                    onClick={() =>
                      setTargetsDraft(targetsDraft ? null : rs.settings.raiderTarget40.map((s) => ({ ...s })))
                    }
                    className="text-xs"
                  >
                    <Sliders className="size-3.5" />
                    {targetsDraft ? 'Düzenlemeyi Kapat' : 'GM Kontenjan Düzenle'}
                  </GhostButton>
                )}
              </div>
            </div>

            {targetsDraft && isGm && (
              <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
                <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {targetsDraft.map((slot, idx) => (
                    <div key={slot.id} className="flex items-center justify-between rounded-lg border border-border bg-[#071422] px-3 py-2 text-xs">
                      <span style={{ color: CLASS_COLORS[slot.wowClass] }} className="font-semibold">
                        {slot.specLabel}
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={15}
                        value={slot.count}
                        onChange={(e) =>
                          setTargetsDraft((prev) =>
                            prev
                              ? prev.map((s, i) => (i === idx ? { ...s, count: Math.max(0, Number(e.target.value) || 0) } : s))
                              : null,
                          )
                        }
                        className="w-14 rounded border border-input bg-[#0b1b2d] px-2 py-1 text-center font-mono text-gold"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <GhostButton onClick={() => setTargetsDraft(null)} className="text-xs">
                    İptal
                  </GhostButton>
                  <GoldButton
                    disabled={busy}
                    onClick={async () => {
                      const ok = await runAction(
                        { action: 'update_raider_targets', raiderTarget40: targetsDraft },
                        '40-Man Raider kontenjan şablonu kaydedildi.',
                      )
                      if (ok) setTargetsDraft(null)
                    }}
                    className="text-xs"
                  >
                    Kontenjanı Kaydet ({total40Slots} Kişi)
                  </GoldButton>
                </div>
              </div>
            )}
          </Panel>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeTargets
              .filter((t) => t.count > 0)
              .map((slot) => {
                const candidates = leaderboard
                  .filter((m) => m.level >= 60 && characterMatchesSpecLabel(m, slot.specLabel))
                  .sort((a, b) => b.totalPoints - a.totalPoints)

                return (
                  <Panel key={slot.id} className="border-border/80">
                    <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2">
                      <span className="font-display text-sm font-bold" style={{ color: CLASS_COLORS[slot.wowClass] }}>
                        {slot.specLabel}
                      </span>
                      <Badge className="border-gold/30 bg-gold/10 text-gold">
                        Kontenjan: {slot.count}
                      </Badge>
                    </div>

                    {candidates.length === 0 ? (
                      <p className="py-3 text-xs text-muted-foreground">Bu spec için kayıtlı LvL 60 main yok.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {candidates.map((c, ci) => {
                          const insideCut = ci < slot.count
                          const isRaider = c.guildRank === 'Raider'
                          const isStaff = c.guildRank === 'Guild Master' || c.guildRank === 'Görevli'

                          return (
                            <div
                              key={c.username}
                              className={cn(
                                'flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs',
                                insideCut
                                  ? 'border-emerald-500/35 bg-emerald-500/[0.07]'
                                  : 'border-border/50 bg-[#071422]/60 opacity-75',
                              )}
                            >
                              <div className="flex min-w-0 items-center gap-1.5">
                                <span className="font-mono text-[10px] text-muted-foreground">#{ci + 1}</span>
                                <span className="truncate font-semibold" style={{ color: CLASS_COLORS[c.wowClass] }}>
                                  {c.characterName}
                                </span>
                                <PointsPill points={c.totalPoints} />
                                {isRaider && (
                                  <Badge className="border-gold/40 bg-gold/15 text-[10px] text-gold">Raider</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {isGm && !isStaff && (
                                  <button
                                    disabled={busy}
                                    onClick={() =>
                                      void runAction(
                                        { action: 'assign_raider_rank', username: c.username, grant: !isRaider },
                                        isRaider
                                          ? `${c.characterName} Raider rütbesi kaldırıldı (Turx).`
                                          : `${c.characterName} artık Raider rütbesinde!`,
                                      )
                                    }
                                    className={cn(
                                      'cursor-pointer rounded px-2 py-0.5 text-[10px] font-semibold transition',
                                      isRaider
                                        ? 'border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                                        : 'border border-gold/40 bg-gold/15 text-gold hover:bg-gold/25',
                                    )}
                                  >
                                    {isRaider ? 'Al' : 'Raider Yap'}
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </Panel>
                )
              })}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: GM-ONLY SYSTEM SETTINGS */}
      {subTab === 'gm-settings' && isGm && (
        <div className="space-y-6">
          {/* Beta / Live Visibility Switches */}
          <Panel className="border-purple-500/35">
            <PanelTitle
              icon={ShieldCheck}
              action={
                <div className="flex gap-2">
                  <GhostButton disabled={busy} onClick={() => void toggleAllPublic(false)} className="px-3 py-1.5 text-xs">
                    <Lock className="size-3.5" />
                    Hepsini Beta Yap
                  </GhostButton>
                  <GoldButton disabled={busy} onClick={() => void toggleAllPublic(true)} className="px-3 py-1.5 text-xs">
                    <Unlock className="size-3.5" />
                    Hepsini Tüm Guilde Aç
                  </GoldButton>
                </div>
              }
            >
              Deneme Yayını (Beta) → Canlıya Alma Kontrolleri (Sadece GM)
            </PanelTitle>
            <p className="mb-4 text-xs text-muted-foreground">
              Kapalı olan modüller sol menüde yalnızca <strong>GM ve Officerlar</strong> tarafından görülür. Toplantı sonrası istediğiniz modülü (örneğin önce <em>Road Map</em> sunumunu, sonra tüm sistemi) tek tıkla tüm guild üyelerine açabilirsiniz.
            </p>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {(
                [
                  ['roadmap', 'Road Map Sunumu', 'Oyuncular için interaktif sistem rehberi'],
                  ['raidSignup', 'Raid Kayıt', 'İmza takvimi, çoklu roster ve konfirmasyon'],
                  ['loot', 'Loot Sistemi', 'Şeffaf öncelik sıraları, BoE ve BoP tarifler'],
                  ['attendance', 'Devam Takibi', 'Puan sıralaması ve 1 Ocak 40-Man hedefi'],
                  ['bank', 'Guild Bankası', 'Malzeme talebi ve lonca banka defteri'],
                ] as const
              ).map(([key, title, desc]) => {
                const isPublic = rs.settings.publicModules[key]
                return (
                  <button
                    key={key}
                    disabled={busy}
                    onClick={() => void togglePublicModule(key)}
                    className={cn(
                      'cursor-pointer rounded-xl border p-4 text-left transition',
                      isPublic
                        ? 'border-emerald-500/50 bg-emerald-500/10'
                        : 'border-border bg-[#071422] hover:border-purple-400/50',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm font-bold text-foreground">{title}</span>
                      {isPublic ? (
                        <Eye className="size-4 text-emerald-400" />
                      ) : (
                        <EyeOff className="size-4 text-muted-foreground" />
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{desc}</p>
                    <Badge
                      className={cn(
                        'mt-3',
                        isPublic
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                          : 'border-amber-500/40 bg-amber-500/10 text-amber-300',
                      )}
                    >
                      {isPublic ? 'CANLI (Tüm Guild Görür)' : 'BETA (Sadece GM & Officer)'}
                    </Badge>
                  </button>
                )
              })}
            </div>
          </Panel>

          {/* Point Rules Configuration */}
          <Panel className="border-gold/30">
            <PanelTitle icon={Settings}>Puanlama Kuralları (Sadece GM)</PanelTitle>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ['raid10', '10-Man Raid Puanı'],
                  ['raid20', '20-Man Raid Puanı'],
                  ['raid40', '40-Man Raid Puanı'],
                  ['signup', 'İmza Atma Puanı'],
                  ['confirm', 'Konfirmasyon Puanı'],
                  ['latePenalty', 'Geç Kalma Cezası (eksi)'],
                  ['noShowPenalty', 'Gelmeme / No-Show (eksi)'],
                  ['missingPrepPenalty', 'Eksik Hazırlık Cezası (eksi)'],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label}>
                  <input
                    type="number"
                    className={inputClass}
                    value={effectiveRules[key]}
                    onChange={(e) =>
                      setRulesDraft({
                        ...effectiveRules,
                        [key]: Number(e.target.value) || 0,
                      })
                    }
                  />
                </Field>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-silver">
                <input
                  type="checkbox"
                  checked={effectiveRules.benchReadyEqual}
                  onChange={(e) =>
                    setRulesDraft({
                      ...effectiveRules,
                      benchReadyEqual: e.target.checked,
                    })
                  }
                  className="size-4 accent-[#00f2fe]"
                />
                Hazır bekleyen Bench oyuncuları tam raid puanı (eşit puan) alsın
              </label>

              <GoldButton
                disabled={busy}
                onClick={async () => {
                  const ok = await runAction(
                    { action: 'update_settings', pointRules: effectiveRules },
                    'Puan kuralları güncellendi.',
                  )
                  if (ok) setRulesDraft(null)
                }}
              >
                Puan Kurallarını Kaydet
              </GoldButton>
            </div>
          </Panel>

          {/* Road Map Video & Phase Management */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel>
              <PanelTitle icon={Video}>Road Map Tanıtım Videosu Linki</PanelTitle>
              <p className="mb-3 text-xs text-muted-foreground">
                Kısa tanıtım videosu çektiğinizde YouTube veya Loom linkini buraya yapıştırın; Road Map sunum sayfasının en üstünde otomatik olarak oynatıcı açılır.
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  className={cn(inputClass, 'flex-1')}
                  placeholder="https://www.youtube.com/watch?v=... veya https://www.loom.com/share/..."
                  value={effectiveVideo}
                  onChange={(e) => setVideoDraft(e.target.value)}
                />
                <GoldButton
                  disabled={busy}
                  onClick={async () => {
                    const ok = await runAction(
                      { action: 'update_settings', roadmapVideoUrl: effectiveVideo },
                      'Road Map video bağlantısı kaydedildi.',
                    )
                    if (ok) setVideoDraft(null)
                  }}
                >
                  Kaydet
                </GoldButton>
              </div>
            </Panel>

            <Panel>
              <PanelTitle
                icon={Trophy}
                action={
                  <GhostButton onClick={() => setNewPhaseModalOpen(true)} className="px-3 py-1.5 text-xs">
                    <Plus className="size-3.5" />
                    Yeni Faz Aç
                  </GhostButton>
                }
              >
                3 Aylık Faz Yönetimi
              </PanelTitle>
              <div className="space-y-2">
                {rs.phases.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-[#071422] px-3 py-2 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-foreground">
                        {p.name} — {p.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {p.startDate} → {p.endDate || 'Devam'}
                      </p>
                    </div>
                    {p.active ? (
                      <Badge className="border-emerald-500/40 bg-emerald-500/15 text-emerald-300">Aktif Faz</Badge>
                    ) : (
                      <GhostButton
                        disabled={busy}
                        onClick={() =>
                          void runAction(
                            { action: 'set_active_phase', phaseId: p.id },
                            `${p.name} aktif faz olarak ayarlandı.`,
                          )
                        }
                        className="px-2.5 py-1 text-[11px]"
                      >
                        Aktif Yap
                      </GhostButton>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* Manual Adjustment Modal */}
      <Modal
        open={adjModalOpen}
        onClose={() => setAdjModalOpen(false)}
        title="Manuel Puan / Ceza Düzeltmesi"
        description="Acil yedek bonusu veya özel durum telafisi için puan ekleyin ya da düşürün."
      >
        <div className="space-y-4">
          <Field label="Oyuncu (Main)">
            <select
              className={inputClass}
              value={adjUsername}
              onChange={(e) => setAdjUsername(e.target.value)}
            >
              {guildMembers.map((m) => (
                <option key={m.username} value={m.username}>
                  {m.characterName} ({m.wowClass} - {m.spec})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Puan (+/-)" hint="Pozitif değer ekler, negatif değer (örn. -5) düşer.">
            <input
              type="number"
              className={inputClass}
              value={adjPoints}
              onChange={(e) => setAdjPoints(e.target.value)}
            />
          </Field>
          <Field label="Açıklama / Gerekçe">
            <input
              type="text"
              className={inputClass}
              placeholder="Örn: Son dakika acil healer olarak katıldı"
              value={adjReason}
              onChange={(e) => setAdjReason(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <GhostButton onClick={() => setAdjModalOpen(false)}>İptal</GhostButton>
            <GoldButton
              disabled={busy || !adjUsername || !adjReason.trim()}
              onClick={async () => {
                const m = guildMembers.find((x) => x.username === adjUsername)
                const ok = await runAction(
                  {
                    action: 'add_attendance_adjustment',
                    phaseId: currentPhaseId,
                    username: adjUsername,
                    characterName: m?.characterName || adjUsername,
                    points: Number(adjPoints) || 0,
                    reason: adjReason,
                  },
                  'Manuel puan düzeltmesi işlendi.',
                )
                if (ok) setAdjModalOpen(false)
              }}
            >
              Kaydet
            </GoldButton>
          </div>
        </div>
      </Modal>

      {/* New Phase Modal (GM) */}
      <Modal open={newPhaseModalOpen} onClose={() => setNewPhaseModalOpen(false)} title="GM: Yeni 3 Aylık Faz Oluştur">
        <div className="space-y-4">
          <Field label="Faz Adı">
            <input
              type="text"
              className={inputClass}
              placeholder="Örn: Phase 2"
              value={newPhaseName}
              onChange={(e) => setNewPhaseName(e.target.value)}
            />
          </Field>
          <Field label="Faz Başlığı / Raidleri">
            <input
              type="text"
              className={inputClass}
              placeholder="Örn: Molten Core & Dire Maul"
              value={newPhaseTitle}
              onChange={(e) => setNewPhaseTitle(e.target.value)}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Başlangıç">
              <input
                type="date"
                className={inputClass}
                value={newPhaseStart}
                onChange={(e) => setNewPhaseStart(e.target.value)}
              />
            </Field>
            <Field label="Bitiş">
              <input
                type="date"
                className={inputClass}
                value={newPhaseEnd}
                onChange={(e) => setNewPhaseEnd(e.target.value)}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <GhostButton onClick={() => setNewPhaseModalOpen(false)}>İptal</GhostButton>
            <GoldButton
              disabled={busy || !newPhaseName.trim() || !newPhaseTitle.trim()}
              onClick={async () => {
                const ok = await runAction(
                  {
                    action: 'create_phase',
                    name: newPhaseName,
                    title: newPhaseTitle,
                    startDate: newPhaseStart,
                    endDate: newPhaseEnd,
                    setActive: true,
                  },
                  `${newPhaseName} oluşturuldu ve aktif faz yapıldı.`,
                )
                if (ok) {
                  setNewPhaseModalOpen(false)
                  setNewPhaseName('')
                  setNewPhaseTitle('')
                }
              }}
            >
              Oluştur & Aktif Yap
            </GoldButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}
