import { NextResponse } from 'next/server'
import { sessionFromRequest } from '@/lib/auth-email'
import { canAccessAdminPanel, isGuildMasterEmail } from '@/lib/turx-identity'
import {
  blobConfigured,
  loadGuildStore,
  mergeGuildStores,
  mutateGuildStore,
  resolveUserRole,
  type GuildStore,
} from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

function isAuthorizedBySecret(request: Request): boolean {
  const secret = process.env.AUTH_SECRET?.trim()
  if (secret && secret.length >= 16) {
    const header = request.headers.get('x-admin-secret')?.trim()
    if (header && header === secret) return true
  }
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')?.trim()
    if (authHeader === `Bearer ${cronSecret}`) return true
  }
  return false
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
  return isGuildMasterEmail(caller.email) || resolveUserRole(caller) === 'Guild Master'
}

async function sendBackupAttachmentToDiscord(store: GuildStore): Promise<{ ok: boolean; error?: string }> {
  const webhookUrl = (process.env.DISCORD_BACKUP_WEBHOOK_URL || '').trim()

  if (!webhookUrl) {
    return {
      ok: false,
      error: 'Güvenlik için yalnızca size özel bir Discord kanalı webhook\'u (DISCORD_BACKUP_WEBHOOK_URL) tanımlanmalıdır.',
    }
  }

  const dateStr = new Date().toISOString().slice(0, 10)
  const fileName = `turx-guild-store-backup-${dateStr}.json`
  const jsonContent = JSON.stringify(store, null, 2)

  const form = new FormData()
  form.append(
    'payload_json',
    JSON.stringify({
      username: 'TURX Yedekleme Botu',
      embeds: [
        {
          title: '📦 TURX Veritabanı Yedeği',
          description: `Veritabanının güncel JSON yedeği ektedir. İhtiyaç halinde **Yönetim Paneli -> Yedek Yükle** butonundan bu dosyayı geri yükleyebilirsiniz.`,
          color: 0xd4af37,
          fields: [
            { name: '👥 Kayıtlı Üye', value: String(store.users.length), inline: true },
            { name: '📋 Başvuru', value: String(store.applications.length), inline: true },
            { name: '🗳️ Anket', value: String(store.polls.length), inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  )
  form.append('files[0]', new Blob([jsonContent], { type: 'application/json' }), fileName)

  const res = await fetch(webhookUrl, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    return { ok: false, error: `Discord hatası (${res.status}): ${errText.slice(0, 120)}` }
  }
  return { ok: true }
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
    const url = new URL(request.url)
    if (url.searchParams.get('discord') === '1') {
      await sendBackupAttachmentToDiscord(store)
    }
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

export async function PUT(request: Request) {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ error: 'Veritabanı bağlı değil.' }, { status: 503 })
    }
    if (!(await isAuthorizedAdmin(request))) {
      return NextResponse.json({ error: 'Yetki yok.' }, { status: 403 })
    }
    const store = await loadGuildStore()
    const sent = await sendBackupAttachmentToDiscord(store)
    if (!sent.ok) {
      return NextResponse.json({ error: sent.error || 'Discord yedeği gönderilemedi.' }, { status: 500 })
    }
    return NextResponse.json({
      ok: true,
      users: store.users.length,
      applications: store.applications.length,
    })
  } catch (err) {
    console.error('admin/backup PUT', err)
    return NextResponse.json({ error: 'Discord yedeği gönderilemedi.' }, { status: 500 })
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
