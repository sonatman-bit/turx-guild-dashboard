'use client'

import { useState } from 'react'
import { Shield, Users, FileText, Calendar, CheckCircle2, XCircle, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { CLASS_COLORS, type WowClass } from '@/lib/guild-data'
import { cn } from '@/lib/utils'
import { useToast } from '../toast'
import { Badge, GhostButton, GoldButton, Panel, PanelTitle, SectionHeader } from '../ui'

type GuildRank = 'GM' | 'Officer' | 'Raid Leader' | 'Raider' | 'Member'

interface MemberItem {
  id: string
  accountName: string       // Sitedeki profil / hesap ismi
  mainCharacter: string     // Ana karakter adı-soyadı
  class: WowClass
  spec: string
  rank: GuildRank
  joinDate: string
}

interface AdminApplication {
  id: string
  accountName: string
  charName: string
  charSurname: string
  discord: string
  characterClass: WowClass
  spec: string
  experience: string        // Detaylı bilgi
  previousGuilds: string    // Detaylı bilgi
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  date: string
}

export function AdminDashboardView() {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<'members' | 'applications' | 'attendance'>('members')
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null) // Detay açıp kapatmak için

  // 1. Üye Matrisi (Hesap/Profil tabanlı, ana karakter detaylı)
  const [members, setMembers] = useState<MemberItem[]>([
    { id: 'm1', accountName: 'Waffle', mainCharacter: 'Sonat Düşmez (Waffle)', class: 'Druid', spec: 'Feral Tank', rank: 'GM', joinDate: '2025-12-01' },
    { id: 'm2', accountName: 'Shadowblade', mainCharacter: 'Ahmet Yılmaz', class: 'Rogue', spec: 'Combat', rank: 'Officer', joinDate: '2025-12-10' },
    { id: 'm3', accountName: 'Holyheal', mainCharacter: 'Mehmet Demir', class: 'Priest', spec: 'Holy', rank: 'Raider', joinDate: '2026-01-05' },
    { id: 'm4', name: 'Newbie', accountName: 'NewPlayer', mainCharacter: 'Can Çelik', class: 'Mage', spec: 'Fire', rank: 'Member', joinDate: '2026-02-14' },
  ])

  // 2. Başvuru Yönetimi (Detaylı görünüm - Sadece GM ve Officer burada tüm detayları görür)
  const [applications, setApplications] = useState<AdminApplication[]>([
    { 
      id: 'a1', 
      accountName: 'shadowblade', 
      charName: 'Shadow', 
      charSurname: 'Blade', 
      discord: 'shadowblade#1234', 
      characterClass: 'Rogue', 
      spec: 'Combat', 
      experience: 'Vanilla Classic Naxx geceleri dahil tüm raid tierlerinde aktif hardcore officer ve dps tecrübesi.', 
      previousGuilds: 'APEX, Vanguard (EU-Shazzrah)', 
      status: 'PENDING', 
      date: '09:30' 
    },
    { 
      id: 'a2', 
      accountName: 'ironshield', 
      charName: 'Ironhold', 
      charSurname: 'Shield', 
      discord: 'ironshield#9988', 
      characterClass: 'Warrior', 
      spec: 'Protection', 
      experience: 'TBC ve Classic dönemlerinde MT (Main Tank) olarak BWL ve AQ40 clear progress yönettim.', 
      previousGuilds: 'Notorious (EU-Firemaw)', 
      status: 'PENDING', 
      date: '11:15' 
    },
  ])

  const handleRankChange = (memberId: string, memberAccount: string, currentRank: GuildRank, newRank: GuildRank) => {
    if (currentRank === 'GM') {
      toast({
        title: '🔒 Güvenlik Koruması',
        description: 'Guild Master (GM) rütbesi değiştirilemez veya düşürülemez.',
      })
      return
    }

    if (newRank === 'GM') {
      toast({
        title: '⛔ Yetki Reddedildi',
        description: 'Bu panel üzerinden yeni bir Guild Master ataması yapılamaz.',
      })
      return
    }

    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, rank: newRank } : m))
    toast({
      title: 'Rütbe Güncellendi',
      description: `${memberAccount} hesabının unvanı ${newRank} olarak değiştirildi.`,
    })
  }

  const handleKickMember = (memberId: string, memberAccount: string, currentRank: GuildRank) => {
    if (currentRank === 'GM') {
      toast({
        title: '🔒 Güvenlik Koruması',
        description: 'Guild Master (GM) londan çıkarılamaz!',
      })
      return
    }

    setMembers(prev => prev.filter(m => m.id !== memberId))
    toast({
      title: 'Hesap Loncadan Çıkarıldı',
      description: `${memberAccount} hesabı lonca kadrosundan kaldırıldı.`,
    })
  }

  const handleAppAction = (appId: string, status: 'APPROVED' | 'REJECTED') => {
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a))
    toast({
      title: status === 'APPROVED' ? 'Başvuru Onaylandı' : 'Başvuru Reddedildi',
      description: `Başvuru durumu güncellendi.`,
    })
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
      <SectionHeader
        eyebrow="Yetkili Yönetim Paneli"
        title="GM & Officer Kontrol Merkezi"
        description="Hesap bazlı rütbe yönetimi yapın ve detaylı guild başvuru bilgilerini denetleyin."
      />

      <div className="flex items-center gap-3 p-4 rounded-xl border border-gold/40 bg-gold/10 text-gold">
        <Shield className="size-6 shrink-0" />
        <div className="text-xs leading-relaxed">
          <strong>Güvenlik Notu:</strong> Bu panel yalnızca <strong>Guild Master</strong> ve <strong>Officer</strong> rütbesine sahip yetkililer tarafından görüntülenebilir. Yetkiler site hesaplarına (profil isimlerine) verilmiştir.
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-4">
        <button
          onClick={() => setActiveTab('members')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition cursor-pointer border',
            activeTab === 'members' ? 'border-gold bg-gold/15 text-gold shadow-md' : 'border-border bg-card text-muted-foreground hover:text-foreground'
          )}
        >
          <Users className="size-4" /> Üye & Rütbe Yönetimi ({members.length})
        </button>
        <button
          onClick={() => setActiveTab('applications')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition cursor-pointer border',
            activeTab === 'applications' ? 'border-gold bg-gold/15 text-gold shadow-md' : 'border-border bg-card text-muted-foreground hover:text-foreground'
          )}
        >
          <FileText className="size-4" /> Detaylı Başvurular ({applications.filter(a => a.status === 'PENDING').length} Bekleyen)
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition cursor-pointer border',
            activeTab === 'attendance' ? 'border-gold bg-gold/15 text-gold shadow-md' : 'border-border bg-card text-muted-foreground hover:text-foreground'
          )}
        >
          <Calendar className="size-4" /> Raid Müsaitlik Matrisi
        </button>
      </div>

      {/* SEKME 1: ÜYE & RÜTBE YÖNETİMİ (Hesap ve Ana Karakter Odaklı) */}
      {activeTab === 'members' && (
        <Panel className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <PanelTitle icon={Users}>Hesap & Rütbe Matrisi</PanelTitle>
            <span className="text-xs text-muted-foreground">Toplam Hesap: {members.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Hesap / Profil İsmi</th>
                  <th className="py-3 px-4">Ana Karakter (Ad Soyad)</th>
                  <th className="py-3 px-4">Sınıf & Spec</th>
                  <th className="py-3 px-4">Rütbesi</th>
                  <th className="py-3 px-4">Kayıt Tarihi</th>
                  <th className="py-3 px-4 text-right">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-sm">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-muted/20 transition">
                    <td className="py-3 px-4 font-bold text-silver">
                      {member.accountName}
                    </td>
                    <td className="py-3 px-4 text-foreground font-medium">
                      {member.mainCharacter}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <span className="font-semibold" style={{ color: CLASS_COLORS[member.class] }}>
                        {member.class}
                      </span>
                      <span className="text-muted-foreground"> ({member.spec})</span>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={member.rank}
                        disabled={member.rank === 'GM'}
                        onChange={(e) => handleRankChange(member.id, member.accountName, member.rank, e.target.value as GuildRank)}
                        className={cn(
                          'border rounded-lg px-2 py-1 text-xs font-semibold',
                          member.rank === 'GM' 
                            ? 'bg-gold/10 border-gold/40 text-gold cursor-not-allowed opacity-90' 
                            : 'bg-background border-border text-gold cursor-pointer'
                        )}
                      >
                        <option value="GM">Guild Master (GM)</option>
                        <option value="Officer">Officer</option>
                        <option value="Raid Leader">Raid Leader</option>
                        <option value="Raider">Raider</option>
                        <option value="Member">Member</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground font-mono">{member.joinDate}</td>
                    <td className="py-3 px-4 text-right">
                      {member.rank !== 'GM' && (
                        <button
                          onClick={() => handleKickMember(member.id, member.accountName, member.rank)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
                          title="Loncadan Çıkar"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* SEKME 2: DETAYLI BAŞVURU YÖNETİMİ (Officer & GM Özel Görünüm) */}
      {activeTab === 'applications' && (
        <Panel className="flex flex-col gap-4">
          <PanelTitle icon={FileText}>Detaylı Guild Başvuruları (Officer & GM Paneli)</PanelTitle>
          <p className="text-xs text-muted-foreground">
            Ziyaretçilerin gördüğü özet alan yerine, burada adayların tüm tecrübe, geçmiş lonca bilgileri ve discord detayları incelenir.
          </p>
          <div className="grid gap-4">
            {applications.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">Bekleyen başvuru bulunmuyor.</p>
            ) : (
              applications.map((app) => {
                const isExpanded = expandedAppId === app.id
                return (
                  <div key={app.id} className="flex flex-col gap-4 p-4 rounded-xl border border-border bg-[#071422]">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base" style={{ color: CLASS_COLORS[app.characterClass] }}>
                            {app.charName} {app.charSurname}
                          </span>
                          <Badge className="border-border bg-muted/40 text-[10px]">{app.characterClass} ({app.spec})</Badge>
                          <span className="text-xs text-muted-foreground ml-2">Hesap: <strong className="text-silver">{app.accountName}</strong></span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Discord: <span className="text-silver font-mono">@{app.discord}</span> · Başvuru Saati: {app.date}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                          onClick={() => setExpandedAppId(isExpanded ? null : app.id)}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-border bg-card text-silver hover:text-foreground cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                          {isExpanded ? 'Detayları Gizle' : 'Tüm Detayları Gör'}
                        </button>

                        {app.status === 'PENDING' ? (
                          <>
                            <GoldButton onClick={() => handleAppAction(app.id, 'APPROVED')} className="text-xs py-1.5 px-3">
                              <CheckCircle2 className="size-3.5 mr-1" /> Onayla
                            </GoldButton>
                            <GhostButton onClick={() => handleAppAction(app.id, 'REJECTED')} className="text-xs py-1.5 px-3 text-destructive hover:bg-destructive/10">
                              <XCircle className="size-3.5 mr-1" /> Reddet
                            </GhostButton>
                          </>
                        ) : (
                          <Badge className={app.status === 'APPROVED' ? 'border-success/40 bg-success/10 text-success' : 'border-destructive/40 bg-destructive/10 text-destructive'}>
                            {app.status === 'APPROVED' ? 'Onaylandı' : 'Reddedildi'}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Genişletilmiş Detay Alanı */}
                    {isExpanded && (
                      <div className="border-t border-border/60 pt-4 mt-2 flex flex-col gap-3 text-xs text-muted-foreground bg-background/50 p-3 rounded-lg">
                        <div>
                          <strong className="text-gold block mb-1">Raid ve Oyun Tecrübesi:</strong>
                          <p className="text-foreground leading-relaxed">{app.experience}</p>
                        </div>
                        <div>
                          <strong className="text-gold block mb-1">Geçmiş Loncalar / Alternatif Karakterler:</strong>
                          <p className="text-foreground leading-relaxed">{app.previousGuilds}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </Panel>
      )}

      {/* SEKME 3: RAİD MÜSAİTLİK */}
      {activeTab === 'attendance' && (
        <Panel className="flex flex-col gap-4">
          <PanelTitle icon={Calendar}>Raid Günleri Ortak Müsaitlik Özeti</PanelTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-success/40 bg-success/10 flex flex-col gap-1">
              <span className="text-xs font-bold text-success uppercase">Çarşamba (MC / Ony)</span>
              <span className="text-2xl font-display font-black text-foreground">32 / 40 Müsait</span>
            </div>
            <div className="p-4 rounded-xl border border-success/40 bg-success/10 flex flex-col gap-1">
              <span className="text-xs font-bold text-success uppercase">Perşembe (BWL Progress)</span>
              <span className="text-2xl font-display font-black text-foreground">28 / 40 Müsait</span>
            </div>
            <div className="p-4 rounded-xl border border-gold/40 bg-gold/10 flex flex-col gap-1">
              <span className="text-xs font-bold text-gold uppercase">Pazar (Farm & Alt Run)</span>
              <span className="text-2xl font-display font-black text-foreground">35 / 40 Müsait</span>
            </div>
          </div>
        </Panel>
      )}
    </div>
  )
}