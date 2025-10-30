import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = getAuth(_req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const readingId = params.id
  try {
    const reading = await prisma.zodiacReading.findUnique({ where: { id: readingId }, select: { id: true, fakeReactions: true } })
    if (!reading) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const existing = await prisma.zodiacReaction.findUnique({ where: { readingId_userId: { readingId, userId: auth.uid } } }).catch(()=>null as any)
    if (!existing) {
      await prisma.zodiacReaction.create({ data: { readingId, userId: auth.uid } })
    }
    const real = await prisma.zodiacReaction.count({ where: { readingId } })
    return NextResponse.json({ displayCount: reading.fakeReactions + real, reacted: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 400 })
  }
}
