import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { setAuthOnResponse } from '@/lib/auth'

export async function POST(req: Request) {
  const { email, password } = await req.json()
  if (!email || !password) return NextResponse.json({ error: 'Missing' }, { status: 400 })
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  const res = NextResponse.json({ id: user.id, email: user.email, name: user.name, role: user.role })
  setAuthOnResponse(res, { uid: user.id, role: user.role, email: user.email, name: user.name })
  return res
}
