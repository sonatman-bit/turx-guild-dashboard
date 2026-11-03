import { createHmac, timingSafeEqual } from 'crypto'
import { Resend } from 'resend'

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

function appOrigin(request: Request) {
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://turxforever.com'
  if (configured) return configured.replace(/\/$/, '')
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  return new URL(request.url).origin
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

export async function sendAuthEmail(options: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('RESEND_API_KEY missing')
  }
  const from = process.env.RESEND_FROM?.trim() || 'TURX Guild <noreply@turxforever.com>'
  const resend = new Resend(apiKey)
  const result = await resend.emails.send({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  })
  if (result.error) {
    throw new Error(result.error.message)
  }
}

export function signupEmailHtml(code: string) {
  return wrapEmail(`
    <h1 style="margin:0 0 12px;font-size:22px;color:#f4e7c3">E-posta doğrulama kodu</h1>
    <p style="margin:0 0 16px;line-height:1.5">Kayıt işlemini tamamlamak için 6 haneli kodu siteye gir.</p>
    <p style="margin:0;font-size:32px;letter-spacing:10px;color:#00f2fe;font-weight:700">${code}</p>
    <p style="margin:16px 0 0;font-size:13px;color:#8aa0b5">Kod 10 dakika geçerlidir. Ekranda gösterilmez; yalnızca bu e-postadadır.</p>
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
