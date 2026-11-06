import { NextResponse } from 'next/server'
import { sessionFromRequest } from '@/lib/auth-email'
import { pollOptionLabel, publicPollSummary, votesForPoll } from '@/lib/poll'
import { canAccessAdminPanel } from '@/lib/turx-identity'
import { blobConfigured, loadGuildStore, publicAccount } from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(request: Request) {
  try {
    if (!blobConfigured()) return json({ error: 'Anket deposu henüz bağlı değil.' }, 503)
    const session = sessionFromRequest(request)
    if (!session) return json({ error: 'Oturum gerekli.' }, 401)
    const store = await loadGuildStore()
    const viewer = store.users.find((item) => item.username.toLowerCase() === session.username.toLowerCase())
    if (!viewer || !canAccessAdminPanel(publicAccount(viewer).role)) {
      return json({ error: 'Yetki yok.' }, 403)
    }
    const votes = votesForPoll(store.polls)
    return json({
      ...publicPollSummary(votes, session.username),
      ballots: [...votes]
        .sort((a, b) => b.at.localeCompare(a.at))
        .map((vote) => ({
          username: vote.username,
          optionId: vote.optionId,
          optionLabel: pollOptionLabel(vote.optionId),
          at: vote.at,
        })),
    })
  } catch (err) {
    console.error('poll results GET', err)
    return json({ error: 'Anket sonuçları okunamadı.' }, 500)
  }
}
