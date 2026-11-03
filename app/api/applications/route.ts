import { NextResponse } from 'next/server'
import { blobConfigured, loadGuildStore, mutateGuildStore, type StoredApplication } from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}

export async function GET() {
  try {
    if (!blobConfigured()) {
      return json({ error: 'Başvuru deposu henüz bağlı değil.' }, 503)
    }
    const store = await loadGuildStore()
    return json({ applications: store.applications })
  } catch (err) {
    console.error('applications GET', err)
    return json({ error: 'Başvurular okunamadı.' }, 500)
  }
}

export async function POST(request: Request) {
  try {
    if (!blobConfigured()) {
      return json({ error: 'Başvuru deposu henüz bağlı değil.' }, 503)
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
      return json({ error: 'Karakter adı ve Discord gerekli.' }, 400)
    }

    await mutateGuildStore((store) => {
      store.applications.unshift(application)
    })
    return json({ ok: true, application })
  } catch (err) {
    console.error('applications POST', err)
    return json({ error: 'Başvuru kaydedilemedi.' }, 500)
  }
}

export async function PATCH(request: Request) {
  try {
    if (!blobConfigured()) {
      return json({ error: 'Başvuru deposu henüz bağlı değil.' }, 503)
    }
    const body = (await request.json()) as { id?: string; status?: StoredApplication['status'] }
    if (!body.id || (body.status !== 'APPROVED' && body.status !== 'REJECTED' && body.status !== 'PENDING')) {
      return json({ error: 'Geçersiz güncelleme.' }, 400)
    }
    const updated = await mutateGuildStore((store) => {
      const found = store.applications.find((item) => item.id === body.id)
      if (!found) throw new Error('NOT_FOUND')
      found.status = body.status as StoredApplication['status']
      return found
    })
    return json({ ok: true, application: updated })
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      return json({ error: 'Başvuru bulunamadı.' }, 404)
    }
    console.error('applications PATCH', err)
    return json({ error: 'Başvuru güncellenemedi.' }, 500)
  }
}
