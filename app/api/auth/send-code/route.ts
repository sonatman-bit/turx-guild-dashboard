import { NextResponse } from 'next/server'
import {
  createResetToken,
  isDisposableEmail,
  isValidEmail,
  normalizeEmail,
  rateLimit,
  resetEmailHtml,
  resetLinkFor,
  sendAuthEmail,
  signupCodeFor,
  signupEmailHtml,
  type AuthEmailPurpose,
} from '@/lib/auth-email'

function clientKey(request: Request, email: string) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return `${forwarded || 'local'}:${email}`
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; purpose?: AuthEmailPurpose }
    const email = normalizeEmail(body.email || '')
    const purpose = body.purpose

    if (purpose !== 'signup' && purpose !== 'reset') {
      return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 })
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Geçerli bir e-posta adresi gir.' }, { status: 400 })
    }
    if (isDisposableEmail(email)) {
      return NextResponse.json({ error: 'Geçici / uydurma e-posta adresleri kabul edilmez.' }, { status: 400 })
    }
    if (!rateLimit(clientKey(request, `${purpose}:${email}`))) {
      return NextResponse.json({ error: 'Çok fazla deneme. Birkaç dakika sonra tekrar dene.' }, { status: 429 })
    }

    if (!process.env.RESEND_API_KEY || !process.env.AUTH_SECRET) {
      return NextResponse.json(
        { error: 'E-posta gönderimi henüz yapılandırılmadı. RESEND_API_KEY ve AUTH_SECRET gerekli.' },
        { status: 503 },
      )
    }

    if (purpose === 'signup') {
      const code = signupCodeFor(email)
      await sendAuthEmail({
        to: email,
        subject: 'TURX kayıt onay kodu',
        html: signupEmailHtml(code),
      })
      return NextResponse.json({ ok: true })
    }

    const token = createResetToken(email)
    const link = resetLinkFor(request, token)
    await sendAuthEmail({
      to: email,
      subject: 'TURX şifre sıfırlama',
      html: resetEmailHtml(link),
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('auth send-code', err)
    const message = err instanceof Error ? err.message : 'E-posta gönderilemedi.'
    if (message.includes('missing')) {
      return NextResponse.json({ error: 'E-posta gönderimi yapılandırılmadı.' }, { status: 503 })
    }
    return NextResponse.json({ error: 'E-posta gönderilemedi. Adresi kontrol edip tekrar dene.' }, { status: 500 })
  }
}
