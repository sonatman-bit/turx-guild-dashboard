import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Cinzel, Inter } from 'next/font/google'
import { AuthProvider } from '@/components/turx/auth-provider'
import './globals.css'

const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter' })
const cinzel = Cinzel({ subsets: ['latin', 'latin-ext'], variable: '--font-cinzel', weight: ['500', '700', '900'] })

export const metadata: Metadata = {
  title: 'TURX Forever — World of Warcraft: Forever Alliance PvE (EU) Guild Dashboard',
  description:
    'TURX Forever is a World of Warcraft: Forever (EU Alliance PvE) guild management platform for raid signups, roster planning, attendance tracking, and transparent loot distribution. Optional Google Sign-In is used solely for member authentication.',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-light-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
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
        <AuthProvider>
          {children}
        </AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}