import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const COOKIE_NAME = 'mok_auth'

export type JWTPayload = {
  uid: string
  role: 'USER' | 'ADMIN'
  email?: string
  name?: string
}

export function signToken(payload: JWTPayload) {
  const secret = process.env.JWT_SECRET || 'dev-secret'
  return jwt.sign(payload, secret, { expiresIn: '15d' })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const secret = process.env.JWT_SECRET || 'dev-secret'
    return jwt.verify(token, secret) as JWTPayload
  } catch {
    return null
  }
}

export function getAuthCookie(): JWTPayload | null {
  const store = cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

// Accepts either an Authorization: Bearer <jwt> header (preferred for mobile)
// or falls back to the httpOnly cookie used on the web app.
export function getAuth(req?: Request): JWTPayload | null {
  try {
    if (req) {
      const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
      if (authHeader) {
        const m = authHeader.match(/^Bearer\s+(.+)$/i)
        if (m) {
          const payload = verifyToken(m[1])
          if (payload) return payload
        }
      }
    }
  } catch {
    // ignore and fall back to cookie
  }
  return getAuthCookie()
}

export function setAuthCookie(payload: JWTPayload) {
  const store = cookies()
  const token = signToken(payload)
  store.set(COOKIE_NAME, token, { httpOnly: true, path: '/', sameSite: 'lax' })
}

export function clearAuthCookie() {
  cookies().set(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 })
}

export function setAuthOnResponse(res: NextResponse, payload: JWTPayload) {
  const token = signToken(payload)
  res.cookies.set(COOKIE_NAME, token, { httpOnly: true, path: '/', sameSite: 'lax' })
}

export function clearAuthOnResponse(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0, sameSite: 'lax' })
}
