import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'

export async function POST(req: Request) {
  const auth = getAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, avatar, password, currentPassword } = await req.json()

  const data: any = {}
  if (typeof name === 'string' && name.trim()) data.name = name.trim()
  if (typeof avatar === 'string') data.avatar = avatar

  if (typeof password === 'string') {
    if (password.length < 6) return NextResponse.json({ error: 'Password too short' }, { status: 400 })
    // Verify current password first
    const existing = await prisma.user.findUnique({ where: { id: auth.uid } })
    if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (!currentPassword) return NextResponse.json({ error: 'Current password required' }, { status: 400 })
    const ok = await bcrypt.compare(currentPassword, existing.passwordHash)
    if (!ok) return NextResponse.json({ error: 'Current password incorrect' }, { status: 401 })
    data.passwordHash = await bcrypt.hash(password, 10)
  }

  const user = await prisma.user.update({ where: { id: auth.uid }, data })
  return NextResponse.json({ id: user.id, email: user.email, name: user.name, avatar: user.avatar })
}
