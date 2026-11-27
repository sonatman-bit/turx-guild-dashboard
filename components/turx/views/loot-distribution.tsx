'use client'

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Coins,
  Dices,
  Edit3,
  GripVertical,
  Hammer,
  Lock,
  Minus,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Skull,
  Sparkles,
  Swords,
  Trash2,
  X,
  Zap,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { CLASS_COLORS, type WowClass } from '@/lib/guild-data'
import {
  canonicalizeSpecLabel,
  characterMatchesTier,
  defaultQuotaForRaid,
  formatTierLabel,
  getActiveLootRoundState,
  getItemPriorityTiers,
  getRoundTierAwards,
  getSpecColor,
  getSpecWowClass,
  hasCharacterReceivedItem,
  RAID_CATALOG,
  WOW_ITEM_ICON_PRESETS,
  type LootItem,
  type LootPriorityTier,
  type ProfessionLead,
  type WowItemQuality,
  type WowItemTooltipData,
} from '@/lib/raid-loot-system'
import { useRaidSystem } from '@/lib/use-raid-system'
import { cn } from '@/lib/utils'
import { LootPhilosophyBanner } from '../loot-philosophy-banner'
import { RosterTemplatePanel } from '../roster-template-panel'
import { SpecIconPicker, SpecMiniIcon } from '../spec-icon-picker'
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
  const [liveRosterId, setLiveRosterId] = useState<string>('all')
  const [collapsedRaids, setCollapsedRaids] = useState<Record<string, boolean>>({})
  const [collapsedBosses, setCollapsedBosses] = useState<Record<string, boolean>>({})

  const toggleRaid = (raidId: string) =>
    setCollapsedRaids((prev) => ({ ...prev, [raidId]: !prev[raidId] }))
  const toggleBoss = (bossKey: string) =>
    setCollapsedBosses((prev) => ({ ...prev, [bossKey]: !prev[bossKey] }))

  // Award Slot modal
  const [awardTarget, setAwardTarget] = useState<{
    item: LootItem
    roundIndex: number
    roundNumber: number
    slotIndex: number
    tier: LootPriorityTier
    specLabel: string
    filledCount: number
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
  const [formNotes, setFormNotes] = useState('')
  const [formWowheadUrl, setFormWowheadUrl] = useState('')
  const [formPriorityTiers, setFormPriorityTiers] = useState<LootPriorityTier[]>([])
  const [draftTierSpecs, setDraftTierSpecs] = useState<string[]>([])
  const [quotaToAdd, setQuotaToAdd] = useState<number>(1)
  const [editingFormTierIdx, setEditingFormTierIdx] = useState<number | null>(null)

  // Direct on-card drag-and-drop & quick tier picker modal
  const [dragState, setDragState] = useState<{ itemId: string; fromIndex: number } | null>(null)
  const [dragOverState, setDragOverState] = useState<{ itemId: string; overIndex: number } | null>(null)
  const [quickTierModal, setQuickTierModal] = useState<{
    item: LootItem
    tierIndex: number | null
    specs: string[]
    quota: number
  } | null>(null)

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
          .filter((s) => {
            if (s.assignment === 'POOL' || s.confirmStatus === 'DECLINED_EXCUSED') return false
            if (liveRosterId !== 'all' && s.assignment !== liveRosterId) return false
            return true
          })
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
        const matches = characterMatchesTier(c, awardTarget.tier)
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
  }, [awardTarget, selectedLiveEvent, liveRosterId, guildMembers, pointsByUser])

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
    const initialRaidId = selectedRaidId !== 'all' ? selectedRaidId : 'barrow'
    const defQuota = defaultQuotaForRaid(initialRaidId)
    setFormRaidId(initialRaidId)
    const cat = RAID_CATALOG.find((r) => r.id === initialRaidId) || RAID_CATALOG[0]
    setFormBossName(cat.bosses[0])
    setFormItemName('')
    setFormItemSlot('Trinket')
    setFormIcon('inv_jewelry_talisman_01')
    setFormQuality('epic')
    setFormItemLevel('60')
    setFormStatsText('')
    setFormEffectsText('')
    setFormNotes('')
    setFormWowheadUrl('')
    setFormPriorityTiers([])
    setDraftTierSpecs([])
    setEditingFormTierIdx(null)
    setQuotaToAdd(defQuota)
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
    setFormNotes(item.notes || '')
    setFormWowheadUrl(item.wowheadUrl || '')
    setFormPriorityTiers(
      getItemPriorityTiers(item).map((t) => ({
        specs: t.specs.map(canonicalizeSpecLabel),
        quota: t.quota,
      })),
    )
    setDraftTierSpecs([])
    setEditingFormTierIdx(null)
    setQuotaToAdd(defaultQuotaForRaid(item.raidId))
    setItemModalOpen(true)
  }

  const persistItemTiers = async (
    item: LootItem,
    nextTiers: LootPriorityTier[],
    tierOrderMapping: number[] | undefined,
    successMsg: string,
  ) => {
    const cleaned = nextTiers
      .map((t) => ({
        specs: [...new Set(t.specs.map(canonicalizeSpecLabel).filter(Boolean))],
        quota: Math.max(1, Math.min(15, Math.floor(Number(t.quota) || 1))),
      }))
      .filter((t) => t.specs.length > 0)
    if (cleaned.length === 0) return false
    return runAction(
      {
        action: 'update_loot_item',
        itemId: item.id,
        priorityTiers: cleaned,
        priorityOrder: cleaned.map(formatTierLabel),
        tierOrderMapping,
      },
      successMsg,
    )
  }

  const handleSaveQuickTier = async () => {
    if (!quickTierModal || quickTierModal.specs.length === 0) {
      toast({ title: 'Sınıf / Spec Seçin', description: 'En az 1 sınıf/spec ikonu seçmelisiniz.' })
      return
    }
    const { item, tierIndex, specs, quota } = quickTierModal
    const currentTiers = getItemPriorityTiers(item).map((t) => ({
      specs: t.specs.map(canonicalizeSpecLabel),
      quota: t.quota,
    }))
    const nextTier: LootPriorityTier = {
      specs: [...new Set(specs.map(canonicalizeSpecLabel))],
      quota: Math.max(1, Math.min(15, Math.floor(quota) || 1)),
    }
    let nextTiers: LootPriorityTier[]
    let mapping: number[]
    if (tierIndex === null) {
      nextTiers = [...currentTiers, nextTier]
      mapping = [...currentTiers.map((_, i) => i), -1]
    } else {
      nextTiers = currentTiers.map((t, i) => (i === tierIndex ? nextTier : t))
      mapping = currentTiers.map((_, i) => i)
    }
    const ok = await persistItemTiers(
      item,
      nextTiers,
      mapping,
      tierIndex === null ? 'Yeni öncelik sırası eklendi.' : 'Öncelik sırası güncellendi.',
    )
    if (ok) setQuickTierModal(null)
  }

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault()
    const validTiers = formPriorityTiers
      .map((t) => ({
        specs: [...new Set(t.specs.map((s) => s.trim()).filter(Boolean))],
        quota: Math.max(1, Math.min(15, Math.floor(Number(t.quota) || 1))),
      }))
      .filter((t) => t.specs.length > 0)
    if (!formItemName.trim() || validTiers.length === 0) return
    const derivedOrder = validTiers.map(formatTierLabel)

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
            unique: true,
            discovered: true,
            notes: formNotes,
            wowheadUrl: formWowheadUrl,
            priorityOrder: derivedOrder,
            priorityTiers: validTiers,
          }
        : {
            action: 'add_loot_item',
            raidId: formRaidId,
            bossName: formBossName,
            itemName: formItemName,
            itemSlot: formItemSlot,
            icon: formIcon,
            tooltip: tooltipPayload,
            unique: true,
            discovered: true,
            notes: formNotes,
            wowheadUrl: formWowheadUrl,
            priorityOrder: derivedOrder,
            priorityTiers: validTiers,
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
    if (hasCharacterReceivedItem(awardTarget.item, chosen?.username || charName, charName)) {
      toast({
        title: 'Zaten Aldı',
        description: `${charName} bu itemı daha önce aldı. Aynı item aynı oyuncuya 2. kez verilemez.`,
      })
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
          wowClass: chosen?.wowClass || getSpecWowClass(awardTarget.tier.specs[0] || awardTarget.specLabel),
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
        eyebrow={`${activePhase?.name || 'Phase 1'} · ORTAK LOOT LİSTESİ`}
        title="Loot Sistemi & Öncelik Rotasyonu"
        description="Tüm lonca ve tüm raid grupları tek ortak öncelik listesiyle takip edilir. Varsayılan kota: 10-man 1 · 20-man 2 · 40-man 4 (item bazında özelleştirilebilir). Aynı öncelikte eşit paylaşımlı spec'ler Devam Puanı (eşitse zar) ile belirlenir."
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

      <LootPhilosophyBanner />

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
                      Aktif bir raid seçerseniz, bir öncelik sırasına tıkladığınızda sistem sadece o raiddeki oyuncuları devam puanına göre sıralar ve zar durumunu uyarır.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={liveRaidEventId}
                    onChange={(e) => {
                      setLiveRaidEventId(e.target.value)
                      setLiveRosterId('all')
                    }}
                    className="min-w-[220px] rounded-lg border border-neon/40 bg-[#071422] px-3 py-2 text-xs text-foreground focus:border-neon focus:outline-none"
                  >
                    <option value="">Tüm Guild Üyeleri (Genel Mod)</option>
                    {activeRaidEvents.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        Canlı Raid: {ev.raidName} ({ev.signups.length} kayıt)
                      </option>
                    ))}
                  </select>
                  {selectedLiveEvent && selectedLiveEvent.rosters.length > 1 && (
                    <select
                      value={liveRosterId}
                      onChange={(e) => setLiveRosterId(e.target.value)}
                      className="rounded-lg border border-gold/40 bg-[#071422] px-3 py-2 text-xs text-gold focus:border-gold focus:outline-none"
                    >
                      <option value="all">Tüm Gruplar ({selectedLiveEvent.rosters.length})</option>
                      {selectedLiveEvent.rosters.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </Panel>
          )}

          {/* TURX Hibrit Loot Kuralları Özeti */}
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-gold/30 bg-[#071422]/90 px-3.5 py-2.5 text-xs">
              <p className="flex items-center gap-1.5 font-display font-bold text-gold">
                <Lock className="size-3.5" /> Ortak Liste &amp; Faz Kilidi
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Tüm 10m / 20m / 40m grupları aynı ortak listeyi kullanır; liste faz başı lonca onayına açılır ve kilitlenir.
              </p>
            </div>
            <div className="rounded-xl border border-neon/30 bg-[#071422]/90 px-3.5 py-2.5 text-xs">
              <p className="flex items-center gap-1.5 font-display font-bold text-neon">
                <Award className="size-3.5" /> Sabit Kota (10m:1 · 20m:2 · 40m:4)
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Her öncelik kotası dolunca sıradaki önceliğe geçilir; o gün raidde olmayan sınıfın kalan kotası <em>Bekleyen Öncelik</em> olarak korunur.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-[#071422]/90 px-3.5 py-2.5 text-xs">
              <p className="flex items-center gap-1.5 font-display font-bold text-emerald-300">
                <ShieldCheck className="size-3.5" /> RCLootCouncil &amp; Minor Update
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Oyun içi talep toplar; karar bu listedendir. Gönüllü <em>Minor Update</em> ile sırayı veren oyuncunun önceliği açık kalır.
              </p>
            </div>
            <div className="rounded-xl border border-amber-400/30 bg-[#071422]/90 px-3.5 py-2.5 text-xs">
              <p className="flex items-center gap-1.5 font-display font-bold text-amber-300">
                <Dices className="size-3.5" /> Eşit Spec &amp; Puan → Zar
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Aynı öncelikte birden fazla uygun oyuncu (veya eşit paylaşımlı spec) varsa <strong>Devam Puanı</strong> yüksek olan (eşitse zar) alır.
              </p>
            </div>
          </div>

          {/* WoW Forever Beta Preview Banner */}
          <div className="flex items-start gap-3 rounded-xl border border-gold/25 bg-gold/5 px-4 py-3 text-xs text-silver">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-gold" />
            <p>
              <strong className="text-gold">WoW: Forever Beta Önizleme:</strong> Barrow Deeps ve Hyjal Summit resmi drop tabloları açılışa kadar gizli olduğu için, sistemin nasıl işleyeceğini görmek amacıyla WoW: Forever dungeon Pre-BiS itemları 3 raid ve bosslarına örnek olarak yerleştirilmiştir. Yeni itemlar keşfedildikçe yetkililer anında güncelleyebilir.
            </p>
          </div>

          {/* Anonymous 10 / 20 / 40-Man Roster Templates Publisher */}
          <RosterTemplatePanel
            templates={rs.settings.rosterTemplates}
            isOfficer={isOfficer}
            busy={busy}
            onSaveTemplate={(size, slots, msg) =>
              runAction({ action: 'update_roster_template', size, slots }, msg)
            }
          />

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
              {groupedByRaidAndBoss.map((raidGroup) => {
                const isRaidCollapsed = Boolean(collapsedRaids[raidGroup.raidId])
                return (
                <section key={raidGroup.raidId} className="space-y-5">
                  {/* Raid Section Header */}
                  <button
                    type="button"
                    onClick={() => toggleRaid(raidGroup.raidId)}
                    aria-expanded={!isRaidCollapsed}
                    className="group flex w-full cursor-pointer flex-wrap items-center justify-between gap-2 border-b border-gold/25 pb-2.5 text-left transition hover:border-gold/50"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex size-8 items-center justify-center rounded-lg border border-gold/40 bg-gold/10 text-gold">
                        <Swords className="size-4" />
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h2 className="font-display text-lg font-bold tracking-wide text-gold">
                            {raidGroup.raidName}
                          </h2>
                          <ChevronDown
                            className={cn(
                              'size-4 text-gold/80 transition-transform duration-200 group-hover:text-gold',
                              isRaidCollapsed && '-rotate-90',
                            )}
                          />
                        </div>
                        {raidGroup.raidSize && (
                          <p className="text-[11px] text-muted-foreground">
                            {raidGroup.raidSize} Kişilik Raid · {raidGroup.bosses.length} Boss
                          </p>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Separate Boss Groups inside this Raid */}
                  {!isRaidCollapsed && (
                  <div className="space-y-6">
                    {raidGroup.bosses.map((bossGroup) => {
                      const bossKey = `${raidGroup.raidId}-${bossGroup.bossName}`
                      const isBossCollapsed = Boolean(collapsedBosses[bossKey])
                      return (
                      <div key={bossKey} className="space-y-3">
                        <button
                          type="button"
                          onClick={() => toggleBoss(bossKey)}
                          aria-expanded={!isBossCollapsed}
                          className="group flex w-full cursor-pointer items-center gap-2 px-1 py-0.5 text-left"
                        >
                          <Skull className="size-4 shrink-0 text-neon" />
                          <h3 className="font-display text-sm font-bold tracking-wide text-foreground transition group-hover:text-neon">
                            {bossGroup.bossName}
                          </h3>
                          <ChevronDown
                            className={cn(
                              'size-3.5 shrink-0 text-neon/80 transition-transform duration-200 group-hover:text-neon',
                              isBossCollapsed && '-rotate-90',
                            )}
                          />
                          <span className="text-[11px] text-muted-foreground">({bossGroup.items.length})</span>
                          <span className="h-px flex-1 bg-gradient-to-r from-neon/30 to-transparent" />
                        </button>

                        {!isBossCollapsed && (
                        <div className="space-y-3">
                          {bossGroup.items.map((item) => {
                            const tiers = getItemPriorityTiers(item)
                            const roundState = getActiveLootRoundState(item)
                            const activeTierAwards = roundState.allFilledInLatest
                              ? tiers.map(() => [])
                              : getRoundTierAwards(item.rounds[roundState.roundIndex], tiers.length)
                            const completedRounds = roundState.allFilledInLatest
                              ? item.rounds
                              : item.rounds.slice(0, roundState.roundIndex)
                            const highestAwardedTierIdx = Math.max(
                              -1,
                              ...activeTierAwards.map((list, si) => (list.length > 0 ? si : -1)),
                            )

                            return (
                              <Panel key={item.id} className="border-border/80 transition hover:border-gold/30">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2.5">
                                      <WowItemHeaderWithTooltip item={item} />
                                      <Badge className="border-border bg-white/5 text-silver">{item.itemSlot}</Badge>
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

                                {/* Active Round Flexible Priority Tiers — Direct Drag & Drop + Inline Controls */}
                                <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                                  {tiers.map((tier, idx) => {
                                    const awards = activeTierAwards[idx] || []
                                    const isFull = awards.length >= tier.quota
                                    const isNextPriority = !isFull && idx === roundState.primarySlotIndex
                                    const isSkippedWaiting = !isFull && idx < highestAwardedTierIdx
                                    const canonicalSpecs = tier.specs.map(canonicalizeSpecLabel)
                                    const tierLabel = canonicalSpecs.join(' / ')
                                    const isDragging =
                                      dragState?.itemId === item.id && dragState.fromIndex === idx
                                    const isDragOver =
                                      dragOverState?.itemId === item.id &&
                                      dragOverState.overIndex === idx &&
                                      dragState?.fromIndex !== idx

                                    const handleDropOnTier = (targetIdx: number) => {
                                      if (!dragState || dragState.itemId !== item.id) return
                                      const fromIdx = dragState.fromIndex
                                      setDragState(null)
                                      setDragOverState(null)
                                      if (fromIdx === targetIdx) return
                                      const nextTiers = [...tiers]
                                      const mapping = tiers.map((_, i) => i)
                                      const [movedTier] = nextTiers.splice(fromIdx, 1)
                                      const [movedIdx] = mapping.splice(fromIdx, 1)
                                      nextTiers.splice(targetIdx, 0, movedTier)
                                      mapping.splice(targetIdx, 0, movedIdx)
                                      void persistItemTiers(
                                        item,
                                        nextTiers,
                                        mapping,
                                        `${item.itemName} öncelik sırası yeniden düzenlendi.`,
                                      )
                                    }

                                    const adjustQuota = (delta: number) => {
                                      const minAllowed = Math.max(1, awards.length)
                                      const nextQuota = Math.max(minAllowed, Math.min(15, tier.quota + delta))
                                      if (nextQuota === tier.quota) return
                                      const nextTiers = tiers.map((t, i) =>
                                        i === idx ? { ...t, quota: nextQuota } : t,
                                      )
                                      void persistItemTiers(
                                        item,
                                        nextTiers,
                                        tiers.map((_, i) => i),
                                        `${tierLabel} kotası ${nextQuota} olarak güncellendi.`,
                                      )
                                    }

                                    const removeThisTier = () => {
                                      if (tiers.length <= 1) return
                                      const nextTiers = tiers.filter((_, i) => i !== idx)
                                      const mapping = tiers.map((_, i) => i).filter((i) => i !== idx)
                                      void persistItemTiers(
                                        item,
                                        nextTiers,
                                        mapping,
                                        `${tierLabel} öncelik sırası kaldırıldı.`,
                                      )
                                    }

                                    return (
                                      <div
                                        key={`${tierLabel}-${idx}`}
                                        draggable={isOfficer && !busy}
                                        onDragStart={(e) => {
                                          if (!isOfficer || busy) return
                                          e.dataTransfer.effectAllowed = 'move'
                                          setDragState({ itemId: item.id, fromIndex: idx })
                                        }}
                                        onDragOver={(e) => {
                                          if (!dragState || dragState.itemId !== item.id) return
                                          e.preventDefault()
                                          e.dataTransfer.dropEffect = 'move'
                                          if (
                                            dragOverState?.itemId !== item.id ||
                                            dragOverState.overIndex !== idx
                                          ) {
                                            setDragOverState({ itemId: item.id, overIndex: idx })
                                          }
                                        }}
                                        onDragLeave={() => {
                                          if (
                                            dragOverState?.itemId === item.id &&
                                            dragOverState.overIndex === idx
                                          ) {
                                            setDragOverState(null)
                                          }
                                        }}
                                        onDrop={(e) => {
                                          e.preventDefault()
                                          handleDropOnTier(idx)
                                        }}
                                        onDragEnd={() => {
                                          setDragState(null)
                                          setDragOverState(null)
                                        }}
                                        className={cn(
                                          'relative flex flex-col justify-between rounded-xl border p-3 transition',
                                          isOfficer && !busy && 'cursor-grab active:cursor-grabbing',
                                          isDragging && 'scale-[0.97] opacity-45',
                                          isDragOver && 'border-neon ring-2 ring-neon/50 bg-neon/10',
                                          !isDragOver &&
                                            (isFull
                                              ? 'border-emerald-500/35 bg-emerald-500/[0.06]'
                                              : isNextPriority
                                                ? 'border-gold/70 bg-gold/[0.08] shadow-[0_0_18px_rgb(212_175_55/0.16)]'
                                                : 'border-border/70 bg-[#071422]/80'),
                                        )}
                                      >
                                        <div className="space-y-1.5">
                                          <div className="flex items-start justify-between gap-1.5">
                                            <div className="flex min-w-0 flex-1 items-start gap-1">
                                              {isOfficer && (
                                                <GripVertical
                                                  className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60"
                                                  aria-hidden
                                                />
                                              )}
                                              <div className="min-w-0 flex-1 space-y-1">
                                                {canonicalSpecs.map((sp, spIdx) => (
                                                  <div
                                                    key={sp}
                                                    className="flex items-center gap-1.5 text-[11px] leading-tight font-bold"
                                                  >
                                                    {spIdx === 0 && (
                                                      <span className="font-mono text-[10px] text-muted-foreground">
                                                        {idx + 1}.
                                                      </span>
                                                    )}
                                                    <SpecMiniIcon specLabel={sp} size={16} />
                                                    <span className="truncate" style={{ color: getSpecColor(sp) }}>
                                                      {sp}
                                                    </span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>

                                            {isOfficer && (
                                              <div className="flex shrink-0 items-center gap-0.5">
                                                <button
                                                  type="button"
                                                  disabled={busy}
                                                  onClick={() =>
                                                    setQuickTierModal({
                                                      item,
                                                      tierIndex: idx,
                                                      specs: canonicalSpecs,
                                                      quota: tier.quota,
                                                    })
                                                  }
                                                  className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-neon"
                                                  title="Sınıf / Spec ve kotayı düzenle"
                                                >
                                                  <Edit3 className="size-3" />
                                                </button>
                                                {tiers.length > 1 && (
                                                  <button
                                                    type="button"
                                                    disabled={busy}
                                                    onClick={removeThisTier}
                                                    className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-rose-500/15 hover:text-rose-400"
                                                    title="Bu öncelik kutusunu kaldır"
                                                  >
                                                    <X className="size-3" />
                                                  </button>
                                                )}
                                              </div>
                                            )}
                                          </div>

                                          <div className="flex flex-wrap items-center justify-between gap-1">
                                            <div className="inline-flex items-center gap-1">
                                              {isOfficer && (
                                                <button
                                                  type="button"
                                                  disabled={busy || tier.quota <= Math.max(1, awards.length)}
                                                  onClick={() => adjustQuota(-1)}
                                                  className="inline-flex size-4 cursor-pointer items-center justify-center rounded border border-border/70 bg-[#0b1b2d] text-silver hover:border-gold/60 hover:text-gold disabled:cursor-not-allowed disabled:opacity-30"
                                                  title="Kotayı azalt"
                                                >
                                                  <Minus className="size-2.5" />
                                                </button>
                                              )}
                                              <span
                                                className={cn(
                                                  'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold',
                                                  isFull
                                                    ? 'bg-emerald-500/20 text-emerald-300'
                                                    : isNextPriority
                                                      ? 'bg-gold/20 text-gold'
                                                      : 'bg-white/5 text-silver',
                                                )}
                                                title={`Kota: ${awards.length} / ${tier.quota}`}
                                              >
                                                {awards.length}/{tier.quota}
                                                {isFull && <CheckCircle2 className="size-2.5" />}
                                              </span>
                                              {isOfficer && (
                                                <button
                                                  type="button"
                                                  disabled={busy || tier.quota >= 15}
                                                  onClick={() => adjustQuota(1)}
                                                  className="inline-flex size-4 cursor-pointer items-center justify-center rounded border border-border/70 bg-[#0b1b2d] text-silver hover:border-gold/60 hover:text-gold disabled:cursor-not-allowed disabled:opacity-30"
                                                  title="Kotayı artır"
                                                >
                                                  <Plus className="size-2.5" />
                                                </button>
                                              )}
                                            </div>
                                            {isNextPriority && (
                                              <span className="rounded-full bg-gold/20 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-gold uppercase">
                                                {isSkippedWaiting ? 'Bekleyen' : 'Sırada'}
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        <div className="mt-2.5 space-y-1.5">
                                          {awards.map((award, aIdx) => (
                                            <div
                                              key={`${award.username}-${aIdx}`}
                                              className="flex items-center justify-between gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.05] px-2 py-1"
                                            >
                                              <div className="min-w-0">
                                                <div className="flex items-center gap-1">
                                                  <p
                                                    className="truncate text-xs font-bold"
                                                    style={{
                                                      color: CLASS_COLORS[award.wowClass] || getSpecColor(tier.specs[0] || ''),
                                                    }}
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
                                                        awardIndex: aIdx,
                                                      },
                                                      'Atama geri alındı.',
                                                    )
                                                  }
                                                  className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-300"
                                                  title="Bu atamayı geri al"
                                                >
                                                  <RotateCcw className="size-3" />
                                                </button>
                                              )}
                                            </div>
                                          ))}

                                          {!isFull &&
                                            (isOfficer ? (
                                              <button
                                                disabled={busy}
                                                onClick={() => {
                                                  setAwardTarget({
                                                    item,
                                                    roundIndex: roundState.roundIndex,
                                                    roundNumber: roundState.roundNumber,
                                                    slotIndex: idx,
                                                    tier,
                                                    specLabel: tierLabel,
                                                    filledCount: awards.length,
                                                  })
                                                  setAwardSelectedUsername('')
                                                  setAwardCustomName('')
                                                  setAwardNote('')
                                                }}
                                                className="w-full cursor-pointer rounded-lg border border-dashed border-neon/40 bg-neon/5 px-2.5 py-1.5 text-xs font-medium text-neon hover:bg-neon/15"
                                              >
                                                <Award className="mr-1 inline size-3.5" />
                                                Oyuncuya Ver{tier.quota > 1 ? ` (${awards.length + 1}/${tier.quota})` : ''}
                                              </button>
                                            ) : awards.length === 0 ? (
                                              <p className="text-xs italic text-muted-foreground/70">Sıra bekleniyor...</p>
                                            ) : (
                                              <p className="text-[11px] italic text-muted-foreground/80">
                                                Kalan kota: {tier.quota - awards.length}
                                              </p>
                                            ))}
                                        </div>
                                      </div>
                                    )
                                  })}

                                  {isOfficer && (
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() =>
                                        setQuickTierModal({
                                          item,
                                          tierIndex: null,
                                          specs: [],
                                          quota: defaultQuotaForRaid(item.raidId),
                                        })
                                      }
                                      className="flex min-h-[104px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-gold/35 bg-gold/[0.03] p-3 text-xs font-semibold text-gold/80 transition hover:border-gold hover:bg-gold/10 hover:text-gold disabled:opacity-50"
                                      title="Bu itema yeni öncelik sırası ekle"
                                    >
                                      <Plus className="size-5" />
                                      <span>Öncelik Ekle</span>
                                    </button>
                                  )}
                                </div>

                                {/* Previous Completed Rounds History */}
                                {completedRounds.length > 0 && (
                                  <div className="mt-3 rounded-lg border border-border/50 bg-[#071422]/60 px-3 py-2 text-[11px] text-muted-foreground">
                                    <span className="font-semibold text-silver">Tamamlanan Turlar: </span>
                                    {completedRounds.map((r) => {
                                      const rAwards = getRoundTierAwards(r, tiers.length)
                                      return (
                                        <span key={r.roundNumber} className="mr-3 inline-flex flex-wrap items-center gap-1.5">
                                          <strong className="text-gold">Tur {r.roundNumber}:</strong>
                                          {rAwards.map((list, si) =>
                                            list.map((s, ai) => (
                                              <span key={`${si}-${ai}`} style={{ color: CLASS_COLORS[s.wowClass] || '#fff' }}>
                                                {si + 1}.{s.characterName}
                                              </span>
                                            )),
                                          )}
                                        </span>
                                      )
                                    })}
                                  </div>
                                )}
                              </Panel>
                            )
                          })}
                        </div>
                        )}
                      </div>
                      )
                    })}
                  </div>
                  )}
                </section>
                )
              })}
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
              Kural: Tüm raid içi BoE itemlar istisnasız Guild Bankasına gelir amaçlı alınır ve burada şeffaf olarak takip edilir.
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
                Kural: Tüm BoP tarifler ilk düşüşte guildin belirlediği meslek sorumlusuna verilir. Tekrar düşerse min 300 mesleğe sahip olanlar <strong>anında öğrenmek şartıyla</strong> rollar.
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
            ? `Tur #${awardTarget.roundNumber} · Öncelik #${awardTarget.slotIndex + 1} (${awardTarget.filledCount + 1}/${awardTarget.tier.quota}): ${awardTarget.specLabel} (${
                selectedLiveEvent
                  ? `Canlı Raid: ${selectedLiveEvent.raidName}${
                      liveRosterId !== 'all'
                        ? ` · ${selectedLiveEvent.rosters.find((r) => r.id === liveRosterId)?.name || ''}`
                        : ''
                    }`
                  : 'Tüm Guild Üyeleri'
              })`
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
                      disabled={c.alreadyOwns}
                      onClick={() => {
                        if (c.alreadyOwns) return
                        setAwardSelectedUsername(c.username)
                        setAwardCustomName('')
                      }}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs transition',
                        c.alreadyOwns
                          ? 'cursor-not-allowed border-rose-500/25 bg-rose-500/[0.04] opacity-45'
                          : selected
                            ? 'cursor-pointer border-gold bg-gold/15'
                            : c.matches
                              ? 'cursor-pointer border-neon/25 bg-[#071422] hover:border-neon/60'
                              : 'cursor-pointer border-border/50 bg-[#071422]/50 opacity-65 hover:opacity-100',
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
                Sıraya İşle
              </GoldButton>
            </div>
          </div>
        )}
      </Modal>

      {/* Add/Edit Loot Item Modal with Flexible Priority Tier & Quota Builder */}
      <Modal
        open={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        title={editingItem ? 'Loot Item Düzenle' : 'Yeni Loot Item Ekle'}
        description="Her öncelik sırası için bir veya birden fazla eşit sınıf/spec ve kota tanımlayabilirsiniz (varsayılan: 10m → 1, 20m → 2, 40m → 4)."
        className="max-w-2xl"
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Raid">
              <select
                className={inputClass}
                value={formRaidId}
                disabled={Boolean(editingItem)}
                onChange={(e) => {
                  const nextRaidId = e.target.value
                  const nextDefQuota = defaultQuotaForRaid(nextRaidId)
                  setFormRaidId(nextRaidId)
                  setQuotaToAdd(nextDefQuota)
                  setFormPriorityTiers((prev) => prev.map((t) => ({ ...t, quota: nextDefQuota })))
                  const cat = RAID_CATALOG.find((r) => r.id === nextRaidId)
                  if (cat && cat.bosses[0]) setFormBossName(cat.bosses[0])
                }}
              >
                {RAID_CATALOG.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.size}m · varsayılan kota {defaultQuotaForRaid(r.id)})
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

          {/* Flexible Priority Tier Builder — Visual WoW Class/Spec Icon Picker (Zero Dropdowns) */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium tracking-wide text-silver uppercase">
                Öncelik Sıraları (1 → {formPriorityTiers.length}) · Eşit Spec &amp; Kota
              </p>
              <span className="text-[10px] text-muted-foreground">
                İkonlardan 1 veya birden fazla eşit öncelikli spec seçip sıraya ekleyin
              </span>
            </div>

            {formPriorityTiers.length > 0 && (
              <div className="space-y-1.5 rounded-xl border border-border bg-[#071422] p-2.5">
                {formPriorityTiers.map((tier, idx) => {
                  const isEditingRow = editingFormTierIdx === idx
                  return (
                    <div
                      key={idx}
                      className={cn(
                        'flex flex-wrap items-center justify-between gap-2 rounded-lg border px-2.5 py-2 transition',
                        isEditingRow
                          ? 'border-neon bg-neon/10'
                          : 'border-border/70 bg-[#0b1b2d]/90',
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded bg-gold/15 px-1.5 py-0.5 font-mono text-[11px] font-bold text-gold">
                          #{idx + 1}
                        </span>
                        {tier.specs.map((sp) => {
                          const canon = canonicalizeSpecLabel(sp)
                          return (
                            <span
                              key={canon}
                              className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-[#071422] px-2 py-0.5 text-xs font-semibold"
                              style={{ color: getSpecColor(canon) }}
                            >
                              <SpecMiniIcon specLabel={canon} size={14} />
                              {canon}
                              {tier.specs.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFormPriorityTiers((prev) =>
                                      prev.map((t, ti) =>
                                        ti === idx ? { ...t, specs: t.specs.filter((s) => s !== sp) } : t,
                                      ),
                                    )
                                  }
                                  className="cursor-pointer text-muted-foreground hover:text-rose-400"
                                  title="Bu spec'i sıradan çıkar"
                                >
                                  ×
                                </button>
                              )}
                            </span>
                          )
                        })}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <label className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <span>Kota:</span>
                          <input
                            type="number"
                            min={1}
                            max={15}
                            value={tier.quota}
                            onChange={(e) => {
                              const val = Math.max(1, Math.min(15, Number(e.target.value) || 1))
                              setFormPriorityTiers((prev) =>
                                prev.map((t, ti) => (ti === idx ? { ...t, quota: val } : t)),
                              )
                            }}
                            className="w-12 rounded border border-gold/40 bg-[#071422] px-1.5 py-0.5 text-center font-mono text-xs font-bold text-gold"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            if (isEditingRow) {
                              setEditingFormTierIdx(null)
                              setDraftTierSpecs([])
                            } else {
                              setEditingFormTierIdx(idx)
                              setDraftTierSpecs(tier.specs.map(canonicalizeSpecLabel))
                              setQuotaToAdd(tier.quota)
                            }
                          }}
                          className={cn(
                            'cursor-pointer rounded border px-1.5 py-1 text-[10px] font-semibold',
                            isEditingRow
                              ? 'border-neon bg-neon/20 text-neon'
                              : 'border-border/70 text-muted-foreground hover:text-neon',
                          )}
                          title="Bu sıranın spec'lerini ikonlarla düzenle"
                        >
                          <Edit3 className="size-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() =>
                            setFormPriorityTiers((prev) => {
                              if (idx === 0) return prev
                              const copy = [...prev]
                              ;[copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]]
                              return copy
                            })
                          }
                          className="cursor-pointer rounded border border-border/70 p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          title="Yukarı taşı"
                        >
                          <ArrowUp className="size-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === formPriorityTiers.length - 1}
                          onClick={() =>
                            setFormPriorityTiers((prev) => {
                              if (idx === prev.length - 1) return prev
                              const copy = [...prev]
                              ;[copy[idx + 1], copy[idx]] = [copy[idx], copy[idx + 1]]
                              return copy
                            })
                          }
                          className="cursor-pointer rounded border border-border/70 p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          title="Aşağı taşı"
                        >
                          <ArrowDown className="size-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFormPriorityTiers((prev) => prev.filter((_, ti) => ti !== idx))
                            if (editingFormTierIdx === idx) {
                              setEditingFormTierIdx(null)
                              setDraftTierSpecs([])
                            }
                          }}
                          className="cursor-pointer rounded border border-rose-500/30 p-1 text-rose-400 hover:bg-rose-500/10"
                          title="Öncelik sırasını sil"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Visual Class/Spec Icon Selector Panel */}
            <div className="space-y-2.5 rounded-xl border border-neon/25 bg-[#06111e] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-neon">
                  {editingFormTierIdx !== null
                    ? `#${editingFormTierIdx + 1} Öncelik Sırasını Düzenle`
                    : 'Yeni Öncelik Sırası Oluştur (Sınıf / Spec İkonu Seç)'}
                </span>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 text-xs text-silver">
                    <span>Kota:</span>
                    <input
                      type="number"
                      min={1}
                      max={15}
                      value={quotaToAdd}
                      onChange={(e) => setQuotaToAdd(Math.max(1, Math.min(15, Number(e.target.value) || 1)))}
                      className="w-12 rounded border border-gold/40 bg-[#0b1b2d] px-1.5 py-0.5 text-center font-mono text-xs font-bold text-gold"
                    />
                  </label>
                  {editingFormTierIdx !== null && (
                    <GhostButton
                      type="button"
                      onClick={() => {
                        setEditingFormTierIdx(null)
                        setDraftTierSpecs([])
                        setQuotaToAdd(defaultQuotaForRaid(formRaidId))
                      }}
                      className="px-2 py-1 text-[11px]"
                    >
                      Vazgeç
                    </GhostButton>
                  )}
                  <GoldButton
                    type="button"
                    disabled={draftTierSpecs.length === 0}
                    onClick={() => {
                      if (draftTierSpecs.length === 0) return
                      const tierObj: LootPriorityTier = {
                        specs: [...draftTierSpecs],
                        quota: quotaToAdd,
                      }
                      if (editingFormTierIdx !== null) {
                        setFormPriorityTiers((prev) =>
                          prev.map((t, ti) => (ti === editingFormTierIdx ? tierObj : t)),
                        )
                        setEditingFormTierIdx(null)
                      } else {
                        setFormPriorityTiers((prev) => [...prev, tierObj])
                      }
                      setDraftTierSpecs([])
                      setQuotaToAdd(defaultQuotaForRaid(formRaidId))
                    }}
                    className="px-3 py-1 text-xs"
                  >
                    <Plus className="size-3.5" />
                    {editingFormTierIdx !== null ? 'Sırayı Güncelle' : 'Öncelik Sırası Ekle'}
                  </GoldButton>
                </div>
              </div>

              <SpecIconPicker
                compact
                selectedSpecs={draftTierSpecs}
                onToggleSpec={(label) =>
                  setDraftTierSpecs((prev) =>
                    prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label],
                  )
                }
              />
            </div>
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

      {/* Quick Direct On-Card Tier Add / Edit Modal (WoW Class/Spec Icon Picker) */}
      <Modal
        open={Boolean(quickTierModal)}
        onClose={() => setQuickTierModal(null)}
        title={
          quickTierModal
            ? quickTierModal.tierIndex === null
              ? `Öncelik Ekle: ${quickTierModal.item.itemName}`
              : `#${quickTierModal.tierIndex + 1} Öncelik Düzenle: ${quickTierModal.item.itemName}`
            : 'Öncelik Sırası'
        }
        description="Sınıf/spec ikonlarına tıklayarak 1 veya daha fazla eşit öncelikli spec seçip kotayı belirleyin."
        className="max-w-3xl"
      >
        {quickTierModal && (
          <div className="space-y-4">
            <SpecIconPicker
              selectedSpecs={quickTierModal.specs}
              onToggleSpec={(label) =>
                setQuickTierModal((prev) =>
                  prev
                    ? {
                        ...prev,
                        specs: prev.specs.includes(label)
                          ? prev.specs.filter((s) => s !== label)
                          : [...prev.specs, label],
                      }
                    : null,
                )
              }
            />

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-silver">Kota:</span>
                <button
                  type="button"
                  onClick={() =>
                    setQuickTierModal((prev) =>
                      prev ? { ...prev, quota: Math.max(1, prev.quota - 1) } : null,
                    )
                  }
                  className="inline-flex size-7 cursor-pointer items-center justify-center rounded-lg border border-border bg-[#071422] text-silver hover:border-gold/60 hover:text-gold"
                >
                  <Minus className="size-3.5" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={quickTierModal.quota}
                  onChange={(e) =>
                    setQuickTierModal((prev) =>
                      prev
                        ? { ...prev, quota: Math.max(1, Math.min(15, Number(e.target.value) || 1)) }
                        : null,
                    )
                  }
                  className="w-14 rounded-lg border border-gold/40 bg-[#071422] px-2 py-1 text-center font-mono text-sm font-bold text-gold"
                />
                <button
                  type="button"
                  onClick={() =>
                    setQuickTierModal((prev) =>
                      prev ? { ...prev, quota: Math.min(15, prev.quota + 1) } : null,
                    )
                  }
                  className="inline-flex size-7 cursor-pointer items-center justify-center rounded-lg border border-border bg-[#071422] text-silver hover:border-gold/60 hover:text-gold"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <GhostButton type="button" onClick={() => setQuickTierModal(null)}>
                  İptal
                </GhostButton>
                <GoldButton
                  type="button"
                  disabled={busy || quickTierModal.specs.length === 0}
                  onClick={() => void handleSaveQuickTier()}
                >
                  <Plus className="size-4" />
                  {quickTierModal.tierIndex === null ? 'Öncelik Ekle' : 'Kaydet'}
                </GoldButton>
              </div>
            </div>
          </div>
        )}
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
