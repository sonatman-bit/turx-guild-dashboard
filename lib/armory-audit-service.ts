import { Resend } from 'resend'
import { CLASS_COLORS, type WowClass } from '@/lib/guild-data'
import { isGuildMasterEmail } from '@/lib/turx-identity'
import {
  loadGuildStore,
  mutateGuildStore,
  resolveUserRole,
  type StoredAccount,
  type StoredArmoryAuditState,
  type StoredArmoryFlaggedUser,
} from '@/lib/turx-store'
import { verifyCharacterInTurxGuild, type ArmoryVerificationStatus } from '@/lib/wow-armory'

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

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function reasonTextForAuditStatus(input: {
  status: string
  mainCharName: string
  guildName?: string | null
}): string {
  if (input.status === 'no_character') {
    return 'Hesabınızda kayıtlı aktif bir Main karakter bulunamadığı için TURX WoW Armory doğrulaması tamamlanamadı.'
  }
  if (input.status === 'wrong_guild') {
    return `Kayıtlı Main karakteriniz "${input.mainCharName}" WoW Forever Armory (EU) üzerinde "${input.guildName || 'farklı bir guild'}" guildinde göründüğü için TURX kadrosu ile eşleşmedi.`
  }
  if (input.status === 'no_guild') {
    return `Kayıtlı Main karakteriniz "${input.mainCharName}" WoW Forever Armory (EU) üzerinde şu an herhangi bir guild üyesi olarak görünmediği için TURX kadrosu ile eşleşmedi.`
  }
  return `Kayıtlı Main karakteriniz "${input.mainCharName}" WoW Forever Armory (EU) üzerinde bulunamadı (karakter isim/soyisim yazım hatası olabilir veya karakter henüz Level 10+ olup oyundan çıkış yapmamış olabilir).`
}

export async function sendAccountRemovalEmail(input: {
  username: string
  email: string
  mainCharName: string
  status: string
  guildName?: string | null
}): Promise<{ email: string; ok: boolean; error?: string }> {
  const toEmail = (input.email || '').trim().toLowerCase()
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

  const reason = reasonTextForAuditStatus(input)
  const safeUser = escapeHtml(input.username)
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
        <strong>TURX</strong> lonca web sitesinde (<a href="${appUrl}" style="color:#00f2fe;text-decoration:none;">${appUrl}</a>) üye güvenliğini ve kadro doğruluğunu sağlamak amacıyla <strong>WoW Forever Armory (EU)</strong> üzerinden düzenli guild doğrulaması yapılmaktadır.
      </p>

      <div style="background:#1c1118;border:1px solid #ef444480;border-radius:12px;padding:14px 16px;margin:18px 0;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:bold;color:#fca5a5;text-transform:uppercase;">Hesabınız Neden Silindi?</p>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#fecaca;">${safeReason}</p>
      </div>

      <p style="margin:0 0 14px;line-height:1.65;font-size:14px;">
        <strong>TURX</strong> guild üyesiyseniz aşağıdaki adımları izleyerek birkaç dakika içinde sitemize yeniden ve doğru şekilde kayıt olabilirsiniz:
      </p>

      <div style="background:#071422;border:1px solid #233b56;border-radius:12px;padding:16px 18px;margin:18px 0;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:bold;color:#d4af37;">Doğru Kayıt &amp; Profil Onaylama Adımları (5 Adım)</p>
        <ol style="margin:0;padding-left:20px;font-size:13px;line-height:1.75;color:#cbd5e1;">
          <li><strong>Oyun İçi Kontrol:</strong> Aktif oynadığınız <strong>Main karakterinizin</strong> oyun içinde <strong>TURX</strong> guildinde olduğundan, en az <strong>Level 10</strong> olduğundan ve Armory bilgisinin güncellenmesi için oyundan en az bir kez çıkış (<em>Logout</em>) yaptığınızdan emin olun.</li>
          <li><strong>Yeniden Kayıt Olun:</strong> <a href="${appUrl}" style="color:#00f2fe;font-weight:bold;">${appUrl}</a> adresinden <strong>Kayıt Ol</strong> (veya Google ile Giriş) seçeneği ile yeni hesabınızı oluşturun.</li>
          <li><strong>Adım 1 — Main Karakter &amp; WoW Armory Doğrulaması:</strong> Açılan 5 adımlı profil doğrulama ekranında ilk olarak aktif Main karakterinizin <strong>İsim</strong> ve <strong>Soyisim</strong> bilgisini oyundaki yazımıyla birebir aynı girin ve <em>&quot;WoW Armory ile Doğrula, Kaydet ve Devam Et&quot;</em> butonuna basın.</li>
          <li><strong>Adım 2 &amp; Adım 3 — Bilgiler ve Haftalık Müsaitlik:</strong> Zorunlu iletişim alanlarını doldurun ve haftalık raid müsaitliğinizi işaretleyin. Raidlere şimdilik katılmayı düşünmüyorsanız <em>&quot;RAIDLERE KATILMAYI ŞİMDİLİK DÜŞÜNMÜYORUM&quot;</em> seçeneğini işaretleyip geçebilirsiniz.</li>
          <li><strong>Adım 5 — Onayla ve Erişimi Aç:</strong> Son adımda <em>&quot;Profili Onayla ve Siteye Erişimi Aç&quot;</em> butonuna bastığınızda tüm üye alanları hesabınıza anında açılacaktır.</li>
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
    if (error) return { email: toEmail, ok: false, error: error.message }
    return { email: toEmail, ok: true }
  } catch (err) {
    return {
      email: toEmail,
      ok: false,
      error: err instanceof Error ? err.message : 'E-posta gönderilemedi',
    }
  }
}

export async function auditAccountOnArmory(account: StoredAccount): Promise<ArmoryAuditUserRow> {
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

export async function runAuditBatch(users: StoredAccount[]): Promise<ArmoryAuditUserRow[]> {
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

/**
 * Runs a full WoW Forever Armory scan across all accounts, NEVER deletes anyone automatically,
 * and saves flagged non-TURX users into store.armoryAudit so GM & Officers see them at the top
 * of the Members panel and receive a live action-center notification.
 */
export async function runAndPersistArmoryAudit(source: 'cron' | 'manual') {
  const preStore = await loadGuildStore(true)
  const rows = await runAuditBatch(preStore.users)
  const nowIso = new Date().toISOString()

  const prevFlaggedMap = new Map<string, StoredArmoryFlaggedUser>()
  for (const prev of preStore.armoryAudit?.flaggedUsers || []) {
    prevFlaggedMap.set(prev.username.toLowerCase(), prev)
  }

  const flaggedUsers: StoredArmoryFlaggedUser[] = []
  const verifiedMap = new Map<string, ArmoryAuditUserRow>()

  for (const row of rows) {
    if (row.inTurxGuild) {
      verifiedMap.set(row.username.toLowerCase(), row)
      continue
    }
    if (row.isProtectedGm || row.status === 'armory_unavailable') {
      continue
    }
    const prev = prevFlaggedMap.get(row.username.toLowerCase())
    // Increment consecutiveMisses if previous check was on a different scan (at least 6 hours ago or cron)
    const hoursSinceLast = prev?.lastCheckedAt
      ? (Date.now() - new Date(prev.lastCheckedAt).getTime()) / 3_600_000
      : 999
    const nextMisses = prev ? (hoursSinceLast >= 6 ? prev.consecutiveMisses + 1 : prev.consecutiveMisses) : 1

    flaggedUsers.push({
      username: row.username,
      email: row.email,
      role: row.role,
      mainCharName: row.mainCharName,
      armoryUrl: row.armoryUrl,
      status: row.status as StoredArmoryFlaggedUser['status'],
      guildName: row.guildName,
      level: row.level,
      message: row.message,
      firstFlaggedAt: prev?.firstFlaggedAt || nowIso,
      lastCheckedAt: nowIso,
      consecutiveMisses: nextMisses,
    })
  }

  const auditState: StoredArmoryAuditState = {
    lastCheckedAt: nowIso,
    source,
    totalScanned: rows.length,
    verifiedTurxCount: rows.filter((r) => r.inTurxGuild).length,
    armoryUnavailableCount: rows.filter((r) => r.status === 'armory_unavailable').length,
    flaggedUsers,
  }

  await mutateGuildStore((store) => {
    store.armoryAudit = auditState
    for (const account of store.users) {
      const verified = verifiedMap.get(account.username.toLowerCase())
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
    }
  })

  const summary = {
    total: rows.length,
    verifiedTurx: auditState.verifiedTurxCount,
    nonTurxRemovable: flaggedUsers.length,
    armoryUnavailable: auditState.armoryUnavailableCount,
    protectedGm: rows.filter((r) => r.isProtectedGm).length,
  }

  return { auditState, rows, summary }
}
