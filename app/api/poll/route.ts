import { NextResponse } from 'next/server'
import { sessionFromRequest } from '@/lib/auth-email'
import { ACTIVE_POLL } from '@/lib/guild-data'
import { isPollOptionId, publicPollSummary, votesForPoll } from '@/lib/poll'
import { blobConfigured, loadGuildStore, mutateGuildStore } from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(request: Request) {
  try {
    if (!blobConfigured()) return json({ error: 'Anket deposu henüz bağlı değil.' }, 503)
    const session = sessionFromRequest(request)
    const store = await loadGuildStore()
    const votes = votesForPoll(store.polls)
    return json(publicPollSummary(votes, session?.username))
  } catch (err) {
    console.error('poll GET', err)
    return json({ error: 'Anket okunamadı.' }, 500)
  }
}

export async function POST(request: Request) {
  try {
    if (!blobConfigured()) return json({ error: 'Anket deposu henüz bağlı değil.' }, 503)
    const session = sessionFromRequest(request)
    if (!session) return json({ error: 'Oy vermek için giriş yap.' }, 401)
    const body = (await request.json().catch(() => ({}))) as { optionId?: string }
    const optionId = (body.optionId || '').trim()
    if (!isPollOptionId(optionId)) return json({ error: 'Geçersiz seçenek.' }, 400)

    const result = await mutateGuildStore((store) => {
      const user = store.users.find((item) => item.username.toLowerCase() === session.username.toLowerCase())
      if (!user) throw new Error('NOT_FOUND')
      let poll = store.polls.find((item) => item.id === ACTIVE_POLL.id)
      if (!poll) {
        poll = { id: ACTIVE_POLL.id, votes: [] }
        store.polls.push(poll)
      }
      const already = poll.votes.find((vote) => vote.username.toLowerCase() === session.username.toLowerCase())
      if (already) throw new Error('ALREADY_VOTED')
      poll.votes.push({
        username: user.username,
        optionId,
        at: new Date().toISOString(),
      })
      return publicPollSummary(poll.votes, session.username)
    })

    return json({ ok: true, ...result })
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      return json({ error: 'Hesap bulunamadı.' }, 404)
    }
    if (err instanceof Error && err.message === 'ALREADY_VOTED') {
      return json({ error: 'Bu anket için zaten oy kullandın.' }, 409)
    }
    console.error('poll POST', err)
    return json({ error: 'Oy kaydedilemedi.' }, 500)
  }
}
