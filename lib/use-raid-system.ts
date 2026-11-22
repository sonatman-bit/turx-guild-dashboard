'use client'

import { useCallback, useEffect, useState } from 'react'
import { authHeaders } from '@/lib/client-session'
import type { WowClass } from '@/lib/guild-data'
import type {
  MemberAttendanceRow,
  PublicModuleFlags,
  RaidRoleType,
  RaidSystemStore,
} from '@/lib/raid-loot-system'

export type GuildMainMember = {
  username: string
  characterId: string
  characterName: string
  wowClass: WowClass
  spec: string
  role: RaidRoleType
  level: number
  guildRank: string
}

export type RaidSystemApiPayload = {
  locked?: boolean
  publicModules: PublicModuleFlags
  isGm: boolean
  isOfficer: boolean
  raidSystem?: RaidSystemStore
  activePhaseId?: string
  attendanceLeaderboard?: MemberAttendanceRow[]
  guildMembers?: GuildMainMember[]
}

export function useRaidSystem(phaseId?: string) {
  const [data, setData] = useState<RaidSystemApiPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      setError(null)
      try {
        const qs = phaseId ? `?phaseId=${encodeURIComponent(phaseId)}` : ''
        const res = await fetch(`/api/raid-system${qs}`, {
          credentials: 'same-origin',
          headers: authHeaders(),
          cache: 'no-store',
        })
        const json = (await res.json()) as RaidSystemApiPayload & { error?: string }
        if (!res.ok) throw new Error(json.error || 'Veriler yüklenemedi.')
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bağlantı hatası.')
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [phaseId],
  )

  useEffect(() => {
    void refresh(false)
  }, [refresh])

  const postAction = useCallback(
    async (payload: Record<string, unknown>) => {
      setBusy(true)
      try {
        const res = await fetch('/api/raid-system', {
          method: 'POST',
          credentials: 'same-origin',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        })
        const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
        if (!res.ok) {
          throw new Error(json.error || 'İşlem başarısız oldu.')
        }
        await refresh(true)
        return { ok: true as const }
      } finally {
        setBusy(false)
      }
    },
    [refresh],
  )

  return {
    data,
    loading,
    busy,
    error,
    refresh,
    postAction,
  }
}

export function useLiveNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
