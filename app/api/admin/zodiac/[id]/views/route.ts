import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthCookie } from '@/lib/auth'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = getAuthCookie()
  if (!auth || auth.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const views = await prisma.zodiacView.findMany({
      where: { readingId: params.id },
      include: { user: true },
      orderBy: { count: 'desc' }
    })
    return NextResponse.json({
      views: views.map(v => ({
        id: v.id,
        userId: v.userId,
        name: v.user?.name || '',
        email: v.user?.email || null,
        phoneCode: (v.user as any)?.phoneCode || null,
        phoneNumber: (v.user as any)?.phoneNumber || null,
        count: v.count,
        lastViewed: v.lastViewed,
      }))
    })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 400 })
  }
}

