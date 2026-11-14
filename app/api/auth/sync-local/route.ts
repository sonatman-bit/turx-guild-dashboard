import { NextResponse } from 'next/server'
import {
  blobConfigured,
  loadGuildStore,
  mutateGuildStore,
  upsertMissingAccount,
  type ImportableAccount,
} from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ error: 'Hesap deposu henüz bağlı değil.' }, { status: 503 })
    }
    const body = (await request.json().catch(() => ({}))) as { accounts?: ImportableAccount[] }
    const accounts = Array.isArray(body.accounts) ? body.accounts.slice(0, 50) : []
    if (accounts.length === 0) {
      return NextResponse.json({ ok: true, added: 0, skipped: 0, total: 0 }, { headers: { 'Cache-Control': 'no-store' } })
    }

    // Dry-run check on read-only store first so we never overwrite the store when nothing changed
    const previewStore = await loadGuildStore()
    let needsWrite = false
    for (const account of accounts) {
      if (upsertMissingAccount(previewStore, account) === 'added') {
        needsWrite = true
      }
    }
    if (!needsWrite) {
      return NextResponse.json(
        { ok: true, added: 0, skipped: accounts.length, total: previewStore.users.length },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }

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
