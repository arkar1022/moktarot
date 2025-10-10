import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthCookie } from '@/lib/auth'

export async function GET() {
  const auth = getAuthCookie()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const items = await prisma.guidance.findMany({
    where: { userId: auth.uid },
    orderBy: { createdAt: 'desc' }
  })
  return NextResponse.json({ guidances: items })
}

