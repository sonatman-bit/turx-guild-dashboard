import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Cinzel, Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter' })
const cinzel = Cinzel({ subsets: ['latin', 'latin-ext'], variable: '--font-cinzel', weight: ['500', '700', '900'] })

export const metadata: Metadata = {
  title: 'TURX — TURX FOREVER | WoW: Forever Alliance PvE (EU) Lonca Paneli',
  description:
    'TURX lonca paneli: WoW: Forever Raid takvimi, Roster analitiği, Guild Bank, WeakAura merkezi ve başvuru sistemi. Alliance PvE (EU).',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#08121e',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr" className={`${inter.variable} ${cinzel.variable} bg-background`}>
      <body>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
