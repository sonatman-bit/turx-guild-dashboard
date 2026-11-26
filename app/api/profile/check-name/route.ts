import { NextResponse } from 'next/server'
import { sessionFromRequest } from '@/lib/auth-email'
import { blobConfigured, loadGuildStore } from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({
        nicknameTaken: false,
        usernameTaken: false,
        emailTaken: false,
      })
    }

    const { searchParams } = new URL(request.url)
    const nickname = (searchParams.get('nickname') || '').trim()
    const username = (searchParams.get('username') || '').trim()
    const email = (searchParams.get('email') || '').trim().toLowerCase()
    const excludeUsernameParam = (searchParams.get('excludeUsername') || '').trim().toLowerCase()

    const session = sessionFromRequest(request)
    const selfLower = excludeUsernameParam || session?.username?.trim().toLowerCase() || ''

    const store = await loadGuildStore()

    let nicknameTaken = false
    if (nickname) {
      const normNick = nickname.toLocaleLowerCase('tr-TR')
      nicknameTaken = store.users.some((u) => {
        if (selfLower && u.username.trim().toLowerCase() === selfLower) return false
        const otherUsername = u.username.trim().toLocaleLowerCase('tr-TR')
        const otherNick =
          typeof u.profile?.nickname === 'string'
            ? u.profile.nickname.trim().toLocaleLowerCase('tr-TR')
            : ''
        return otherUsername === normNick || (Boolean(otherNick) && otherNick === normNick)
      })
    }

    let usernameTaken = false
    if (username) {
      const normUser = username.toLocaleLowerCase('tr-TR')
      usernameTaken = store.users.some((u) => {
        if (selfLower && u.username.trim().toLowerCase() === selfLower) return false
        const otherUsername = u.username.trim().toLocaleLowerCase('tr-TR')
        const otherNick =
          typeof u.profile?.nickname === 'string'
            ? u.profile.nickname.trim().toLocaleLowerCase('tr-TR')
            : ''
        return otherUsername === normUser || (Boolean(otherNick) && otherNick === normUser)
      })
    }

    let emailTaken = false
    if (email) {
      emailTaken = store.users.some((u) => {
        if (selfLower && u.username.trim().toLowerCase() === selfLower) return false
        return u.email.trim().toLowerCase() === email
      })
    }

    return NextResponse.json(
      {
        nicknameTaken,
        usernameTaken,
        emailTaken,
        message: nicknameTaken
          ? `"${nickname}" profil ismi başka bir üye tarafından kullanılıyor. Lütfen farklı bir profil ismi seçin.`
          : usernameTaken
            ? `"${username}" kullanıcı/profil ismi zaten alınmış. Lütfen farklı bir isim seçin.`
            : emailTaken
              ? `"${email}" e-posta adresiyle zaten bir hesap kayıtlı.`
              : undefined,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    console.error('profile/check-name GET', err)
    return NextResponse.json({ error: 'İsim kontrolü yapılamadı.' }, { status: 500 })
  }
}
