"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

export default function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname()
  const active = isActive(pathname, href)
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-full border transition ${active ? 'border-mok-gold text-mok-gold bg-mok-gold/10 shadow-[0_0_12px_rgba(212,175,55,0.25)]' : 'border-transparent text-neutral-300 hover:text-mok-gold hover:border-mok-gold/40'}`}
    >
      {children}
    </Link>
  )
}

function isActive(pathname: string, href: string) {
  if (href === '/app/dashboard') return pathname === '/app/dashboard'
  if (href === '/adminmok') return pathname.startsWith('/adminmok')
  return pathname.startsWith(href)
}
