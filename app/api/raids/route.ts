import { NextResponse } from 'next/server'
import { sessionFromRequest } from '@/lib/auth-email'
import { RAIDS } from '@/lib/guild-data'
import { isGuildMasterEmail } from '@/lib/turx-identity'
import { blobConfigured, loadGuildStore, mutateGuildStore, type StoredRaidSignup, type StoredRaidState } from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

function isOfficerOrGm(username: string, store: Awaited<ReturnType<typeof loadGuildStore>>) {
  const user = store.users.find((u) => u.username.toLowerCase() === username.toLowerCase())
  if (!user) return false
  return isGuildMasterEmail(user.email) || user.role === 'Guild Master' || user.role === 'Görevli' || user.role === 'Officer'
}

export async function GET() {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ raidStates: {} })
    }
    const store = await loadGuildStore()
    return NextResponse.json(
      { raidStates: store.raidStates || {} },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    console.error('raids GET', err)
    return NextResponse.json({ error: 'Raid verileri okunamadı.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ error: 'Hesap deposu henüz bağlı değil.' }, { status: 503 })
    }

    const session = sessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Oturum açmanız gerekmektedir.' }, { status: 401 })
    }

    const body = (await request.json()) as {
      action?: 'signup' | 'confirm' | 'decline' | 'move_to_roster' | 'return_to_pool' | 'publish'
      raidId?: string
      character?: {
        id?: string
        name?: string
        wowClass?: string
        spec?: string
        role?: 'TANK' | 'HEALER' | 'MELEE' | 'RANGED'
      }
      memberId?: string
      role?: 'TANK' | 'HEALER' | 'MELEE' | 'RANGED'
    }

    const { action, raidId } = body
    if (!action || !raidId) {
      return NextResponse.json({ error: 'Aksiyon ve Raid ID zorunludur.' }, { status: 400 })
    }

    const raidDef = RAIDS.find((r) => r.id === raidId)
    const raidName = raidDef?.name || raidId

    let updatedState: StoredRaidState | null = null

    await mutateGuildStore((store) => {
      if (!store.raidStates) store.raidStates = {}
      if (!store.raidStates[raidId]) {
        store.raidStates[raidId] = {
          raidId,
          signups: [],
        }
      }

      const raidState = store.raidStates[raidId]

      if (action === 'signup') {
        const char = body.character
        if (!char || !char.name) {
          throw new Error('CHAR_REQUIRED')
        }

        const existingIndex = raidState.signups.findIndex(
          (s) => s.username.toLowerCase() === session.username.toLowerCase(),
        )

        const signupEntry: StoredRaidSignup = {
          id: `${session.username}-${char.id || char.name}`,
          raidId,
          username: session.username,
          characterId: char.id || `${char.name}-${Date.now()}`,
          characterName: char.name,
          wowClass: char.wowClass || 'Warrior',
          spec: char.spec || 'DPS',
          role: char.role || 'MELEE',
          status: 'Pending',
          rosterStatus: 'signup',
          createdAt: new Date().toISOString(),
        }

        if (existingIndex >= 0) {
          // Preserve roster status if already assigned by officer
          signupEntry.rosterStatus = raidState.signups[existingIndex].rosterStatus
          raidState.signups[existingIndex] = signupEntry
        } else {
          raidState.signups.push(signupEntry)
        }
      } else if (action === 'confirm') {
        const entry = raidState.signups.find(
          (s) => s.username.toLowerCase() === session.username.toLowerCase(),
        )
        if (!entry) throw new Error('NOT_SIGNED_UP')
        entry.status = 'Confirmed'
        entry.confirmedAt = new Date().toISOString()
      } else if (action === 'decline') {
        const entry = raidState.signups.find(
          (s) => s.username.toLowerCase() === session.username.toLowerCase(),
        )
        if (!entry) throw new Error('NOT_SIGNED_UP')
        entry.status = 'Declined'
      } else if (action === 'move_to_roster') {
        if (!isOfficerOrGm(session.username, store)) throw new Error('OFFICER_REQUIRED')
        const entry = raidState.signups.find((s) => s.id === body.memberId)
        if (!entry) throw new Error('MEMBER_NOT_FOUND')
        entry.rosterStatus = 'roster'
        if (body.role) entry.role = body.role
      } else if (action === 'return_to_pool') {
        if (!isOfficerOrGm(session.username, store)) throw new Error('OFFICER_REQUIRED')
        const entry = raidState.signups.find((s) => s.id === body.memberId)
        if (!entry) throw new Error('MEMBER_NOT_FOUND')
        entry.rosterStatus = 'signup'
      } else if (action === 'publish') {
        if (!isOfficerOrGm(session.username, store)) throw new Error('OFFICER_REQUIRED')
        raidState.publishedAt = new Date().toISOString()
        raidState.publishedBy = session.username
      }

      updatedState = raidState
    })

    // If publishing, optionally send Discord embed
    const finalState = updatedState as StoredRaidState | null
    if (action === 'publish') {
      const webhook = process.env.DISCORD_RECRUITMENT_WEBHOOK_URL || process.env.DISCORD_STREAM_WEBHOOK_URL
      if (webhook) {
        const activeRoster = (finalState?.signups || []).filter((s: StoredRaidSignup) => s.rosterStatus === 'roster')
        const tanks = activeRoster.filter((s: StoredRaidSignup) => s.role === 'TANK').map((s: StoredRaidSignup) => s.characterName).join(', ') || 'Yok'
        const healers = activeRoster.filter((s: StoredRaidSignup) => s.role === 'HEALER').map((s: StoredRaidSignup) => s.characterName).join(', ') || 'Yok'
        const dps = activeRoster.filter((s: StoredRaidSignup) => s.role === 'MELEE' || s.role === 'RANGED').map((s: StoredRaidSignup) => s.characterName).join(', ') || 'Yok'

        const embed = {
          title: `🛡️ ${raidName} Raid Kadrosu Yayınlandı!`,
          color: 0xd4af37,
          description: `**${session.username}** tarafından resmi ${raidName} kadrosu onaylandı ve yayınlandı.`,
          fields: [
            { name: '🛡️ Tanklar', value: tanks, inline: false },
            { name: '💚 Healerlar', value: healers, inline: false },
            { name: '⚔️ DPS', value: dps, inline: false },
          ],
          footer: { text: 'TURX Guild Raid Planner' },
          timestamp: new Date().toISOString(),
        }

        void fetch(webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ embeds: [embed] }),
        }).catch(() => undefined)
      }
    }

    return NextResponse.json({ ok: true, raidState: updatedState })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg === 'OFFICER_REQUIRED') {
      return NextResponse.json({ error: 'Bu işlem için GM veya Officer yetkisi gereklidir.' }, { status: 403 })
    }
    if (msg === 'CHAR_REQUIRED') {
      return NextResponse.json({ error: 'Kayıt olmak için karakter bilgisi zorunludur.' }, { status: 400 })
    }
    if (msg === 'NOT_SIGNED_UP') {
      return NextResponse.json({ error: 'Önce bu raide ön kayıt olmalısınız.' }, { status: 400 })
    }
    if (msg === 'MEMBER_NOT_FOUND') {
      return NextResponse.json({ error: 'Belirtilen oyuncu bulunamadı.' }, { status: 404 })
    }
    console.error('raids POST', err)
    return NextResponse.json({ error: 'Raid işlemi sırasında bir hata oluştu.' }, { status: 500 })
  }
}
