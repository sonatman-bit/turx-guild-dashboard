'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { User, Pencil } from 'lucide-react'
import { authHeaders, getSessionToken, setSessionToken } from '@/lib/client-session'
import { isOnboardingComplete, saveOnboardingSnapshot, type OnboardingCharacter, type OnboardingProfile } from '@/lib/profile-gate'
import { hashPassword, MIN_PASSWORD_LENGTH, randomSalt, verifyPassword } from '@/lib/password'
import { isGuildMasterEmail, wipeLegacyTurxData, type GuildRank } from '@/lib/turx-identity'
import { GoldButton, GhostButton, Modal, Field, inputClass } from './ui'
import { useToast } from './toast'

export type { GuildRank }
type AuthStep = 'form' | 'verify' | 'forgot' | 'reset'
type LoginResult = 'ok' | 'not_found' | 'bad_password' | 'store_down'

interface UserAccount {
  username: string
  email: string
  role: GuildRank
}

interface StoredAccount extends UserAccount {
  salt: string
  passwordHash: string
}

interface AuthContextType {
  user: UserAccount | null
  login: (username: string, password: string) => Promise<LoginResult>
  logout: () => void
  signup: (username: string, email: string, password: string) => Promise<void>
  updateUser: (username: string, email: string) => void
  resetPasswordForEmail: (email: string, password: string, token?: string) => Promise<boolean>
  profileComplete: boolean
  refreshProfileGate: () => Promise<void>
}

function roleForEmail(email: string): GuildRank {
  return isGuildMasterEmail(email) ? 'Guild Master' : 'Member'
}

function publicUser(account: StoredAccount): UserAccount {
  return { username: account.username, email: account.email, role: roleForEmail(account.email) }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const getRegisteredUsers = (): StoredAccount[] => {
  if (typeof window === 'undefined') return []
  wipeLegacyTurxData()
  const saved = localStorage.getItem('turx_registered_users')
  if (saved) {
    try {
      return JSON.parse(saved) as StoredAccount[]
    } catch {
      return []
    }
  }
  return []
}

const persistUsers = (users: StoredAccount[]) => {
  localStorage.setItem('turx_registered_users', JSON.stringify(users))
}

const saveRegisteredUser = (newUser: StoredAccount) => {
  if (typeof window === 'undefined') return
  const users = getRegisteredUsers()
  const index = users.findIndex(
    (item) =>
      item.username.toLowerCase() === newUser.username.toLowerCase() ||
      item.email.toLowerCase() === newUser.email.toLowerCase(),
  )
  if (index >= 0) users[index] = newUser
  else users.push(newUser)
  persistUsers(users)
}

function readStoredUser(): UserAccount | null {
  if (typeof window === 'undefined') return null
  wipeLegacyTurxData()
  const saved = localStorage.getItem('turx_auth_user')
  if (!saved) return null
  try {
    return JSON.parse(saved) as UserAccount
  } catch {
    return null
  }
}

async function apiJson(path: string, body: Record<string, string>) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await response.json().catch(() => ({}))) as { error?: string; email?: string; ok?: boolean }
  if (!response.ok) {
    throw new Error(data.error || 'İstek başarısız.')
  }
  return data
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserAccount | null>(() => readStoredUser())
  const [profileComplete, setProfileComplete] = useState(() => {
    const stored = readStoredUser()
    return stored ? isOnboardingComplete(stored.username) : true
  })

  useEffect(() => {
    const token = getSessionToken()
    if (token) setSessionToken(token)
  }, [])

  useEffect(() => {
    if (user) {
      localStorage.setItem('turx_auth_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('turx_auth_user')
      setSessionToken(null)
      setProfileComplete(true)
    }
  }, [user])

  const refreshProfileGate = async () => {
    if (!user) {
      setProfileComplete(true)
      return
    }
    if (!getSessionToken()) {
      setProfileComplete(isOnboardingComplete(user.username))
      return
    }
    try {
      const response = await fetch('/api/profile', { credentials: 'same-origin', headers: authHeaders() })
      const data = (await response.json().catch(() => ({}))) as { profileComplete?: boolean }
      if (response.ok && typeof data.profileComplete === 'boolean') {
        setProfileComplete(data.profileComplete)
        return
      }
    } catch {
      // fall back to local snapshot
    }
    setProfileComplete(isOnboardingComplete(user.username))
  }

  useEffect(() => {
    if (user) void refreshProfileGate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username])

  const login = async (username: string, password: string): Promise<LoginResult> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (response.ok) {
        const data = (await response.json()) as {
          user: UserAccount
          token?: string
          profileComplete?: boolean
          profile?: OnboardingProfile | null
          characters?: OnboardingCharacter[]
        }
        if (data.token) setSessionToken(data.token)
        if (data.profile || data.characters) {
          saveOnboardingSnapshot(data.user.username, data.profile || {}, data.characters || [])
        }
        setUser(data.user)
        setProfileComplete(Boolean(data.profileComplete))
        return 'ok'
      }
      if (response.status === 401) return 'bad_password'
      if (response.status === 503) return 'store_down'
      if (response.status !== 404) return 'not_found'
    } catch {
      // Fall through to this browser's local cache.
    }

    const users = getRegisteredUsers()
    const found = users.find((item) => item.username.toLowerCase() === username.toLowerCase())
    if (!found) return 'not_found'
    if (!found.salt || !found.passwordHash) return 'bad_password'
    const matches = await verifyPassword(password, found.salt, found.passwordHash)
    if (!matches) return 'bad_password'
    const nextUser = publicUser(found)
    setUser(nextUser)
    setProfileComplete(isOnboardingComplete(nextUser.username))
    return 'ok'
  }

  const logout = () => {
    setSessionToken(null)
    setUser(null)
    setProfileComplete(true)
  }

  const signup = async (username: string, email: string, password: string) => {
    const salt = randomSalt()
    const passwordHash = await hashPassword(password, salt)
    const stored: StoredAccount = {
      username,
      email,
      role: roleForEmail(email),
      salt,
      passwordHash,
    }

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    })
    if (response.status === 409) {
      throw new Error('Bu kullanıcı adı veya e-posta zaten kayıtlı.')
    }
    if (!response.ok && response.status !== 503) {
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      throw new Error(data.error || 'Hesap sunucuya kaydedilemedi.')
    }

    saveRegisteredUser(stored)
    if (response.ok) {
      const data = (await response.json()) as { user?: UserAccount; token?: string }
      if (data.token) setSessionToken(data.token)
      setUser(data.user || publicUser(stored))
    } else {
      setUser(publicUser(stored))
    }
    setProfileComplete(false)
  }

  const updateUser = (username: string, email: string) => {
    if (user) {
      const updated = { ...user, username, email, role: roleForEmail(email) }
      setUser(updated)
    }
  }

  const resetPasswordForEmail = async (email: string, password: string, token?: string) => {
    if (token) {
      try {
        await apiJson('/api/auth/reset-password', { token, password })
      } catch (err) {
        if (err instanceof Error && err.message.includes('Hesap deposu')) {
          // continue to local fallback
        } else {
          throw err
        }
      }
    }
    const users = getRegisteredUsers()
    const found = users.find((item) => item.email.toLowerCase() === email.toLowerCase())
    if (!found) return Boolean(token)
    const salt = randomSalt()
    const passwordHash = await hashPassword(password, salt)
    saveRegisteredUser({ ...found, salt, passwordHash })
    return true
  }

  return (
    <AuthContext.Provider
      value={{ user, login, logout, signup, updateUser, resetPasswordForEmail, profileComplete, refreshProfileGate }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthNavbarWidget({ onNavigate }: { onNavigate?: (tab: 'profile') => void }) {
  const { user, login, logout, signup, resetPasswordForEmail } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [isSignup, setIsSignup] = useState(false)
  const [step, setStep] = useState<AuthStep>('form')
  const [pendingData, setPendingData] = useState<{ username: string; email: string; pass: string } | null>(null)
  const [inputCode, setInputCode] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [busy, setBusy] = useState(false)

  const toast = useToast()

  useEffect(() => {
    if (!mounted) return
    const token = new URLSearchParams(window.location.search).get('reset')
    if (!token) return
    setResetToken(token)
    setIsSignup(false)
    setStep('reset')
    setAuthModalOpen(true)
    setBusy(true)
    apiJson('/api/auth/verify-reset', { token })
      .then((data) => {
        if (data.email) setResetEmail(data.email)
      })
      .catch((err: unknown) => {
        toast({
          title: 'Sıfırlama bağlantısı geçersiz',
          description: err instanceof Error ? err.message : 'Bağlantının süresi dolmuş olabilir.',
        })
        setStep('forgot')
      })
      .finally(() => {
        setBusy(false)
        const url = new URL(window.location.href)
        url.searchParams.delete('reset')
        window.history.replaceState({}, '', url.pathname + url.search)
      })
  }, [mounted])

  if (!mounted) {
    return <div className="h-9 w-24" />
  }

  const modalTitle =
    step === 'verify'
      ? 'E-posta adresini doğrula'
      : step === 'forgot'
        ? 'Şifremi unuttum'
        : step === 'reset'
          ? 'Yeni şifre belirle'
          : isSignup
            ? 'TURX — Yeni Hesap Oluştur (Sign Up)'
            : 'TURX — Hesaba Giriş Yap (Log In)'

  const handleAuthSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const username = ((formData.get('username') as string) || '').trim()
    const email = ((formData.get('email') as string) || '').trim().toLowerCase()
    const password = (formData.get('password') as string) || ''
    const passwordConfirm = (formData.get('passwordConfirm') as string) || ''

    const existingUsers = getRegisteredUsers()

    if (isSignup) {
      if (password.length < MIN_PASSWORD_LENGTH) {
        toast({ title: 'Hata', description: `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.` })
        return
      }
      if (password !== passwordConfirm) {
        toast({ title: 'Hata', description: 'Girdiğiniz şifreler birbiriyle eşleşmiyor!' })
        return
      }

      const usernameExists = existingUsers.some((item) => item.username.toLowerCase() === username.toLowerCase())
      const emailExists = existingUsers.some((item) => item.email.toLowerCase() === email.toLowerCase())

      if (usernameExists) {
        toast({ title: 'Kayıt Hatası', description: `"${username}" kullanıcı adı zaten alınmış.` })
        return
      }
      if (emailExists) {
        toast({ title: 'Kayıt Hatası', description: `"${email}" e-posta adresiyle zaten bir hesap kayıtlı.` })
        return
      }

      setBusy(true)
      try {
        await apiJson('/api/auth/send-code', { purpose: 'signup', email })
        setPendingData({ username, email, pass: password })
        setInputCode('')
        setStep('verify')
        toast({
          title: 'Doğrulama kodu e-postana gönderildi',
          description: `${email} gelen kutusunu (ve spam klasörünü) kontrol et. Kod ekranda gösterilmez.`,
        })
      } catch (err: unknown) {
        toast({
          title: 'Kod gönderilemedi',
          description: err instanceof Error ? err.message : 'E-posta gönderilemedi.',
        })
      } finally {
        setBusy(false)
      }
      return
    }

    setBusy(true)
    try {
      const result = await login(username, password)
      if (result === 'store_down') {
        toast({
          title: 'Önizleme deposu bağlı değil',
          description: 'Waffle hesabı canlı sitede. Yerelde giriş için hesap deposu (Blob) bağlı olmalı.',
        })
        return
      }
      if (result === 'not_found') {
        toast({ title: 'Giriş Hatası', description: 'Bu kullanıcı adı kayıtlı değil. Önce kayıt ol.' })
        return
      }
      if (result === 'bad_password') {
        toast({ title: 'Giriş Hatası', description: 'Şifre yanlış. Tekrar dene veya şifremi unuttum kullan.' })
        return
      }
      const locked = !isOnboardingComplete(username)
      if (locked) onNavigate?.('profile')
      toast({
        title: 'Giriş Başarılı',
        description: locked
          ? `Hoş geldin, ${username}. Devam etmek için profilini tamamla.`
          : `Hoş geldin, ${username}`,
      })
      setAuthModalOpen(false)
    } finally {
      setBusy(false)
    }
  }

  const handleVerifySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!pendingData) return
    setBusy(true)
    try {
      await apiJson('/api/auth/verify-code', { email: pendingData.email, code: inputCode.trim() })
      await signup(pendingData.username, pendingData.email, pendingData.pass)
      onNavigate?.('profile')
      const gm = isGuildMasterEmail(pendingData.email)
      toast({
        title: gm ? 'GM hesabı oluşturuldu' : 'Kayıt Tamamlandı!',
        description: gm
          ? `Hoş geldin ${pendingData.username}. Guild Master yetkin aktif. Önce profilini ve Main karakterini kaydet.`
          : `Hoş geldin ${pendingData.username}. Lonca paneline geçmeden önce profilini ve Main karakterini kaydet.`,
      })
      setAuthModalOpen(false)
      setStep('form')
      setPendingData(null)
      setInputCode('')
    } catch (err: unknown) {
      toast({
        title: 'Doğrulama Hatası',
        description: err instanceof Error ? err.message : 'Girdiğiniz onay kodu hatalı!',
      })
    } finally {
      setBusy(false)
    }
  }

  const handleForgotSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const email = ((formData.get('email') as string) || '').trim().toLowerCase()
    setBusy(true)
    try {
      await apiJson('/api/auth/send-code', { purpose: 'reset', email })
      toast({
        title: 'Sıfırlama bağlantısı gönderildi',
        description: `${email} adresine şifre sıfırlama linki gönderildi.`,
      })
      setAuthModalOpen(false)
      setStep('form')
    } catch (err: unknown) {
      toast({
        title: 'E-posta gönderilemedi',
        description: err instanceof Error ? err.message : 'Daha sonra tekrar dene.',
      })
    } finally {
      setBusy(false)
    }
  }

  const handleResetSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const password = (formData.get('password') as string) || ''
    const passwordConfirm = (formData.get('passwordConfirm') as string) || ''
    if (password.length < MIN_PASSWORD_LENGTH) {
      toast({ title: 'Hata', description: `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.` })
      return
    }
    if (password !== passwordConfirm) {
      toast({ title: 'Hata', description: 'Girdiğiniz şifreler birbiriyle eşleşmiyor!' })
      return
    }
    setBusy(true)
    try {
      const verified = await apiJson('/api/auth/verify-reset', { token: resetToken })
      const email = verified.email || resetEmail
      if (!email) throw new Error('Sıfırlama bağlantısı geçersiz.')
      const updated = await resetPasswordForEmail(email, password, resetToken)
      if (!updated) {
        toast({
          title: 'Hesap bu tarayıcıda yok',
          description: 'Şifre ancak kayıt olduğun tarayıcıda güncellenebilir.',
        })
        return
      }
      toast({ title: 'Şifre güncellendi', description: 'Yeni şifrenle giriş yapabilirsin.' })
      setAuthModalOpen(true)
      setIsSignup(false)
      setStep('form')
      setResetToken('')
      setResetEmail('')
    } catch (err: unknown) {
      toast({
        title: 'Şifre sıfırlanamadı',
        description: err instanceof Error ? err.message : 'Bağlantı geçersiz.',
      })
    } finally {
      setBusy(false)
    }
  }

  const handleGoogleLogin = () => {
    toast({
      title: 'Google girişi henüz açık değil',
      description: 'Sahte hesap oluşturulmaz. E-posta ile kayıt ol veya giriş yap.',
    })
  }

  const handleLogout = () => {
    logout()
    if (typeof window !== 'undefined') {
      localStorage.removeItem('turx_auth_user')
    }
    toast({ title: 'Çıkış Yapıldı', description: 'Oturum sonlandırıldı.' })
  }

  return (
    <div className="flex items-center gap-3">
      {user ? (
        <div className="flex items-center gap-3.5 rounded-xl border border-gold/40 bg-gradient-to-r from-[#071422] to-card px-4 py-2.5 shadow-lg">
          <div className="relative flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-gold bg-gold/15 text-gold shadow-[0_0_12px_rgb(212,175,55/0.3)]">
            <User className="size-5" />
            <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card bg-success" />
          </div>

          <div className="flex flex-col text-left leading-tight">
            <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
              {user.username}
              <span className="rounded bg-gold/15 px-1.5 py-0.2 text-[10px] font-semibold text-gold border border-gold/30">
                {user.role}
              </span>
            </span>
            <span className="text-xs text-muted-foreground mt-0.5">{user.email}</span>
          </div>

          <div className="flex items-center gap-1.5 ml-2 pl-3 border-l border-border">
            <GhostButton
              onClick={() => onNavigate && onNavigate('profile')}
              className="p-2 text-silver hover:text-gold hover:bg-gold/10 transition rounded-lg cursor-pointer"
              title="Detaylı Profil ve Karakter Sayfasına Git"
            >
              <Pencil className="size-4" />
            </GhostButton>

            <GhostButton onClick={handleLogout} className="text-xs py-1.5 px-3 text-muted-foreground hover:text-destructive cursor-pointer">
              Çıkış Yap
            </GhostButton>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <GhostButton
            onClick={() => {
              setIsSignup(false)
              setStep('form')
              setAuthModalOpen(true)
            }}
            className="text-xs py-1.5 px-3 cursor-pointer"
          >
            Giriş Yap
          </GhostButton>
          <GoldButton
            onClick={() => {
              setIsSignup(true)
              setStep('form')
              setAuthModalOpen(true)
            }}
            className="text-xs py-1.5 px-3 cursor-pointer"
          >
            Kayıt Ol
          </GoldButton>
        </div>
      )}

      <Modal
        open={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false)
          setStep('form')
        }}
        title={modalTitle}
        description="Alliance PvE (EU) - Forever Guild Yönetim Paneli"
      >
        {step === 'verify' ? (
          <form onSubmit={handleVerifySubmit} className="flex flex-col gap-4">
            <div className="rounded-lg border border-neon/30 bg-neon/10 p-3 text-xs text-neon">
              <p className="font-bold">Kod e-postana gönderildi</p>
              <p className="mt-1 text-muted-foreground">
                <span className="text-foreground font-semibold">{pendingData?.email}</span> adresine giden 6 haneli
                kodu gir. Gelen kutusu boşsa spam klasörüne bak.
              </p>
            </div>

            <Field label="6 Haneli Onay Kodu">
              <input
                name="code"
                type="text"
                inputMode="numeric"
                required
                maxLength={6}
                autoComplete="one-time-code"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))}
                className={inputClass + ' text-center font-mono tracking-widest text-lg'}
                placeholder="______"
              />
            </Field>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <GhostButton
                type="button"
                onClick={() => {
                  setStep('form')
                  setInputCode('')
                }}
                className="cursor-pointer"
              >
                Geri Dön
              </GhostButton>
              <GoldButton type="submit" disabled={busy} className="cursor-pointer">
                {busy ? 'Kontrol ediliyor…' : 'Kodu Onayla ve Kaydı Tamamla'}
              </GoldButton>
            </div>
          </form>
        ) : step === 'forgot' ? (
          <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Kayıtlı e-posta adresine şifre sıfırlama bağlantısı gönderilir. Link yalnızca gerçek gelen kutusunda olur.
            </p>
            <Field label="E-posta Adresi">
              <input name="email" type="email" required className={inputClass} placeholder="ornek@mail.com" />
            </Field>
            <div className="flex justify-between items-center pt-3 border-t border-border">
              <button type="button" onClick={() => setStep('form')} className="text-xs text-gold hover:underline cursor-pointer font-medium">
                Girişe dön
              </button>
              <GoldButton type="submit" disabled={busy} className="cursor-pointer">
                {busy ? 'Gönderiliyor…' : 'Sıfırlama linki gönder'}
              </GoldButton>
            </div>
          </form>
        ) : step === 'reset' ? (
          <form onSubmit={handleResetSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              {resetEmail ? `${resetEmail} için yeni şifre belirle.` : 'Bağlantı doğrulanıyor…'}
            </p>
            <Field label="Yeni Şifre">
              <input name="password" type="password" required minLength={MIN_PASSWORD_LENGTH} className={inputClass} placeholder="••••••••" />
            </Field>
            <Field label="Yeni Şifre (Tekrar)">
              <input name="passwordConfirm" type="password" required minLength={MIN_PASSWORD_LENGTH} className={inputClass} placeholder="••••••••" />
            </Field>
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <GoldButton type="submit" disabled={busy || !resetEmail} className="cursor-pointer">
                {busy ? 'Kaydediliyor…' : 'Şifreyi güncelle'}
              </GoldButton>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex items-center justify-center gap-3 w-full py-2.5 px-4 rounded-xl border border-border bg-card hover:bg-muted/50 text-foreground font-medium text-sm transition cursor-pointer shadow-sm"
            >
              <svg className="size-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Google (Gmail) ile Devam Et
            </button>

            <div className="flex items-center gap-4 text-xs text-muted-foreground uppercase tracking-wider">
              <div className="h-px bg-border flex-1" />
              <span>VEYA E-POSTA İLE</span>
              <div className="h-px bg-border flex-1" />
            </div>

            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
              <Field label="Kullanıcı Adı (Siteye Özel)">
                <input name="username" required className={inputClass} placeholder="Örn: Sonat" autoComplete={isSignup ? 'username' : 'username'} />
              </Field>

              {isSignup && (
                <Field label="E-posta Adresi">
                  <input name="email" type="email" required className={inputClass} placeholder="ornek@mail.com" autoComplete="email" />
                </Field>
              )}

              <Field label="Şifre">
                <input
                  name="password"
                  type="password"
                  required
                  minLength={isSignup ? MIN_PASSWORD_LENGTH : undefined}
                  className={inputClass}
                  placeholder="••••••••"
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                />
              </Field>

              {isSignup && (
                <Field label="Şifre (Tekrar)">
                  <input
                    name="passwordConfirm"
                    type="password"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    className={inputClass}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </Field>
              )}

              <div className="flex justify-between items-center pt-3 border-t border-border gap-3">
                <div className="flex flex-col items-start gap-1">
                  <button
                    type="button"
                    onClick={() => setIsSignup(!isSignup)}
                    className="text-xs text-gold hover:underline cursor-pointer font-medium"
                  >
                    {isSignup ? 'Zaten hesabın var mı? Giriş yap' : 'Hesabın yok mu? Kayıt ol'}
                  </button>
                  {!isSignup && (
                    <button
                      type="button"
                      onClick={() => setStep('forgot')}
                      className="text-xs text-muted-foreground hover:text-gold hover:underline cursor-pointer"
                    >
                      Şifremi unuttum
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <GhostButton type="button" onClick={() => setAuthModalOpen(false)} className="cursor-pointer">
                    Vazgeç
                  </GhostButton>
                  <GoldButton type="submit" disabled={busy} className="cursor-pointer">
                    {busy ? 'İşleniyor…' : isSignup ? 'Kodu e-postaya gönder' : 'Giriş Yap'}
                  </GoldButton>
                </div>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  )
}
