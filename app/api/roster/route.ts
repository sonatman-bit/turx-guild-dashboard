import { NextResponse } from 'next/server'
import { blobConfigured, loadGuildStore, publicAccount } from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ members: [] })
    }
    const store = await loadGuildStore()
    const members = store.users.map((account) => ({
      ...publicAccount(account),
      profile: account.profile || null,
      characters: Array.isArray(account.characters) ? account.characters : [],
    }))
    return NextResponse.json(
      { members },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    console.error('roster GET', err)
    return NextResponse.json({ error: 'Kadro okunamadı.' }, { status: 500 })
  }
}
