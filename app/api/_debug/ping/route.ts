import { NextResponse } from 'next/server'
import { reqMeta, logInfo } from '@/lib/log'

export async function GET(req: Request) {
  const meta = reqMeta(req)
  logInfo('DEBUG_PING', meta)
  return NextResponse.json({ ok: true, meta })
}

