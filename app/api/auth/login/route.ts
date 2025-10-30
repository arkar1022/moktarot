import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { setAuthOnResponse, signToken } from '@/lib/auth'
import { normalizePhone } from '@/lib/phone'

export async function POST(req: Request) {
  const body = await req.json().catch(()=>({})) as any
  const email = body.email as string | undefined
  const password = body.password as string | undefined
  const phoneCodeRaw = body.phoneCode as string | undefined
  const phoneNumberRaw = body.phoneNumber as string | undefined

  if (!password) return NextResponse.json({ error: 'Missing' }, { status: 400 })

  let user: any = null
  if (email) {
    user = await prisma.user.findUnique({ where: { email } })
  } else if (phoneCodeRaw && phoneNumberRaw) {
    const { code, number } = normalizePhone(phoneCodeRaw, phoneNumberRaw)
    if (!code || !number) return NextResponse.json({ error: 'Invalid phone' }, { status: 400 })
    user = await prisma.user.findUnique({ where: { phoneCode_phoneNumber: { phoneCode: code, phoneNumber: number } } }).catch(()=>null as any)
  } else {
    return NextResponse.json({ error: 'Missing' }, { status: 400 })
  }
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  const payload = { uid: user.id, role: user.role, email: user.email, name: user.name }
  const token = signToken(payload)
  const res = NextResponse.json({ id: user.id, email: user.email, phoneCode: user.phoneCode, phoneNumber: user.phoneNumber, name: user.name, role: user.role, token })
  setAuthOnResponse(res, payload)
  return res
}
