import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'mok_auth'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get(COOKIE)?.value
  const unauthRedirect = NextResponse.redirect(new URL('/', req.url))

  // If user hits login page while already authenticated, send them to dashboard
  if (pathname === '/') {
    if (token) {
      return NextResponse.redirect(new URL('/app/dashboard', req.url))
    }
    return NextResponse.next()
  }

  // Protect app pages
  if (pathname.startsWith('/app') || pathname.startsWith('/adminmok')) {
    if (!token) return unauthRedirect
    // Lightweight role check for admin (non-cryptographic; real check inside page)
    if (pathname.startsWith('/adminmok')) {
      try {
        const parts = token.split('.')
        if (parts.length !== 3) return unauthRedirect
        const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
        const json = decodeURIComponent(escape(atob(b64)))
        const payload = JSON.parse(json)
        if (payload.role !== 'ADMIN') return unauthRedirect
      } catch {
        return unauthRedirect
      }
    }
    return NextResponse.next()
  }
  return NextResponse.next()
}

export const config = {
  // Include root so we can redirect authenticated users away from login
  matcher: ['/', '/app/:path*', '/adminmok/:path*']
}
