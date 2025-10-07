import './globals.css'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'MOK Tarot Reading',
  description: 'Tarot reading with Burmese guidance',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="my">
      <body className="min-h-screen bg-mok-black text-white">
        <div className="min-h-screen bg-mok-black">
          {children}
        </div>
      </body>
    </html>
  )
}

