import { NextResponse } from 'next/server'
import { sessionFromRequest } from '@/lib/auth-email'
import { isGuildMasterEmail } from '@/lib/turx-identity'
import { blobConfigured, loadGuildStore, mutateGuildStore, type StoredBankRequest, type StoredBankTransaction } from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

function isOfficerOrGm(username: string, store: Awaited<ReturnType<typeof loadGuildStore>>) {
  const user = store.users.find((u) => u.username.toLowerCase() === username.toLowerCase())
  if (!user) return false
  return isGuildMasterEmail(user.email) || user.role === 'Guild Master' || user.role === 'Officer'
}

export async function GET() {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ requests: [], ledger: [] })
    }
    const store = await loadGuildStore()
    return NextResponse.json(
      {
        requests: store.bankRequests || [],
        ledger: store.bankLedger || [],
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    console.error('bank GET', err)
    return NextResponse.json({ error: 'Banka verileri okunamadı.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ error: 'Hesap deposu henüz bağlı değil.' }, { status: 503 })
    }

    const session = sessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Oturum açmanız gerekmektedir.' }, { status: 401 })
    }

    const body = (await request.json()) as {
      item?: string
      qty?: number
      raid?: string
      note?: string
    }

    const item = (body.item || '').trim()
    const qty = typeof body.qty === 'number' ? body.qty : parseInt(String(body.qty || '0'), 10)
    const raid = (body.raid || '').trim() || 'Genel'
    const note = (body.note || '').trim()

    if (!item) {
      return NextResponse.json({ error: 'Malzeme seçimi zorunludur.' }, { status: 400 })
    }
    if (isNaN(qty) || qty < 1 || qty > 100) {
      return NextResponse.json({ error: 'Adet 1 ile 100 arasında olmalıdır.' }, { status: 400 })
    }

    const reqId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const newRequest: StoredBankRequest = {
      id: reqId,
      username: session.username,
      item,
      qty,
      raid,
      note,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    }

    const newLedgerItem: StoredBankTransaction = {
      id: `${Date.now()}-ledger`,
      who: session.username,
      what: `Talep: ${qty}x ${item}`,
      time: 'Bugün',
    }

    await mutateGuildStore((store) => {
      if (!Array.isArray(store.bankRequests)) store.bankRequests = []
      if (!Array.isArray(store.bankLedger)) store.bankLedger = []

      store.bankRequests.unshift(newRequest)
      store.bankLedger.unshift(newLedgerItem)

      // Keep ledger within sensible size
      if (store.bankLedger.length > 50) {
        store.bankLedger = store.bankLedger.slice(0, 50)
      }
    })

    // Forward notification to Discord recruitment/general webhook
    const webhook = process.env.DISCORD_RECRUITMENT_WEBHOOK_URL || process.env.DISCORD_STREAM_WEBHOOK_URL
    if (webhook) {
      const embed = {
        title: '📦 Yeni Guild Bankası Malzeme Talebi',
        color: 0xd4af37,
        fields: [
          { name: '👤 Talep Eden', value: session.username, inline: true },
          { name: '🧪 Malzeme & Adet', value: `\`${qty}x ${item}\``, inline: true },
          { name: '🏰 Raid', value: raid, inline: true },
          { name: '📝 Not', value: note ? `\`\`\`text\n${note}\n\`\`\`` : '*Belirtilmedi*', inline: false },
        ],
        footer: { text: 'TURX Guild Bank Entegrasyonu' },
        timestamp: new Date().toISOString(),
      }

      void fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      }).catch(() => undefined)
    }

    return NextResponse.json({ ok: true, request: newRequest })
  } catch (err) {
    console.error('bank POST', err)
    return NextResponse.json({ error: 'Banka talebi oluşturulurken hata oluştu.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ error: 'Hesap deposu henüz bağlı değil.' }, { status: 503 })
    }

    const session = sessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Oturum açmanız gerekmektedir.' }, { status: 401 })
    }

    const body = (await request.json()) as {
      id?: string
      status?: 'APPROVED' | 'REJECTED'
    }

    const { id, status } = body
    if (!id || (status !== 'APPROVED' && status !== 'REJECTED')) {
      return NextResponse.json({ error: 'Geçersiz talep parametreleri.' }, { status: 400 })
    }

    let updatedReq: StoredBankRequest | null = null

    await mutateGuildStore((store) => {
      if (!isOfficerOrGm(session.username, store)) {
        throw new Error('OFFICER_REQUIRED')
      }

      if (!Array.isArray(store.bankRequests)) store.bankRequests = []
      if (!Array.isArray(store.bankLedger)) store.bankLedger = []

      const target = store.bankRequests.find((r) => r.id === id)
      if (!target) throw new Error('REQUEST_NOT_FOUND')

      target.status = status
      target.updatedAt = new Date().toISOString()
      target.reviewedBy = session.username
      updatedReq = target

      const statusText = status === 'APPROVED' ? 'Onaylandı' : 'Reddedildi'
      const ledgerEntry: StoredBankTransaction = {
        id: `${Date.now()}-action`,
        who: session.username,
        what: `${statusText}: ${target.qty}x ${target.item} (${target.username})`,
        time: 'Bugün',
      }
      store.bankLedger.unshift(ledgerEntry)
      if (store.bankLedger.length > 50) {
        store.bankLedger = store.bankLedger.slice(0, 50)
      }
    })

    return NextResponse.json({ ok: true, request: updatedReq })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg === 'OFFICER_REQUIRED') {
      return NextResponse.json({ error: 'Bu işlem için GM veya Officer yetkisi gereklidir.' }, { status: 403 })
    }
    if (msg === 'REQUEST_NOT_FOUND') {
      return NextResponse.json({ error: 'Talep bulunamadı.' }, { status: 404 })
    }
    console.error('bank PATCH', err)
    return NextResponse.json({ error: 'Talep güncellenirken hata oluştu.' }, { status: 500 })
  }
}
