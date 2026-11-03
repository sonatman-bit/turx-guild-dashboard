import { NextResponse } from 'next/server'
import { isValidEmail, normalizeEmail, rateLimit, verifySignupCode } from '@/lib/auth-email'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; code?: string }
    const email = normalizeEmail(body.email || '')
    const code = (body.code || '').trim()

    if (!process.env.AUTH_SECRET) {
      return NextResponse.json({ error: 'Doğrulama yapılandırılmadı.' }, { status: 503 })
    }
    if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Kod veya e-posta geçersiz.' }, { status: 400 })
    }
    if (!rateLimit(`verify:${email}`, 12, 10 * 60 * 1000)) {
      return NextResponse.json({ error: 'Çok fazla deneme. Daha sonra tekrar dene.' }, { status: 429 })
    }
    if (!verifySignupCode(email, code)) {
      return NextResponse.json({ error: 'Onay kodu hatalı veya süresi dolmuş.' }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('auth verify-code', err)
    return NextResponse.json({ error: 'Doğrulama başarısız.' }, { status: 500 })
  }
}
