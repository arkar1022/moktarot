import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logInfo } from '@/lib/log'

const COST_PER_READING = 100
const ERR_NOT_ENOUGH = 'NOT_ENOUGH_COINS'

export async function POST(req: Request) {
  const auth = getAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const result = await prisma.$transaction(async (tx) => {
      const totalCoins = await tx.goodDeed.aggregate({
        _sum: { points: true },
        where: { userId: auth.uid }
      })
      const coins = totalCoins._sum.points ?? 0
      if (coins < COST_PER_READING) throw new Error(ERR_NOT_ENOUGH)

      let remaining = COST_PER_READING
      const deeds = await tx.goodDeed.findMany({
        where: { userId: auth.uid, points: { gt: 0 } },
        orderBy: { points: 'desc' }
      })

      for (const deed of deeds) {
        if (remaining <= 0) break
        const decrement = Math.min(deed.points, remaining)
        if (decrement <= 0) continue
        await tx.goodDeed.update({
          where: { id: deed.id },
          data: { points: { decrement } }
        })
        remaining -= decrement
      }

      if (remaining > 0) throw new Error(ERR_NOT_ENOUGH)

      const updatedUser = await tx.user.update({
        where: { id: auth.uid },
        data: { extraQuota: { increment: 1 } },
        select: { extraQuota: true }
      })

      const updatedCoins = await tx.goodDeed.aggregate({
        _sum: { points: true },
        where: { userId: auth.uid }
      })

      return {
        extraQuota: updatedUser.extraQuota,
        coins: updatedCoins._sum.points ?? 0
      }
    })

    logInfo('GOOD_DEED_CONVERT', { userId: auth.uid })
    return NextResponse.json(result)
  } catch (e: any) {
    if (e?.message === ERR_NOT_ENOUGH) {
      return NextResponse.json({ error: 'Not enough coins' }, { status: 400 })
    }
    return NextResponse.json({ error: e?.message || 'Conversion failed' }, { status: 500 })
  }
}
