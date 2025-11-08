import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import MobileMenu from './MobileMenu'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

const UserAvatar = dynamic(() => import('./UserAvatar'), { ssr: false })
const AuthGuard = dynamic(() => import('./AuthGuard'), { ssr: false })

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get('mok_auth')?.value
  const payload = token ? verifyToken(token) : null
  const isAdmin = payload?.role === 'ADMIN'
  return (
    <div className="min-h-screen">
      <AuthGuard />
      <header className="sticky top-0 z-10 border-b border-mok-goldDeep/30 bg-mok-black/80 backdrop-blur">
        <nav className="max-w-5xl mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.webp" width={36} height={36} alt="MOK logo" />
            <span className="gold-gradient font-semibold">MOK Tarot</span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-sm">
            <Link href="/app/dashboard" className="hover:text-mok-gold">ပင်မ</Link>
            <Link href="/app/history" className="hover:text-mok-gold">မှတ်တမ်း</Link>
            <Link href="/app/guidance" className="hover:text-mok-gold">၀ိညာဉ်အကြံဉာဏ်</Link>
            <Link href="/app/zodiac" className="hover:text-mok-gold">ရာသီခွင်</Link>
            <Link href="/app/goodness" className="hover:text-mok-gold">ကောင်းမှု မှတ်တမ်း</Link>
            {isAdmin && <Link href="/adminmok" className="hover:text-mok-gold">Admin</Link>}
            <Link href="/app/profile" className="hover:text-mok-gold">ပရိုဖိုင်း</Link>
            <UserAvatar />
          </div>
          <div className="sm:hidden">
            <MobileMenu />
          </div>
        </nav>
      </header>
      <main className="max-w-5xl mx-auto p-4">
        {children}
      </main>
      <footer className="mt-8 border-t border-mok-goldDeep/30 bg-gradient-to-b from-transparent to-black/40">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-center text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-mok-gold/40 text-mok-gold">★</span>
            <span>
              <span className="text-neutral-300">Developed by</span> <span className="text-mok-gold">Ar Kar</span>
              <span className="hidden sm:inline"> · </span>
              <span className="block sm:inline">© {new Date().getFullYear()} MOK Tarot</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
