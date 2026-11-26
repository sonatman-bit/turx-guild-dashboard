import { NextResponse } from 'next/server'
import { sessionFromRequest } from '@/lib/auth-email'
import { canAccessAdminPanel } from '@/lib/turx-identity'
import { blobConfigured, loadGuildStore, mutateGuildStore, resolveUserRole } from '@/lib/turx-store'
import { normalizeAvailability } from '@/lib/availability'

export const dynamic = 'force-dynamic'

export type DayKey = 'pzt' | 'sal' | 'crs' | 'per' | 'cum' | 'cmt' | 'paz'

export const DAY_CONFIG: Record<DayKey, { label: string; short: string; raidName?: string }> = {
  pzt: { label: 'Pazartesi', short: 'PZT' },
  sal: { label: 'Salı', short: 'SAL' },
  crs: { label: 'Çarşamba', short: 'ÇAR', raidName: 'Barrow Deeps & Onyxia' },
  per: { label: 'Perşembe', short: 'PER', raidName: 'Hyjal Summit Progress' },
  cum: { label: 'Cuma', short: 'CUM' },
  cmt: { label: 'Cumartesi', short: 'CMT' },
  paz: { label: 'Pazar', short: 'PAZ', raidName: 'Farm & Alt Run' },
}

const ORDERED_DAYS: DayKey[] = ['pzt', 'sal', 'crs', 'per', 'cum', 'cmt', 'paz']

type StoredCharacter = {
  id?: string
  firstName?: string
  lastName?: string
  wowClass?: string
  spec?: string
  role?: 'TANK' | 'HEALER' | 'MELEE' | 'RANGED'
  isMain?: boolean
}

export async function GET(request: Request) {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ summary: [], members: [], totalMembers: 0 })
    }

    const session = sessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 })
    }

    const store = await loadGuildStore()
    const caller = store.users.find((u) => u.username.toLowerCase() === session.username.toLowerCase())
    if (!caller) {
      return NextResponse.json({ error: 'Hesap bulunamadı.' }, { status: 404 })
    }

    const isAuthorized = canAccessAdminPanel(resolveUserRole(caller))
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Bu panel için GM veya Officer yetkisi gereklidir.' }, { status: 403 })
    }

    const membersData = store.users.map((account) => {
      const rawProfile = (account.profile || {}) as Record<string, unknown>
      const characters = Array.isArray(account.characters) ? (account.characters as StoredCharacter[]) : []
      const mainChar = characters.find((c) => c.isMain) || characters[0]
      const mainCharName = mainChar ? `${mainChar.firstName || ''} ${mainChar.lastName || ''}`.trim() : '—'
      const wowClass = mainChar?.wowClass || 'Warrior'
      const spec = mainChar?.spec || 'DPS'
      const role = mainChar?.role || 'MELEE'

      const normalizedAv = normalizeAvailability(rawProfile.availability)
      const availability: Record<DayKey, { status: 'available' | 'maybe' | 'busy'; startTime: string; endTime: string }> = {
        pzt: normalizedAv.pzt,
        sal: normalizedAv.sal,
        crs: normalizedAv.car,
        per: normalizedAv.per,
        cum: normalizedAv.cum,
        cmt: normalizedAv.cmt,
        paz: normalizedAv.paz,
      }

      const skipRaidsForNow = rawProfile.skipRaidsForNow === true
      const hasConfigured = skipRaidsForNow || Object.values(availability).some((d) => d.status !== 'busy')

      return {
        username: account.username,
        fullName: typeof rawProfile.fullName === 'string' && rawProfile.fullName.trim() ? rawProfile.fullName.trim() : account.username,
        guildRank: resolveUserRole(account),
        mainCharName,
        wowClass,
        spec,
        role,
        availability,
        hasConfigured,
        skipRaidsForNow,
      }
    })

    const totalMembers = membersData.length

    const summary = ORDERED_DAYS.map((dayKey) => {
      const cfg = DAY_CONFIG[dayKey]
      let availableCount = 0
      let maybeCount = 0
      let busyCount = 0
      let tanks = 0
      let healers = 0
      let dps = 0

      for (const m of membersData) {
        const status = m.availability[dayKey].status
        if (status === 'available') {
          availableCount += 1
          if (m.role === 'TANK') tanks += 1
          else if (m.role === 'HEALER') healers += 1
          else dps += 1
        } else if (status === 'maybe') {
          maybeCount += 1
        } else {
          busyCount += 1
        }
      }

      return {
        dayKey,
        label: cfg.label,
        short: cfg.short,
        raidName: cfg.raidName || null,
        availableCount,
        maybeCount,
        busyCount,
        tanks,
        healers,
        dps,
      }
    })

    return NextResponse.json(
      {
        summary,
        members: membersData,
        totalMembers,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    console.error('attendance GET', err)
    return NextResponse.json({ error: 'Müsaitlik verileri okunamadı.' }, { status: 500 })
  }
}
