const KEY = 'turx_session'

export function getSessionToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(KEY)
}

export function setSessionToken(token: string | null) {
  if (typeof window === 'undefined') return
  if (!token) localStorage.removeItem(KEY)
  else localStorage.setItem(KEY, token)
}

export function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = getSessionToken()
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}
