import { NextResponse } from 'next/server'
import { oauthConfigured } from '@/lib/account-links'
import { refreshLiveStreams } from '@/lib/twitch-streams'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const channels = await refreshLiveStreams()
    const live = channels.filter((item) => item.live)
    return NextResponse.json(
      { channels, live, twitchConfigured: oauthConfigured().twitch },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    console.error('streams GET', err)
    return NextResponse.json({ channels: [], live: [], twitchConfigured: oauthConfigured().twitch }, { status: 200 })
  }
}
