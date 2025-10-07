import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { setAuthOnResponse } from '@/lib/auth'

function isGmail(email: string) { return /@gmail\.com$/i.test(email) }

function normalizeGender(g: any): 'MALE'|'FEMALE'|'OTHER'|undefined {
  if (!g) return undefined as any
  const s = String(g).toLowerCase()
  if (s === 'male' || s === 'ကျား') return 'MALE'
  if (s === 'female' || s === 'မ') return 'FEMALE'
  return 'OTHER'
}

export async function POST(req: Request) {
  const { email, name, password, gender, age } = await req.json()
  if (!email || !name || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (!isGmail(email)) {
    return NextResponse.json({ error: 'Gmail only' }, { status: 400 })
  }
  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) {
    return NextResponse.json({ error: 'User exists' }, { status: 409 })
  }
  const passwordHash = await bcrypt.hash(password, 10)
  const data: any = { email, name, passwordHash }
  const g = normalizeGender(gender)
  if (g) data.gender = g
  const ageNum = Number(age)
  if (Number.isFinite(ageNum) && ageNum > 0) data.age = Math.floor(ageNum)
  let user
  try {
    user = await prisma.user.create({ data })
  } catch (e) {
    // Fallback for environments where schema hasn't been migrated yet
    user = await prisma.user.create({ data: { email, name, passwordHash } })
  }
  const res = NextResponse.json({ id: user.id, email: user.email, name: user.name, role: user.role })
  setAuthOnResponse(res, { uid: user.id, role: user.role, email: user.email, name: user.name })
  return res
}
