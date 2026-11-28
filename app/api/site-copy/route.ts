import { NextResponse } from 'next/server'
import { sessionFromRequest } from '@/lib/auth-email'
import {
  getPageCopyDef,
  isEditablePageId,
  normalizeSiteCopy,
  SITE_COPY_FIELD_MAP,
} from '@/lib/site-copy'
import { isGuildMasterEmail } from '@/lib/turx-identity'
import { blobConfigured, loadGuildStore, mutateGuildStore, resolveUserRole } from '@/lib/turx-store'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (!blobConfigured()) {
      return NextResponse.json({ siteCopy: {} }, { headers: { 'Cache-Control': 'no-store' } })
    }
    const store = await loadGuildStore()
    return NextResponse.json(
      { siteCopy: normalizeSiteCopy(store.siteCopy) },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    console.error('site-copy GET', err)
    return NextResponse.json({ siteCopy: {} }, { headers: { 'Cache-Control': 'no-store' } })
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
    const pageId = typeof body.pageId === 'string' ? body.pageId : ''

    if (!isEditablePageId(pageId)) {
      return NextResponse.json({ error: 'Geçersiz sayfa kimliği.' }, { status: 400 })
    }
    const pageDef = getPageCopyDef(pageId)
    if (!pageDef) {
      return NextResponse.json({ error: 'Sayfa yapılandırması bulunamadı.' }, { status: 400 })
    }

    let nextCopy: Record<string, string> = {}

    await mutateGuildStore((store) => {
      const account = store.users.find((u) => u.username.toLowerCase() === session.username.toLowerCase())
      if (!account) throw new Error('ACCOUNT_NOT_FOUND')
      const role = resolveUserRole(account)
      const isGm = isGuildMasterEmail(account.email) || role === 'Guild Master'
      if (!isGm) throw new Error('GM_REQUIRED')

      const current = normalizeSiteCopy(store.siteCopy)

      if (action === 'reset_page') {
        for (const field of pageDef.fields) {
          delete current[field.key]
        }
        store.siteCopy = normalizeSiteCopy(current)
        nextCopy = store.siteCopy
        return
      }

      if (action === 'save_page') {
        const incoming =
          body.values && typeof body.values === 'object' ? (body.values as Record<string, unknown>) : {}
        const allowedKeys = new Set(pageDef.fields.map((f) => f.key))
        for (const key of allowedKeys) {
          if (!(key in incoming)) continue
          const rawVal = incoming[key]
          const fieldDef = SITE_COPY_FIELD_MAP[key]
          if (!fieldDef || typeof rawVal !== 'string') continue
          const maxLen = fieldDef.maxLength ?? 500
          const cleaned = rawVal.trim().slice(0, maxLen)
          if (!cleaned || cleaned === fieldDef.defaultValue) {
            delete current[key]
          } else {
            current[key] = cleaned
          }
        }
        store.siteCopy = normalizeSiteCopy(current)
        nextCopy = store.siteCopy
        return
      }

      throw new Error('UNKNOWN_ACTION')
    })

    return NextResponse.json({ ok: true, siteCopy: nextCopy })
  } catch (err) {
    const code = err instanceof Error ? err.message : String(err)
    if (code === 'ACCOUNT_NOT_FOUND') {
      return NextResponse.json({ error: 'Hesap bulunamadı.' }, { status: 404 })
    }
    if (code === 'GM_REQUIRED') {
      return NextResponse.json({ error: 'Bu işlem yalnızca Guild Master yetkisiyle yapılabilir.' }, { status: 403 })
    }
    if (code === 'UNKNOWN_ACTION') {
      return NextResponse.json({ error: 'Geçersiz işlem.' }, { status: 400 })
    }
    console.error('site-copy POST', err)
    return NextResponse.json({ error: 'Metinler kaydedilemedi.' }, { status: 500 })
  }
}
