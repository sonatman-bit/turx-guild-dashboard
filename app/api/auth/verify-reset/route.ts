import { NextResponse } from 'next/server'
import { readResetToken } from '@/lib/auth-email'

export async function POST(request: Request) {
  try {
    if (!process.env.AUTH_SECRET) {
      return NextResponse.json({ error: 'Sıfırlama yapılandırılmadı.' }, { status: 503 })
    }
    const body = (await request.json()) as { token?: string }
    const parsed = readResetToken((body.token || '').trim())
    if (!parsed) {
      return NextResponse.json({ error: 'Sıfırlama bağlantısı geçersiz veya süresi dolmuş.' }, { status: 400 })
    }
    return NextResponse.json({ ok: true, email: parsed.email })
  } catch (err) {
    console.error('auth verify-reset', err)
    return NextResponse.json({ error: 'Sıfırlama doğrulanamadı.' }, { status: 500 })
  }
}
