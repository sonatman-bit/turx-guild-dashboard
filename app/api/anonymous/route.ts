import { NextResponse } from 'next/server'
import { anonymousMessageHtml, rateLimit, sendAuthEmail } from '@/lib/auth-email'
import { GM_EMAIL } from '@/lib/turx-identity'

const TOPICS = ['Raid Yönetimi', 'Loot Dağıtımı', 'Üye Davranışı', 'Öneri', 'Diğer'] as const
const RECIPIENTS = ['Guild Master + Officer’lar', 'Sadece Guild Master'] as const

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { to?: string; topic?: string; message?: string }
    const toLabel = RECIPIENTS.includes(body.to as (typeof RECIPIENTS)[number])
      ? (body.to as string)
      : RECIPIENTS[0]
    const topic = TOPICS.includes(body.topic as (typeof TOPICS)[number]) ? (body.topic as string) : 'Diğer'
    const message = (body.message || '').trim()

    if (message.length < 8 || message.length > 1000) {
      return NextResponse.json({ error: 'Mesaj 8 ile 1000 karakter arasında olmalı.' }, { status: 400 })
    }

    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
    if (!rateLimit(`anonymous:${forwarded}`, 8, 10 * 60 * 1000)) {
      return NextResponse.json({ error: 'Çok fazla mesaj. Birkaç dakika sonra tekrar dene.' }, { status: 429 })
    }

    const html = anonymousMessageHtml({ toLabel, topic, message })
    const text = `TURX anonim mesaj\nAlıcı seçimi: ${toLabel}\nKonu: ${topic}\n\n${message}\n`

    let emailError = ''
    if (process.env.RESEND_API_KEY?.trim()) {
      try {
        await sendAuthEmail({
          to: GM_EMAIL,
          subject: `TURX anonim mesaj - ${topic}`,
          html,
          text,
        })
      } catch (err) {
        emailError = err instanceof Error ? err.message : 'E-posta gönderilemedi.'
        console.error('anonymous resend', emailError)
      }
    } else {
      emailError = 'RESEND_API_KEY missing'
    }

    const webhookUrl = process.env.DISCORD_RECRUITMENT_WEBHOOK_URL
    let discordOk = false
    if (webhookUrl) {
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
    }

    if (!process.env.RESEND_API_KEY?.trim() && !discordOk) {
      return NextResponse.json({ error: 'Mesaj iletilemedi. E-posta henüz yapılandırılmadı.' }, { status: 503 })
    }
    if (emailError && !discordOk) {
      return NextResponse.json({ error: emailError }, { status: 502 })
    }

    return NextResponse.json({
      ok: true,
      email: !emailError,
      discord: discordOk,
    })
  } catch (err) {
    console.error('anonymous message', err)
    const messageText = err instanceof Error ? err.message : 'Mesaj gönderilemedi. Lütfen tekrar dene.'
    return NextResponse.json({ error: messageText }, { status: 500 })
  }
}
