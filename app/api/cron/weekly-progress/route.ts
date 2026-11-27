import { NextResponse } from 'next/server'
import { runWeeklyProgressSync } from '@/lib/progress-tracker'
import { blobConfigured, loadGuildStore, mutateGuildStore } from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

function authorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (cronSecret && request.headers.get('authorization') === `Bearer ${cronSecret}`) return true
  const authSecret = process.env.AUTH_SECRET?.trim()
  if (authSecret && authSecret.length >= 16 && request.headers.get('x-admin-secret')?.trim() === authSecret) {
    return true
  }
  return request.headers.get('x-vercel-cron') === '1'
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!blobConfigured()) {
    return NextResponse.json({ ok: false, error: 'Veritabanı bağlı değil.' }, { status: 503 })
  }
  try {
    const progress = await runWeeklyProgressSync(loadGuildStore, mutateGuildStore, 'cron')
    return NextResponse.json(
      {
        ok: true,
        source: 'cron',
        progress,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    console.error('cron weekly-progress', err)
    return NextResponse.json({ error: 'Haftalık progress senkronizasyonu başarısız.' }, { status: 500 })
  }
}
