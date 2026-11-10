import { NextResponse } from 'next/server'
import { sessionFromRequest } from '@/lib/auth-email'
import { isGuildMasterEmail } from '@/lib/turx-identity'
import { blobConfigured, loadGuildStore } from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

const DEFAULT_STREAM_WEBHOOK =
  'https://discord.com/api/webhooks/1568543616773656710/mW8av4N8uRHSMzddWyQVGiEphtYnAEmqr5Pdttda1GnPb-fOKA-V6lEFmKFjkx2Cy020'

function streamWebhookUrl() {
  return (
    process.env.DISCORD_STREAM_WEBHOOK_URL?.trim() ||
    DEFAULT_STREAM_WEBHOOK
  )
}

export async function POST(request: Request) {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ error: 'Hesap deposu henüz bağlı değil.' }, { status: 503 })
    }

    const session = sessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 })
    }

    const store = await loadGuildStore()
    const caller = store.users.find((u) => u.username.toLowerCase() === session.username.toLowerCase())
    if (!caller) {
      return NextResponse.json({ error: 'Hesap bulunamadı.' }, { status: 404 })
    }

    const isAuthorized = isGuildMasterEmail(caller.email) || caller.role === 'Guild Master' || caller.role === 'Officer'
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Bu test için GM veya Officer yetkisi gereklidir.' }, { status: 403 })
    }

    const webhook = streamWebhookUrl()
    const hasDedicatedStreamWebhook = Boolean(process.env.DISCORD_STREAM_WEBHOOK_URL?.trim())
    const hasRecruitmentWebhook = Boolean(process.env.DISCORD_RECRUITMENT_WEBHOOK_URL?.trim())

    if (!webhook) {
      return NextResponse.json({
        ok: false,
        error: 'DISCORD_STREAM_WEBHOOK_URL ve DISCORD_RECRUITMENT_WEBHOOK_URL ortam değişkenleri tanımlı değil.',
        hasDedicatedStreamWebhook: false,
      }, { status: 400 })
    }

    const testPayload = {
      embeds: [
        {
          title: '🟢 TURX #canlıyayın Webhook Testi',
          color: 0x9146ff,
          description: 'Bu mesaj TURX Guild Dashboard üzerinden test amaçlı gönderilmiştir. Discord webhook bağlantısı başarıyla çalışıyor!',
          fields: [
            { name: 'Test Eden Yetkili', value: session.username, inline: true },
            { name: 'Kanal Hedefi', value: hasDedicatedStreamWebhook ? '#canlıyayın (Özel Webhook)' : '#alım / fallback kanalı', inline: true },
            { name: 'Zaman Damgası', value: new Date().toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul' }), inline: true },
          ],
          footer: { text: 'TURX Stream Radar Entegrasyonu' },
          timestamp: new Date().toISOString(),
        },
      ],
    }

    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      let discordMessage = errorText
      try {
        const parsed = JSON.parse(errorText) as { message?: string }
        if (parsed.message) discordMessage = parsed.message
      } catch {
        // fallback to raw text
      }

      return NextResponse.json({
        ok: false,
        status: response.status,
        hasDedicatedStreamWebhook,
        hasRecruitmentWebhook,
        error: `Discord hata döndürdü (HTTP ${response.status}): ${discordMessage}`,
      })
    }

    return NextResponse.json({
      ok: true,
      status: response.status,
      hasDedicatedStreamWebhook,
      hasRecruitmentWebhook,
      message: hasDedicatedStreamWebhook
        ? 'Test mesajı başarıyla #canlıyayın kanalına gönderildi!'
        : 'DISCORD_STREAM_WEBHOOK_URL tanımlı olmadığı için mesaj recruitment webhook kanalına gönderildi. #canlıyayın için ayrı DISCORD_STREAM_WEBHOOK_URL tanımlamanız önerilir.',
    })
  } catch (err) {
    console.error('stream test-webhook', err)
    return NextResponse.json({ error: 'Webhook testi sırasında bağlantı hatası oluştu.' }, { status: 500 })
  }
}
