'use client'

import { useState, useEffect } from 'react'
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
  getOnboardingGaps,
  loadOnboardingCharacters,
  loadOnboardingProfile,
  saveOnboardingSnapshot,
} from '@/lib/profile-gate'
import { openPositionsLabel, STAFF_ROLES, type StaffRoleId } from '@/lib/staff-roles'
import { cn } from '@/lib/utils'
import { getAvatarName, getAvatarSrc, WOW_AVATARS, WOW_AVATAR_CATEGORIES, type WowAvatarCategory } from '@/lib/wow-avatars'
import { StaffRoleBadge } from '../staff-role-icons'
import { useAuth } from '../auth-provider'
import { useToast } from '../toast'
import { Badge, GhostButton, GoldButton, Modal, Panel, SectionHeader, inputClass } from '../ui'
import {
  Plus,
  Trash2,
  Shield,
  Calendar,
  Link2,
  CheckCircle2,
  Edit3,
  Wrench,
  Clock,
  Swords,
  Wand2,
  Sparkles,
  Footprints,
  Flame,
  Cross,
  Target,
  Anchor,
  Lock,
  Vote,
  Mail,
  Bell,
  ChevronDown,
  ChevronUp,
  Check,
  CheckCheck,
  FileText,
  ExternalLink,
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
  availability: Record<string, { status: AvailabilityStatus; startTime: string; endTime: string }>
}

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
  'Herbalism', 'Leatherworking', 'Mining', 'Skinning', 'Tailoring'
]

const AVATAR_CLASSES = [
  { key: 'Warrior' as const, label: 'Warrior', color: CLASS_COLORS.Warrior, icon: Swords, bg: 'bg-[#C69B6D]/20' },
  { key: 'Paladin' as const, label: 'Paladin', color: CLASS_COLORS.Paladin, icon: Shield, bg: 'bg-[#F48CBA]/20' },
  { key: 'Hunter' as const, label: 'Hunter', color: CLASS_COLORS.Hunter, icon: Target, bg: 'bg-[#AAD372]/20' },
  { key: 'Rogue' as const, label: 'Rogue', color: CLASS_COLORS.Rogue, icon: Footprints, bg: 'bg-[#FFF468]/20' },
  { key: 'Priest' as const, label: 'Priest', color: CLASS_COLORS.Priest, icon: Cross, bg: 'bg-white/20' },
  { key: 'Shaman' as const, label: 'Shaman', color: CLASS_COLORS.Shaman, icon: Anchor, bg: 'bg-[#0070DD]/20' },
  { key: 'Mage' as const, label: 'Mage', color: CLASS_COLORS.Mage, icon: Wand2, bg: 'bg-[#3FC7EB]/20' },
  { key: 'Warlock' as const, label: 'Warlock', color: CLASS_COLORS.Warlock, icon: Flame, bg: 'bg-[#8788EE]/20' },
  { key: 'Druid' as const, label: 'Druid', color: CLASS_COLORS.Druid, icon: Sparkles, bg: 'bg-[#FF7C0A]/20' },
]

const START_TIME_OPTIONS = ['19:00', '19:30', '20:00', '20:30', '21:00']
const END_TIME_OPTIONS = ['23:00', '23:30', '00:00', '00:30', '01:00']

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
                voted && 'cursor-default'
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
                {/* Sol: Gönderen + Kategori + Başlık */}
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <span className="text-base shrink-0 select-none">{msg.icon || '📢'}</span>

                  {/* Sender Badge */}
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

                  {/* Kategori Badge */}
                  <span
                    className={cn(
                      'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold border leading-none hidden md:inline-block',
                      categoryBadgeClass[msg.category] || categoryBadgeClass.GENEL,
                    )}
                  >
                    {msg.category}
                  </span>

                  {/* Mesaj Başlığı */}
                  <span
                    className={cn(
                      'truncate text-xs font-semibold',
                      !msg.isRead ? 'text-foreground font-bold' : 'text-silver',
                    )}
                  >
                    {msg.title}
                  </span>
                </div>

                {/* Sağ: Tarih + Okundu Tiki / Butonu */}
                <div className="flex shrink-0 items-center justify-between sm:justify-end gap-3 text-xs pl-2 border-t sm:border-t-0 pt-1.5 sm:pt-0 border-border/40">
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {formatShortDate(msg.createdAt)}
                  </span>

                  {/* Okundu Durumu & Tik Alanı */}
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

          {/* 3'ten fazla mesaj varsa "Daha Fazla Göster" toggle */}
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

      {/* Mesaj Detay Modalı */}
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
        {/* Kategori Sekmeleri */}
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

        {/* İkon Tablosu */}
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
    const found = CLASS_SPECS[newClass].find(s => s.label === specLabel)
    if (found) {
      setNewRole(found.role)
    }
  }

  useEffect(() => {
    if (!user) {
      setProfile(emptyProfile(''))
      setCharacters([])
      setReady(false)
      return
    }

    let cancelled = false
    const localProfile = loadOnboardingProfile(user.username) as Partial<UserProfileData> | null
    const localCharacters = loadOnboardingCharacters(user.username) as GuildCharacter[]

    const applyLocal = () => {
      setProfile(
        localProfile
          ? {
              ...emptyProfile(user.email),
              ...localProfile,
              selectedAvatar: localProfile.selectedAvatar || 'Druid',
              availability: normalizeAvailability(localProfile.availability),
            }
          : emptyProfile(user.email),
      )
      setCharacters(Array.isArray(localCharacters) ? localCharacters : [])
      setReady(true)
    }

    applyLocal()

    fetch('/api/profile', { credentials: 'same-origin', headers: authHeaders() })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          profile?: Partial<UserProfileData> | null
          characters?: GuildCharacter[]
          staffInterests?: StaffRoleId[]
          oauth?: { discord?: boolean; bnet?: boolean; twitch?: boolean }
        }
        if (!response.ok || cancelled) return
        if (data.profile) {
          setProfile({
            ...emptyProfile(user.email),
            ...data.profile,
            selectedAvatar: data.profile.selectedAvatar || 'Druid',
            availability: normalizeAvailability(data.profile.availability),
          })
        }
        if (Array.isArray(data.characters)) setCharacters(data.characters)
        if (Array.isArray(data.staffInterests)) setStaffInterests(data.staffInterests)
        if (data.oauth) {
          setOauthReady({
            discord: Boolean(data.oauth.discord),
            bnet: Boolean(data.oauth.bnet),
            twitch: Boolean(data.oauth.twitch),
          })
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
        toast({ title: 'Bağlantı Başarısız', description: data.error || 'İşlem gerçekleştirilemedi.' })
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
      toast({ title: 'Bağlantı Hatası', description: 'Sunucuya ulaşılamadı. Tekrar deneyin.' })
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
        toast({ title: 'Kaldırılamadı', description: data.error || 'Bağlantı kaldırılamadı.' })
        return
      }
      if (provider === 'discord') setProfile((prev) => ({ ...prev, discordConnected: false, discordTag: '' }))
      if (provider === 'bnet') setProfile((prev) => ({ ...prev, bnetConnected: false, bnetId: '' }))
      if (provider === 'twitch') {
        setProfile((prev) => ({ ...prev, twitchConnected: false, twitchLogin: '', twitchDisplayName: '' }))
      }
      toast({ title: 'Bağlantı kaldırıldı', description: 'Hesap bağlantısı silindi.' })
    } catch {
      toast({ title: 'Bağlantı kaldırılamadı', description: 'Tekrar dene.' })
    }
  }

  useEffect(() => {
    if (!ready || !user) return
    saveOnboardingSnapshot(user.username, profile, characters)
  }, [profile, characters, ready, user])

  const persistGate = async (nextProfile: UserProfileData, nextCharacters: GuildCharacter[]) => {
    if (!user) return false
    saveOnboardingSnapshot(user.username, nextProfile, nextCharacters)
    commitOnboardingStatus(user.username, nextProfile, nextCharacters)
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ profile: nextProfile, characters: nextCharacters, staffInterests }),
      })
      const data = (await response.json().catch(() => ({}))) as { profileComplete?: boolean; error?: string }
      if (!response.ok) {
        toast({ title: 'Sunucuya kaydedilemedi', description: data.error || 'Profil tarayıcıda kaldı.' })
      }
      await refreshProfileGate()
      return Boolean(data.profileComplete ?? commitOnboardingStatus(user.username, nextProfile, nextCharacters))
    } catch {
      await refreshProfileGate()
      return commitOnboardingStatus(user.username, nextProfile, nextCharacters)
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast({ title: 'Giriş gerekli', description: 'Profil kaydetmek için önce oturum açın.' })
      return
    }
    const complete = await persistGate(profile, characters)
    if (!complete) {
      const gaps = getOnboardingGaps(profile, characters).join(', ')
      toast({
        title: 'Profil kilitli kaldı',
        description: `Eksik: ${gaps}. Kaydettikten sonra diğer sekmelere geçebilirsin.`,
      })
      return
    }
    toast({ title: 'Profil Güncellendi', description: 'Hesap bilgileriniz kaydedildi. Lonca paneli açıldı.' })
  }

  const cycleAvailability = (dayKey: string) => {
    setProfile(prev => {
      const current = prev.availability[dayKey]?.status || 'busy'
      let nextStatus: AvailabilityStatus = 'available'
      if (current === 'busy') nextStatus = 'available'
      else if (current === 'available') nextStatus = 'maybe'
      else if (current === 'maybe') nextStatus = 'busy'

      return {
        ...prev,
        availability: {
          ...prev.availability,
          [dayKey]: { ...(prev.availability[dayKey] || defaultDayAvailability()), status: nextStatus }
        }
      }
    })
  }

  const updateDayTime = (dayKey: string, field: 'startTime' | 'endTime', val: string) => {
    setProfile(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        [dayKey]: { 
          ...(prev.availability[dayKey] || defaultDayAvailability()), 
          [field]: val 
        }
      }
    }))
  }

  const handleSaveAvailability = async () => {
    if (!user) {
      toast({ title: 'Giriş gerekli', description: 'Müsaitlik kaydetmek için önce oturum açın.' })
      return
    }
    setSavingAvailability(true)
    try {
      const normalizedProfile = {
        ...profile,
        availability: normalizeAvailability(profile.availability),
      }
      setProfile(normalizedProfile)
      await persistGate(normalizedProfile, characters)
      toast({
        title: 'Müsaitlik Güncellendi! 📅',
        description: 'Haftalık raid müsaitlik tercihleriniz (Meşgul/Müsait/Belki) kaydedildi ve GM paneline aktarıldı.',
      })
    } catch {
      toast({ title: 'Kaydedilemedi', description: 'Sunucuya ulaşılamadı.' })
    } finally {
      setSavingAvailability(false)
    }
  }

  const handleSetMain = (id: string) => {
    const nextCharacters = characters.map((char) => ({
      ...char,
      isMain: char.id === id,
    }))
    setCharacters(nextCharacters)
    void persistGate(profile, nextCharacters)
    toast({ title: 'Ana Karakter Güncellendi', description: 'Main karakteriniz başarıyla değiştirildi.' })
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

  const handleSaveEdit = (id: string) => {
    const nextCharacters = characters.map((char) => {
      if (char.id === id) {
        return {
          ...char,
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
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
    void persistGate(profile, nextCharacters)
    toast({ title: 'Karakter Güncellendi', description: 'Değişiklikler başarıyla kaydedildi.' })
  }

  const handleAddCharacter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFirstName.trim() || !newLastName.trim()) {
      toast({ title: 'Hata', description: 'Lütfen karakterin adını ve soyadını girin.' })
      return
    }

    const isFirstCharacter = characters.length === 0

    const newChar: GuildCharacter = {
      id: Date.now().toString(),
      firstName: newFirstName.trim(),
      lastName: newLastName.trim(),
      wowClass: newClass,
      race: newRace,
      spec: newSpec,
      offSpec: newOffSpec,
      role: newRole,
      isMain: isFirstCharacter,
      professions: [prof1, prof2],
      attunements: { onyxia: attOny, mc: attMc, bwl: attBwl, naxx: attNaxx }
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
    const unlocked = await persistGate(profile, nextCharacters)
    toast({
      title: 'Karakter Eklendi!',
      description: unlocked
        ? `${newChar.firstName} ${newChar.lastName} eklendi. Profil kilidi açıldı.`
        : `${newChar.firstName} ${newChar.lastName} (${newChar.spec}) havuzunuza eklendi. Kişisel bilgileri de kaydet.`,
    })
  }

  const handleDeleteCharacter = (id: string) => {
    if (characters.length <= 1) {
      toast({ title: 'Silinemez', description: 'En az bir karakteriniz kalmalıdır.' })
      return
    }
    const remaining = characters.filter(c => c.id !== id)
    if (!remaining.some(c => c.isMain)) {
      remaining[0].isMain = true
    }
    setCharacters(remaining)
    void persistGate(profile, remaining)
    toast({ title: 'Karakter Silindi', description: 'Karakter havuzunuzdan kaldırıldı.' })
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

  const displayName = profile.nickname.trim() ? `${profile.nickname} (${profile.fullName})` : profile.fullName
  const onboardingGaps = getOnboardingGaps(profile, characters)

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

  return (
    <div className="flex flex-col gap-8 pb-10">
      <SectionHeader
        eyebrow="Hesap & Roster Yönetimi"
        title="Kullanıcı Profili & Karakter Havuzu"
        description="Lonca kayıt bilgileriniz, haftalık müsaitliğiniz ve Main/Alt karakter havuzunuz."
      />

      {!profileComplete && (
        <Panel className="border-gold/40 bg-gold/10 p-4">
          <p className="flex items-center gap-2 font-display text-sm font-bold text-gold">
            <Lock className="size-4" />
            Zorunlu onboarding
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Ad soyad, doğum tarihi, cinsiyet, Battle.net ID, e-posta, telefon ve en az bir Main karakter
            kaydedilene kadar diğer sekmeler kilitli.
            {onboardingGaps.length > 0 ? ` Eksik: ${onboardingGaps.join(', ')}.` : ''}
          </p>
        </Panel>
      )}

      <Panel className="border-gold/30 bg-gradient-to-r from-card/90 via-card/70 to-card/90 p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div 
              onClick={() => setAvatarModalOpen(true)}
              className="relative size-20 rounded-2xl border-2 border-gold/70 overflow-hidden shadow-lg flex items-center justify-center bg-card/90 cursor-pointer group transition hover:border-gold hover:shadow-[0_0_15px_rgba(212,175,55,0.4)] shrink-0"
              title="Profil simgesini değiştirmek için tıklayın (30 WoW İkonu)"
            >
              <Image
                src={getAvatarSrc(profile.selectedAvatar)}
                alt={displayName}
                width={80}
                height={80}
                className="size-full object-cover"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition text-gold">
                <Edit3 className="size-5" />
                <span className="text-[9px] font-bold mt-0.5">Değiştir</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-2xl font-bold tracking-wide text-gold">
                  {displayName}
                </h2>
                <Badge className="border-gold/40 bg-gold/10 text-gold text-xs px-2.5 py-0.5">
                  Member
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1 text-silver font-medium">
                  <span className="text-neon">Bnet:</span> {profile.bnetId || 'Bağlı Değil'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-silver font-medium">
                  <span className="text-azure">Discord:</span> @{profile.discordTag}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="border-success/40 bg-success/10 text-success px-3 py-1 text-xs">
              <CheckCircle2 className="size-3.5 mr-1.5" /> Lonca Üyesi Onaylı
            </Badge>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="flex flex-col gap-8 lg:col-span-2">
          
          {/* 1. Lonca Bildirim & Mesaj Kutusu (Kişisel Kayıt Bilgilerinin Üstünde) */}
          <ProfileMessagesInbox />

          {/* 2. Kişisel & Kayıt Bilgileri */}
          <Panel className="flex flex-col gap-6">
            <h3 className="font-display text-lg font-bold text-gold flex items-center gap-2 border-b border-border pb-3">
              <Edit3 className="size-4" /> Kişisel & Kayıt Bilgileri
            </h3>
            <form onSubmit={handleProfileUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-silver">Gerçek İsim Soyisim *</label>
                <input
                  type="text"
                  value={profile.fullName}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-silver">Profil İsmi / Nick (Opsiyonel)</label>
                <input
                  type="text"
                  value={profile.nickname}
                  onChange={(e) => setProfile({ ...profile, nickname: e.target.value })}
                  placeholder="Örn: Waffle"
                  className={inputClass}
                />
              </div>

              {/* Gerçek İsim Görünürlük Tercihi Aç/Kapa Düğmesi */}
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
                    "relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none",
                    profile.showRealNameInRoster
                      ? "bg-emerald-600 border-emerald-500 shadow-[0_0_12px_rgb(16_185_129/0.4)]"
                      : "bg-red-700/80 border-red-600 shadow-[0_0_10px_rgb(220_38_38/0.3)]"
                  )}
                  title={profile.showRealNameInRoster ? 'Açık: Gerçek isim kadroda görünüyor' : 'Kapalı: Gerçek isim gizli'}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block size-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center text-[11px] font-bold",
                      profile.showRealNameInRoster ? "translate-x-7 text-emerald-700" : "translate-x-0 text-red-700"
                    )}
                  >
                    {profile.showRealNameInRoster ? "✓" : "✕"}
                  </span>
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-silver">Doğum Tarihi *</label>
                <input
                  type="date"
                  value={profile.birthDate}
                  onChange={(e) => setProfile({ ...profile, birthDate: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-silver">Cinsiyet *</label>
                <select
                  value={profile.gender}
                  onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                  className={inputClass}
                >
                  <option value="Erkek">Erkek</option>
                  <option value="Kadın">Kadın</option>
                  <option value="Belirtmek İstemiyorum">Belirtmek İstemiyorum</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-silver">Battle.net Real ID *</label>
                <input
                  type="text"
                  value={profile.bnetId}
                  onChange={(e) => setProfile({ ...profile, bnetId: e.target.value })}
                  placeholder="Battletag#1234"
                  className={inputClass}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-silver">E-posta Adresi *</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-silver">Telefon Numarası *</label>
                <div className="flex gap-2">
                  <select
                    value={profile.phoneCountry}
                    onChange={(e) => setProfile({ ...profile, phoneCountry: e.target.value })}
                    className={cn(inputClass, "w-36 shrink-0")}
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
                    type="tel"
                    value={profile.phoneNumber}
                    onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
                    placeholder="532 123 45 67"
                    className={cn(inputClass, "flex-1")}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-background/50 md:col-span-2 pt-2">
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
                    <span className="text-[11px] text-gold font-bold">
                      {getAvatarName(profile.selectedAvatar)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      WoW Forever / Classic koleksiyonundan 30 özel simge
                    </span>
                  </div>
                </div>
                <GhostButton
                  type="button"
                  onClick={() => setAvatarModalOpen(true)}
                  className="text-xs py-1.5 px-3 border border-gold/40 text-gold hover:bg-gold/15"
                >
                  <Sparkles className="size-3.5 mr-1.5 text-gold" />
                  Simgemi Değiştir (30 İkon)
                </GhostButton>
              </div>

              <div className="md:col-span-2 flex justify-end mt-2">
                <GoldButton type="submit">{profileComplete ? 'Değişiklikleri Kaydet' : 'Kaydet ve Kilidi Aç'}</GoldButton>
              </div>
            </form>
          </Panel>

          {/* 3. Karakter Havuzum (Kişisel Bilgilerin Hemen Altında) */}
          <Panel className="flex flex-col gap-4">
            <h3 className="font-display text-lg font-bold text-gold flex items-center gap-2 border-b border-border pb-3">
              <Shield className="size-4" /> Karakter Havuzum ({characters.length})
            </h3>
            <p className="text-xs text-muted-foreground">
              Havuzdaki karakterleriniz. Kayar anahtarı kullanarak ana karakterinizi belirleyebilirsiniz:
            </p>

            <div className="grid gap-3 max-h-[440px] overflow-y-auto pr-1">
              {characters.map((char) => {
                const isEditing = editingCharId === char.id

                return (
                  <div
                    key={char.id}
                    className={cn(
                      "flex flex-col gap-2 p-3.5 rounded-xl border transition-all shadow-sm",
                      char.isMain ? "border-gold/60 bg-gold/5" : "border-border bg-background/60"
                    )}
                  >
                    {isEditing ? (
                      <div className="flex flex-col gap-3 py-1">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                          <span className="text-xs font-bold text-gold uppercase tracking-wider">Karakteri Düzenle</span>
                          <button
                            type="button"
                            onClick={() => setEditingCharId(null)}
                            className="text-xs text-muted-foreground hover:text-silver"
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
                            placeholder="İsim"
                          />
                          <input
                            type="text"
                            value={editLastName}
                            onChange={(e) => setEditLastName(e.target.value)}
                            className={inputClass}
                            placeholder="Soyisim"
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
                            {CLASS_SPECS[char.wowClass]?.filter(s => s.label !== editSpec).map((sp) => (
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
                          <GoldButton type="button" onClick={() => handleSaveEdit(char.id)} className="text-xs py-1 px-4">
                            Değişiklikleri Kaydet
                          </GoldButton>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm" style={{ color: CLASS_COLORS[char.wowClass] }}>
                                {char.firstName} {char.lastName}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {char.wowClass} ({char.race}) · <span className="text-silver">{char.spec}</span> {char.offSpec && char.offSpec !== 'Yok' && <span className="text-muted-foreground text-[10px]">(OS: {char.offSpec})</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSetMain(char.id)}
                              className={cn(
                                "relative flex items-center h-7 w-24 rounded-full p-1 transition-colors duration-300 focus:outline-none cursor-pointer border",
                                char.isMain ? "bg-success/20 border-success/60 shadow-[0_0_10px_rgb(62_224_127/0.3)]" : "bg-background border-border"
                              )}
                              title="Main / Alt durumunu değiştirmek için tıklayın"
                            >
                              <div className={cn("absolute flex items-center justify-center h-5 w-11 rounded-full text-[10px] font-bold transition-all duration-300 shadow-md", char.isMain ? "translate-x-12 bg-success text-success-foreground" : "translate-x-0 bg-muted text-muted-foreground")}>
                                {char.isMain ? 'MAIN' : 'ALT'}
                              </div>
                              <span className={cn("absolute left-2.5 text-[9px] font-bold transition-opacity", char.isMain ? "opacity-100 text-success" : "opacity-40 text-muted-foreground")}>MAIN</span>
                              <span className={cn("absolute right-2.5 text-[9px] font-bold transition-opacity", !char.isMain ? "opacity-100 text-silver" : "opacity-40 text-muted-foreground")}>ALT</span>
                            </button>

                            <Badge className="border-border bg-muted/30 text-[10px]">{char.role}</Badge>
                            
                            <button
                              type="button"
                              onClick={() => handleStartEdit(char)}
                              className="text-muted-foreground hover:text-gold transition p-1 rounded hover:bg-gold/10"
                              title="Düzenle"
                            >
                              <Edit3 className="size-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteCharacter(char.id)}
                              className="text-muted-foreground hover:text-destructive transition p-1 rounded hover:bg-destructive/10"
                              title="Sil"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/60 text-[11px]">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Wrench className="size-3" /> {char.professions?.[0] || 'Yok'}, {char.professions?.[1] || 'Yok'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1 text-[10px]">
                          <span className="text-muted-foreground">Attunement:</span>
                          <span className={cn("px-1.5 py-0.5 rounded border", char.attunements?.onyxia ? "border-success/40 bg-success/10 text-success" : "border-border text-muted-foreground")}>Ony</span>
                          <span className={cn("px-1.5 py-0.5 rounded border", char.attunements?.mc ? "border-success/40 bg-success/10 text-success" : "border-border text-muted-foreground")}>MC</span>
                          <span className={cn("px-1.5 py-0.5 rounded border", char.attunements?.bwl ? "border-success/40 bg-success/10 text-success" : "border-border text-muted-foreground")}>BWL</span>
                          <span className={cn("px-1.5 py-0.5 rounded border", char.attunements?.naxx ? "border-success/40 bg-success/10 text-success" : "border-border text-muted-foreground")}>Naxx</span>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            <form onSubmit={handleAddCharacter} className="flex flex-col gap-3 mt-4 pt-4 border-t border-border">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gold">Yeni Karakter Ekle</h4>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-silver">İsim</label>
                  <input
                    type="text"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="Waffle"
                    className={inputClass}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-silver">Soyisim</label>
                  <input
                    type="text"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="Sonat"
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
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

              <div className="grid grid-cols-2 gap-2">
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
                    {CLASS_SPECS[newClass].filter(s => s.label !== newSpec).map((sp) => (
                      <option key={sp.label} value={sp.label}>{sp.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-silver">1. Meslek</label>
                  <select
                    value={prof1}
                    onChange={(e) => setProf1(e.target.value)}
                    className={inputClass}
                  >
                    {PROFESSIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-silver">2. Meslek</label>
                  <select
                    value={prof2}
                    onChange={(e) => setProf2(e.target.value)}
                    className={inputClass}
                  >
                    {PROFESSIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1 pt-1">
                <label className="text-[11px] font-semibold text-silver">Attunement Durumları</label>
                <div className="grid grid-cols-4 gap-2">
                  <label className="flex items-center gap-1.5 text-[11px] text-silver cursor-pointer">
                    <input type="checkbox" checked={attOny} onChange={(e) => setAttOny(e.target.checked)} className="rounded border-border bg-background text-gold focus:ring-0" /> Ony
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-silver cursor-pointer">
                    <input type="checkbox" checked={attMc} onChange={(e) => setAttMc(e.target.checked)} className="rounded border-border bg-background text-gold focus:ring-0" /> MC
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-silver cursor-pointer">
                    <input type="checkbox" checked={attBwl} onChange={(e) => setAttBwl(e.target.checked)} className="rounded border-border bg-background text-gold focus:ring-0" /> BWL
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-silver cursor-pointer">
                    <input type="checkbox" checked={attNaxx} onChange={(e) => setAttNaxx(e.target.checked)} className="rounded border-border bg-background text-gold focus:ring-0" /> Naxx
                  </label>
                </div>
              </div>

              <GoldButton type="submit" className="w-full mt-2 text-xs py-2">
                <Plus className="size-3.5 mr-1" /> Karakteri Havuza Ekle
              </GoldButton>
            </form>
          </Panel>

          <Panel className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-lg font-bold text-gold flex items-center gap-2">
                <Calendar className="size-4" /> Haftalık Müsaitlik & Saat Aralığı
              </h3>
              <span className="text-xs text-muted-foreground">UTC+3 (Türkiye Saati)</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Haftanın tüm günleri varsayılan olarak <span className="text-destructive font-semibold">Meşgul</span> işaretlidir. Hiçbir gün boş bırakılamaz; gün butonuna tıklayarak durumunuzu güncelleyin: <span className="text-destructive font-semibold">Kırmızı (Meşgul)</span> → <span className="text-success font-semibold">Yeşil (Müsait)</span> → <span className="text-gold font-semibold">Sarı (Belki)</span>. Açılır menülerden başlama ve bitiş saatlerinizi seçebilirsiniz.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
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
                        "flex flex-col items-center justify-center py-2.5 rounded-lg border transition-all cursor-pointer font-display font-bold",
                        statusBg
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
                        {START_TIME_OPTIONS.map(time => (
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
                        {END_TIME_OPTIONS.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60">
              <p className="text-xs text-muted-foreground">
                Müsaitlik durumunuz ve saatleriniz GM/Officer panelindeki Raid Müsaitlik Matrisine anlık olarak aktarılır.
              </p>
              <GoldButton
                type="button"
                onClick={handleSaveAvailability}
                disabled={savingAvailability}
                className="text-xs py-2 px-4"
              >
                <Calendar className="size-3.5 mr-1.5" />
                {savingAvailability ? 'Kaydediliyor...' : 'Müsaitlik Tercihlerini Kaydet'}
              </GoldButton>
            </div>
          </Panel>

          <Panel className="flex flex-col gap-4">
            <h3 className="font-display text-lg font-bold text-gold flex items-center gap-2 border-b border-border pb-3">
              <Link2 className="size-4" /> Hesap Bağlantıları
            </h3>
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3 p-4 rounded-xl border border-border bg-background/50">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="size-10 shrink-0 rounded-xl bg-[#5865f2]/15 border border-[#5865f2]/40 flex items-center justify-center text-[#a5adff] font-bold">DC</div>
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
                      className="text-xs py-1.5 px-2.5"
                      onClick={() => setLinkModal({ open: true, provider: 'discord', value: profile.discordTag })}
                    >
                      Düzenle
                    </GhostButton>
                    <GhostButton
                      type="button"
                      className="text-xs py-1.5 px-2.5 text-destructive hover:bg-destructive/10"
                      onClick={() => disconnectOauth('discord')}
                    >
                      Kaldır
                    </GhostButton>
                  </div>
                ) : (
                  <GoldButton
                    type="button"
                    onClick={() => setLinkModal({ open: true, provider: 'discord', value: profile.discordTag || '' })}
                    className="text-xs py-1.5 px-3 shrink-0"
                  >
                    + Hesap Bağla
                  </GoldButton>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 p-4 rounded-xl border border-border bg-background/50">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="size-10 shrink-0 rounded-xl bg-neon/10 border border-neon/30 flex items-center justify-center text-neon font-bold">BN</div>
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
                      className="text-xs py-1.5 px-2.5"
                      onClick={() => setLinkModal({ open: true, provider: 'bnet', value: profile.bnetId })}
                    >
                      Düzenle
                    </GhostButton>
                    <GhostButton
                      type="button"
                      className="text-xs py-1.5 px-2.5 text-destructive hover:bg-destructive/10"
                      onClick={() => disconnectOauth('bnet')}
                    >
                      Kaldır
                    </GhostButton>
                  </div>
                ) : (
                  <GoldButton
                    type="button"
                    onClick={() => setLinkModal({ open: true, provider: 'bnet', value: profile.bnetId || '' })}
                    className="text-xs py-1.5 px-3 shrink-0"
                  >
                    + Hesap Bağla
                  </GoldButton>
                )}
              </div>

              {[
                {
                  key: 'twitch' as const,
                  mark: 'TW',
                  markClass: 'bg-[#9146ff]/15 border-[#9146ff]/40 text-[#c4a5ff]',
                  title: 'Twitch kanalı',
                  value: profile.twitchLogin,
                  placeholder: 'waffle veya twitch.tv/waffle',
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
                  placeholder: 'waffle veya kick.com/waffle',
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
                      className="text-xs py-1.5 px-3 shrink-0"
                      onClick={async () => {
                        const filled = Boolean(channel.value.trim())
                        const saved = await persistGate(channel.nextProfile(), characters)
                        toast({
                          title: filled ? `${channel.title} kaydedildi` : `${channel.title} temizlendi`,
                          description: saved
                            ? 'Kanal Stream Radar’da görünür. Yayın açınca Discord bildirimi gider.'
                            : 'Kayıt alındı. Profil kilidi için diğer zorunlu alanlar da lazım.',
                        })
                      }}
                    >
                      Kaydet
                    </GoldButton>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

        </div>

        {/* Sağ Kolon: Anket ve Lonca Görevleri */}
        <div className="flex flex-col gap-6">
          <ProfilePollSection />

          <Panel className="flex flex-col gap-4">
            <h3 className="font-display text-lg font-bold text-gold flex items-center gap-2 border-b border-border pb-3">
              Lonca Görevleri
            </h3>
            <p className="text-sm text-muted-foreground">
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
                  void persistGate(profile, characters).then((complete) => {
                    toast({
                      title: 'Görev tercihleri kaydedildi',
                      description: complete
                        ? 'GM panelinde görünür.'
                        : 'Tercihlerin kaydedildi. Profil kilidini açmak için kişisel bilgileri de tamamla.',
                    })
                  })
                }}
              >
                Görev tercihlerini kaydet
              </GoldButton>
            </div>
          </Panel>
        </div>

      </div>

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
                placeholder={linkModal.provider === 'discord' ? 'Örn: waffle veya Sonat#1234' : 'Örn: Waffle#2657'}
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