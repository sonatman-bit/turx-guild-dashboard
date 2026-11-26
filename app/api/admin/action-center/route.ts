import { NextResponse } from 'next/server'
import { sessionFromRequest } from '@/lib/auth-email'
import { canAccessAdminPanel } from '@/lib/turx-identity'
import { blobConfigured, loadGuildStore, resolveUserRole } from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

export type AdminActionItem = {
  id: string
  category: 'armory' | 'applications' | 'bank' | 'raids'
  severity: 'high' | 'medium' | 'info'
  title: string
  description: string
  count: number
  targetTab: 'admin' | 'bank' | 'raid-signup'
  targetSubTab?: 'members' | 'applications'
  previewItems: string[]
}

export async function GET(request: Request) {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({
        ok: true,
        totalCount: 0,
        highPriorityCount: 0,
        lastArmoryCheckAt: null,
        items: [],
      })
    }

    const session = sessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 })
    }

    const store = await loadGuildStore()
    const caller = store.users.find((u) => u.username.toLowerCase() === session.username.toLowerCase())
    if (!caller || !canAccessAdminPanel(resolveUserRole(caller))) {
      return NextResponse.json({ error: 'Yetki yok.' }, { status: 403 })
    }

    const items: AdminActionItem[] = []
    const existingUsers = new Set(store.users.map((u) => u.username.toLowerCase()))

    // 1. WoW Armory TURX dışında görünen / silinmesi gereken kullanıcılar
    const flaggedUsers = (store.armoryAudit?.flaggedUsers || []).filter((f) =>
      existingUsers.has(f.username.toLowerCase()),
    )
    if (flaggedUsers.length > 0) {
      items.push({
        id: 'armory-flagged',
        category: 'armory',
        severity: 'high',
        title: `${flaggedUsers.length} üye WoW Armory'de TURX dışında görünüyor`,
        description:
          'Günlük WoW Armory kontrolünde Main karakteri TURX guild listesinde bulunmayan hesaplar tespit edildi. Üye & Rütbe Yönetimi ekranından inceleyip manuel olarak çıkarabilirsiniz.',
        count: flaggedUsers.length,
        targetTab: 'admin',
        targetSubTab: 'members',
        previewItems: flaggedUsers.slice(0, 6).map(
          (u) => `${u.username} (${u.mainCharName}) · ${u.consecutiveMisses}. tarama`,
        ),
      })
    }

    // 2. İnceleme bekleyen Guild başvuruları
    const pendingApps = (store.applications || []).filter((a) => a.status === 'PENDING')
    if (pendingApps.length > 0) {
      items.push({
        id: 'pending-applications',
        category: 'applications',
        severity: 'medium',
        title: `${pendingApps.length} yeni Guild başvurusu inceleme bekliyor`,
        description: 'Onay veya red kararı bekleyen aday başvuruları bulunuyor.',
        count: pendingApps.length,
        targetTab: 'admin',
        targetSubTab: 'applications',
        previewItems: pendingApps
          .slice(0, 5)
          .map((a) => `${a.charName} ${a.charSurname} (${a.characterClass} · ${a.spec})`),
      })
    }

    // 3. Bekleyen Guild Bankası talepleri
    const pendingBank = (store.bankRequests || []).filter((r) => r.status === 'PENDING')
    if (pendingBank.length > 0) {
      items.push({
        id: 'pending-bank',
        category: 'bank',
        severity: 'medium',
        title: `${pendingBank.length} Guild Bankası malzeme talebi bekliyor`,
        description: 'Üyelerin gönderdiği malzeme talepleri onayınızı bekliyor.',
        count: pendingBank.length,
        targetTab: 'bank',
        previewItems: pendingBank.slice(0, 5).map((r) => `${r.username}: ${r.qty}x ${r.item}`),
      })
    }

    // 4. Roster yayınlanmayı veya yoklama/arşivlemeyi bekleyen Raid etkinlikleri
    const nowMs = Date.now()
    const eventsNeedingAttention = (store.raidSystem?.events || []).filter((ev) => {
      if (ev.status === 'ARCHIVED') return false
      const schedMs = new Date(ev.scheduledAt).getTime()
      const deadlineMs = new Date(ev.signupDeadline).getTime()
      const pastRaidNeedsArchive = Number.isFinite(schedMs) && schedMs < nowMs - 2 * 3_600_000
      const deadlinePassedNeedsPublish =
        ev.status === 'SIGNUP_OPEN' && Number.isFinite(deadlineMs) && deadlineMs < nowMs
      return pastRaidNeedsArchive || deadlinePassedNeedsPublish
    })
    if (eventsNeedingAttention.length > 0) {
      items.push({
        id: 'raid-attention',
        category: 'raids',
        severity: 'info',
        title: `${eventsNeedingAttention.length} Raid etkinliği işlem bekliyor`,
        description: 'İmza süresi dolmuş (roster yayınlanacak) veya tamamlanıp yoklaması kapatılacak raidler var.',
        count: eventsNeedingAttention.length,
        targetTab: 'raid-signup',
        previewItems: eventsNeedingAttention.slice(0, 5).map((e) => `${e.raidName} (${e.size}-Man)`),
      })
    }

    const totalCount = items.reduce((sum, item) => sum + item.count, 0)
    const highPriorityCount = items
      .filter((item) => item.severity === 'high')
      .reduce((sum, item) => sum + item.count, 0)

    return NextResponse.json(
      {
        ok: true,
        totalCount,
        highPriorityCount,
        lastArmoryCheckAt: store.armoryAudit?.lastCheckedAt || null,
        armorySource: store.armoryAudit?.source || null,
        items,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    console.error('admin/action-center GET', err)
    return NextResponse.json({ error: 'Yönetim bildirimleri okunamadı.' }, { status: 500 })
  }
}
