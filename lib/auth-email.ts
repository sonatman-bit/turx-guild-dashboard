import { createHmac, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { SESSION_COOKIE } from '@/lib/client-session'

const CODE_WINDOW_MS = 10 * 60 * 1000
const RESET_TTL_MS = 30 * 60 * 1000

const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  'throwawaymail.com',
  'trashmail.com',
  'yopmail.com',
])

export type AuthEmailPurpose = 'signup' | 'reset'

function authSecret() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET missing')
  return secret
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 160
}

export function isDisposableEmail(email: string) {
  const domain = normalizeEmail(email).split('@')[1]
  return Boolean(domain && DISPOSABLE_DOMAINS.has(domain))
}

function hmac(value: string) {
  return createHmac('sha256', authSecret()).update(value).digest('hex')
}

function equal(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

function windowIndex(at = Date.now()) {
  return Math.floor(at / CODE_WINDOW_MS)
}

export function signupCodeFor(email: string, window = windowIndex()) {
  const digest = hmac(`signup:${normalizeEmail(email)}:${window}`)
  return String(parseInt(digest.slice(0, 8), 16) % 1_000_000).padStart(6, '0')
}

export function verifySignupCode(email: string, code: string) {
  const trimmed = code.trim()
  if (!/^\d{6}$/.test(trimmed)) return false
  const current = windowIndex()
  return equal(trimmed, signupCodeFor(email, current)) || equal(trimmed, signupCodeFor(email, current - 1))
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export function createSessionToken(username: string) {
  const payload = Buffer.from(
    JSON.stringify({ u: username.trim(), exp: Date.now() + SESSION_TTL_MS }),
  ).toString('base64url')
  const signature = createHmac('sha256', authSecret()).update(`session:${payload}`).digest('base64url')
  return `${payload}.${signature}`
}

export function readSessionToken(token: string): { username: string } | null {
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null
  const expected = createHmac('sha256', authSecret()).update(`session:${payload}`).digest('base64url')
  if (!equal(signature, expected)) return null
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { u?: string; exp?: number }
    if (!parsed.u || typeof parsed.exp !== 'number' || parsed.exp < Date.now()) return null
    return { username: parsed.u }
  } catch {
    return null
  }
}

function tokenFromBearer(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^bearer\s+/i.test(trimmed)) return trimmed.replace(/^bearer\s+/i, '').trim() || null
  return trimmed
}

function tokenFromCookie(request: Request) {
  const cookie = request.headers.get('cookie') || ''
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]*)`, 'i'))
  if (!match?.[1]) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

export function sessionFromRequest(request: Request) {
  const candidates = [
    request.headers.get('authorization') || '',
    request.headers.get('x-turx-session') || '',
    tokenFromCookie(request) || '',
  ]
  for (const candidate of candidates) {
    const token = tokenFromBearer(candidate)
    if (!token) continue
    const session = readSessionToken(token)
    if (session) return session
  }
  return null
}

export function attachSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: false,
  })
  return response
}

export function createResetToken(email: string) {
  const payload = Buffer.from(
    JSON.stringify({ e: normalizeEmail(email), exp: Date.now() + RESET_TTL_MS }),
  ).toString('base64url')
  const signature = createHmac('sha256', authSecret()).update(`reset:${payload}`).digest('base64url')
  return `${payload}.${signature}`
}

export function readResetToken(token: string): { email: string } | null {
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null
  const expected = createHmac('sha256', authSecret()).update(`reset:${payload}`).digest('base64url')
  if (!equal(signature, expected)) return null
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { e?: string; exp?: number }
    if (!parsed.e || typeof parsed.exp !== 'number' || parsed.exp < Date.now()) return null
    if (!isValidEmail(parsed.e)) return null
    return { email: parsed.e }
  } catch {
    return null
  }
}

function cleanOrigin(value: string) {
  const trimmed = value.trim().replace(/^\[([^\]]+)\]\([^)]+\)$/, '$1').replace(/\/$/, '')
  try {
    return new URL(trimmed).origin
  } catch {
    return ''
  }
}

export function configuredAppOrigin() {
  const fromEnv = cleanOrigin(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || '')
  if (fromEnv) return fromEnv
  const fromVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (fromVercel) return `https://${fromVercel.replace(/^https?:\/\//, '')}`
  return 'https://turxforever.com'
}

export function appOrigin(request: Request) {
  return configuredAppOrigin() || new URL(request.url).origin
}

export function resetLinkFor(request: Request, token: string) {
  return `${appOrigin(request)}/?reset=${encodeURIComponent(token)}`
}

function wrapEmail(body: string) {
  return `<div style="background:#08121e;color:#d7e2ee;font-family:Arial,sans-serif;padding:32px">
  <div style="max-width:480px;margin:0 auto;border:1px solid #d4af3740;border-radius:16px;padding:28px;background:#0b1b2d">
    <p style="margin:0 0 8px;letter-spacing:4px;color:#d4af37;font-weight:700">TURX</p>
    <p style="margin:0 0 20px;color:#7fd7ff;font-size:12px;letter-spacing:2px">TURX FOREVER</p>
    ${body}
    <p style="margin:24px 0 0;font-size:12px;color:#8aa0b5">Bu e-posta TURX lonca paneli hesabın için gönderildi. Sen talep etmediysen yok say.</p>
  </div>
</div>`
}

function fromAddress() {
  const raw = (process.env.RESEND_FROM || 'TURX Forever <noreply@turxforever.com>').trim().replace(/^['"]|['"]$/g, '')
  return raw || 'TURX Forever <noreply@turxforever.com>'
}

function htmlToText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function sendAuthEmail(options: { to: string; subject: string; html: string; text?: string }) {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('RESEND_API_KEY missing')
  }
  const resend = new Resend(apiKey)
  const result = await resend.emails.send({
    from: fromAddress(),
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text || htmlToText(options.html),
  })
  if (result.error) {
    throw new Error(result.error.message)
  }
  return result.data?.id || null
}

export function signupEmailHtml(code: string) {
  return wrapEmail(`
    <h1 style="margin:0 0 12px;font-size:22px;color:#f4e7c3">E-posta doğrulama kodu</h1>
    <p style="margin:0 0 16px;line-height:1.5">Kayıt işlemini tamamlamak için 6 haneli kodu siteye gir.</p>
    <p style="margin:0;font-size:32px;letter-spacing:10px;color:#00f2fe;font-weight:700">${code}</p>
    <p style="margin:16px 0 0;font-size:13px;color:#8aa0b5">Kod 10 dakika geçerlidir. Ekranda gösterilmez; yalnızca bu e-postadadır.</p>
  `)
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function anonymousMessageHtml(options: { toLabel: string; topic: string; message: string }) {
  const message = escapeHtml(options.message).replace(/\n/g, '<br>')
  return wrapEmail(`
    <h1 style="margin:0 0 12px;font-size:22px;color:#f4e7c3">Anonim mesaj</h1>
    <p style="margin:0 0 8px;line-height:1.5"><strong>Alıcı seçimi:</strong> ${escapeHtml(options.toLabel)}</p>
    <p style="margin:0 0 16px;line-height:1.5"><strong>Konu:</strong> ${escapeHtml(options.topic)}</p>
    <div style="margin:0;padding:16px;border:1px solid #d4af3740;border-radius:12px;background:#071422;line-height:1.6;color:#d7e2ee">${message}</div>
    <p style="margin:16px 0 0;font-size:13px;color:#8aa0b5">Gönderen kimliği, karakter adı ve IP saklanmaz / e-postaya eklenmez.</p>
  `)
}

export function resetEmailHtml(link: string) {
  return wrapEmail(`
    <h1 style="margin:0 0 12px;font-size:22px;color:#f4e7c3">Şifre sıfırlama</h1>
    <p style="margin:0 0 16px;line-height:1.5">Parolanı yenilemek için aşağıdaki bağlantıya tıkla. Bağlantı 30 dakika geçerlidir.</p>
    <p style="margin:0"><a href="${link}" style="display:inline-block;background:#d4af37;color:#1a1305;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px">Şifremi sıfırla</a></p>
    <p style="margin:16px 0 0;font-size:12px;color:#8aa0b5;word-break:break-all">${link}</p>
  `)
}

const hits = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(key: string, limit = 5, windowMs = 10 * 60 * 1000) {
  const now = Date.now()
  const current = hits.get(key)
  if (!current || current.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (current.count >= limit) return false
  current.count += 1
  return true
}

export function guildBroadcastEmailHtml(options: {
  username: string
  title: string
  content: string
  category: string
  icon?: string
  senderUsername: string
  senderRole: string
  hasImage?: boolean
  hasAttachments?: boolean
}) {
  const icon = options.icon || '📢'
  const categoryLabel = options.category || 'DUYURU'
  const cleanContent = escapeHtml(options.content).replace(/\n/g, '<br>')
  const profileUrl = `${configuredAppOrigin() || 'https://turxforever.com'}/?tab=profile`

  return wrapEmail(`
    <div style="border-bottom:1px solid #d4af3740;padding-bottom:16px;margin-bottom:16px">
      <span style="display:inline-block;padding:4px 10px;background:#d4af3720;border:1px solid #d4af3760;border-radius:6px;font-size:11px;font-weight:700;color:#d4af37;letter-spacing:1px">
        ${escapeHtml(categoryLabel)}
      </span>
      <h1 style="margin:12px 0 6px;font-size:20px;color:#f4e7c3;line-height:1.4">
        ${icon} ${escapeHtml(options.title)}
      </h1>
      <p style="margin:0;font-size:12px;color:#8aa0b5">
        Gönderen: <strong style="color:#7fd7ff">${escapeHtml(options.senderUsername)}</strong> (${escapeHtml(options.senderRole)}) • Kime: <span style="color:#d7e2ee">${escapeHtml(options.username)}</span>
      </p>
    </div>

    <div style="margin:0 0 20px;padding:16px;border:1px solid #00f2fe30;border-radius:12px;background:#071422;line-height:1.6;color:#d7e2ee;font-size:14px">
      ${cleanContent}
    </div>

    ${options.hasImage ? '<p style="margin:0 0 12px;font-size:12px;color:#00f2fe">📷 Mesaja bir görsel iliştirilmiştir. Dashboard üzerinde tam boyut görüntüleyebilirsiniz.</p>' : ''}
    ${options.hasAttachments ? '<p style="margin:0 0 16px;font-size:12px;color:#00f2fe">📎 Mesajda dosya/bağlantı ekleri bulunmaktadır.</p>' : ''}

    <div style="margin:20px 0 10px;text-align:center">
      <a href="${profileUrl}" style="display:inline-block;background:linear-gradient(135deg,#d4af37,#b89628);color:#1a1305;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 24px;border-radius:8px;box-shadow:0 0 15px rgba(212,175,55,0.35)">
        Mesajı Oku & Detayları Gör →
      </a>
    </div>
    <p style="margin:12px 0 0;font-size:11px;color:#64748b;text-align:center">
      Mesajı okuduğunuzda lonca sistemine otomatik "Okundu" bilgisi işlenir.
    </p>
  `)
}

export async function sendGuildBroadcastNotificationEmails(options: {
  recipients: Array<{ email: string; username: string }>
  title: string
  content: string
  category: string
  icon?: string
  senderUsername: string
  senderRole: string
  hasImage?: boolean
  hasAttachments?: boolean
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey || options.recipients.length === 0) return { sentCount: 0 }
  const resend = new Resend(apiKey)
  const from = fromAddress()

  let sentCount = 0
  for (const r of options.recipients) {
    if (!r.email || !isValidEmail(r.email) || isDisposableEmail(r.email)) continue
    try {
      const html = guildBroadcastEmailHtml({
        username: r.username,
        title: options.title,
        content: options.content,
        category: options.category,
        icon: options.icon,
        senderUsername: options.senderUsername,
        senderRole: options.senderRole,
        hasImage: options.hasImage,
        hasAttachments: options.hasAttachments,
      })
      await resend.emails.send({
        from,
        to: r.email,
        subject: `[TURX Bildirim] ${options.icon || '📢'} ${options.title}`,
        html,
        text: htmlToText(html),
      })
      sentCount++
    } catch (err) {
      console.warn(`Resend failed for ${r.email}:`, err)
    }
  }
  return { sentCount }
}

