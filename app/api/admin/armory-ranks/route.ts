import { NextResponse } from 'next/server'
import {
  normalizeArmoryRankMappings,
  type ArmoryRankMapping,
} from '@/lib/armory-ranks'
import { sessionFromRequest } from '@/lib/auth-email'
import { canAccessAdminPanel, isGuildMasterEmail } from '@/lib/turx-identity'
import { blobConfigured, loadGuildStore, mutateGuildStore, resolveUserRole } from '@/lib/turx-store'
import { foreverArmorySlug, loadTurxGuildRosterRanks } from '@/lib/wow-armory'

export const dynamic = 'force-dynamic'

type StoredCharacter = {
  firstName?: string
  lastName?: string
  armoryRankId?: number | null
  armoryLevel?: number | null
  isMain?: boolean
}

export async function GET(request: Request) {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ error: 'Veritabanı bağlantısı yok.' }, { status: 503 })
    }
    const session = sessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Giriş gerekli.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const refresh = searchParams.get('refresh') === '1'

    const [store, rosterMap] = await Promise.all([
      loadGuildStore(),
      loadTurxGuildRosterRanks({ bypassCache: refresh }),
    ])

    const caller = store.users.find(
      (u) => u.username.toLowerCase() === session.username.toLowerCase(),
    )
    if (!caller || !canAccessAdminPanel(resolveUserRole(caller))) {
      return NextResponse.json({ error: 'Yetki gerekli.' }, { status: 403 })
    }

    const byRankId = new Map<number, { rankId: number; count: number; samples: string[] }>()
    for (const m of rosterMap.values()) {
      const existing = byRankId.get(m.rankId) || { rankId: m.rankId, count: 0, samples: [] }
      existing.count += 1
      if (existing.samples.length < 4) {
        existing.samples.push(`${m.name} ${m.surname}`)
      }
      byRankId.set(m.rankId, existing)
    }

    const liveRanks = [...byRankId.values()].sort((a, b) => a.rankId - b.rankId)

    return NextResponse.json(
      {
        ok: true,
        mappings: normalizeArmoryRankMappings(store.armoryRankMappings),
        liveRanks,
        totalArmoryMembers: rosterMap.size,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    console.error('admin armory-ranks GET', err)
    return NextResponse.json({ error: 'Armory rank bilgileri alınamadı.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ error: 'Veritabanı bağlantısı yok.' }, { status: 503 })
    }
    const session = sessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Giriş gerekli.' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      mappings?: ArmoryRankMapping[]
      syncFromArmory?: boolean
    }

    const rosterMap = body.syncFromArmory
      ? await loadTurxGuildRosterRanks({ bypassCache: true })
      : null

    let savedMappings: ArmoryRankMapping[] = []
    let syncedCount = 0

    await mutateGuildStore((store) => {
      const caller = store.users.find(
        (u) => u.username.toLowerCase() === session.username.toLowerCase(),
      )
      if (!caller) throw new Error('FORBIDDEN')
      const role = resolveUserRole(caller)
      const isGm = isGuildMasterEmail(caller.email) || role === 'Guild Master'
      if (!isGm) throw new Error('GM_REQUIRED')

      if (Array.isArray(body.mappings)) {
        savedMappings = normalizeArmoryRankMappings(body.mappings)
        store.armoryRankMappings = savedMappings
      } else {
        savedMappings = normalizeArmoryRankMappings(store.armoryRankMappings)
      }

      if (rosterMap && rosterMap.size > 0) {
        for (const u of store.users) {
          if (!Array.isArray(u.characters)) continue
          for (const raw of u.characters) {
            const c = raw as StoredCharacter
            const fn = (c.firstName || '').trim()
            const ln = (c.lastName || '').trim()
            if (!fn || !ln) continue
            const match = rosterMap.get(foreverArmorySlug(fn, ln))
            if (match) {
              c.armoryRankId = match.rankId
              if (typeof match.level === 'number' && match.level > 0) {
                c.armoryLevel = match.level
              }
              syncedCount += 1
            }
          }
        }
      }
    })

    return NextResponse.json(
      {
        ok: true,
        mappings: savedMappings,
        syncedCount,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    const code = err instanceof Error ? err.message : ''
    if (code === 'GM_REQUIRED' || code === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Bu işlem yalnızca Guild Master içindir.' }, { status: 403 })
    }
    console.error('admin armory-ranks POST', err)
    return NextResponse.json({ error: 'Rank şablonu kaydedilemedi.' }, { status: 500 })
  }
}
