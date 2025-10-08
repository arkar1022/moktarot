import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { normalizePhone } from '@/lib/phone'

export async function POST(req: Request) {
  const body = await req.json().catch(()=>({})) as any
  const codeRaw = String(body.phoneCode || '')
  const numberRaw = String(body.phoneNumber || '')
  if (!codeRaw || !numberRaw) {
    return NextResponse.json({ ok: false, error: 'Invalid phone' }, { status: 400 })
  }
  const { code, number } = normalizePhone(codeRaw, numberRaw)
  if (!code || !number) return NextResponse.json({ ok: false, error: 'Invalid phone' }, { status: 400 })
  const user = await prisma.user.findUnique({ where: { phoneCode_phoneNumber: { phoneCode: code, phoneNumber: number } } }).catch(()=>null as any)
  return NextResponse.json({ ok: true, exists: !!user })
}

