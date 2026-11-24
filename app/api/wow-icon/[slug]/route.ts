import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ICON_SLUG_RE = /^[a-z0-9_-]{2,80}$/

function candidateUrls(slug: string): string[] {
  return [
    `https://render.worldofwarcraft.com/us/icons/56/${slug}.jpg`,
    `https://render.worldofwarcraft.com/eu/icons/56/${slug}.jpg`,
    `https://wow.zamimg.com/images/wow/icons/large/${slug}.jpg`,
    `https://classicdb.ch/images/icons/large/${slug}.jpg`,
  ]
}

async function fetchFirstIcon(slug: string): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  for (const url of candidateUrls(slug)) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 4500)
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TURX-Guild-Dashboard/1.0)',
          Accept: 'image/jpeg,image/png,image/webp,image/*,*/*;q=0.8',
        },
        next: { revalidate: 60 * 60 * 24 * 7 },
      })
      clearTimeout(timer)

      if (!res.ok) continue
      const ct = (res.headers.get('content-type') || '').toLowerCase()
      if (!ct.startsWith('image/')) continue

      const body = await res.arrayBuffer()
      if (body.byteLength < 200) continue

      return { body, contentType: ct }
    } catch {
      // Try next CDN mirror
    }
  }
  return null
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await context.params
  const clean = (rawSlug || '')
    .replace(/\.(jpg|jpeg|png|webp)$/i, '')
    .trim()
    .toLowerCase()

  const safeSlug = ICON_SLUG_RE.test(clean) ? clean : 'inv_misc_questionmark'

  let hit = await fetchFirstIcon(safeSlug)
  if (!hit && safeSlug !== 'inv_misc_questionmark') {
    hit = await fetchFirstIcon('inv_misc_questionmark')
  }

  if (!hit) {
    return new NextResponse(null, {
      status: 404,
      headers: { 'Cache-Control': 'public, max-age=300' },
    })
  }

  return new NextResponse(hit.body, {
    status: 200,
    headers: {
      'Content-Type': hit.contentType,
      'Cache-Control': 'public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400',
    },
  })
}
