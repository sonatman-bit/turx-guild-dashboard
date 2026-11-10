import { NextResponse } from 'next/server'
import { sessionFromRequest } from '@/lib/auth-email'
import { isGuildMasterEmail, normalizeGuildRank, type GuildRank } from '@/lib/turx-identity'
import { blobConfigured, mutateGuildStore } from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

const VALID_RANKS: GuildRank[] = [
  'Görevli',
  'Turx',
  'Alt',
  'Sosyal',
  // legacy:
  'Officer',
  'Raid Leader',
  'Raider',
  'Member',
]

export async function POST(request: Request) {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ error: 'Hesap deposu henüz bağlı değil.' }, { status: 503 })
    }

    const session = sessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 })
    }

    const body = (await request.json()) as { username?: string; rank?: string }
    const username = (body.username || '').trim()
    const rawRank = (body.rank || '').trim() as GuildRank

    if (!username || !rawRank) {
      return NextResponse.json({ error: 'Kullanıcı adı ve rütbe gerekli.' }, { status: 400 })
    }

    if (!VALID_RANKS.includes(rawRank)) {
      return NextResponse.json({ error: 'Geçersiz rütbe değeri.' }, { status: 400 })
    }

    const newRank = normalizeGuildRank(rawRank)

    let targetUpdated = false
    let targetRole: GuildRank = 'Turx'

    await mutateGuildStore((store) => {
      // Check caller's permissions
      const caller = store.users.find((u) => u.username.toLowerCase() === session.username.toLowerCase())
      if (!caller) throw new Error('CALLER_NOT_FOUND')

      const isCallerGm = isGuildMasterEmail(caller.email) || caller.role === 'Guild Master'
      const isCallerOfficer = caller.role === 'Görevli' || caller.role === 'Officer'
      if (!isCallerGm && !isCallerOfficer) {
        throw new Error('FORBIDDEN')
      }

      // Find target user
      const target = store.users.find((u) => u.username.toLowerCase() === username.toLowerCase())
      if (!target) throw new Error('TARGET_NOT_FOUND')

      if (isGuildMasterEmail(target.email) || target.role === 'Guild Master') {
        throw new Error('CANNOT_MODIFY_GM')
      }

      // Only GM can promote to or demote from Görevli / Officer
      const isTargetOfficer = target.role === 'Görevli' || target.role === 'Officer'
      const isNewRankOfficer = newRank === 'Görevli'
      if ((isNewRankOfficer || isTargetOfficer) && !isCallerGm) {
        throw new Error('OFFICER_CHANGE_REQUIRES_GM')
      }

      target.role = newRank
      targetRole = newRank
      targetUpdated = true
    })

    if (!targetUpdated) {
      return NextResponse.json({ error: 'Rütbe güncellenemedi.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, username, role: targetRole })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if (message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Bu işlem için GM veya Görevli yetkisi gereklidir.' }, { status: 403 })
    }
    if (message === 'CANNOT_MODIFY_GM') {
      return NextResponse.json({ error: 'Guild Master rütbesi değiştirilemez veya düşürülemez.' }, { status: 403 })
    }
    if (message === 'OFFICER_CHANGE_REQUIRES_GM') {
      return NextResponse.json({ error: 'Görevli atamaları veya değişiklikleri yalnızca Guild Master tarafından yapılabilir.' }, { status: 403 })
    }
    if (message === 'TARGET_NOT_FOUND') {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 })
    }
    console.error('roster/rank POST', err)
    return NextResponse.json({ error: 'Rütbe kaydedilirken hata oluştu.' }, { status: 500 })
  }
}
