import { NextResponse } from 'next/server'
import { sessionFromRequest } from '@/lib/auth-email'
import { STAFF_ROLES, sanitizeStaffInterests } from '@/lib/staff-roles'
import { canAccessAdminPanel } from '@/lib/turx-identity'
import { blobConfigured, loadGuildStore, publicAccount } from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

type CharacterLike = {
  firstName?: string
  lastName?: string
  isMain?: boolean
}

function mainName(characters: unknown) {
  const list = Array.isArray(characters) ? (characters as CharacterLike[]) : []
  const main = list.find((character) => character.isMain) || list[0]
  if (!main?.firstName) return '—'
  return `${main.firstName} ${main.lastName || ''}`.trim()
}

export async function GET(request: Request) {
  try {
    if (!blobConfigured()) return json({ error: 'Hesap deposu henüz bağlı değil.' }, 503)
    const session = sessionFromRequest(request)
    if (!session) return json({ error: 'Oturum gerekli.' }, 401)
    const store = await loadGuildStore()
    const viewer = store.users.find((item) => item.username.toLowerCase() === session.username.toLowerCase())
    if (!viewer || !canAccessAdminPanel(publicAccount(viewer).role)) {
      return json({ error: 'Yetki yok.' }, 403)
    }

    const roles = STAFF_ROLES.map((role) => {
      const applicants = store.users
        .filter((account) => sanitizeStaffInterests(account.staffInterests).includes(role.id))
        .map((account) => ({
          username: account.username,
          email: account.email,
          mainName: mainName(account.characters),
        }))
      return {
        id: role.id,
        title: role.title,
        slots: role.slots,
        applicantCount: applicants.length,
        applicants,
      }
    })

    return json({ roles })
  } catch (err) {
    console.error('staff-interests GET', err)
    return json({ error: 'Görev listesi okunamadı.' }, 500)
  }
}
