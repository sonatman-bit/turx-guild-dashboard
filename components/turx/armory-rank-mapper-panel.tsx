'use client'

import { Award, Loader2, Plus, RefreshCw, Save, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  ARMORY_RANK_COLOR_STYLES,
  DEFAULT_ARMORY_RANK_MAPPINGS,
  formatArmoryRankKey,
  type ArmoryRankColorId,
  type ArmoryRankMapping,
} from '@/lib/armory-ranks'
import { authHeaders } from '@/lib/client-session'
import { cn } from '@/lib/utils'
import { useToast } from './toast'
import { Badge, GhostButton, GoldButton, inputClass, Panel, PanelTitle, RankPill } from './ui'

type LiveRankInfo = {
  rankId: number
  count: number
  samples: string[]
}

const COLOR_KEYS = Object.keys(ARMORY_RANK_COLOR_STYLES) as ArmoryRankColorId[]

export function ArmoryRankMapperPanel({ isGm }: { isGm: boolean }) {
  const toast = useToast()
  const [mappings, setMappings] = useState<ArmoryRankMapping[]>(DEFAULT_ARMORY_RANK_MAPPINGS)
  const [liveRanks, setLiveRanks] = useState<LiveRankInfo[]>([])
  const [totalArmoryMembers, setTotalArmoryMembers] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await fetch(`/api/admin/armory-ranks${forceRefresh ? '?refresh=1' : ''}`, {
        credentials: 'same-origin',
        headers: authHeaders(),
        cache: 'no-store',
      })
      if (!res.ok) return
      const json = (await res.json()) as {
        mappings?: ArmoryRankMapping[]
        liveRanks?: LiveRankInfo[]
        totalArmoryMembers?: number
      }
      if (Array.isArray(json.mappings) && json.mappings.length > 0) {
        setMappings(json.mappings)
      }
      if (Array.isArray(json.liveRanks)) {
        setLiveRanks(json.liveRanks)
      }
      if (typeof json.totalArmoryMembers === 'number') {
        setTotalArmoryMembers(json.totalArmoryMembers)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadData(false)
  }, [loadData])

  const liveByRankId = new Map(liveRanks.map((r) => [r.rankId, r]))

  const handleAddRank = () => {
    const used = new Set(mappings.map((m) => m.rankId))
    let nextId = 0
    while (used.has(nextId) && nextId < 20) nextId += 1
    setMappings((prev) => [
      ...prev,
      {
        rankId: nextId,
        label: nextId === 0 ? 'GM' : `Rank ${nextId}`,
        color: COLOR_KEYS[nextId % COLOR_KEYS.length],
      },
    ])
  }

  const handleUpdateRow = (idx: number, patch: Partial<ArmoryRankMapping>) => {
    setMappings((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)))
  }

  const handleDeleteRow = (idx: number) => {
    setMappings((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSave = async (syncFromArmory: boolean) => {
    const cleaned = mappings
      .map((m) => ({
        rankId: Math.max(0, Math.min(20, Math.floor(Number(m.rankId) || 0))),
        label: m.label.trim(),
        color: m.color,
      }))
      .filter((m) => m.label.length > 0)

    if (cleaned.length === 0) {
      toast({ title: 'Eksik Bilgi', description: 'En az 1 geçerli rank eşleştirmesi olmalıdır.' })
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/armory-ranks', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          mappings: cleaned,
          syncFromArmory,
        }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        error?: string
        mappings?: ArmoryRankMapping[]
        syncedCount?: number
      }
      if (!res.ok) {
        toast({ title: 'Kaydedilemedi', description: json.error || 'Rank şablonu kaydedilirken hata oluştu.' })
        return
      }
      if (Array.isArray(json.mappings)) {
        setMappings(json.mappings)
      }
      toast({
        title: 'Rank Şablonu Güncellendi',
        description: syncFromArmory
          ? `Tüm siteye yansıtıldı ve WoW Armory'den ${json.syncedCount ?? 0} karakterin rütbesi senkronize edildi.`
          : 'WoW Armory rank eşleştirmeleri tüm siteye yansıtıldı.',
      })
      void loadData(true)
    } catch {
      toast({ title: 'Bağlantı Hatası', description: 'Rank şablonu kaydedilemedi.' })
    } finally {
      setSaving(false)
    }
  }

  // Detect any active Armory rankId not yet in the mapping table
  const unmappedLiveRanks = liveRanks.filter((lr) => !mappings.some((m) => m.rankId === lr.rankId))

  return (
    <Panel className="border-gold/35 bg-gradient-to-br from-[#0b1a2e] via-card to-[#071422]">
      <PanelTitle
        icon={Award}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {totalArmoryMembers > 0 && (
              <Badge className="border-neon/35 bg-neon/10 text-[11px] text-neon">
                WoW Armory: {totalArmoryMembers} TURX Karakteri
              </Badge>
            )}
            <GhostButton
              type="button"
              disabled={refreshing || saving}
              onClick={() => void loadData(true)}
              className="px-2.5 py-1.5 text-xs"
              title="WoW Forever Armory'den güncel rank listesini çek"
            >
              <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} />
              Armory Yenile
            </GhostButton>
          </div>
        }
      >
        WoW Armory Rütbe Eşleştirme Şablonu (Tüm Siteye Yansır)
      </PanelTitle>

      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
        WoW Forever Armory&apos;de oyun içi rütbeler sayısal olarak (<strong>Rank 0 / Guild Master, Rank 1, Rank 2...</strong>) gelir.
        Burada her Armory rankının karşısına sitede görünecek rütbe adını ve rengini tanımlayın;{' '}
        <strong>Raid Kayıt, Devam Takibi, Loot Sistemi ve Guild Kadrosu</strong> sayfalarında karakter isimlerinin yanında otomatik görünür.
      </p>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-neon" />
          WoW Armory rank verileri yükleniyor...
        </div>
      ) : (
        <div className="space-y-3">
          {unmappedLiveRanks.length > 0 && isGm && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              <span>
                Armory&apos;de eşleştirilmemiş aktif rank tespit edildi:{' '}
                {unmappedLiveRanks.map((u) => `${formatArmoryRankKey(u.rankId)} (${u.count} kişi)`).join(', ')}
              </span>
              <button
                type="button"
                onClick={() => {
                  setMappings((prev) => [
                    ...prev,
                    ...unmappedLiveRanks.map((u) => ({
                      rankId: u.rankId,
                      label: u.rankId === 0 ? 'GM' : `Rank ${u.rankId}`,
                      color: COLOR_KEYS[u.rankId % COLOR_KEYS.length],
                    })),
                  ])
                }}
                className="cursor-pointer rounded-md border border-amber-400/50 bg-amber-400/15 px-2.5 py-1 text-[11px] font-bold text-amber-100 hover:bg-amber-400/25"
              >
                + Eksik Rankları Ekle
              </button>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-border/70 bg-[#06111e]/85">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead>
                <tr className="border-b border-border/70 bg-white/[0.02] text-[10px] tracking-wider text-muted-foreground uppercase">
                  <th className="px-3 py-2.5">Armory Rank No</th>
                  <th className="px-3 py-2.5">Armory&apos;de Aktif Oyuncular</th>
                  <th className="px-3 py-2.5">Site Görünen Adı</th>
                  <th className="px-3 py-2.5">Rozet Rengi</th>
                  <th className="px-3 py-2.5">Önizleme</th>
                  {isGm && <th className="px-3 py-2.5 text-right">İşlem</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {mappings.map((row, idx) => {
                  const live = liveByRankId.get(row.rankId)
                  return (
                    <tr key={`${row.rankId}-${idx}`} className="hover:bg-white/[0.02]">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-silver/70">Rank</span>
                          <input
                            type="number"
                            min={0}
                            max={20}
                            disabled={!isGm || saving}
                            value={row.rankId}
                            onChange={(e) =>
                              handleUpdateRow(idx, {
                                rankId: Math.max(0, Math.min(20, Number(e.target.value) || 0)),
                              })
                            }
                            className={cn(inputClass, 'w-16 px-2 py-1 text-center font-mono text-xs')}
                          />
                          {row.rankId === 0 && (
                            <span className="text-[10px] text-gold/80">(Guild Master)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {live ? (
                          <div>
                            <span className="font-mono font-bold text-emerald-300">{live.count} karakter</span>
                            {live.samples.length > 0 && (
                              <span className="block max-w-[220px] truncate text-[10px] text-muted-foreground">
                                {live.samples.join(', ')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/60">Armory&apos;de 0 karakter</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          disabled={!isGm || saving}
                          value={row.label}
                          onChange={(e) => handleUpdateRow(idx, { label: e.target.value })}
                          placeholder="Örn: GM, Officer, Raider..."
                          maxLength={32}
                          className={cn(inputClass, 'max-w-[180px] px-2.5 py-1 text-xs font-semibold')}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          {COLOR_KEYS.map((ck) => {
                            const preset = ARMORY_RANK_COLOR_STYLES[ck]
                            const active = row.color === ck
                            return (
                              <button
                                key={ck}
                                type="button"
                                disabled={!isGm || saving}
                                onClick={() => handleUpdateRow(idx, { color: ck })}
                                title={preset.name}
                                className={cn(
                                  'size-5 cursor-pointer rounded-full border-2 transition disabled:cursor-default',
                                  active ? 'scale-110 border-white shadow-sm' : 'border-transparent opacity-60 hover:opacity-100',
                                )}
                                style={{ backgroundColor: preset.swatchHex }}
                              />
                            )
                          })}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <RankPill label={row.label || `Rank ${row.rankId}`} color={row.color} armoryRankId={row.rankId} />
                      </td>
                      {isGm && (
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            disabled={saving || mappings.length <= 1}
                            onClick={() => handleDeleteRow(idx)}
                            className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition hover:bg-rose-500/15 hover:text-rose-300 disabled:opacity-30"
                            title="Bu rank satırını kaldır"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {isGm && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <GhostButton
                type="button"
                disabled={saving}
                onClick={handleAddRank}
                className="px-3 py-1.5 text-xs"
              >
                <Plus className="size-3.5" />
                Yeni Rank Satırı Ekle
              </GhostButton>

              <GoldButton
                type="button"
                disabled={saving}
                onClick={() => void handleSave(true)}
                className="px-4 py-1.5 text-xs"
              >
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                {saving ? 'Kaydediliyor & Senkronize Ediliyor...' : 'Kaydet, Armory Senkronize Et & Tüm Siteye Yansıt'}
              </GoldButton>
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}
