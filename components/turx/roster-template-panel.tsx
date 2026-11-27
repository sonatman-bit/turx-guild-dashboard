'use client'

import {
  ChevronDown,
  Eraser,
  GripVertical,
  Pencil,
  Plus,
  RotateCcw,
  Users,
  X,
} from 'lucide-react'
import { useState } from 'react'
import {
  cloneDefaultRosterTemplates,
  getSpecColor,
  normalizeRosterSlotsForSize,
  type RaidRoleType,
  type RosterTemplateSize,
  type RosterTemplateSlot,
  type RosterTemplatesBySize,
} from '@/lib/raid-loot-system'
import { cn } from '@/lib/utils'
import { SpecIconPicker, SpecMiniIcon } from './spec-icon-picker'
import { Badge, Field, GhostButton, GoldButton, inputClass, Modal, Panel } from './ui'

const ROLE_META: Record<
  RaidRoleType,
  { label: string; short: string; border: string; bg: string; text: string }
> = {
  TANK: {
    label: 'Tank',
    short: 'T',
    border: 'border-sky-400/40',
    bg: 'bg-sky-500/12',
    text: 'text-sky-300',
  },
  HEALER: {
    label: 'Healer',
    short: 'H',
    border: 'border-emerald-400/40',
    bg: 'bg-emerald-500/12',
    text: 'text-emerald-300',
  },
  MELEE: {
    label: 'Melee DPS',
    short: 'M',
    border: 'border-amber-400/40',
    bg: 'bg-amber-500/12',
    text: 'text-amber-300',
  },
  RANGED: {
    label: 'Ranged DPS',
    short: 'R',
    border: 'border-purple-400/40',
    bg: 'bg-purple-500/12',
    text: 'text-purple-300',
  },
}

const GROUP_ACCENTS = [
  '#d4af37',
  '#00f2fe',
  '#34d399',
  '#a78bfa',
  '#38bdf8',
  '#fbbf24',
  '#fb7185',
  '#fb923c',
]

function inferRoleFromSpec(spec: string): RaidRoleType {
  const s = spec.toLowerCase()
  if (s.includes('protection') || s.includes('feral tank') || s.includes('tank')) return 'TANK'
  if (s.includes('holy') || s.includes('restoration') || s.includes('discipline') || s.includes('resto')) {
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

/** Splits canonical "Warrior (Protection)" -> { cls: "Warrior", spec: "Protection" } for clean compact split cells */
function parseClassAndSpec(canonical: string): { cls: string; spec: string } {
  const m = canonical.match(/^([^(]+)\(([^)]+)\)$/)
  if (m) {
    return { cls: m[1].trim(), spec: m[2].trim() }
  }
  return { cls: canonical.trim(), spec: '' }
}

function compactSpecName(spec: string): string {
  const map: Record<string, string> = {
    Protection: 'Prot',
    Restoration: 'Resto',
    Retribution: 'Ret',
    Discipline: 'Disc',
    Assassination: 'Assass.',
    Enhancement: 'Enh',
    Elemental: 'Ele',
    Destruction: 'Destro',
    Affliction: 'Affli',
    Demonology: 'Demo',
    'Beast Mastery': 'BM',
    Marksman: 'MM',
    Survival: 'Surv',
    Balance: 'Bal',
    'Feral Tank': 'Feral T',
    'Feral DPS': 'Feral',
  }
  return map[spec] || spec
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
  const [expanded, setExpanded] = useState(true)
  const [activeSize, setActiveSize] = useState<RosterTemplateSize>('20')

  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [formOptions, setFormOptions] = useState<string[]>([])
  const [formRole, setFormRole] = useState<RaidRoleType>('MELEE')
  const [formNote, setFormNote] = useState('')

  const rawSlots = templates?.[activeSize] || cloneDefaultRosterTemplates()[activeSize]
  const slots = normalizeRosterSlotsForSize(activeSize, rawSlots)
  const targetSize = Number(activeSize)
  const groupCount = targetSize / 5

  const filledCount = slots.filter((s) => s.options.length > 0).length
  const roleTotals = slots.reduce(
    (acc, s) => {
      if (s.options.length > 0) {
        acc[s.role] = (acc[s.role] || 0) + 1
      }
      return acc
    },
    { TANK: 0, HEALER: 0, MELEE: 0, RANGED: 0 } as Record<RaidRoleType, number>,
  )

  const openEditSlotModal = (index: number) => {
    const slot = slots[index]
    setEditingIndex(index)
    setFormOptions([...slot.options])
    setFormRole(slot.role)
    setFormNote(slot.note || '')
    setModalOpen(true)
  }

  const toggleFormOption = (spec: string) => {
    setFormOptions((prev) => {
      const exists = prev.includes(spec)
      const next = exists ? prev.filter((x) => x !== spec) : [...prev, spec]
      if (!exists && prev.length === 0) {
        setFormRole(inferRoleFromSpec(spec))
      }
      return next
    })
  }

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingIndex === null) return
    const nextSlots = [...slots]
    nextSlots[editingIndex] = {
      ...nextSlots[editingIndex],
      role: formOptions.length > 0 ? formRole : nextSlots[editingIndex].role,
      options: [...formOptions],
      count: 1,
      note: formNote.trim() || undefined,
    }
    const gNum = Math.floor(editingIndex / 5) + 1
    const sNum = (editingIndex % 5) + 1
    const ok = await onSaveTemplate(
      activeSize,
      nextSlots,
      formOptions.length > 0
        ? `Grup ${gNum} · Slot ${sNum} güncellendi.`
        : `Grup ${gNum} · Slot ${sNum} boş bırakıldı.`,
    )
    if (ok) setModalOpen(false)
  }

  const handleClearSlot = async (index: number) => {
    const nextSlots = [...slots]
    nextSlots[index] = {
      ...nextSlots[index],
      options: [],
      note: undefined,
    }
    const gNum = Math.floor(index / 5) + 1
    const sNum = (index % 5) + 1
    await onSaveTemplate(activeSize, nextSlots, `Grup ${gNum} · Slot ${sNum} temizlendi.`)
  }

  const handleSwapSlots = async (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return
    const nextSlots = [...slots]
    const tmp = nextSlots[fromIdx]
    nextSlots[fromIdx] = nextSlots[toIdx]
    nextSlots[toIdx] = tmp
    await onSaveTemplate(activeSize, nextSlots, 'Slotların yeri değiştirildi.')
  }

  const handleResetDefaults = async () => {
    if (!confirm(`${activeSize}-Man raid grup şablonu varsayılan düzene sıfırlansın mı?`)) return
    const defaults = cloneDefaultRosterTemplates()[activeSize]
    await onSaveTemplate(activeSize, defaults, `${activeSize}-Man grup şablonu varsayılanlara sıfırlandı.`)
  }

  return (
    <Panel className="border-neon/30 bg-gradient-to-br from-[#071829] via-[#091524] to-[#08121f]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex cursor-pointer items-center gap-2.5 text-left"
        >
          <span className="flex size-8 items-center justify-center rounded-lg border border-neon/35 bg-neon/10 text-neon">
            <Users className="size-4" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-base font-bold text-gold sm:text-lg">
                İsimsiz Raid Roster Şablonları
              </h3>
              <Badge className="border-neon/40 bg-neon/10 text-[11px] text-neon">
                {groupCount} Grup · {filledCount} / {targetSize} Slot
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Her raid 5&apos;er kişilik standart kutulardan oluşan gruplar halinde gösterilir. Çoklu opsiyonlar aynı satırda eşit bölünür.
            </p>
          </div>
          <ChevronDown
            className={cn(
              'ml-1 size-4 shrink-0 text-silver/70 transition-transform duration-200',
              !expanded && '-rotate-90',
            )}
          />
        </button>

        {/* Size Switcher + Reset */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-[#071422] p-0.5">
            {(['10', '20', '40'] as const).map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setActiveSize(sz)}
                className={cn(
                  'cursor-pointer rounded-md px-3 py-1 text-xs font-bold transition',
                  activeSize === sz
                    ? 'bg-gold/20 text-gold shadow-[inset_0_0_0_1px_rgba(212,175,55,0.45)]'
                    : 'text-silver/75 hover:text-foreground',
                )}
              >
                {sz}-Man
              </button>
            ))}
          </div>

          {isOfficer && (
            <GhostButton
              type="button"
              disabled={busy}
              onClick={() => void handleResetDefaults()}
              className="px-2.5 py-1.5 text-xs"
              title="Varsayılan grup şablonuna dön"
            >
              <RotateCcw className="size-3.5" />
              Varsayılan
            </GhostButton>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4 border-t border-border/60 pt-4">
          {/* Role Summary Chips */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {(['TANK', 'HEALER', 'MELEE', 'RANGED'] as RaidRoleType[]).map((role) => {
                const rm = ROLE_META[role]
                return (
                  <span
                    key={role}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-semibold',
                      rm.border,
                      rm.bg,
                      rm.text,
                    )}
                  >
                    {rm.label}: <span className="font-mono font-bold">{roleTotals[role]}</span>
                  </span>
                )
              })}
            </div>
            {isOfficer && (
              <span className="text-[11px] text-muted-foreground">
                Kutucuğa tıklayarak 1&apos;li / 2&apos;li / 3&apos;lü spec seçin; sürükleyip bırakarak yer değiştirin.
              </span>
            )}
          </div>

          {/* 5-Player Raid Groups Grid (10m: 2 cols, 20m: 4 cols, 40m: 4 cols x 2 rows) */}
          <div
            className={cn(
              'grid gap-3',
              activeSize === '10'
                ? 'grid-cols-1 md:grid-cols-2'
                : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4',
            )}
          >
            {Array.from({ length: groupCount }, (_, groupIdx) => {
              const groupSlots = slots.slice(groupIdx * 5, groupIdx * 5 + 5)
              const accent = GROUP_ACCENTS[groupIdx % GROUP_ACCENTS.length]
              const groupFilled = groupSlots.filter((s) => s.options.length > 0).length

              return (
                <div
                  key={`grp-${activeSize}-${groupIdx}`}
                  className="relative flex flex-col overflow-hidden rounded-xl border bg-[#06111e]/95 shadow-sm"
                  style={{ borderColor: `${accent}40` }}
                >
                  {/* Group Header Bar */}
                  <div
                    className="flex items-center justify-between border-b px-3 py-2"
                    style={{
                      borderColor: `${accent}28`,
                      background: `linear-gradient(90deg, ${accent}18 0%, rgba(7,20,34,0.4) 100%)`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}` }}
                      />
                      <span
                        className="font-display text-xs font-bold tracking-wider uppercase"
                        style={{ color: accent }}
                      >
                        Grup {groupIdx + 1}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] font-semibold text-silver/70">
                      {groupFilled}/5
                    </span>
                  </div>

                  {/* 5 Uniform Standard-Height Boxes (h-[52px] each) */}
                  <div className="flex flex-col gap-1.5 p-2">
                    {groupSlots.map((slot, localIdx) => {
                      const globalIdx = groupIdx * 5 + localIdx
                      const optCount = slot.options.length
                      const hasOptions = optCount > 0
                      const rm = ROLE_META[slot.role] || ROLE_META.MELEE
                      const primaryColor = hasOptions ? getSpecColor(slot.options[0]) : '#64748b'
                      const isDragging = dragIdx === globalIdx
                      const isDragOver = dragOverIdx === globalIdx && dragIdx !== null && dragIdx !== globalIdx
                      const visibleOpts = slot.options.slice(0, 3)
                      const extraCount = Math.max(0, optCount - 3)

                      return (
                        <div
                          key={`${slot.id}-${globalIdx}`}
                          draggable={isOfficer && !busy}
                          onDragStart={(e) => {
                            if (!isOfficer) return
                            setDragIdx(globalIdx)
                            e.dataTransfer.effectAllowed = 'move'
                            e.dataTransfer.setData('text/plain', String(globalIdx))
                          }}
                          onDragOver={(e) => {
                            if (!isOfficer || dragIdx === null) return
                            e.preventDefault()
                            if (dragOverIdx !== globalIdx) setDragOverIdx(globalIdx)
                          }}
                          onDragLeave={() => {
                            if (dragOverIdx === globalIdx) setDragOverIdx(null)
                          }}
                          onDrop={(e) => {
                            if (!isOfficer || dragIdx === null) return
                            e.preventDefault()
                            const from = dragIdx
                            setDragIdx(null)
                            setDragOverIdx(null)
                            void handleSwapSlots(from, globalIdx)
                          }}
                          onDragEnd={() => {
                            setDragIdx(null)
                            setDragOverIdx(null)
                          }}
                          onClick={() => {
                            if (isOfficer && !busy) openEditSlotModal(globalIdx)
                          }}
                          title={
                            hasOptions
                              ? `${slot.options.join(' veya ')}${slot.note ? ` — ${slot.note}` : ''}`
                              : 'Boş Slot'
                          }
                          className={cn(
                            'group relative flex h-[54px] w-full items-stretch overflow-hidden rounded-lg border transition',
                            isOfficer && 'cursor-pointer',
                            hasOptions
                              ? 'bg-[#0b1b2d]/95 hover:border-gold/55'
                              : 'border-dashed border-border/60 bg-[#071422]/45 hover:border-neon/50 hover:bg-neon/[0.04]',
                            isDragging && 'scale-[0.98] opacity-40',
                            isDragOver && 'ring-2 ring-neon/80 border-neon bg-neon/10',
                          )}
                          style={
                            hasOptions && !isDragOver
                              ? { borderColor: `${primaryColor}45` }
                              : undefined
                          }
                        >
                          {hasOptions ? (
                            <>
                              {/* Left Role Accent Strip */}
                              <div
                                className={cn(
                                  'flex w-5 shrink-0 items-center justify-center border-r border-white/[0.06] text-[9px] font-black select-none',
                                  rm.bg,
                                  rm.text,
                                )}
                                title={rm.label}
                              >
                                {rm.short}
                              </div>

                              {/* Single Spec vs Horizontal Equal Split (2-way / 3-way) */}
                              {visibleOpts.length === 1 ? (
                                <div className="flex min-w-0 flex-1 items-center gap-2 px-2.5">
                                  <SpecMiniIcon specLabel={visibleOpts[0]} size={20} />
                                  <div className="min-w-0 flex-1 leading-tight">
                                    <p
                                      className="truncate text-[11px] font-bold"
                                      style={{ color: getSpecColor(visibleOpts[0]) }}
                                    >
                                      {visibleOpts[0]}
                                    </p>
                                    {slot.note && (
                                      <p className="truncate text-[10px] italic text-silver/70">
                                        {slot.note}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div
                                  className={cn(
                                    'grid min-w-0 flex-1 divide-x divide-white/10',
                                    visibleOpts.length === 2 ? 'grid-cols-2' : 'grid-cols-3',
                                  )}
                                >
                                  {visibleOpts.map((specLabel, optIdx) => {
                                    const { cls, spec } = parseClassAndSpec(specLabel)
                                    const specColor = getSpecColor(specLabel)
                                    const isTriple = visibleOpts.length >= 3
                                    return (
                                      <div
                                        key={specLabel}
                                        className="relative flex min-w-0 items-center gap-1.5 px-1.5"
                                        style={{
                                          background: `linear-gradient(180deg, ${specColor}12 0%, transparent 100%)`,
                                        }}
                                      >
                                        <SpecMiniIcon specLabel={specLabel} size={isTriple ? 16 : 18} />
                                        <div className="min-w-0 flex-1 leading-[1.15]">
                                          <p
                                            className={cn(
                                              'truncate font-bold',
                                              isTriple ? 'text-[10px]' : 'text-[11px]',
                                            )}
                                            style={{ color: specColor }}
                                          >
                                            {isTriple ? compactSpecName(spec) || cls : cls}
                                          </p>
                                          <p className="truncate text-[9px] text-silver/75">
                                            {isTriple ? cls : compactSpecName(spec)}
                                          </p>
                                        </div>
                                        {extraCount > 0 && optIdx === visibleOpts.length - 1 && (
                                          <span className="shrink-0 rounded bg-gold/20 px-1 text-[9px] font-bold text-gold">
                                            +{extraCount}
                                          </span>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}

                              {/* Optional subtle note badge when split */}
                              {visibleOpts.length > 1 && slot.note && (
                                <span
                                  className="pointer-events-none absolute right-1 bottom-0.5 max-w-[90px] truncate rounded bg-[#06111e]/90 px-1 text-[8px] font-medium italic text-silver/75"
                                >
                                  {slot.note}
                                </span>
                              )}

                              {/* Officer Hover Action Pill (never crowds or wraps box text) */}
                              {isOfficer && (
                                <div
                                  className="absolute top-1 right-1 flex items-center gap-0.5 rounded-md border border-border/80 bg-[#06111e]/95 px-1 py-0.5 opacity-0 shadow-md backdrop-blur-sm transition group-hover:opacity-100"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span
                                    className="cursor-grab p-0.5 text-muted-foreground hover:text-silver active:cursor-grabbing"
                                    title="Sürükleyip başka slotla yer değiştir"
                                  >
                                    <GripVertical className="size-3" />
                                  </span>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => openEditSlotModal(globalIdx)}
                                    className="cursor-pointer rounded p-0.5 text-muted-foreground hover:bg-white/10 hover:text-gold"
                                    title="Slotu düzenle"
                                  >
                                    <Pencil className="size-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => void handleClearSlot(globalIdx)}
                                    className="cursor-pointer rounded p-0.5 text-muted-foreground hover:bg-rose-500/15 hover:text-rose-300"
                                    title="Slotu boşalt"
                                  >
                                    <Eraser className="size-3" />
                                  </button>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex w-full items-center justify-between gap-2 px-3 text-[11px] text-muted-foreground/70">
                              <span className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] text-muted-foreground/50">
                                  #{localIdx + 1}
                                </span>
                                <span>{isOfficer ? 'Boş Slot — Spec Seç' : 'Açık Slot'}</span>
                              </span>
                              {isOfficer && <Plus className="size-3.5 text-neon/70 group-hover:text-neon" />}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Edit Single Player Box Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingIndex !== null
            ? `${activeSize}-Man · Grup ${Math.floor(editingIndex / 5) + 1} / Slot ${(editingIndex % 5) + 1}`
            : 'Roster Slotunu Düzenle'
        }
        description="Bu oyuncu kutusu için tek bir sınıf/spec seçebilir veya 2'li / 3'lü alternatif (veya) opsiyonlar ekleyebilirsiniz."
        className="max-w-3xl"
      >
        <form onSubmit={handleSaveModal} className="space-y-4">
          <div className="rounded-xl border border-border/80 bg-[#071422] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wide text-silver uppercase">
                Bu Kutunun Opsiyonları ({formOptions.length} seçili)
              </span>
              {formOptions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFormOptions([])}
                  className="cursor-pointer text-[11px] text-rose-300 hover:underline"
                >
                  Tümünü Temizle
                </button>
              )}
            </div>
            {formOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Aşağıdaki sınıf/spec ikonlarından 1, 2 veya 3 seçenek tıklayın (aynı satırda eşit bölünerek görünür).
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                {formOptions.map((sp, idx) => (
                  <span key={sp} className="inline-flex items-center gap-1.5">
                    {idx > 0 && (
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">veya</span>
                    )}
                    <span
                      className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-semibold"
                      style={{
                        color: getSpecColor(sp),
                        borderColor: `${getSpecColor(sp)}55`,
                        backgroundColor: `${getSpecColor(sp)}18`,
                      }}
                    >
                      <SpecMiniIcon specLabel={sp} size={16} />
                      {sp}
                      <button
                        type="button"
                        onClick={() => toggleFormOption(sp)}
                        className="ml-0.5 cursor-pointer opacity-75 hover:opacity-100"
                        title="Kaldır"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <SpecIconPicker
              selectedSpecs={formOptions}
              onToggleSpec={toggleFormOption}
              compact
            />
            <p className="text-[11px] text-muted-foreground">
              Birden fazla ikona tıklayarak bu kutu için yan yana bölünmüş 2&apos;li veya 3&apos;lü alternatif opsiyon (veya) oluşturabilirsiniz.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Rol Kategorisi">
              <select
                className={inputClass}
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as RaidRoleType)}
              >
                <option value="TANK">Tank</option>
                <option value="HEALER">Healer</option>
                <option value="MELEE">Melee DPS</option>
                <option value="RANGED">Ranged DPS</option>
              </select>
            </Field>
            <Field label="Kısa Not (Opsiyonel)">
              <input
                type="text"
                className={inputClass}
                placeholder="Örn: Main Tank, Windfury, Imp. EA..."
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                maxLength={80}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <GhostButton type="button" onClick={() => setModalOpen(false)}>
              İptal
            </GhostButton>
            <GoldButton type="submit" disabled={busy}>
              {busy ? 'Kaydediliyor...' : 'Slotu Kaydet'}
            </GoldButton>
          </div>
        </form>
      </Modal>
    </Panel>
  )
}
