import { NextResponse } from 'next/server'
import { Resend } from 'resend'
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

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function reasonTextForAuditRow(row: ArmoryAuditUserRow): string {
  if (row.status === 'no_character') {
    return 'Hesabınızda kayıtlı aktif bir Main karakter bulunamadığı için TURX WoW Armory doğrulaması tamamlanamadı.'
  }
  if (row.status === 'wrong_guild') {
    return `Kayıtlı Main karakteriniz "${row.mainCharName}" WoW Forever Armory (EU) üzerinde "${row.guildName || 'farklı bir guild'}" guildinde göründüğü için TURX kadrosu ile eşleşmedi.`
  }
  if (row.status === 'no_guild') {
    return `Kayıtlı Main karakteriniz "${row.mainCharName}" WoW Forever Armory (EU) üzerinde şu an herhangi bir guild üyesi olarak görünmediği için TURX kadrosu ile eşleşmedi.`
  }
  return `Kayıtlı Main karakteriniz "${row.mainCharName}" WoW Forever Armory (EU) üzerinde bulunamadı (karakter isim/soyisim yazım hatası olabilir veya karakter henüz Level 10+ olup oyundan çıkış yapmamış olabilir).`
}

async function sendAccountRemovalEmail(
  row: ArmoryAuditUserRow,
): Promise<{ email: string; ok: boolean; error?: string }> {
  const toEmail = (row.email || '').trim().toLowerCase()
  if (!toEmail || !toEmail.includes('@')) {
    return { email: toEmail, ok: false, error: 'Geçerli e-posta yok' }
  }

  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    return { email: toEmail, ok: false, error: 'RESEND_API_KEY tanımlı değil' }
  }

  const fromRaw = (process.env.RESEND_FROM || 'TURX Forever <noreply@turxforever.com>')
    .trim()
    .replace(/^['"]|['"]$/g, '')
  const appUrl = (process.env.APP_URL || 'https://turxforever.com').trim().replace(/\/+$/, '')

  const reason = reasonTextForAuditRow(row)
  const safeUser = escapeHtml(row.username)
  const safeReason = escapeHtml(reason)

  const html = `
  <div style="background:#08121e;color:#d7e2ee;font-family:Arial,Helvetica,sans-serif;padding:28px 16px;">
    <div style="max-width:580px;margin:0 auto;border:1px solid #d4af3755;border-radius:16px;padding:28px;background:#0b1b2d;">
      <div style="border-bottom:1px solid #1e334a;padding-bottom:16px;margin-bottom:20px;">
        <p style="margin:0;font-size:11px;letter-spacing:2.5px;color:#00f2fe;font-weight:bold;text-transform:uppercase;">TURX FOREVER · ALLIANCE PvE (EU)</p>
        <h2 style="margin:8px 0 0;color:#d4af37;font-size:21px;">TURX Web Sitesi Hesabınız Yeniden Kayıt İçin Temizlendi</h2>
      </div>

      <p style="margin:0 0 14px;line-height:1.65;font-size:14px;">
        Merhaba <strong>${safeUser}</strong>,
      </p>

      <p style="margin:0 0 14px;line-height:1.65;font-size:14px;">
        <strong>TURX</strong> lonca web sitesinde (<a href="${appUrl}" style="color:#00f2fe;text-decoration:none;">${appUrl}</a>) üye güvenliğini ve kadro doğruluğunu sağlamak amacıyla <strong>WoW Forever Armory (EU)</strong> üzerinden otomatik guild doğrulama sistemine geçtik.
      </p>

      <div style="background:#1c1118;border:1px solid #ef444480;border-radius:12px;padding:14px 16px;margin:18px 0;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:bold;color:#fca5a5;text-transform:uppercase;">Hesabınız Neden Silindi?</p>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#fecaca;">${safeReason}</p>
      </div>

      <p style="margin:0 0 14px;line-height:1.65;font-size:14px;">
        Bu nedenle eski site kaydınız sıfırlanmıştır. <strong>TURX</strong> guild üyesiyseniz aşağıdaki adımları izleyerek birkaç dakika içinde sitemize yeniden ve doğru şekilde kayıt olabilirsiniz:
      </p>

      <div style="background:#071422;border:1px solid #233b56;border-radius:12px;padding:16px 18px;margin:18px 0;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:bold;color:#d4af37;">Doğru Kayıt &amp; Profil Onaylama Adımları (5 Adım)</p>
        <ol style="margin:0;padding-left:20px;font-size:13px;line-height:1.75;color:#cbd5e1;">
          <li><strong>Oyun İçi Kontrol:</strong> Aktif oynadığınız <strong>Main karakterinizin</strong> oyun içinde <strong>TURX</strong> guildinde olduğundan, en az <strong>Level 10</strong> olduğundan ve Armory bilgisinin güncellenmesi için oyundan en az bir kez çıkış (<em>Logout</em>) yaptığınızdan emin olun.</li>
          <li><strong>Yeniden Kayıt Olun:</strong> <a href="${appUrl}" style="color:#00f2fe;font-weight:bold;">${appUrl}</a> adresinden <strong>Kayıt Ol</strong> (veya Google ile Giriş) seçeneği ile yeni hesabınızı oluşturun.</li>
          <li><strong>Adım 1 — Main Karakter &amp; WoW Armory Doğrulaması:</strong> Açılan 5 adımlı profil doğrulama ekranında ilk olarak aktif Main karakterinizin <strong>İsim</strong> ve <strong>Soyisim</strong> bilgisini oyundaki yazımıyla birebir aynı girin ve <em>&quot;WoW Armory ile Doğrula, Kaydet ve Devam Et&quot;</em> butonuna basın.</li>
          <li><strong>Adım 2 &amp; Adım 3 — Bilgiler ve Haftalık Müsaitlik:</strong> Zorunlu iletişim alanlarını doldurun (kendi tercihinize göre düzenleyebilirsiniz) ve haftalık raid müsaitliğinizi işaretleyin. Raidlere şimdilik katılmayı düşünmüyorsanız <em>&quot;RAIDLERE KATILMAYI ŞİMDİLİK DÜŞÜNMÜYORUM&quot;</em> seçeneğini işaretleyip geçebilirsiniz.</li>
          <li><strong>Adım 5 — Onayla ve Erişimi Aç:</strong> Son adımda <em>&quot;Profili Onayla ve Siteye Erişimi Aç&quot;</em> butonuna bastığınızda Guild Kadrosu, Raid Kayıt, Loot Dağıtımı ve tüm üye alanları hesabınıza anında açılacaktır.</li>
        </ol>
      </div>

      <div style="text-align:center;margin:24px 0 16px;">
        <a href="${appUrl}" style="display:inline-block;background:linear-gradient(180deg,#e8c65a,#b8922a);color:#1a1305;font-weight:bold;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;">
          TURX Sitesine Git ve Yeniden Kaydol
        </a>
      </div>

      <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#8aa0b5;border-top:1px solid #1e334a;padding-top:14px;">
        Eğer oyun içinde henüz TURX guildinde değilseniz, önce Discord sunucumuzdan veya sitemizdeki <strong>Guild Başvuru</strong> sayfasından başvuru yapıp oyun içi davetinizi alabilir, ardından kaydınızı tamamlayabilirsiniz.<br/>
        Sorun yaşarsanız Discord üzerinden yönetim ekibine ulaşabilirsiniz. — <strong>TURX Forever Yönetimi</strong>
      </p>
    </div>
  </div>`

  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from: fromRaw || 'TURX Forever <noreply@turxforever.com>',
      to: toEmail,
      subject: '[TURX Forever] Site Kaydınız WoW Armory (TURX) Doğrulaması Nedeniyle Sıfırlandı',
      html,
    })
    if (error) {
      return { email: toEmail, ok: false, error: error.message }
    }
    return { email: toEmail, ok: true }
  } catch (err) {
    return {
      email: toEmail,
      ok: false,
      error: err instanceof Error ? err.message : 'E-posta gönderilemedi',
    }
  }
}

/**
 * Strictly checks each account's MAIN character against WoW Forever Armory (EU) TURX guild.
 */
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
  const concurrency = Math.min(5, Math.max(1, users.length))

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

    const secretOk = isAuthorizedBySecret(request)
    const session = sessionFromRequest(request)
    if (!secretOk && !session) {
      return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      action?: 'prune_non_turx' | 'kick_user'
      username?: string
      sendEmails?: boolean
    }

    const action = body.action || 'prune_non_turx'
    const shouldSendEmails = body.sendEmails !== false

    if (action === 'kick_user') {
      const targetUsername = (body.username || '').trim()
      if (!targetUsername) {
        return NextResponse.json({ error: 'Kullanıcı adı zorunludur.' }, { status: 400 })
      }

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
    })

    // Send explanatory emails with step-by-step re-registration instructions to every deleted user
    const emailResults: Array<{ username: string; email: string; ok: boolean; error?: string }> = []
    if (shouldSendEmails && removedUsers.length > 0) {
      for (const removed of removedUsers) {
        const res = await sendAccountRemovalEmail(removed)
        emailResults.push({ username: removed.username, ...res })
        // Small throttle to stay comfortably within Resend rate limits
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
