import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export async function GET(req: Request) {
  const auth = getAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Defaults if fields aren’t present yet
  let dailyLimit = 3
  let extraQuota = 0
  try {
    const user = await prisma.user.findUnique({ where: { id: auth.uid }, select: { dailyLimit: true, extraQuota: true } })
    if (user?.dailyLimit != null) dailyLimit = user.dailyLimit
    if (user?.extraQuota != null) extraQuota = user.extraQuota
  } catch {}

  const now = new Date()
  const startUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0))
  const [tarotCount, natalCount] = await Promise.all([
    prisma.reading.count({ where: { userId: auth.uid, createdAt: { gte: startUTC } } }),
    prisma.natalReadingRecord.count({
      where: {
        userId: auth.uid,
        createdAt: { gte: startUTC },
        OR: [{ phase: null }, { phase: 'planets' }],
        status: 'success'
      }
    })
  ])
  const usedToday = tarotCount + natalCount
  const remainingToday = Math.max(0, dailyLimit - usedToday)

  return NextResponse.json({ dailyLimit, usedToday, remainingToday, extraQuota })
}
