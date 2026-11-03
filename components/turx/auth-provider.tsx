'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { User, Pencil } from 'lucide-react'
import { isOnboardingComplete } from '@/lib/profile-gate'
import { isGuildMasterEmail, wipeLegacyTurxData } from '@/lib/turx-identity'
import { GoldButton, GhostButton, Modal, Field, inputClass } from './ui'
import { useToast } from './toast'

export type GuildRank = 'Guild Master' | 'Officer' | 'Raid Leader' | 'Raider' | 'Member'

interface UserAccount {
  username: string
  email: string
  role: GuildRank
}

interface AuthContextType {
  user: UserAccount | null
  login: (username: string) => boolean
  logout: () => void
  signup: (username: string, email: string) => void
  updateUser: (username: string, email: string) => void
  profileComplete: boolean
  refreshProfileGate: () => void
}

function roleForEmail(email: string): GuildRank {
  return isGuildMasterEmail(email) ? 'Guild Master' : 'Member'
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const getRegisteredUsers = (): UserAccount[] => {
  if (typeof window === 'undefined') return []
  wipeLegacyTurxData()
  const saved = localStorage.getItem('turx_registered_users')
  if (saved) {
    try { return JSON.parse(saved) } catch (e) { return [] }
  }
  return []
}

const saveRegisteredUser = (newUser: UserAccount) => {
  if (typeof window === 'undefined') return
  const users = getRegisteredUsers()
  if (!users.some(u => u.username.toLowerCase() === newUser.username.toLowerCase())) {
    users.push(newUser)
    localStorage.setItem('turx_registered_users', JSON.stringify(users))
  }
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserAccount | null>(() => readStoredUser())
  const [profileComplete, setProfileComplete] = useState(() => {
    const stored = readStoredUser()
    return stored ? isOnboardingComplete(stored.username) : true
  })

  useEffect(() => {
    if (user) {
      localStorage.setItem('turx_auth_user', JSON.stringify(user))
      setProfileComplete(isOnboardingComplete(user.username))
    } else {
      localStorage.removeItem('turx_auth_user')
      setProfileComplete(true)
    }
  }, [user])

  const refreshProfileGate = () => {
    if (!user) {
      setProfileComplete(true)
      return
    }
    setProfileComplete(isOnboardingComplete(user.username))
  }

  const login = (username: string) => {
    const users = getRegisteredUsers()
    const found = users.find(u => u.username.toLowerCase() === username.toLowerCase())
    if (!found) return false
    const nextUser = { ...found, role: roleForEmail(found.email) }
    setUser(nextUser)
    setProfileComplete(isOnboardingComplete(nextUser.username))
    return true
  }

  const logout = () => {
    setUser(null)
    setProfileComplete(true)
  }

  const signup = (username: string, email: string) => {
    const newUser: UserAccount = { username, email, role: roleForEmail(email) }
    saveRegisteredUser(newUser)
    setUser(newUser)
    setProfileComplete(false)
  }

  const updateUser = (username: string, email: string) => {
    if (user) {
      const updated = { ...user, username, email, role: roleForEmail(email) }
      setUser(updated)
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, signup, updateUser, profileComplete, refreshProfileGate }}>
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
  const { user, login, logout, signup } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [isSignup, setIsSignup] = useState(false)
  
  const [step, setStep] = useState<'form' | 'verify'>('form')
  const [pendingData, setPendingData] = useState<{ username: string; email: string; pass: string } | null>(null)
  const [simulatedCode, setSimulatedCode] = useState('')
  const [inputCode, setInputCode] = useState('')

  const toast = useToast()

  if (!mounted) {
    return <div className="h-9 w-24" />
  }

  const handleAuthSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const username = ((formData.get('username') as string) || '').trim()
    const emailInput = formData.get('email') as string
    const email = emailInput ? emailInput.trim() : ''
    const password = (formData.get('password') as string) || ''
    const passwordConfirm = (formData.get('passwordConfirm') as string) || ''

    const existingUsers = getRegisteredUsers()

    if (isSignup) {
      if (password !== passwordConfirm) {
        toast({ title: 'Hata', description: 'Girdiğiniz şifreler birbiriyle eşleşmiyor!' })
        return
      }

      const usernameExists = existingUsers.some(u => u.username.toLowerCase() === username.toLowerCase())
      const emailExists = existingUsers.some(u => u.email.toLowerCase() === email.toLowerCase())

      if (usernameExists) {
        toast({ title: 'Kayıt Hatası', description: `"${username}" kullanıcı adı zaten alınmış.` })
        return
      }

      if (emailExists) {
        toast({ title: 'Kayıt Hatası', description: `"${email}" e-posta adresiyle zaten bir hesap kayıtlı.` })
        return
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString()
      setSimulatedCode(code)
      setInputCode(code)
      setPendingData({ username, email, pass: password })
      setStep('verify')
      
      toast({ 
        title: 'Doğrulama Kodu Gönderildi!', 
        description: `Simülasyon: ${email} için kod: ${code}` 
      })
    } else {
      const ok = login(username)
      if (!ok) {
        toast({ title: 'Giriş Hatası', description: 'Bu kullanıcı adı kayıtlı değil. Önce kayıt ol.' })
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
    }
  }

  const handleVerifySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (inputCode === simulatedCode && pendingData) {
      signup(pendingData.username, pendingData.email)
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
    } else {
      toast({ title: 'Doğrulama Hatası', description: 'Girdiğiniz onay kodu hatalı!' })
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
          <GhostButton onClick={() => { setIsSignup(false); setStep('form'); setAuthModalOpen(true); }} className="text-xs py-1.5 px-3 cursor-pointer">
            Giriş Yap
          </GhostButton>
          <GoldButton onClick={() => { setIsSignup(true); setStep('form'); setAuthModalOpen(true); }} className="text-xs py-1.5 px-3 cursor-pointer">
            Kayıt Ol
          </GoldButton>
        </div>
      )}

      <Modal 
        open={authModalOpen} 
        onClose={() => { setAuthModalOpen(false); setStep('form'); }} 
        title={isSignup ? (step === 'form' ? 'TURX — Yeni Hesap Oluştur (Sign Up)' : 'E-posta Adresini Doğrula') : 'TURX — Hesaba Giriş Yap (Log In)'} 
        description="Alliance PvE (EU) - Forever Guild Yönetim Paneli"
      >
        {isSignup && step === 'verify' ? (
          <form onSubmit={handleVerifySubmit} className="flex flex-col gap-4">
            <div className="rounded-lg border border-neon/30 bg-neon/10 p-3 text-xs text-neon">
              <p className="font-bold">Doğrulama Kodu Gönderildi!</p>
              <p className="mt-1 text-muted-foreground">
                <span className="text-foreground font-semibold">{pendingData?.email}</span> adresine gönderilen 6 haneli onay kodunu giriniz.
              </p>
              <p className="mt-2 text-[10px] text-gold">(Test Simülasyon Kodu: <span className="font-mono font-bold">{simulatedCode}</span>)</p>
            </div>

            <Field label="6 Haneli Onay Kodu">
              <input 
                name="code" 
                type="text"
                inputMode="numeric"
                required 
                maxLength={6} 
                autoComplete="off"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                className={inputClass + " text-center font-mono tracking-widest text-lg"} 
                placeholder="123456" 
              />
            </Field>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <GhostButton type="button" onClick={() => { setStep('form'); setInputCode(''); }} className="cursor-pointer">
                Geri Dön
              </GhostButton>
              <GoldButton type="submit" className="cursor-pointer">
                Kodu Onayla ve Kaydı Tamamla
              </GoldButton>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Google ile Giriş Seçeneği (Bonus Hızlı Yöntem) */}
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
                <input name="username" required className={inputClass} placeholder="Örn: Sonat" />
              </Field>

              {isSignup && (
                <Field label="E-posta Adresi">
                  <input name="email" type="email" required className={inputClass} placeholder="ornek@mail.com" />
                </Field>
              )}

              <Field label="Şifre">
                <input name="password" type="password" required className={inputClass} placeholder="••••••••" />
              </Field>

              {isSignup && (
                <Field label="Şifre (Tekrar)">
                  <input name="passwordConfirm" type="password" required className={inputClass} placeholder="••••••••" />
                </Field>
              )}

              <div className="flex justify-between items-center pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsSignup(!isSignup)}
                  className="text-xs text-gold hover:underline cursor-pointer font-medium"
                >
                  {isSignup ? 'Zaten hesabın var mı? Giriş yap' : 'Hesabın yok mu? Kayıt ol'}
                </button>

                <div className="flex gap-2">
                  <GhostButton type="button" onClick={() => setAuthModalOpen(false)} className="cursor-pointer">
                    Vazgeç
                  </GhostButton>
                  <GoldButton type="submit" className="cursor-pointer">
                    {isSignup ? 'Devam Et ve Kod Gönder' : 'Giriş Yap'}
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