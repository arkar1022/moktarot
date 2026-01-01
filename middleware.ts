import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'mok_auth'
const maintenanceFlag = process.env.MAINTENANCE_MODE
const maintenanceEnabled = maintenanceFlag
  ? ['1', 'true', 'yes', 'on'].includes(maintenanceFlag.toLowerCase())
  : false

type TokenPayload = {
  uid?: string
  role?: string
  exp?: number
}

function decodePayload(token: string): TokenPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const raw = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = raw + '='.repeat((4 - (raw.length % 4 || 4)) % 4)
    const json = atob(padded)
    return JSON.parse(json)
  } catch {
    return null
  }
}

function isExpired(payload: TokenPayload | null) {
  if (!payload?.exp) return false
  return payload.exp * 1000 <= Date.now()
}

function redirectToLogin(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/', req.url))
  res.cookies.set(COOKIE, '', { path: '/', maxAge: 0 })
  return res
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Short-circuit when maintenance mode is on (configured via .env)
  const isMaintenancePath = pathname.startsWith('/maintenance')
  const isStaticAsset =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/icon') ||
    pathname.startsWith('/logo') ||
    /\.(png|jpg|jpeg|gif|webp|svg|ico|txt|xml|css|js|map|woff2?)$/i.test(pathname)

  if (maintenanceEnabled && !isMaintenancePath && !isStaticAsset) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json(
        { message: 'MOK Tarot is undergoing maintenance and will return on January 12.' },
        { status: 503 }
      )
    }
    return NextResponse.rewrite(new URL('/maintenance', req.url))
  }

  const token = req.cookies.get(COOKIE)?.value
  const payload = token ? decodePayload(token) : null
  const valid = !!(payload && payload.uid && !isExpired(payload))

  // If user hits login page while already authenticated, send them to dashboard
  if (pathname === '/') {
    if (token && !valid) {
      const res = NextResponse.next()
      res.cookies.set(COOKIE, '', { path: '/', maxAge: 0 })
      return res
    }
    if (valid) {
      return NextResponse.redirect(new URL('/app/dashboard', req.url))
    }
    return NextResponse.next()
  }

  // Protect app pages
  if (pathname.startsWith('/app') || pathname.startsWith('/adminmok')) {
    if (!valid) return redirectToLogin(req)

    // Lightweight role check for admin (non-cryptographic; real check inside page)
    if (pathname.startsWith('/adminmok') && payload.role !== 'ADMIN') {
      return redirectToLogin(req)
    }
    return NextResponse.next()
  }
  return NextResponse.next()
}

export const config = {
  // Run on all paths so maintenance mode can short-circuit requests centrally
  matcher: ['/:path*']
}
