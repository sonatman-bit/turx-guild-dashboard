import { NextResponse } from 'next/server'
import { refreshLiveStreams } from '@/lib/twitch-streams'

export const dynamic = 'force-dynamic'

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (secret && request.headers.get('authorization') === `Bearer ${secret}`) return true
  return request.headers.get('x-vercel-cron') === '1'
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const live = await refreshLiveStreams()
    return NextResponse.json({ ok: true, live: live.length })
  } catch (err) {
    console.error('cron streams', err)
    return NextResponse.json({ error: 'Yayınlar okunamadı.' }, { status: 500 })
  }
}
