import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: { sign: string } }) {
  const sign = (params.sign || '').toUpperCase()
  try {
    const row = await prisma.zodiacReading.findFirst({ where: { sign: sign as any }, orderBy: { createdAt: 'desc' } })
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ reading: row })
  } catch (e) {
    return NextResponse.json({ error: 'Invalid sign' }, { status: 400 })
  }
}

