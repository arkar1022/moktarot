import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const readingId = params.id
  if (!readingId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  try {
    const reading = await prisma.zodiacReading.findUnique({
      where: { id: readingId },
      select: { id: true, fakeReactions: true }
    })
    if (!reading) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const [realCount, reacted] = await Promise.all([
      prisma.zodiacReaction.count({ where: { readingId } }),
      (async () => {
        const auth = getAuth(_req)
        if (!auth) return false
        try {
          const existing = await prisma.zodiacReaction.findUnique({
            where: { readingId_userId: { readingId, userId: auth.uid } }
          })
          return !!existing
        } catch {
          return false
        }
      })()
    ])

    return NextResponse.json({
      displayCount: reading.fakeReactions + realCount,
      reacted
    })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 400 })
  }
}
