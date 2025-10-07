import { prisma } from '@/lib/prisma'
import { getAuthCookie } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const auth = getAuthCookie()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const readings = await prisma.reading.findMany({
    where: { userId: auth.uid },
    orderBy: { createdAt: 'desc' }
  })
  return NextResponse.json({ readings })
}

