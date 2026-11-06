export const SESSION_COOKIE = 'turx_session'
const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60

export function getSessionToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(SESSION_COOKIE)
}

function writeSessionCookie(token: string | null) {
  if (typeof document === 'undefined') return
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  if (!token) {
    document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
    return
  }
  document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_MAX_AGE_SEC}; SameSite=Lax${secure}`
}

export function setSessionToken(token: string | null) {
  if (typeof window === 'undefined') return
  if (!token) localStorage.removeItem(SESSION_COOKIE)
  else localStorage.setItem(SESSION_COOKIE, token)
  writeSessionCookie(token)
}

export function authHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra)
  const token = getSessionToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
    headers.set('X-Turx-Session', token)
  }
  return headers
}
