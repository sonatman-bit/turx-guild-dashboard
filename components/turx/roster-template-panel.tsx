'use client'

import {
  ChevronDown,
  Cross,
  Edit3,
  GripVertical,
  Minus,
  Plus,
  Shield,
  Swords,
  Target,
  Users,
  X,
} from 'lucide-react'
import { useState } from 'react'
import {
  canonicalizeSpecLabel,
  cloneDefaultRosterTemplates,
  getSpecColor,
  type RaidRoleType,
  type RosterTemplatesBySize,
  type RosterTemplateSize,
  type RosterTemplateSlot,
} from '@/lib/raid-loot-system'
import { cn } from '@/lib/utils'
import { SpecIconPicker, SpecMiniIcon } from './spec-icon-picker'
import { Badge, Field, GhostButton, GoldButton, inputClass, Modal, Panel } from './ui'

const SIZE_TABS: { size: RosterTemplateSize; label: string; raidHint: string; target: number }[] = [
  { size: '10', label: '10-Man Roster', raidHint: 'Barrow Deeps', target: 10 },
  { size: '20', label: '20-Man Roster', raidHint: 'Hyjal Summit', target: 20 },
  { size: '40', label: '40-Man Roster', raidHint: "Onyxia's Lair / Core", target: 40 },
]

const ROLE_META: Record<
  RaidRoleType,
  { label: string; badgeCls: string; borderCls: string; icon: React.ComponentType<{ className?: string }> }
> = {
  TANK: {
    label: 'TANK',
    badgeCls: 'border-sky-400/40 bg-sky-500/15 text-sky-300',
    borderCls: 'border-sky-500/35',
    icon: Shield,
  },
  HEALER: {
    label: 'HEALER',
    badgeCls: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300',
    borderCls: 'border-emerald-500/35',
    icon: Cross,
  },
  MELEE: {
    label: 'MELEE DPS',
    badgeCls: 'border-amber-400/40 bg-amber-500/15 text-amber-300',
    borderCls: 'border-amber-500/30',
    icon: Swords,
  },
  RANGED: {
    label: 'RANGED DPS',
    badgeCls: 'border-purple-400/40 bg-purple-500/15 text-purple-300',
    borderCls: 'border-purple-500/30',
    icon: Target,
  },
}

function guessRoleFromSpec(specLabel: string): RaidRoleType {
  const s = specLabel.toLowerCase()
  if (s.includes('protection') || s.includes('tank')) return 'TANK'
  if (s.includes('holy') || s.includes('restoration') || s.includes('resto') || s.includes('discipline')) {
    return 'HEALER'
  }
  if (
    s.includes('hunter') ||
    s.includes('mage') ||
    s.includes('warlock') ||
    s.includes('shadow') ||
    s.includes('balance') ||
    s.includes('elemental')
  ) {
    return 'RANGED'
  }
  return 'MELEE'
}

export function RosterTemplatePanel({
  templates,
  isOfficer,
  busy,
  onSaveTemplate,
}: {
  templates?: RosterTemplatesBySize
  isOfficer: boolean
  busy: boolean
  onSaveTemplate: (size: RosterTemplateSize, slots: RosterTemplateSlot[], successMsg: string) => Promise<boolean>
}) {
  const effectiveTemplates = templates || cloneDefaultRosterTemplates()
  const [selectedSize, setSelectedSize] = useState<RosterTemplateSize>('10')
  const [collapsed, setCollapsed] = useState(false)
  const [dragFromIdx, setDragFromIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const [slotModal, setSlotModal] = useState<{
    index: number | null
    id: string
    role: RaidRoleType
    options: string[]
    count: number
    note: string
  } | null>(null)

  const slots = effectiveTemplates[selectedSize] || []
  const targetTotal = Number(selectedSize)
  const totalCount = slots.reduce((sum, s) => sum + s.count, 0)
  const tankCount = slots.filter((s) => s.role === 'TANK').reduce((sum, s) => sum + s.count, 0)
  const healerCount = slots.filter((s) => s.role === 'HEALER').reduce((sum, s) => sum + s.count, 0)
  const dpsCount = slots
    .filter((s) => s.role === 'MELEE' || s.role === 'RANGED')
    .reduce((sum, s) => sum + s.count, 0)

  const adjustSlotCount = (idx: number, delta: number) => {
    const cur = slots[idx]
    if (!cur) return
    const nextCount = Math.max(1, Math.min(20, cur.count + delta))
    if (nextCount === cur.count) return
    const nextSlots = slots.map((s, i) => (i === idx ? { ...s, count: nextCount } : s))
    void onSaveTemplate(selectedSize, nextSlots, `${selectedSize}-Man roster kontenjanı güncellendi.`)
  }

  const removeSlot = (idx: number) => {
    const nextSlots = slots.filter((_, i) => i !== idx)
    void onSaveTemplate(selectedSize, nextSlots, `${selectedSize}-Man roster kutusu kaldırıldı.`)
  }

  const handleDropSlot = (targetIdx: number) => {
    if (dragFromIdx === null) return
    const from = dragFromIdx
    setDragFromIdx(null)
    setDragOverIdx(null)
    if (from === targetIdx) return
    const nextSlots = [...slots]
    const [moved] = nextSlots.splice(from, 1)
    nextSlots.splice(targetIdx, 0, moved)
    void onSaveTemplate(selectedSize, nextSlots, `${selectedSize}-Man roster sırası güncellendi.`)
  }

  const handleSaveSlotModal = async () => {
    if (!slotModal || slotModal.options.length === 0) return
    const nextSlot: RosterTemplateSlot = {
      id: slotModal.id,
      role: slotModal.role,
      options: [...new Set(slotModal.options.map(canonicalizeSpecLabel))],
      count: Math.max(1, Math.min(20, Math.floor(slotModal.count) || 1)),
      note: slotModal.note.trim() || undefined,
    }
    const nextSlots =
      slotModal.index === null
        ? [...slots, nextSlot]
        : slots.map((s, i) => (i === slotModal.index ? nextSlot : s))
    const ok = await onSaveTemplate(
      selectedSize,
      nextSlots,
      slotModal.index === null
        ? `${selectedSize}-Man roster şablonuna yeni kutu eklendi.`
        : `${selectedSize}-Man roster kutusu güncellendi.`,
    )
    if (ok) setSlotModal(null)
  }

  return (
    <>
      <Panel className="border-gold/35 bg-gradient-to-br from-[#0d2238] via-[#091829] to-[#071220]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            className="group flex cursor-pointer items-center gap-2.5 text-left"
          >
            <span className="inline-flex size-8 items-center justify-center rounded-lg border border-gold/40 bg-gold/10 text-gold">
              <Users className="size-4" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-display text-base font-bold tracking-wide text-gold">
                  İsimsiz Raid Roster Şablonları (10 / 20 / 40-Man)
                </h2>
                <ChevronDown
                  className={cn(
                    'size-4 text-gold/80 transition-transform duration-200 group-hover:text-gold',
                    collapsed && '-rotate-90',
                  )}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Raid davetleri bu isimsiz class/spec şablonu önceliğine göre yapılır; ikili/üçlü opsiyonlu kutular esnek kadro seçeneklerini gösterir.
              </p>
            </div>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-border bg-[#071422] p-1">
              {SIZE_TABS.map((t) => {
                const countForTab = (effectiveTemplates[t.size] || []).reduce((s, x) => s + x.count, 0)
                const active = selectedSize === t.size
                return (
                  <button
                    key={t.size}
                    type="button"
                    onClick={() => {
                      setSelectedSize(t.size)
                      if (collapsed) setCollapsed(false)
                    }}
                    className={cn(
                      'cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition',
                      active
                        ? 'bg-gold/15 text-gold shadow-[0_0_12px_rgb(212_175_55/0.15)]'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {t.label}{' '}
                    <span className="ml-1 font-mono text-[10px] opacity-80">
                      ({countForTab}/{t.target})
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {!collapsed && (
          <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
            {/* Role breakdown bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  className={
                    totalCount === targetTotal
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                      : 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                  }
                >
                  Toplam Kadro: {totalCount} / {targetTotal}
                </Badge>
                <Badge className="border-sky-500/35 bg-sky-500/10 text-sky-300">Tank: {tankCount}</Badge>
                <Badge className="border-emerald-500/35 bg-emerald-500/10 text-emerald-300">Healer: {healerCount}</Badge>
                <Badge className="border-rose-500/35 bg-rose-500/10 text-rose-300">DPS: {dpsCount}</Badge>
              </div>
              {isOfficer && (
                <span className="text-[11px] text-muted-foreground">
                  Kutuları tutup sürükleyerek sırayı değiştirebilir, <strong className="text-gold">- / +</strong> ile kontenjanı ayarlayabilirsiniz.
                </span>
              )}
            </div>

            {/* Roster Boxes Grid */}
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              {slots.map((slot, idx) => {
                const meta = ROLE_META[slot.role] || ROLE_META.MELEE
                const RoleIcon = meta.icon
                const canonicalOptions = slot.options.map(canonicalizeSpecLabel)
                const isDragging = dragFromIdx === idx
                const isDragOver = dragOverIdx === idx && dragFromIdx !== idx

                return (
                  <div
                    key={slot.id}
                    draggable={isOfficer && !busy}
                    onDragStart={(e) => {
                      if (!isOfficer || busy) return
                      e.dataTransfer.effectAllowed = 'move'
                      setDragFromIdx(idx)
                    }}
                    onDragOver={(e) => {
                      if (dragFromIdx === null) return
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'move'
                      if (dragOverIdx !== idx) setDragOverIdx(idx)
                    }}
                    onDragLeave={() => {
                      if (dragOverIdx === idx) setDragOverIdx(null)
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      handleDropSlot(idx)
                    }}
                    onDragEnd={() => {
                      setDragFromIdx(null)
                      setDragOverIdx(null)
                    }}
                    className={cn(
                      'relative flex flex-col justify-between rounded-xl border bg-[#071422]/90 p-3 transition',
                      isOfficer && !busy && 'cursor-grab active:cursor-grabbing',
                      isDragging && 'scale-[0.97] opacity-45',
                      isDragOver ? 'border-neon ring-2 ring-neon/50 bg-neon/10' : meta.borderCls,
                    )}
                  >
                    <div className="space-y-2">
                      {/* Box Top Bar */}
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1">
                          {isOfficer && (
                            <GripVertical className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
                          )}
                          <span className="font-mono text-[10px] font-bold text-muted-foreground">#{idx + 1}</span>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase',
                              meta.badgeCls,
                            )}
                          >
                            <RoleIcon className="size-2.5" />
                            {meta.label}
                          </span>
                        </div>

                        {isOfficer && (
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                setSlotModal({
                                  index: idx,
                                  id: slot.id,
                                  role: slot.role,
                                  options: canonicalOptions,
                                  count: slot.count,
                                  note: slot.note || '',
                                })
                              }
                              className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-neon"
                              title="Opsiyonları ve kontenjanı düzenle"
                            >
                              <Edit3 className="size-3" />
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => removeSlot(idx)}
                              className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-rose-500/15 hover:text-rose-400"
                              title="Kutuyu kaldır"
                            >
                              <X className="size-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 1, 2, 3+ Spec Options */}
                      <div className="space-y-1">
                        {canonicalOptions.map((opt, optIdx) => (
                          <div key={opt} className="space-y-1">
                            {optIdx > 0 && (
                              <div className="flex items-center gap-1.5 pl-1">
                                <span className="h-px w-3 bg-border/80" />
                                <span className="text-[9px] font-semibold tracking-wider text-muted-foreground/80 uppercase">
                                  veya
                                </span>
                                <span className="h-px flex-1 bg-border/50" />
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 text-[11px] leading-tight font-bold">
                              <SpecMiniIcon specLabel={opt} size={18} />
                              <span className="truncate" style={{ color: getSpecColor(opt) }}>
                                {opt}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer: Note + Spot Count Stepper */}
                    <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border/50 pt-2">
                      <span className="truncate text-[10px] text-muted-foreground">
                        {slot.note || (canonicalOptions.length > 1 ? `${canonicalOptions.length} opsiyonlu` : 'Sabit spot')}
                      </span>
                      <div className="inline-flex shrink-0 items-center gap-1">
                        {isOfficer && (
                          <button
                            type="button"
                            disabled={busy || slot.count <= 1}
                            onClick={() => adjustSlotCount(idx, -1)}
                            className="inline-flex size-4 cursor-pointer items-center justify-center rounded border border-border/70 bg-[#0b1b2d] text-silver hover:border-gold/60 hover:text-gold disabled:cursor-not-allowed disabled:opacity-30"
                            title="Kontenjanı azalt"
                          >
                            <Minus className="size-2.5" />
                          </button>
                        )}
                        <span className="rounded-md bg-gold/15 px-1.5 py-0.5 font-mono text-[11px] font-bold text-gold">
                          ×{slot.count}
                        </span>
                        {isOfficer && (
                          <button
                            type="button"
                            disabled={busy || slot.count >= 20}
                            onClick={() => adjustSlotCount(idx, 1)}
                            className="inline-flex size-4 cursor-pointer items-center justify-center rounded border border-border/70 bg-[#0b1b2d] text-silver hover:border-gold/60 hover:text-gold disabled:cursor-not-allowed disabled:opacity-30"
                            title="Kontenjanı artır"
                          >
                            <Plus className="size-2.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {isOfficer && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    setSlotModal({
                      index: null,
                      id: `rt-${selectedSize}-${Date.now()}`,
                      role: 'MELEE',
                      options: [],
                      count: 1,
                      note: '',
                    })
                  }
                  className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-gold/35 bg-gold/[0.03] p-3 text-xs font-semibold text-gold/80 transition hover:border-gold hover:bg-gold/10 hover:text-gold disabled:opacity-50"
                >
                  <Plus className="size-5" />
                  <span>Roster Kutusu Ekle</span>
                  <span className="text-[10px] font-normal text-muted-foreground">Tekli / İkili / Üçlü opsiyon</span>
                </button>
              )}
            </div>
          </div>
        )}
      </Panel>

      {/* Add / Edit Roster Slot Modal with WoW Class/Spec Icon Picker */}
      <Modal
        open={Boolean(slotModal)}
        onClose={() => setSlotModal(null)}
        title={
          slotModal
            ? slotModal.index === null
              ? `${selectedSize}-Man Roster Kutusu Ekle`
              : `${selectedSize}-Man Roster Kutusu Düzenle (#${slotModal.index + 1})`
            : 'Roster Kutusu'
        }
        description="Bu roster kutusu için 1, 2 veya 3+ alternatif sınıf/spec ikonu seçebilirsiniz (ikili/üçlü opsiyon)."
        className="max-w-3xl"
      >
        {slotModal && (
          <div className="space-y-4">
            <SpecIconPicker
              selectedSpecs={slotModal.options}
              onToggleSpec={(label) =>
                setSlotModal((prev) => {
                  if (!prev) return null
                  const exists = prev.options.includes(label)
                  const nextOptions = exists
                    ? prev.options.filter((o) => o !== label)
                    : [...prev.options, label]
                  const nextRole =
                    prev.options.length === 0 && nextOptions.length === 1
                      ? guessRoleFromSpec(nextOptions[0])
                      : prev.role
                  return { ...prev, options: nextOptions, role: nextRole }
                })
              }
            />

            <div className="grid gap-3 border-t border-border/60 pt-3 sm:grid-cols-3">
              <Field label="Rol Kategorisi">
                <div className="grid grid-cols-2 gap-1">
                  {(['TANK', 'HEALER', 'MELEE', 'RANGED'] as RaidRoleType[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSlotModal((prev) => (prev ? { ...prev, role: r } : null))}
                      className={cn(
                        'cursor-pointer rounded-md border px-2 py-1 text-[10px] font-bold transition',
                        slotModal.role === r
                          ? ROLE_META[r].badgeCls
                          : 'border-border bg-[#071422] text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {ROLE_META[r].label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Kişi Sayısı (Kontenjan)">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSlotModal((prev) => (prev ? { ...prev, count: Math.max(1, prev.count - 1) } : null))
                    }
                    className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-[#071422] text-silver hover:border-gold/60 hover:text-gold"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={slotModal.count}
                    onChange={(e) =>
                      setSlotModal((prev) =>
                        prev ? { ...prev, count: Math.max(1, Math.min(20, Number(e.target.value) || 1)) } : null,
                      )
                    }
                    className="w-14 rounded-lg border border-gold/40 bg-[#071422] px-2 py-1.5 text-center font-mono text-sm font-bold text-gold"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setSlotModal((prev) => (prev ? { ...prev, count: Math.min(20, prev.count + 1) } : null))
                    }
                    className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-[#071422] text-silver hover:border-gold/60 hover:text-gold"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </Field>

              <Field label="Kısa Not (Opsiyonel)">
                <input
                  type="text"
                  maxLength={80}
                  className={cn(inputClass, 'text-xs')}
                  placeholder="Örn: Main Tank, Buff/Utility..."
                  value={slotModal.note}
                  onChange={(e) => setSlotModal((prev) => (prev ? { ...prev, note: e.target.value } : null))}
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <GhostButton type="button" onClick={() => setSlotModal(null)}>
                İptal
              </GhostButton>
              <GoldButton
                type="button"
                disabled={busy || slotModal.options.length === 0}
                onClick={() => void handleSaveSlotModal()}
              >
                <Plus className="size-4" />
                {slotModal.index === null ? 'Roster Kutusunu Ekle' : 'Kaydet'}
              </GoldButton>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
