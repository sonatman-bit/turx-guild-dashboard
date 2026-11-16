import { NextResponse } from 'next/server'
import { normalizeAvailability } from '@/lib/availability'
import { blobConfigured, loadGuildStore, mutateGuildStore } from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ error: 'Depo yapılandırılmamış.' }, { status: 503 })
    }

    const authHeader = request.headers.get('authorization')
    const secret = process.env.AUTH_SECRET

    // Allow internal migration or admin trigger
    let migratedCount = 0
    const summary: Array<{ username: string; before: unknown; after: unknown }> = []

    await mutateGuildStore((store) => {
      for (const user of store.users) {
        const profile = { ...(user.profile || {}) } as Record<string, unknown>
        const before = profile.availability
        const after = normalizeAvailability(before)
        profile.availability = after
        user.profile = profile
        migratedCount += 1
        summary.push({
          username: user.username,
          before,
          after,
        })
      }
    })

    return NextResponse.json({
      ok: true,
      migratedCount,
      message: `${migratedCount} kullanıcının raid müsaitlik takvimi 'meşgul' varsayılanı ile başarıyla güncellendi.`,
      users: summary.map((s) => s.username),
    })
  } catch (err) {
    console.error('migrate-availability error', err)
    return NextResponse.json({ error: 'Migrasyon başarısız oldu.' }, { status: 500 })
  }
}
