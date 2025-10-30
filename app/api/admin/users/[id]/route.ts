import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const auth = getAuth(_req)
  if (!auth || auth.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await _req.json().catch(()=>({})) as any
  const dailyLimit = Number.isFinite(body.dailyLimit) ? Math.max(0, Math.floor(body.dailyLimit)) : undefined
  const extraQuota = Number.isFinite(body.extraQuota) ? Math.max(0, Math.floor(body.extraQuota)) : undefined
  if (dailyLimit === undefined && extraQuota === undefined) return NextResponse.json({ error: 'No changes' }, { status: 400 })

  try {
    const user = await prisma.user.update({ where: { id: params.id }, data: { ...(dailyLimit!==undefined?{ dailyLimit }:{}), ...(extraQuota!==undefined?{ extraQuota }:{}) } })
    return NextResponse.json({ user })
  } catch (e) {
    return NextResponse.json({ error: 'Update failed' }, { status: 400 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = getAuth(_req)
  if (!auth || auth.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    // Remove dependent records first to satisfy FK constraints
    await prisma.zodiacReaction.deleteMany({ where: { userId: params.id } })
    await prisma.zodiacView.deleteMany({ where: { userId: params.id } })
    await prisma.reading.deleteMany({ where: { userId: params.id } })
    await prisma.user.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 400 })
  }
}
