import { NextResponse } from 'next/server'
import { sessionFromRequest } from '@/lib/auth-email'
import { CLASS_COLORS, type WowClass } from '@/lib/guild-data'
import { verifyCharacterInTurxGuild } from '@/lib/wow-armory'

export const dynamic = 'force-dynamic'

function isWowClass(value: unknown): value is WowClass {
  return typeof value === 'string' && value in CLASS_COLORS
}

export async function POST(request: Request) {
  try {
    const session = sessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      firstName?: string
      lastName?: string
      wowClass?: string
    }

    const firstName = (body.firstName || '').trim()
    const lastName = (body.lastName || '').trim()
    const wowClass: WowClass = isWowClass(body.wowClass) ? body.wowClass : 'Warrior'

    if (!firstName || !lastName) {
      return NextResponse.json(
        {
          ok: false,
          status: 'not_found',
          message: 'Karakter adı ve soyadı zorunludur.',
        },
        { status: 400 },
      )
    }

    const result = await verifyCharacterInTurxGuild(firstName, lastName, wowClass)
    return NextResponse.json(result, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    console.error('armory/verify POST', err)
    return NextResponse.json(
      {
        ok: false,
        status: 'armory_unavailable',
        message: 'WoW Armory doğrulaması sırasında bir hata oluştu.',
      },
      { status: 500 },
    )
  }
}
