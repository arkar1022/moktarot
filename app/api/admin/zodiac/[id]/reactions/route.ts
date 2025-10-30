import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = getAuth(_req)
  if (!auth || auth.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const reactions = await prisma.zodiacReaction.findMany({
      where: { readingId: params.id },
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({
      total: reactions.length,
      items: reactions.map(r => ({ id: r.id, userId: r.userId, name: r.user?.name || '', email: r.user?.email || null, phoneCode: (r.user as any)?.phoneCode || null, phoneNumber: (r.user as any)?.phoneNumber || null, createdAt: r.createdAt }))
    })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 400 })
  }
}
