import { prisma } from '@/lib/prisma'
import { getAuthCookie } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const auth = getAuthCookie()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({
    where: { id: auth.uid },
    select: { id: true, email: true, name: true, avatar: true, role: true, createdAt: true }
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ user })
}

