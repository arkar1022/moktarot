import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthCookie } from '@/lib/auth'

type Religion = 'BUDDHIST' | 'HINDU' | 'CHRISTIAN' | 'ISLAM'

async function askGemini(prompt: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY
  const model = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim()
  if (!key) return null
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [ { role: 'user', parts: [{ text: prompt }] } ], generationConfig: { temperature: 0.8 } })
    })
    const json = await res.json().catch(()=>({}))
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined
    if (res.ok && text) return text
  } catch {}
  return null
}

async function askOpenAI(prompt: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY
  const model = (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim()
  if (!key) return null
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model, temperature: 0.8, messages: [ { role: 'system', content: 'Answer strictly in Myanmar (Burmese). Use a calm, soft, supportive male voice. Be concise, practical, and respectful to each religion. Address the user by name once at the start if provided. Include exact scripture citations (book/sutta, chapter:verse or surah:ayah) inline where you reference teachings.' }, { role: 'user', content: prompt } ] })
    })
    const json = await res.json().catch(()=>({}))
    const text = json?.choices?.[0]?.message?.content as string | undefined
    if (res.ok && text) return text
  } catch {}
  return null
}

export async function POST(req: Request) {
  const auth = getAuthCookie()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(()=>({})) as any
  const religion = String(body?.religion || '').toUpperCase() as Religion
  const question = (body?.question || '').toString().trim()
  if (!['BUDDHIST','HINDU','CHRISTIAN','ISLAM'].includes(religion)) {
    return NextResponse.json({ error: 'Invalid religion' }, { status: 400 })
  }
  if (!question) {
    return NextResponse.json({ error: 'Missing question' }, { status: 400 })
  }

  const displayName = (auth.name?.trim() || auth.email?.split('@')[0] || '').trim() || 'မိတ်ဆွေ'

  const religionNameMm: Record<Religion, string> = {
    BUDDHIST: 'ဗုဒ္ဓဘာသာ',
    HINDU: 'ဟိန္ဒူဘာသာ',
    CHRISTIAN: 'ခရစ်ယာန်ဘာသာ',
    ISLAM: 'အစ္စလာမ်ဘာသာ',
  }

  const scriptureHints: Record<Religion, string> = {
    BUDDHIST: 'Sermons of the Buddha (Dhamma), compassion, mindfulness, Noble Eightfold Path',
    HINDU: 'Vedas, Bhagavad Gita, dharma, concepts from Brahma/Vishnu/Shiva',
    CHRISTIAN: 'The Holy Bible (e.g., Psalms, Isaiah, Matthew, John), teachings of Jesus Christ',
    ISLAM: 'The Quran, Hadith, remembrance of Allah (dhikr), the 99 Names of Allah',
  }

  const prompt = `User: ${displayName}
Religion: ${religion} (${religionNameMm[religion]})
Question: "${question}"

Instructions (Write answer in Myanmar/Burmese, soft/calm male tone):
- Provide spiritual guidance grounded in ${religion} teachings—be respectful and practical.
- You may cite themes/ideas from: ${scriptureHints[religion]} (no need for exact verse numbers).
- Avoid dogma or judgments; focus on everyday, actionable advice.
- IMPORTANT: At the very beginning, address the user by their name once: ${displayName}

Structure:
1) Brief empathetic opening acknowledging the question.
2) 2–3 concise references to teachings/leaders/scriptures (paraphrased) and their meaning for this case. After each reference, include an exact citation in parentheses. Examples: Dhammapada 1:1; SN 56.11; Bhagavad Gita 2:47; Rig Veda 10.90.1; Matthew 6:34; John 14:27; Quran 2:286; Quran 94:5–6; a Hadith ref such as Sahih Muslim 2691.
3) 3–5 practical action steps for daily/weekly practice (prayer/meditation/virtue/compassion/service, etc.).
4) Gentle, peaceful closing line.

Constraints:
- Output must be in Myanmar (Burmese) language only.
- No medical or legal claims; keep it supportive and realistic.
- Include at least two exact citations as shown above, appropriate to ${religion}.`

  let answer: string | null = null
  const pref = (process.env.AI_PROVIDER || '').toLowerCase()
  if (pref === 'gemini') {
    answer = await askGemini(prompt)
    if (!answer) answer = await askOpenAI(prompt)
  } else {
    answer = await askOpenAI(prompt)
    if (!answer) answer = await askGemini(prompt)
  }
  if (!answer) {
    return NextResponse.json({ error: 'AI unavailable' }, { status: 500 })
  }

  const saved = await prisma.guidance.create({
    data: {
      userId: auth.uid,
      religion: religion as any,
      question,
      answer,
    }
  })

  return NextResponse.json({ guidance: saved })
}
