'use client'

import { Gavel, Grid3x3, UserPlus, CheckCircle2, XCircle, Clock, MessageSquare, Shield, Swords, ChevronDown, ChevronUp } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { ALLIANCE_RACES, CLASS_COLORS, classesForRace, type WowClass } from '@/lib/guild-data'
import { canAccessAdminPanel } from '@/lib/turx-identity'
import { cn } from '@/lib/utils'
import { useAuth } from '../auth-provider'
import { useToast } from '../toast'
import { Badge, Field, GhostButton, GoldButton, Modal, Panel, PanelTitle, SectionHeader, inputClass } from '../ui'

const NEED_STYLES: Record<string, string> = {
  Yüksek: 'border-success/50 bg-success/10 text-success',
  Orta: 'border-gold/50 bg-gold/10 text-gold',
  Düşük: 'border-azure/40 bg-azure/10 text-azure',
  Kapalı: 'border-border text-muted-foreground',
}

const RECRUITMENT_MATRIX: { wowClass: WowClass; specs: { spec: string; need: 'Yüksek' | 'Düşük' | 'Kapalı' }[] }[] = [
  {
    wowClass: 'Warrior',
    specs: [
      { spec: 'Protection', need: 'Düşük' },
      { spec: 'Arms', need: 'Yüksek' },
      { spec: 'Fury', need: 'Yüksek' },
    ],
  },
  {
    wowClass: 'Paladin',
    specs: [
      { spec: 'Protection', need: 'Düşük' },
      { spec: 'Holy', need: 'Yüksek' },
      { spec: 'Retribution', need: 'Yüksek' },
    ],
  },
  {
    wowClass: 'Shaman',
    specs: [
      { spec: 'Elemental', need: 'Yüksek' },
      { spec: 'Enhancement', need: 'Yüksek' },
      { spec: 'Restoration', need: 'Yüksek' },
    ],
  },
  {
    wowClass: 'Druid',
    specs: [
      { spec: 'Feral Combat (Tank)', need: 'Düşük' },
      { spec: 'Balance', need: 'Yüksek' },
      { spec: 'Restoration', need: 'Yüksek' },
    ],
  },
  {
    wowClass: 'Mage',
    specs: [
      { spec: 'Arcane', need: 'Yüksek' },
      { spec: 'Fire', need: 'Yüksek' },
      { spec: 'Frost', need: 'Yüksek' },
    ],
  },
  {
    wowClass: 'Warlock',
    specs: [
      { spec: 'Affliction', need: 'Yüksek' },
      { spec: 'Demonology', need: 'Yüksek' },
      { spec: 'Destruction', need: 'Yüksek' },
    ],
  },
  {
    wowClass: 'Priest',
    specs: [
      { spec: 'Discipline', need: 'Yüksek' },
      { spec: 'Holy', need: 'Yüksek' },
      { spec: 'Shadow', need: 'Yüksek' },
    ],
  },
  {
    wowClass: 'Hunter',
    specs: [
      { spec: 'Beast Mastery', need: 'Yüksek' },
      { spec: 'Marksmanship', need: 'Yüksek' },
      { spec: 'Survival', need: 'Yüksek' },
    ],
  },
  {
    wowClass: 'Rogue',
    specs: [
      { spec: 'Assassination', need: 'Yüksek' },
      { spec: 'Combat', need: 'Yüksek' },
      { spec: 'Subtlety', need: 'Yüksek' },
    ],
  },
]

const CLASS_SPECS: Record<WowClass, string[]> = {
  Warrior: ['Arms', 'Fury', 'Protection'],
  Paladin: ['Holy', 'Protection', 'Retribution'],
  Hunter: ['Beast Mastery', 'Marksmanship', 'Survival'],
  Rogue: ['Assassination', 'Combat', 'Subtlety'],
  Priest: ['Discipline', 'Holy', 'Shadow'],
  Shaman: ['Elemental', 'Enhancement', 'Restoration'],
  Mage: ['Arcane', 'Fire', 'Frost'],
  Warlock: ['Affliction', 'Demonology', 'Destruction'],
  Druid: ['Balance', 'Feral Combat', 'Restoration'],
}

const LOOT_RULES = [
  { id: 'lc', name: 'Loot Council', active: true, text: 'GM + 3 Officer + 1 Raider temsilcisi. Öncelik: Attendance > Progress katkısı > BIS listesi > Parse.' },
  { id: 'epgp', name: 'EPGP', active: false, text: 'Her Raid saatinde EP kazanılır, item aldıkça GP eklenir. PR = EP / GP. Haftalık %10 decay.' },
  { id: 'dkp', name: 'DKP', active: false, text: 'Zero-sum DKP. Boss kill başına 10 DKP, on-time bonus 5 DKP. Minimum bid 10.' },
]

interface ApplicationItem {
  id: string
  charName: string
  charSurname: string
  discord: string
  race: string
  characterClass: WowClass
  spec: string
  logs: string
  experience: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  date: string
}

export function RecruitView() {
  const { user } = useAuth()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [manifestoOpen, setManifestoOpen] = useState(false)
  const [rule, setRule] = useState('lc')
  const [presetClass, setPresetClass] = useState<WowClass | ''>('')
  
  const [selectedRace, setSelectedRace] = useState<string>('')
  const [selectedClass, setSelectedClass] = useState<WowClass | ''>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null) // Officer detay aç/kapat

  const isAuthorized = canAccessAdminPanel(user?.role)

  const manifestoContentRef = useRef<HTMLDivElement>(null)

  const openManifesto = (e: React.MouseEvent) => {
    e.preventDefault()
    setManifestoOpen(true)
    setTimeout(() => {
      if (manifestoContentRef.current) {
        manifestoContentRef.current.scrollTop = 0
      }
    }, 50)
  }

  const [applications, setApplications] = useState<ApplicationItem[]>([])

  const loadApplications = async () => {
    const response = await fetch('/api/applications')
    const data = (await response.json().catch(() => ({}))) as { applications?: ApplicationItem[]; error?: string }
    if (!response.ok) {
      throw new Error(data.error || 'Başvurular yüklenemedi.')
    }
    setApplications(data.applications || [])
  }

  useEffect(() => {
    loadApplications().catch(() => setApplications([]))
  }, [])

  const handleStatusChange = async (id: string, newStatus: 'APPROVED' | 'REJECTED') => {
    const response = await fetch('/api/applications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus }),
    })
    if (!response.ok) {
      toast({ title: 'Güncellenemedi', description: 'Başvuru durumu kaydedilemedi.' })
      return
    }
    setApplications((prev) => prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app)))
    toast({
      title: newStatus === 'APPROVED' ? 'Başvuru Onaylandı!' : 'Başvuru Reddedildi',
      description: `Başvuru durumu sistem üzerinde güncellendi.`,
    })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const newApp: ApplicationItem = {
      id: Date.now().toString(),
      charName: formData.get('charName') as string,
      charSurname: formData.get('charSurname') as string,
      discord: formData.get('discord') as string,
      race: formData.get('race') as string,
      characterClass: (formData.get('class') as WowClass) || 'Warrior',
      spec: formData.get('spec') as string,
      logs: formData.get('logs') as string || 'Belirtilmemiş',
      experience: formData.get('exp') as string,
      status: 'PENDING',
      date: new Date().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }),
    }

    try {
      const saved = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newApp,
          accountName: user?.username || '',
        }),
      })
      const savedData = (await saved.json().catch(() => ({}))) as { error?: string; application?: ApplicationItem }
      if (!saved.ok) {
        throw new Error(savedData.error || 'Başvuru kaydedilemedi.')
      }
      setApplications((prev) => [savedData.application || newApp, ...prev.filter((item) => item.id !== newApp.id)])

      fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          charName: `${newApp.charName} ${newApp.charSurname}`.trim(),
          discord: newApp.discord,
          characterClass: newApp.characterClass,
          spec: newApp.spec,
          logs: newApp.logs,
          experience: newApp.experience,
        }),
      }).catch(() => undefined)

      await loadApplications()
      setOpen(false)
      toast({
        title: 'Başvurunuz Alındı!',
        description: 'Başvuru kaydedildi. Sayfa yenilense de listede kalır.',
      })
    } catch (error) {
      toast({
        title: 'Hata!',
        description: error instanceof Error ? error.message : 'Sunucuya ulaşılamadı. Lütfen tekrar deneyin.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
      <SectionHeader
        eyebrow="Recruitment · Alliance PvE (EU)"
        title="Başvuru & Recruitment"
        description="TURX, WoW: Forever’da Phase 1’den itibaren progress odaklı Raid kadrosunu genişletiyor."
      />

      {/* Alliance & Forever Birlik Ruhu Banner / Görsel Alanı */}
      <div className="relative overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-r from-[#071422] via-[#0d233a] to-[#071422] p-8 shadow-2xl">
        <div className="absolute -right-10 -top-10 size-64 rounded-full bg-gold/5 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col gap-3 text-left">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-azure/20 px-3 py-1 text-xs font-bold text-azure border border-azure/40">
                Alliance PvE (EU)
              </span>
              <span className="rounded-full bg-gold/20 px-3 py-1 text-xs font-bold text-gold border border-gold/40">
                Forever Realms
              </span>
            </div>
            <h2 className="font-display text-3xl font-black tracking-wider text-gold">
              TURX RAİD KADROSUNA KATIL
            </h2>
            <p className="text-sm text-silver max-w-2xl leading-relaxed">
              Bizler sadece boss kesmek için değil; adaletli loot sistemi, samimi ortam ve yüksek raid disipliniyle kalıcı bir miras bırakmak için bir araya geldik. Alliance bayrağı altında Forever evreninde yerini al!
            </p>
          </div>
          <div className="shrink-0">
            <GoldButton onClick={() => setOpen(true)} className="px-6 py-3 text-sm shadow-lg shadow-gold/20 cursor-pointer">
              <UserPlus className="size-5 mr-2" /> Hemen Başvuru Yap
            </GoldButton>
          </div>
        </div>
      </div>

      {/* İhtiyaç Matrisi */}
      <Panel>
        <PanelTitle icon={Grid3x3}>Class / Spec İhtiyaç Matrisi</PanelTitle>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {RECRUITMENT_MATRIX.map((r) => (
            <div 
              key={r.wowClass} 
              className="rounded-lg border border-border bg-[#071422] p-4" 
              style={{ borderTopColor: CLASS_COLORS[r.wowClass] || '#0070DE', borderTopWidth: 3 }}
            >
              <p className="font-display font-bold text-base" style={{ color: CLASS_COLORS[r.wowClass] }}>
                {r.wowClass}
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {r.specs.map((s) => (
                  <li key={s.spec} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-silver">{s.spec}</span>
                    <Badge className={NEED_STYLES[s.need]}>{s.need}</Badge>
                  </li>
                ))}
              </ul>
              {r.specs.some((s) => s.need !== 'Kapalı') && (
                <button
                  onClick={() => {
                    setPresetClass(r.wowClass)
                    setSelectedClass(r.wowClass)
                    setOpen(true)
                  }}
                  className="mt-3 text-xs font-medium text-neon hover:underline cursor-pointer"
                >
                  {r.wowClass} olarak başvur →
                </button>
              )}
            </div>
          ))}
        </div>
      </Panel>

      {/* Loot Sistemi */}
      <Panel className="mt-6">
        <PanelTitle icon={Gavel}>Loot Kuralları Rehberi</PanelTitle>
        <div role="tablist" aria-label="Loot sistemi" className="flex flex-wrap gap-2">
          {LOOT_RULES.map((l) => (
            <button
              key={l.id}
              role="tab"
              aria-selected={rule === l.id}
              onClick={() => setRule(l.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition cursor-pointer',
                rule === l.id ? 'border-gold bg-gold/10 text-gold' : 'border-border text-silver hover:border-neon/40',
              )}
            >
              {l.name}
              {l.active && <span className="rounded bg-success/20 px-1.5 text-[10px] font-bold text-success">AKTİF</span>}
            </button>
          ))}
        </div>
        <p role="tabpanel" className="mt-4 rounded-lg border border-border bg-[#071422] p-4 text-sm leading-relaxed text-pretty text-silver">
          {LOOT_RULES.find((l) => l.id === rule)?.text}
        </p>
      </Panel>

      {/* Alt Kısım Büyük Başvuru Çağrısı */}
      <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-gold/30 bg-gradient-to-b from-[#071422] to-card text-center gap-4 shadow-xl">
        <Swords className="size-10 text-gold animate-pulse" />
        <div className="space-y-1">
          <h3 className="font-display text-xl font-bold text-foreground">Sıra Sende, TURX Kadrosuna Katıl!</h3>
          <p className="text-xs text-muted-foreground max-w-md">
            Manifestomuzu okuduysan ve raid disiplinine inanıyorsan hemen başvuru formunu doldurarak aramıza katılabilirsin.
          </p>
        </div>
        <GoldButton onClick={() => setOpen(true)} className="px-8 py-3 text-sm mt-2 cursor-pointer">
          <UserPlus className="size-4 mr-2" /> Başvuru Formunu Aç
        </GoldButton>
      </div>

      {/* SAYFANIN EN ALTINDA: Ziyaretçiler İçin Özet Görünüm, GM/Officer İçin Detaylı Görünüm */}
      <Panel className="flex flex-col gap-4 border-gold/30 mt-6">
        <div className="flex items-center justify-between">
          <PanelTitle icon={MessageSquare}>Aktif Guild Başvuruları ({applications.length})</PanelTitle>
          <Badge className="border-gold/40 bg-gold/10 text-gold flex items-center gap-1">
            <Shield className="size-3" /> {isAuthorized ? 'Subay & GM Detaylı Görünüm Aktif' : 'Ziyaretçi Özet Görünümü'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {isAuthorized 
            ? 'Yetkili hesabınızla bağlı olduğunuz için adayların tüm detaylı tecrübe, discord ve log bilgilerini inceleyebilir, karar verebilirsiniz.' 
            : 'Ziyaretçiler için sadeleştirilmiş başvuru durumu özeti. Detaylı inceleme ve yetki paneli sadece GM ve Officer rollerine görünür.'}
        </p>
        <div className="grid gap-4">
          {applications.length === 0 && (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Henüz kayıtlı başvuru yok. Form gönderildikten sonra burada kalır.
            </p>
          )}
          {applications.map((app) => {
            const isExpanded = expandedAppId === app.id
            return (
              <div key={app.id} className="relative flex flex-col gap-3 p-4 rounded-xl border border-border bg-[#071422] border-l-4 border-l-gold shadow-md">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-azure/20 text-azure border border-azure/40">TURX Başvuru</span>
                    <span className="text-xs text-muted-foreground">{app.date}</span>
                  </div>
                  <Badge className={
                    app.status === 'APPROVED' ? 'border-success/40 bg-success/10 text-success' :
                    app.status === 'REJECTED' ? 'border-destructive/40 bg-destructive/10 text-destructive' :
                    'border-gold/40 bg-gold/10 text-gold'
                  }>
                    {app.status === 'APPROVED' ? 'Onaylandı' : app.status === 'REJECTED' ? 'Reddedildi' : 'İncelemede'}
                  </Badge>
                </div>

                {/* HERKESİN GÖRDÜĞÜ TEMEL ÖZET BİLGİLER */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-display font-bold text-base" style={{ color: CLASS_COLORS[app.characterClass] || undefined }}>
                      {app.charName} {app.charSurname}
                    </span>
                    <Badge className="border-border bg-muted/40 text-[10px]">
                      {app.race} · {app.characterClass} ({app.spec})
                    </Badge>
                  </div>

                  {/* Sadece Officer / GM için detay açma butonu */}
                  {isAuthorized && (
                    <button
                      onClick={() => setExpandedAppId(isExpanded ? null : app.id)}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-border bg-card text-silver hover:text-foreground cursor-pointer self-start sm:self-auto"
                    >
                      {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                      {isExpanded ? 'Detayları Gizle' : 'Officer Detaylarını Gör'}
                    </button>
                  )}
                </div>

                {/* SADECE GM VE OFFICER İÇİN AÇILAN DETAYLI ALAN (Deneyim, Log, Discord vb.) */}
                {isAuthorized && isExpanded && (
                  <div className="border-t border-border/60 pt-3 mt-1 flex flex-col gap-3 text-xs text-muted-foreground bg-background/50 p-3 rounded-lg animate-in fade-in">
                    <div className="flex flex-wrap gap-4 text-silver">
                      <span>Discord: <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">@{app.discord}</code></span>
                      <span>Logs: <a href={app.logs} target="_blank" rel="noreferrer" className="text-neon hover:underline">{app.logs}</a></span>
                    </div>
                    <div>
                      <strong className="text-gold block mb-1">World of Warcraft Tecrübesi:</strong>
                      <p className="text-foreground leading-relaxed">{app.experience}</p>
                    </div>
                  </div>
                )}

                {/* Aksiyon / Onay Alanı */}
                <div className="flex items-center justify-between pt-3 border-t border-border/65">
                  <span className="text-[11px] text-muted-foreground">
                    {isAuthorized ? 'Subay / GM Yetki Paneli Aktif' : 'Aday Durum Takibi'}
                  </span>
                  <div className="flex items-center gap-2">
                    {isAuthorized ? (
                      app.status === 'PENDING' ? (
                        <>
                          <GoldButton onClick={() => handleStatusChange(app.id, 'APPROVED')} className="text-xs py-1.5 px-3 cursor-pointer">
                            <CheckCircle2 className="size-3.5 mr-1" /> Onayla
                          </GoldButton>
                          <GhostButton onClick={() => handleStatusChange(app.id, 'REJECTED')} className="text-xs py-1.5 px-3 text-destructive hover:bg-destructive/10 cursor-pointer">
                            <XCircle className="size-3.5 mr-1" /> Reddet
                          </GhostButton>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="size-3.5" /> Karar Verildi
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        {app.status === 'PENDING' ? 'Subay incelemesinde...' : 'Sonuçlandı'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Panel>

      {/* Başvuru Formu Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="Guild Başvuru Formu" description="TURX · Alliance PvE (EU) Raid kadrosu başvurusu">
        <form key={presetClass} className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Karakter Adı">
              <input name="charName" required className={inputClass} placeholder="Örn: Waffle" />
            </Field>
            <Field label="Soyadı / Unvan">
              <input name="charSurname" required className={inputClass} placeholder="Örn: Theone" />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Discord Kullanıcı Adı">
              <input name="discord" required className={inputClass} placeholder="Waffle (Sonat)" />
            </Field>
            <Field label="Irk (Race)">
              <select 
                name="race" 
                required 
                className={inputClass}
                value={selectedRace}
                onChange={(e) => {
                  setSelectedRace(e.target.value)
                  setSelectedClass('')
                }}
              >
                <option value="" disabled>Irk Seçiniz</option>
                {ALLIANCE_RACES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Class">
              <select 
                name="class" 
                required 
                value={selectedClass} 
                onChange={(e) => setSelectedClass(e.target.value as WowClass)}
                className={inputClass}
              >
                <option value="" disabled>Class Seçiniz</option>
                {selectedRace && classesForRace(selectedRace).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Spec">
              <select name="spec" required className={inputClass}>
                <option value="" disabled>Spec Seçiniz</option>
                {selectedClass && CLASS_SPECS[selectedClass]?.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="WarcraftLogs Profil Linki (İsteğe Bağlı)" hint="Önceki Classic / SoD loglarınız">
            <input name="logs" type="url" className={inputClass} placeholder="https://waffle.com/" />
          </Field>
          
          <Field label="World of Warcraft Tecrübesi ve Eklemek İstedikleriniz">
            <textarea name="exp" required rows={3} className={inputClass} placeholder="Daha önce hangi Raid’lerde progress yaptınız?" />
          </Field>

          {/* Manifesto ve Kurallar Onay Kutusu */}
          <label className="flex items-start gap-2 text-sm text-silver cursor-pointer select-none">
            <input type="checkbox" required className="mt-1 accent-[#d4af37]" />
            <span>
              <button 
                type="button" 
                onClick={openManifesto}
                className="text-gold underline hover:text-gold/80 font-semibold mx-1 cursor-pointer inline-flex items-center gap-1"
              >
                TURX Guild Manifestosunu
              </button> 
              ve Guild kurallarını okudum, anladım ve onaylıyorum.
            </span>
          </label>

          <div className="flex justify-end gap-2">
            <GhostButton type="button" onClick={() => setOpen(false)} className="cursor-pointer">
              Vazgeç
            </GhostButton>
            <GoldButton type="submit" disabled={isSubmitting} className="cursor-pointer">
              {isSubmitting ? 'Gönderiliyor...' : 'Guild Başvurusunu Gönder'}
            </GoldButton>
          </div>
        </form>
      </Modal>

      {/* Guild Manifestosu Okuma Modalı */}
      <Modal open={manifestoOpen} onClose={() => setManifestoOpen(false)} title="TURX Guild Manifestosu" description="Alliance PvE (EU) - Forever Çekirdek Kuralları ve Felsefesi">
        <div ref={manifestoContentRef} className="flex flex-col gap-4 text-sm text-silver leading-relaxed max-h-[65vh] overflow-y-auto pr-3">
          <div className="p-3 rounded-lg border border-gold/30 bg-gold/5 text-gold font-medium italic">
            "Biz kusursuz oyunculardan oluşan bir guild kurmaya çalışmıyoruz. Hata yapan, öğrenen, bazen tartışan ama sonunda birbirine saygı gösterebilen insanlardan oluşan sağlıklı bir topluluk kurmaya çalışıyoruz."
          </div>

          <div className="space-y-3">
            <p><strong>Giriş:</strong> Biz, World of Warcraft’ın sadece bir oyun ve T U R X guild’inin de yalnızca boss kesmek, loot toplamak veya ilerleme kaydetmek için bir araya gelmiş oyunculardan ibaret olduğuna inanmıyoruz. Burası birlikte vakit geçirdiğimiz, emek verdiğimiz, güzel anılar ve tecrübe biriktirdiğimiz, başarıyı ve bazen başarısızlığı paylaştığımız bir topluluktur. Bu nedenle guild içerisindeki davranışlarımızı yalnızca oyun kuralları değil; <strong>Saygı, Adalet, Güven ve Dayanışma</strong> belirler. Bu manifesto, guild içerisindeki herkes için ortak bir sözleşme niteliğindedir. Aramıza katılmak isteyen arkadaşların öncelikli olarak bu prensipleri kabul etmesi zorunludur.</p>

            <div className="border-l-2 border-gold/40 pl-3 space-y-2">
              <p><strong>I. Önce İnsan:</strong> Karakterlerin (item level'ların, rank'lerin ve performans tablolarının) arkasında gerçek insanlar olduğunu unutmayın. Hiçbir oyun içi başarı, başka bir üyeyi aşağılamayı, küçük düşürmeyi veya değersiz hissettirmeyi haklı çıkarmaz. Bir oyuncunun deneyimsiz olması öğrenemeyeceği anlamına gelmez. Hata yapmak ise saygısızlığa maruz kalmanın gerekçesi değildir. İyi oyunculuğun ilk şartı iyi bir takım arkadaşı olmaktır.</p>

              <p><strong>II. Saygı Karşılıklıdır:</strong> Guild içerisindeki herkese; görevi, tecrübesi, yaşı, cinsiyeti, kökeni, oyun tarzı veya sosyal konumu ne olursa olsun temel bir saygıyla yaklaşırız. Hakaret, kişisel saldırı, sistematik aşağılama, zorbalık, taciz ve ayrımcı davranışlara tolerans göstermeyiz. Şaka ve mizah topluluğumuzun parçası olabilir; ancak bir şakanın sürekli olarak başka birinin rahatsızlığı pahasına yapılmasını mizah olarak görmeyiz.</p>

              <p><strong>III. Eleştiri Kişiye Değil, Davranışa Yöneliktir:</strong> Hepimiz hata yapabiliriz. Raid sırasında mekanik kaçırabilir, yanlış karar verebilir veya beklenen performansı gösteremeyebiliriz. Hataları konuşmaktan kaçınmayız; fakat eleştirinin amacı suçlu bulmak değil, birlikte gelişmektir. “Sen kötü oyuncusun” yerine “buradaki mekaniği nasıl daha iyi yapabiliriz?” yaklaşımını benimseriz. Bir kişi belirlenip kurban gibi ortaya atılması asla kabul edilemez.</p>

              <p><strong>IV. Başarı Ortaktır:</strong> Guild başarısını yalnızca DPS/HPS tablolarının en üstündeki oyuncular yaratmaz. Tank, healer, damage dealer, raid lideri, organizasyonu yapan kişi, materyal sağlayan üye, yeni oyunculara yardım eden veteran ve gerektiğinde başkasının yerine raid'e giren herkes bu başarının parçasıdır. Bu nedenle bireysel egoların takımın önüne geçmesine izin vermeyiz. Boss'u kişiler değil, takım öldürür.</p>

              <p><strong>V. Loot Amaç Değil, Araçtır:</strong> Loot'u kişisel statü göstergesi olarak değil, guild'ın ortak ilerlemesini sağlayan bir araç olarak görürüz. Loot dağıtımında mümkün olduğunca şeffaflık, tutarlılık ve adalet esastır. Bir item yüzünden takım arkadaşlıklarının, güvenin veya guild huzurunun zarar görmesini kabul etmeyiz. Loot dağıtımında kullanılan sistem sayfamızda belirtilmiştir; herkesin bunu kabul ederek raidlere katılım göstermesi beklenmektedir.</p>

              <p><strong>VI. Bizde Rank Ayrıcalık Değil, Sorumluluktur:</strong> Guild Lideri, Officer, Raid Leader, Master Looter veya ismi bir diğerinden farklı olan roller kişilere üstünlük veya ayrıcalık sağlamaz. Rank daha yüksek sorumluluk anlamına gelir. Bu görevleri alan arkadaşlarımızın kararlarını açıklayabilmesini, ayrımcılık yapmamasını, eleştiriye açık olmasını ve yetkisini kişisel anlaşmazlıklarda silah olarak kullanmamasını bekleriz.</p>

              <p><strong>VII. Zaman ve Emeğe Saygı Duyarız:</strong> Raid'e veya planlanmış bir etkinliğe katılmayı kabul ettiğimizde yalnızca kendi zamanımızı değil, diğer oyuncuların zamanını da etkilediğimizi bilmeliyiz. Ineklemeden mümkün olduğunca zamanında gelir, hazırlığımızı yapar ve katılamayacağımız durumlarda haber veririz. Gerçek hayatın her zaman oyundan önemli olduğunu kabul ederiz; fakat bu, sorumluluklarımızı ortadan kaldırmaz veya sürekli bahane olarak kullanılamaz.</p>

              <p><strong>VIII. Bilgi Paylaşıldıkça Guild Güçlenir:</strong> Deneyimli oyuncuların bilgilerini yeni oyuncular üzerinde üstünlük kurmak için değil, onları geliştirmek için kullanmasını teşvik ederiz. Soru sormayı zayıflık, cevap vermeyi üstünlük gösterisi bilmeyiz. Bilmediğini söylemek, yanlış bilgi vermekten daha değerlidir.</p>

              <p><strong>IX. Drama Değil, İletişim:</strong> Anlaşmazlıkların olması doğaldır. Sorunlarımızı dedikodu, gruplaşma, pasif agresif davranışlar yerine doğrudan iletişimle çözmeye çalışırız. İki kişi arasındaki problem bütün guild'ın problemine dönüştürülmemelidir.</p>

              <p><strong>X. Guild Dışındaki Davranışlarımız da Önemlidir:</strong> Guild tag'imizi taşıdığımız sürece diğer oyuncularla olan etkileşimlerimizin de topluluğumuzu temsil ettiğinin farkındayız. PUG gruplarında, trade chat'te, Discord'da veya diğer topluluklarda kasıtlı dolandırıcılık, taciz veya ninja-looting gibi davranışları guild değerleriyle bağdaşır görmeyiz.</p>

              <p><strong>XI. Oyun Eğlence Olmayı Bırakmamalıdır:</strong> Progress yapmak ve rekabet etmek değerli olmakla birlikte, hiçbir başarı insanların oyuna girmekten çekinmesine değmez. Disiplin ile toksiklik arasındaki çizgiyi koruruz.</p>

              <p><strong>XII. Kurallar Herkes İçindir:</strong> Bu manifesto yalnızca yeni üyelerin uyması gereken kurallar değildir; Guild Master'dan en yeni üyeye kadar herkes için geçerlidir. Çok iyi DPS yapmak kötü davranışların bahanesi değildir.</p>
            </div>

            <p><strong>Son Söz:</strong> Başarılarımızın yalnızca Warcraft Logs'ta değil, insanların burada geçirdiği zamana dönüp baktığında hissettiği şeylerde de ölçüldüğüne inanıyoruz. Birlikte boss keseceğiz ve wipe yiyeceğiz; loot kazanacağız ve kaybedeceğiz. Ama bütün bunları yaparken birbirimize insan gibi davranacağız. Çünkü guild'ı güçlü yapan yalnızca karakterlerimiz değil, oluşturduğumuz topluluktur.</p>
          </div>

          <div className="flex justify-end pt-3 border-t border-border">
            <GoldButton onClick={() => setManifestoOpen(false)} className="cursor-pointer">
              Manifestoyu Okudum, Kapat
            </GoldButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}