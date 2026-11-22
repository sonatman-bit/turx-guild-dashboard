import { NextResponse } from 'next/server'
import { sendGuildBroadcastNotificationEmails, sessionFromRequest } from '@/lib/auth-email'
import { canAccessAdminPanel } from '@/lib/turx-identity'
import {
  blobConfigured,
  getUserVisibleMessages,
  loadGuildStore,
  mutateGuildStore,
  resolveUserRole,
  type GuildMessageAttachment,
  type GuildMessageCategory,
  type GuildMessageTargetType,
  type StoredGuildMessage,
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
    const user = store.users.find(
      (u) => u.username.toLowerCase() === session.username.toLowerCase(),
    )
    if (!user) return json({ error: 'Kullanıcı bulunamadı.' }, 404)

    const role = resolveUserRole(user)
    const result = getUserVisibleMessages(store, user.username, role)

    return json({
      ok: true,
      messages: result.messages,
      unreadCount: result.unreadCount,
    })
  } catch (err) {
    console.error('messages GET', err)
    return json({ error: 'Mesajlar alınamadı.' }, 500)
  }
}

export async function POST(request: Request) {
  try {
    if (!blobConfigured()) return json({ error: 'Mesaj servisi henüz bağlı değil.' }, 503)
    const session = sessionFromRequest(request)
    if (!session) return json({ error: 'Giriş gerekli.' }, 401)

    const initialStore = await loadGuildStore()
    const sender = initialStore.users.find(
      (u) => u.username.toLowerCase() === session.username.toLowerCase(),
    )
    if (!sender) return json({ error: 'Yetkisiz hesap.' }, 403)

    const senderRole = resolveUserRole(sender)
    if (!canAccessAdminPanel(senderRole)) {
      return json({ error: 'Yalnızca GM ve Görevliler mesaj yayınlayabilir.' }, 403)
    }

    const body = (await request.json().catch(() => ({}))) as {
      title?: string
      content?: string
      category?: GuildMessageCategory
      icon?: string
      targetType?: GuildMessageTargetType
      targetRank?: string
      targetUsername?: string
      imageUrl?: string
      attachments?: GuildMessageAttachment[]
      sendEmail?: boolean
    }

    const title = (body.title || '').trim()
    const content = (body.content || '').trim()
    if (!title) return json({ error: 'Mesaj başlığı zorunludur.' }, 400)
    if (!content) return json({ error: 'Mesaj içeriği boş bırakılamaz.' }, 400)

    const category: GuildMessageCategory = body.category || 'DUYURU'
    const targetType: GuildMessageTargetType = body.targetType || 'ALL'
    const targetRank = (body.targetRank || '').trim() || undefined
    const targetUsername = (body.targetUsername || '').trim() || undefined
    const icon = (body.icon || '').trim() || '📢'
    const imageUrl = (body.imageUrl || '').trim() || undefined
    const attachments = Array.isArray(body.attachments) ? body.attachments : []
    const sendEmail = body.sendEmail !== false // default true

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const nowIso = new Date().toISOString()

    const newMessage: StoredGuildMessage = {
      id: messageId,
      title,
      content,
      category,
      icon,
      senderUsername: sender.username,
      senderRole,
      targetType,
      targetRank,
      targetUsername,
      imageUrl,
      attachments,
      createdAt: nowIso,
      readBy: {
        // Automatically mark as read for the sender
        [sender.username.toLowerCase()]: nowIso,
      },
    }

    // Determine target recipient emails for notification
    let targetRecipients: Array<{ email: string; username: string }> = []

    await mutateGuildStore((store) => {
      if (!store.messages) store.messages = []
      store.messages.unshift(newMessage)

      if (targetType === 'ALL') {
        targetRecipients = store.users.map((u) => ({ email: u.email, username: u.username }))
      } else if (targetType === 'RANK' && targetRank) {
        targetRecipients = store.users
          .filter((u) => resolveUserRole(u).toLowerCase() === targetRank.toLowerCase())
          .map((u) => ({ email: u.email, username: u.username }))
      } else if (targetType === 'USER' && targetUsername) {
        const found = store.users.find(
          (u) => u.username.toLowerCase() === targetUsername.toLowerCase(),
        )
        if (found) {
          targetRecipients = [{ email: found.email, username: found.username }]
        }
      }
    })

    // Send emails in background (do not block client response)
    if (sendEmail && targetRecipients.length > 0) {
      void sendGuildBroadcastNotificationEmails({
        recipients: targetRecipients,
        title,
        content,
        category,
        icon,
        senderUsername: sender.username,
        senderRole,
        hasImage: Boolean(imageUrl),
        hasAttachments: attachments.length > 0,
      })
    }

    return json({
      ok: true,
      message: newMessage,
      emailSentCount: sendEmail ? targetRecipients.length : 0,
    })
  } catch (err) {
    console.error('messages POST', err)
    return json({ error: 'Mesaj kaydedilemedi.' }, 500)
  }
}
