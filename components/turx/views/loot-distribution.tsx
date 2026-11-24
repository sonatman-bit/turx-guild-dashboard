'use client'

import {
  AlertTriangle,
  Award,
  BookOpen,
  Coins,
  Dices,
  Edit3,
  Hammer,
  Plus,
  RotateCcw,
  Search,
  Skull,
  Sparkles,
  Swords,
  Trash2,
  Zap,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { CLASS_COLORS, type WowClass } from '@/lib/guild-data'
import {
  ALL_SPEC_LABELS,
  characterMatchesSpecLabel,
  getActiveLootRoundState,
  getSpecColor,
  getSpecWowClass,
  hasCharacterReceivedItem,
  LOOT_PRIORITY_PRESETS,
  RAID_CATALOG,
  WOW_ITEM_ICON_PRESETS,
  type LootItem,
  type ProfessionLead,
  type WowItemQuality,
  type WowItemTooltipData,
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
import { WowItemHeaderWithTooltip, WowItemIcon } from '../wow-item-tooltip'

export function LootDistributionView() {
  const toast = useToast()
  const { data, loading, busy, error, postAction } = useRaidSystem()

  const [subTab, setSubTab] = useState<'items' | 'boe-bop'>('items')
  const [selectedRaidId, setSelectedRaidId] = useState<string>('all')
  const [selectedBoss, setSelectedBoss] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [liveRaidEventId, setLiveRaidEventId] = useState<string>('')

  // Award Slot modal
  const [awardTarget, setAwardTarget] = useState<{
    item: LootItem
    roundIndex: number
    roundNumber: number
    slotIndex: number
    specLabel: string
  } | null>(null)
  const [awardSelectedUsername, setAwardSelectedUsername] = useState('')
  const [awardCustomName, setAwardCustomName] = useState('')
  const [awardNote, setAwardNote] = useState('')

  // Add / Edit Item modal
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<LootItem | null>(null)
  const [formRaidId, setFormRaidId] = useState('barrow')
  const [formBossName, setFormBossName] = useState(RAID_CATALOG[0].bosses[0])
  const [formItemName, setFormItemName] = useState('')
  const [formItemSlot, setFormItemSlot] = useState('Trinket')
  const [formIcon, setFormIcon] = useState('inv_jewelry_talisman_01')
  const [formQuality, setFormQuality] = useState<WowItemQuality>('epic')
  const [formItemLevel, setFormItemLevel] = useState('60')
  const [formStatsText, setFormStatsText] = useState('')
  const [formEffectsText, setFormEffectsText] = useState('')
  const [formUnique, setFormUnique] = useState(true)
  const [formNotes, setFormNotes] = useState('')
  const [formWowheadUrl, setFormWowheadUrl] = useState('')
  const [formPriorityOrder, setFormPriorityOrder] = useState<string[]>([
    'Tank Warrior',
    'Tank Paladin',
    'Rogue',
    'Fury Warrior',
    'Hunter',
  ])
  const [specToAdd, setSpecToAdd] = useState<string>('Tank Warrior')

  // BoE & BoP Recipe forms
  const [boeModalOpen, setBoeModalOpen] = useState(false)
  const [boeRaidId, setBoeRaidId] = useState('barrow')
  const [boeItemName, setBoeItemName] = useState('')
  const [boeGold, setBoeGold] = useState('')
  const [boeNote, setBoeNote] = useState('')

  const [recipeModalOpen, setRecipeModalOpen] = useState(false)
  const [rcpRaidId, setRcpRaidId] = useState('barrow')
  const [rcpName, setRcpName] = useState('')
  const [rcpProf, setRcpProf] = useState('Alchemy')
  const [rcpRecipient, setRcpRecipient] = useState('')
  const [rcpClass, setRcpClass] = useState<WowClass>('Warrior')
  const [rcpType, setRcpType] = useState<'MESLEK_SORUMLUSU' | 'MIN_300_ROLL'>('MESLEK_SORUMLUSU')

  // GM Profession Lead editing
  const [editingLeads, setEditingLeads] = useState<ProfessionLead[] | null>(null)

  const rs = data?.raidSystem
  const isOfficer = Boolean(data?.isOfficer)
  const isGm = Boolean(data?.isGm)
  const leaderboard = data?.attendanceLeaderboard || []
  const guildMembers = data?.guildMembers || []

  const pointsByUser = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of leaderboard) {
      map.set(row.username.toLowerCase(), row.totalPoints)
    }
    return map
  }, [leaderboard])

  const activeRaidEvents = useMemo(
    () => (rs?.events || []).filter((e) => e.status !== 'ARCHIVED'),
    [rs?.events],
  )

  const selectedLiveEvent = useMemo(
    () => activeRaidEvents.find((e) => e.id === liveRaidEventId) || null,
    [activeRaidEvents, liveRaidEventId],
  )

  const phaseItems = useMemo(() => {
    if (!rs) return []
    const activePhaseId = rs.settings.activePhaseId
    return rs.lootItems.filter((item) => {
      if (item.phaseId !== activePhaseId) return false
      if (selectedRaidId !== 'all' && item.raidId !== selectedRaidId) return false
      if (selectedBoss !== 'all' && item.bossName !== selectedBoss) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const hay = `${item.itemName} ${item.bossName} ${item.itemSlot} ${item.priorityOrder.join(' ')}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [rs, selectedRaidId, selectedBoss, searchQuery])

  const bossesForFilter = useMemo(() => {
    const present = new Set<string>()
    for (const item of rs?.lootItems || []) {
      if (selectedRaidId === 'all' || item.raidId === selectedRaidId) {
        present.add(item.bossName)
      }
    }
    const ordered: string[] = []
    for (const raid of RAID_CATALOG) {
      if (selectedRaidId !== 'all' && raid.id !== selectedRaidId) continue
      for (const b of raid.bosses) {
        if (present.has(b) && !ordered.includes(b)) ordered.push(b)
      }
    }
    for (const b of present) {
      if (!ordered.includes(b)) ordered.push(b)
    }
    return ordered
  }, [rs?.lootItems, selectedRaidId])

  const groupedByRaidAndBoss = useMemo(() => {
    const raidMap = new Map<
      string,
      {
        raidId: string
        raidName: string
        raidSize?: number
        bossMap: Map<string, LootItem[]>
      }
    >()

    // Seed raids in catalog order
    for (const r of RAID_CATALOG) {
      raidMap.set(r.id, {
        raidId: r.id,
        raidName: r.name,
        raidSize: r.size,
        bossMap: new Map<string, LootItem[]>(),
      })
    }

    for (const item of phaseItems) {
      let raidEntry = raidMap.get(item.raidId)
      if (!raidEntry) {
        raidEntry = {
          raidId: item.raidId,
          raidName: item.raidId,
          bossMap: new Map<string, LootItem[]>(),
        }
        raidMap.set(item.raidId, raidEntry)
      }
      const list = raidEntry.bossMap.get(item.bossName) || []
      list.push(item)
      raidEntry.bossMap.set(item.bossName, list)
    }

    const result: {
      raidId: string
      raidName: string
      raidSize?: number
      bosses: { bossName: string; items: LootItem[] }[]
    }[] = []

    for (const raidEntry of raidMap.values()) {
      if (raidEntry.bossMap.size === 0) continue
      const catalogRaid = RAID_CATALOG.find((r) => r.id === raidEntry.raidId)
      const bosses: { bossName: string; items: LootItem[] }[] = []

      if (catalogRaid) {
        for (const bName of catalogRaid.bosses) {
          const items = raidEntry.bossMap.get(bName)
          if (items && items.length > 0) {
            bosses.push({ bossName: bName, items })
          }
        }
      }
      for (const [bName, items] of raidEntry.bossMap.entries()) {
        if (!bosses.some((b) => b.bossName === bName)) {
          bosses.push({ bossName: bName, items })
        }
      }

      result.push({
        raidId: raidEntry.raidId,
        raidName: raidEntry.raidName,
        raidSize: raidEntry.raidSize,
        bosses,
      })
    }

    return result
  }, [phaseItems])

  // Compute ranked candidates for the currently opened Award Slot modal
  const awardCandidates = useMemo(() => {
    if (!awardTarget) return []
    const sourcePool = selectedLiveEvent
      ? selectedLiveEvent.signups
          .filter((s) => s.assignment !== 'POOL' && s.confirmStatus !== 'DECLINED_EXCUSED')
          .map((s) => ({
            username: s.username,
            characterName: s.characterName,
            wowClass: s.wowClass,
            spec: s.spec,
            role: s.role,
            inActiveRaid: true,
          }))
      : guildMembers.map((m) => ({
          username: m.username,
          characterName: m.characterName,
          wowClass: m.wowClass,
          spec: m.spec,
          role: m.role,
          inActiveRaid: false,
        }))

    return sourcePool
      .map((c) => {
        const matches = characterMatchesSpecLabel(c, awardTarget.specLabel)
        const points = pointsByUser.get(c.username.toLowerCase()) ?? 0
        const alreadyOwns = hasCharacterReceivedItem(awardTarget.item, c.username, c.characterName)
        return { ...c, matches, points, alreadyOwns }
      })
      .sort((a, b) => {
        if (a.matches !== b.matches) return a.matches ? -1 : 1
        if (a.alreadyOwns !== b.alreadyOwns) return a.alreadyOwns ? 1 : -1
        if (b.points !== a.points) return b.points - a.points
        return a.characterName.localeCompare(b.characterName, 'tr')
      })
  }, [awardTarget, selectedLiveEvent, guildMembers, pointsByUser])

  const eligibleMatchingTop = useMemo(() => {
    const eligible = awardCandidates.filter((c) => c.matches && !c.alreadyOwns)
    if (eligible.length < 2) return { tie: false, topPoints: eligible[0]?.points ?? 0, tiedNames: [] as string[] }
    const topPts = eligible[0].points
    const tied = eligible.filter((c) => c.points === topPts)
    return {
      tie: tied.length >= 2,
      topPoints: topPts,
      tiedNames: tied.map((c) => c.characterName),
    }
  }, [awardCandidates])

  const runAction = async (payload: Record<string, unknown>, successMsg: string) => {
    try {
      await postAction(payload)
      toast({ title: 'Kaydedildi', description: successMsg })
      return true
    } catch (err) {
      toast({
        title: 'Hata',
        description: err instanceof Error ? err.message : 'İşlem tamamlanamadı.',
      })
      return false
    }
  }

  const openAddItemModal = () => {
    setEditingItem(null)
    setFormRaidId(selectedRaidId !== 'all' ? selectedRaidId : 'barrow')
    const cat = RAID_CATALOG.find((r) => r.id === (selectedRaidId !== 'all' ? selectedRaidId : 'barrow')) || RAID_CATALOG[0]
    setFormBossName(cat.bosses[0])
    setFormItemName('')
    setFormItemSlot('Trinket')
    setFormIcon('inv_jewelry_talisman_01')
    setFormQuality('epic')
    setFormItemLevel('60')
    setFormStatsText('')
    setFormEffectsText('')
    setFormUnique(true)
    setFormNotes('')
    setFormWowheadUrl('')
    setFormPriorityOrder([...LOOT_PRIORITY_PRESETS[0].order])
    setItemModalOpen(true)
  }

  const openEditItemModal = (item: LootItem) => {
    setEditingItem(item)
    setFormRaidId(item.raidId)
    setFormBossName(item.bossName)
    setFormItemName(item.itemName)
    setFormItemSlot(item.itemSlot)
    setFormIcon(item.icon || 'inv_jewelry_talisman_01')
    setFormQuality(item.tooltip?.quality || 'epic')
    setFormItemLevel(String(item.tooltip?.itemLevel || 60))
    setFormStatsText((item.tooltip?.stats || []).join('\n'))
    setFormEffectsText((item.tooltip?.effects || []).join('\n'))
    setFormUnique(Boolean(item.unique))
    setFormNotes(item.notes || '')
    setFormWowheadUrl(item.wowheadUrl || '')
    setFormPriorityOrder([...item.priorityOrder])
    setItemModalOpen(true)
  }

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formItemName.trim() || formPriorityOrder.length === 0) return

    const statsLines = formStatsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    const effectsLines = formEffectsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)

    const tooltipPayload: WowItemTooltipData = {
      ...(editingItem?.tooltip || {}),
      quality: formQuality,
      itemLevel: Number(formItemLevel) || 60,
      bindType: editingItem?.tooltip?.bindType || 'Binds when picked up',
      slotLeft: editingItem?.tooltip?.slotLeft || formItemSlot,
      requiredLevel: editingItem?.tooltip?.requiredLevel || 60,
      stats: statsLines.length > 0 ? statsLines : undefined,
      effects: effectsLines.length > 0 ? effectsLines : undefined,
    }

    const ok = await runAction(
      editingItem
        ? {
            action: 'update_loot_item',
            itemId: editingItem.id,
            bossName: formBossName,
            itemName: formItemName,
            itemSlot: formItemSlot,
            icon: formIcon,
            tooltip: tooltipPayload,
            unique: formUnique,
            discovered: true,
            notes: formNotes,
            wowheadUrl: formWowheadUrl,
            priorityOrder: formPriorityOrder,
          }
        : {
            action: 'add_loot_item',
            raidId: formRaidId,
            bossName: formBossName,
            itemName: formItemName,
            itemSlot: formItemSlot,
            icon: formIcon,
            tooltip: tooltipPayload,
            unique: formUnique,
            discovered: true,
            notes: formNotes,
            wowheadUrl: formWowheadUrl,
            priorityOrder: formPriorityOrder,
          },
      editingItem ? 'Item öncelik listesi güncellendi.' : 'Yeni item loot listesine eklendi.',
    )
    if (ok) setItemModalOpen(false)
  }

  const handleAwardConfirm = async () => {
    if (!awardTarget) return
    const chosen = awardCandidates.find((c) => c.username === awardSelectedUsername)
    const charName = chosen?.characterName || awardCustomName.trim()
    if (!charName) {
      toast({ title: 'Karakter Seçin', description: 'Loot alacak oyuncuyu seçin veya karakter adı yazın.' })
      return
    }
    const ok = await runAction(
      {
        action: 'award_loot_slot',
        itemId: awardTarget.item.id,
        roundIndex: awardTarget.roundIndex,
        slotIndex: awardTarget.slotIndex,
        award: {
          characterName: charName,
          username: chosen?.username || charName,
          wowClass: chosen?.wowClass || getSpecWowClass(awardTarget.specLabel),
          spec: chosen?.spec || awardTarget.specLabel,
          raidEventId: selectedLiveEvent?.id,
          note: awardNote,
        },
      },
      `${awardTarget.item.itemName} → ${charName} (#${awardTarget.slotIndex + 1} ${awardTarget.specLabel}) olarak işlendi!`,
    )
    if (ok) {
      setAwardTarget(null)
      setAwardSelectedUsername('')
      setAwardCustomName('')
      setAwardNote('')
    }
  }

  if (loading) {
    return (
      <Panel className="py-12 text-center text-sm text-muted-foreground">
        Loot dağıtım listesi yükleniyor...
      </Panel>
    )
  }

  if (error || !rs) {
    return (
      <Panel className="border-rose-500/30 py-10 text-center text-sm text-rose-300">
        {error || 'Loot verileri yüklenemedi.'}
      </Panel>
    )
  }

  const activePhase = rs.phases.find((p) => p.id === rs.settings.activePhaseId)

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={`${activePhase?.name || 'Phase 1'} · ŞEFFAF LOOT SİSTEMİ`}
        title="Loot Dağıtım Listesi & Öncelik Rotasyonu"
        description="Her item için sınıf/spec öncelik kutuları 7/24 açıktır. Sıradaki sınıf raidde yoksa sonraki uygun kutu dolar, atlanan kutu açık (öncelikli) kalır. Aynı spec'te eşitlikte devam puanı, puanda da eşitlikte zar belirler."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-border bg-[#071422] p-1">
              <button
                onClick={() => setSubTab('items')}
                className={cn(
                  'cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition',
                  subTab === 'items' ? 'bg-neon/15 text-neon' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Raid Item Listesi
              </button>
              <button
                onClick={() => setSubTab('boe-bop')}
                className={cn(
                  'cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition',
                  subTab === 'boe-bop' ? 'bg-gold/15 text-gold' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                BoE & BoP Tarifler
              </button>
            </div>
            {isOfficer && subTab === 'items' && (
              <>
                <GhostButton
                  disabled={busy}
                  onClick={() => {
                    if (
                      typeof window !== 'undefined' &&
                      !window.confirm('Aktif fazdaki loot listesi varsayılan WoW: Forever önizleme listesi ile yenilensin mi?')
                    ) {
                      return
                    }
                    void runAction(
                      { action: 'reset_simulation_loot' },
                      'WoW: Forever önizleme loot listesi yüklendi!',
                    )
                  }}
                  className="px-3 py-2 text-xs"
                >
                  <RotateCcw className="size-3.5" />
                  Önizleme Listesini Yükle
                </GhostButton>
                <GoldButton onClick={openAddItemModal}>
                  <Plus className="size-4" />
                  Yeni Item Ekle
                </GoldButton>
              </>
            )}
          </div>
        }
      />

      {subTab === 'items' && (
        <>
          {/* Live Raid Quick-Distribute Bar (Officer/GM) */}
          {isOfficer && (
            <Panel className="border-neon/30 bg-gradient-to-r from-neon/10 via-[#0a1c30] to-transparent">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <Zap className="mt-0.5 size-5 shrink-0 text-neon" />
                  <div>
                    <p className="font-display text-sm font-bold text-foreground">
                      Canlı Raid Hızlı Dağıtım Modu
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Aktif bir raid seçerseniz, kutuya tıkladığınızda sistem sadece o raiddeki oyuncuları devam puanına göre sıralar ve zar durumunu uyarır.
                    </p>
                  </div>
                </div>
                <select
                  value={liveRaidEventId}
                  onChange={(e) => setLiveRaidEventId(e.target.value)}
                  className="min-w-[240px] rounded-lg border border-neon/40 bg-[#071422] px-3 py-2 text-xs text-foreground focus:border-neon focus:outline-none"
                >
                  <option value="">Tüm Guild Üyeleri (Genel Mod)</option>
                  {activeRaidEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      Canlı Raid: {ev.raidName} ({ev.signups.length} kayıt)
                    </option>
                  ))}
                </select>
              </div>
            </Panel>
          )}

          {/* WoW Forever Beta Preview Banner */}
          <div className="flex items-start gap-3 rounded-xl border border-gold/25 bg-gold/5 px-4 py-3 text-xs text-silver">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-gold" />
            <p>
              <strong className="text-gold">WoW: Forever Beta Önizleme:</strong> Barrow Deeps ve Hyjal Summit resmi drop tabloları açılışa kadar gizli olduğu için, sistemin nasıl işleyeceğini görmek amacıyla WoW: Forever dungeon Pre-BiS itemları 3 raid ve bosslarına örnek olarak yerleştirilmiştir. Yeni itemlar keşfedildikçe yetkililer anında güncelleyebilir.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex flex-wrap rounded-lg border border-border bg-[#071422] p-1">
              <button
                onClick={() => {
                  setSelectedRaidId('all')
                  setSelectedBoss('all')
                }}
                className={cn(
                  'cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition',
                  selectedRaidId === 'all' ? 'bg-gold/15 text-gold' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Tüm Raidler
              </button>
              {RAID_CATALOG.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelectedRaidId(r.id)
                    setSelectedBoss('all')
                  }}
                  className={cn(
                    'cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition',
                    selectedRaidId === r.id ? 'bg-neon/15 text-neon' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {r.name}
                </button>
              ))}
            </div>

            <select
              value={selectedBoss}
              onChange={(e) => setSelectedBoss(e.target.value)}
              className="rounded-lg border border-input bg-[#071422] px-3 py-2 text-xs text-foreground"
            >
              <option value="all">Tüm Bosslar</option>
              {bossesForFilter.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Item, boss veya sınıf ara (örn: Trinket, Tank Warrior)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(inputClass, 'pl-8 text-xs')}
              />
            </div>
          </div>

          {/* Loot Item Cards Grouped by Raid & Boss */}
          {groupedByRaidAndBoss.length === 0 ? (
            <Panel className="py-12 text-center text-sm text-muted-foreground">
              Seçili filtreye uygun item bulunamadı.
            </Panel>
          ) : (
            <div className="space-y-8">
              {groupedByRaidAndBoss.map((raidGroup) => (
                <section key={raidGroup.raidId} className="space-y-5">
                  {/* Raid Section Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gold/25 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex size-8 items-center justify-center rounded-lg border border-gold/40 bg-gold/10 text-gold">
                        <Swords className="size-4" />
                      </span>
                      <div>
                        <h2 className="font-display text-lg font-bold tracking-wide text-gold">
                          {raidGroup.raidName}
                        </h2>
                        {raidGroup.raidSize && (
                          <p className="text-[11px] text-muted-foreground">
                            {raidGroup.raidSize} Kişilik Raid
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Separate Boss Groups inside this Raid */}
                  <div className="space-y-6">
                    {raidGroup.bosses.map((bossGroup) => (
                      <div key={`${raidGroup.raidId}-${bossGroup.bossName}`} className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                          <Skull className="size-4 shrink-0 text-neon" />
                          <h3 className="font-display text-sm font-bold tracking-wide text-foreground">
                            {bossGroup.bossName}
                          </h3>
                          <span className="h-px flex-1 bg-gradient-to-r from-neon/30 to-transparent" />
                        </div>

                        <div className="space-y-3">
                          {bossGroup.items.map((item) => {
                            const roundState = getActiveLootRoundState(item)
                            const displayRound = roundState.allFilledInLatest
                              ? { roundNumber: roundState.roundNumber, slots: item.priorityOrder.map(() => null) }
                              : item.rounds[roundState.roundIndex] || {
                                  roundNumber: 1,
                                  slots: item.priorityOrder.map(() => null),
                                }
                            const completedRounds = roundState.allFilledInLatest
                              ? item.rounds
                              : item.rounds.slice(0, roundState.roundIndex)

                            return (
                              <Panel key={item.id} className="border-border/80 transition hover:border-gold/30">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2.5">
                                      <WowItemHeaderWithTooltip item={item} />
                                      <Badge className="border-border bg-white/5 text-silver">{item.itemSlot}</Badge>
                                      {item.unique && (
                                        <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-300">
                                          Unique
                                        </Badge>
                                      )}
                                      {item.discovered === false && (
                                        <Badge className="border-purple-400/30 bg-purple-500/10 text-purple-300">
                                          Canlı Keşif Şablonu
                                        </Badge>
                                      )}
                                    </div>
                                    {item.notes && <p className="mt-1.5 text-xs text-muted-foreground">{item.notes}</p>}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <Badge className="border-gold/35 bg-gold/10 text-gold">
                                      Aktif Tur: #{roundState.roundNumber}
                                    </Badge>
                                    {isOfficer && (
                                      <>
                                        <button
                                          onClick={() => openEditItemModal(item)}
                                          className="cursor-pointer rounded-lg border border-border p-1.5 text-muted-foreground hover:border-neon/40 hover:text-neon"
                                          title="Item düzenle"
                                        >
                                          <Edit3 className="size-3.5" />
                                        </button>
                                        <button
                                          disabled={busy}
                                          onClick={() =>
                                            void runAction(
                                              { action: 'delete_loot_item', itemId: item.id },
                                              `${item.itemName} listeden kaldırıldı.`,
                                            )
                                          }
                                          className="cursor-pointer rounded-lg border border-rose-500/30 p-1.5 text-rose-400 hover:bg-rose-500/10"
                                          title="Item sil"
                                        >
                                          <Trash2 className="size-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Active Round Priority Boxes */}
                                <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
                                  {item.priorityOrder.map((specLabel, idx) => {
                                    const award = displayRound.slots[idx]
                                    const specColor = getSpecColor(specLabel)
                                    const isNextPriority = !award && idx === roundState.primarySlotIndex
                                    const isSkippedWaiting =
                                      !award &&
                                      idx <
                                        Math.max(
                                          -1,
                                          ...displayRound.slots.map((s, si) => (s ? si : -1)),
                                        )

                                    return (
                                      <div
                                        key={`${specLabel}-${idx}`}
                                        className={cn(
                                          'relative flex flex-col justify-between rounded-xl border p-3 transition',
                                          award
                                            ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
                                            : isNextPriority
                                              ? 'border-gold/70 bg-gold/[0.08] shadow-[0_0_18px_rgb(212_175_55/0.16)]'
                                              : 'border-border/70 bg-[#071422]/80',
                                        )}
                                      >
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="text-[11px] font-bold" style={{ color: specColor }}>
                                            {idx + 1}. {specLabel}
                                          </span>
                                          {isNextPriority && (
                                            <span className="rounded-full bg-gold/20 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-gold uppercase">
                                              {isSkippedWaiting ? 'Bekleyen Öncelik' : 'Sırada'}
                                            </span>
                                          )}
                                        </div>

                                        <div className="mt-2.5">
                                          {award ? (
                                            <div className="flex items-center justify-between gap-2">
                                              <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                  <p
                                                    className="truncate text-sm font-bold"
                                                    style={{ color: CLASS_COLORS[award.wowClass] || specColor }}
                                                  >
                                                    {award.characterName}
                                                  </p>
                                                  <PointsPill points={pointsByUser.get(award.username.toLowerCase()) ?? 0} />
                                                </div>
                                                <p className="text-[10px] text-muted-foreground">
                                                  {new Date(award.awardedAt).toLocaleDateString('tr-TR')}
                                                </p>
                                              </div>
                                              {isOfficer && (
                                                <button
                                                  disabled={busy}
                                                  onClick={() =>
                                                    void runAction(
                                                      {
                                                        action: 'clear_loot_slot',
                                                        itemId: item.id,
                                                        roundIndex: roundState.roundIndex,
                                                        slotIndex: idx,
                                                      },
                                                      'Kutu boşaltıldı (geri alındı).',
                                                    )
                                                  }
                                                  className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-300"
                                                  title="Atamayı geri al"
                                                >
                                                  <RotateCcw className="size-3.5" />
                                                </button>
                                              )}
                                            </div>
                                          ) : isOfficer ? (
                                            <button
                                              disabled={busy}
                                              onClick={() => {
                                                setAwardTarget({
                                                  item,
                                                  roundIndex: roundState.roundIndex,
                                                  roundNumber: roundState.roundNumber,
                                                  slotIndex: idx,
                                                  specLabel,
                                                })
                                                setAwardSelectedUsername('')
                                                setAwardCustomName('')
                                                setAwardNote('')
                                              }}
                                              className="w-full cursor-pointer rounded-lg border border-dashed border-neon/40 bg-neon/5 px-2.5 py-1.5 text-xs font-medium text-neon hover:bg-neon/15"
                                            >
                                              <Award className="mr-1 inline size-3.5" />
                                              Oyuncuya Ver
                                            </button>
                                          ) : (
                                            <p className="text-xs italic text-muted-foreground/70">Sıra bekleniyor...</p>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>

                                {/* Previous Completed Rounds History */}
                                {completedRounds.length > 0 && (
                                  <div className="mt-3 rounded-lg border border-border/50 bg-[#071422]/60 px-3 py-2 text-[11px] text-muted-foreground">
                                    <span className="font-semibold text-silver">Tamamlanan Turlar: </span>
                                    {completedRounds.map((r) => (
                                      <span key={r.roundNumber} className="mr-3 inline-flex flex-wrap items-center gap-1.5">
                                        <strong className="text-gold">Tur {r.roundNumber}:</strong>
                                        {r.slots.map((s, si) =>
                                          s ? (
                                            <span key={si} style={{ color: CLASS_COLORS[s.wowClass] || '#fff' }}>
                                              {si + 1}.{s.characterName}
                                            </span>
                                          ) : null,
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </Panel>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {/* Sub-Tab 2: BoE Guild Bank & BoP Recipes / Profession Leads */}
      {subTab === 'boe-bop' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* BoE Guild Bank Log */}
          <Panel className="border-gold/30">
            <PanelTitle
              icon={Coins}
              action={
                isOfficer && (
                  <GoldButton onClick={() => setBoeModalOpen(true)} className="px-3 py-1.5 text-xs">
                    <Plus className="size-3.5" />
                    BoE Ekle
                  </GoldButton>
                )
              }
            >
              BoE Eşyalar → Guild Banka Geliri
            </PanelTitle>
            <p className="mb-4 text-xs text-muted-foreground">
              Kural: Tüm raid içi BoE itemlar istisnasız Guild Bankasına gelir amaçlı (consumable/repair fonu) alınır ve burada şeffaf olarak takip edilir.
            </p>

            {rs.boeLogs.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">Henüz kaydedilen BoE drop yok.</p>
            ) : (
              <div className="space-y-2">
                {rs.boeLogs.map((boe) => (
                  <div
                    key={boe.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-[#071422] p-3 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-gold">{boe.itemName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {boe.raidName} · {new Date(boe.droppedAt).toLocaleDateString('tr-TR')}
                        {boe.goldValue ? ` · ${boe.goldValue}g` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOfficer ? (
                        <>
                          <select
                            value={boe.status}
                            disabled={busy}
                            onChange={(e) =>
                              void runAction(
                                { action: 'update_boe_status', id: boe.id, status: e.target.value },
                                'BoE durumu güncellendi.',
                              )
                            }
                            className="rounded border border-input bg-[#0b1b2d] px-2 py-1 text-[11px]"
                          >
                            <option value="BANKADA">Bankada</option>
                            <option value="AH_LISTELENDI">AH&apos;de</option>
                            <option value="SATILDI">Satıldı (Gelir)</option>
                          </select>
                          <button
                            onClick={() =>
                              void runAction({ action: 'delete_boe_log', id: boe.id }, 'BoE kaydı silindi.')
                            }
                            className="cursor-pointer p-1 text-rose-400 hover:bg-rose-500/10 rounded"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </>
                      ) : (
                        <Badge className="border-gold/30 bg-gold/10 text-gold">{boe.status}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Profession Leads & BoP Recipe Drops */}
          <div className="space-y-6">
            <Panel className="border-neon/30">
              <PanelTitle
                icon={Hammer}
                action={
                  isGm && (
                    <GhostButton
                      onClick={() => setEditingLeads(rs.settings.professionLeads.map((p) => ({ ...p })))}
                      className="px-3 py-1.5 text-xs"
                    >
                      <Edit3 className="size-3.5" />
                      GM Düzenle
                    </GhostButton>
                  )
                }
              >
                Guild Meslek Sorumluları (BoP Tarif Önceliği)
              </PanelTitle>
              <p className="mb-3 text-xs text-muted-foreground">
                Kural: Tüm BoP tarifler ilk düşüşte guildin belirlediği meslek sorumlusuna verilir (guild üyelerine ücretsiz/malzemesine craft şartıyla). Tekrar düşerse min 300 mesleğe sahip olanlar <strong>anında öğrenmek şartıyla</strong> rollar.
              </p>

              <div className="space-y-2">
                {rs.settings.professionLeads.map((lead) => (
                  <div
                    key={lead.profession}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-[#071422] px-3 py-2 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-neon">{lead.profession}</p>
                      {lead.notes && <p className="text-[10px] text-muted-foreground">{lead.notes}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        1. Sorumlu: <span className="text-gold">{lead.primaryChar || 'Atanmadı'}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Yedek: {lead.backupChar || 'Atanmadı'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel>
              <PanelTitle
                icon={BookOpen}
                action={
                  isOfficer && (
                    <GoldButton onClick={() => setRecipeModalOpen(true)} className="px-3 py-1.5 text-xs">
                      <Plus className="size-3.5" />
                      Tarif Kaydet
                    </GoldButton>
                  )
                }
              >
                Düşen BoP Tarif Geçmişi
              </PanelTitle>
              {rs.bopRecipes.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">Henüz BoP tarif kaydı yok.</p>
              ) : (
                <div className="space-y-2">
                  {rs.bopRecipes.map((rcp) => (
                    <div
                      key={rcp.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-[#071422] px-3 py-2 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-foreground">{rcp.recipeName}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {rcp.profession} ·{' '}
                          <span style={{ color: CLASS_COLORS[rcp.recipientClass] || '#fff' }} className="font-semibold">
                            {rcp.recipientName}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            rcp.distributionType === 'MESLEK_SORUMLUSU'
                              ? 'border-gold/30 bg-gold/10 text-gold'
                              : 'border-neon/30 bg-neon/10 text-neon'
                          }
                        >
                          {rcp.distributionType === 'MESLEK_SORUMLUSU' ? 'Sorumlu' : 'Min 300 Roll'}
                        </Badge>
                        {isOfficer && (
                          <button
                            onClick={() =>
                              void runAction({ action: 'delete_recipe_drop', id: rcp.id }, 'Tarif kaydı silindi.')
                            }
                            className="cursor-pointer rounded p-1 text-rose-400 hover:bg-rose-500/10"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}

      {/* Award Loot Slot Modal with Live Attendance Tie-Breaker */}
      <Modal
        open={Boolean(awardTarget)}
        onClose={() => setAwardTarget(null)}
        title={awardTarget ? `Loot Dağıt: ${awardTarget.item.itemName}` : 'Loot Dağıt'}
        description={
          awardTarget
            ? `Tur #${awardTarget.roundNumber} · Kutu #${awardTarget.slotIndex + 1}: ${awardTarget.specLabel} (${selectedLiveEvent ? `Canlı Raid: ${selectedLiveEvent.raidName}` : 'Tüm Guild Üyeleri'})`
            : undefined
        }
        className="max-w-xl"
      >
        {awardTarget && (
          <div className="space-y-4">
            {eligibleMatchingTop.tie && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/50 bg-amber-500/10 p-3 text-xs text-amber-200">
                <Dices className="mt-0.5 size-4 shrink-0 text-amber-300" />
                <div>
                  <p className="font-bold">PUAN EŞİTLİĞİ — ZAR ATILACAK (ROLL)!</p>
                  <p className="mt-0.5">
                    En yüksek devam puanında ({eligibleMatchingTop.topPoints}p) eşitlik var:{' '}
                    <strong>{eligibleMatchingTop.tiedNames.join(', ')}</strong>. Kazananı aşağıdan seçin.
                  </p>
                </div>
              </div>
            )}

            <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
              <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Öncelikli Adaylar (Devam Puanına Göre Sıralı)
              </p>
              {awardCandidates.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">Aday bulunamadı. Aşağıdan manuel isim yazabilirsiniz.</p>
              ) : (
                awardCandidates.slice(0, 25).map((c) => {
                  const selected = awardSelectedUsername === c.username
                  return (
                    <button
                      type="button"
                      key={c.username}
                      onClick={() => {
                        setAwardSelectedUsername(c.username)
                        setAwardCustomName('')
                      }}
                      className={cn(
                        'flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs transition',
                        selected
                          ? 'border-gold bg-gold/15'
                          : c.matches
                            ? 'border-neon/25 bg-[#071422] hover:border-neon/60'
                            : 'border-border/50 bg-[#071422]/50 opacity-65 hover:opacity-100',
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold" style={{ color: CLASS_COLORS[c.wowClass] || '#fff' }}>
                          {c.characterName}
                        </span>
                        <PointsPill points={c.points} />
                        <span className="text-[11px] text-muted-foreground">({c.spec})</span>
                        {c.matches && (
                          <Badge className="border-neon/30 bg-neon/10 text-[10px] text-neon">Uyumlu Spec</Badge>
                        )}
                        {c.alreadyOwns && (
                          <Badge className="border-rose-500/40 bg-rose-500/15 text-[10px] text-rose-300">
                            <AlertTriangle className="size-3" /> Zaten Aldı
                          </Badge>
                        )}
                      </div>
                      <span className="font-mono font-bold text-gold">{c.points}p</span>
                    </button>
                  )
                })
              )}
            </div>

            <Field label="Veya Manuel Karakter Adı-Soyadı">
              <input
                type="text"
                className={inputClass}
                placeholder="Listede yoksa karakter adı yazın..."
                value={awardCustomName}
                onChange={(e) => {
                  setAwardCustomName(e.target.value)
                  if (e.target.value.trim()) setAwardSelectedUsername('')
                }}
              />
            </Field>

            <Field label="Not (Opsiyonel)">
              <input
                type="text"
                className={inputClass}
                placeholder="Örn: 94 roll ile kazandı"
                value={awardNote}
                onChange={(e) => setAwardNote(e.target.value)}
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <GhostButton type="button" onClick={() => setAwardTarget(null)}>
                İptal
              </GhostButton>
              <GoldButton type="button" disabled={busy} onClick={() => void handleAwardConfirm()}>
                <Award className="size-4" />
                Kutuya İşle
              </GoldButton>
            </div>
          </div>
        )}
      </Modal>

      {/* Add/Edit Loot Item Modal with Priority Preset Templates */}
      <Modal
        open={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        title={editingItem ? 'Loot Item Düzenle' : 'Yeni Loot Item Ekle'}
        description="Hazır öncelik şablonlarından 1 tıkla seçim yapabilir veya sırayı özelleştirebilirsiniz."
        className="max-w-xl"
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Raid">
              <select
                className={inputClass}
                value={formRaidId}
                disabled={Boolean(editingItem)}
                onChange={(e) => {
                  setFormRaidId(e.target.value)
                  const cat = RAID_CATALOG.find((r) => r.id === e.target.value)
                  if (cat && cat.bosses[0]) setFormBossName(cat.bosses[0])
                }}
              >
                {RAID_CATALOG.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Boss Adı">
              <input
                type="text"
                list="boss-suggestions"
                required
                className={inputClass}
                value={formBossName}
                onChange={(e) => setFormBossName(e.target.value)}
              />
              <datalist id="boss-suggestions">
                {(RAID_CATALOG.find((r) => r.id === formRaidId)?.bosses || []).map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Item Adı">
              <input
                type="text"
                required
                className={inputClass}
                placeholder="Örn: Drake Fang Talisman"
                value={formItemName}
                onChange={(e) => setFormItemName(e.target.value)}
              />
            </Field>
            <Field label="Slot / Tür">
              <input
                type="text"
                className={inputClass}
                placeholder="Trinket, Sword, Ring..."
                value={formItemSlot}
                onChange={(e) => setFormItemSlot(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Item İkonu">
              <div className="flex items-center gap-2.5">
                <WowItemIcon icon={formIcon} quality={formQuality} size={48} alt="Önizleme" />
                <select
                  className={cn(inputClass, 'flex-1 text-xs')}
                  value={formIcon}
                  onChange={(e) => setFormIcon(e.target.value)}
                >
                  {WOW_ITEM_ICON_PRESETS.map((ic) => (
                    <option key={ic.slug} value={ic.slug}>
                      {ic.label}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
            <Field label="Kalite (Renk)">
              <select
                className={cn(inputClass, 'text-xs')}
                value={formQuality}
                onChange={(e) => setFormQuality(e.target.value as WowItemQuality)}
              >
                <option value="epic">Epic (Mor)</option>
                <option value="rare">Rare (Mavi)</option>
                <option value="legendary">Legendary (Turuncu)</option>
                <option value="uncommon">Uncommon (Yeşil)</option>
              </select>
            </Field>
            <Field label="Item Level">
              <input
                type="number"
                className={cn(inputClass, 'text-xs')}
                value={formItemLevel}
                onChange={(e) => setFormItemLevel(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Temel Statlar (Her satıra 1)" hint="Örn: +14 Stamina">
              <textarea
                rows={2}
                className={cn(inputClass, 'text-xs')}
                placeholder={'+14 Stamina\n+12 Intellect'}
                value={formStatsText}
                onChange={(e) => setFormStatsText(e.target.value)}
              />
            </Field>
            <Field label="Equip / Use Özellikleri (Yeşil)" hint="Her satıra 1 özellik">
              <textarea
                rows={2}
                className={cn(inputClass, 'text-xs')}
                placeholder={'Equip: Improves your chance to get a critical strike by 2%.'}
                value={formEffectsText}
                onChange={(e) => setFormEffectsText(e.target.value)}
              />
            </Field>
          </div>

          {/* Preset Templates */}
          <div>
            <p className="mb-1.5 text-xs font-medium tracking-wide text-silver uppercase">
              Hızlı Öncelik Şablonu Uygula (1 Tık)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {LOOT_PRIORITY_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.id}
                  onClick={() => setFormPriorityOrder([...preset.order])}
                  className="cursor-pointer rounded-md border border-neon/30 bg-neon/5 px-2.5 py-1 text-[11px] text-neon hover:bg-neon/15"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Editable Priority Order */}
          <div>
            <p className="mb-1.5 text-xs font-medium tracking-wide text-silver uppercase">
              Öncelik Sırası (1 → {formPriorityOrder.length})
            </p>
            <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-[#071422] p-2.5">
              {formPriorityOrder.map((sp, i) => (
                <span
                  key={`${sp}-${i}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-[#0d2238] px-2.5 py-1 text-xs font-semibold"
                  style={{ color: getSpecColor(sp) }}
                >
                  {i + 1}. {sp}
                  <button
                    type="button"
                    onClick={() => setFormPriorityOrder((prev) => prev.filter((_, idx) => idx !== i))}
                    className="cursor-pointer text-muted-foreground hover:text-rose-400"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <select
                className={cn(inputClass, 'flex-1 text-xs')}
                value={specToAdd}
                onChange={(e) => setSpecToAdd(e.target.value)}
              >
                {ALL_SPEC_LABELS.map((sp) => (
                  <option key={sp} value={sp}>
                    {sp}
                  </option>
                ))}
              </select>
              <GhostButton
                type="button"
                onClick={() => setFormPriorityOrder((prev) => [...prev, specToAdd])}
                className="text-xs"
              >
                + Sıraya Ekle
              </GhostButton>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-silver">
              <input
                type="checkbox"
                checked={formUnique}
                onChange={(e) => setFormUnique(e.target.checked)}
                className="size-4 accent-[#00f2fe]"
              />
              Unique Item (Aynı kişiye 2. kez verilemez uyarısı)
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Wowhead Linki (Opsiyonel)">
              <input
                type="url"
                className={inputClass}
                placeholder="https://www.wowhead.com/forever/item=..."
                value={formWowheadUrl}
                onChange={(e) => setFormWowheadUrl(e.target.value)}
              />
            </Field>
            <Field label="Not (Opsiyonel)">
              <input
                type="text"
                className={inputClass}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <GhostButton type="button" onClick={() => setItemModalOpen(false)}>
              İptal
            </GhostButton>
            <GoldButton type="submit" disabled={busy}>
              Kaydet
            </GoldButton>
          </div>
        </form>
      </Modal>

      {/* Add BoE Modal */}
      <Modal open={boeModalOpen} onClose={() => setBoeModalOpen(false)} title="BoE Guild Banka Kaydı Ekle">
        <div className="space-y-4">
          <Field label="Raid">
            <select className={inputClass} value={boeRaidId} onChange={(e) => setBoeRaidId(e.target.value)}>
              {RAID_CATALOG.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="BoE Item Adı">
            <input
              type="text"
              className={inputClass}
              value={boeItemName}
              onChange={(e) => setBoeItemName(e.target.value)}
              placeholder="Örn: Belt of Might"
            />
          </Field>
          <Field label="Tahmini / Satış Değeri (Gold, Opsiyonel)">
            <input
              type="number"
              className={inputClass}
              value={boeGold}
              onChange={(e) => setBoeGold(e.target.value)}
            />
          </Field>
          <Field label="Not">
            <input type="text" className={inputClass} value={boeNote} onChange={(e) => setBoeNote(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <GhostButton type="button" onClick={() => setBoeModalOpen(false)}>
              İptal
            </GhostButton>
            <GoldButton
              type="button"
              disabled={busy || !boeItemName.trim()}
              onClick={async () => {
                const raid = RAID_CATALOG.find((r) => r.id === boeRaidId)
                const ok = await runAction(
                  {
                    action: 'add_boe_log',
                    raidId: boeRaidId,
                    raidName: raid?.name || boeRaidId,
                    itemName: boeItemName,
                    goldValue: boeGold ? Number(boeGold) : undefined,
                    note: boeNote,
                  },
                  'BoE Guild Banka kaydı eklendi.',
                )
                if (ok) {
                  setBoeModalOpen(false)
                  setBoeItemName('')
                  setBoeGold('')
                  setBoeNote('')
                }
              }}
            >
              Kaydet
            </GoldButton>
          </div>
        </div>
      </Modal>

      {/* Add BoP Recipe Drop Modal */}
      <Modal open={recipeModalOpen} onClose={() => setRecipeModalOpen(false)} title="BoP Tarif Dağıtımı Kaydet">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Raid">
              <select className={inputClass} value={rcpRaidId} onChange={(e) => setRcpRaidId(e.target.value)}>
                {RAID_CATALOG.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Meslek">
              <select className={inputClass} value={rcpProf} onChange={(e) => setRcpProf(e.target.value)}>
                {rs.settings.professionLeads.map((p) => (
                  <option key={p.profession} value={p.profession}>
                    {p.profession}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Tarif Adı">
            <input
              type="text"
              className={inputClass}
              value={rcpName}
              onChange={(e) => setRcpName(e.target.value)}
              placeholder="Örn: Formula: Enchant Weapon - Spell Power"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Alan Karakter">
              <input
                type="text"
                className={inputClass}
                value={rcpRecipient}
                onChange={(e) => setRcpRecipient(e.target.value)}
              />
            </Field>
            <Field label="Sınıf">
              <select
                className={inputClass}
                value={rcpClass}
                onChange={(e) => setRcpClass(e.target.value as WowClass)}
              >
                {(Object.keys(CLASS_COLORS) as WowClass[]).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Dağıtım Türü">
            <select
              className={inputClass}
              value={rcpType}
              onChange={(e) => setRcpType(e.target.value as 'MESLEK_SORUMLUSU' | 'MIN_300_ROLL')}
            >
              <option value="MESLEK_SORUMLUSU">İlk Düşüş → Guild Meslek Sorumlusu</option>
              <option value="MIN_300_ROLL">Tekrar Düşüş → Min 300 Anında Öğrenme Roll</option>
            </select>
          </Field>
          <div className="flex justify-end gap-2">
            <GhostButton type="button" onClick={() => setRecipeModalOpen(false)}>
              İptal
            </GhostButton>
            <GoldButton
              type="button"
              disabled={busy || !rcpName.trim() || !rcpRecipient.trim()}
              onClick={async () => {
                const raid = RAID_CATALOG.find((r) => r.id === rcpRaidId)
                const ok = await runAction(
                  {
                    action: 'add_recipe_drop',
                    raidId: rcpRaidId,
                    raidName: raid?.name || rcpRaidId,
                    recipeName: rcpName,
                    profession: rcpProf,
                    recipientName: rcpRecipient,
                    recipientClass: rcpClass,
                    distributionType: rcpType,
                  },
                  'BoP tarif dağıtımı kaydedildi.',
                )
                if (ok) {
                  setRecipeModalOpen(false)
                  setRcpName('')
                  setRcpRecipient('')
                }
              }}
            >
              Kaydet
            </GoldButton>
          </div>
        </div>
      </Modal>

      {/* GM Edit Profession Leads Modal */}
      <Modal
        open={Boolean(editingLeads)}
        onClose={() => setEditingLeads(null)}
        title="GM: Meslek Sorumlularını Belirle"
        description="BoP tariflerin ilk düşüşte verileceği 1. ve Yedek meslek sorumlularını belirleyin."
        className="max-w-xl"
      >
        {editingLeads && (
          <div className="space-y-3">
            {editingLeads.map((lead, idx) => (
              <div key={lead.profession} className="grid gap-2 rounded-lg border border-border/70 bg-[#071422] p-3 sm:grid-cols-3">
                <div className="flex items-center font-semibold text-xs text-neon">{lead.profession}</div>
                <input
                  type="text"
                  placeholder="1. Sorumlu Karakter"
                  className={cn(inputClass, 'text-xs')}
                  value={lead.primaryChar}
                  onChange={(e) =>
                    setEditingLeads((prev) =>
                      prev ? prev.map((p, i) => (i === idx ? { ...p, primaryChar: e.target.value } : p)) : null,
                    )
                  }
                />
                <input
                  type="text"
                  placeholder="Yedek Sorumlu"
                  className={cn(inputClass, 'text-xs')}
                  value={lead.backupChar}
                  onChange={(e) =>
                    setEditingLeads((prev) =>
                      prev ? prev.map((p, i) => (i === idx ? { ...p, backupChar: e.target.value } : p)) : null,
                    )
                  }
                />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <GhostButton type="button" onClick={() => setEditingLeads(null)}>
                İptal
              </GhostButton>
              <GoldButton
                type="button"
                disabled={busy}
                onClick={async () => {
                  const ok = await runAction(
                    { action: 'update_profession_leads', professionLeads: editingLeads },
                    'Meslek sorumluları güncellendi.',
                  )
                  if (ok) setEditingLeads(null)
                }}
              >
                Kaydet
              </GoldButton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
