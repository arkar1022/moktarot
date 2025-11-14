import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = getAuth(req)
  if (!auth || auth.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(()=>({})) as any
  const data: any = {}
  for (const k of ['general','relationship','workMoney','health','education','warnings','generalEn','relationshipEn','workMoneyEn','healthEn','educationEn','warningsEn','startDate','endDate','cards','fakeReactions']) {
    if (k in b) data[k] = (k==='startDate'||k==='endDate') ? new Date(b[k]) : b[k]
  }
  try {
    const row = await prisma.zodiacReading.update({ where: { id: params.id }, data })
    return NextResponse.json({ reading: row })
  } catch (e) {
    return NextResponse.json({ error: 'Update failed' }, { status: 400 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = getAuth(_req)
  if (!auth || auth.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    await prisma.zodiacReading.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 400 })
  }
}
