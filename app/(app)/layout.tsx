import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'

const UserAvatar = dynamic(() => import('./UserAvatar'), { ssr: false })
const AuthGuard = dynamic(() => import('./AuthGuard'), { ssr: false })

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <AuthGuard />
      <header className="sticky top-0 z-10 border-b border-mok-goldDeep/30 bg-mok-black/80 backdrop-blur">
        <nav className="max-w-5xl mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.webp" width={36} height={36} alt="MOK logo" />
            <span className="gold-gradient font-semibold">MOK Tarot</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/app/dashboard" className="hover:text-mok-gold">ပင်မ</Link>
            <Link href="/app/history" className="hover:text-mok-gold">မှတ်တမ်း</Link>
            <Link href="/app/profile" className="hover:text-mok-gold">ပရိုဖိုင်း</Link>
            <UserAvatar />
          </div>
        </nav>
      </header>
      <main className="max-w-5xl mx-auto p-4">
        {children}
      </main>
    </div>
  )
}
