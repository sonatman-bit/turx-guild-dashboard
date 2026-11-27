import { NextResponse } from 'next/server'
import { anonymousMessageHtml, rateLimit, sendAuthEmail } from '@/lib/auth-email'
import { GM_EMAIL } from '@/lib/turx-identity'
import {
  addAnonymousMessage,
  blobConfigured,
  mutateGuildStore,
  type AnonymousRecipientScope,
} from '@/lib/turx-store'

const TOPICS = ['Raid Yönetimi', 'Loot Dağıtımı', 'Üye Davranışı', 'Öneri', 'Diğer'] as const

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { to?: string; topic?: string; message?: string }
    const rawTo = (body.to || '').trim()
    const isGmOnly = rawTo === 'Sadece Guild Master'
    const toLabel = isGmOnly ? 'Sadece Guild Master' : 'Guild Master + Görevliler'
    const recipientScope: AnonymousRecipientScope = isGmOnly ? 'GM_ONLY' : 'GM_AND_OFFICERS'
    const topic = TOPICS.includes(body.topic as (typeof TOPICS)[number]) ? (body.topic as string) : 'Diğer'
    const message = (body.message || '').trim()

    if (message.length < 8 || message.length > 1000) {
      return NextResponse.json({ error: 'Mesaj 8 ile 1000 karakter arasında olmalı.' }, { status: 400 })
    }

    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
    if (!rateLimit(`anonymous:${forwarded}`, 8, 10 * 60 * 1000)) {
      return NextResponse.json({ error: 'Çok fazla mesaj. Birkaç dakika sonra tekrar dene.' }, { status: 429 })
    }

    // 1. Save anonymously to GuildStore for GM Control Panel inbox (no IP, session, or identity stored)
    let stored = false
    let storeError = ''
    if (blobConfigured()) {
      try {
        await mutateGuildStore((store) => {
          addAnonymousMessage(store, {
            to: toLabel,
            recipientScope,
            topic,
            message,
          })
        })
        stored = true
      } catch (err) {
        storeError = err instanceof Error ? err.message : 'Mesaj kontrol paneline kaydedilemedi.'
        console.error('anonymous store save', storeError)
      }
    }

    const html = anonymousMessageHtml({ toLabel, topic, message })
    const text = `TURX anonim mesaj\nAlıcı seçimi: ${toLabel}\nKonu: ${topic}\n\n${message}\n`

    // 2. Optional email notification to GM
    let emailError = ''
    let emailSent = false
    if (process.env.RESEND_API_KEY?.trim()) {
      try {
        await sendAuthEmail({
          to: GM_EMAIL,
          subject: `TURX anonim mesaj - ${topic}`,
          html,
          text,
        })
        emailSent = true
      } catch (err) {
        emailError = err instanceof Error ? err.message : 'E-posta gönderilemedi.'
        console.error('anonymous resend', emailError)
      }
    }

    // 3. Dedicated anonymous Discord webhook only — never post to the Guild Başvuru (recruitment) channel
    const webhookUrl = process.env.DISCORD_ANONYMOUS_WEBHOOK_URL?.trim()
    let discordOk = false
    if (webhookUrl) {
      try {
        const discord = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [
              {
                title: 'Anonim Mesaj Kutusu',
                color: 0xd4af37,
                fields: [
                  { name: 'Alıcı seçimi', value: toLabel, inline: true },
                  { name: 'Konu', value: topic, inline: true },
                  { name: 'Mesaj', value: message.slice(0, 1000) },
                ],
                footer: { text: 'Kimlik eklenmez · TURX anonim kutu' },
                timestamp: new Date().toISOString(),
              },
            ],
          }),
        })
        discordOk = discord.ok
      } catch (err) {
        console.error('anonymous discord', err)
      }
    }

    if (!stored && !emailSent && !discordOk) {
      if (!blobConfigured() && !process.env.RESEND_API_KEY?.trim() && !webhookUrl) {
        return NextResponse.json({ error: 'Mesaj iletilemedi. Mesaj kutusu deposu henüz yapılandırılmadı.' }, { status: 503 })
      }
      return NextResponse.json({ error: storeError || emailError || 'Mesaj iletilemedi.' }, { status: 502 })
    }

    return NextResponse.json({
      ok: true,
      stored,
      email: emailSent,
      discord: discordOk,
    })
  } catch (err) {
    console.error('anonymous message', err)
    const messageText = err instanceof Error ? err.message : 'Mesaj gönderilemedi. Lütfen tekrar dene.'
    return NextResponse.json({ error: messageText }, { status: 500 })
  }
}
