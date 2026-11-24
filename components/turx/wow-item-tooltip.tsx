'use client'

import { ExternalLink } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  WOW_ITEM_QUALITY_COLORS,
  wowItemBlizzardFallbackUrl,
  wowItemIconUrl,
  type LootItem,
  type WowItemQuality,
} from '@/lib/raid-loot-system'
import { cn } from '@/lib/utils'

function inferQuality(item: LootItem): WowItemQuality {
  return item.tooltip?.quality || 'epic'
}

export function WowItemIcon({
  icon,
  quality = 'epic',
  size = 57,
  alt,
  className,
}: {
  icon?: string
  quality?: WowItemQuality
  size?: number
  alt: string
  className?: string
}) {
  const [fallbackStep, setFallbackStep] = useState<0 | 1 | 2>(0)
  const qStyle = WOW_ITEM_QUALITY_COLORS[quality]

  useEffect(() => {
    setFallbackStep(0)
  }, [icon])

  const src =
    fallbackStep === 0
      ? wowItemIconUrl(icon)
      : fallbackStep === 1
        ? wowItemBlizzardFallbackUrl(icon)
        : ''

  return (
    <span
      style={{
        width: size,
        height: size,
        borderColor: qStyle.border,
        boxShadow: `inset 0 0 0 1px rgba(0,0,0,0.75), 0 0 14px ${qStyle.bg}`,
      }}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 bg-[#07101c]',
        className,
      )}
    >
      {fallbackStep < 2 ? (
        <img
          src={src}
          alt={alt}
          width={size}
          height={size}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFallbackStep((prev) => (prev === 0 ? 1 : 2))}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="font-display text-sm font-bold" style={{ color: qStyle.text }}>
          ?
        </span>
      )}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[6px] bg-gradient-to-b from-white/15 via-transparent to-black/30"
      />
    </span>
  )
}

/**
 * Authentic World of Warcraft in-game hover tooltip attached to an item icon + title trigger.
 * Uses a viewport-aware portal so it is never clipped by overflow containers.
 */
export function WowItemHeaderWithTooltip({
  item,
  iconSize = 57,
}: {
  item: LootItem
  iconSize?: number
}) {
  const triggerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const quality = inferQuality(item)
  const qStyle = WOW_ITEM_QUALITY_COLORS[quality]
  const tt = item.tooltip

  const updatePosition = () => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const tooltipWidth = 330
    const estimatedHeight = 270
    const pad = 12

    let left = rect.left
    if (left + tooltipWidth > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - tooltipWidth - pad)
    }

    let top = rect.bottom + 8
    if (top + estimatedHeight > window.innerHeight - pad && rect.top - estimatedHeight - 8 > pad) {
      top = Math.max(pad, rect.top - estimatedHeight - 8)
    }

    setPos({ top, left })
  }

  useEffect(() => {
    if (!open) return
    updatePosition()
    const onScrollOrResize = () => updatePosition()
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open])

  return (
    <>
      <div
        ref={triggerRef}
        tabIndex={0}
        onMouseEnter={() => {
          updatePosition()
          setOpen(true)
        }}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => {
          updatePosition()
          setOpen(true)
        }}
        onBlur={() => setOpen(false)}
        className="group inline-flex cursor-help items-center gap-2.5 focus:outline-none"
      >
        <WowItemIcon icon={item.icon} quality={quality} size={iconSize} alt={item.itemName} />
        <div className="min-w-0">
          {item.wowheadUrl ? (
            <a
              href={item.wowheadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-display text-base leading-tight font-bold underline-offset-4 hover:underline"
              style={{ color: qStyle.text }}
            >
              <span>{item.itemName}</span>
              <ExternalLink className="size-3.5 shrink-0 opacity-60 transition group-hover:opacity-100" />
            </a>
          ) : (
            <h3
              className="font-display text-base leading-tight font-bold underline-offset-4 group-hover:underline"
              style={{ color: qStyle.text }}
            >
              {item.itemName}
            </h3>
          )}
          {tt?.itemLevel ? (
            <span className="block text-[10px] font-medium text-[#ffd100]/85">
              Item Level {tt.itemLevel}
            </span>
          ) : null}
        </div>
      </div>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="tooltip"
            style={{ top: pos.top, left: pos.left }}
            className="pointer-events-none fixed z-[120] w-[325px] max-w-[92vw] rounded-lg border border-[#8d9cb0]/80 bg-[#080d18]/97 p-3.5 text-[12px] leading-snug shadow-[0_14px_45px_rgba(0,0,0,0.85),inset_0_0_0_1px_rgba(255,255,255,0.08)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Header with icon + Quality colored title */}
            <div className="flex items-start gap-3">
              <WowItemIcon icon={item.icon} quality={quality} size={50} alt={item.itemName} />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] leading-tight font-bold" style={{ color: qStyle.text }}>
                  {item.itemName}
                </p>
                {tt?.itemLevel && (
                  <p className="mt-0.5 text-[11px] font-medium text-[#ffd100]">
                    Item Level {tt.itemLevel}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-2 space-y-0.5 text-white">
              <p>{tt?.bindType || 'Binds when picked up'}</p>
              {item.unique && <p>Unique</p>}

              {/* Slot left + Armor/Weapon type right */}
              <div className="flex items-center justify-between pt-0.5">
                <span>{tt?.slotLeft || item.itemSlot}</span>
                {tt?.slotRight && <span>{tt.slotRight}</span>}
              </div>

              {/* Weapon Damage & Speed */}
              {(tt?.damageText || tt?.speedText) && (
                <div className="flex items-center justify-between">
                  <span>{tt.damageText || ''}</span>
                  <span>{tt.speedText || ''}</span>
                </div>
              )}
              {tt?.dpsText && <p>{tt.dpsText}</p>}

              {/* Armor & Block */}
              {tt?.armorText && <p>{tt.armorText}</p>}
              {tt?.blockText && <p>{tt.blockText}</p>}

              {/* Primary Stats */}
              {tt?.stats && tt.stats.length > 0 && (
                <div className="pt-0.5">
                  {tt.stats.map((st) => (
                    <p key={st}>{st}</p>
                  ))}
                </div>
              )}

              {/* Resistances */}
              {tt?.resistances && tt.resistances.length > 0 && (
                <div>
                  {tt.resistances.map((res) => (
                    <p key={res}>{res}</p>
                  ))}
                </div>
              )}

              {/* Required Level */}
              <p className="pt-0.5">Requires Level {tt?.requiredLevel || 60}</p>

              {/* Green Equip / Use / Chance on Hit effects */}
              {tt?.effects && tt.effects.length > 0 && (
                <div className="space-y-0.5 pt-1 text-[#1eff00]">
                  {tt.effects.map((eff) => (
                    <p key={eff}>{eff}</p>
                  ))}
                </div>
              )}

              {/* Fallback description if custom item has no structured tooltip stats yet */}
              {!tt && item.notes && (
                <p className="pt-1 text-[#1eff00]">{item.notes}</p>
              )}

              {/* Flavor Text */}
              {tt?.flavor && <p className="pt-1 italic text-[#ffd100]">{tt.flavor}</p>}

              {/* Boss / Raid Source footer */}
              <div className="mt-2 border-t border-white/10 pt-1.5 text-[11px] text-[#9aa8bb]">
                <p>Drop: {item.bossName}</p>
                {tt?.sourceNote && <p className="text-[10px] text-gold/80">{tt.sourceNote}</p>}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
