import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { setAuthOnResponse, signToken } from '@/lib/auth'
import { normalizePhone } from '@/lib/phone'
import { logInfo, logError, maskEmail, maskPhone, reqMeta } from '@/lib/log'

export async function POST(req: Request) {
  const meta = reqMeta(req)
  const body = await req.json().catch(()=>({})) as any
  const email = body.email as string | undefined
  const password = body.password as string | undefined
  const phoneCodeRaw = body.phoneCode as string | undefined
  const phoneNumberRaw = body.phoneNumber as string | undefined

  logInfo('AUTH_LOGIN_ATTEMPT', { ...meta, email: maskEmail(email), phoneCode: phoneCodeRaw, phone: maskPhone(phoneNumberRaw) })

  if (!password) {
    logError('AUTH_LOGIN_BAD_REQUEST', { ...meta, reason: 'missing_password' })
    return NextResponse.json({ error: 'Missing' }, { status: 400 })
  }

  let user: any = null
  if (email) {
    user = await prisma.user.findUnique({ where: { email } })
  } else if (phoneCodeRaw && phoneNumberRaw) {
    const { code, number } = normalizePhone(phoneCodeRaw, phoneNumberRaw)
    if (!code || !number) return NextResponse.json({ error: 'Invalid phone' }, { status: 400 })
    user = await prisma.user.findUnique({ where: { phoneCode_phoneNumber: { phoneCode: code, phoneNumber: number } } }).catch(()=>null as any)
  } else {
    logError('AUTH_LOGIN_BAD_REQUEST', { ...meta, reason: 'missing_email_or_phone' })
    return NextResponse.json({ error: 'Missing' }, { status: 400 })
  }
  if (!user) {
    logError('AUTH_LOGIN_NOT_FOUND', { ...meta, email: maskEmail(email), phoneCode: phoneCodeRaw, phone: maskPhone(phoneNumberRaw) })
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) {
    logError('AUTH_LOGIN_INVALID', { ...meta, userId: user.id })
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
  const payload = { uid: user.id, role: user.role, email: user.email, name: user.name }
  const token = signToken(payload)
  const res = NextResponse.json({ id: user.id, email: user.email, phoneCode: user.phoneCode, phoneNumber: user.phoneNumber, name: user.name, role: user.role, token })
  setAuthOnResponse(res, payload)
  logInfo('AUTH_LOGIN_OK', { ...meta, userId: user.id, role: user.role })
  return res
}
