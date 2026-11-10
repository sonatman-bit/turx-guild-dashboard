import { NextResponse } from 'next/server'
import { sessionFromRequest } from '@/lib/auth-email'
import { isGuildMasterEmail } from '@/lib/turx-identity'
import { blobConfigured, loadGuildStore, resolveUserRole } from '@/lib/turx-store'

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

    const isAuthorized = isGuildMasterEmail(caller.email) || caller.role === 'Guild Master' || caller.role === 'Officer'
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

      const rawAvailability = (rawProfile.availability || {}) as Record<
        string,
        { status?: string; startTime?: string; endTime?: string }
      >

      const availability: Record<DayKey, { status: 'available' | 'maybe' | 'busy' | 'none'; startTime: string; endTime: string }> = {
        pzt: { status: 'none', startTime: '21:00', endTime: '00:00' },
        sal: { status: 'none', startTime: '21:00', endTime: '00:00' },
        crs: { status: 'none', startTime: '21:00', endTime: '00:00' },
        per: { status: 'none', startTime: '21:00', endTime: '00:00' },
        cum: { status: 'none', startTime: '21:00', endTime: '00:00' },
        cmt: { status: 'none', startTime: '21:00', endTime: '00:00' },
        paz: { status: 'none', startTime: '21:00', endTime: '00:00' },
      }

      for (const day of ORDERED_DAYS) {
        const item = rawAvailability[day]
        if (item) {
          const st = item.status === 'available' || item.status === 'maybe' || item.status === 'busy' ? item.status : 'none'
          availability[day] = {
            status: st,
            startTime: item.startTime || '21:00',
            endTime: item.endTime || '00:00',
          }
        }
      }

      const hasConfigured = Object.values(availability).some((d) => d.status !== 'none')

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
