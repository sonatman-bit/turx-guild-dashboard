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

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'E-posta gönderimi yapılandırılmadı.' }, { status: 503 })
    }

    await sendAuthEmail({
      to: GM_EMAIL,
      subject: `TURX anonim mesaj · ${topic}`,
      html: anonymousMessageHtml({ toLabel, topic, message }),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('anonymous message', err)
    return NextResponse.json({ error: 'Mesaj gönderilemedi. Lütfen tekrar dene.' }, { status: 500 })
  }
}
