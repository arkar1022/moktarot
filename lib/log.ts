export function reqMeta(req: Request) {
  try {
    const url = new URL(req.url)
    const headers = Object.fromEntries(req.headers.entries())
    const forwarded = headers['x-forwarded-for'] || headers['x-real-ip']
    const ip = (forwarded || '').split(',')[0]?.trim() || undefined
    const ua = headers['user-agent']
    const host = headers['host']
    return { method: req.method, path: url.pathname, host, ip, ua }
  } catch {
    return { method: req.method }
  }
}

export function maskEmail(email?: string | null) {
  if (!email) return undefined
  const [name, domain] = String(email).split('@')
  if (!domain) return email
  const head = name.slice(0, 2)
  return `${head}${'*'.repeat(Math.max(0, name.length - 2))}@${domain}`
}

export function maskPhone(num?: string | null) {
  if (!num) return undefined
  const s = String(num)
  if (s.length <= 4) return '*'.repeat(s.length)
  return `${'*'.repeat(s.length - 4)}${s.slice(-4)}`
}

export function logInfo(label: string, payload: Record<string, unknown> = {}) {
  try {
    console.log(`[${label}]`, JSON.stringify(payload))
  } catch {
    console.log(`[${label}]`, payload)
  }
}

export function logError(label: string, payload: Record<string, unknown> = {}, err?: unknown) {
  const out: any = { ...payload }
  if (err instanceof Error) {
    out.error = err.message
    out.stack = err.stack
  } else if (typeof err === 'string') {
    out.error = err
  }
  try {
    console.error(`[${label}]`, JSON.stringify(out))
  } catch {
    console.error(`[${label}]`, out)
  }
}

