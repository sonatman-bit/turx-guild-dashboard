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
  Download,
  Upload,
  Mail,
  Send,
  Eye,
  CheckCheck,
  Paperclip,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Loader2,
  Edit3,
} from 'lucide-react'
import { useAuth } from '../auth-provider'
import { GmMemberProfileModal } from '../gm-member-profile-modal'
import { WowArmoryLogo } from '../wow-armory-badge'
import { authHeaders } from '@/lib/client-session'
import { CLASS_COLORS, type WowClass } from '@/lib/guild-data'
import { DEFAULT_RECRUITMENT_MATRIX, RECRUIT_NEEDS, type RecruitClassNeed, type RecruitNeed } from '@/lib/recruitment'
import { STAFF_ROLES, type StaffRoleId } from '@/lib/staff-roles'
import type { GuildRank } from '@/lib/turx-identity'
import { cn } from '@/lib/utils'
import { StaffRoleBadge } from '../staff-role-icons'
import { useToast } from '../toast'
import { Badge, GhostButton, GoldButton, Modal, Panel, PanelTitle, SectionHeader, inputClass } from '../ui'

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
  skipRaidsForNow?: boolean
  availability: Record<DayKey, { status: 'available' | 'maybe' | 'busy'; startTime: string; endTime: string }>
}

interface ArmoryAuditRow {
  username: string
  email: string
  role: string
  isProtectedGm: boolean
  mainCharName: string
  armoryUrl: string | null
  status: string
  guildName: string | null
  level: number | null
  inTurxGuild: boolean
  matchedCharName: string | null
  message: string
}

interface ArmoryAuditReport {
  checkedAt: string
  summary: {
    total: number
    verifiedTurx: number
    nonTurxRemovable: number
    armoryUnavailable: number
    protectedGm: number
  }
  users: ArmoryAuditRow[]
}

const RANK_STYLES: Record<string, string> = {
  'Guild Master': 'border-gold/60 bg-gold/15 text-gold',
  'Görevli': 'border-neon/50 bg-neon/10 text-neon',
  'Turx': 'border-azure/50 bg-azure/10 text-azure',
  'Alt': 'border-purple-500/40 bg-purple-500/10 text-purple-300',
  'Sosyal': 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
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

interface AdminMessageDto {
  id: string
  title: string
  content: string
  category: string
  icon?: string
  senderUsername: string
  senderRole: string
  targetType: 'ALL' | 'RANK' | 'USER'
  targetRank?: string
  targetUsername?: string
  imageUrl?: string
  attachments?: Array<{ name: string; url: string; type: 'image' | 'file' }>
  createdAt: string
  totalTargetCount: number
  readCount: number
  unreadCount: number
  readPercentage: number
  readUsers: Array<{ username: string; email: string; role: string; readAt: string }>
  unreadUsers: Array<{ username: string; email: string; role: string }>
}

export function AdminDashboardView() {
  const { user } = useAuth()
  const isGm = user?.role === 'Guild Master'
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<'members' | 'applications' | 'recruitment' | 'staff' | 'poll' | 'attendance' | 'messages'>('members')
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null) // Detay açıp kapatmak için

  // 4. Lonca Mesaj & Bildirim Merkezi
  const [adminMessages, setAdminMessages] = useState<AdminMessageDto[]>([])
  const [adminMessagesLoading, setAdminMessagesLoading] = useState(false)
  const [selectedReportMessage, setSelectedReportMessage] = useState<AdminMessageDto | null>(null)

  // Mesaj gönderme formu
  const [msgTargetType, setMsgTargetType] = useState<'ALL' | 'RANK' | 'USER'>('ALL')
  const [msgTargetRank, setMsgTargetRank] = useState<string>('Görevli')
  const [msgTargetUser, setMsgTargetUser] = useState<string>('')
  const [msgCategory, setMsgCategory] = useState<string>('DUYURU')
  const [msgIcon, setMsgIcon] = useState<string>('📢')
  const [msgTitle, setMsgTitle] = useState('')
  const [msgContent, setMsgContent] = useState('')
  const [msgImageUrl, setMsgImageUrl] = useState('')
  const [msgAttachmentName, setMsgAttachmentName] = useState('')
  const [msgAttachmentUrl, setMsgAttachmentUrl] = useState('')
  const [msgSendEmail, setMsgSendEmail] = useState(true)
  const [msgSending, setMsgSending] = useState(false)

  // 1. Üye Matrisi (Hesap/Profil tabanlı, ana karakter detaylı)
  const [members, setMembers] = useState<MemberItem[]>([])
  const [editingMemberUsername, setEditingMemberUsername] = useState<string | null>(null)
  const [armoryAudit, setArmoryAudit] = useState<ArmoryAuditReport | null>(null)
  const [armoryAuditLoading, setArmoryAuditLoading] = useState(false)
  const [armoryPruneBusy, setArmoryPruneBusy] = useState(false)
  const [armorySendEmails, setArmorySendEmails] = useState(true)

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

    loadAttendance()
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

  const handleKickMember = async (memberId: string, memberAccount: string, currentRank: GuildRank) => {
    if (currentRank === 'Guild Master') {
      toast({
        variant: 'error',
        title: '🔒 Güvenlik Koruması',
        description: 'Guild Master (GM) loncadan çıkarılamaz!',
      })
      return
    }

    if (!confirm(`"${memberAccount}" kullanıcısını kullanıcı listesinden kalıcı olarak silmek istediğinize emin misiniz?`)) {
      return
    }

    const previous = members
    setMembers((prev) => prev.filter((m) => m.id !== memberId))

    try {
      const res = await fetch('/api/admin/armory-audit', {
        method: 'POST',
        credentials: 'same-origin',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ action: 'kick_user', username: memberAccount }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setMembers(previous)
        toast({
          variant: 'error',
          title: 'Silinemedi',
          description: data.error || 'Kullanıcı silinirken bir hata oluştu.',
        })
        return
      }
      setArmoryAudit((prev) =>
        prev
          ? {
              ...prev,
              users: prev.users.filter((u) => u.username.toLowerCase() !== memberAccount.toLowerCase()),
            }
          : null,
      )
      toast({
        title: 'Hesap Loncadan Çıkarıldı',
        description: `${memberAccount} hesabı kullanıcı listesinden kalıcı olarak silindi.`,
      })
    } catch {
      setMembers(previous)
      toast({ variant: 'error', title: 'Bağlantı Hatası', description: 'Sunucuya ulaşılamadı.' })
    }
  }

  const handleRunArmoryAudit = async () => {
    setArmoryAuditLoading(true)
    try {
      const res = await fetch('/api/admin/armory-audit', {
        credentials: 'same-origin',
        headers: authHeaders(),
        cache: 'no-store',
      })
      const data = (await res.json().catch(() => ({}))) as Partial<ArmoryAuditReport> & { error?: string }
      if (!res.ok || !data.users || !data.summary) {
        toast({
          variant: 'error',
          title: 'WoW Armory Taraması Başarısız',
          description: data.error || 'Kullanıcılar kontrol edilemedi.',
        })
        return
      }
      setArmoryAudit({
        checkedAt: data.checkedAt || new Date().toISOString(),
        summary: data.summary,
        users: data.users,
      })
      toast({
        title: 'WoW Armory Taraması Tamamlandı',
        description: `${data.summary.verifiedTurx} TURX onaylı · ${data.summary.nonTurxRemovable} TURX dışı kullanıcı bulundu.`,
      })
    } catch {
      toast({ variant: 'error', title: 'Bağlantı Hatası', description: 'Armory denetimi tamamlanamadı.' })
    } finally {
      setArmoryAuditLoading(false)
    }
  }

  const handlePruneNonTurx = async () => {
    const removableCount = armoryAudit?.summary.nonTurxRemovable
    const msg =
      typeof removableCount === 'number'
        ? `WoW Forever Armory (EU) kontrolünde TURX guild listesinde görünmeyen ${removableCount} kullanıcı kalıcı olarak silinecek ve çıkarılacak. Onaylıyor musunuz?`
        : 'Tüm aktif kullanıcılar WoW Forever Armory üzerinden kontrol edilecek ve TURX guild listesinde görünmeyenler kullanıcı listesinden kalıcı olarak silinecek. Devam edilsin mi?'
    if (!confirm(msg)) return

    setArmoryPruneBusy(true)
    try {
      const res = await fetch('/api/admin/armory-audit', {
        method: 'POST',
        credentials: 'same-origin',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ action: 'prune_non_turx', sendEmails: armorySendEmails }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        removedCount?: number
        removedUsers?: ArmoryAuditRow[]
        keptCount?: number
        skippedUnavailableCount?: number
        emailsSentCount?: number
        auditRows?: ArmoryAuditRow[]
        checkedAt?: string
        error?: string
      }
      if (!res.ok || !data.ok) {
        toast({
          variant: 'error',
          title: 'Temizlik Başarısız',
          description: data.error || 'TURX dışı kullanıcılar silinemedi.',
        })
        return
      }

      const removedSet = new Set((data.removedUsers || []).map((u) => u.username.toLowerCase()))
      setMembers((prev) => prev.filter((m) => !removedSet.has(m.accountName.toLowerCase())))
      if (Array.isArray(data.auditRows)) {
        const rows = data.auditRows
        setArmoryAudit({
          checkedAt: data.checkedAt || new Date().toISOString(),
          summary: {
            total: rows.length,
            verifiedTurx: rows.filter((r) => r.inTurxGuild).length,
            nonTurxRemovable: rows.filter((r) => !r.inTurxGuild && !r.isProtectedGm && r.status !== 'armory_unavailable').length,
            armoryUnavailable: rows.filter((r) => r.status === 'armory_unavailable').length,
            protectedGm: rows.filter((r) => r.isProtectedGm).length,
          },
          users: rows,
        })
      }
      toast({
        title: 'WoW Armory Temizliği Tamamlandı! 🛡️',
        description: `${data.removedCount ?? 0} TURX dışı kullanıcı silindi${data.emailsSentCount ? ` · ${data.emailsSentCount} bilgilendirme e-postası gönderildi` : ''}. ${data.keptCount ?? 0} onaylı üye kaldı.`,
      })
    } catch {
      toast({ variant: 'error', title: 'Bağlantı Hatası', description: 'Sunucuya ulaşılamadı.' })
    } finally {
      setArmoryPruneBusy(false)
    }
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
  const [backupBusy, setBackupBusy] = useState(false)

  // Otomatik tarayıcı yedeği: Guild Master paneli her açtığında güncel veritabanını kendi tarayıcı hafızasına yedekler
  useEffect(() => {
    if (!isGm) return
    fetch('/api/admin/backup', { credentials: 'same-origin', headers: authHeaders() })
      .then(async (res) => {
        if (!res.ok) return
        const text = await res.text()
        if (text && text.length > 50) {
          localStorage.setItem('turx_gm_auto_backup', text)
          localStorage.setItem('turx_gm_auto_backup_at', new Date().toISOString())
        }
      })
      .catch(() => undefined)
  }, [isGm])

  const handleDownloadBackup = async () => {
    setBackupBusy(true)
    try {
      const res = await fetch('/api/admin/backup', {
        credentials: 'same-origin',
        headers: authHeaders(),
      })
      if (!res.ok) {
        toast({ title: 'Yedek İndirilemedi ⚠️', description: 'Yetki veya sunucu hatası oluştu.' })
        return
      }
      const text = await res.text()
      localStorage.setItem('turx_gm_auto_backup', text)
      localStorage.setItem('turx_gm_auto_backup_at', new Date().toISOString())
      const blob = new Blob([text], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `turx-guild-store-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast({ title: 'Yedek İndirildi 💾', description: 'Veritabanı yedeği bilgisayarınıza kaydedildi.' })
    } catch {
      toast({ title: 'Hata', description: 'Yedek indirilirken bağlantı hatası oluştu.' })
    } finally {
      setBackupBusy(false)
    }
  }

  const handleRestoreBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBackupBusy(true)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        credentials: 'same-origin',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(parsed),
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        users?: number
        applications?: number
        error?: string
      }
      if (res.ok && data.ok) {
        toast({
          title: 'Yedek Başarıyla Yüklendi! ✅',
          description: `Toplam ${data.users ?? 0} üye ve ${data.applications ?? 0} başvuru birleştirildi.`,
        })
        window.location.reload()
      } else {
        toast({
          title: 'Geri Yükleme Hatası ⚠️',
          description: data.error || 'Yedek dosyası işlenemedi.',
        })
      }
    } catch {
      toast({ title: 'Geçersiz Dosya', description: 'Seçilen dosya geçerli bir JSON yedeği değil.' })
    } finally {
      setBackupBusy(false)
    }
  }

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

  const loadAdminMessages = () => {
    setAdminMessagesLoading(true)
    fetch('/api/admin/messages', { credentials: 'same-origin', headers: authHeaders() })
      .then(async (res) => {
        if (!res.ok) return
        const data = (await res.json().catch(() => ({}))) as { messages?: AdminMessageDto[] }
        if (Array.isArray(data.messages)) {
          setAdminMessages(data.messages)
        }
      })
      .catch(() => undefined)
      .finally(() => setAdminMessagesLoading(false))
  }

  useEffect(() => {
    if (activeTab === 'messages') {
      loadAdminMessages()
    }
  }, [activeTab])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!msgTitle.trim()) {
      toast({ title: 'Başlık Gerekli', description: 'Lütfen mesaj başlığını yazın.' })
      return
    }
    if (!msgContent.trim()) {
      toast({ title: 'İçerik Gerekli', description: 'Lütfen mesaj metnini yazın.' })
      return
    }

    setMsgSending(true)
    try {
      const attachments =
        msgAttachmentName.trim() && msgAttachmentUrl.trim()
          ? [{ name: msgAttachmentName.trim(), url: msgAttachmentUrl.trim(), type: 'file' as const }]
          : []

      const res = await fetch('/api/messages', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: msgTitle.trim(),
          content: msgContent.trim(),
          category: msgCategory,
          icon: msgIcon,
          targetType: msgTargetType,
          targetRank: msgTargetType === 'RANK' ? msgTargetRank : undefined,
          targetUsername: msgTargetType === 'USER' ? msgTargetUser : undefined,
          imageUrl: msgImageUrl.trim() || undefined,
          attachments,
          sendEmail: msgSendEmail,
        }),
      })

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        emailSentCount?: number
        error?: string
      }
      if (!res.ok) {
        toast({ title: 'Mesaj Gönderilemedi', description: data.error || 'Bir hata oluştu.' })
        return
      }

      toast({
        title: 'Mesaj Başarıyla Yayınlandı! 📢',
        description: data.emailSentCount
          ? `${data.emailSentCount} üyeye e-posta bildirimi iletildi.`
          : 'Mesaj panoda görüntülenebilir.',
      })

      // Formu sıfırla
      setMsgTitle('')
      setMsgContent('')
      setMsgImageUrl('')
      setMsgAttachmentName('')
      setMsgAttachmentUrl('')
      loadAdminMessages()
      window.dispatchEvent(new CustomEvent('turx:messages-updated'))
    } catch {
      toast({ title: 'Bağlantı Hatası', description: 'Mesaj sunucuya kaydedilemedi.' })
    } finally {
      setMsgSending(false)
    }
  }

  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm('Bu mesajı silmek istediğinize emin misiniz?')) return
    try {
      const res = await fetch(`/api/admin/messages?id=${encodeURIComponent(msgId)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: authHeaders(),
      })
      if (!res.ok) {
        toast({ title: 'Silinemedi', description: 'Mesaj silinirken hata oluştu.' })
        return
      }
      setAdminMessages((prev) => prev.filter((m) => m.id !== msgId))
      if (selectedReportMessage?.id === msgId) setSelectedReportMessage(null)
      toast({ title: 'Mesaj Silindi', description: 'Yayınlanan bildirim kaldırıldı.' })
      window.dispatchEvent(new CustomEvent('turx:messages-updated'))
    } catch {
      toast({ title: 'Bağlantı Hatası', description: 'Mesaj silinemedi.' })
    }
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
      <SectionHeader
        eyebrow="Yetkili Yönetim Paneli"
        title="GM & Görevli Kontrol Merkezi"
        description="Hesap bazlı rütbe yönetimi yapın ve detaylı guild başvuru bilgilerini denetleyin."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {isGm && (
              <>
                <GhostButton onClick={handleDownloadBackup} disabled={backupBusy} className="text-xs py-1.5 px-3">
                  <Download className="size-3.5 mr-1" />
                  Yedeği İndir (.json)
                </GhostButton>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-secondary/60 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-gold/50 hover:text-gold">
                  <Upload className="size-3.5" />
                  Yedek Yükle
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={handleRestoreBackupFile}
                    disabled={backupBusy}
                    className="hidden"
                  />
                </label>
              </>
            )}
            <GoldButton onClick={handleTestWebhook} disabled={testingWebhook} className="text-xs py-1.5 px-3">
              <Radio className="size-3.5 mr-1" />
              {testingWebhook ? 'Test Ediliyor...' : '#canlıyayın Webhook Testi'}
            </GoldButton>
          </div>
        }
      />

      <div className="flex items-center gap-3 p-4 rounded-xl border border-gold/40 bg-gold/10 text-gold">
        <Shield className="size-6 shrink-0" />
        <div className="text-xs leading-relaxed">
          <strong>Güvenlik Notu:</strong> Bu panel yalnızca <strong>Guild Master</strong> ve <strong>Görevli</strong> rütbesine sahip yetkililer tarafından görüntülenebilir. Yetkiler site hesaplarına (profil isimlerine) verilmiştir.
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
        <button
          onClick={() => setActiveTab('messages')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition cursor-pointer border',
            activeTab === 'messages' ? 'border-gold bg-gold/15 text-gold shadow-md' : 'border-border bg-card text-muted-foreground hover:text-foreground'
          )}
        >
          <Mail className="size-4" /> Lonca Mesaj & Bildirim {adminMessages.length > 0 && `(${adminMessages.length})`}
        </button>
      </div>

      {/* SEKME 1: ÜYE & RÜTBE YÖNETİMİ (Hesap ve Ana Karakter Odaklı) */}
      {activeTab === 'members' && (
        <div className="flex flex-col gap-6">
          {/* WoW Forever Armory (TURX) Üye Kontrol & Temizlik Paneli */}
          <Panel className="flex flex-col gap-4 border-neon/35 bg-gradient-to-br from-[#0b1f34] via-card to-card">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <WowArmoryLogo />
                <div>
                  <h3 className="font-display text-base font-bold text-gold">
                    WoW Forever Armory — TURX Guild Kontrolü & Temizlik
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Tüm aktif kullanıcıların karakterlerini WoW Forever Armory (EU) üzerinden denetler ve TURX guild
                    listesinde görünmeyen kullanıcıları listeden kalıcı olarak siler.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-silver mr-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={armorySendEmails}
                    onChange={(e) => setArmorySendEmails(e.target.checked)}
                    className="accent-[#d4af37]"
                  />
                  Silinenlere rehber maili at
                </label>
                <GhostButton
                  type="button"
                  onClick={() => void handleRunArmoryAudit()}
                  disabled={armoryAuditLoading || armoryPruneBusy}
                  className="text-xs py-1.5 px-3 cursor-pointer"
                >
                  {armoryAuditLoading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="size-3.5" />
                  )}
                  {armoryAuditLoading ? 'Armory Taranıyor...' : "Tüm Üyeleri Armory'den Tara"}
                </GhostButton>
                <GoldButton
                  type="button"
                  onClick={() => void handlePruneNonTurx()}
                  disabled={armoryAuditLoading || armoryPruneBusy}
                  className="text-xs py-1.5 px-3 cursor-pointer"
                >
                  {armoryPruneBusy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                  {armoryPruneBusy
                    ? 'Temizleniyor...'
                    : `TURX Dışındakileri Sil ve Çıkar${armoryAudit ? ` (${armoryAudit.summary.nonTurxRemovable})` : ''}`}
                </GoldButton>
              </div>
            </div>

            {armoryAudit && (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="rounded-lg border border-border bg-background/60 p-2.5">
                    <span className="text-muted-foreground block">Taranan Hesap</span>
                    <strong className="font-display text-lg text-foreground tabular-nums">{armoryAudit.summary.total}</strong>
                  </div>
                  <div className="rounded-lg border border-success/40 bg-success/10 p-2.5">
                    <span className="text-emerald-200 block">TURX Onaylı</span>
                    <strong className="font-display text-lg text-success tabular-nums">{armoryAudit.summary.verifiedTurx}</strong>
                  </div>
                  <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-2.5">
                    <span className="text-red-200 block">TURX Dışı (Çıkarılacak)</span>
                    <strong className="font-display text-lg text-red-400 tabular-nums">{armoryAudit.summary.nonTurxRemovable}</strong>
                  </div>
                  <div className="rounded-lg border border-gold/40 bg-gold/10 p-2.5">
                    <span className="text-gold/90 block">Armory Erişilemeyen</span>
                    <strong className="font-display text-lg text-gold tabular-nums">{armoryAudit.summary.armoryUnavailable}</strong>
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto rounded-xl border border-border bg-background/50">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-card border-b border-border text-[11px] uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">Hesap</th>
                        <th className="px-3 py-2">Main Karakter</th>
                        <th className="px-3 py-2">Armory Guild</th>
                        <th className="px-3 py-2">Durum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {armoryAudit.users.map((row) => (
                        <tr key={row.username} className={cn(!row.inTurxGuild && !row.isProtectedGm && 'bg-red-500/[0.05]')}>
                          <td className="px-3 py-2 font-semibold text-silver">{row.username}</td>
                          <td className="px-3 py-2">
                            {row.armoryUrl ? (
                              <a
                                href={row.armoryUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-neon hover:underline inline-flex items-center gap-1"
                              >
                                {row.mainCharName}
                                {row.level ? ` (Lv ${row.level})` : ''}
                                <ExternalLink className="size-3" />
                              </a>
                            ) : (
                              <span className="text-muted-foreground">{row.mainCharName}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-mono">
                            {row.guildName ? (
                              <span className={row.inTurxGuild ? 'text-success font-bold' : 'text-red-300'}>
                                &lt;{row.guildName}&gt;
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {row.inTurxGuild ? (
                              <Badge className="border-success/50 bg-success/15 text-success text-[10px]">
                                <ShieldCheck className="size-3 mr-1" /> TURX Onaylı
                              </Badge>
                            ) : row.isProtectedGm ? (
                              <Badge className="border-gold/50 bg-gold/15 text-gold text-[10px]">
                                GM Korumalı
                              </Badge>
                            ) : row.status === 'armory_unavailable' ? (
                              <Badge className="border-amber-400/50 bg-amber-400/15 text-amber-300 text-[10px]">
                                <AlertTriangle className="size-3 mr-1" /> Yanıt Yok (Atlandı)
                              </Badge>
                            ) : (
                              <Badge className="border-red-500/60 bg-red-500/15 text-red-300 text-[10px]">
                                <ShieldAlert className="size-3 mr-1" />
                                {row.status === 'wrong_guild'
                                  ? 'Farklı Guild'
                                  : row.status === 'no_guild'
                                    ? 'Guildsiz'
                                    : row.status === 'no_character'
                                      ? 'Karakter Yok'
                                      : "Armory'de Yok"}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Panel>

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
                      {isGm ? (
                        <button
                          type="button"
                          onClick={() => setEditingMemberUsername(member.accountName)}
                          className="group inline-flex items-center gap-1.5 text-left font-bold text-silver hover:text-gold hover:underline underline-offset-4 transition cursor-pointer"
                          title="Üyenin profilini görüntüle ve düzenle (Sadece GM)"
                        >
                          <span>{member.accountName}</span>
                          <Edit3 className="size-3.5 text-gold/70 opacity-70 group-hover:opacity-100" />
                        </button>
                      ) : (
                        member.accountName
                      )}
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
                        <option value="Görevli">Görevli</option>
                        <option value="Turx">Turx</option>
                        <option value="Alt">Alt</option>
                        <option value="Sosyal">Sosyal</option>
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
        </div>
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
                            <div className="mt-1 flex flex-wrap items-center gap-1">
                              <Badge className={cn("text-[10px] py-0 px-1.5", RANK_STYLES[m.guildRank])}>
                                {m.guildRank}
                              </Badge>
                              {m.skipRaidsForNow && (
                                <Badge className="text-[10px] py-0 px-1.5 border-gold/40 bg-gold/10 text-gold">
                                  Raid Dışı
                                </Badge>
                              )}
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
                          const d = m.availability[dayKey] || { status: 'busy', startTime: '21:00', endTime: '00:00' }
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
                              ) : (
                                <div className="flex flex-col items-center justify-center p-1.5 rounded-lg border border-destructive/25 bg-destructive/10 text-destructive/80">
                                  <span className="text-[10px] font-medium">Meşgul</span>
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

      {/* SEKME 7: LONCA MESAJ & BILDIRIM MERKEZİ */}
      {activeTab === 'messages' && (
        <div className="flex flex-col gap-8">
          {/* A: Yeni Mesaj / Bildirim Gönder (Rich Composer) */}
          <Panel className="flex flex-col gap-6 border-gold/40 bg-gradient-to-r from-card via-[#071321] to-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <PanelTitle icon={Send}>Yeni Mesaj & Duyuru Yayınla</PanelTitle>
              <span className="text-xs text-muted-foreground">
                Zengin içerikli mesaj oluşturup üyelere ve e-postalarına bildirin.
              </span>
            </div>

            <form onSubmit={handleSendMessage} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Hedef Kitle */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-silver">Hedef Kitle *</label>
                <select
                  value={msgTargetType}
                  onChange={(e) => setMsgTargetType(e.target.value as 'ALL' | 'RANK' | 'USER')}
                  className={inputClass}
                >
                  <option value="ALL">📢 Tüm Lonca Üyeleri (Herkese)</option>
                  <option value="RANK">🛡️ Belirli Bir Rütbeye Göre</option>
                  <option value="USER">👤 Belirli Bir Üyeye (Kişiye Özel)</option>
                </select>
              </div>

              {/* Rütbe veya Kişi Seçici */}
              {msgTargetType === 'RANK' ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-silver">Hedef Rütbe *</label>
                  <select
                    value={msgTargetRank}
                    onChange={(e) => setMsgTargetRank(e.target.value)}
                    className={inputClass}
                  >
                    <option value="Görevli">🛡️ Görevli (Officer)</option>
                    <option value="Turx">⚔️ Turx (Üye / Raider)</option>
                    <option value="Alt">🔮 Alt</option>
                    <option value="Sosyal">🌿 Sosyal</option>
                    <option value="Guild Master">👑 Guild Master</option>
                  </select>
                </div>
              ) : msgTargetType === 'USER' ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-silver">Hedef Üye *</label>
                  <select
                    value={msgTargetUser}
                    onChange={(e) => setMsgTargetUser(e.target.value)}
                    className={inputClass}
                    required
                  >
                    <option value="">Üye Seçiniz...</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.accountName}>
                        {m.accountName} ({m.mainCharacter} - {m.rank})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-silver">Kategori *</label>
                  <select
                    value={msgCategory}
                    onChange={(e) => setMsgCategory(e.target.value)}
                    className={inputClass}
                  >
                    <option value="DUYURU">📢 Genel Duyuru</option>
                    <option value="RAID">⚔️ Raid Bilgilendirmesi</option>
                    <option value="ONEMLI">⚠️ Önemli / Acil</option>
                    <option value="GUNCELLEME">🛠️ Sistem / Kural Güncellemesi</option>
                    <option value="GENEL">📜 Genel Bilgi</option>
                  </select>
                </div>
              )}

              {msgTargetType !== 'ALL' && (
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-silver">Kategori *</label>
                  <select
                    value={msgCategory}
                    onChange={(e) => setMsgCategory(e.target.value)}
                    className={inputClass}
                  >
                    <option value="DUYURU">📢 Genel Duyuru</option>
                    <option value="RAID">⚔️ Raid Bilgilendirmesi</option>
                    <option value="ONEMLI">⚠️ Önemli / Acil</option>
                    <option value="GUNCELLEME">🛠️ Sistem / Kural Güncellemesi</option>
                    <option value="GENEL">📜 Genel Bilgi</option>
                  </select>
                </div>
              )}

              {/* Mesaj İkonu / Emoji Seçici */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-silver">Mesaj İkonu / Simgesi</label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {['📢', '⚔️', '🛡️', '👑', '⚠️', '📜', '✨', '🔥', '🏆', '📌', '🎯', '🎉', '🕒', '✅'].map((ico) => (
                    <button
                      key={ico}
                      type="button"
                      onClick={() => setMsgIcon(ico)}
                      className={cn(
                        "size-9 rounded-lg border text-base flex items-center justify-center transition cursor-pointer",
                        msgIcon === ico ? "border-gold bg-gold/20 scale-110 shadow-sm" : "border-border bg-background/50 hover:border-gold/50"
                      )}
                    >
                      {ico}
                    </button>
                  ))}
                  <input
                    type="text"
                    value={msgIcon}
                    onChange={(e) => setMsgIcon(e.target.value)}
                    placeholder="Örn: 🎮"
                    className={cn(inputClass, "w-20 text-center")}
                    maxLength={4}
                  />
                </div>
              </div>

              {/* Mesaj Başlığı */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-silver">Mesaj Başlığı *</label>
                <input
                  type="text"
                  value={msgTitle}
                  onChange={(e) => setMsgTitle(e.target.value)}
                  placeholder="Örn: Bu Akşamki Molten Core Raidi Hazırlıkları ve Attunement Kontrolü"
                  className={inputClass}
                  required
                />
              </div>

              {/* Mesaj İçeriği */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-silver">Mesaj Metni & Detayları *</label>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <span>Hızlı Emoji:</span>
                    {['👍', '🎉', '⚔️', '🔥', '✅', '❌'].map((emo) => (
                      <button
                        key={emo}
                        type="button"
                        onClick={() => setMsgContent((prev) => prev + ' ' + emo)}
                        className="px-1.5 py-0.5 rounded border border-border/60 hover:bg-background transition text-xs cursor-pointer"
                      >
                        {emo}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={msgContent}
                  onChange={(e) => setMsgContent(e.target.value)}
                  placeholder="Mesaj metnini buraya yazın. Satır başları, paragraflar ve emojiler desteklenir..."
                  rows={5}
                  className={cn(inputClass, "font-sans leading-relaxed resize-y")}
                  required
                />
              </div>

              {/* Görsel URL (Resim Ekle) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-silver">Görsel / Resim URL (Opsiyonel)</label>
                <input
                  type="url"
                  value={msgImageUrl}
                  onChange={(e) => setMsgImageUrl(e.target.value)}
                  placeholder="https://... (Örn: taktik haritası veya duyuru afişi)"
                  className={inputClass}
                />
                {msgImageUrl.trim() && (
                  <div className="mt-1 flex items-center gap-2 text-xs text-silver">
                    <img src={msgImageUrl.trim()} alt="Önizleme" className="size-10 object-cover rounded border border-border" />
                    <span className="text-[11px] text-emerald-400">Görsel önizlemesi hazır</span>
                  </div>
                )}
              </div>

              {/* Dosya / Bağlantı Ekle */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-silver">Dosya / Ek Bağlantı (Opsiyonel)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={msgAttachmentName}
                    onChange={(e) => setMsgAttachmentName(e.target.value)}
                    placeholder="Ek Adı (Örn: WeakAura String)"
                    className={inputClass}
                  />
                  <input
                    type="url"
                    value={msgAttachmentUrl}
                    onChange={(e) => setMsgAttachmentUrl(e.target.value)}
                    placeholder="URL (https://...)"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* E-posta Bildirimi Onayı */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background/50 md:col-span-2">
                <input
                  type="checkbox"
                  id="send_email_notification"
                  checked={msgSendEmail}
                  onChange={(e) => setMsgSendEmail(e.target.checked)}
                  className="accent-[#d4af37] size-4 rounded cursor-pointer"
                />
                <label htmlFor="send_email_notification" className="text-xs text-silver cursor-pointer flex flex-col">
                  <span className="font-semibold text-foreground">Alıcıların E-Posta Adreslerine Anlık Bildirim Gönder (Resend)</span>
                  <span className="text-[11px] text-muted-foreground">
                    İşaretlendiğinde, hedef kitledeki her üyenin kayıtlı e-posta adresine TURX bildirim şablonu ile anlık e-posta iletilir.
                  </span>
                </label>
              </div>

              {/* Gönder Düğmesi */}
              <div className="md:col-span-2 flex justify-end pt-2">
                <GoldButton type="submit" disabled={msgSending} className="text-xs py-2 px-6">
                  <Send className="size-3.5 mr-1.5" />
                  {msgSending ? 'Yayınlanıyor ve Mailler Gönderiliyor...' : 'Mesajı Yayınla & Bildirimi Gönder'}
                </GoldButton>
              </div>
            </form>
          </Panel>

          {/* B: Yayınlanan Mesajlar ve Okundu Raporu Tablosu */}
          <Panel className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <PanelTitle icon={Mail}>Yayınlanan Mesajlar & Okundu Raporları ({adminMessages.length})</PanelTitle>
              <GhostButton onClick={loadAdminMessages} disabled={adminMessagesLoading} className="text-xs py-1.5 px-3">
                <RefreshCw className={cn("size-3.5 mr-1.5", adminMessagesLoading && "animate-spin")} />
                Yenile
              </GhostButton>
            </div>

            {adminMessagesLoading && adminMessages.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">
                Mesajlar ve okundu raporları yükleniyor...
              </div>
            ) : adminMessages.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                Henüz yayınlanmış bir lonca mesajı bulunmuyor.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border text-silver/60">
                      <th className="py-3 px-3">İkon & Başlık</th>
                      <th className="py-3 px-3">Kategori</th>
                      <th className="py-3 px-3">Hedef Kitle</th>
                      <th className="py-3 px-3">Gönderen</th>
                      <th className="py-3 px-3">Tarih</th>
                      <th className="py-3 px-3">Okundu Durumu</th>
                      <th className="py-3 px-3 text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {adminMessages.map((msg) => (
                      <tr key={msg.id} className="hover:bg-card/40 transition">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="text-base shrink-0">{msg.icon || '📢'}</span>
                            <span className="font-semibold text-foreground max-w-[240px] truncate" title={msg.title}>
                              {msg.title}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="rounded px-2 py-0.5 text-[10px] font-bold border border-gold/40 bg-gold/10 text-gold">
                            {msg.category}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-silver font-medium">
                            {msg.targetType === 'ALL'
                              ? 'Tüm Lonca'
                              : msg.targetType === 'RANK'
                                ? `Rütbe: ${msg.targetRank}`
                                : `Kişi: ${msg.targetUsername}`}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {msg.senderUsername} ({msg.senderRole})
                        </td>
                        <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                          {new Date(msg.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-1 min-w-[120px]">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className="text-emerald-400">{msg.readCount} / {msg.totalTargetCount} Okundu</span>
                              <span className="text-gold font-mono">%{msg.readPercentage}</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-background overflow-hidden border border-border/60">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                                style={{ width: `${Math.min(100, msg.readPercentage)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <GoldButton
                              type="button"
                              onClick={() => setSelectedReportMessage(msg)}
                              className="text-xs py-1 px-2.5"
                              title="Kimlerin okuduğunu detaylı incele"
                            >
                              <Eye className="size-3 mr-1" />
                              Okundu Raporu
                            </GoldButton>
                            <GhostButton
                              type="button"
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="text-xs p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Mesajı Sil"
                            >
                              <Trash2 className="size-3.5" />
                            </GhostButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* C: Okundu Raporu İnceleme Modalı */}
          {selectedReportMessage && (
            <Modal
              open={Boolean(selectedReportMessage)}
              onClose={() => setSelectedReportMessage(null)}
              title={`Okundu Raporu: ${selectedReportMessage.icon || '📢'} ${selectedReportMessage.title}`}
              description={`Hedef: ${selectedReportMessage.targetType === 'ALL' ? 'Tüm Lonca' : selectedReportMessage.targetType === 'RANK' ? selectedReportMessage.targetRank : selectedReportMessage.targetUsername} • Toplam: ${selectedReportMessage.totalTargetCount} Üye • Okunma Oranı: %${selectedReportMessage.readPercentage}`}
            >
              <div className="flex flex-col gap-5 text-xs">
                {/* İlerleme Özeti */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-background/50">
                    <span className="text-muted-foreground text-[10px]">Toplam Hedef</span>
                    <span className="text-lg font-bold text-silver mt-0.5">{selectedReportMessage.totalTargetCount}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
                    <span className="text-[10px] font-semibold">Okuyanlar</span>
                    <span className="text-lg font-bold mt-0.5">{selectedReportMessage.readCount}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-400">
                    <span className="text-[10px] font-semibold">Henüz Okumayan</span>
                    <span className="text-lg font-bold mt-0.5">{selectedReportMessage.unreadCount}</span>
                  </div>
                </div>

                {/* Okuyanlar Listesi */}
                <div className="flex flex-col gap-2">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
                    <CheckCheck className="size-3.5" /> Okuyan Üyeler ({selectedReportMessage.readUsers.length})
                  </span>
                  {selectedReportMessage.readUsers.length === 0 ? (
                    <div className="p-3 rounded-lg border border-border bg-background/40 text-muted-foreground text-center">
                      Henüz hiçbir üye mesajı okumadı.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {selectedReportMessage.readUsers.map((u) => (
                        <div key={u.username} className="flex items-center justify-between p-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-bold text-silver truncate">{u.username}</span>
                            <span className="rounded bg-muted/40 px-1 py-0.2 text-[9px] text-muted-foreground">{u.role}</span>
                          </div>
                          <span className="text-[10px] text-emerald-400 font-mono whitespace-nowrap ml-2">
                            {new Date(u.readAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Okumayanlar Listesi */}
                <div className="flex flex-col gap-2">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
                    <Clock className="size-3.5" /> Henüz Okumayan Üyeler ({selectedReportMessage.unreadUsers.length})
                  </span>
                  {selectedReportMessage.unreadUsers.length === 0 ? (
                    <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-center font-semibold">
                      🎉 Hedef kitledeki tüm üyeler mesajı okudu!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {selectedReportMessage.unreadUsers.map((u) => (
                        <div key={u.username} className="flex items-center justify-between p-2 rounded-lg border border-border bg-background/40">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-semibold text-silver truncate">{u.username}</span>
                            <span className="rounded bg-muted/40 px-1 py-0.2 text-[9px] text-muted-foreground">{u.role}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">Bekliyor</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-3 border-t border-border">
                  <GoldButton type="button" onClick={() => setSelectedReportMessage(null)} className="text-xs py-1.5 px-4">
                    Kapat
                  </GoldButton>
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}

      {isGm && (
        <GmMemberProfileModal
          username={editingMemberUsername}
          onClose={() => setEditingMemberUsername(null)}
          onSaved={(updated) => {
            setMembers((prev) =>
              prev.map((m) =>
                m.accountName.toLowerCase() === updated.username.toLowerCase()
                  ? {
                      ...m,
                      rank: updated.role,
                      mainCharacter: updated.mainCharacter,
                      class: updated.wowClass,
                      spec: updated.spec,
                    }
                  : m,
              ),
            )
          }}
        />
      )}
    </div>
  )
}