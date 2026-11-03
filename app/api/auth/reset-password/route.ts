import { NextResponse } from 'next/server'
import { hashPassword, MIN_PASSWORD_LENGTH, randomSalt } from '@/lib/password'
import { blobConfigured, mutateGuildStore, publicAccount } from '@/lib/turx-store'
import { readResetToken } from '@/lib/auth-email'

export async function POST(request: Request) {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ error: 'Hesap deposu henüz bağlı değil.' }, { status: 503 })
    }
    const body = (await request.json()) as { token?: string; password?: string }
    const parsed = readResetToken((body.token || '').trim())
    if (!parsed) {
      return NextResponse.json({ error: 'Sıfırlama bağlantısı geçersiz veya süresi dolmuş.' }, { status: 400 })
    }
    if (!body.password || body.password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json({ error: `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.` }, { status: 400 })
    }

    const user = await mutateGuildStore((store) => {
      const found = store.users.find((item) => item.email.toLowerCase() === parsed.email)
      if (!found) throw new Error('NOT_FOUND')
      const salt = randomSalt()
      return hashPassword(body.password as string, salt).then((passwordHash) => {
        found.salt = salt
        found.passwordHash = passwordHash
        return publicAccount(found)
      })
    })

    return NextResponse.json({ ok: true, user, email: parsed.email })
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Bu e-posta ile kayıtlı hesap yok.' }, { status: 404 })
    }
    console.error('auth reset-password', err)
    return NextResponse.json({ error: 'Şifre güncellenemedi.' }, { status: 500 })
  }
}
