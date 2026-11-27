import { NextResponse } from 'next/server'
import { sessionFromRequest } from '@/lib/auth-email'
import {
  computeLiveProgressSnapshot,
  defaultRaidProgressEntries,
  runWeeklyProgressSync,
} from '@/lib/progress-tracker'
import { canAccessAdminPanel } from '@/lib/turx-identity'
import { blobConfigured, loadGuildStore, mutateGuildStore, resolveUserRole } from '@/lib/turx-store'
import { loadTurxGuildRosterRanks } from '@/lib/wow-armory'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (!blobConfigured()) {
      return NextResponse.json(
        {
          ok: true,
          progress: {
            lastSyncedAt: new Date().toISOString(),
            source: 'live',
            scheduleLabel: 'Her Çarşamba 05:00 (TR)',
            raids: defaultRaidProgressEntries(),
            level60Count: 0,
            level60Target: 40,
            onyxiaAttunedCount: 0,
            onyxiaAttunedTarget: 40,
            totalArmoryMembers: 0,
            armoryDetectedOnyxiaCount: 0,
          },
        },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const [store, rosterMap] = await Promise.all([
      loadGuildStore(),
      loadTurxGuildRosterRanks().catch(() => undefined),
    ])

    const progress = computeLiveProgressSnapshot(store, rosterMap)
    return NextResponse.json({ ok: true, progress }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('progress GET', err)
    return NextResponse.json({ error: 'Progress verisi alınamadı.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ error: 'Veritabanı bağlı değil.' }, { status: 503 })
    }
    const session = sessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Giriş gerekli.' }, { status: 401 })
    }

    const storeCheck = await loadGuildStore()
    const caller = storeCheck.users.find(
      (u) => u.username.toLowerCase() === session.username.toLowerCase(),
    )
    if (!caller || !canAccessAdminPanel(resolveUserRole(caller))) {
      return NextResponse.json({ error: 'Bu işlem için GM veya Görevli yetkisi gerekir.' }, { status: 403 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      action?: 'sync' | 'update_kills'
      raidId?: string
      killed?: number
    }

    if (body.action === 'update_kills' && body.raidId) {
      let updated = null as ReturnType<typeof computeLiveProgressSnapshot> | null
      await mutateGuildStore((store) => {
        const snap = computeLiveProgressSnapshot(store)
        snap.raids = snap.raids.map((r) =>
          r.raidId === body.raidId
            ? { ...r, killed: Math.max(0, Math.min(r.bosses, Math.floor(Number(body.killed) || 0))) }
            : r,
        )
        snap.lastSyncedAt = new Date().toISOString()
        snap.source = 'manual'
        store.progressTracker = snap
        updated = snap
      })
      return NextResponse.json({ ok: true, progress: updated })
    }

    const progress = await runWeeklyProgressSync(loadGuildStore, mutateGuildStore, 'manual')
    return NextResponse.json({ ok: true, progress })
  } catch (err) {
    console.error('progress POST', err)
    return NextResponse.json({ error: 'Progress güncellenemedi.' }, { status: 500 })
  }
}
