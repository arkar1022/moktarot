import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logInfo } from '@/lib/log'

const COST_PER_READING = 100

export async function POST(req: Request) {
  const auth = getAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Calculate total coins and ensure enough
    const totalCoins = await prisma.goodDeed.aggregate({
      _sum: { points: true },
      where: { userId: auth.uid }
    })
    const coins = totalCoins._sum.points ?? 0
    if (coins < COST_PER_READING) {
      return NextResponse.json({ error: 'Not enough coins' }, { status: 400 })
    }

    const newExtraQuota = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: auth.uid },
        select: { extraQuota: true }
      })

      // Fetch deeds ordered by points desc so we can decrement piecemeal
      let remaining = COST_PER_READING
      const deeds = await tx.goodDeed.findMany({
        where: { userId: auth.uid, points: { gt: 0 } },
        orderBy: { points: 'desc' }
      })

      for (const deed of deeds) {
        if (remaining <= 0) break
        const decrement = Math.min(deed.points, remaining)
        await tx.goodDeed.update({
          where: { id: deed.id },
          data: { points: { decrement } }
        })
        remaining -= decrement
      }

      await tx.user.update({
        where: { id: auth.uid },
        data: { extraQuota: { increment: 1 } }
      })

      return (user?.extraQuota ?? 0) + 1
    })
    logInfo('GOOD_DEED_CONVERT', { userId: auth.uid })
    const remainingCoins = coins - COST_PER_READING
    return NextResponse.json({ coins: remainingCoins, extraQuota: newExtraQuota })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Conversion failed' }, { status: 500 })
  }
}
