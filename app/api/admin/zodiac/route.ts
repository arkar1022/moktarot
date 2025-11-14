import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export async function GET(req: Request) {
  const auth = getAuth(req)
  if (!auth || auth.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rows = await prisma.zodiacReading.findMany({ orderBy: { createdAt: 'desc' }, take: 200 })
  return NextResponse.json({ readings: rows })
}

export async function POST(req: Request) {
  const auth = getAuth(req)
  if (!auth || auth.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(()=>({})) as any
  const {
    sign,
    startDate,
    endDate,
    cards,
    general,
    relationship,
    workMoney,
    health,
    education,
    warnings,
    generalEn,
    relationshipEn,
    workMoneyEn,
    healthEn,
    educationEn,
    warningsEn
  } = b
  if (!sign || !startDate || !endDate || !cards || !Array.isArray(cards)) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  try {
    // Assign a random fake reaction count between 30 and 100 (inclusive)
    const fakeReactions = 30 + Math.floor(Math.random() * 71)
    const row = await prisma.zodiacReading.create({
      data: {
        sign,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        cards,
        fakeReactions,
        general: String(general||''),
        relationship: String(relationship||''),
        workMoney: String(workMoney||''),
        health: String(health||''),
        education: String(education||''),
        warnings: String(warnings||''),
        generalEn: String(generalEn||''),
        relationshipEn: String(relationshipEn||''),
        workMoneyEn: String(workMoneyEn||''),
        healthEn: String(healthEn||''),
        educationEn: String(educationEn||''),
        warningsEn: String(warningsEn||''),
      }
    })
    return NextResponse.json({ reading: row })
  } catch (e) {
    return NextResponse.json({ error: 'Create failed' }, { status: 400 })
  }
}
