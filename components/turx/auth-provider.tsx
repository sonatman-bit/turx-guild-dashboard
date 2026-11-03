'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { LogOut, Shield, UserPlus, KeyRound, User, Mail, CheckCircle2, Pencil } from 'lucide-react'
import { GoldButton, GhostButton, Modal, Field, inputClass, Badge } from './ui'
import { useToast } from './toast'

export type GuildRank = 'Guild Master' | 'Officer' | 'Raid Leader' | 'Raider' | 'Member'

interface UserAccount {
  username: string
  email: string
  role: GuildRank
}

interface AuthContextType {
  user: UserAccount | null
  login: (username: string) => void
  logout: () => void
  signup: (username: string, email: string) => void
  updateUser: (username: string, email: string) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const getRegisteredUsers = (): UserAccount[] => {
  if (typeof window === 'undefined') return []
  const saved = localStorage.getItem('turx_registered_users')
  if (saved) {
    try { return JSON.parse(saved) } catch (e) { return [] }
  }
  return [{ username: 'Sonat', email: 'sonat@turxforever.com', role: 'Guild Master' }]
}

const saveRegisteredUser = (newUser: UserAccount) => {
  if (typeof window === 'undefined') return
  const users = getRegisteredUsers()
  if (!users.some(u => u.username.toLowerCase() === newUser.username.toLowerCase())) {
    users.push(newUser)
    localStorage.setItem('turx_registered_users', JSON.stringify(users))
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserAccount | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('turx_auth_user')
      if (saved) {
        try { return JSON.parse(saved) } catch (e) { /* fallback */ }
      }
    }
    return null
  })

  useEffect(() => {
    if (user) {
      localStorage.setItem('turx_auth_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('turx_auth_user')
    }
  }, [user])

  const login = (username: string) => {
    const users = getRegisteredUsers()
    const found = users.find(u => u.username.toLowerCase() === username.toLowerCase())
    const email = found ? found.email : `${username.toLowerCase()}@turxforever.com`
    const role: GuildRank = username.toLowerCase() === 'sonat' ? 'Guild Master' : (found ? found.role : 'Member')
    setUser({ username, email, role })
  }

  const logout = () => {
    setUser(null)
  }

  const signup = (username: string, email: string) => {
    const newUser: UserAccount = { username, email, role: 'Member' }
    saveRegisteredUser(newUser)
    setUser(newUser)
  }

  const updateUser = (username: string, email: string) => {
    if (user) {
      const updated = { ...user, username, email }
      setUser(updated)
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, signup, updateUser }}>
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

export function AuthNavbarWidget({ onNavigate }: { onNavigate?: (tab: any) => void }) {
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
      login(username)
      toast({ title: 'Giriş Başarılı', description: `Hoş geldin, ${username}` })
      setAuthModalOpen(false)
    }
  }

  const handleVerifySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (inputCode === simulatedCode && pendingData) {
      signup(pendingData.username, pendingData.email)
      toast({ 
        title: 'Kayıt Tamamlandı!', 
        description: `Hoş geldin ${pendingData.username}, rütben: Member` 
      })
      setAuthModalOpen(false)
      setStep('form')
      setPendingData(null)
      setInputCode('')
    } else {
      toast({ title: 'Doğrulama Hatası', description: 'Girdiğiniz onay kodu hatalı!' })
    }
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
              className="p-2 text-silver hover:text-gold hover:bg-gold/10 transition rounded-lg" 
              title="Detaylı Profil ve Karakter Sayfasına Git"
            >
              <Pencil className="size-4" />
            </GhostButton>

            <GhostButton onClick={handleLogout} className="text-xs py-1.5 px-3 text-muted-foreground hover:text-destructive">
              Çıkış Yap
            </GhostButton>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <GhostButton onClick={() => { setIsSignup(false); setStep('form'); setAuthModalOpen(true); }} className="text-xs py-1.5 px-3">
            Giriş Yap
          </GhostButton>
          <GoldButton onClick={() => { setIsSignup(true); setStep('form'); setAuthModalOpen(true); }} className="text-xs py-1.5 px-3">
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
              <GhostButton type="button" onClick={() => { setStep('form'); setInputCode(''); }}>
                Geri Dön
              </GhostButton>
              <GoldButton type="submit">
                Kodu Onayla ve Kaydı Tamamla
              </GoldButton>
            </div>
          </form>
        ) : (
          <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
            <Field label="Kullanıcı Adı (Siteye Özel)">
              <input name="username" required className={inputClass} placeholder="Örn: Sonat" defaultValue={isSignup ? '' : 'Sonat'} />
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

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <GhostButton type="button" onClick={() => setAuthModalOpen(false)}>
                Vazgeç
              </GhostButton>
              <GoldButton type="submit">
                {isSignup ? 'Devam Et ve Kod Gönder' : 'Giriş Yap'}
              </GoldButton>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}