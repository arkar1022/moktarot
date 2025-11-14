import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'
import { formatTimeframe, generateBilingualSections, pickRandomCards } from '../helpers'

export async function POST(req: Request) {
  const auth = getAuth(req)
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as any
  const { signs, startDate, endDate } = body
  if (!Array.isArray(signs) || !signs.length || !startDate || !endDate) {
    return NextResponse.json({ error: 'Please select at least one zodiac sign and provide a date range.' }, { status: 400 })
  }

  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: 'Invalid date range.' }, { status: 400 })
  }

  const created: any[] = []
  const failures: { sign: string; error: string }[] = []

  for (const rawSign of signs) {
    const sign = String(rawSign || '').toUpperCase()
    if (!sign) continue
    const cards = pickRandomCards(3)
    try {
      const timeframe = formatTimeframe(start, end)
      const { sections } = await generateBilingualSections({ sign, timeframe, cards })
      const fakeReactions = 30 + Math.floor(Math.random() * 71)
      const row = await prisma.zodiacReading.create({
        data: {
          sign: sign as any,
          startDate: start,
          endDate: end,
          cards,
          fakeReactions,
          general: sections.my.general,
          relationship: sections.my.relationship,
          workMoney: sections.my.workMoney,
          health: sections.my.health,
          education: sections.my.education,
          warnings: sections.my.warnings,
          generalEn: sections.en.general,
          relationshipEn: sections.en.relationship,
          workMoneyEn: sections.en.workMoney,
          healthEn: sections.en.health,
          educationEn: sections.en.education,
          warningsEn: sections.en.warnings
        }
      })
      created.push(row)
    } catch (err) {
      failures.push({ sign, error: err instanceof Error ? err.message : 'AI error' })
    }
  }

  if (!created.length && failures.length) {
    return NextResponse.json({ error: 'Unable to generate any readings.', failures }, { status: 500 })
  }

  return NextResponse.json({ readings: created, failures })
}
