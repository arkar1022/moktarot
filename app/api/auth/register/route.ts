import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { setAuthOnResponse, signToken } from '@/lib/auth'
import { normalizePhone } from '@/lib/phone'
import { logInfo, logError, maskEmail, maskPhone, reqMeta } from '@/lib/log'

function isGmail(email: string) { return /@gmail\.com$/i.test(email) }

function normalizeGender(g: any): 'MALE'|'FEMALE'|'OTHER'|undefined {
  if (!g) return undefined as any
  const s = String(g).toLowerCase()
  if (s === 'male' || s === 'ကျား') return 'MALE'
  if (s === 'female' || s === 'မ') return 'FEMALE'
  return 'OTHER'
}

export async function POST(req: Request) {
  const meta = reqMeta(req)
  const body = await req.json().catch(()=>({})) as any
  const email: string | undefined = body.email
  const phoneCodeRaw: string | undefined = body.phoneCode
  const phoneNumberRaw: string | undefined = body.phoneNumber
  const name: string | undefined = body.name
  const password: string | undefined = body.password
  const gender = body.gender
  const age = body.age

  if (!name || !password) {
    logError('AUTH_REGISTER_BAD_REQUEST', { ...meta, reason: 'missing_name_or_password', email: maskEmail(email), phoneCode: phoneCodeRaw, phone: maskPhone(phoneNumberRaw) })
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  let contactOk = false
  let data: any = {}

  if (email) {
    if (!isGmail(email)) {
      logError('AUTH_REGISTER_REJECT', { ...meta, reason: 'non_gmail', email: maskEmail(email) })
      return NextResponse.json({ error: 'Gmail only' }, { status: 400 })
    }
    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) {
      logError('AUTH_REGISTER_CONFLICT', { ...meta, reason: 'email_exists', email: maskEmail(email) })
      return NextResponse.json({ error: 'User exists' }, { status: 409 })
    }
    contactOk = true
    data.email = email
  } else if (phoneCodeRaw && phoneNumberRaw) {
    const { code, number } = normalizePhone(phoneCodeRaw, phoneNumberRaw)
    if (!code || !number) {
      logError('AUTH_REGISTER_REJECT', { ...meta, reason: 'invalid_phone', phoneCode: phoneCodeRaw, phone: maskPhone(phoneNumberRaw) })
      return NextResponse.json({ error: 'Invalid phone' }, { status: 400 })
    }
    const exists = await prisma.user.findUnique({ where: { phoneCode_phoneNumber: { phoneCode: code, phoneNumber: number } } }).catch(()=>null as any)
    if (exists) {
      logError('AUTH_REGISTER_CONFLICT', { ...meta, reason: 'phone_exists', phoneCode: code, phone: maskPhone(number) })
      return NextResponse.json({ error: 'User exists' }, { status: 409 })
    }
    contactOk = true
    data.phoneCode = code
    data.phoneNumber = number
  }

  if (!contactOk) {
    logError('AUTH_REGISTER_BAD_REQUEST', { ...meta, reason: 'missing_contact' })
    return NextResponse.json({ error: 'Missing contact' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  data = { ...data, name, passwordHash }
  const g = normalizeGender(gender)
  if (g) data.gender = g
  const ageNum = Number(age)
  if (Number.isFinite(ageNum) && ageNum > 0) data.age = Math.floor(ageNum)
  let user
  try {
    user = await prisma.user.create({ data })
  } catch (e) {
    // Fallback for environments where schema hasn't been migrated yet
    user = await prisma.user.create({ data: { email: data.email, name, passwordHash } })
  }
  const payload = { uid: user.id, role: user.role, email: user.email || undefined, name: user.name }
  const token = signToken(payload)
  const res = NextResponse.json({ id: user.id, email: user.email, phoneCode: user.phoneCode, phoneNumber: user.phoneNumber, name: user.name, role: user.role, token })
  setAuthOnResponse(res, payload)
  logInfo('AUTH_REGISTER_OK', { ...meta, userId: user.id })
  return res
}
