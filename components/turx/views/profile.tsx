'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { ACTIVE_POLL, CLASS_COLORS, raceChoicesForClass, racesForClass, type AllianceRace, type WowClass } from '@/lib/guild-data'
import {
  DAYS_OF_WEEK,
  defaultDayAvailability,
  defaultWeekAvailability,
  normalizeAvailability,
  type AvailabilityStatus,
} from '@/lib/availability'
import { authHeaders } from '@/lib/client-session'
import {
  commitOnboardingStatus,
  getMainCharacter,
  getOnboardingGaps,
  getProfileFieldErrors,
  hasAvailabilityRequirement,
  hasVerifiedTurxMain,
  loadOnboardingCharacters,
  loadOnboardingProfile,
  saveOnboardingSnapshot,
} from '@/lib/profile-gate'
import { openPositionsLabel, STAFF_ROLES, type StaffRoleId } from '@/lib/staff-roles'
import { cn } from '@/lib/utils'
import { foreverArmoryUrl, type ArmoryVerificationResult } from '@/lib/wow-armory'
import { getAvatarName, getAvatarSrc, WOW_AVATARS, WOW_AVATAR_CATEGORIES, type WowAvatarCategory } from '@/lib/wow-avatars'
import { StaffRoleBadge } from '../staff-role-icons'
import { WowArmoryLogo } from '../wow-armory-badge'
import { useAuth } from '../auth-provider'
import { useToast } from '../toast'
import { Badge, GhostButton, GoldButton, Modal, Panel, SectionHeader, inputClass } from '../ui'
import {
  Plus,
  Trash2,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Link2,
  CheckCircle2,
  Edit3,
  Wrench,
  Clock,
  Sparkles,
  Lock,
  Unlock,
  Vote,
  Mail,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCheck,
  FileText,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  Loader2,
  UserCheck,
} from 'lucide-react'

type ExtendedRole = 'TANK' | 'HEALER' | 'MELEE' | 'RANGED'

interface GuildCharacter {
  id: string
  firstName: string
  lastName: string
  wowClass: WowClass
  race: string
  spec: string
  offSpec: string
  role: ExtendedRole
  isMain: boolean
  professions: [string, string]
  attunements: {
    onyxia: boolean
    mc: boolean
    bwl: boolean
    naxx: boolean
  }
  armoryVerified?: boolean
  armoryGuild?: string | null
  armoryCheckedAt?: string
  armoryLevel?: number | null
}

interface UserProfileData {
  fullName: string
  nickname: string
  birthDate: string
  gender: string
  bnetId: string
  email: string
  phoneCountry: string
  phoneNumber: string
  selectedAvatar: string
  showRealNameInRoster: boolean
  discordConnected: boolean
  discordTag: string
  bnetConnected: boolean
  twitchConnected: boolean
  twitchLogin: string
  twitchDisplayName: string
  kickLogin: string
  youtubeHandle: string
  skipRaidsForNow: boolean
  availabilityConfirmed: boolean
  availability: Record<string, { status: AvailabilityStatus; startTime: string; endTime: string }>
}

type WizardStep = 1 | 2 | 3 | 4 | 5

const WIZARD_STEPS: Array<{
  step: WizardStep
  shortTitle: string
  title: string
  subtitle: string
  required: boolean
}> = [
  {
    step: 1,
    shortTitle: 'Main & Armory',
    title: '1. Main Karakter & WoW Armory',
    subtitle: 'Aktif TURX karakter doğrulaması',
    required: true,
  },
  {
    step: 2,
    shortTitle: 'Kişisel Bilgiler',
    title: '2. Kişisel & Kayıt Bilgileri',
    subtitle: 'İletişim & Battle.net',
    required: true,
  },
  {
    step: 3,
    shortTitle: 'Müsaitlik',
    title: '3. Haftalık Raid Müsaitliği',
    subtitle: 'Gün/saat veya raid dışı',
    required: true,
  },
  {
    step: 4,
    shortTitle: 'Bağlantılar',
    title: '4. Hesap & Yayın Kanalları',
    subtitle: 'Discord, Twitch, Kick, YT',
    required: false,
  },
  {
    step: 5,
    shortTitle: 'Görevler & Onay',
    title: '5. Görevler, Anket & Site Erişimi',
    subtitle: 'Profili onayla ve kilidi aç',
    required: true,
  },
]

const WOW_CLASSES = Object.keys(CLASS_COLORS) as WowClass[]

const CLASS_SPECS: Record<WowClass, { label: string; role: ExtendedRole }[]> = {
  Druid: [
    { label: 'Feral Tank', role: 'TANK' },
    { label: 'Feral DPS', role: 'MELEE' },
    { label: 'Restoration', role: 'HEALER' },
    { label: 'Balance', role: 'RANGED' },
  ],
  Warrior: [
    { label: 'Protection', role: 'TANK' },
    { label: 'Arms', role: 'MELEE' },
    { label: 'Fury', role: 'MELEE' },
  ],
  Shaman: [
    { label: 'Restoration', role: 'HEALER' },
    { label: 'Enhancement', role: 'MELEE' },
    { label: 'Elemental', role: 'RANGED' },
  ],
  Mage: [
    { label: 'Fire', role: 'RANGED' },
    { label: 'Frost', role: 'RANGED' },
    { label: 'Arcane', role: 'RANGED' },
  ],
  Paladin: [
    { label: 'Protection', role: 'TANK' },
    { label: 'Holy', role: 'HEALER' },
    { label: 'Retribution', role: 'MELEE' },
  ],
  Priest: [
    { label: 'Holy', role: 'HEALER' },
    { label: 'Discipline', role: 'HEALER' },
    { label: 'Shadow', role: 'RANGED' },
  ],
  Rogue: [
    { label: 'Combat', role: 'MELEE' },
    { label: 'Assassination', role: 'MELEE' },
    { label: 'Subtlety', role: 'MELEE' },
  ],
  Warlock: [
    { label: 'Affliction', role: 'RANGED' },
    { label: 'Destruction', role: 'RANGED' },
    { label: 'Demonology', role: 'RANGED' },
  ],
  Hunter: [
    { label: 'Beast Mastery', role: 'RANGED' },
    { label: 'Marksmanship', role: 'RANGED' },
    { label: 'Survival', role: 'RANGED' },
  ],
}

const PROFESSIONS = [
  'Yok', 'Alchemy', 'Blacksmithing', 'Enchanting', 'Engineering',
  'Herbalism', 'Leatherworking', 'Mining', 'Skinning', 'Tailoring',
]

const START_TIME_OPTIONS = ['19:00', '19:30', '20:00', '20:30', '21:00']
const END_TIME_OPTIONS = ['23:00', '23:30', '00:00', '00:30', '01:00']

const errorInputClass =
  'border-red-500/80 bg-red-500/[0.07] ring-2 ring-red-500/25 focus:border-red-400 focus:ring-red-500/35'

function emptyProfile(email: string): UserProfileData {
  return {
    fullName: '',
    nickname: '',
    birthDate: '',
    gender: 'Erkek',
    bnetId: '',
    email,
    phoneCountry: '+90',
    phoneNumber: '',
    selectedAvatar: 'Druid',
    showRealNameInRoster: true,
    discordConnected: false,
    discordTag: '',
    bnetConnected: false,
    twitchConnected: false,
    twitchLogin: '',
    twitchDisplayName: '',
    kickLogin: '',
    youtubeHandle: '',
    skipRaidsForNow: false,
    availabilityConfirmed: false,
    availability: defaultWeekAvailability(),
  }
}

type PollState = {
  pollId?: string
  question: string
  endsIn: string
  total: number
  myVote: string | null
  options: { id: string; label: string; votes: number }[]
}

function ProfilePollSection() {
  const { user } = useAuth()
  const toast = useToast()
  const [choice, setChoice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [poll, setPoll] = useState<PollState>({
    question: ACTIVE_POLL.question,
    endsIn: ACTIVE_POLL.endsIn,
    total: 0,
    myVote: null,
    options: ACTIVE_POLL.options.map((option) => ({ ...option, votes: 0 })),
  })

  useEffect(() => {
    let cancelled = false
    fetch('/api/poll', { credentials: 'same-origin', headers: authHeaders() })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as Partial<PollState>
        if (!response.ok || cancelled || !Array.isArray(data.options)) return
        setPoll({
          pollId: data.pollId || ACTIVE_POLL.id,
          question: data.question || ACTIVE_POLL.question,
          endsIn: data.endsIn || ACTIVE_POLL.endsIn,
          total: data.total || 0,
          myVote: data.myVote || null,
          options: data.options,
        })
        if (data.myVote) setChoice(data.myVote)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [user?.username])

  const voted = poll.myVote
  const total = Math.max(poll.total, 1)

  const submitVote = async () => {
    if (!user) {
      toast({ title: 'Giriş gerekli', description: 'Oy verebilmek için oturum açmalısınız.' })
      return
    }
    if (!choice) return
    setBusy(true)
    try {
      const response = await fetch('/api/poll', {
        method: 'POST',
        credentials: 'same-origin',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ optionId: choice }),
      })
      const data = (await response.json().catch(() => ({}))) as Partial<PollState> & { error?: string }
      if (response.status === 409) {
        toast({ title: 'Zaten oy kullandınız', description: 'Her üye bu ankette yalnızca bir kez oy verebilir.' })
        return
      }
      if (!response.ok || !Array.isArray(data.options)) {
        toast({ title: 'Oy kaydedilemedi', description: data.error || 'Lütfen tekrar deneyin.' })
        return
      }
      setPoll({
        question: data.question || poll.question,
        endsIn: data.endsIn || poll.endsIn,
        total: data.total || 0,
        myVote: data.myVote || choice,
        options: data.options,
      })
      toast({ title: 'Oyunuz Kaydedildi', description: 'Görüşünüz lonca yönetimine iletildi. Teşekkür ederiz!' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <h3 className="font-display text-lg font-bold text-gold flex items-center gap-2">
          <Vote className="size-4 text-gold" /> Lonca Karar Anketi
        </h3>
        <div className="flex items-center gap-2">
          <Badge className="border-neon/40 bg-neon/10 text-neon text-xs">
            Bitiş: {poll.endsIn}
          </Badge>
          <Badge className="border-gold/30 bg-gold/10 text-gold text-xs">
            {poll.total} Toplam Oy
          </Badge>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-silver">{poll.question}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Profillerinizi düzenlerken loncamızın geleceği için oyunuzu kullanın. Yeni anketler bu alanda yayınlanır.
        </p>
      </div>

      <fieldset className="grid gap-2.5 sm:grid-cols-2">
        <legend className="sr-only">Anket Seçenekleri</legend>
        {poll.options.map((o) => {
          const isSelected = (voted ?? choice) === o.id
          const pct = Math.round((o.votes / total) * 100)
          return (
            <label
              key={o.id}
              className={cn(
                'relative flex flex-col justify-between overflow-hidden rounded-xl border p-3 transition cursor-pointer',
                isSelected
                  ? 'border-gold bg-gold/10 shadow-[0_0_12px_rgb(212,175,55/0.15)]'
                  : 'border-border bg-background/50 hover:border-border/80',
                voted && 'cursor-default',
              )}
            >
              {voted && (
                <div
                  className="absolute inset-y-0 left-0 bg-gold/15 pointer-events-none transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between gap-2">
                <span className="flex items-center gap-2.5 min-w-0">
                  <input
                    type="radio"
                    name="profile_poll_choice"
                    value={o.id}
                    disabled={Boolean(voted) || busy}
                    checked={isSelected}
                    onChange={() => setChoice(o.id)}
                    className="accent-[#d4af37] size-4 shrink-0"
                  />
                  <span className="text-sm font-semibold text-silver truncate">{o.label}</span>
                </span>
                {voted && (
                  <span className="text-xs font-bold font-mono text-gold tabular-nums shrink-0">
                    %{pct} ({o.votes})
                  </span>
                )}
              </div>
            </label>
          )
        })}
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
        <span className="text-xs text-muted-foreground">
          {voted ? (
            <span className="text-emerald-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5" /> Bu ankette oyunuzu kullandınız (1 oy / hesap).
            </span>
          ) : (
            'Oyunuzu vermek için bir seçeneği işaretleyin ve "Oyu Kaydet" düğmesine basın.'
          )}
        </span>
        {!voted && (
          <GoldButton
            type="button"
            disabled={!choice || busy}
            onClick={() => void submitVote()}
            className="text-xs py-2 px-4"
          >
            {busy ? 'Kaydediliyor...' : 'Oyu Kaydet'}
          </GoldButton>
        )}
      </div>
    </Panel>
  )
}

type ClientGuildMessage = {
  id: string
  title: string
  content: string
  category: 'DUYURU' | 'BILDIRIM' | 'RAID' | 'ONEMLI' | 'GUNCELLEME' | 'GENEL'
  icon?: string
  senderUsername: string
  senderRole: string
  imageUrl?: string
  attachments?: Array<{ name: string; url: string; type: 'image' | 'file' }>
  createdAt: string
  isRead: boolean
  readAt: string | null
}

function ProfileMessagesInbox() {
  const [messages, setMessages] = useState<ClientGuildMessage[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<ClientGuildMessage | null>(null)

  const fetchMessages = () => {
    fetch('/api/messages', { credentials: 'same-origin', headers: authHeaders() })
      .then(async (res) => {
        if (!res.ok) return
        const data = (await res.json().catch(() => ({}))) as {
          messages?: ClientGuildMessage[]
          unreadCount?: number
        }
        if (Array.isArray(data.messages)) {
          setMessages(data.messages)
          setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0)
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchMessages()
    const handleUpdate = () => fetchMessages()
    window.addEventListener('turx:messages-updated', handleUpdate)
    return () => window.removeEventListener('turx:messages-updated', handleUpdate)
  }, [])

  const markAsRead = async (msgId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    try {
      const res = await fetch(`/api/messages/${msgId}/read`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: authHeaders(),
      })
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, isRead: true, readAt: new Date().toISOString() } : m,
          ),
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
        window.dispatchEvent(new CustomEvent('turx:messages-updated'))
      }
    } catch {
      // ignore
    }
  }

  const openMessage = (msg: ClientGuildMessage) => {
    setSelectedMessage(msg)
    if (!msg.isRead) {
      void markAsRead(msg.id)
    }
  }

  const displayedMessages = expanded ? messages : messages.slice(0, 3)

  const formatShortDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr)
      return d.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return isoStr.slice(0, 10)
    }
  }

  const categoryBadgeClass: Record<string, string> = {
    DUYURU: 'border-gold/50 bg-gold/10 text-gold',
    BILDIRIM: 'border-azure/50 bg-azure/10 text-azure',
    RAID: 'border-neon/50 bg-neon/10 text-neon',
    ONEMLI: 'border-destructive/60 bg-destructive/15 text-destructive font-bold',
    GUNCELLEME: 'border-purple-500/50 bg-purple-500/10 text-purple-300',
    GENEL: 'border-border text-muted-foreground',
  }

  return (
    <Panel className="flex flex-col gap-4 border-gold/40 bg-gradient-to-r from-card via-[#071321] to-card shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="relative flex size-8 items-center justify-center rounded-lg bg-gold/15 border border-gold/40 text-gold shadow-[0_0_10px_rgba(212,175,55,0.25)]">
            <Mail className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-black text-white shadow-[0_0_6px_rgba(239,68,68,0.8)]">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-gold flex items-center gap-2">
              Lonca Bildirim & Mesaj Kutusu
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Lonca yönetimi ve görevliler tarafından iletilen anlık duyuru ve bildirimler.
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <Badge className="border-gold/50 bg-gold/15 text-gold text-xs font-semibold px-2.5 py-1">
            {unreadCount} Okunmamış Mesaj
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="py-4 text-center text-xs text-muted-foreground animate-pulse">
          Mesajlar yükleniyor...
        </div>
      ) : messages.length === 0 ? (
        <div className="py-5 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl bg-background/30">
          Henüz tarafınıza iletilmiş bir lonca bildirimi bulunmamaktadır.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {displayedMessages.map((msg) => {
            const isGm = msg.senderRole === 'Guild Master'
            const isOfficer = msg.senderRole === 'Görevli' || msg.senderRole === 'Officer'

            return (
              <div
                key={msg.id}
                onClick={() => openMessage(msg)}
                className={cn(
                  'group relative flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border transition-all cursor-pointer',
                  !msg.isRead
                    ? 'border-gold/60 bg-gold/[0.07] hover:border-gold hover:bg-gold/10 shadow-[0_0_10px_rgba(212,175,55,0.12)]'
                    : 'border-border/80 bg-background/50 hover:border-silver/40 hover:bg-background/80',
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <span className="text-base shrink-0 select-none">{msg.icon || '📢'}</span>
                  <span
                    className={cn(
                      'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold border leading-none',
                      isGm
                        ? 'border-gold/50 bg-gold/15 text-gold'
                        : isOfficer
                          ? 'border-neon/50 bg-neon/15 text-neon'
                          : 'border-border bg-muted/40 text-silver',
                    )}
                  >
                    {isGm ? 'GM' : isOfficer ? 'Officer' : 'Yönetim'} {msg.senderUsername}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold border leading-none hidden md:inline-block',
                      categoryBadgeClass[msg.category] || categoryBadgeClass.GENEL,
                    )}
                  >
                    {msg.category}
                  </span>
                  <span
                    className={cn(
                      'truncate text-xs font-semibold',
                      !msg.isRead ? 'text-foreground font-bold' : 'text-silver',
                    )}
                  >
                    {msg.title}
                  </span>
                </div>

                <div className="flex shrink-0 items-center justify-between sm:justify-end gap-3 text-xs pl-2 border-t sm:border-t-0 pt-1.5 sm:pt-0 border-border/40">
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {formatShortDate(msg.createdAt)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      if (!msg.isRead) markAsRead(msg.id, e)
                    }}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium transition cursor-pointer border',
                      msg.isRead
                        ? 'border-success/40 bg-success/10 text-success cursor-default'
                        : 'border-gold/50 bg-gold/15 text-gold hover:bg-gold/25 shadow-[0_0_8px_rgba(212,175,55,0.2)]',
                    )}
                    title={
                      msg.isRead
                        ? `Okundu (${formatShortDate(msg.readAt || msg.createdAt)})`
                        : 'Okundu olarak işaretle'
                    }
                  >
                    {msg.isRead ? (
                      <>
                        <CheckCheck className="size-3 text-success" />
                        <span>Okundu</span>
                      </>
                    ) : (
                      <>
                        <span className="size-2 rounded-full bg-gold animate-ping" />
                        <span>Okundu İşaretle</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}

          {messages.length > 3 && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1.5 text-xs text-gold hover:text-gold/80 font-semibold px-3 py-1.5 rounded-lg border border-gold/30 hover:bg-gold/10 transition cursor-pointer"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="size-3.5" /> Daha Az Göster
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-3.5" /> Daha Fazla Göster ({messages.length - 3} eski mesaj)
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {selectedMessage && (
        <Modal
          open={Boolean(selectedMessage)}
          onClose={() => setSelectedMessage(null)}
          title={`${selectedMessage.icon || '📢'} ${selectedMessage.title}`}
          description={`Gönderen: ${selectedMessage.senderUsername} (${selectedMessage.senderRole}) • ${formatShortDate(selectedMessage.createdAt)}`}
        >
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-border">
              <Badge className={categoryBadgeClass[selectedMessage.category] || categoryBadgeClass.GENEL}>
                {selectedMessage.category}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Tarih: {new Date(selectedMessage.createdAt).toLocaleString('tr-TR')}
              </span>
            </div>

            <div className="rounded-xl border border-border bg-background/70 p-4 leading-relaxed whitespace-pre-line text-silver">
              {selectedMessage.content}
            </div>

            {selectedMessage.imageUrl && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-silver">İliştirilmiş Görsel:</span>
                <div className="relative rounded-xl border border-border overflow-hidden bg-black/40 max-h-80 flex items-center justify-center p-1">
                  <img
                    src={selectedMessage.imageUrl}
                    alt={selectedMessage.title}
                    className="max-h-80 w-auto object-contain rounded-lg"
                  />
                </div>
              </div>
            )}

            {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <span className="text-xs font-semibold text-silver">Dosya & Ek Bağlantılar:</span>
                <div className="grid gap-2">
                  {selectedMessage.attachments.map((att, idx) => (
                    <a
                      key={idx}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background/60 hover:border-gold/50 hover:bg-gold/5 text-xs text-silver transition"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="size-4 text-gold" />
                        {att.name}
                      </span>
                      <ExternalLink className="size-3.5 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-border">
              <GoldButton
                type="button"
                onClick={() => setSelectedMessage(null)}
                className="text-xs py-1.5 px-4"
              >
                Kapat
              </GoldButton>
            </div>
          </div>
        </Modal>
      )}
    </Panel>
  )
}

function AvatarPickerModal({
  open,
  onClose,
  selectedAvatar,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  selectedAvatar: string
  onSelect: (avatarId: string) => void
}) {
  const [activeCategory, setActiveCategory] = useState<WowAvatarCategory>('Sınıflar')
  const filteredAvatars = WOW_AVATARS.filter((a) => a.category === activeCategory)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Profil Avatar Simgesini Seç (30 WoW İkonu)"
      description="WoW Forever / Classic dünyasından sınıf armaları, Alliance ırk portreleri ve efsanevi eşyalar arasından profilinizi temsil eden simgeyi seçin."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-1.5 border-b border-border pb-3">
          {WOW_AVATAR_CATEGORIES.map((cat) => {
            const count = WOW_AVATARS.filter((a) => a.category === cat).length
            const active = activeCategory === cat
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border',
                  active
                    ? 'bg-gold/20 border-gold text-gold shadow-[0_0_10px_rgba(212,175,55,0.25)]'
                    : 'border-border text-muted-foreground hover:text-silver hover:bg-background/60',
                )}
              >
                {cat} ({count})
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1">
          {filteredAvatars.map((av) => {
            const isSelected =
              selectedAvatar === av.id || av.id === `class-${selectedAvatar.toLowerCase()}`
            return (
              <button
                key={av.id}
                type="button"
                onClick={() => {
                  onSelect(av.id)
                  onClose()
                }}
                className={cn(
                  'flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all cursor-pointer group',
                  isSelected
                    ? 'border-gold bg-gold/15 shadow-[0_0_12px_rgba(212,175,55,0.3)] ring-1 ring-gold'
                    : 'border-border bg-background/50 hover:border-gold/40 hover:bg-gold/5',
                )}
              >
                <div className="relative size-12 shrink-0 rounded-lg overflow-hidden border border-border group-hover:border-gold/60">
                  <Image
                    src={av.src}
                    alt={av.name}
                    width={48}
                    height={48}
                    className="size-full object-cover"
                  />
                  {isSelected && (
                    <span className="absolute inset-0 bg-gold/25 flex items-center justify-center">
                      <Check className="size-5 text-gold drop-shadow-md stroke-[3]" />
                    </span>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span
                    className={cn(
                      'text-xs font-bold truncate',
                      isSelected ? 'text-gold' : 'text-silver group-hover:text-foreground',
                    )}
                  >
                    {av.name}
                  </span>
                  {av.description && (
                    <span className="text-[10px] text-muted-foreground line-clamp-1">
                      {av.description}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex justify-end pt-3 border-t border-border">
          <GhostButton type="button" onClick={onClose} className="text-xs">
            Kapat
          </GhostButton>
        </div>
      </div>
    </Modal>
  )
}

export function ProfileView() {
  const toast = useToast()
  const { user, profileComplete, refreshProfileGate, hydratingSession } = useAuth()
  const [ready, setReady] = useState(false)
  const [profile, setProfile] = useState<UserProfileData>(() => emptyProfile(''))
  const [characters, setCharacters] = useState<GuildCharacter[]>([])
  const [staffInterests, setStaffInterests] = useState<StaffRoleId[]>([])
  const [oauthReady, setOauthReady] = useState({ discord: false, bnet: false, twitch: false })

  // 5-step guided flow state
  const [activeStep, setActiveStep] = useState<WizardStep>(1)
  const initialStepResolvedRef = useRef(false)
  const [showStep1Errors, setShowStep1Errors] = useState(false)
  const [showStep2Errors, setShowStep2Errors] = useState(false)
  const [showStep3Errors, setShowStep3Errors] = useState(false)
  const [savingStep, setSavingStep] = useState(false)

  // WoW Armory live verification state
  const [armoryChecking, setArmoryChecking] = useState(false)
  const [armoryFeedback, setArmoryFeedback] = useState<ArmoryVerificationResult | null>(null)

  const [editingCharId, setEditingCharId] = useState<string | null>(null)
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)
  const [savingAvailability, setSavingAvailability] = useState(false)
  const [linkModal, setLinkModal] = useState<{ open: boolean; provider: 'discord' | 'bnet'; value: string } | null>(null)
  const [linkingBusy, setLinkingBusy] = useState(false)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editRace, setEditRace] = useState('')
  const [editSpec, setEditSpec] = useState('')
  const [editOffSpec, setEditOffSpec] = useState('')
  const [editProf1, setEditProf1] = useState('Yok')
  const [editProf2, setEditProf2] = useState('Yok')
  const [editAttOny, setEditAttOny] = useState(false)
  const [editAttMc, setEditAttMc] = useState(false)
  const [editAttBwl, setEditAttBwl] = useState(false)
  const [editAttNaxx, setEditAttNaxx] = useState(false)

  const [newFirstName, setNewFirstName] = useState('')
  const [newLastName, setNewLastName] = useState('')
  const [newClass, setNewClass] = useState<WowClass>('Druid')
  const [newRace, setNewRace] = useState(racesForClass('Druid')[0])
  const [newSpec, setNewSpec] = useState(CLASS_SPECS['Druid'][0].label)
  const [newOffSpec, setNewOffSpec] = useState(CLASS_SPECS['Druid'][1]?.label || 'Yok')
  const [newRole, setNewRole] = useState<ExtendedRole>(CLASS_SPECS['Druid'][0].role)
  const [prof1, setProf1] = useState('Yok')
  const [prof2, setProf2] = useState('Yok')
  const [attOny, setAttOny] = useState(false)
  const [attMc, setAttMc] = useState(false)
  const [attBwl, setAttBwl] = useState(false)
  const [attNaxx, setAttNaxx] = useState(false)

  const stepTopRef = useRef<HTMLDivElement>(null)

  const handleClassChange = (cls: WowClass) => {
    setNewClass(cls)
    const races = racesForClass(cls)
    setNewRace(races[0])
    const specs = CLASS_SPECS[cls]
    setNewSpec(specs[0].label)
    setNewOffSpec(specs[1] ? specs[1].label : 'Yok')
    setNewRole(specs[0].role)
  }

  const handleSpecChange = (specLabel: string) => {
    setNewSpec(specLabel)
    const found = CLASS_SPECS[newClass].find((s) => s.label === specLabel)
    if (found) {
      setNewRole(found.role)
    }
  }

  const goToStep = (step: WizardStep) => {
    setActiveStep(step)
    stepTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    if (!user) {
      setProfile(emptyProfile(''))
      setCharacters([])
      setReady(false)
      initialStepResolvedRef.current = false
      return
    }

    let cancelled = false
    const localProfile = loadOnboardingProfile(user.username) as Partial<UserProfileData> | null
    const localCharacters = loadOnboardingCharacters(user.username) as GuildCharacter[]

    const pickFirstIncompleteStep = (prof: UserProfileData, chars: GuildCharacter[]): WizardStep => {
      if (!hasVerifiedTurxMain(chars)) return 1
      const errs = getProfileFieldErrors(prof, chars)
      if (errs.fullName || errs.birthDate || errs.gender || errs.bnetId || errs.email || errs.phoneNumber) return 2
      if (!hasAvailabilityRequirement(prof)) return 3
      return 1
    }

    const applyInitial = (prof: UserProfileData, chars: GuildCharacter[]) => {
      setProfile(prof)
      setCharacters(chars)
      setReady(true)
      if (!initialStepResolvedRef.current) {
        initialStepResolvedRef.current = true
        setActiveStep(pickFirstIncompleteStep(prof, chars))
      }
    }

    const hydratedLocal: UserProfileData = localProfile
      ? {
          ...emptyProfile(user.email),
          ...localProfile,
          selectedAvatar: localProfile.selectedAvatar || 'Druid',
          skipRaidsForNow: localProfile.skipRaidsForNow === true,
          availabilityConfirmed: localProfile.availabilityConfirmed === true,
          availability: normalizeAvailability(localProfile.availability),
        }
      : emptyProfile(user.email)

    applyInitial(hydratedLocal, Array.isArray(localCharacters) ? localCharacters : [])

    fetch('/api/profile', { credentials: 'same-origin', headers: authHeaders() })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          profile?: Partial<UserProfileData> | null
          characters?: GuildCharacter[]
          staffInterests?: StaffRoleId[]
          oauth?: { discord?: boolean; bnet?: boolean; twitch?: boolean }
        }
        if (!response.ok || cancelled) return
        const serverProf: UserProfileData = data.profile
          ? {
              ...emptyProfile(user.email),
              ...data.profile,
              selectedAvatar: data.profile.selectedAvatar || 'Druid',
              skipRaidsForNow: data.profile.skipRaidsForNow === true,
              availabilityConfirmed: data.profile.availabilityConfirmed === true,
              availability: normalizeAvailability(data.profile.availability),
            }
          : hydratedLocal
        const serverChars = Array.isArray(data.characters) ? data.characters : []
        setProfile(serverProf)
        setCharacters(serverChars)
        if (Array.isArray(data.staffInterests)) setStaffInterests(data.staffInterests)
        if (data.oauth) {
          setOauthReady({
            discord: Boolean(data.oauth.discord),
            bnet: Boolean(data.oauth.bnet),
            twitch: Boolean(data.oauth.twitch),
          })
        }
        if (!hasVerifiedTurxMain(serverChars)) {
          setActiveStep(1)
        }
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const result = params.get('oauth')
    if (!result) return
    const provider = params.get('provider') || ''
    const names: Record<string, string> = { discord: 'Discord', bnet: 'Battle.net', twitch: 'Twitch' }
    const label = names[provider] || 'Hesap'
    if (result === 'ok') toast({ title: `${label} bağlandı`, description: 'Hesap bağlantın kaydedildi.' })
    else if (result === 'login') toast({ title: 'Giriş gerekli', description: 'Hesap bağlamak için önce oturum aç.' })
    else if (result === 'denied') toast({ title: 'İzin verilmedi', description: `${label} bağlantısı iptal edildi.` })
    else if (result === 'missing') {
      toast({
        title: `${label} henüz hazır değil`,
        description: 'Yönetici bu sağlayıcı için istemci anahtarlarını Vercel’e eklemeli.',
      })
    } else toast({ title: 'Bağlantı başarısız', description: `${label} hesabı bağlanamadı. Tekrar dene.` })
    params.delete('oauth')
    params.delete('provider')
    params.delete('reason')
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`
    window.history.replaceState({}, '', next)
  }, [toast])

  const startOauth = (provider: 'discord' | 'bnet' | 'twitch') => {
    if (!user) {
      toast({ title: 'Giriş gerekli', description: 'Hesap bağlamak için önce oturum aç.' })
      return
    }
    window.location.href = `/api/oauth/${provider}`
  }

  const connectManual = async (provider: 'discord' | 'bnet', value: string) => {
    if (!user) {
      toast({ title: 'Giriş gerekli', description: 'Hesap bağlamak için önce oturum açın.' })
      return
    }
    const clean = value.trim()
    if (!clean) {
      toast({
        variant: 'error',
        title: 'Hata',
        description: provider === 'discord' ? 'Discord kullanıcı adı boş olamaz.' : 'BattleTag boş olamaz.',
      })
      return
    }

    setLinkingBusy(true)
    try {
      const res = await fetch('/api/oauth/connect', {
        method: 'POST',
        credentials: 'same-origin',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ provider, value: clean }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast({ variant: 'error', title: 'Bağlantı Başarısız', description: data.error || 'İşlem gerçekleştirilemedi.' })
        return
      }

      if (provider === 'discord') {
        const tag = clean.replace(/^@/, '')
        setProfile((prev) => ({ ...prev, discordConnected: true, discordTag: tag }))
        toast({ title: 'Discord Hesabı Bağlandı', description: `@${tag} profilinize başarıyla bağlandı.` })
      } else {
        setProfile((prev) => ({ ...prev, bnetConnected: true, bnetId: clean }))
        toast({ title: 'Battle.net Hesabı Bağlandı', description: `${clean} profilinize başarıyla bağlandı.` })
      }
      setLinkModal(null)
    } catch {
      toast({ variant: 'error', title: 'Bağlantı Hatası', description: 'Sunucuya ulaşılamadı. Tekrar deneyin.' })
    } finally {
      setLinkingBusy(false)
    }
  }

  const disconnectOauth = async (provider: 'discord' | 'bnet' | 'twitch') => {
    try {
      const response = await fetch('/api/oauth/disconnect', {
        method: 'POST',
        credentials: 'same-origin',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ provider }),
      })
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        toast({ variant: 'error', title: 'Kaldırılamadı', description: data.error || 'Bağlantı kaldırılamadı.' })
        return
      }
      if (provider === 'discord') setProfile((prev) => ({ ...prev, discordConnected: false, discordTag: '' }))
      if (provider === 'bnet') setProfile((prev) => ({ ...prev, bnetConnected: false, bnetId: '' }))
      if (provider === 'twitch') {
        setProfile((prev) => ({ ...prev, twitchConnected: false, twitchLogin: '', twitchDisplayName: '' }))
      }
      toast({ title: 'Bağlantı kaldırıldı', description: 'Hesap bağlantısı silindi.' })
    } catch {
      toast({ variant: 'error', title: 'Bağlantı kaldırılamadı', description: 'Tekrar dene.' })
    }
  }

  useEffect(() => {
    if (!ready || !user) return
    saveOnboardingSnapshot(user.username, profile, characters)
  }, [profile, characters, ready, user])

  const persistGate = async (
    nextProfile: UserProfileData,
    nextCharacters: GuildCharacter[],
    options?: { forceArmoryCheck?: boolean },
  ): Promise<{ complete: boolean; characters: GuildCharacter[]; armoryResult: ArmoryVerificationResult | null }> => {
    if (!user) return { complete: false, characters: nextCharacters, armoryResult: null }
    saveOnboardingSnapshot(user.username, nextProfile, nextCharacters)
    commitOnboardingStatus(user.username, nextProfile, nextCharacters)
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          profile: nextProfile,
          characters: nextCharacters,
          staffInterests,
          forceArmoryCheck: Boolean(options?.forceArmoryCheck),
        }),
      })
      const data = (await response.json().catch(() => ({}))) as {
        profileComplete?: boolean
        characters?: GuildCharacter[]
        armoryResult?: ArmoryVerificationResult | null
        error?: string
      }
      if (!response.ok) {
        toast({ variant: 'error', title: 'Sunucuya kaydedilemedi', description: data.error || 'Profil tarayıcıda kaldı.' })
      }
      const syncedChars = Array.isArray(data.characters) ? data.characters : nextCharacters
      setCharacters(syncedChars)
      saveOnboardingSnapshot(user.username, nextProfile, syncedChars)
      commitOnboardingStatus(user.username, nextProfile, syncedChars)
      await refreshProfileGate()
      return {
        complete: Boolean(data.profileComplete ?? commitOnboardingStatus(user.username, nextProfile, syncedChars)),
        characters: syncedChars,
        armoryResult: data.armoryResult || null,
      }
    } catch {
      await refreshProfileGate()
      return {
        complete: commitOnboardingStatus(user.username, nextProfile, nextCharacters),
        characters: nextCharacters,
        armoryResult: null,
      }
    }
  }

  const verifyCharacterViaApi = async (firstName: string, lastName: string, wowClass: WowClass) => {
    setArmoryChecking(true)
    setArmoryFeedback(null)
    try {
      const res = await fetch('/api/armory/verify', {
        method: 'POST',
        credentials: 'same-origin',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), wowClass }),
      })
      const result = (await res.json().catch(() => null)) as ArmoryVerificationResult | null
      if (!result) {
        const fallback: ArmoryVerificationResult = {
          ok: false,
          status: 'armory_unavailable',
          url: foreverArmoryUrl(firstName, lastName),
          slug: `${firstName}-${lastName}`.toLowerCase(),
          level: null,
          guildName: null,
          guildSlug: null,
          characterClass: null,
          characterRace: null,
          avatarUrl: null,
          message: 'WoW Forever Armory bağlantısı kurulamadı. Lütfen tekrar deneyin.',
        }
        setArmoryFeedback(fallback)
        return fallback
      }
      setArmoryFeedback(result)
      return result
    } finally {
      setArmoryChecking(false)
    }
  }

  const handleReverifyMain = async () => {
    const main = getMainCharacter(characters) as GuildCharacter | null
    if (!main || !main.firstName?.trim() || !main.lastName?.trim()) {
      setShowStep1Errors(true)
      toast({
        variant: 'error',
        title: 'Main karakter eksik',
        description: 'Önce aktif oynadığınız Main karakterinizi ekleyin.',
      })
      return
    }
    const result = await verifyCharacterViaApi(main.firstName, main.lastName, main.wowClass)
    if (!result.ok) {
      setShowStep1Errors(true)
      toast({
        variant: 'error',
        title: 'WoW Armory Doğrulaması Başarısız',
        description: result.message,
      })
      return
    }
    const nextChars = characters.map((c) =>
      c.id === main.id
        ? {
            ...c,
            armoryVerified: true,
            armoryGuild: result.guildName || 'TURX',
            armoryCheckedAt: new Date().toISOString(),
            armoryLevel: result.level,
          }
        : c,
    )
    setCharacters(nextChars)
    await persistGate(profile, nextChars, { forceArmoryCheck: true })
    toast({
      title: 'WoW Armory Doğrulandı! ✅',
      description: result.message,
    })
    if (!profileComplete) goToStep(2)
  }

  const handleAddCharacter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFirstName.trim() || !newLastName.trim()) {
      setShowStep1Errors(true)
      toast({
        variant: 'error',
        title: 'Eksik Bilgi',
        description: 'Lütfen karakterin adını ve soyadını eksiksiz girin.',
      })
      return
    }

    const isFirstOrMain = characters.length === 0 || !characters.some((c) => c.isMain)
    let armoryRes: ArmoryVerificationResult | null = null

    if (isFirstOrMain) {
      armoryRes = await verifyCharacterViaApi(newFirstName.trim(), newLastName.trim(), newClass)
      if (!armoryRes.ok) {
        setShowStep1Errors(true)
        toast({
          variant: 'error',
          title: 'TURX Armory Doğrulaması Gerekli',
          description: armoryRes.message,
        })
        return
      }
    }

    const newChar: GuildCharacter = {
      id: Date.now().toString(),
      firstName: newFirstName.trim(),
      lastName: newLastName.trim(),
      wowClass: newClass,
      race: newRace,
      spec: newSpec,
      offSpec: newOffSpec,
      role: newRole,
      isMain: isFirstOrMain,
      professions: [prof1, prof2],
      attunements: { onyxia: attOny, mc: attMc, bwl: attBwl, naxx: attNaxx },
      ...(armoryRes?.ok
        ? {
            armoryVerified: true,
            armoryGuild: armoryRes.guildName || 'TURX',
            armoryCheckedAt: new Date().toISOString(),
            armoryLevel: armoryRes.level,
          }
        : {}),
    }

    const nextCharacters = [...characters, newChar]
    setCharacters(nextCharacters)
    setNewFirstName('')
    setNewLastName('')
    setProf1('Yok')
    setProf2('Yok')
    setAttOny(false)
    setAttMc(false)
    setAttBwl(false)
    setAttNaxx(false)
    setShowStep1Errors(false)

    const persisted = await persistGate(profile, nextCharacters)
    if (isFirstOrMain && !hasVerifiedTurxMain(persisted.characters)) {
      setShowStep1Errors(true)
      toast({
        variant: 'error',
        title: 'Armory Doğrulaması Onaylanmadı',
        description: persisted.armoryResult?.message || 'Karakter WoW Armory üzerinde TURX guildinde doğrulanamadı.',
      })
      return
    }

    toast({
      title: isFirstOrMain ? 'Main Karakter WoW Armory ile Doğrulandı!' : 'Alt Karakter Eklendi!',
      description: persisted.complete
        ? `${newChar.firstName} ${newChar.lastName} kaydedildi. Profil doğrulamanız tamamlandı!`
        : isFirstOrMain
          ? `${newChar.firstName} ${newChar.lastName} TURX üyesi olarak onaylandı. Adım 2'ye geçebilirsiniz.`
          : `${newChar.firstName} ${newChar.lastName} (${newChar.spec}) havuzunuza eklendi.`,
    })
    if (isFirstOrMain && !profileComplete) {
      goToStep(2)
    }
  }

  const handleSetMain = async (id: string) => {
    const target = characters.find((c) => c.id === id)
    if (!target) return
    const armoryRes = await verifyCharacterViaApi(target.firstName, target.lastName, target.wowClass)
    if (!armoryRes.ok) {
      toast({
        variant: 'error',
        title: 'Main Karakter Değiştirilemedi',
        description: armoryRes.message,
      })
      return
    }
    const nextCharacters = characters.map((char) => ({
      ...char,
      isMain: char.id === id,
      ...(char.id === id
        ? {
            armoryVerified: true,
            armoryGuild: armoryRes.guildName || 'TURX',
            armoryCheckedAt: new Date().toISOString(),
            armoryLevel: armoryRes.level,
          }
        : {}),
    }))
    setCharacters(nextCharacters)
    await persistGate(profile, nextCharacters)
    toast({ title: 'Ana Karakter Güncellendi', description: `${target.firstName} ${target.lastName} TURX Main olarak doğrulandı.` })
  }

  const handleStartEdit = (char: GuildCharacter) => {
    setEditingCharId(char.id)
    setEditFirstName(char.firstName)
    setEditLastName(char.lastName)
    setEditRace(char.race)
    setEditSpec(char.spec)
    setEditOffSpec(char.offSpec)
    setEditProf1(char.professions?.[0] || 'Yok')
    setEditProf2(char.professions?.[1] || 'Yok')
    setEditAttOny(char.attunements?.onyxia || false)
    setEditAttMc(char.attunements?.mc || false)
    setEditAttBwl(char.attunements?.bwl || false)
    setEditAttNaxx(char.attunements?.naxx || false)
  }

  const handleSaveEdit = async (id: string) => {
    const target = characters.find((c) => c.id === id)
    if (!target) return
    const first = editFirstName.trim()
    const last = editLastName.trim()
    if (!first || !last) {
      toast({ variant: 'error', title: 'Eksik Bilgi', description: 'Karakter adı ve soyadı boş olamaz.' })
      return
    }

    let verifiedPatch: Partial<GuildCharacter> = {}
    if (target.isMain) {
      const armoryRes = await verifyCharacterViaApi(first, last, target.wowClass)
      if (!armoryRes.ok) {
        toast({
          variant: 'error',
          title: 'TURX WoW Armory Doğrulaması Başarısız',
          description: armoryRes.message,
        })
        return
      }
      verifiedPatch = {
        armoryVerified: true,
        armoryGuild: armoryRes.guildName || 'TURX',
        armoryCheckedAt: new Date().toISOString(),
        armoryLevel: armoryRes.level,
      }
    }

    const nextCharacters = characters.map((char) => {
      if (char.id === id) {
        return {
          ...char,
          ...verifiedPatch,
          firstName: first,
          lastName: last,
          race: editRace,
          spec: editSpec,
          offSpec: editOffSpec,
          professions: [editProf1, editProf2] as [string, string],
          attunements: {
            onyxia: editAttOny,
            mc: editAttMc,
            bwl: editAttBwl,
            naxx: editAttNaxx,
          },
        }
      }
      return char
    })
    setCharacters(nextCharacters)
    setEditingCharId(null)
    await persistGate(profile, nextCharacters)
    toast({ title: 'Karakter Güncellendi', description: 'Değişiklikler başarıyla kaydedildi.' })
  }

  const handleDeleteCharacter = (id: string) => {
    if (characters.length <= 1) {
      toast({ variant: 'error', title: 'Silinemez', description: 'En az bir karakteriniz kalmalıdır.' })
      return
    }
    const remaining = characters.filter((c) => c.id !== id)
    if (!remaining.some((c) => c.isMain)) {
      remaining[0].isMain = true
    }
    setCharacters(remaining)
    void persistGate(profile, remaining)
    toast({ title: 'Karakter Silindi', description: 'Karakter havuzunuzdan kaldırıldı.' })
  }

  const handleStep2Save = async (e: React.FormEvent, advanceNext = true) => {
    e.preventDefault()
    if (!user) {
      toast({ variant: 'error', title: 'Giriş gerekli', description: 'Profil kaydetmek için önce oturum açın.' })
      return
    }

    const errs = getProfileFieldErrors(profile, characters)
    const step2Missing: Array<{ key: string; label: string; selector: string }> = []
    if (errs.fullName) step2Missing.push({ key: 'fullName', label: 'İsim Soyisim', selector: '#profile-fullName' })
    if (errs.birthDate) step2Missing.push({ key: 'birthDate', label: 'Doğum Tarihi', selector: '#profile-birthDate' })
    if (errs.gender) step2Missing.push({ key: 'gender', label: 'Cinsiyet', selector: '#profile-gender' })
    if (errs.bnetId) step2Missing.push({ key: 'bnetId', label: 'Battle.net Real ID', selector: '#profile-bnetId' })
    if (errs.email) step2Missing.push({ key: 'email', label: 'E-posta Adresi', selector: '#profile-email' })
    if (errs.phoneNumber) step2Missing.push({ key: 'phoneNumber', label: 'Telefon Numarası', selector: '#profile-phoneNumber' })

    if (step2Missing.length > 0) {
      setShowStep2Errors(true)
      const firstEl = document.querySelector<HTMLElement>(step2Missing[0].selector)
      firstEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      firstEl?.focus()
      toast({
        variant: 'error',
        title: 'Zorunlu alanlar eksik',
        description: `Lütfen kırmızı çerçeveli alanları doldurun: ${step2Missing.map((m) => m.label).join(', ')}.`,
      })
      return
    }

    setShowStep2Errors(false)
    setSavingStep(true)
    try {
      const persisted = await persistGate(profile, characters)
      if (persisted.complete && profileComplete) {
        toast({ title: 'Kişisel Bilgiler Güncellendi', description: 'Profil değişiklikleriniz kaydedildi.' })
      } else if (advanceNext) {
        toast({ title: 'Adım 2 Kaydedildi ✅', description: 'Şimdi Adım 3: Haftalık Raid Müsaitliğinizi belirleyin.' })
        goToStep(3)
      } else {
        toast({ title: 'Kişisel Bilgiler Kaydedildi', description: 'Değişiklikleriniz kaydedildi.' })
      }
    } finally {
      setSavingStep(false)
    }
  }

  const cycleAvailability = (dayKey: string) => {
    setProfile((prev) => {
      const current = prev.availability[dayKey]?.status || 'busy'
      let nextStatus: AvailabilityStatus = 'available'
      if (current === 'busy') nextStatus = 'available'
      else if (current === 'available') nextStatus = 'maybe'
      else if (current === 'maybe') nextStatus = 'busy'

      return {
        ...prev,
        skipRaidsForNow: false,
        availability: {
          ...prev.availability,
          [dayKey]: { ...(prev.availability[dayKey] || defaultDayAvailability()), status: nextStatus },
        },
      }
    })
  }

  const updateDayTime = (dayKey: string, field: 'startTime' | 'endTime', val: string) => {
    setProfile((prev) => ({
      ...prev,
      availability: {
        ...prev.availability,
        [dayKey]: {
          ...(prev.availability[dayKey] || defaultDayAvailability()),
          [field]: val,
        },
      },
    }))
  }

  const handleSaveAvailability = async (advanceNext = true) => {
    if (!user) {
      toast({ variant: 'error', title: 'Giriş gerekli', description: 'Müsaitlik kaydetmek için önce oturum açın.' })
      return
    }
    if (!hasAvailabilityRequirement(profile)) {
      setShowStep3Errors(true)
      toast({
        variant: 'error',
        title: 'Haftalık müsaitlik zorunludur',
        description:
          'En az bir günü Müsait/Belki olarak seçin veya "RAIDLERE KATILMAYI ŞİMDİLİK DÜŞÜNMÜYORUM" seçeneğini işaretleyin.',
      })
      return
    }

    setShowStep3Errors(false)
    setSavingAvailability(true)
    try {
      const normalizedProfile: UserProfileData = {
        ...profile,
        availabilityConfirmed: true,
        availability: normalizeAvailability(profile.availability),
      }
      setProfile(normalizedProfile)
      const persisted = await persistGate(normalizedProfile, characters)
      if (persisted.complete && profileComplete) {
        toast({
          title: 'Müsaitlik Güncellendi! 📅',
          description: normalizedProfile.skipRaidsForNow
            ? 'Raidlere şimdilik katılmama tercihiniz kaydedildi.'
            : 'Haftalık raid müsaitlik tercihleriniz kaydedildi ve GM paneline aktarıldı.',
        })
      } else if (advanceNext) {
        toast({
          title: 'Adım 3 Kaydedildi ✅',
          description: 'İsterseniz Adım 4\'te hesap ve yayın bağlantılarınızı ekleyip son adıma geçebilirsiniz.',
        })
        goToStep(4)
      } else {
        toast({
          title: 'Müsaitlik Kaydedildi 📅',
          description: 'Tercihleriniz sunucuya kaydedildi.',
        })
      }
    } catch {
      toast({ variant: 'error', title: 'Kaydedilemedi', description: 'Sunucuya ulaşılamadı.' })
    } finally {
      setSavingAvailability(false)
    }
  }

  const handleFinalUnlock = async () => {
    if (!user) return
    const gaps = getOnboardingGaps(profile, characters)
    if (gaps.length > 0) {
      if (!hasVerifiedTurxMain(characters)) {
        setShowStep1Errors(true)
        goToStep(1)
      } else {
        const errs = getProfileFieldErrors(profile, characters)
        if (errs.fullName || errs.birthDate || errs.gender || errs.bnetId || errs.email || errs.phoneNumber) {
          setShowStep2Errors(true)
          goToStep(2)
        } else if (!hasAvailabilityRequirement(profile)) {
          setShowStep3Errors(true)
          goToStep(3)
        }
      }
      toast({
        variant: 'error',
        title: 'Profil doğrulaması henüz tamamlanmadı',
        description: `Eksik adımlar: ${gaps.join(', ')}.`,
      })
      return
    }

    setSavingStep(true)
    try {
      const persisted = await persistGate({ ...profile, availabilityConfirmed: true }, characters)
      if (!persisted.complete) {
        const remainingGaps = getOnboardingGaps(profile, persisted.characters)
        toast({
          variant: 'error',
          title: 'Profil kilitli kaldı',
          description: `Eksik: ${remainingGaps.join(', ')}.`,
        })
        return
      }
      toast({
        title: 'Profil Onaylandı ve Site Erişimi Açıldı! 🎉',
        description: 'TURX lonca panelinin tüm üye alanlarına artık erişebilirsiniz.',
      })
    } finally {
      setSavingStep(false)
    }
  }

  const handleSelectAvatar = async (avatarId: string) => {
    const updated = { ...profile, selectedAvatar: avatarId }
    setProfile(updated)
    await persistGate(updated, characters)
    window.dispatchEvent(new CustomEvent('turx:profile-saved'))
    toast({
      title: 'Profil Simgesi Güncellendi',
      description: `Yeni simgeniz kaydedildi: ${getAvatarName(avatarId)}`,
    })
  }

  const fieldErrors = getProfileFieldErrors(profile, characters)
  const onboardingGaps = getOnboardingGaps(profile, characters)
  const step1Done = hasVerifiedTurxMain(characters)
  const step2Done =
    !fieldErrors.fullName &&
    !fieldErrors.birthDate &&
    !fieldErrors.gender &&
    !fieldErrors.bnetId &&
    !fieldErrors.email &&
    !fieldErrors.phoneNumber
  const step3Done = hasAvailabilityRequirement(profile)
  const step4Done = Boolean(
    profile.discordConnected || profile.bnetConnected || profile.twitchLogin || profile.kickLogin || profile.youtubeHandle,
  )
  const requiredCompletedCount = [step1Done, step2Done, step3Done].filter(Boolean).length
  const mainChar = getMainCharacter(characters) as GuildCharacter | null

  const displayName = profile.nickname.trim()
    ? `${profile.nickname} (${profile.fullName || user?.username || ''})`
    : profile.fullName || user?.username || ''

  if (!user && hydratingSession) {
    return (
      <div className="flex flex-col gap-4">
        <SectionHeader
          eyebrow="Hesap"
          title="Oturum doğrulanıyor…"
          description="Hesap ve profil bilgilerin yükleniyor, lütfen bekle."
        />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col gap-4">
        <SectionHeader
          eyebrow="Hesap"
          title="Profil için giriş gerekli"
          description="Karakter havuzu ve kişisel kayıt bilgileri yalnızca oturum açmış üyeler içindir."
        />
      </div>
    )
  }

  const stepStatus = (s: WizardStep): 'done' | 'error' | 'optional' | 'pending' => {
    if (s === 1) return step1Done ? 'done' : showStep1Errors ? 'error' : 'pending'
    if (s === 2) return step2Done ? 'done' : showStep2Errors ? 'error' : 'pending'
    if (s === 3) return step3Done ? 'done' : showStep3Errors ? 'error' : 'pending'
    if (s === 4) return step4Done ? 'done' : 'optional'
    return profileComplete ? 'done' : step1Done && step2Done && step3Done ? 'pending' : 'pending'
  }

  return (
    <div ref={stepTopRef} className="flex flex-col gap-6 pb-12">
      <SectionHeader
        eyebrow="Hesap & Roster Yönetimi"
        title="Kullanıcı Profili & Karakter Havuzu"
        description={
          profileComplete
            ? 'Lonca kayıt bilgileriniz, haftalık müsaitliğiniz ve WoW Armory onaylı karakter havuzunuz.'
            : '5 adımda profil ve WoW Armory (TURX) doğrulamasını tamamlayarak lonca panelinin tüm alanlarını açın.'
        }
      />

      {/* Profile Header Card */}
      <Panel className="border-gold/30 bg-gradient-to-r from-card/90 via-card/70 to-card/90 p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div
              onClick={() => setAvatarModalOpen(true)}
              className="relative size-18 rounded-2xl border-2 border-gold/70 overflow-hidden shadow-lg flex items-center justify-center bg-card/90 cursor-pointer group transition hover:border-gold hover:shadow-[0_0_15px_rgba(212,175,55,0.4)] shrink-0"
              title="Profil simgesini değiştirmek için tıklayın (30 WoW İkonu)"
            >
              <Image
                src={getAvatarSrc(profile.selectedAvatar)}
                alt={displayName}
                width={72}
                height={72}
                className="size-full object-cover"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition text-gold">
                <Edit3 className="size-4" />
                <span className="text-[9px] font-bold mt-0.5">Değiştir</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="font-display text-xl sm:text-2xl font-bold tracking-wide text-gold">
                  {displayName}
                </h2>
                <Badge className="border-gold/40 bg-gold/10 text-gold text-xs px-2.5 py-0.5">
                  {user.role}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 text-silver font-medium">
                  <span className="text-neon">Bnet:</span> {profile.bnetId || 'Bağlı Değil'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-silver font-medium">
                  <span className="text-azure">Discord:</span> {profile.discordTag ? `@${profile.discordTag}` : 'Bağlı Değil'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {profileComplete ? (
              <Badge className="border-success/40 bg-success/10 text-success px-3 py-1 text-xs">
                <ShieldCheck className="size-3.5 mr-1.5" /> WoW Armory & Profil Onaylı
              </Badge>
            ) : (
              <Badge className="border-gold/50 bg-gold/15 text-gold px-3 py-1 text-xs">
                <Lock className="size-3.5 mr-1.5" /> Doğrulama Bekleniyor ({requiredCompletedCount}/3 Zorunlu)
              </Badge>
            )}
          </div>
        </div>
      </Panel>

      {/* Lonca Bildirim & Mesaj Kutusu (Onaylı üyeler için üstte görünür) */}
      {profileComplete && <ProfileMessagesInbox />}

      {/* 5-Step Guided Navigation Stepper */}
      <Panel
        className={cn(
          'flex flex-col gap-4 p-5',
          profileComplete
            ? 'border-border bg-card/80'
            : 'border-gold/50 bg-gradient-to-br from-gold/10 via-[#0a1a2b] to-neon/5 shadow-[0_0_25px_rgba(212,175,55,0.12)]',
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 font-display text-sm font-bold tracking-wider text-gold uppercase">
              {profileComplete ? (
                <>
                  <CheckCircle2 className="size-4 text-success" /> Profil Bölümleri (5 Adım)
                </>
              ) : (
                <>
                  <Lock className="size-4 text-gold" /> 5 Adımda Profil Doğrulama & Site Erişimi
                </>
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {profileComplete
                ? 'İstediğiniz adımı seçerek bilgilerinizi, karakterlerinizi veya müsaitliğinizi güncelleyebilirsiniz.'
                : 'Aşağıdaki sıralı adımları "Kaydet ve Devam Et" ile tamamlayın. 1, 2 ve 3. zorunlu adımlar tamamlandığında sitenin tüm üye alanları otomatik açılır.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-gold/40 bg-gold/10 px-2.5 py-1 font-mono text-xs font-bold text-gold">
              Adım {activeStep} / 5
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-background/80 border border-border/60">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold via-amber-300 to-neon transition-all duration-500"
            style={{ width: `${Math.round(((profileComplete ? 5 : requiredCompletedCount + (activeStep === 5 ? 1 : 0)) / 5) * 100)}%` }}
          />
        </div>

        {/* 5 Numbered Step Pills */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {WIZARD_STEPS.map((item) => {
            const isCurrent = activeStep === item.step
            const st = stepStatus(item.step)
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => goToStep(item.step)}
                className={cn(
                  'group flex items-center gap-2.5 rounded-xl border p-3 text-left transition cursor-pointer',
                  isCurrent
                    ? 'border-gold bg-gold/15 shadow-[0_0_16px_rgba(212,175,55,0.2)]'
                    : st === 'error'
                      ? 'border-red-500/70 bg-red-500/10 hover:border-red-400'
                      : st === 'done'
                        ? 'border-success/40 bg-success/[0.07] hover:border-success/70'
                        : 'border-border bg-background/50 hover:border-gold/40',
                )}
              >
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-black',
                    isCurrent
                      ? 'border-gold bg-gold text-[#1a1305]'
                      : st === 'error'
                        ? 'border-red-400 bg-red-500/20 text-red-300'
                        : st === 'done'
                          ? 'border-success bg-success/20 text-success'
                          : 'border-border bg-card text-muted-foreground',
                  )}
                >
                  {st === 'done' && !isCurrent ? <Check className="size-3.5 stroke-[3]" /> : item.step}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'truncate text-xs font-bold',
                        isCurrent ? 'text-gold' : st === 'error' ? 'text-red-300' : 'text-foreground',
                      )}
                    >
                      {item.shortTitle}
                    </span>
                  </div>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {st === 'done' ? 'Tamamlandı' : item.required ? 'Zorunlu adım' : 'Opsiyonel'}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {!profileComplete && onboardingGaps.length > 0 && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-200 flex items-start gap-2">
            <AlertTriangle className="size-4 shrink-0 text-red-400 mt-0.5" />
            <span>
              <strong className="text-red-300">Site erişimi için kalan zorunlu alanlar:</strong>{' '}
              {onboardingGaps.join(' · ')}
            </span>
          </div>
        )}
      </Panel>

      {/* ===================================================================== */}
      {/* STEP 1: MAIN KARAKTER & WOW ARMORY (TURX) DOĞRULAMASI                 */}
      {/* ===================================================================== */}
      {activeStep === 1 && (
        <Panel className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <span className="text-[11px] font-bold tracking-widest text-neon uppercase">ADIM 1 / 5 · ZORUNLU</span>
              <h3 className="font-display text-lg font-bold text-gold flex items-center gap-2 mt-0.5">
                <Shield className="size-5" /> Main Karakter & WoW Armory (TURX) Doğrulaması
              </h3>
            </div>
            {step1Done ? (
              <Badge className="border-success/50 bg-success/15 text-success px-3 py-1">
                <ShieldCheck className="size-3.5 mr-1" /> TURX Armory Onaylı
              </Badge>
            ) : (
              <Badge className="border-gold/50 bg-gold/15 text-gold px-3 py-1">
                Doğrulama Gerekli
              </Badge>
            )}
          </div>

          {/* Requirement #8: Active Main character & WoW Armory verification note */}
          <div className="rounded-xl border border-neon/40 bg-neon/[0.07] p-4 flex items-start gap-3">
            <WowArmoryLogo />
            <div className="space-y-1 text-xs leading-relaxed">
              <p className="font-display text-sm font-bold text-neon">
                Aktif Main Karakter & WoW Forever Armory Doğrulaması
              </p>
              <p className="text-silver">
                İlk oluşturacağınız <strong className="text-foreground">Main karakterin</strong> oyunda{' '}
                <strong className="text-gold">aktif olarak oynadığınız</strong> bir karakter olması gerekmektedir.
                Karakteriniz <strong className="text-neon">WoW Forever Armory (EU)</strong> üzerinden otomatik olarak
                kontrol edilecek ve <strong className="text-gold">TURX</strong> guild listesinde yer aldığı
                doğrulandıktan sonra profiliniz onaylanacaktır.
              </p>
            </div>
          </div>

          {/* Live Armory verification feedback alert */}
          {armoryFeedback && (
            <div
              className={cn(
                'rounded-xl border p-4 text-xs leading-relaxed flex flex-col gap-2',
                armoryFeedback.ok
                  ? 'border-success/50 bg-success/10 text-emerald-200'
                  : 'border-red-500/70 bg-red-500/10 text-red-200',
              )}
            >
              <div className="flex items-start gap-2.5">
                {armoryFeedback.ok ? (
                  <ShieldCheck className="size-5 shrink-0 text-success mt-0.5" />
                ) : (
                  <ShieldAlert className="size-5 shrink-0 text-red-400 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-bold text-sm">
                    {armoryFeedback.ok ? 'WoW Armory Doğrulaması Başarılı' : 'WoW Armory Doğrulaması Onaylanmadı'}
                  </p>
                  <p>{armoryFeedback.message}</p>
                  {armoryFeedback.url && (
                    <a
                      href={armoryFeedback.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-neon hover:underline font-medium mt-1"
                    >
                      WoW Armory sayfasını yeni sekmede aç <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Existing Characters Pool */}
          {characters.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-silver">
                  Kayıtlı Karakter Havuzunuz ({characters.length})
                </h4>
                {mainChar && !step1Done && (
                  <GoldButton
                    type="button"
                    disabled={armoryChecking}
                    onClick={() => void handleReverifyMain()}
                    className="text-xs py-1.5 px-3"
                  >
                    {armoryChecking ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="size-3.5" />
                    )}
                    {armoryChecking ? 'Armory Kontrol Ediliyor...' : "Main Karakteri WoW Armory'den Doğrula"}
                  </GoldButton>
                )}
              </div>

              <div className="grid gap-3">
                {characters.map((char) => {
                  const isEditing = editingCharId === char.id
                  const isVerifiedTurx =
                    char.armoryVerified === true && (char.armoryGuild || '').toUpperCase() === 'TURX'

                  return (
                    <div
                      key={char.id}
                      className={cn(
                        'flex flex-col gap-2 p-3.5 rounded-xl border transition-all shadow-sm',
                        char.isMain && isVerifiedTurx
                          ? 'border-success/60 bg-success/[0.06]'
                          : char.isMain && !isVerifiedTurx
                            ? 'border-red-500/70 bg-red-500/[0.07]'
                            : 'border-border bg-background/60',
                      )}
                    >
                      {isEditing ? (
                        <div className="flex flex-col gap-3 py-1">
                          <div className="flex items-center justify-between border-b border-border pb-2">
                            <span className="text-xs font-bold text-gold uppercase tracking-wider">Karakteri Düzenle</span>
                            <button
                              type="button"
                              onClick={() => setEditingCharId(null)}
                              className="text-xs text-muted-foreground hover:text-silver cursor-pointer"
                            >
                              İptal
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={editFirstName}
                              onChange={(e) => setEditFirstName(e.target.value)}
                              className={inputClass}
                              placeholder="Karakter Adı"
                            />
                            <input
                              type="text"
                              value={editLastName}
                              onChange={(e) => setEditLastName(e.target.value)}
                              className={inputClass}
                              placeholder="Karakter Soyadı"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[11px] font-semibold text-silver">Irk</label>
                            <select
                              value={editRace}
                              onChange={(e) => setEditRace(e.target.value)}
                              className={inputClass}
                            >
                              {raceChoicesForClass(char.wowClass, editRace).map((race) => (
                                <option key={race} value={race}>{race}</option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={editSpec}
                              onChange={(e) => setEditSpec(e.target.value)}
                              className={inputClass}
                            >
                              {CLASS_SPECS[char.wowClass]?.map((sp) => (
                                <option key={sp.label} value={sp.label}>{sp.label}</option>
                              ))}
                            </select>
                            <select
                              value={editOffSpec}
                              onChange={(e) => setEditOffSpec(e.target.value)}
                              className={inputClass}
                            >
                              <option value="Yok">Yok</option>
                              {CLASS_SPECS[char.wowClass]?.filter((s) => s.label !== editSpec).map((sp) => (
                                <option key={sp.label} value={sp.label}>{sp.label}</option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={editProf1}
                              onChange={(e) => setEditProf1(e.target.value)}
                              className={inputClass}
                            >
                              {PROFESSIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                            </select>
                            <select
                              value={editProf2}
                              onChange={(e) => setEditProf2(e.target.value)}
                              className={inputClass}
                            >
                              {PROFESSIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </div>

                          <div className="grid grid-cols-4 gap-2 text-[11px] pt-1">
                            <label className="flex items-center gap-1 text-silver"><input type="checkbox" checked={editAttOny} onChange={(e) => setEditAttOny(e.target.checked)} /> Ony</label>
                            <label className="flex items-center gap-1 text-silver"><input type="checkbox" checked={editAttMc} onChange={(e) => setEditAttMc(e.target.checked)} /> MC</label>
                            <label className="flex items-center gap-1 text-silver"><input type="checkbox" checked={editAttBwl} onChange={(e) => setEditAttBwl(e.target.checked)} /> BWL</label>
                            <label className="flex items-center gap-1 text-silver"><input type="checkbox" checked={editAttNaxx} onChange={(e) => setEditAttNaxx(e.target.checked)} /> Naxx</label>
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <GoldButton
                              type="button"
                              disabled={armoryChecking}
                              onClick={() => void handleSaveEdit(char.id)}
                              className="text-xs py-1.5 px-4"
                            >
                              {armoryChecking ? 'Doğrulanıyor...' : 'Doğrula ve Kaydet'}
                            </GoldButton>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-sm" style={{ color: CLASS_COLORS[char.wowClass] }}>
                                  {char.firstName} {char.lastName}
                                </span>
                                {char.isMain && isVerifiedTurx && (
                                  <Badge className="border-success/50 bg-success/15 text-success text-[10px]">
                                    <ShieldCheck className="size-3 mr-0.5" />
                                    TURX Armory Onaylı{char.armoryLevel ? ` · Lvl ${char.armoryLevel}` : ''}
                                  </Badge>
                                )}
                                {char.isMain && !isVerifiedTurx && (
                                  <Badge className="border-red-500/60 bg-red-500/15 text-red-300 text-[10px]">
                                    <ShieldAlert className="size-3 mr-0.5" /> Armory Doğrulaması Gerekli
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {char.wowClass} ({char.race}) · <span className="text-silver">{char.spec}</span>{' '}
                                {char.offSpec && char.offSpec !== 'Yok' && (
                                  <span className="text-muted-foreground text-[10px]">(OS: {char.offSpec})</span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={armoryChecking}
                                onClick={() => void handleSetMain(char.id)}
                                className={cn(
                                  'relative flex items-center h-7 w-24 rounded-full p-1 transition-colors duration-300 focus:outline-none cursor-pointer border',
                                  char.isMain
                                    ? 'bg-success/20 border-success/60 shadow-[0_0_10px_rgb(62_224_127/0.3)]'
                                    : 'bg-background border-border',
                                )}
                                title="Main / Alt durumunu değiştirmek için tıklayın"
                              >
                                <div
                                  className={cn(
                                    'absolute flex items-center justify-center h-5 w-11 rounded-full text-[10px] font-bold transition-all duration-300 shadow-md',
                                    char.isMain
                                      ? 'translate-x-12 bg-success text-success-foreground'
                                      : 'translate-x-0 bg-muted text-muted-foreground',
                                  )}
                                >
                                  {char.isMain ? 'MAIN' : 'ALT'}
                                </div>
                                <span
                                  className={cn(
                                    'absolute left-2.5 text-[9px] font-bold transition-opacity',
                                    char.isMain ? 'opacity-100 text-success' : 'opacity-40 text-muted-foreground',
                                  )}
                                >
                                  MAIN
                                </span>
                                <span
                                  className={cn(
                                    'absolute right-2.5 text-[9px] font-bold transition-opacity',
                                    !char.isMain ? 'opacity-100 text-silver' : 'opacity-40 text-muted-foreground',
                                  )}
                                >
                                  ALT
                                </span>
                              </button>

                              <Badge className="border-border bg-muted/30 text-[10px]">{char.role}</Badge>

                              <button
                                type="button"
                                onClick={() => handleStartEdit(char)}
                                className="text-muted-foreground hover:text-gold transition p-1 rounded hover:bg-gold/10 cursor-pointer"
                                title="Düzenle"
                              >
                                <Edit3 className="size-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteCharacter(char.id)}
                                className="text-muted-foreground hover:text-destructive transition p-1 rounded hover:bg-destructive/10 cursor-pointer"
                                title="Sil"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60 text-[11px]">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Wrench className="size-3" /> {char.professions?.[0] || 'Yok'}, {char.professions?.[1] || 'Yok'}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <span className="text-muted-foreground">Attunement:</span>
                              <span className={cn('px-1.5 py-0.5 rounded border', char.attunements?.onyxia ? 'border-success/40 bg-success/10 text-success' : 'border-border text-muted-foreground')}>Ony</span>
                              <span className={cn('px-1.5 py-0.5 rounded border', char.attunements?.mc ? 'border-success/40 bg-success/10 text-success' : 'border-border text-muted-foreground')}>MC</span>
                              <span className={cn('px-1.5 py-0.5 rounded border', char.attunements?.bwl ? 'border-success/40 bg-success/10 text-success' : 'border-border text-muted-foreground')}>BWL</span>
                              <span className={cn('px-1.5 py-0.5 rounded border', char.attunements?.naxx ? 'border-success/40 bg-success/10 text-success' : 'border-border text-muted-foreground')}>Naxx</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Add New Character Form */}
          <form
            onSubmit={handleAddCharacter}
            noValidate
            className={cn(
              'flex flex-col gap-4 rounded-xl border p-4 bg-background/40',
              showStep1Errors && !step1Done ? 'border-red-500/70 ring-1 ring-red-500/25' : 'border-border',
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-display font-bold uppercase tracking-wider text-gold">
                {characters.length === 0 ? 'Main Karakterini Ekle & Doğrula' : 'Yeni Karakter Ekle (Alt / Yedek)'}
              </h4>
              <span className="text-[11px] text-muted-foreground">
                {characters.length === 0 ? 'İlk karakter otomatik Main olur' : 'Eklenen yeni karakter Alt olarak eklenir'}
              </span>
            </div>

            {/* Requirement #13: WoW Armory logo + mandatory name/surname warning */}
            <div className="flex items-center gap-3 rounded-xl border border-gold/45 bg-gold/10 px-3.5 py-3">
              <WowArmoryLogo className="size-10" />
              <div className="text-xs leading-relaxed">
                <p className="font-bold text-gold flex items-center gap-1.5">
                  WoW Forever Armory Kontrolü
                </p>
                <p className="text-foreground/95 font-medium mt-0.5">
                  Karakter İsim Soyisim bilgisini doğru yazmanız profil onayınız için zorunludur, dikkat ediniz.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-silver flex items-center justify-between">
                  <span>Karakter Adı *</span>
                  {showStep1Errors && !step1Done && !newFirstName.trim() && (
                    <span className="text-[10px] font-bold text-red-400">Zorunlu</span>
                  )}
                </label>
                <input
                  type="text"
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  placeholder="Karakter Adı"
                  className={cn(
                    inputClass,
                    showStep1Errors && !step1Done && (!newFirstName.trim() || (armoryFeedback && !armoryFeedback.ok))
                      ? errorInputClass
                      : '',
                  )}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-silver flex items-center justify-between">
                  <span>Karakter Soyadı *</span>
                  {showStep1Errors && !step1Done && !newLastName.trim() && (
                    <span className="text-[10px] font-bold text-red-400">Zorunlu</span>
                  )}
                </label>
                <input
                  type="text"
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
                  placeholder="Karakter Soyadı"
                  className={cn(
                    inputClass,
                    showStep1Errors && !step1Done && (!newLastName.trim() || (armoryFeedback && !armoryFeedback.ok))
                      ? errorInputClass
                      : '',
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-silver">Sınıf</label>
                <select
                  value={newClass}
                  onChange={(e) => handleClassChange(e.target.value as WowClass)}
                  className={inputClass}
                >
                  {WOW_CLASSES.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-silver">Irk</label>
                <select
                  value={newRace}
                  onChange={(e) => setNewRace(e.target.value as AllianceRace)}
                  className={inputClass}
                >
                  {racesForClass(newClass).map((race) => (
                    <option key={race} value={race}>{race}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-silver">Main Spec</label>
                <select
                  value={newSpec}
                  onChange={(e) => handleSpecChange(e.target.value)}
                  className={inputClass}
                >
                  {CLASS_SPECS[newClass].map((sp) => (
                    <option key={sp.label} value={sp.label}>{sp.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-silver">Off-Spec (OS)</label>
                <select
                  value={newOffSpec}
                  onChange={(e) => setNewOffSpec(e.target.value)}
                  className={inputClass}
                >
                  <option value="Yok">Yok</option>
                  {CLASS_SPECS[newClass].filter((s) => s.label !== newSpec).map((sp) => (
                    <option key={sp.label} value={sp.label}>{sp.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-silver">1. Meslek</label>
                <select value={prof1} onChange={(e) => setProf1(e.target.value)} className={inputClass}>
                  {PROFESSIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-silver">2. Meslek</label>
                <select value={prof2} onChange={(e) => setProf2(e.target.value)} className={inputClass}>
                  {PROFESSIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1 pt-1">
              <label className="text-[11px] font-semibold text-silver">Attunement Durumları</label>
              <div className="grid grid-cols-4 gap-2">
                <label className="flex items-center gap-1.5 text-[11px] text-silver cursor-pointer">
                  <input type="checkbox" checked={attOny} onChange={(e) => setAttOny(e.target.checked)} className="rounded border-border bg-background accent-[#d4af37]" /> Ony
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-silver cursor-pointer">
                  <input type="checkbox" checked={attMc} onChange={(e) => setAttMc(e.target.checked)} className="rounded border-border bg-background accent-[#d4af37]" /> MC
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-silver cursor-pointer">
                  <input type="checkbox" checked={attBwl} onChange={(e) => setAttBwl(e.target.checked)} className="rounded border-border bg-background accent-[#d4af37]" /> BWL
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-silver cursor-pointer">
                  <input type="checkbox" checked={attNaxx} onChange={(e) => setAttNaxx(e.target.checked)} className="rounded border-border bg-background accent-[#d4af37]" /> Naxx
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
              <GoldButton type="submit" disabled={armoryChecking} className="text-xs py-2.5 px-5 cursor-pointer">
                {armoryChecking ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> WoW Armory Kontrol Ediliyor...
                  </>
                ) : characters.length === 0 ? (
                  <>
                    <ShieldCheck className="size-4" /> WoW Armory ile Doğrula, Kaydet ve Devam Et
                  </>
                ) : (
                  <>
                    <Plus className="size-4" /> Karakteri Havuza Ekle
                  </>
                )}
              </GoldButton>

              {step1Done && (
                <GoldButton type="button" onClick={() => goToStep(2)} className="text-xs py-2.5 px-5 cursor-pointer">
                  Adım 2&apos;ye Devam Et <ChevronRight className="size-4" />
                </GoldButton>
              )}
            </div>
          </form>
        </Panel>
      )}

      {/* ===================================================================== */}
      {/* STEP 2: KİŞİSEL & KAYIT BİLGİLERİ                                    */}
      {/* ===================================================================== */}
      {activeStep === 2 && (
        <Panel className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <span className="text-[11px] font-bold tracking-widest text-neon uppercase">ADIM 2 / 5 · ZORUNLU</span>
              <h3 className="font-display text-lg font-bold text-gold flex items-center gap-2 mt-0.5">
                <Edit3 className="size-5" /> Kişisel & Kayıt Bilgileri
              </h3>
            </div>
            {step2Done && (
              <Badge className="border-success/50 bg-success/15 text-success px-3 py-1">
                <CheckCircle2 className="size-3.5 mr-1" /> Tamamlandı
              </Badge>
            )}
          </div>

          {/* Requirement #11: Exact red notice */}
          <div className="rounded-xl border-2 border-red-500/70 bg-red-500/12 p-4 flex items-start gap-3 shadow-[0_0_20px_rgba(239,68,68,0.12)]">
            <AlertTriangle className="size-5 shrink-0 text-red-400 mt-0.5" />
            <p className="text-xs sm:text-sm font-semibold leading-relaxed text-red-300">
              Kişisel bilgilerinizi gerçek bilgilerden farklı girmek ya da gerçek bilgilerinizi paylaşmak konusunda
              özgürsünüz. Özetle bu alanda ki bilgileri uydurabilirsiniz. Fakat raid planlamalarında erişilebilir olmak
              için gerçek bilgilerinizi paylaşmanız önerilir!
            </p>
          </div>

          <form onSubmit={(e) => void handleStep2Save(e, !profileComplete)} noValidate className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="profile-fullName" className="text-xs font-semibold text-silver flex items-center justify-between">
                <span>Gerçek İsim Soyisim *</span>
                {showStep2Errors && fieldErrors.fullName && (
                  <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-300">Eksik</span>
                )}
              </label>
              <input
                id="profile-fullName"
                type="text"
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                placeholder="İsim Soyisim"
                className={cn(inputClass, showStep2Errors && fieldErrors.fullName && errorInputClass)}
                aria-invalid={showStep2Errors && Boolean(fieldErrors.fullName)}
              />
              {showStep2Errors && fieldErrors.fullName && (
                <span className="text-[11px] font-medium text-red-400">{fieldErrors.fullName}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="profile-nickname" className="text-xs font-semibold text-silver">
                Profil İsmi / Nick (Opsiyonel)
              </label>
              <input
                id="profile-nickname"
                type="text"
                value={profile.nickname}
                onChange={(e) => setProfile({ ...profile, nickname: e.target.value })}
                placeholder="Profil ismi / Nick"
                className={inputClass}
              />
            </div>

            {/* Gerçek İsim Görünürlük Tercihi */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-background/50 md:col-span-2">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-silver">Guild Kadrosunda Gerçek İsmim Görünsün</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">
                  {profile.showRealNameInRoster
                    ? 'Açık: Kadro sayfasında karakterinizin altında adınız ve soyadınız listelenir.'
                    : 'Kapalı: Adınız ve soyadınız kadroda gizlenir, sadece oyun içi karakteriniz görünür.'}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={profile.showRealNameInRoster}
                onClick={() => setProfile({ ...profile, showRealNameInRoster: !profile.showRealNameInRoster })}
                className={cn(
                  'relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none',
                  profile.showRealNameInRoster
                    ? 'bg-emerald-600 border-emerald-500 shadow-[0_0_12px_rgb(16_185_129/0.4)]'
                    : 'bg-red-700/80 border-red-600 shadow-[0_0_10px_rgb(220_38_38/0.3)]',
                )}
                title={profile.showRealNameInRoster ? 'Açık: Gerçek isim kadroda görünüyor' : 'Kapalı: Gerçek isim gizli'}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block size-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center text-[11px] font-bold',
                    profile.showRealNameInRoster ? 'translate-x-7 text-emerald-700' : 'translate-x-0 text-red-700',
                  )}
                >
                  {profile.showRealNameInRoster ? '✓' : '✕'}
                </span>
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="profile-birthDate" className="text-xs font-semibold text-silver flex items-center justify-between">
                <span>Doğum Tarihi *</span>
                {showStep2Errors && fieldErrors.birthDate && (
                  <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-300">Eksik</span>
                )}
              </label>
              <input
                id="profile-birthDate"
                type="date"
                value={profile.birthDate}
                onChange={(e) => setProfile({ ...profile, birthDate: e.target.value })}
                className={cn(inputClass, showStep2Errors && fieldErrors.birthDate && errorInputClass)}
                aria-invalid={showStep2Errors && Boolean(fieldErrors.birthDate)}
              />
              {showStep2Errors && fieldErrors.birthDate && (
                <span className="text-[11px] font-medium text-red-400">{fieldErrors.birthDate}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="profile-gender" className="text-xs font-semibold text-silver flex items-center justify-between">
                <span>Cinsiyet *</span>
                {showStep2Errors && fieldErrors.gender && (
                  <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-300">Eksik</span>
                )}
              </label>
              <select
                id="profile-gender"
                value={profile.gender}
                onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                className={cn(inputClass, showStep2Errors && fieldErrors.gender && errorInputClass)}
              >
                <option value="Erkek">Erkek</option>
                <option value="Kadın">Kadın</option>
                <option value="Belirtmek İstemiyorum">Belirtmek İstemiyorum</option>
              </select>
              {showStep2Errors && fieldErrors.gender && (
                <span className="text-[11px] font-medium text-red-400">{fieldErrors.gender}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="profile-bnetId" className="text-xs font-semibold text-silver flex items-center justify-between">
                <span>Battle.net Real ID *</span>
                {showStep2Errors && fieldErrors.bnetId && (
                  <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-300">Eksik</span>
                )}
              </label>
              <input
                id="profile-bnetId"
                type="text"
                value={profile.bnetId}
                onChange={(e) => setProfile({ ...profile, bnetId: e.target.value })}
                placeholder="BattleTag#1234"
                className={cn(inputClass, showStep2Errors && fieldErrors.bnetId && errorInputClass)}
                aria-invalid={showStep2Errors && Boolean(fieldErrors.bnetId)}
              />
              {showStep2Errors && fieldErrors.bnetId && (
                <span className="text-[11px] font-medium text-red-400">{fieldErrors.bnetId}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="profile-email" className="text-xs font-semibold text-silver flex items-center justify-between">
                <span>E-posta Adresi *</span>
                {showStep2Errors && fieldErrors.email && (
                  <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-300">Eksik</span>
                )}
              </label>
              <input
                id="profile-email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder="eposta@ornek.com"
                className={cn(inputClass, showStep2Errors && fieldErrors.email && errorInputClass)}
                aria-invalid={showStep2Errors && Boolean(fieldErrors.email)}
              />
              {showStep2Errors && fieldErrors.email && (
                <span className="text-[11px] font-medium text-red-400">{fieldErrors.email}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label htmlFor="profile-phoneNumber" className="text-xs font-semibold text-silver flex items-center justify-between">
                <span>Telefon Numarası *</span>
                {showStep2Errors && fieldErrors.phoneNumber && (
                  <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-300">Eksik</span>
                )}
              </label>
              <div className="flex gap-2">
                <select
                  value={profile.phoneCountry}
                  onChange={(e) => setProfile({ ...profile, phoneCountry: e.target.value })}
                  className={cn(inputClass, 'w-36 shrink-0')}
                >
                  <option value="+90">🇹🇷 +90 (TR)</option>
                  <option value="+49">🇩🇪 +49 (DE)</option>
                  <option value="+44">🇬🇧 +44 (UK)</option>
                  <option value="+1">🇺🇸 +1 (US)</option>
                  <option value="+31">🇳🇱 +31 (NL)</option>
                  <option value="+33">🇫🇷 +33 (FR)</option>
                  <option value="+43">🇦🇹 +43 (AT)</option>
                </select>
                <input
                  id="profile-phoneNumber"
                  type="tel"
                  value={profile.phoneNumber}
                  onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
                  placeholder="5XX XXX XX XX"
                  className={cn(inputClass, 'flex-1', showStep2Errors && fieldErrors.phoneNumber && errorInputClass)}
                  aria-invalid={showStep2Errors && Boolean(fieldErrors.phoneNumber)}
                />
              </div>
              {showStep2Errors && fieldErrors.phoneNumber && (
                <span className="text-[11px] font-medium text-red-400">{fieldErrors.phoneNumber}</span>
              )}
            </div>

            {/* Avatar Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-background/50 md:col-span-2">
              <div className="flex items-center gap-3">
                <div
                  onClick={() => setAvatarModalOpen(true)}
                  className="relative size-12 rounded-xl border-2 border-gold/70 overflow-hidden shadow-md shrink-0 cursor-pointer group"
                  title="Simgeyi değiştirmek için tıklayın"
                >
                  <Image
                    src={getAvatarSrc(profile.selectedAvatar)}
                    alt="Seçili Avatar"
                    width={48}
                    height={48}
                    className="size-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-gold">
                    <Edit3 className="size-4" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-silver">Profil Avatar Simgesi</span>
                  <span className="text-[11px] text-gold font-bold">{getAvatarName(profile.selectedAvatar)}</span>
                  <span className="text-[10px] text-muted-foreground">
                    WoW Forever / Classic koleksiyonundan 30 özel simge
                  </span>
                </div>
              </div>
              <GhostButton
                type="button"
                onClick={() => setAvatarModalOpen(true)}
                className="text-xs py-1.5 px-3 border border-gold/40 text-gold hover:bg-gold/15 cursor-pointer"
              >
                <Sparkles className="size-3.5 mr-1.5 text-gold" />
                Simgemi Değiştir (30 İkon)
              </GhostButton>
            </div>

            <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60">
              <GhostButton type="button" onClick={() => goToStep(1)} className="text-xs cursor-pointer">
                <ChevronLeft className="size-4" /> Önceki Adım (Main Karakter)
              </GhostButton>
              <div className="flex items-center gap-2">
                {profileComplete && (
                  <GhostButton
                    type="button"
                    disabled={savingStep}
                    onClick={() => goToStep(3)}
                    className="text-xs cursor-pointer"
                  >
                    Adım 3&apos;e Geç <ChevronRight className="size-4" />
                  </GhostButton>
                )}
                <GoldButton type="submit" disabled={savingStep} className="text-xs py-2.5 px-5 cursor-pointer">
                  {savingStep ? 'Kaydediliyor...' : profileComplete ? 'Değişiklikleri Kaydet' : 'Kaydet ve Devam Et →'}
                </GoldButton>
              </div>
            </div>
          </form>
        </Panel>
      )}

      {/* ===================================================================== */}
      {/* STEP 3: HAFTALIK RAİD MÜSAİTLİĞİ (ZORUNLU + RAİD DIŞI SEÇENEĞİ)      */}
      {/* ===================================================================== */}
      {activeStep === 3 && (
        <Panel
          className={cn(
            'flex flex-col gap-5',
            showStep3Errors && !step3Done && 'border-red-500/80 ring-2 ring-red-500/25',
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <span className="text-[11px] font-bold tracking-widest text-neon uppercase">ADIM 3 / 5 · ZORUNLU</span>
              <h3 className="font-display text-lg font-bold text-gold flex items-center gap-2 mt-0.5">
                <Calendar className="size-5" /> Haftalık Müsaitlik & Saat Aralığı
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">UTC+3 (Türkiye Saati)</span>
              {step3Done && (
                <Badge className="border-success/50 bg-success/15 text-success px-2.5 py-0.5">
                  <CheckCircle2 className="size-3.5 mr-1" /> Tamamlandı
                </Badge>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Bu adım zorunludur. Raid planlaması için en az bir günü{' '}
            <span className="text-success font-semibold">Yeşil (Müsait)</span> veya{' '}
            <span className="text-gold font-semibold">Sarı (Belki)</span> olarak güncelleyin; ya da raidlere katılmayı
            düşünmüyorsanız aşağıdaki seçeneği işaretleyerek bu adımı atlayın.
          </p>

          {/* Requirement #12: Skip Raids Option */}
          <label
            className={cn(
              'flex items-start gap-3.5 rounded-xl border-2 p-4 transition cursor-pointer select-none',
              profile.skipRaidsForNow
                ? 'border-gold bg-gold/15 shadow-[0_0_16px_rgba(212,175,55,0.2)]'
                : showStep3Errors && !step3Done
                  ? 'border-red-500/70 bg-red-500/[0.06] hover:border-red-400'
                  : 'border-border bg-background/60 hover:border-gold/40',
            )}
          >
            <input
              type="checkbox"
              checked={profile.skipRaidsForNow}
              onChange={(e) => {
                setProfile((prev) => ({
                  ...prev,
                  skipRaidsForNow: e.target.checked,
                }))
                if (e.target.checked) setShowStep3Errors(false)
              }}
              className="mt-1 size-4.5 accent-[#d4af37] shrink-0 cursor-pointer"
            />
            <div className="flex flex-col gap-0.5">
              <span className="font-display text-sm font-bold tracking-wide text-gold">
                RAIDLERE KATILMAYI ŞİMDİLİK DÜŞÜNMÜYORUM
              </span>
              <span className="text-xs text-muted-foreground">
                Bu seçeneği işaretlerseniz haftalık gün ve saat doldurmadan bu zorunlu adımı geçebilirsiniz. Fikriniz
                değiştiğinde profilinizden dilediğiniz zaman müsaitlik girebilirsiniz.
              </span>
            </div>
          </label>

          {showStep3Errors && !step3Done && (
            <div className="rounded-lg border border-red-500/70 bg-red-500/12 px-3.5 py-2.5 text-xs font-medium text-red-300 flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0 text-red-400" />
              {fieldErrors.availability}
            </div>
          )}

          {/* 7-Day Availability Grid */}
          <div
            className={cn(
              'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 transition-opacity',
              profile.skipRaidsForNow && 'opacity-45 pointer-events-none',
              showStep3Errors && !step3Done && 'p-2 rounded-xl border border-red-500/60 bg-red-500/[0.04]',
            )}
          >
            {DAYS_OF_WEEK.map(({ key, label }) => {
              const dayData = profile.availability[key] || { status: 'busy', startTime: '21:00', endTime: '00:00' }

              let statusBg = 'border-destructive/60 bg-destructive/10 text-destructive shadow-[0_0_8px_rgb(239_68_68/0.15)]'
              let statusText = 'Meşgul'
              if (dayData.status === 'available') {
                statusBg = 'border-success/60 bg-success/15 text-success shadow-[0_0_12px_rgb(62_224_127/0.2)]'
                statusText = 'Müsait'
              } else if (dayData.status === 'maybe') {
                statusBg = 'border-gold/60 bg-gold/15 text-gold shadow-[0_0_12px_rgb(212_175_55/0.2)]'
                statusText = 'Belki'
              }

              return (
                <div key={key} className="flex flex-col gap-2 rounded-xl border border-border bg-background/60 p-3">
                  <button
                    type="button"
                    onClick={() => cycleAvailability(key)}
                    className={cn(
                      'flex flex-col items-center justify-center py-2.5 rounded-lg border transition-all cursor-pointer font-display font-bold',
                      statusBg,
                    )}
                  >
                    <span className="text-sm">{label}</span>
                    <span className="text-[11px] mt-0.5 tracking-wide">{statusText}</span>
                  </button>

                  <div className="flex flex-col gap-1.5 pt-1">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="size-3" /> Başlangıç
                    </div>
                    <select
                      value={dayData.startTime}
                      onChange={(e) => updateDayTime(key, 'startTime', e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-2 py-1 text-[11px] text-silver font-mono"
                    >
                      {START_TIME_OPTIONS.map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-1">
                      <Clock className="size-3" /> Bitiş
                    </div>
                    <select
                      value={dayData.endTime}
                      onChange={(e) => updateDayTime(key, 'endTime', e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-2 py-1 text-[11px] text-silver font-mono"
                    >
                      {END_TIME_OPTIONS.map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60">
            <GhostButton type="button" onClick={() => goToStep(2)} className="text-xs cursor-pointer">
              <ChevronLeft className="size-4" /> Önceki Adım (Kişisel Bilgiler)
            </GhostButton>
            <div className="flex items-center gap-2">
              {profileComplete && (
                <GhostButton type="button" onClick={() => goToStep(4)} className="text-xs cursor-pointer">
                  Adım 4&apos;e Geç <ChevronRight className="size-4" />
                </GhostButton>
              )}
              <GoldButton
                type="button"
                onClick={() => void handleSaveAvailability(!profileComplete)}
                disabled={savingAvailability}
                className="text-xs py-2.5 px-5 cursor-pointer"
              >
                <Calendar className="size-3.5 mr-1" />
                {savingAvailability
                  ? 'Kaydediliyor...'
                  : profileComplete
                    ? 'Müsaitlik Tercihlerini Kaydet'
                    : 'Kaydet ve Devam Et →'}
              </GoldButton>
            </div>
          </div>
        </Panel>
      )}

      {/* ===================================================================== */}
      {/* STEP 4: HESAP BAĞLANTILARI & YAYINCI KANALLARI (OPSİYONEL)            */}
      {/* ===================================================================== */}
      {activeStep === 4 && (
        <Panel className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <span className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
                ADIM 4 / 5 · OPSİYONEL
              </span>
              <h3 className="font-display text-lg font-bold text-gold flex items-center gap-2 mt-0.5">
                <Link2 className="size-5" /> Hesap Bağlantıları & Yayın Kanalları
              </h3>
            </div>
            <Badge className="border-border bg-muted/40 text-silver text-xs">İsteğe Bağlı</Badge>
          </div>

          <div className="grid gap-3">
            {/* Discord */}
            <div className="flex items-center justify-between gap-3 p-4 rounded-xl border border-border bg-background/50">
              <div className="flex min-w-0 items-center gap-3">
                <div className="size-10 shrink-0 rounded-xl bg-[#5865f2]/15 border border-[#5865f2]/40 flex items-center justify-center text-[#a5adff] font-bold">
                  DC
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-silver">Discord Hesabı</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {profile.discordConnected && profile.discordTag ? `@${profile.discordTag}` : 'Lonca Discord’unu bağla'}
                  </div>
                </div>
              </div>
              {profile.discordConnected && profile.discordTag ? (
                <div className="flex shrink-0 items-center gap-2">
                  <Badge className="border-success/40 bg-success/10 text-success">Bağlı</Badge>
                  <GhostButton
                    type="button"
                    className="text-xs py-1.5 px-2.5 cursor-pointer"
                    onClick={() => setLinkModal({ open: true, provider: 'discord', value: profile.discordTag })}
                  >
                    Düzenle
                  </GhostButton>
                  <GhostButton
                    type="button"
                    className="text-xs py-1.5 px-2.5 text-destructive hover:bg-destructive/10 cursor-pointer"
                    onClick={() => disconnectOauth('discord')}
                  >
                    Kaldır
                  </GhostButton>
                </div>
              ) : (
                <GoldButton
                  type="button"
                  onClick={() => setLinkModal({ open: true, provider: 'discord', value: profile.discordTag || '' })}
                  className="text-xs py-1.5 px-3 shrink-0 cursor-pointer"
                >
                  + Hesap Bağla
                </GoldButton>
              )}
            </div>

            {/* Battle.net */}
            <div className="flex items-center justify-between gap-3 p-4 rounded-xl border border-border bg-background/50">
              <div className="flex min-w-0 items-center gap-3">
                <div className="size-10 shrink-0 rounded-xl bg-neon/10 border border-neon/30 flex items-center justify-center text-neon font-bold">
                  BN
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-silver">Battle.net Hesabı</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {profile.bnetConnected && profile.bnetId ? profile.bnetId : (profile.bnetId || 'BattleTag doğrulamak için bağla')}
                  </div>
                </div>
              </div>
              {profile.bnetConnected && profile.bnetId ? (
                <div className="flex shrink-0 items-center gap-2">
                  <Badge className="border-success/40 bg-success/10 text-success">Bağlı</Badge>
                  <GhostButton
                    type="button"
                    className="text-xs py-1.5 px-2.5 cursor-pointer"
                    onClick={() => setLinkModal({ open: true, provider: 'bnet', value: profile.bnetId })}
                  >
                    Düzenle
                  </GhostButton>
                  <GhostButton
                    type="button"
                    className="text-xs py-1.5 px-2.5 text-destructive hover:bg-destructive/10 cursor-pointer"
                    onClick={() => disconnectOauth('bnet')}
                  >
                    Kaldır
                  </GhostButton>
                </div>
              ) : (
                <GoldButton
                  type="button"
                  onClick={() => setLinkModal({ open: true, provider: 'bnet', value: profile.bnetId || '' })}
                  className="text-xs py-1.5 px-3 shrink-0 cursor-pointer"
                >
                  + Hesap Bağla
                </GoldButton>
              )}
            </div>

            {/* Streaming Channels (Generic placeholders per Requirement #5) */}
            {[
              {
                key: 'twitch' as const,
                mark: 'TW',
                markClass: 'bg-[#9146ff]/15 border-[#9146ff]/40 text-[#c4a5ff]',
                title: 'Twitch kanalı',
                value: profile.twitchLogin,
                placeholder: 'kullaniciadi veya twitch.tv/kullaniciadi',
                onChange: (value: string) =>
                  setProfile({ ...profile, twitchLogin: value, twitchConnected: Boolean(value.trim()) }),
                nextProfile: () => ({ ...profile, twitchConnected: Boolean(profile.twitchLogin.trim()) }),
              },
              {
                key: 'kick' as const,
                mark: 'KK',
                markClass: 'bg-[#53fc18]/10 border-[#53fc18]/40 text-[#9dff8a]',
                title: 'Kick kanalı',
                value: profile.kickLogin,
                placeholder: 'kullaniciadi veya kick.com/kullaniciadi',
                onChange: (value: string) => setProfile({ ...profile, kickLogin: value }),
                nextProfile: () => profile,
              },
              {
                key: 'youtube' as const,
                mark: 'YT',
                markClass: 'bg-red-500/10 border-red-500/40 text-red-300',
                title: 'YouTube kanalı',
                value: profile.youtubeHandle,
                placeholder: '@kanal veya youtube.com/@kanal',
                onChange: (value: string) => setProfile({ ...profile, youtubeHandle: value }),
                nextProfile: () => profile,
              },
            ].map((channel) => (
              <div key={channel.key} className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-background/50">
                <div className="flex items-center gap-3">
                  <div className={cn('size-10 shrink-0 rounded-xl border flex items-center justify-center font-bold', channel.markClass)}>
                    {channel.mark}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-silver">{channel.title}</div>
                    <div className="text-xs text-muted-foreground">
                      Kullanıcı veya kanal adını yaz. Yayındayken ana sayfada Online + önizleme, değilse kısa Offline satırı görünür.
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    value={channel.value}
                    onChange={(e) => channel.onChange(e.target.value)}
                    className={inputClass}
                    placeholder={channel.placeholder}
                    autoComplete="off"
                  />
                  <GoldButton
                    type="button"
                    className="text-xs py-1.5 px-3 shrink-0 cursor-pointer"
                    onClick={async () => {
                      const filled = Boolean(channel.value.trim())
                      await persistGate(channel.nextProfile(), characters)
                      toast({
                        title: filled ? `${channel.title} kaydedildi` : `${channel.title} temizlendi`,
                        description: 'Kanal Stream Radar’da görünür. Yayın açınca Discord bildirimi gider.',
                      })
                    }}
                  >
                    Kaydet
                  </GoldButton>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60">
            <GhostButton type="button" onClick={() => goToStep(3)} className="text-xs cursor-pointer">
              <ChevronLeft className="size-4" /> Önceki Adım (Müsaitlik)
            </GhostButton>
            <GoldButton
              type="button"
              onClick={async () => {
                await persistGate(profile, characters)
                goToStep(5)
              }}
              className="text-xs py-2.5 px-5 cursor-pointer"
            >
              Kaydet ve Son Adıma Geç →
            </GoldButton>
          </div>
        </Panel>
      )}

      {/* ===================================================================== */}
      {/* STEP 5: LONCA GÖREVLERİ, ANKET & PROFİL ONAYI (SİTE ERİŞİMİNİ AÇ)    */}
      {/* ===================================================================== */}
      {activeStep === 5 && (
        <div className="flex flex-col gap-6">
          {/* Verification Summary & Unlock Panel */}
          <Panel className="border-gold/45 bg-gradient-to-br from-gold/10 via-[#0a1b2e] to-card flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <span className="text-[11px] font-bold tracking-widest text-neon uppercase">ADIM 5 / 5 · SON ADIM</span>
                <h3 className="font-display text-lg font-bold text-gold flex items-center gap-2 mt-0.5">
                  <UserCheck className="size-5" /> Profil Doğrulama Özeti & Site Erişimi
                </h3>
              </div>
              {profileComplete ? (
                <Badge className="border-success/50 bg-success/15 text-success px-3 py-1">
                  <Unlock className="size-3.5 mr-1" /> Tüm Site Alanları Açık
                </Badge>
              ) : (
                <Badge className="border-gold/50 bg-gold/15 text-gold px-3 py-1">
                  Son Onay Bekleniyor
                </Badge>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  step: 1 as WizardStep,
                  label: '1. Main Karakter & WoW Armory (TURX)',
                  ok: step1Done,
                  detail: mainChar
                    ? `${mainChar.firstName} ${mainChar.lastName}${step1Done ? ' · TURX Onaylı' : ' · Doğrulama eksik'}`
                    : 'Main karakter eklenmedi',
                },
                {
                  step: 2 as WizardStep,
                  label: '2. Kişisel & İletişim Bilgileri',
                  ok: step2Done,
                  detail: step2Done ? `${profile.fullName} · ${profile.bnetId}` : 'Zorunlu alanlarda eksikler var',
                },
                {
                  step: 3 as WizardStep,
                  label: '3. Haftalık Raid Müsaitliği',
                  ok: step3Done,
                  detail: profile.skipRaidsForNow
                    ? 'Raidlere şimdilik katılmama seçildi'
                    : step3Done
                      ? 'Müsait günler belirlendi'
                      : 'Henüz belirlenmedi',
                },
              ].map((row) => (
                <div
                  key={row.step}
                  className={cn(
                    'rounded-xl border p-3.5 flex flex-col justify-between gap-2',
                    row.ok ? 'border-success/45 bg-success/[0.08]' : 'border-red-500/60 bg-red-500/[0.08]',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-foreground">{row.label}</span>
                    {row.ok ? (
                      <CheckCircle2 className="size-4 shrink-0 text-success" />
                    ) : (
                      <AlertTriangle className="size-4 shrink-0 text-red-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{row.detail}</p>
                  {!row.ok && (
                    <button
                      type="button"
                      onClick={() => goToStep(row.step)}
                      className="self-start text-[11px] font-semibold text-red-300 underline hover:text-red-200 cursor-pointer"
                    >
                      Adım {row.step}&apos;e dönüp tamamla →
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
              <GhostButton type="button" onClick={() => goToStep(4)} className="text-xs cursor-pointer">
                <ChevronLeft className="size-4" /> Önceki Adım (Bağlantılar)
              </GhostButton>
              <GoldButton
                type="button"
                disabled={savingStep}
                onClick={() => void handleFinalUnlock()}
                className="text-sm py-2.5 px-6 cursor-pointer shadow-lg shadow-gold/25"
              >
                <Unlock className="size-4 mr-1" />
                {savingStep
                  ? 'Kontrol Ediliyor...'
                  : profileComplete
                    ? 'Tüm Profili Güncelle & Kaydet'
                    : 'Profili Onayla ve Siteye Erişimi Aç'}
              </GoldButton>
            </div>
          </Panel>

          {/* Staff Roles & Guild Poll */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Panel className="flex flex-col gap-4">
              <h3 className="font-display text-lg font-bold text-gold flex items-center gap-2 border-b border-border pb-3">
                Lonca Görevleri (Opsiyonel)
              </h3>
              <p className="text-xs text-muted-foreground">
                TURX kadrosunda aktif rol almak istediğin görevleri işaretle. GM panelinde kimlerin talip olduğu görünür.
              </p>
              <ul className="grid gap-2">
                {STAFF_ROLES.map((role) => {
                  const selected = staffInterests.includes(role.id)
                  return (
                    <li key={role.id}>
                      <label
                        className={cn(
                          'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition',
                          selected ? 'border-gold/50 bg-gold/10' : 'border-border hover:border-neon/30',
                        )}
                      >
                        <input
                          type="checkbox"
                          className="mt-2 accent-[#d4af37]"
                          checked={selected}
                          onChange={() => {
                            setStaffInterests((current) =>
                              current.includes(role.id)
                                ? current.filter((id) => id !== role.id)
                                : [...current, role.id],
                            )
                          }}
                        />
                        <StaffRoleBadge id={role.id} />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-foreground">{role.title}</span>
                          <span className="block text-xs text-gold">{openPositionsLabel(role.slots)}</span>
                          <span className="block text-xs text-muted-foreground">{role.blurb}</span>
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
              <div className="flex justify-end">
                <GoldButton
                  type="button"
                  onClick={() => {
                    void persistGate(profile, characters).then(({ complete }) => {
                      toast({
                        title: 'Görev tercihleri kaydedildi',
                        description: complete
                          ? 'GM panelinde görünür.'
                          : 'Tercihlerin kaydedildi. Profil kilidini açmak için zorunlu adımları tamamla.',
                      })
                    })
                  }}
                >
                  Görev tercihlerini kaydet
                </GoldButton>
              </div>
            </Panel>

            <ProfilePollSection />
          </div>
        </div>
      )}

      {/* Account Linking Modal (Generic placeholders per Requirement #5) */}
      {linkModal && (
        <Modal
          open={linkModal.open}
          onClose={() => setLinkModal(null)}
          title={linkModal.provider === 'discord' ? 'Discord Hesabı Bağla' : 'Battle.net Hesabı Bağla'}
          description={
            linkModal.provider === 'discord'
              ? 'Lonca Discord sunucumuzdaki rol ve online/offline durumunuzun kadroda görünmesi için Discord kullanıcı adınızı girin.'
              : 'World of Warcraft ve Battle.net durumunuzun guild kadrosunda anlık olarak yeşil/kırmızı nokta ile görünmesi için BattleTag bilginizi girin.'
          }
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-silver">
                {linkModal.provider === 'discord' ? 'Discord Kullanıcı Adı / Tag *' : 'BattleTag (Real ID) *'}
              </label>
              <input
                type="text"
                value={linkModal.value}
                onChange={(e) => setLinkModal({ ...linkModal, value: e.target.value })}
                placeholder={linkModal.provider === 'discord' ? 'Discord kullanıcı adı' : 'BattleTag#1234'}
                className={inputClass}
                autoFocus
              />
              <span className="text-[11px] text-muted-foreground">
                {linkModal.provider === 'discord'
                  ? 'Discord profilinizde görünen kullanıcı adınızı (başında @ olmadan da yazabilirsiniz) girin.'
                  : 'Blizzard BattleTag bilginizi (İsim#Sayı) formatında girin.'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border">
              {oauthReady[linkModal.provider] ? (
                <GhostButton
                  type="button"
                  className="text-xs w-full sm:w-auto"
                  onClick={() => startOauth(linkModal.provider)}
                >
                  OAuth ile Yetkilendir
                </GhostButton>
              ) : (
                <span className="text-[11px] text-muted-foreground">Doğrudan hesap eşlemesi</span>
              )}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <GhostButton type="button" onClick={() => setLinkModal(null)}>
                  İptal
                </GhostButton>
                <GoldButton
                  type="button"
                  disabled={!linkModal.value.trim() || linkingBusy}
                  onClick={() => void connectManual(linkModal.provider, linkModal.value)}
                >
                  {linkingBusy ? 'Bağlanıyor...' : 'Bağla & Kaydet'}
                </GoldButton>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {avatarModalOpen && (
        <AvatarPickerModal
          open={avatarModalOpen}
          onClose={() => setAvatarModalOpen(false)}
          selectedAvatar={profile.selectedAvatar}
          onSelect={handleSelectAvatar}
        />
      )}
    </div>
  )
}
