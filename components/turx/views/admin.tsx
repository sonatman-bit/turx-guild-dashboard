'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Shield,
  Users,
  FileText,
  Calendar,
  CheckCircle2,
  XCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Vote,
  Grid3x3,
  Radio,
  RefreshCw,
  Search,
  HeartPulse,
  Swords,
  Clock,
} from 'lucide-react'
import { authHeaders } from '@/lib/client-session'
import { CLASS_COLORS, type WowClass } from '@/lib/guild-data'
import { DEFAULT_RECRUITMENT_MATRIX, RECRUIT_NEEDS, type RecruitClassNeed, type RecruitNeed } from '@/lib/recruitment'
import { STAFF_ROLES, type StaffRoleId } from '@/lib/staff-roles'
import type { GuildRank } from '@/lib/turx-identity'
import { cn } from '@/lib/utils'
import { StaffRoleBadge } from '../staff-role-icons'
import { useToast } from '../toast'
import { Badge, GhostButton, GoldButton, Panel, PanelTitle, SectionHeader } from '../ui'

type DayKey = 'pzt' | 'sal' | 'crs' | 'per' | 'cum' | 'cmt' | 'paz'

interface DaySummaryDto {
  dayKey: DayKey
  label: string
  short: string
  raidName?: string | null
  availableCount: number
  maybeCount: number
  busyCount: number
  tanks: number
  healers: number
  dps: number
}

interface MemberAttendanceDto {
  username: string
  fullName: string
  guildRank: GuildRank
  mainCharName: string
  wowClass: WowClass
  spec: string
  role: 'TANK' | 'HEALER' | 'MELEE' | 'RANGED'
  hasConfigured: boolean
  availability: Record<DayKey, { status: 'available' | 'maybe' | 'busy' | 'none'; startTime: string; endTime: string }>
}

const RANK_STYLES: Record<GuildRank, string> = {
  'Guild Master': 'border-gold/60 bg-gold/15 text-gold',
  'Officer': 'border-neon/50 bg-neon/10 text-neon',
  'Raid Leader': 'border-azure/50 bg-azure/10 text-azure',
  'Raider': 'border-success/40 bg-success/10 text-success',
  'Member': 'border-border text-muted-foreground',
}

function RoleBadge({ role }: { role: 'TANK' | 'HEALER' | 'MELEE' | 'RANGED' }) {
  if (role === 'TANK') {
    return (
      <Badge className="border-azure/50 bg-azure/10 text-azure text-[11px] gap-1 inline-flex items-center">
        <Shield className="size-3" /> Tank
      </Badge>
    )
  }
  if (role === 'HEALER') {
    return (
      <Badge className="border-success/50 bg-success/10 text-success text-[11px] gap-1 inline-flex items-center">
        <HeartPulse className="size-3" /> Healer
      </Badge>
    )
  }
  return (
    <Badge className="border-gold/50 bg-gold/10 text-gold text-[11px] gap-1 inline-flex items-center">
      <Swords className="size-3" /> {role === 'RANGED' ? 'Ranged' : 'Melee'}
    </Badge>
  )
}

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
  const [activeTab, setActiveTab] = useState<'members' | 'applications' | 'recruitment' | 'staff' | 'poll' | 'attendance'>('members')
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null) // Detay açıp kapatmak için

  // 1. Üye Matrisi (Hesap/Profil tabanlı, ana karakter detaylı)
  const [members, setMembers] = useState<MemberItem[]>([])

  // 2. Başvuru Yönetimi (Detaylı görünüm - Sadece GM ve Officer burada tüm detayları görür)
  const [applications, setApplications] = useState<AdminApplication[]>([])
  const [pollResults, setPollResults] = useState<{
    question: string
    total: number
    options: { id: string; label: string; votes: number }[]
    ballots: { username: string; optionLabel: string; at: string }[]
  }>({ question: '', total: 0, options: [], ballots: [] })
  const [recruitMatrix, setRecruitMatrix] = useState<RecruitClassNeed[]>(DEFAULT_RECRUITMENT_MATRIX)
  const [savingNeed, setSavingNeed] = useState<string | null>(null)
  const [staffRoles, setStaffRoles] = useState<
    {
      id: StaffRoleId
      title: string
      slots: number
      applicantCount: number
      applicants: { username: string; email: string; mainName: string }[]
    }[]
  >([])

  // 3. Raid Müsaitlik Matrisi
  const [attendanceSummary, setAttendanceSummary] = useState<DaySummaryDto[]>([])
  const [attendanceMembers, setAttendanceMembers] = useState<MemberAttendanceDto[]>([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [attendanceSearch, setAttendanceSearch] = useState('')
  const [attendanceDayFilter, setAttendanceDayFilter] = useState<DayKey | 'all'>('all')
  const [attendanceRoleFilter, setAttendanceRoleFilter] = useState<string>('all')
  const [attendanceOnlyAvailable, setAttendanceOnlyAvailable] = useState(false)

  const loadAttendance = () => {
    setAttendanceLoading(true)
    fetch('/api/attendance', { credentials: 'same-origin', headers: authHeaders() })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          summary?: DaySummaryDto[]
          members?: MemberAttendanceDto[]
        }
        if (response.ok) {
          if (Array.isArray(data.summary)) setAttendanceSummary(data.summary)
          if (Array.isArray(data.members)) setAttendanceMembers(data.members)
        }
      })
      .catch(() => undefined)
      .finally(() => setAttendanceLoading(false))
  }

  useEffect(() => {
    fetch('/api/roster', { credentials: 'same-origin', headers: authHeaders() })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          members?: Array<{
            username: string
            role: GuildRank
            characters?: Array<{ firstName?: string; lastName?: string; wowClass?: WowClass; spec?: string; isMain?: boolean }>
          }>
        }
        if (response.ok && Array.isArray(data.members)) {
          const items: MemberItem[] = data.members.map((m) => {
            const chars = Array.isArray(m.characters) ? m.characters : []
            const mainChar = chars.find((c) => c.isMain) || chars[0]
            const charName = mainChar ? `${mainChar.firstName || ''} ${mainChar.lastName || ''}`.trim() : '—'
            return {
              id: m.username,
              accountName: m.username,
              mainCharacter: charName || '—',
              class: (mainChar?.wowClass || 'Warrior') as WowClass,
              spec: mainChar?.spec || '—',
              rank: m.role || 'Member',
              joinDate: 'Kayıtlı',
            }
          })
          setMembers(items)
        }
      })
      .catch(() => undefined)

    fetch('/api/applications')
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as { applications?: AdminApplication[] }
        if (response.ok) setApplications(data.applications || [])
      })
      .catch(() => undefined)

    fetch('/api/staff-interests', { credentials: 'same-origin', headers: authHeaders() })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as { roles?: typeof staffRoles }
        if (response.ok) setStaffRoles(data.roles || [])
      })
      .catch(() => undefined)

    fetch('/api/recruitment')
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as { matrix?: RecruitClassNeed[] }
        if (response.ok && Array.isArray(data.matrix) && data.matrix.length > 0) {
          setRecruitMatrix(data.matrix)
        }
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (activeTab !== 'poll') return
    fetch('/api/poll/results', { credentials: 'same-origin', headers: authHeaders() })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as Partial<typeof pollResults>
        if (response.ok) {
          setPollResults({
            question: data.question || '',
            total: data.total || 0,
            options: data.options || [],
            ballots: data.ballots || [],
          })
        }
      })
      .catch(() => undefined)
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'attendance') {
      loadAttendance()
    }
  }, [activeTab])

  const filteredAttendance = useMemo(() => {
    const q = attendanceSearch.trim().toLocaleLowerCase('tr-TR')
    return attendanceMembers.filter((m) => {
      const matchesQuery =
        !q ||
        m.username.toLocaleLowerCase('tr-TR').includes(q) ||
        m.fullName.toLocaleLowerCase('tr-TR').includes(q) ||
        m.mainCharName.toLocaleLowerCase('tr-TR').includes(q) ||
        m.wowClass.toLocaleLowerCase('tr-TR').includes(q) ||
        m.spec.toLocaleLowerCase('tr-TR').includes(q)

      const matchesRole = attendanceRoleFilter === 'all' || m.role === attendanceRoleFilter

      const matchesDay =
        attendanceDayFilter === 'all' ||
        m.availability[attendanceDayFilter]?.status === 'available' ||
        m.availability[attendanceDayFilter]?.status === 'maybe'

      const matchesOnlyAvailable =
        !attendanceOnlyAvailable ||
        (attendanceDayFilter !== 'all'
          ? m.availability[attendanceDayFilter]?.status === 'available'
          : Object.values(m.availability).some((d) => d.status === 'available'))

      return matchesQuery && matchesRole && matchesDay && matchesOnlyAvailable
    })
  }, [attendanceMembers, attendanceSearch, attendanceRoleFilter, attendanceDayFilter, attendanceOnlyAvailable])

  const handleRankChange = (memberId: string, memberAccount: string, currentRank: GuildRank, newRank: GuildRank) => {
    if (currentRank === 'Guild Master') {
      toast({
        title: '🔒 Güvenlik Koruması',
        description: 'Guild Master (GM) rütbesi değiştirilemez veya düşürülemez.',
      })
      return
    }

    if (newRank === 'Guild Master') {
      toast({
        title: '⛔ Yetki Reddedildi',
        description: 'Bu panel üzerinden yeni bir Guild Master ataması yapılamaz.',
      })
      return
    }

    const previous = members
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, rank: newRank } : m))

    fetch('/api/roster/rank', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: memberAccount, rank: newRank }),
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        if (!res.ok) {
          setMembers(previous)
          toast({ title: 'Rütbe Değiştirilemedi', description: data.error || 'İşlem başarısız oldu.' })
          return
        }
        toast({
          title: 'Rütbe Güncellendi',
          description: `${memberAccount} hesabının unvanı ${newRank} olarak kaydedildi.`,
        })
      })
      .catch(() => {
        setMembers(previous)
        toast({ title: 'Bağlantı Hatası', description: 'Sunucuya ulaşılamadı.' })
      })
  }

  const handleKickMember = (memberId: string, memberAccount: string, currentRank: GuildRank) => {
    if (currentRank === 'Guild Master') {
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

  const handleAppAction = async (appId: string, status: 'APPROVED' | 'REJECTED') => {
    const response = await fetch('/api/applications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: appId, status }),
    })
    if (!response.ok) {
      toast({ title: 'Güncellenemedi', description: 'Başvuru durumu kaydedilemedi.' })
      return
    }
    setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, status } : a)))
    toast({
      title: status === 'APPROVED' ? 'Başvuru Onaylandı' : 'Başvuru Reddedildi',
      description: `Başvuru durumu güncellendi.`,
    })
  }

  const handleRecruitNeedChange = async (wowClass: WowClass, spec: string, need: RecruitNeed) => {
    const key = `${wowClass}::${spec}`
    const previous = recruitMatrix
    setRecruitMatrix((rows) =>
      rows.map((row) =>
        row.wowClass === wowClass
          ? { ...row, specs: row.specs.map((item) => (item.spec === spec ? { ...item, need } : item)) }
          : row,
      ),
    )
    setSavingNeed(key)
    try {
      const response = await fetch('/api/recruitment', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ wowClass, spec, need }),
      })
      const data = (await response.json().catch(() => ({}))) as { matrix?: RecruitClassNeed[]; error?: string }
      if (!response.ok) {
        setRecruitMatrix(previous)
        toast({ title: 'Kaydedilemedi', description: data.error || 'İhtiyaç seviyesi güncellenemedi.' })
        return
      }
      if (Array.isArray(data.matrix)) setRecruitMatrix(data.matrix)
      toast({ title: 'İhtiyaç güncellendi', description: `${wowClass} ${spec}: ${need}` })
    } catch {
      setRecruitMatrix(previous)
      toast({ title: 'Kaydedilemedi', description: 'İhtiyaç seviyesi güncellenemedi.' })
    } finally {
      setSavingNeed(null)
    }
  }

  const [testingWebhook, setTestingWebhook] = useState(false)

  const handleTestWebhook = async () => {
    setTestingWebhook(true)
    try {
      const res = await fetch('/api/streams/test-webhook', {
        method: 'POST',
        credentials: 'same-origin',
        headers: authHeaders(),
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        message?: string
        error?: string
      }
      if (res.ok && data.ok) {
        toast({
          title: 'Discord Testi Başarılı! 🟢',
          description: data.message || 'Test bildirimi Discord kanalına ulaştı.',
        })
      } else {
        toast({
          title: 'Discord Webhook Hatası ⚠️',
          description: data.error || 'Webhook mesajı Discord tarafından kabul edilmedi.',
        })
      }
    } catch {
      toast({
        title: 'Bağlantı Hatası',
        description: 'Sunucuya ulaşılamadı.',
      })
    } finally {
      setTestingWebhook(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
      <SectionHeader
        eyebrow="Yetkili Yönetim Paneli"
        title="GM & Officer Kontrol Merkezi"
        description="Hesap bazlı rütbe yönetimi yapın ve detaylı guild başvuru bilgilerini denetleyin."
        action={
          <GoldButton onClick={handleTestWebhook} disabled={testingWebhook} className="text-xs py-1.5 px-3">
            <Radio className="size-3.5 mr-1" />
            {testingWebhook ? 'Test Ediliyor...' : '#canlıyayın Webhook Testi'}
          </GoldButton>
        }
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
          onClick={() => setActiveTab('recruitment')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition cursor-pointer border',
            activeTab === 'recruitment' ? 'border-gold bg-gold/15 text-gold shadow-md' : 'border-border bg-card text-muted-foreground hover:text-foreground'
          )}
        >
          <Grid3x3 className="size-4" /> Alım İhtiyacı
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition cursor-pointer border',
            activeTab === 'staff' ? 'border-gold bg-gold/15 text-gold shadow-md' : 'border-border bg-card text-muted-foreground hover:text-foreground'
          )}
        >
          <ClipboardList className="size-4" /> Görevli Talipleri
        </button>
        <button
          onClick={() => setActiveTab('poll')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition cursor-pointer border',
            activeTab === 'poll' ? 'border-gold bg-gold/15 text-gold shadow-md' : 'border-border bg-card text-muted-foreground hover:text-foreground'
          )}
        >
          <Vote className="size-4" /> Anket Sonuçları ({pollResults.total})
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition cursor-pointer border',
            activeTab === 'attendance' ? 'border-gold bg-gold/15 text-gold shadow-md' : 'border-border bg-card text-muted-foreground hover:text-foreground'
          )}
        >
          <Calendar className="size-4" /> Raid Müsaitlik Matrisi {attendanceMembers.length > 0 && `(${attendanceMembers.length})`}
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
                        disabled={member.rank === 'Guild Master'}
                        onChange={(e) => handleRankChange(member.id, member.accountName, member.rank, e.target.value as GuildRank)}
                        className={cn(
                          'border rounded-lg px-2 py-1 text-xs font-semibold',
                          member.rank === 'Guild Master' 
                            ? 'bg-gold/10 border-gold/40 text-gold cursor-not-allowed opacity-90' 
                            : 'bg-background border-border text-gold cursor-pointer'
                        )}
                      >
                        <option value="Guild Master">Guild Master (GM)</option>
                        <option value="Officer">Officer</option>
                        <option value="Raid Leader">Raid Leader</option>
                        <option value="Raider">Raider</option>
                        <option value="Member">Member</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground font-mono">{member.joinDate}</td>
                    <td className="py-3 px-4 text-right">
                      {member.rank !== 'Guild Master' && (
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
                {members.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                      Kayıtlı üye bulunamadı.
                    </td>
                  </tr>
                )}
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

      {activeTab === 'recruitment' && (
        <Panel className="flex flex-col gap-4">
          <PanelTitle icon={Grid3x3}>Alım İhtiyacı</PanelTitle>
          <p className="text-xs text-muted-foreground">
            Seçtiğin seviye anında kaydedilir ve Guild Başvuru sayfasındaki Class / Spec matrisine yansır.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {recruitMatrix.map((row) => (
              <div
                key={row.wowClass}
                className="rounded-lg border border-border bg-background/50 p-4"
                style={{ borderTopColor: CLASS_COLORS[row.wowClass], borderTopWidth: 3 }}
              >
                <p className="font-display font-bold" style={{ color: CLASS_COLORS[row.wowClass] }}>
                  {row.wowClass}
                </p>
                <ul className="mt-3 flex flex-col gap-2">
                  {row.specs.map((item) => {
                    const key = `${row.wowClass}::${item.spec}`
                    return (
                      <li key={item.spec} className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-silver">{item.spec}</span>
                        <select
                          value={item.need}
                          disabled={savingNeed === key}
                          onChange={(e) => void handleRecruitNeedChange(row.wowClass, item.spec, e.target.value as RecruitNeed)}
                          className="rounded-md border border-border bg-card px-2 py-1 text-xs font-semibold text-foreground cursor-pointer"
                        >
                          {RECRUIT_NEEDS.map((need) => (
                            <option key={need} value={need}>
                              {need}
                            </option>
                          ))}
                        </select>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {activeTab === 'poll' && (
        <Panel className="flex flex-col gap-4">
          <PanelTitle icon={Vote}>Anket Sonuçları</PanelTitle>
          <p className="text-sm font-semibold text-foreground">{pollResults.question || 'Aktif anket'}</p>
          <p className="text-xs text-muted-foreground">Toplam {pollResults.total} oy. Her hesap yalnızca bir kez oy verebilir.</p>
          <ul className="flex flex-col gap-2">
            {pollResults.options.map((option) => {
              const percent = pollResults.total === 0 ? 0 : Math.round((option.votes / pollResults.total) * 100)
              return (
                <li key={option.id} className="flex items-center gap-3 text-sm">
                  <span className="w-48 shrink-0 font-medium">{option.label}</span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-neon" style={{ width: `${percent}%` }} />
                  </span>
                  <span className="w-20 shrink-0 text-right tabular-nums text-silver">
                    {option.votes} · %{percent}
                  </span>
                </li>
              )
            })}
          </ul>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Kimin ne oy verdiği</caption>
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-3 py-2">Kullanıcı</th>
                  <th className="px-3 py-2">Oy</th>
                  <th className="px-3 py-2">Zaman</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pollResults.ballots.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                      Henüz oy yok.
                    </td>
                  </tr>
                ) : (
                  pollResults.ballots.map((ballot) => (
                    <tr key={`${ballot.username}-${ballot.at}`}>
                      <td className="px-3 py-2 font-semibold text-silver">{ballot.username}</td>
                      <td className="px-3 py-2">{ballot.optionLabel}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {new Date(ballot.at).toLocaleString('tr-TR')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {activeTab === 'staff' && (
        <Panel className="flex flex-col gap-4">
          <PanelTitle icon={ClipboardList}>Görevli Talep Özeti</PanelTitle>
          <p className="text-xs text-muted-foreground">
            Üyelerin profilinden işaretlediği görevler. Kontenjan, açık ilan sayısıdır; talip sayısı bundan fazla olabilir.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Görevlere talip olan üyeler</caption>
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-3 py-2">Görev</th>
                  <th className="px-3 py-2">Kontenjan</th>
                  <th className="px-3 py-2">Talip</th>
                  <th className="px-3 py-2">Adaylar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(staffRoles.length > 0 ? staffRoles : STAFF_ROLES.map((role) => ({
                  id: role.id,
                  title: role.title,
                  slots: role.slots,
                  applicantCount: 0,
                  applicants: [] as { username: string; email: string; mainName: string }[],
                }))).map((role) => (
                  <tr key={role.id}>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-2 font-semibold">
                        <StaffRoleBadge id={role.id} />
                        {role.title}
                      </span>
                    </td>
                    <td className="px-3 py-3 tabular-nums text-gold">{role.slots}</td>
                    <td className="px-3 py-3 tabular-nums">{role.applicantCount}</td>
                    <td className="px-3 py-3 text-xs text-silver">
                      {role.applicants.length === 0
                        ? 'Henüz talip yok'
                        : role.applicants.map((person) => `${person.username} (${person.mainName})`).join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* SEKME 6: RAİD MÜSAİTLİK MATRİSİ */}
      {activeTab === 'attendance' && (
        <div className="flex flex-col gap-6">
          <Panel className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <PanelTitle icon={Calendar}>
                  Haftalık Raid Müsaitlik & Katılım Matrisi
                </PanelTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Üyelerin profil sekmesinden kaydettiği gün ve saat müsaitlikleri. Canlı raid kadrosu planlama verileri.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono">Toplam: {attendanceMembers.length} Oyuncu</span>
                <GoldButton onClick={loadAttendance} disabled={attendanceLoading} className="text-xs py-1.5 px-3">
                  <RefreshCw className={cn("size-3.5 mr-1", attendanceLoading && "animate-spin")} />
                  {attendanceLoading ? 'Yenileniyor...' : 'Verileri Yenile'}
                </GoldButton>
              </div>
            </div>

            {/* 7 Günlük Özet Kartları */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {attendanceSummary.map((day) => {
                const total = attendanceMembers.length || 1
                const percent = Math.round((day.availableCount / total) * 100)
                const isSelected = attendanceDayFilter === day.dayKey
                const isRaidDay = Boolean(day.raidName)

                return (
                  <button
                    key={day.dayKey}
                    type="button"
                    onClick={() => setAttendanceDayFilter(isSelected ? 'all' : day.dayKey)}
                    className={cn(
                      'flex flex-col gap-2 rounded-xl border p-3 text-left transition-all cursor-pointer relative shadow-sm',
                      isSelected
                        ? 'border-gold bg-gold/15 shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                        : isRaidDay
                        ? 'border-border/80 bg-[#071422] hover:border-gold/50'
                        : 'border-border/60 bg-background/50 hover:border-border'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-silver uppercase">{day.label}</span>
                      {isRaidDay && (
                        <span className="size-2 rounded-full bg-gold shadow-[0_0_6px_#d4af37]" title={day.raidName || 'Raid Günü'} />
                      )}
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="font-display text-2xl font-black text-foreground tabular-nums">
                        {day.availableCount}
                      </span>
                      <span className="text-xs text-muted-foreground">/ {attendanceMembers.length} Müsait</span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full transition-all", percent >= 50 ? "bg-success" : percent >= 25 ? "bg-gold" : "bg-muted-foreground/50")}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    {/* Role breakdown */}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                      <span className="text-azure flex items-center gap-0.5" title="Müsait Tank">
                        <Shield className="size-3" /> {day.tanks}
                      </span>
                      <span className="text-success flex items-center gap-0.5" title="Müsait Healer">
                        <HeartPulse className="size-3" /> {day.healers}
                      </span>
                      <span className="text-gold flex items-center gap-0.5" title="Müsait DPS">
                        <Swords className="size-3" /> {day.dps}
                      </span>
                      {day.maybeCount > 0 && (
                        <span className="text-muted-foreground" title="Belki">
                          +{day.maybeCount}?
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </Panel>

          {/* Filtre ve Arama Alanı */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card/60 p-3 rounded-xl border border-border">
            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={attendanceSearch}
                onChange={(e) => setAttendanceSearch(e.target.value)}
                placeholder="Karakter adı, oyuncu veya sınıf ara..."
                className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold/60"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <select
                value={attendanceDayFilter}
                onChange={(e) => setAttendanceDayFilter(e.target.value as DayKey | 'all')}
                className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-silver"
              >
                <option value="all">Tüm Günler</option>
                <option value="pzt">Pazartesi</option>
                <option value="sal">Salı</option>
                <option value="crs">Çarşamba</option>
                <option value="per">Perşembe</option>
                <option value="cum">Cuma</option>
                <option value="cmt">Cumartesi</option>
                <option value="paz">Pazar</option>
              </select>

              <select
                value={attendanceRoleFilter}
                onChange={(e) => setAttendanceRoleFilter(e.target.value)}
                className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-silver"
              >
                <option value="all">Tüm Roller</option>
                <option value="TANK">Tank</option>
                <option value="HEALER">Healer</option>
                <option value="MELEE">Melee DPS</option>
                <option value="RANGED">Ranged DPS</option>
              </select>

              <button
                type="button"
                onClick={() => setAttendanceOnlyAvailable(!attendanceOnlyAvailable)}
                className={cn(
                  "px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer",
                  attendanceOnlyAvailable ? "border-success bg-success/15 text-success" : "border-border bg-background text-muted-foreground hover:text-foreground"
                )}
              >
                {attendanceOnlyAvailable ? "✓ Sadece Müsait Olanlar" : "Tüm Durumlar"}
              </button>
            </div>
          </div>

          {/* Matris Tablosu */}
          <Panel className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-4 min-w-[180px]">Oyuncu & Karakter</th>
                    <th className="py-3 px-3 min-w-[120px]">Rol & Sınıf</th>
                    <th className="py-3 px-2 text-center min-w-[90px]">PZT</th>
                    <th className="py-3 px-2 text-center min-w-[90px]">SAL</th>
                    <th className="py-3 px-2 text-center min-w-[90px] bg-gold/5 text-gold">ÇAR</th>
                    <th className="py-3 px-2 text-center min-w-[90px] bg-gold/5 text-gold">PER</th>
                    <th className="py-3 px-2 text-center min-w-[90px]">CUM</th>
                    <th className="py-3 px-2 text-center min-w-[90px]">CMT</th>
                    <th className="py-3 px-2 text-center min-w-[90px] bg-gold/5 text-gold">PAZ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-sm">
                  {filteredAttendance.map((m) => {
                    const days: DayKey[] = ['pzt', 'sal', 'crs', 'per', 'cum', 'cmt', 'paz']
                    return (
                      <tr key={m.username} className="hover:bg-muted/20 transition">
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground" style={{ color: CLASS_COLORS[m.wowClass] }}>
                              {m.mainCharName !== '—' ? m.mainCharName : m.username}
                            </span>
                            <span className="text-xs text-silver/80">
                              {m.fullName} <span className="text-muted-foreground font-mono">(@{m.username})</span>
                            </span>
                            <div className="mt-1">
                              <Badge className={cn("text-[10px] py-0 px-1.5", RANK_STYLES[m.guildRank])}>
                                {m.guildRank}
                              </Badge>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-1">
                            <RoleBadge role={m.role} />
                            <span className="text-xs text-muted-foreground">{m.wowClass} ({m.spec})</span>
                          </div>
                        </td>

                        {days.map((dayKey) => {
                          const d = m.availability[dayKey] || { status: 'none', startTime: '21:00', endTime: '00:00' }
                          return (
                            <td key={dayKey} className="py-2 px-1.5 text-center">
                              {d.status === 'available' ? (
                                <div className="flex flex-col items-center justify-center p-1.5 rounded-lg border border-success/50 bg-success/15 text-success">
                                  <span className="text-[11px] font-bold">Müsait</span>
                                  <span className="text-[10px] text-silver font-mono">{d.startTime}-{d.endTime}</span>
                                </div>
                              ) : d.status === 'maybe' ? (
                                <div className="flex flex-col items-center justify-center p-1.5 rounded-lg border border-gold/50 bg-gold/15 text-gold">
                                  <span className="text-[11px] font-bold">Belki</span>
                                  <span className="text-[10px] text-silver font-mono">{d.startTime}-{d.endTime}</span>
                                </div>
                              ) : d.status === 'busy' ? (
                                <div className="flex flex-col items-center justify-center p-1.5 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive/70">
                                  <span className="text-[10px]">Meşgul</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center p-1.5 rounded-lg border border-border/30 bg-muted/5 text-muted-foreground/40">
                                  <span className="text-xs">—</span>
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                  {filteredAttendance.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-muted-foreground text-xs">
                        {attendanceMembers.length === 0
                          ? 'Henüz profilinde müsaitlik kaydeden üye bulunmuyor.'
                          : 'Arama ve filtre kriterlerinize uyan kayıt bulunamadı.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
              <span>{filteredAttendance.length} / {attendanceMembers.length} oyuncu listeleniyor.</span>
              <span className="text-silver/80">Saat dilimi: UTC+3 (Türkiye Saati)</span>
            </div>
          </Panel>
        </div>
      )}
    </div>
  )
}