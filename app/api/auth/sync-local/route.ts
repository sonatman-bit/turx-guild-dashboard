import { NextResponse } from 'next/server'
import { blobConfigured, mutateGuildStore, upsertMissingAccount, type ImportableAccount } from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ error: 'Hesap deposu henüz bağlı değil.' }, { status: 503 })
    }
    const body = (await request.json().catch(() => ({}))) as { accounts?: ImportableAccount[] }
    const accounts = Array.isArray(body.accounts) ? body.accounts.slice(0, 50) : []
    const result = await mutateGuildStore((store) => {
      let added = 0
      let skipped = 0
      for (const account of accounts) {
        const status = upsertMissingAccount(store, account)
        if (status === 'added') added += 1
        else skipped += 1
      }
      return { added, skipped, total: store.users.length }
    })
    return NextResponse.json({ ok: true, ...result }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('auth sync-local', err)
    return NextResponse.json({ error: 'Yerel hesaplar aktarılamadı.' }, { status: 500 })
  }
}
