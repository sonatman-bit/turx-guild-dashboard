import { NextResponse } from 'next/server'
import { sessionFromRequest } from '@/lib/auth-email'
import { canAccessAdminPanel } from '@/lib/turx-identity'
import {
  blobConfigured,
  deleteMessageById,
  loadGuildStore,
  mutateGuildStore,
  resolveUserRole,
} from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(request: Request) {
  try {
    if (!blobConfigured()) return json({ error: 'Mesaj servisi henüz bağlı değil.' }, 503)
    const session = sessionFromRequest(request)
    if (!session) return json({ error: 'Giriş gerekli.' }, 401)

    const store = await loadGuildStore()
    const currentUser = store.users.find(
      (u) => u.username.toLowerCase() === session.username.toLowerCase(),
    )
    if (!currentUser) return json({ error: 'Kullanıcı bulunamadı.' }, 404)

    const currentRole = resolveUserRole(currentUser)
    if (!canAccessAdminPanel(currentRole)) {
      return json({ error: 'Bu alana erişim yetkiniz yok.' }, 403)
    }

    const allMessages = store.messages || []
    allMessages.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    // Build read report for each message
    const reports = allMessages.map((msg) => {
      // Find targeted users
      let targetUsers = store.users
      if (msg.targetType === 'RANK' && msg.targetRank) {
        targetUsers = store.users.filter(
          (u) => resolveUserRole(u).toLowerCase() === msg.targetRank?.toLowerCase(),
        )
      } else if (msg.targetType === 'USER' && msg.targetUsername) {
        targetUsers = store.users.filter(
          (u) => u.username.toLowerCase() === msg.targetUsername?.toLowerCase(),
        )
      }

      const readMap = msg.readBy || {}
      const readUsers: Array<{
        username: string
        email: string
        role: string
        readAt: string
      }> = []
      const unreadUsers: Array<{
        username: string
        email: string
        role: string
      }> = []

      for (const u of targetUsers) {
        const uRole = resolveUserRole(u)
        const readAt = readMap[u.username.toLowerCase()]
        if (readAt) {
          readUsers.push({
            username: u.username,
            email: u.email,
            role: uRole,
            readAt,
          })
        } else {
          unreadUsers.push({
            username: u.username,
            email: u.email,
            role: uRole,
          })
        }
      }

      // Sort read users by readAt descending (most recent readers first)
      readUsers.sort((a, b) => b.readAt.localeCompare(a.readAt))

      const totalTargetCount = targetUsers.length
      const readCount = readUsers.length
      const unreadCount = unreadUsers.length
      const readPercentage =
        totalTargetCount > 0 ? Math.round((readCount / totalTargetCount) * 100) : 0

      return {
        ...msg,
        totalTargetCount,
        readCount,
        unreadCount,
        readPercentage,
        readUsers,
        unreadUsers,
      }
    })

    return json({
      ok: true,
      messages: reports,
    })
  } catch (err) {
    console.error('admin messages GET', err)
    return json({ error: 'Rapor yüklenemedi.' }, 500)
  }
}

export async function DELETE(request: Request) {
  try {
    if (!blobConfigured()) return json({ error: 'Mesaj servisi henüz bağlı değil.' }, 503)
    const session = sessionFromRequest(request)
    if (!session) return json({ error: 'Giriş gerekli.' }, 401)

    const store = await loadGuildStore()
    const currentUser = store.users.find(
      (u) => u.username.toLowerCase() === session.username.toLowerCase(),
    )
    if (!currentUser) return json({ error: 'Kullanıcı bulunamadı.' }, 404)

    const currentRole = resolveUserRole(currentUser)
    if (!canAccessAdminPanel(currentRole)) {
      return json({ error: 'Bu alana erişim yetkiniz yok.' }, 403)
    }

    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('id')
    if (!messageId) return json({ error: 'Mesaj ID parametresi eksik.' }, 400)

    let deleted = false
    await mutateGuildStore((s) => {
      deleted = deleteMessageById(s, messageId)
    })

    if (!deleted) {
      return json({ error: 'Mesaj bulunamadı veya zaten silinmiş.' }, 404)
    }

    return json({ ok: true, deletedId: messageId })
  } catch (err) {
    console.error('admin messages DELETE', err)
    return json({ error: 'Mesaj silinemedi.' }, 500)
  }
}
