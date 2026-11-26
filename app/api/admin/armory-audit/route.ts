import { NextResponse } from 'next/server'
import {
  runAndPersistArmoryAudit,
  runAuditBatch,
  sendAccountRemovalEmail,
  type ArmoryAuditUserRow,
} from '@/lib/armory-audit-service'
import { sessionFromRequest } from '@/lib/auth-email'
import { canAccessAdminPanel, isGuildMasterEmail } from '@/lib/turx-identity'
import {
  blobConfigured,
  loadGuildStore,
  mutateGuildStore,
  resolveUserRole,
  type StoredAccount,
} from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

type StoredChar = {
  firstName?: string
  lastName?: string
  isMain?: boolean
  armoryVerified?: boolean
  armoryGuild?: string | null
  armoryCheckedAt?: string
  armoryLevel?: number | null
}

function isAuthorizedBySecret(request: Request): boolean {
  const secret = process.env.AUTH_SECRET?.trim()
  if (secret && secret.length >= 16) {
    const header = request.headers.get('x-admin-secret')?.trim()
    if (header && header === secret) return true
  }
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')?.trim()
    if (authHeader === `Bearer ${cronSecret}`) return true
  }
  return false
}

export async function GET(request: Request) {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ error: 'Veritabanı bağlı değil.' }, { status: 503 })
    }

    const { searchParams } = new URL(request.url)
    const cachedOnly = searchParams.get('cached') === '1'
    const secretOk = isAuthorizedBySecret(request)
    const store = await loadGuildStore(true)

    if (!secretOk) {
      const session = sessionFromRequest(request)
      if (!session) {
        return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 })
      }
      const caller = store.users.find((u) => u.username.toLowerCase() === session.username.toLowerCase())
      if (!caller || !canAccessAdminPanel(resolveUserRole(caller))) {
        return NextResponse.json({ error: 'Bu işlem için GM veya Görevli yetkisi gereklidir.' }, { status: 403 })
      }
    }

    if (cachedOnly) {
      const existingSet = new Set(store.users.map((u) => u.username.toLowerCase()))
      const audit = store.armoryAudit
      const activeFlagged = (audit?.flaggedUsers || []).filter((f) =>
        existingSet.has(f.username.toLowerCase()),
      )
      return NextResponse.json(
        {
          ok: true,
          armoryAudit: audit ? { ...audit, flaggedUsers: activeFlagged } : null,
        },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const { auditState, rows, summary } = await runAndPersistArmoryAudit('manual')
    return NextResponse.json(
      {
        ok: true,
        checkedAt: auditState.lastCheckedAt,
        summary,
        users: rows,
        armoryAudit: auditState,
      },
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

    const secretOk = isAuthorizedBySecret(request)
    const session = sessionFromRequest(request)
    if (!secretOk && !session) {
      return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      action?: 'prune_non_turx' | 'kick_user'
      username?: string
      sendEmails?: boolean
      sendEmail?: boolean
    }

    const action = body.action || 'prune_non_turx'
    const shouldSendEmails = body.sendEmails !== false

    if (action === 'kick_user') {
      const targetUsername = (body.username || '').trim()
      if (!targetUsername) {
        return NextResponse.json({ error: 'Kullanıcı adı zorunludur.' }, { status: 400 })
      }

      let removedEmailPayload: {
        username: string
        email: string
        mainCharName: string
        status: string
        guildName?: string | null
      } | null = null

      await mutateGuildStore((store) => {
        if (!secretOk) {
          const caller = store.users.find((u) => u.username.toLowerCase() === session!.username.toLowerCase())
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
        }

        const target = store.users.find((u) => u.username.toLowerCase() === targetUsername.toLowerCase())
        if (!target) throw new Error('NOT_FOUND')
        if (isGuildMasterEmail(target.email) || resolveUserRole(target) === 'Guild Master') {
          throw new Error('CANNOT_KICK_GM')
        }

        const flaggedEntry = store.armoryAudit?.flaggedUsers.find(
          (f) => f.username.toLowerCase() === target.username.toLowerCase(),
        )
        const chars = Array.isArray(target.characters) ? (target.characters as StoredChar[]) : []
        const mainChar = chars.find((c) => c.isMain) || chars[0]
        const mainCharName = mainChar
          ? `${mainChar.firstName || ''} ${mainChar.lastName || ''}`.trim() || '—'
          : '—'

        removedEmailPayload = {
          username: target.username,
          email: target.email,
          mainCharName: flaggedEntry?.mainCharName || mainCharName,
          status: flaggedEntry?.status || 'no_guild',
          guildName: flaggedEntry?.guildName || null,
        }

        store.users = store.users.filter((u) => u.username.toLowerCase() !== target.username.toLowerCase())
        store.deletedUsers = {
          ...(store.deletedUsers || {}),
          [target.username.toLowerCase()]: new Date().toISOString(),
        }
        if (store.armoryAudit) {
          store.armoryAudit = {
            ...store.armoryAudit,
            flaggedUsers: store.armoryAudit.flaggedUsers.filter(
              (f) => f.username.toLowerCase() !== target.username.toLowerCase(),
            ),
          }
        }
      })

      let emailSent = false
      if (body.sendEmail && removedEmailPayload) {
        const mailRes = await sendAccountRemovalEmail(removedEmailPayload)
        emailSent = mailRes.ok
      }

      return NextResponse.json({ ok: true, removedUsername: targetUsername, emailSent })
    }

    // action === 'prune_non_turx'
    const preStore = await loadGuildStore(true)
    if (!secretOk) {
      const preCaller = preStore.users.find((u) => u.username.toLowerCase() === session!.username.toLowerCase())
      if (!preCaller || !canAccessAdminPanel(resolveUserRole(preCaller))) {
        return NextResponse.json({ error: 'Bu işlem için GM veya Görevli yetkisi gereklidir.' }, { status: 403 })
      }
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
      store.armoryAudit = {
        lastCheckedAt: nowIso,
        source: 'manual',
        totalScanned: nextUsers.length,
        verifiedTurxCount: verifiedMap.size,
        armoryUnavailableCount: skippedUnavailable.length,
        flaggedUsers: [],
      }
    })

    const emailResults: Array<{ username: string; email: string; ok: boolean; error?: string }> = []
    if (shouldSendEmails && removedUsers.length > 0) {
      for (const removed of removedUsers) {
        const res = await sendAccountRemovalEmail(removed)
        emailResults.push({ username: removed.username, ...res })
        await new Promise((resolve) => setTimeout(resolve, 250))
      }
    }

    const emailsSentCount = emailResults.filter((e) => e.ok).length
    const emailsFailedCount = emailResults.filter((e) => !e.ok).length

    return NextResponse.json(
      {
        ok: true,
        checkedAt: nowIso,
        removedCount: removedUsers.length,
        removedUsers: removedUsers.map((r) => ({
          username: r.username,
          mainCharName: r.mainCharName,
          status: r.status,
          guildName: r.guildName,
          hasEmail: Boolean(r.email && r.email.includes('@')),
        })),
        keptCount: auditRows.length - removedUsers.length,
        skippedUnavailableCount: skippedUnavailable.length,
        emailsSentCount,
        emailsFailedCount,
        emailResults: emailResults.map((e) => ({
          username: e.username,
          ok: e.ok,
          error: e.error,
        })),
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
