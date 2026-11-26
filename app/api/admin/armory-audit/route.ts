import { NextResponse } from 'next/server'
import { sessionFromRequest } from '@/lib/auth-email'
import { CLASS_COLORS, type WowClass } from '@/lib/guild-data'
import { canAccessAdminPanel, isGuildMasterEmail } from '@/lib/turx-identity'
import {
  blobConfigured,
  loadGuildStore,
  mutateGuildStore,
  resolveUserRole,
  type StoredAccount,
} from '@/lib/turx-store'
import { verifyCharacterInTurxGuild, type ArmoryVerificationStatus } from '@/lib/wow-armory'

export const dynamic = 'force-dynamic'

type StoredChar = {
  id?: string
  firstName?: string
  lastName?: string
  wowClass?: string
  isMain?: boolean
  armoryVerified?: boolean
  armoryGuild?: string | null
  armoryCheckedAt?: string
  armoryLevel?: number | null
}

export type ArmoryAuditUserRow = {
  username: string
  email: string
  role: string
  isProtectedGm: boolean
  mainCharName: string
  armoryUrl: string | null
  status: ArmoryVerificationStatus | 'no_character'
  guildName: string | null
  level: number | null
  inTurxGuild: boolean
  matchedCharName: string | null
  message: string
}

function isWowClass(value: unknown): value is WowClass {
  return typeof value === 'string' && value in CLASS_COLORS
}

async function auditAccountOnArmory(account: StoredAccount): Promise<ArmoryAuditUserRow> {
  const role = resolveUserRole(account)
  const isProtectedGm = isGuildMasterEmail(account.email) || role === 'Guild Master'
  const chars = Array.isArray(account.characters) ? (account.characters as StoredChar[]) : []
  const validChars = chars.filter((c) => Boolean(c.firstName?.trim()) && Boolean(c.lastName?.trim()))
  const mainChar = validChars.find((c) => c.isMain) || validChars[0]

  if (!mainChar) {
    return {
      username: account.username,
      email: account.email,
      role,
      isProtectedGm,
      mainCharName: '—',
      armoryUrl: null,
      status: 'no_character',
      guildName: null,
      level: null,
      inTurxGuild: false,
      matchedCharName: null,
      message: 'Hesapta kayıtlı Main karakter bulunmuyor.',
    }
  }

  const mainFirst = mainChar.firstName!.trim()
  const mainLast = mainChar.lastName!.trim()
  const mainName = `${mainFirst} ${mainLast}`
  const mainClass: WowClass = isWowClass(mainChar.wowClass) ? mainChar.wowClass : 'Warrior'

  const mainResult = await verifyCharacterInTurxGuild(mainFirst, mainLast, mainClass)
  if (mainResult.ok) {
    return {
      username: account.username,
      email: account.email,
      role,
      isProtectedGm,
      mainCharName: mainName,
      armoryUrl: mainResult.url,
      status: mainResult.status,
      guildName: mainResult.guildName,
      level: mainResult.level,
      inTurxGuild: true,
      matchedCharName: mainName,
      message: mainResult.message,
    }
  }

  // Fallback check: if user has another alt character in TURX, report main status cleanly
  // (per requirement: main character must be in TURX; if another character is in TURX we still check so GM can see)
  if (mainResult.status !== 'armory_unavailable') {
    for (const alt of validChars) {
      if (alt === mainChar) continue
      const altFirst = alt.firstName!.trim()
      const altLast = alt.lastName!.trim()
      const altClass: WowClass = isWowClass(alt.wowClass) ? alt.wowClass : 'Warrior'
      const altRes = await verifyCharacterInTurxGuild(altFirst, altLast, altClass)
      if (altRes.ok) {
        return {
          username: account.username,
          email: account.email,
          role,
          isProtectedGm,
          mainCharName: mainName,
          armoryUrl: altRes.url,
          status: 'verified_turx',
          guildName: altRes.guildName,
          level: altRes.level,
          inTurxGuild: true,
          matchedCharName: `${altFirst} ${altLast}`,
          message: `Alt karakter (${altFirst} ${altLast}) TURX guildinde doğrulandı.`,
        }
      }
    }
  }

  return {
    username: account.username,
    email: account.email,
    role,
    isProtectedGm,
    mainCharName: mainName,
    armoryUrl: mainResult.url,
    status: mainResult.status,
    guildName: mainResult.guildName,
    level: mainResult.level,
    inTurxGuild: false,
    matchedCharName: null,
    message: mainResult.message,
  }
}

async function runAuditBatch(users: StoredAccount[]): Promise<ArmoryAuditUserRow[]> {
  const results: ArmoryAuditUserRow[] = new Array(users.length)
  let cursor = 0
  const concurrency = Math.min(4, Math.max(1, users.length))

  async function worker() {
    while (cursor < users.length) {
      const idx = cursor
      cursor += 1
      results[idx] = await auditAccountOnArmory(users[idx])
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  return results
}

export async function GET(request: Request) {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ error: 'Veritabanı bağlı değil.' }, { status: 503 })
    }
    const session = sessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 })
    }

    const store = await loadGuildStore(true)
    const caller = store.users.find((u) => u.username.toLowerCase() === session.username.toLowerCase())
    if (!caller || !canAccessAdminPanel(resolveUserRole(caller))) {
      return NextResponse.json({ error: 'Bu işlem için GM veya Görevli yetkisi gereklidir.' }, { status: 403 })
    }

    const rows = await runAuditBatch(store.users)
    const summary = {
      total: rows.length,
      verifiedTurx: rows.filter((r) => r.inTurxGuild).length,
      nonTurxRemovable: rows.filter(
        (r) => !r.inTurxGuild && !r.isProtectedGm && r.status !== 'armory_unavailable',
      ).length,
      armoryUnavailable: rows.filter((r) => r.status === 'armory_unavailable').length,
      protectedGm: rows.filter((r) => r.isProtectedGm).length,
    }

    return NextResponse.json(
      { ok: true, checkedAt: new Date().toISOString(), summary, users: rows },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    console.error('admin/armory-audit GET', err)
    return NextResponse.json({ error: 'WoW Armory taraması tamamlanamadı.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ error: 'Veritabanı bağlı değil.' }, { status: 503 })
    }
    const session = sessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      action?: 'prune_non_turx' | 'kick_user'
      username?: string
    }

    const action = body.action || 'prune_non_turx'

    if (action === 'kick_user') {
      const targetUsername = (body.username || '').trim()
      if (!targetUsername) {
        return NextResponse.json({ error: 'Kullanıcı adı zorunludur.' }, { status: 400 })
      }

      await mutateGuildStore((store) => {
        const caller = store.users.find((u) => u.username.toLowerCase() === session.username.toLowerCase())
        if (!caller) throw new Error('FORBIDDEN')
        const callerRole = resolveUserRole(caller)
        const isCallerGm = isGuildMasterEmail(caller.email) || callerRole === 'Guild Master'
        if (!canAccessAdminPanel(callerRole)) throw new Error('FORBIDDEN')

        const target = store.users.find((u) => u.username.toLowerCase() === targetUsername.toLowerCase())
        if (!target) throw new Error('NOT_FOUND')

        const targetRole = resolveUserRole(target)
        if (isGuildMasterEmail(target.email) || targetRole === 'Guild Master') {
          throw new Error('CANNOT_KICK_GM')
        }
        if ((targetRole === 'Görevli' || targetRole === 'Officer') && !isCallerGm) {
          throw new Error('OFFICER_KICK_REQUIRES_GM')
        }

        store.users = store.users.filter((u) => u.username.toLowerCase() !== target.username.toLowerCase())
        store.deletedUsers = {
          ...(store.deletedUsers || {}),
          [target.username.toLowerCase()]: new Date().toISOString(),
        }
      })

      return NextResponse.json({ ok: true, removedUsername: targetUsername })
    }

    // action === 'prune_non_turx'
    const preStore = await loadGuildStore(true)
    const preCaller = preStore.users.find((u) => u.username.toLowerCase() === session.username.toLowerCase())
    if (!preCaller || !canAccessAdminPanel(resolveUserRole(preCaller))) {
      return NextResponse.json({ error: 'Bu işlem için GM veya Görevli yetkisi gereklidir.' }, { status: 403 })
    }

    const auditRows = await runAuditBatch(preStore.users)
    const nowIso = new Date().toISOString()

    const toRemoveSet = new Set<string>()
    const verifiedMap = new Map<string, ArmoryAuditUserRow>()
    const skippedUnavailable: ArmoryAuditUserRow[] = []

    for (const row of auditRows) {
      if (row.inTurxGuild) {
        verifiedMap.set(row.username.toLowerCase(), row)
      } else if (row.status === 'armory_unavailable') {
        skippedUnavailable.push(row)
      } else if (!row.isProtectedGm) {
        toRemoveSet.add(row.username.toLowerCase())
      }
    }

    const removedUsers: ArmoryAuditUserRow[] = []

    await mutateGuildStore((store) => {
      const nextUsers: StoredAccount[] = []
      const deleted = { ...(store.deletedUsers || {}) }

      for (const account of store.users) {
        const key = account.username.toLowerCase()
        const role = resolveUserRole(account)
        const isGm = isGuildMasterEmail(account.email) || role === 'Guild Master'

        if (!isGm && toRemoveSet.has(key)) {
          deleted[key] = nowIso
          const auditRow = auditRows.find((r) => r.username.toLowerCase() === key)
          if (auditRow) removedUsers.push(auditRow)
          continue
        }

        // Stamp verified status on verified TURX users' main character
        const verified = verifiedMap.get(key)
        if (verified && Array.isArray(account.characters)) {
          account.characters = (account.characters as StoredChar[]).map((c) => {
            if (c.isMain) {
              return {
                ...c,
                armoryVerified: true,
                armoryGuild: verified.guildName || 'TURX',
                armoryCheckedAt: nowIso,
                armoryLevel: verified.level,
              }
            }
            return c
          })
        }

        nextUsers.push(account)
      }

      store.users = nextUsers
      store.deletedUsers = deleted
    })

    return NextResponse.json(
      {
        ok: true,
        checkedAt: nowIso,
        removedCount: removedUsers.length,
        removedUsers,
        keptCount: auditRows.length - removedUsers.length,
        skippedUnavailableCount: skippedUnavailable.length,
        auditRows: auditRows.filter((r) => !toRemoveSet.has(r.username.toLowerCase())),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err: unknown) {
    const code = err instanceof Error ? err.message : String(err)
    if (code === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Bu işlem için GM veya Görevli yetkisi gereklidir.' }, { status: 403 })
    }
    if (code === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 })
    }
    if (code === 'CANNOT_KICK_GM') {
      return NextResponse.json({ error: 'Guild Master loncadan çıkarılamaz.' }, { status: 403 })
    }
    if (code === 'OFFICER_KICK_REQUIRES_GM') {
      return NextResponse.json({ error: 'Görevli rütbesindeki üyeler yalnızca GM tarafından çıkarılabilir.' }, { status: 403 })
    }
    console.error('admin/armory-audit POST', err)
    return NextResponse.json({ error: 'Armory temizlik işlemi sırasında hata oluştu.' }, { status: 500 })
  }
}
