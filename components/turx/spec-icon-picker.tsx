'use client'

import { Check } from 'lucide-react'
import { useState } from 'react'
import {
  canonicalizeSpecLabel,
  getSpecColor,
  getSpecIconSlug,
  WOW_CLASS_SPEC_GROUPS,
  wowItemIconUrl,
} from '@/lib/raid-loot-system'
import { cn } from '@/lib/utils'

export function SpecMiniIcon({
  specLabel,
  size = 18,
  className,
}: {
  specLabel: string
  size?: number
  className?: string
}) {
  const slug = getSpecIconSlug(specLabel)
  const color = getSpecColor(specLabel)
  return (
    <img
      src={wowItemIconUrl(slug)}
      alt={canonicalizeSpecLabel(specLabel)}
      width={size}
      height={size}
      loading="lazy"
      className={cn('shrink-0 rounded-[4px] border object-cover', className)}
      style={{ borderColor: `${color}88` }}
    />
  )
}

export function SpecIconPicker({
  selectedSpecs,
  onToggleSpec,
  compact = false,
}: {
  selectedSpecs: string[]
  onToggleSpec: (canonicalLabel: string) => void
  compact?: boolean
}) {
  const [hoveredSpec, setHoveredSpec] = useState<string | null>(null)
  const normalizedSelected = new Set(selectedSpecs.map((s) => canonicalizeSpecLabel(s).toLowerCase()))

  return (
    <div className="space-y-2.5">
      <div className={cn('grid gap-2', compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5')}>
        {WOW_CLASS_SPEC_GROUPS.map((group) => (
          <div
            key={group.wowClass}
            className="flex flex-col gap-1.5 rounded-xl border px-2.5 py-2 transition"
            style={{
              borderColor: `${group.color}40`,
              backgroundColor: `${group.color}12`,
            }}
          >
            <span
              className="text-[10px] font-bold tracking-wider uppercase"
              style={{ color: group.color }}
            >
              {group.wowClass}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {group.specs.map((sp) => {
                const isSelected = normalizedSelected.has(sp.label.toLowerCase())
                return (
                  <button
                    key={sp.label}
                    type="button"
                    title={sp.label}
                    aria-label={sp.label}
                    aria-pressed={isSelected}
                    onMouseEnter={() => setHoveredSpec(sp.label)}
                    onMouseLeave={() => setHoveredSpec(null)}
                    onClick={() => onToggleSpec(sp.label)}
                    className={cn(
                      'group/icon relative cursor-pointer overflow-hidden rounded-lg border-2 transition-all',
                      compact ? 'size-8' : 'size-9',
                      isSelected
                        ? 'scale-105 shadow-[0_0_12px_rgba(255,255,255,0.45)]'
                        : 'border-black/60 opacity-80 hover:scale-105 hover:opacity-100',
                    )}
                    style={
                      isSelected
                        ? { borderColor: group.color, boxShadow: `0 0 12px ${group.color}88` }
                        : undefined
                    }
                  >
                    <img
                      src={wowItemIconUrl(sp.icon)}
                      alt={sp.label}
                      width={36}
                      height={36}
                      loading="lazy"
                      className="size-full object-cover"
                    />
                    {isSelected && (
                      <span
                        className="absolute right-0 bottom-0 flex size-3.5 items-center justify-center rounded-tl bg-black/85"
                        style={{ color: group.color }}
                      >
                        <Check className="size-2.5 stroke-[3]" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex min-h-6 flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-[#071422] px-3 py-1.5 text-[11px]">
        {hoveredSpec ? (
          <span className="flex items-center gap-1.5 font-semibold" style={{ color: getSpecColor(hoveredSpec) }}>
            <SpecMiniIcon specLabel={hoveredSpec} size={16} />
            {hoveredSpec}
          </span>
        ) : selectedSpecs.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground">Seçili:</span>
            {selectedSpecs.map((sp) => {
              const canon = canonicalizeSpecLabel(sp)
              return (
                <span
                  key={canon}
                  className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-[#0b1b2d] px-1.5 py-0.5 font-semibold"
                  style={{ color: getSpecColor(canon) }}
                >
                  <SpecMiniIcon specLabel={canon} size={14} />
                  {canon}
                </span>
              )
            })}
          </div>
        ) : (
          <span className="text-muted-foreground">
            Yukarıdaki sınıf/spec ikonlarına tıklayarak 1 veya daha fazla eşit öncelikli spec seçin.
          </span>
        )}
      </div>
    </div>
  )
}
