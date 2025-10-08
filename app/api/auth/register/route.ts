import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { setAuthOnResponse } from '@/lib/auth'
import { normalizePhone } from '@/lib/phone'

function isGmail(email: string) { return /@gmail\.com$/i.test(email) }

function normalizeGender(g: any): 'MALE'|'FEMALE'|'OTHER'|undefined {
  if (!g) return undefined as any
  const s = String(g).toLowerCase()
  if (s === 'male' || s === 'ကျား') return 'MALE'
  if (s === 'female' || s === 'မ') return 'FEMALE'
  return 'OTHER'
}

export async function POST(req: Request) {
  const body = await req.json().catch(()=>({})) as any
  const email: string | undefined = body.email
  const phoneCodeRaw: string | undefined = body.phoneCode
  const phoneNumberRaw: string | undefined = body.phoneNumber
  const name: string | undefined = body.name
  const password: string | undefined = body.password
  const gender = body.gender
  const age = body.age

  if (!name || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  let contactOk = false
  let data: any = {}

  if (email) {
    if (!isGmail(email)) return NextResponse.json({ error: 'Gmail only' }, { status: 400 })
    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) return NextResponse.json({ error: 'User exists' }, { status: 409 })
    contactOk = true
    data.email = email
  } else if (phoneCodeRaw && phoneNumberRaw) {
    const { code, number } = normalizePhone(phoneCodeRaw, phoneNumberRaw)
    if (!code || !number) return NextResponse.json({ error: 'Invalid phone' }, { status: 400 })
    const exists = await prisma.user.findUnique({ where: { phoneCode_phoneNumber: { phoneCode: code, phoneNumber: number } } }).catch(()=>null as any)
    if (exists) return NextResponse.json({ error: 'User exists' }, { status: 409 })
    contactOk = true
    data.phoneCode = code
    data.phoneNumber = number
  }

  if (!contactOk) return NextResponse.json({ error: 'Missing contact' }, { status: 400 })

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
  const res = NextResponse.json({ id: user.id, email: user.email, phoneCode: user.phoneCode, phoneNumber: user.phoneNumber, name: user.name, role: user.role })
  setAuthOnResponse(res, { uid: user.id, role: user.role, email: user.email || undefined, name: user.name })
  return res
}
