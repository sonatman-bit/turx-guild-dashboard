import { NextResponse } from 'next/server'
import { sessionFromRequest } from '@/lib/auth-email'
import { isGuildMasterEmail } from '@/lib/turx-identity'
import {
  blobConfigured,
  loadGuildStore,
  mergeGuildStores,
  mutateGuildStore,
  type GuildStore,
} from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

function isAuthorizedBySecret(request: Request): boolean {
  const secret = process.env.AUTH_SECRET?.trim()
  if (!secret || secret.length < 16) return false
  const header = request.headers.get('x-admin-secret')?.trim()
  return Boolean(header && header === secret)
}

async function isAuthorizedAdmin(request: Request): Promise<boolean> {
  if (isAuthorizedBySecret(request)) return true
  const session = sessionFromRequest(request)
  if (!session) return false
  const store = await loadGuildStore()
  const caller = store.users.find(
    (u) => u.username.toLowerCase() === session.username.toLowerCase(),
  )
  if (!caller) return false
  return isGuildMasterEmail(caller.email) || caller.role === 'Guild Master'
}

export async function GET(request: Request) {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ error: 'Veritabanı bağlı değil.' }, { status: 503 })
    }
    if (!(await isAuthorizedAdmin(request))) {
      return NextResponse.json({ error: 'Yetki yok.' }, { status: 403 })
    }
    const store = await loadGuildStore()
    return new NextResponse(JSON.stringify(store, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="turx-guild-store-backup-${new Date().toISOString().slice(0, 10)}.json"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('admin/backup GET', err)
    return NextResponse.json({ error: 'Yedek alınamadı.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ error: 'Veritabanı bağlı değil.' }, { status: 503 })
    }
    if (!(await isAuthorizedAdmin(request))) {
      return NextResponse.json({ error: 'Yetki yok.' }, { status: 403 })
    }
    const incoming = (await request.json()) as Partial<GuildStore>
    const summary = await mutateGuildStore((current) => {
      const merged = mergeGuildStores(current, incoming)
      current.users = merged.users
      current.applications = merged.applications
      current.polls = merged.polls
      current.recruitmentNeeds = merged.recruitmentNeeds
      current.streamNotices = merged.streamNotices
      current.raidStates = merged.raidStates
      current.bankRequests = merged.bankRequests
      current.bankLedger = merged.bankLedger
      return {
        users: current.users.length,
        applications: current.applications.length,
        polls: current.polls.length,
      }
    })
    return NextResponse.json({ ok: true, ...summary }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('admin/backup POST', err)
    return NextResponse.json({ error: 'Yedek geri yüklenemedi.' }, { status: 500 })
  }
}
