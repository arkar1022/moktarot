import './globals.css'
import type { ReactNode } from 'react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { cookies } from 'next/headers'
import LanguageToggle from './LanguageToggle'

export const metadata = {
  title: 'MOK Tarot Reading',
  description: 'Tarot reading with Burmese guidance',
  icons: { icon: '/logo.webp' },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const langCookie = cookies().get('mok_lang')?.value === 'en' ? 'en' : 'my'
  return (
    <html lang={langCookie}>
      <body className="min-h-screen bg-mok-black text-white">
        <div className="fixed top-4 right-4 z-50 hidden sm:block">
          <LanguageToggle initialLang={langCookie} />
        </div>
        <div className="sm:hidden fixed bottom-4 right-4 z-50">
          <LanguageToggle initialLang={langCookie} />
        </div>
        <div className="min-h-screen bg-mok-black">
          {children}
        </div>
        <SpeedInsights />
      </body>
    </html>
  )
}
