import { NextResponse } from 'next/server'
import { blobConfigured, loadGuildStore, mutateGuildStore, type StoredApplication } from '@/lib/turx-store'

export async function GET() {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ error: 'Başvuru deposu henüz bağlı değil.' }, { status: 503 })
    }
    const store = await loadGuildStore()
    return NextResponse.json({ applications: store.applications })
  } catch (err) {
    console.error('applications GET', err)
    return NextResponse.json({ error: 'Başvurular okunamadı.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ error: 'Başvuru deposu henüz bağlı değil.' }, { status: 503 })
    }
    const body = (await request.json()) as Partial<StoredApplication>
    const application: StoredApplication = {
      id: body.id || Date.now().toString(),
      accountName: (body.accountName || '').trim(),
      charName: (body.charName || '').trim(),
      charSurname: (body.charSurname || '').trim(),
      discord: (body.discord || '').trim(),
      race: body.race || '',
      characterClass: body.characterClass || 'Warrior',
      spec: body.spec || '',
      logs: body.logs || 'Belirtilmemiş',
      experience: body.experience || '',
      previousGuilds: body.previousGuilds || '',
      status: 'PENDING',
      date: body.date || new Date().toISOString(),
    }
    if (!application.charName || !application.discord) {
      return NextResponse.json({ error: 'Karakter adı ve Discord gerekli.' }, { status: 400 })
    }

    await mutateGuildStore((store) => {
      store.applications.unshift(application)
    })
    return NextResponse.json({ ok: true, application })
  } catch (err) {
    console.error('applications POST', err)
    return NextResponse.json({ error: 'Başvuru kaydedilemedi.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ error: 'Başvuru deposu henüz bağlı değil.' }, { status: 503 })
    }
    const body = (await request.json()) as { id?: string; status?: StoredApplication['status'] }
    if (!body.id || (body.status !== 'APPROVED' && body.status !== 'REJECTED' && body.status !== 'PENDING')) {
      return NextResponse.json({ error: 'Geçersiz güncelleme.' }, { status: 400 })
    }
    const updated = await mutateGuildStore((store) => {
      const found = store.applications.find((item) => item.id === body.id)
      if (!found) throw new Error('NOT_FOUND')
      found.status = body.status as StoredApplication['status']
      return found
    })
    return NextResponse.json({ ok: true, application: updated })
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Başvuru bulunamadı.' }, { status: 404 })
    }
    console.error('applications PATCH', err)
    return NextResponse.json({ error: 'Başvuru güncellenemedi.' }, { status: 500 })
  }
}
