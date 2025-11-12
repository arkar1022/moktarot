import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

const BONUS_POINTS = 50

export async function POST(req: Request) {
  const auth = getAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const deed = await prisma.goodDeed.create({
    data: {
      userId: auth.uid,
      deedDate: new Date(),
      note: 'Rewarded ad bonus',
      categories: ['KINDNESS'] as any,
      aiFeedback: 'Rewarded ad bonus',
      language: 'my',
      belief: 'ATHEIST' as any,
      points: BONUS_POINTS
    }
  })

  const totals = await prisma.goodDeed.aggregate({
    _sum: { points: true },
    where: { userId: auth.uid }
  })

  return NextResponse.json({ bonus: BONUS_POINTS, coins: totals._sum.points ?? 0, deedId: deed.id })
}
