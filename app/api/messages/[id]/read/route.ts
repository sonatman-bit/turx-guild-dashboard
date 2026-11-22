import { NextResponse } from 'next/server'
import { sessionFromRequest } from '@/lib/auth-email'
import { blobConfigured, markMessageAsRead, mutateGuildStore } from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    if (!blobConfigured()) return json({ error: 'Mesaj servisi henüz bağlı değil.' }, 503)
    const session = sessionFromRequest(request)
    if (!session) return json({ error: 'Giriş gerekli.' }, 401)

    const params = await props.params
    const messageId = params.id
    if (!messageId) return json({ error: 'Mesaj ID eksik.' }, 400)

    let readAt = ''
    let found = false

    await mutateGuildStore((store) => {
      const res = markMessageAsRead(store, messageId, session.username)
      found = res.success
      readAt = res.readAt
    })

    if (!found) {
      return json({ error: 'Mesaj bulunamadı.' }, 404)
    }

    return json({ ok: true, messageId, readAt })
  } catch (err) {
    console.error('message read POST', err)
    return json({ error: 'Okundu bilgisi kaydedilemedi.' }, 500)
  }
}
