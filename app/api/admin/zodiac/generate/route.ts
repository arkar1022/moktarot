import { NextResponse } from 'next/server'
import { getAuthCookie } from '@/lib/auth'

async function askGemini(prompt: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY
  const model = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim()
  if (!key) return null
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}` , {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [ { role: 'user', parts: [{ text: prompt }] } ], generationConfig: { temperature: 0.85 } })
    })
    const json = await res.json().catch(() => ({}))
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined
    if (res.ok && text) return text
  } catch {}
  return null
}

export async function POST(req: Request) {
  const auth = getAuthCookie()
  if (!auth || auth.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(()=>({})) as any
  const { sign, startDate, endDate, cards } = b
  if (!sign || !startDate || !endDate || !cards || !Array.isArray(cards) || cards.length !== 3) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  const timeframe = `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
  const prompt = `Write a concise, professional tarot-style horoscope reading in Burmese (Myanmar).\n\nRequirements:\n- Respond strictly in Burmese language.\n- Do NOT mention tarot card names.\n- Use the selected cards as guidance.\n\nContext:\n- Zodiac sign: ${sign}\n- Timeframe: ${timeframe}\n- INTERNAL ONLY (do not output): Selected tarot cards = ${cards.join(', ')}\n\nReturn ONLY JSON with exactly these fields (no extra keys, no markdown, no surrounding text):\n{"general":"…","relationship":"…","workMoney":"…","health":"…","education":"…","warnings":"…"}\n\nGuidance for each field: keep it short and clear (in Burmese), provide practical suggestions (2–3, can be bullet-like), and maintain a professional tarot reading tone.`

  const text = await askGemini(prompt)
  if (!text) return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
  const textStr = text as string

  try {
    // Log raw AI response to server terminal for debugging
    const preview = textStr.length > 1200 ? textStr.slice(0, 1200) + `\n...[${textStr.length - 1200} more chars]` : textStr
    console.log('[ZODIAC][GENERATION] sign=%s timeframe=%s cards=%j\nRAW:\n%s', sign, timeframe, cards, preview)
  } catch {}

  // Prefer JSON sections; fallback to raw
  const sections = { general: '', relationship: '', workMoney: '', health: '', education: '', warnings: '' }
  const norm = textStr.replace(/\r/g, '').trim()
  const stripFences = (s: string) => s.replace(/^```(?:json)?\n([\s\S]*?)\n```$/i, '$1').trim()
  function parseJsonSections(input: string) {
    const s = stripFences(input)
    try { return JSON.parse(s) } catch {}
    const a = s.indexOf('{'); const b = s.lastIndexOf('}')
    if (a >= 0 && b > a) {
      try { return JSON.parse(s.slice(a, b + 1)) } catch {}
    }
    return null
  }
  const parsed = parseJsonSections(norm)
  if (parsed && typeof parsed === 'object') {
    for (const k of Object.keys(sections) as (keyof typeof sections)[]) {
      if (typeof (parsed as any)[k] === 'string') (sections as any)[k] = (parsed as any)[k]
    }
  }
  if (!sections.general && !sections.relationship && !sections.workMoney && !sections.health && !sections.education && !sections.warnings) {
    sections.general = norm
  }

  return NextResponse.json({ sections, raw: textStr })
}
