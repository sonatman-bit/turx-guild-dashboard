import { NextResponse } from 'next/server'
import { runAndPersistArmoryAudit } from '@/lib/armory-audit-service'
import { blobConfigured } from '@/lib/turx-store'

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
    const { auditState, summary } = await runAndPersistArmoryAudit('cron')
    return NextResponse.json(
      {
        ok: true,
        source: 'cron',
        checkedAt: auditState.lastCheckedAt,
        summary,
        flaggedCount: auditState.flaggedUsers.length,
        flaggedUsernames: auditState.flaggedUsers.map((u) => u.username),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    console.error('cron armory-sync', err)
    return NextResponse.json({ error: 'Günlük Armory taraması başarısız.' }, { status: 500 })
  }
}
