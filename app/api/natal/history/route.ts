import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logError } from '@/lib/log'

type Lang = 'my' | 'en'
type Phase = 'planets' | 'houses'
type ReadingContext = 'self' | 'other' | 'couple'

export async function GET(req: Request) {
  const auth = getAuth(req)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const limitParam = Number(url.searchParams.get('limit'))
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50

  try {
    const rows = await prisma.natalReadingRecord.findMany({
      where: { userId: auth.uid },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
    const records = rows.map(row => ({
      id: row.id,
      context: row.context as ReadingContext,
      phase: (row.phase as Phase | null) || null,
      language: row.language as Lang,
      createdAt: row.createdAt.toISOString(),
      request: row.request,
      response: row.response
    }))
    return NextResponse.json({ records })
  } catch (err) {
    logError('NATAL_HISTORY_FETCH_FAIL', { userId: auth.uid }, err)
    return NextResponse.json({ error: 'Unable to load records.' }, { status: 500 })
  }
}
