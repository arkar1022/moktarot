import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export async function GET(req: Request) {
  const auth = getAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const items = await prisma.guidance.findMany({
    where: { userId: auth.uid },
    orderBy: { createdAt: 'desc' }
  })
  return NextResponse.json({ guidances: items })
}
