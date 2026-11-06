import { NextResponse } from 'next/server'
import { attachSessionCookie, createSessionToken } from '@/lib/auth-email'
import { hashPassword, MIN_PASSWORD_LENGTH, randomSalt } from '@/lib/password'
import { blobConfigured, mutateGuildStore, publicAccount, roleForEmail } from '@/lib/turx-store'

export async function POST(request: Request) {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ error: 'Hesap deposu henüz bağlı değil.' }, { status: 503 })
    }
    const body = (await request.json()) as { username?: string; email?: string; password?: string }
    const username = (body.username || '').trim()
    const email = (body.email || '').trim().toLowerCase()
    const password = body.password || ''

    if (!username || !email || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json({ error: 'Kullanıcı adı, e-posta ve en az 8 karakterlik şifre gerekli.' }, { status: 400 })
    }

    const user = await mutateGuildStore((store) => {
      const taken = store.users.some(
        (item) => item.username.toLowerCase() === username.toLowerCase() || item.email.toLowerCase() === email,
      )
      if (taken) {
        throw new Error('USERNAME_OR_EMAIL_TAKEN')
      }
      const salt = randomSalt()
      return hashPassword(password, salt).then((passwordHash) => {
        const account = {
          username,
          email,
          role: roleForEmail(email),
          salt,
          passwordHash,
        }
        store.users.push(account)
        return publicAccount(account)
      })
    })

    const token = createSessionToken(user.username)
    return attachSessionCookie(
      NextResponse.json({
        ok: true,
        user,
        token,
        profileComplete: false,
      }),
      token,
    )
  } catch (err) {
    if (err instanceof Error && err.message === 'USERNAME_OR_EMAIL_TAKEN') {
      return NextResponse.json({ error: 'Bu kullanıcı adı veya e-posta zaten kayıtlı.' }, { status: 409 })
    }
    console.error('auth register', err)
    return NextResponse.json({ error: 'Kayıt kaydedilemedi.' }, { status: 500 })
  }
}
