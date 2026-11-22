import { NextResponse } from 'next/server'
import { sessionFromRequest } from '@/lib/auth-email'
import type { WowClass } from '@/lib/guild-data'
import {
  calculateSignupPoints,
  getActiveLootRoundState,
  normalizeRaidSystemStore,
  RAID_CATALOG,
  type AttendanceAdjustment,
  type AttendanceOutcome,
  type BoeLogEntry,
  type BopRecipeDrop,
  type LootItem,
  type LootSlotAward,
  type MemberAttendanceRow,
  type PointRules,
  type PrepChecklist,
  type ProfessionLead,
  type PublicModuleFlags,
  type RaidEvent,
  type RaidEventSignup,
  type RaiderTargetSlot,
  type RaidRoleType,
} from '@/lib/raid-loot-system'
import { isGuildMasterEmail } from '@/lib/turx-identity'
import {
  blobConfigured,
  loadGuildStore,
  mutateGuildStore,
  resolveUserRole,
  type GuildStore,
} from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

type StoredCharacter = {
  id?: string
  firstName?: string
  lastName?: string
  wowClass?: string
  spec?: string
  role?: string
  level?: number
  isMain?: boolean
}

function getCallerInfo(username: string | null | undefined, store: GuildStore) {
  if (!username) return { account: null, isGm: false, isOfficer: false, role: null }
  const account = store.users.find((u) => u.username.toLowerCase() === username.toLowerCase()) || null
  if (!account) return { account: null, isGm: false, isOfficer: false, role: null }
  const role = resolveUserRole(account)
  const isGm = isGuildMasterEmail(account.email) || role === 'Guild Master'
  const isOfficer = isGm || role === 'Görevli' || role === 'Officer'
  return { account, isGm, isOfficer, role }
}

function normalizeRole(role?: string, spec?: string): RaidRoleType {
  const r = (role || '').toUpperCase()
  if (r === 'TANK' || r === 'HEALER' || r === 'MELEE' || r === 'RANGED') return r
  const s = (spec || '').toLowerCase()
  if (s.includes('tank') || s.includes('prot')) return 'TANK'
  if (s.includes('holy') || s.includes('resto') || s.includes('heal') || s.includes('disc')) return 'HEALER'
  if (s.includes('mage') || s.includes('warlock') || s.includes('hunter') || s.includes('shadow') || s.includes('bal') || s.includes('ele')) {
    return 'RANGED'
  }
  return 'MELEE'
}

function extractGuildMainMembers(store: GuildStore) {
  return store.users.map((u) => {
    const chars = Array.isArray(u.characters) ? (u.characters as StoredCharacter[]) : []
    const main = chars.find((c) => c.isMain) || chars[0]
    const charName = main
      ? `${main.firstName || ''} ${main.lastName || ''}`.trim() || u.username
      : u.username
    const wowClass = (main?.wowClass || 'Warrior') as WowClass
    const spec = main?.spec || 'DPS'
    const role = normalizeRole(main?.role, spec)
    const level = typeof main?.level === 'number' && main.level > 0 ? main.level : 60
    return {
      username: u.username,
      characterId: main?.id || `${u.username}-main`,
      characterName: charName,
      wowClass,
      spec,
      role,
      level,
      guildRank: resolveUserRole(u),
    }
  })
}

function computeAttendanceLeaderboard(store: GuildStore, phaseId: string): MemberAttendanceRow[] {
  const rs = normalizeRaidSystemStore(store.raidSystem)
  const rules = rs.settings.pointRules
  const guildMains = extractGuildMainMembers(store)

  const map = new Map<string, MemberAttendanceRow>()
  for (const m of guildMains) {
    map.set(m.username.toLowerCase(), {
      username: m.username,
      characterName: m.characterName,
      wowClass: m.wowClass,
      spec: m.spec,
      role: m.role,
      level: m.level,
      guildRank: m.guildRank,
      totalPoints: 0,
      raid10Count: 0,
      raid20Count: 0,
      raid40Count: 0,
      benchReadyCount: 0,
      lateCount: 0,
      noShowCount: 0,
      excusedCount: 0,
      totalPenalties: 0,
      history: [],
      adjustments: [],
    })
  }

  const archivedEvents = rs.events
    .filter((e) => e.phaseId === phaseId && e.status === 'ARCHIVED')
    .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))

  for (const ev of archivedEvents) {
    for (const s of ev.signups) {
      if (s.attendanceOutcome === 'NONE') continue
      const key = s.username.toLowerCase()
      let row = map.get(key)
      if (!row) {
        row = {
          username: s.username,
          characterName: s.characterName,
          wowClass: s.wowClass,
          spec: s.spec,
          role: s.role,
          level: s.level || 60,
          guildRank: 'Turx',
          totalPoints: 0,
          raid10Count: 0,
          raid20Count: 0,
          raid40Count: 0,
          benchReadyCount: 0,
          lateCount: 0,
          noShowCount: 0,
          excusedCount: 0,
          totalPenalties: 0,
          history: [],
          adjustments: [],
        }
        map.set(key, row)
      }

      const breakdown = s.pointsBreakdown || calculateSignupPoints(s, ev.size, rules)
      row.totalPoints += breakdown.total
      if (breakdown.penalty < 0) row.totalPenalties += breakdown.penalty

      if (s.attendanceOutcome === 'ATTENDED' || s.attendanceOutcome === 'LATE' || s.attendanceOutcome === 'MISSING_PREP') {
        if (ev.size === 10) row.raid10Count += 1
        else if (ev.size === 20) row.raid20Count += 1
        else row.raid40Count += 1
      }
      if (s.attendanceOutcome === 'BENCH_READY') row.benchReadyCount += 1
      if (s.attendanceOutcome === 'LATE') row.lateCount += 1
      if (s.attendanceOutcome === 'NO_SHOW') row.noShowCount += 1
      if (s.attendanceOutcome === 'EXCUSED') row.excusedCount += 1

      row.history.push({
        eventId: ev.id,
        date: ev.scheduledAt,
        raidName: ev.raidName,
        size: ev.size,
        outcome: s.attendanceOutcome,
        breakdown,
        note: s.officerNote,
      })
    }
  }

  for (const adj of rs.adjustments.filter((a) => a.phaseId === phaseId)) {
    const key = adj.username.toLowerCase()
    const row = map.get(key)
    if (!row) continue
    row.totalPoints += adj.points
    if (adj.points < 0) row.totalPenalties += adj.points
    row.adjustments.push(adj)
  }

  return [...map.values()].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
    return a.characterName.localeCompare(b.characterName, 'tr')
  })
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const metaOnly = searchParams.get('meta') === '1'
    const requestedPhase = searchParams.get('phaseId')
    const session = sessionFromRequest(request)

    if (!blobConfigured()) {
      const defaults = normalizeRaidSystemStore(null)
      return NextResponse.json(
        {
          publicModules: defaults.settings.publicModules,
          isGm: false,
          isOfficer: false,
          raidSystem: metaOnly ? undefined : defaults,
          attendanceLeaderboard: metaOnly ? undefined : [],
          guildMembers: metaOnly ? undefined : [],
        },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const store = await loadGuildStore()
    const rs = normalizeRaidSystemStore(store.raidSystem)
    const caller = getCallerInfo(session?.username, store)

    if (metaOnly) {
      return NextResponse.json(
        {
          publicModules: rs.settings.publicModules,
          activePhaseId: rs.settings.activePhaseId,
          isGm: caller.isGm,
          isOfficer: caller.isOfficer,
        },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const anyPublic = Object.values(rs.settings.publicModules).some(Boolean)
    if (!caller.isOfficer && !anyPublic) {
      return NextResponse.json(
        {
          locked: true,
          publicModules: rs.settings.publicModules,
          isGm: false,
          isOfficer: false,
        },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const phaseId = requestedPhase || rs.settings.activePhaseId
    const attendanceLeaderboard = computeAttendanceLeaderboard(store, phaseId)
    const guildMembers = extractGuildMainMembers(store)

    return NextResponse.json(
      {
        locked: false,
        publicModules: rs.settings.publicModules,
        isGm: caller.isGm,
        isOfficer: caller.isOfficer,
        raidSystem: rs,
        activePhaseId: phaseId,
        attendanceLeaderboard,
        guildMembers,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    console.error('raid-system GET', err)
    return NextResponse.json({ error: 'Raid sistemi verileri okunamadı.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ error: 'Veritabanı bağlantısı yapılandırılmamış.' }, { status: 503 })
    }

    const session = sessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Oturum açmanız gerekmektedir.' }, { status: 401 })
    }

    const body = (await request.json()) as Record<string, unknown>
    const action = typeof body.action === 'string' ? body.action : ''
    if (!action) {
      return NextResponse.json({ error: 'Aksiyon zorunludur.' }, { status: 400 })
    }

    let publishedEventSummary: {
      raidName: string
      scheduledAt: string
      rosters: { name: string; members: string[] }[]
      bench: string[]
    } | null = null

    await mutateGuildStore((store) => {
      const caller = getCallerInfo(session.username, store)
      if (!caller.account) throw new Error('ACCOUNT_NOT_FOUND')

      const rs = normalizeRaidSystemStore(store.raidSystem)
      store.raidSystem = rs

      const requireOfficer = () => {
        if (!caller.isOfficer) throw new Error('OFFICER_REQUIRED')
      }
      const requireGm = () => {
        if (!caller.isGm) throw new Error('GM_REQUIRED')
      }

      const nowIso = new Date().toISOString()

      switch (action) {
        // ============ MEMBER ACTIONS ============
        case 'signup': {
          const eventId = String(body.eventId || '')
          const ev = rs.events.find((e) => e.id === eventId)
          if (!ev) throw new Error('EVENT_NOT_FOUND')
          if (ev.status === 'ARCHIVED') throw new Error('EVENT_ARCHIVED')
          if (!caller.isOfficer && new Date(ev.signupDeadline).getTime() < Date.now()) {
            throw new Error('SIGNUP_CLOSED')
          }

          const char = (body.character || {}) as {
            id?: string
            name?: string
            wowClass?: WowClass
            spec?: string
            role?: RaidRoleType
            level?: number
          }
          if (!char.name) throw new Error('CHAR_REQUIRED')

          const existingIdx = ev.signups.findIndex(
            (s) => s.username.toLowerCase() === session.username.toLowerCase(),
          )

          if (existingIdx >= 0) {
            const prev = ev.signups[existingIdx]
            ev.signups[existingIdx] = {
              ...prev,
              characterId: char.id || prev.characterId,
              characterName: char.name,
              wowClass: char.wowClass || prev.wowClass,
              spec: char.spec || prev.spec,
              role: normalizeRole(char.role, char.spec),
              level: typeof char.level === 'number' ? char.level : prev.level,
            }
          } else {
            const entry: RaidEventSignup = {
              id: `sgn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              username: session.username,
              characterId: char.id || `${session.username}-main`,
              characterName: char.name,
              wowClass: char.wowClass || 'Warrior',
              spec: char.spec || 'DPS',
              role: normalizeRole(char.role, char.spec),
              level: typeof char.level === 'number' ? char.level : 60,
              signedAt: nowIso,
              assignment: 'POOL',
              confirmStatus: 'PENDING',
              attendanceOutcome: 'NONE',
            }
            ev.signups.push(entry)
          }
          break
        }

        case 'withdraw_signup': {
          const eventId = String(body.eventId || '')
          const ev = rs.events.find((e) => e.id === eventId)
          if (!ev) throw new Error('EVENT_NOT_FOUND')
          if (ev.status !== 'SIGNUP_OPEN' && !caller.isOfficer) {
            throw new Error('CANNOT_WITHDRAW_PUBLISHED')
          }
          ev.signups = ev.signups.filter(
            (s) => s.username.toLowerCase() !== session.username.toLowerCase(),
          )
          break
        }

        case 'confirm': {
          const eventId = String(body.eventId || '')
          const ev = rs.events.find((e) => e.id === eventId)
          if (!ev) throw new Error('EVENT_NOT_FOUND')
          if (ev.status === 'ARCHIVED') throw new Error('EVENT_ARCHIVED')
          const entry = ev.signups.find(
            (s) => s.username.toLowerCase() === session.username.toLowerCase(),
          )
          if (!entry) throw new Error('NOT_SIGNED_UP')
          if (!caller.isOfficer && new Date(ev.confirmDeadline).getTime() < Date.now()) {
            throw new Error('CONFIRM_CLOSED')
          }
          const prep = body.prepChecklist as PrepChecklist | undefined
          entry.confirmStatus = 'CONFIRMED'
          entry.confirmedAt = nowIso
          if (prep) entry.prepChecklist = prep
          break
        }

        case 'decline_excused': {
          const eventId = String(body.eventId || '')
          const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 200) : ''
          const ev = rs.events.find((e) => e.id === eventId)
          if (!ev) throw new Error('EVENT_NOT_FOUND')
          if (ev.status === 'ARCHIVED') throw new Error('EVENT_ARCHIVED')
          const entry = ev.signups.find(
            (s) => s.username.toLowerCase() === session.username.toLowerCase(),
          )
          if (!entry) throw new Error('NOT_SIGNED_UP')

          const beforeDeadline = new Date(ev.confirmDeadline).getTime() >= Date.now()
          entry.confirmStatus = 'DECLINED_EXCUSED'
          entry.declinedAt = nowIso
          entry.declineReason = reason || (beforeDeadline ? 'Mazeretli erken iptal' : 'Geç iptal')
          if (beforeDeadline) {
            entry.attendanceOutcome = 'EXCUSED'
          }
          break
        }

        case 'acknowledge_roadmap': {
          const mains = extractGuildMainMembers(store)
          const me = mains.find((m) => m.username.toLowerCase() === session.username.toLowerCase())
          const idx = rs.roadmapAcks.findIndex(
            (a) => a.username.toLowerCase() === session.username.toLowerCase(),
          )
          const ack = {
            username: session.username,
            characterName: me?.characterName || session.username,
            acknowledgedAt: nowIso,
          }
          if (idx >= 0) rs.roadmapAcks[idx] = ack
          else rs.roadmapAcks.push(ack)
          break
        }

        // ============ OFFICER + GM ACTIONS ============
        case 'create_event': {
          requireOfficer()
          const raidId = String(body.raidId || 'barrow')
          const catalog = RAID_CATALOG.find((r) => r.id === raidId)
          const raidName = String(body.raidName || catalog?.name || raidId)
          const size = (Number(body.size) === 40 ? 40 : Number(body.size) === 20 ? 20 : 10) as 10 | 20 | 40
          const scheduledAt = String(body.scheduledAt || '')
          if (!scheduledAt) throw new Error('DATE_REQUIRED')

          const schedMs = new Date(scheduledAt).getTime()
          const signupDeadline = String(
            body.signupDeadline || new Date(schedMs - 3 * 86_400_000).toISOString(),
          )
          const confirmDeadline = String(
            body.confirmDeadline || new Date(schedMs - 1 * 86_400_000).toISOString(),
          )

          const ev: RaidEvent = {
            id: `evt-${raidId}-${Date.now()}`,
            phaseId: String(body.phaseId || rs.settings.activePhaseId),
            raidId,
            raidName,
            size,
            scheduledAt: new Date(scheduledAt).toISOString(),
            signupDeadline: new Date(signupDeadline).toISOString(),
            confirmDeadline: new Date(confirmDeadline).toISOString(),
            status: 'SIGNUP_OPEN',
            notes: typeof body.notes === 'string' ? body.notes.trim() : '',
            rosters: [{ id: 'roster-1', name: 'Grup 1' }],
            signups: [],
            createdBy: session.username,
            createdAt: nowIso,
          }
          rs.events.unshift(ev)
          break
        }

        case 'delete_event': {
          requireOfficer()
          const eventId = String(body.eventId || '')
          const target = rs.events.find((e) => e.id === eventId)
          if (!target) throw new Error('EVENT_NOT_FOUND')
          if (target.status === 'ARCHIVED' && !caller.isGm) throw new Error('GM_REQUIRED')
          rs.events = rs.events.filter((e) => e.id !== eventId)
          break
        }

        case 'add_roster': {
          requireOfficer()
          const eventId = String(body.eventId || '')
          const ev = rs.events.find((e) => e.id === eventId)
          if (!ev) throw new Error('EVENT_NOT_FOUND')
          const nextNum = ev.rosters.length + 1
          const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : `Grup ${nextNum}`
          ev.rosters.push({
            id: `roster-${Date.now()}-${nextNum}`,
            name,
            leader: typeof body.leader === 'string' ? body.leader.trim() : undefined,
          })
          break
        }

        case 'remove_roster': {
          requireOfficer()
          const eventId = String(body.eventId || '')
          const rosterId = String(body.rosterId || '')
          const ev = rs.events.find((e) => e.id === eventId)
          if (!ev) throw new Error('EVENT_NOT_FOUND')
          if (ev.rosters.length <= 1) throw new Error('LAST_ROSTER')
          ev.rosters = ev.rosters.filter((r) => r.id !== rosterId)
          for (const s of ev.signups) {
            if (s.assignment === rosterId) s.assignment = 'POOL'
          }
          break
        }

        case 'assign_member': {
          requireOfficer()
          const eventId = String(body.eventId || '')
          const signupId = String(body.signupId || '')
          const assignment = String(body.assignment || 'POOL')
          const ev = rs.events.find((e) => e.id === eventId)
          if (!ev) throw new Error('EVENT_NOT_FOUND')
          const entry = ev.signups.find((s) => s.id === signupId)
          if (!entry) throw new Error('SIGNUP_NOT_FOUND')
          entry.assignment = assignment
          if (typeof body.role === 'string') {
            entry.role = normalizeRole(body.role, entry.spec)
          }
          break
        }

        case 'officer_add_signup': {
          requireOfficer()
          const eventId = String(body.eventId || '')
          const targetUsername = String(body.username || '')
          const assignment = String(body.assignment || 'POOL')
          const ev = rs.events.find((e) => e.id === eventId)
          if (!ev) throw new Error('EVENT_NOT_FOUND')
          const mains = extractGuildMainMembers(store)
          const member = mains.find((m) => m.username.toLowerCase() === targetUsername.toLowerCase())
          if (!member) throw new Error('MEMBER_NOT_FOUND')
          const existing = ev.signups.find(
            (s) => s.username.toLowerCase() === member.username.toLowerCase(),
          )
          if (existing) {
            existing.assignment = assignment
          } else {
            ev.signups.push({
              id: `sgn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              username: member.username,
              characterId: member.characterId,
              characterName: member.characterName,
              wowClass: member.wowClass,
              spec: member.spec,
              role: member.role,
              level: member.level,
              signedAt: nowIso,
              assignment,
              confirmStatus: 'CONFIRMED',
              confirmedAt: nowIso,
              attendanceOutcome: 'NONE',
              officerNote: 'Yetkili tarafından eklendi',
            })
          }
          break
        }

        case 'publish_rosters': {
          requireOfficer()
          const eventId = String(body.eventId || '')
          const ev = rs.events.find((e) => e.id === eventId)
          if (!ev) throw new Error('EVENT_NOT_FOUND')
          ev.status = 'ROSTERS_PUBLISHED'
          ev.publishedAt = nowIso
          ev.publishedBy = session.username

          publishedEventSummary = {
            raidName: ev.raidName,
            scheduledAt: ev.scheduledAt,
            rosters: ev.rosters.map((r) => ({
              name: r.name,
              members: ev.signups.filter((s) => s.assignment === r.id).map((s) => s.characterName),
            })),
            bench: ev.signups.filter((s) => s.assignment === 'BENCH').map((s) => s.characterName),
          }
          break
        }

        case 'set_attendance_outcome': {
          requireOfficer()
          const eventId = String(body.eventId || '')
          const ev = rs.events.find((e) => e.id === eventId)
          if (!ev) throw new Error('EVENT_NOT_FOUND')
          const updates = Array.isArray(body.updates)
            ? (body.updates as { signupId: string; outcome: AttendanceOutcome; note?: string }[])
            : [
                {
                  signupId: String(body.signupId || ''),
                  outcome: (body.outcome || 'NONE') as AttendanceOutcome,
                  note: typeof body.note === 'string' ? body.note : undefined,
                },
              ]

          for (const upd of updates) {
            const entry = ev.signups.find((s) => s.id === upd.signupId)
            if (!entry) continue
            entry.attendanceOutcome = upd.outcome
            if (typeof upd.note === 'string') entry.officerNote = upd.note
            entry.pointsBreakdown = calculateSignupPoints(entry, ev.size, rs.settings.pointRules)
          }
          break
        }

        case 'finalize_and_archive': {
          requireOfficer()
          const eventId = String(body.eventId || '')
          const openNextWeek = Boolean(body.openNextWeek)
          const ev = rs.events.find((e) => e.id === eventId)
          if (!ev) throw new Error('EVENT_NOT_FOUND')

          // Auto-fill any untouched assigned members before archiving
          for (const s of ev.signups) {
            if (s.attendanceOutcome === 'NONE') {
              if (s.confirmStatus === 'DECLINED_EXCUSED') {
                s.attendanceOutcome = 'EXCUSED'
              } else if (s.assignment === 'BENCH') {
                s.attendanceOutcome = s.confirmStatus === 'CONFIRMED' ? 'BENCH_READY' : 'BENCH_ABSENT'
              } else if (s.assignment !== 'POOL') {
                s.attendanceOutcome = 'ATTENDED'
              }
            }
            s.pointsBreakdown = calculateSignupPoints(s, ev.size, rs.settings.pointRules)
          }

          ev.status = 'ARCHIVED'
          ev.archivedAt = nowIso
          ev.archivedBy = session.username

          if (openNextWeek) {
            const nextSched = new Date(new Date(ev.scheduledAt).getTime() + 7 * 86_400_000)
            const nextEvent: RaidEvent = {
              id: `evt-${ev.raidId}-${Date.now()}`,
              phaseId: rs.settings.activePhaseId,
              raidId: ev.raidId,
              raidName: ev.raidName,
              size: ev.size,
              scheduledAt: nextSched.toISOString(),
              signupDeadline: new Date(nextSched.getTime() - 3 * 86_400_000).toISOString(),
              confirmDeadline: new Date(nextSched.getTime() - 1 * 86_400_000).toISOString(),
              status: 'SIGNUP_OPEN',
              notes: ev.notes,
              rosters: [{ id: 'roster-1', name: 'Grup 1' }],
              signups: [],
              createdBy: session.username,
              createdAt: nowIso,
            }
            rs.events.unshift(nextEvent)
          }
          break
        }

        // ============ LOOT MANAGEMENT (OFFICER + GM) ============
        case 'add_loot_item': {
          requireOfficer()
          const itemName = String(body.itemName || '').trim()
          const bossName = String(body.bossName || '').trim()
          const raidId = String(body.raidId || 'barrow')
          const priorityOrder = Array.isArray(body.priorityOrder)
            ? (body.priorityOrder as string[]).map((s) => s.trim()).filter(Boolean)
            : []
          if (!itemName || !bossName || priorityOrder.length === 0) {
            throw new Error('LOOT_FIELDS_REQUIRED')
          }

          const newItem: LootItem = {
            id: `loot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            phaseId: String(body.phaseId || rs.settings.activePhaseId),
            raidId,
            bossName,
            itemName,
            itemSlot: String(body.itemSlot || 'Item').trim(),
            unique: Boolean(body.unique),
            discovered: body.discovered !== false,
            notes: typeof body.notes === 'string' ? body.notes.trim() : '',
            wowheadUrl: typeof body.wowheadUrl === 'string' ? body.wowheadUrl.trim() : '',
            priorityOrder,
            rounds: [{ roundNumber: 1, slots: priorityOrder.map(() => null) }],
          }
          rs.lootItems.unshift(newItem)
          break
        }

        case 'update_loot_item': {
          requireOfficer()
          const itemId = String(body.itemId || '')
          const item = rs.lootItems.find((l) => l.id === itemId)
          if (!item) throw new Error('LOOT_NOT_FOUND')
          if (typeof body.itemName === 'string' && body.itemName.trim()) item.itemName = body.itemName.trim()
          if (typeof body.bossName === 'string' && body.bossName.trim()) item.bossName = body.bossName.trim()
          if (typeof body.itemSlot === 'string') item.itemSlot = body.itemSlot.trim()
          if (typeof body.notes === 'string') item.notes = body.notes.trim()
          if (typeof body.wowheadUrl === 'string') item.wowheadUrl = body.wowheadUrl.trim()
          if (typeof body.unique === 'boolean') item.unique = body.unique
          if (typeof body.discovered === 'boolean') item.discovered = body.discovered
          if (Array.isArray(body.priorityOrder) && body.priorityOrder.length > 0) {
            const nextOrder = (body.priorityOrder as string[]).map((s) => s.trim()).filter(Boolean)
            item.priorityOrder = nextOrder
            item.rounds = item.rounds.map((r) => ({
              ...r,
              slots: nextOrder.map((_, idx) => r.slots[idx] ?? null),
            }))
          }
          break
        }

        case 'delete_loot_item': {
          requireOfficer()
          const itemId = String(body.itemId || '')
          rs.lootItems = rs.lootItems.filter((l) => l.id !== itemId)
          break
        }

        case 'award_loot_slot': {
          requireOfficer()
          const itemId = String(body.itemId || '')
          const slotIndex = Number(body.slotIndex)
          const item = rs.lootItems.find((l) => l.id === itemId)
          if (!item) throw new Error('LOOT_NOT_FOUND')
          if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= item.priorityOrder.length) {
            throw new Error('INVALID_SLOT')
          }

          const awardInput = (body.award || {}) as {
            characterName?: string
            username?: string
            wowClass?: WowClass
            spec?: string
            raidEventId?: string
            note?: string
          }
          if (!awardInput.characterName) throw new Error('CHAR_REQUIRED')

          const state = getActiveLootRoundState(item)
          let targetRoundIndex = typeof body.roundIndex === 'number' ? body.roundIndex : state.roundIndex
          if (state.allFilledInLatest && typeof body.roundIndex !== 'number') {
            item.rounds.push({
              roundNumber: state.roundNumber,
              slots: item.priorityOrder.map(() => null),
            })
            targetRoundIndex = item.rounds.length - 1
          }
          if (!item.rounds[targetRoundIndex]) {
            item.rounds.push({
              roundNumber: item.rounds.length + 1,
              slots: item.priorityOrder.map(() => null),
            })
            targetRoundIndex = item.rounds.length - 1
          }

          const award: LootSlotAward = {
            characterName: awardInput.characterName.trim(),
            username: awardInput.username || awardInput.characterName.trim(),
            wowClass: awardInput.wowClass || 'Warrior',
            spec: awardInput.spec || item.priorityOrder[slotIndex],
            awardedAt: nowIso,
            awardedBy: session.username,
            raidEventId: awardInput.raidEventId,
            note: awardInput.note?.trim(),
          }
          item.rounds[targetRoundIndex].slots[slotIndex] = award
          break
        }

        case 'clear_loot_slot': {
          requireOfficer()
          const itemId = String(body.itemId || '')
          const roundIndex = Number(body.roundIndex)
          const slotIndex = Number(body.slotIndex)
          const item = rs.lootItems.find((l) => l.id === itemId)
          if (!item || !item.rounds[roundIndex]) throw new Error('LOOT_NOT_FOUND')
          item.rounds[roundIndex].slots[slotIndex] = null
          break
        }

        // ============ BOE & BOP RECIPES ============
        case 'add_boe_log': {
          requireOfficer()
          const entry: BoeLogEntry = {
            id: `boe-${Date.now()}`,
            phaseId: String(body.phaseId || rs.settings.activePhaseId),
            raidId: String(body.raidId || 'barrow'),
            raidName: String(body.raidName || 'Barrow Deeps'),
            itemName: String(body.itemName || '').trim(),
            droppedAt: nowIso,
            recordedBy: session.username,
            status: 'BANKADA',
            goldValue: typeof body.goldValue === 'number' ? body.goldValue : undefined,
            note: typeof body.note === 'string' ? body.note.trim() : '',
          }
          if (!entry.itemName) throw new Error('ITEM_REQUIRED')
          rs.boeLogs.unshift(entry)
          break
        }

        case 'update_boe_status': {
          requireOfficer()
          const id = String(body.id || '')
          const entry = rs.boeLogs.find((b) => b.id === id)
          if (!entry) throw new Error('BOE_NOT_FOUND')
          if (body.status === 'BANKADA' || body.status === 'AH_LISTELENDI' || body.status === 'SATILDI') {
            entry.status = body.status
          }
          if (typeof body.goldValue === 'number') entry.goldValue = body.goldValue
          if (typeof body.note === 'string') entry.note = body.note.trim()
          break
        }

        case 'delete_boe_log': {
          requireOfficer()
          const id = String(body.id || '')
          rs.boeLogs = rs.boeLogs.filter((b) => b.id !== id)
          break
        }

        case 'add_recipe_drop': {
          requireOfficer()
          const drop: BopRecipeDrop = {
            id: `rcp-${Date.now()}`,
            phaseId: String(body.phaseId || rs.settings.activePhaseId),
            raidId: String(body.raidId || 'barrow'),
            raidName: String(body.raidName || 'Barrow Deeps'),
            recipeName: String(body.recipeName || '').trim(),
            profession: String(body.profession || 'Alchemy'),
            recipientName: String(body.recipientName || '').trim(),
            recipientClass: (body.recipientClass || 'Warrior') as WowClass,
            distributionType:
              body.distributionType === 'MIN_300_ROLL' ? 'MIN_300_ROLL' : 'MESLEK_SORUMLUSU',
            droppedAt: nowIso,
            recordedBy: session.username,
            note: typeof body.note === 'string' ? body.note.trim() : '',
          }
          if (!drop.recipeName || !drop.recipientName) throw new Error('RECIPE_FIELDS_REQUIRED')
          rs.bopRecipes.unshift(drop)
          break
        }

        case 'delete_recipe_drop': {
          requireOfficer()
          const id = String(body.id || '')
          rs.bopRecipes = rs.bopRecipes.filter((r) => r.id !== id)
          break
        }

        case 'add_attendance_adjustment': {
          requireOfficer()
          const adj: AttendanceAdjustment = {
            id: `adj-${Date.now()}`,
            phaseId: String(body.phaseId || rs.settings.activePhaseId),
            username: String(body.username || '').trim(),
            characterName: String(body.characterName || '').trim(),
            points: Number(body.points) || 0,
            reason: String(body.reason || '').trim(),
            createdAt: nowIso,
            createdBy: session.username,
          }
          if (!adj.username || !adj.reason) throw new Error('ADJ_FIELDS_REQUIRED')
          rs.adjustments.unshift(adj)
          break
        }

        case 'delete_attendance_adjustment': {
          requireOfficer()
          const id = String(body.id || '')
          rs.adjustments = rs.adjustments.filter((a) => a.id !== id)
          break
        }

        // ============ GM-ONLY ACTIONS ============
        case 'update_settings': {
          requireGm()
          if (body.publicModules && typeof body.publicModules === 'object') {
            rs.settings.publicModules = {
              ...rs.settings.publicModules,
              ...(body.publicModules as Partial<PublicModuleFlags>),
            }
          }
          if (body.pointRules && typeof body.pointRules === 'object') {
            rs.settings.pointRules = {
              ...rs.settings.pointRules,
              ...(body.pointRules as Partial<PointRules>),
            }
          }
          if (typeof body.roadmapVideoUrl === 'string') {
            rs.settings.roadmapVideoUrl = body.roadmapVideoUrl.trim()
          }
          if (typeof body.raiderCutoffDate === 'string' && body.raiderCutoffDate.trim()) {
            rs.settings.raiderCutoffDate = body.raiderCutoffDate.trim()
          }
          break
        }

        case 'update_profession_leads': {
          requireGm()
          if (Array.isArray(body.professionLeads)) {
            rs.settings.professionLeads = body.professionLeads as ProfessionLead[]
          }
          break
        }

        case 'update_raider_targets': {
          requireGm()
          if (Array.isArray(body.raiderTarget40)) {
            rs.settings.raiderTarget40 = body.raiderTarget40 as RaiderTargetSlot[]
          }
          break
        }

        case 'assign_raider_rank': {
          requireGm()
          const targetUsername = String(body.username || '')
          const grant = Boolean(body.grant)
          const target = store.users.find(
            (u) => u.username.toLowerCase() === targetUsername.toLowerCase(),
          )
          if (!target) throw new Error('MEMBER_NOT_FOUND')
          if (isGuildMasterEmail(target.email) || target.role === 'Guild Master' || target.role === 'Görevli') {
            throw new Error('CANNOT_CHANGE_STAFF_RANK')
          }
          target.role = grant ? 'Raider' : 'Turx'
          break
        }

        case 'create_phase': {
          requireGm()
          const name = String(body.name || '').trim()
          const title = String(body.title || '').trim()
          if (!name || !title) throw new Error('PHASE_FIELDS_REQUIRED')
          const id = `phase-${Date.now()}`
          const setActive = Boolean(body.setActive)
          if (setActive) {
            for (const p of rs.phases) p.active = false
            rs.settings.activePhaseId = id
          }
          rs.phases.push({
            id,
            name,
            title,
            startDate: String(body.startDate || nowIso.slice(0, 10)),
            endDate: String(body.endDate || ''),
            raidIds: Array.isArray(body.raidIds) ? (body.raidIds as string[]) : ['barrow', 'hyjal', 'onyxia'],
            active: setActive,
          })
          break
        }

        case 'set_active_phase': {
          requireGm()
          const phaseId = String(body.phaseId || '')
          const target = rs.phases.find((p) => p.id === phaseId)
          if (!target) throw new Error('PHASE_NOT_FOUND')
          for (const p of rs.phases) p.active = p.id === phaseId
          rs.settings.activePhaseId = phaseId
          break
        }

        default:
          throw new Error('UNKNOWN_ACTION')
      }
    })

    // Fire Discord webhook notification when rosters are published (best-effort)
    if (publishedEventSummary) {
      const summary = publishedEventSummary as {
        raidName: string
        scheduledAt: string
        rosters: { name: string; members: string[] }[]
        bench: string[]
      }
      const webhook = process.env.DISCORD_RECRUITMENT_WEBHOOK_URL || process.env.DISCORD_STREAM_WEBHOOK_URL
      if (webhook) {
        const fields = summary.rosters.map((r) => ({
          name: `⚔️ ${r.name} (${r.members.length})`,
          value: r.members.length > 0 ? r.members.join(', ') : 'Atama yok',
          inline: false,
        }))
        if (summary.bench.length > 0) {
          fields.push({
            name: `🪑 Yedek / Bench (${summary.bench.length})`,
            value: summary.bench.join(', '),
            inline: false,
          })
        }
        await fetch(webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [
              {
                title: `📅 ${summary.raidName} — Roster Yayınlandı!`,
                description: `Lütfen **Raid Kayıt** ekranından konfirmasyonunuzu (24 saat öncesine kadar) tamamlayın.`,
                color: 0xd4af37,
                fields,
                footer: { text: `Yayınlayan: ${session.username} · TURX FOREVER` },
                timestamp: new Date().toISOString(),
              },
            ],
          }),
        }).catch(() => undefined)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const code = err instanceof Error ? err.message : String(err)
    const errorMap: Record<string, [string, number]> = {
      ACCOUNT_NOT_FOUND: ['Hesap bulunamadı.', 404],
      OFFICER_REQUIRED: ['Bu işlem için GM veya Görevli (Officer) yetkisi gereklidir.', 403],
      GM_REQUIRED: ['Bu işlem yalnızca Guild Master yetkisiyle yapılabilir.', 403],
      EVENT_NOT_FOUND: ['Raid etkinliği bulunamadı.', 404],
      EVENT_ARCHIVED: ['Arşivlenmiş raid üzerinde işlem yapılamaz.', 400],
      SIGNUP_CLOSED: ['İmza süresi dolmuştur.', 400],
      CONFIRM_CLOSED: ['Konfirmasyon süresi dolmuştur.', 400],
      NOT_SIGNED_UP: ['Önce bu raide imza atmalısınız.', 400],
      CANNOT_WITHDRAW_PUBLISHED: ['Roster yayınlandıktan sonra geri çekme yerine mazeretli iptal kullanın.', 400],
      CHAR_REQUIRED: ['Karakter bilgisi zorunludur.', 400],
      DATE_REQUIRED: ['Raid tarih ve saati zorunludur.', 400],
      LAST_ROSTER: ['En az bir roster grubu kalmalıdır.', 400],
      SIGNUP_NOT_FOUND: ['Kayıtlı oyuncu bulunamadı.', 404],
      MEMBER_NOT_FOUND: ['Guild üyesi bulunamadı.', 404],
      LOOT_FIELDS_REQUIRED: ['Item adı, boss adı ve en az 1 öncelik sırası zorunludur.', 400],
      LOOT_NOT_FOUND: ['Loot kaydı bulunamadı.', 404],
      INVALID_SLOT: ['Geçersiz öncelik kutusu.', 400],
      CANNOT_CHANGE_STAFF_RANK: ['GM ve Görevli rütbeleri buradan değiştirilemez.', 403],
      UNKNOWN_ACTION: ['Bilinmeyen aksiyon.', 400],
    }
    if (errorMap[code]) {
      return NextResponse.json({ error: errorMap[code][0] }, { status: errorMap[code][1] })
    }
    console.error('raid-system POST', err)
    return NextResponse.json({ error: 'İşlem sırasında bir hata oluştu.' }, { status: 500 })
  }
}
