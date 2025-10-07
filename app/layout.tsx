import './globals.css'
import type { ReactNode } from 'react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata = {
  title: 'MOK Tarot Reading',
  description: 'Tarot reading with Burmese guidance',
  icons: { icon: '/logo.webp' },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="my">
      <body className="min-h-screen bg-mok-black text-white">
        <div className="min-h-screen bg-mok-black">
          {children}
        </div>
        <SpeedInsights />
      </body>
    </html>
  )
}
