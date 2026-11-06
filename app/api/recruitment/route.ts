import { NextResponse } from 'next/server'
import { sessionFromRequest } from '@/lib/auth-email'
import {
  DEFAULT_RECRUITMENT_MATRIX,
  flattenRecruitmentMatrix,
  isRecruitClass,
  isRecruitNeed,
  mergeRecruitmentMatrix,
  type StoredRecruitNeed,
} from '@/lib/recruitment'
import { canAccessAdminPanel } from '@/lib/turx-identity'
import { blobConfigured, loadGuildStore, mutateGuildStore, publicAccount } from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET() {
  try {
    if (!blobConfigured()) return json({ matrix: DEFAULT_RECRUITMENT_MATRIX })
    const store = await loadGuildStore()
    return json({ matrix: mergeRecruitmentMatrix(store.recruitmentNeeds as StoredRecruitNeed[]) })
  } catch (err) {
    console.error('recruitment GET', err)
    return json({ matrix: DEFAULT_RECRUITMENT_MATRIX })
  }
}

export async function PATCH(request: Request) {
  try {
    if (!blobConfigured()) return json({ error: 'Hesap deposu henüz bağlı değil.' }, 503)
    const session = sessionFromRequest(request)
    if (!session) return json({ error: 'Oturum gerekli.' }, 401)
    const store = await loadGuildStore()
    const viewer = store.users.find((item) => item.username.toLowerCase() === session.username.toLowerCase())
    if (!viewer || !canAccessAdminPanel(publicAccount(viewer).role)) {
      return json({ error: 'Yetki yok.' }, 403)
    }

    const body = (await request.json().catch(() => ({}))) as {
      wowClass?: string
      spec?: string
      need?: string
    }
    const wowClass = (body.wowClass || '').trim()
    const spec = (body.spec || '').trim()
    const need = (body.need || '').trim()
    if (!isRecruitClass(wowClass) || !isRecruitNeed(need) || !spec) {
      return json({ error: 'Geçersiz sınıf, spec veya ihtiyaç seviyesi.' }, 400)
    }
    const allowed = DEFAULT_RECRUITMENT_MATRIX.find((row) => row.wowClass === wowClass)?.specs.some((item) => item.spec === spec)
    if (!allowed) return json({ error: 'Bu spec ihtiyaç matrisinde yok.' }, 400)

    const matrix = await mutateGuildStore((current) => {
      const merged = mergeRecruitmentMatrix(current.recruitmentNeeds as StoredRecruitNeed[])
      const next = merged.map((row) =>
        row.wowClass === wowClass
          ? {
              ...row,
              specs: row.specs.map((item) => (item.spec === spec ? { ...item, need } : item)),
            }
          : row,
      )
      current.recruitmentNeeds = flattenRecruitmentMatrix(next)
      return next
    })

    return json({ ok: true, matrix })
  } catch (err) {
    console.error('recruitment PATCH', err)
    return json({ error: 'İhtiyaç seviyesi kaydedilemedi.' }, 500)
  }
}
