import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { formatTimeframe, generateBilingualSections } from '../helpers'

export async function POST(req: Request) {
  const auth = getAuth(req)
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as any
  const { sign, startDate, endDate, cards } = body
  if (!sign || !startDate || !endDate || !Array.isArray(cards) || cards.length !== 3) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const timeframe = formatTimeframe(new Date(startDate), new Date(endDate))
  try {
    const { sections, raw } = await generateBilingualSections({
      sign,
      timeframe,
      cards
    })
    return NextResponse.json({ sections, raw })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
