import { NextResponse } from 'next/server'
import { sessionFromRequest } from '@/lib/auth-email'
import { canAccessAdminPanel } from '@/lib/turx-identity'
import {
  blobConfigured,
  canViewAnonymousMessage,
  deleteAnonymousMessageById,
  getVisibleAnonymousMessages,
  loadGuildStore,
  markAnonymousMessageRead,
  mutateGuildStore,
  resolveUserRole,
} from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

async function resolveStaffCaller(request: Request) {
  const session = sessionFromRequest(request)
  if (!session) return { error: json({ error: 'Giriş gerekli.' }, 401) }

  const store = await loadGuildStore()
  const caller = store.users.find((u) => u.username.toLowerCase() === session.username.toLowerCase())
  if (!caller) return { error: json({ error: 'Kullanıcı bulunamadı.' }, 404) }

  const role = resolveUserRole(caller)
  if (!canAccessAdminPanel(role)) {
    return { error: json({ error: 'Bu alana erişim yetkiniz yok.' }, 403) }
  }

  return { store, caller, role }
}

export async function GET(request: Request) {
  try {
    if (!blobConfigured()) {
      return json({ ok: true, unreadCount: 0, totalCount: 0, messages: [] })
    }

    const auth = await resolveStaffCaller(request)
    if ('error' in auth) return auth.error

    const result = getVisibleAnonymousMessages(auth.store, auth.caller.username, auth.role, auth.caller.email)

    return json({
      ok: true,
      unreadCount: result.unreadCount,
      totalCount: result.totalCount,
      messages: result.messages,
    })
  } catch (err) {
    console.error('admin/anonymous GET', err)
    return json({ error: 'Anonim mesajlar yüklenemedi.' }, 500)
  }
}

export async function PATCH(request: Request) {
  try {
    if (!blobConfigured()) return json({ error: 'Veritabanı bağlı değil.' }, 503)

    const auth = await resolveStaffCaller(request)
    if ('error' in auth) return auth.error

    const body = (await request.json().catch(() => ({}))) as {
      action?: 'mark_read' | 'mark_unread' | 'mark_all_read'
      id?: string
    }

    if (body.action !== 'mark_read' && body.action !== 'mark_unread' && body.action !== 'mark_all_read') {
      return json({ error: 'Geçersiz işlem.' }, 400)
    }

    let notFound = false
    let forbidden = false
    let unreadCount = 0

    await mutateGuildStore((store) => {
      const list = store.anonymousMessages || []
      if (body.action === 'mark_all_read') {
        for (const msg of list) {
          if (canViewAnonymousMessage(msg, auth.role, auth.caller.email)) {
            markAnonymousMessageRead(store, msg.id, auth.caller.username, true)
          }
        }
      } else {
        const id = (body.id || '').trim()
        const target = list.find((m) => m.id === id)
        if (!target) {
          notFound = true
          return
        }
        if (!canViewAnonymousMessage(target, auth.role, auth.caller.email)) {
          forbidden = true
          return
        }
        markAnonymousMessageRead(store, id, auth.caller.username, body.action === 'mark_read')
      }
      unreadCount = getVisibleAnonymousMessages(store, auth.caller.username, auth.role, auth.caller.email).unreadCount
    })

    if (notFound) return json({ error: 'Mesaj bulunamadı.' }, 404)
    if (forbidden) return json({ error: 'Bu mesajı görme yetkiniz yok.' }, 403)

    return json({ ok: true, unreadCount })
  } catch (err) {
    console.error('admin/anonymous PATCH', err)
    return json({ error: 'Mesaj durumu güncellenemedi.' }, 500)
  }
}

export async function DELETE(request: Request) {
  try {
    if (!blobConfigured()) return json({ error: 'Veritabanı bağlı değil.' }, 503)

    const auth = await resolveStaffCaller(request)
    if ('error' in auth) return auth.error

    const { searchParams } = new URL(request.url)
    const messageId = (searchParams.get('id') || '').trim()
    if (!messageId) return json({ error: 'Mesaj ID eksik.' }, 400)

    let deleted = false
    let forbidden = false
    let unreadCount = 0

    await mutateGuildStore((store) => {
      const target = (store.anonymousMessages || []).find((m) => m.id === messageId)
      if (!target) return
      if (!canViewAnonymousMessage(target, auth.role, auth.caller.email)) {
        forbidden = true
        return
      }
      deleted = deleteAnonymousMessageById(store, messageId)
      unreadCount = getVisibleAnonymousMessages(store, auth.caller.username, auth.role, auth.caller.email).unreadCount
    })

    if (forbidden) return json({ error: 'Bu mesajı silme yetkiniz yok.' }, 403)
    if (!deleted) return json({ error: 'Mesaj bulunamadı veya zaten silinmiş.' }, 404)

    return json({ ok: true, deletedId: messageId, unreadCount })
  } catch (err) {
    console.error('admin/anonymous DELETE', err)
    return json({ error: 'Mesaj silinemedi.' }, 500)
  }
}
