import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

function isGmail(email: string) {
  return /@gmail\.com$/i.test(email)
}

export async function POST(req: Request) {
  const { email } = await req.json()
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ ok: false, error: 'Invalid email' }, { status: 400 })
  }
  if (!isGmail(email)) {
    return NextResponse.json({ ok: false, gmailOnly: true }, { status: 200 })
  }
  const user = await prisma.user.findUnique({ where: { email } })
  return NextResponse.json({ ok: true, exists: !!user })
}

