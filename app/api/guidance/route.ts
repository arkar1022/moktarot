import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'
import { logInfo, reqMeta } from '@/lib/log'

type Religion = 'BUDDHIST' | 'HINDU' | 'CHRISTIAN' | 'ISLAM'
type Lang = 'my' | 'en'

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

async function askOpenAI(prompt: string, language: Lang): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY
  const model = (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim()
  if (!key) return null
  const system = language === 'en'
    ? 'Answer strictly in English. Use a calm, soft, supportive tone that references each religion respectfully. Avoid overused generic maxims; ground advice in core teachings and memorable phrases.'
    : 'Answer strictly in Myanmar (Burmese). Use a calm, soft, supportive male voice. Be concise, respectful to each religion, and address the user by name once at the start if provided. Avoid overused generic maxims and avoid repeating generic practices. Prioritize core teachings and short memorable phrases from the tradition. You may quote short phrases, but do not include verse/source numbers.'
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model, temperature: 0.8, messages: [ { role: 'system', content: system }, { role: 'user', content: prompt } ] })
    })
    const json = await res.json().catch(()=>({}))
    const text = json?.choices?.[0]?.message?.content as string | undefined
    if (res.ok && text) return text
  } catch {}
  return null
}

export async function POST(req: Request) {
  const meta = reqMeta(req)
  const auth = getAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(()=>({})) as any
  const religion = String(body?.religion || '').toUpperCase() as Religion
  const question = (body?.question || '').toString().trim()
  const language: Lang = body?.language === 'en' ? 'en' : 'my'
  logInfo('GUIDANCE_REQUEST', { ...meta, userId: auth.uid, religion, qlen: question.length, language })
  if (!['BUDDHIST','HINDU','CHRISTIAN','ISLAM'].includes(religion)) {
    return NextResponse.json({ error: 'Invalid religion' }, { status: 400 })
  }
  if (!question) {
    return NextResponse.json({ error: 'Missing question' }, { status: 400 })
  }

  const displayName =
    (auth.name?.trim() || auth.email?.split('@')[0] || '').trim() ||
    (language === 'en' ? 'Friend' : 'မိတ်ဆွေ')

  const religionName: Record<Lang, Record<Religion, string>> = {
    my: {
      BUDDHIST: 'ဗုဒ္ဓဘာသာ',
      HINDU: 'ဟိန္ဒူဘာသာ',
      CHRISTIAN: 'ခရစ်ယာန်ဘာသာ',
      ISLAM: 'အစ္စလာမ်ဘာသာ',
    },
    en: {
      BUDDHIST: 'Buddhist',
      HINDU: 'Hindu',
      CHRISTIAN: 'Christian',
      ISLAM: 'Islam',
    }
  }

  const scriptureHints: Record<Religion, string> = {
    BUDDHIST: 'Sermons of the Buddha (Dhamma), compassion, mindfulness, Noble Eightfold Path',
    HINDU: 'Vedas, Bhagavad Gita, dharma, concepts from Brahma/Vishnu/Shiva',
    CHRISTIAN: 'The Holy Bible (e.g., Psalms, Isaiah, Matthew, John), teachings of Jesus Christ',
    ISLAM: 'The Quran, Hadith, remembrance of Allah (dhikr), the 99 Names of Allah',
  }

  const baseInstructions = language === 'en'
    ? `Instructions (Write answer in English, gentle mentor tone):
- IMPORTANT: Begin by addressing the user by name once: ${displayName}.
- Provide guidance grounded in ${religion} teachings—respectful, specific, and practical.
- Avoid generic maxims; highlight core concepts, memorable phrases, or metaphors from the tradition.
- You may quote short phrases (in English translation) and mention scripture/teaching names, but do NOT include numeric verse references.`
    : `Instructions (Write answer in Myanmar/Burmese, soft/calm male tone):
- IMPORTANT: At the very beginning, address the user by their name once: ${displayName}
- Provide guidance grounded in ${religion} teachings—be respectful and practical when advice is appropriate.
- Avoid repeating popular, generic maxims; pick specific teachings most relevant to the question.
- You may quote short phrases from teachings (in Burmese) and mention the scripture/teaching name thematically, but do NOT include numeric verse/source codes.`

  const modeInstructions = language === 'en'
    ? `Mode:
- Life Guidance mode: The user seeks help for personal choices. Include practical steps.
- Doctrinal/Explanatory mode: The user asks what the religion teaches about a topic. Explain clearly and stop; do not include practical guidance.`
    : `Mode:
- Life Guidance mode: The user seeks help for personal life/choices. Include practical steps.
- Doctrinal/Explanatory mode: The user asks about what the religion/teacher says on a topic (e.g., “What did Buddha say about afterlife?”). In this mode, explain the teachings clearly and STOP; do NOT include practical guidance.`

  const structureInstructions = language === 'en'
    ? `Structure:
1) Short empathetic opening that acknowledges the question.
2) 3–6 concise references to teachings/leaders/scriptures (paraphrased or short phrases) and explain their meaning for this case.
3) If Life Guidance mode: give 5–7 concept-focused steps (principles, mental models, perspectives). Avoid repeating generic practices like “meditate/pray” by default; include at most one and make it specific.
4) If Life Guidance mode: end with a gentle blessing or prayer. If Doctrinal mode: close with a reverent prayer.`
    : `Structure:
1) Brief empathetic opening acknowledging the question.
2) 3–6 concise references to teachings/leaders/scriptures (paraphrased or short phrases) and explain their meaning for this case. Mention the source thematically if useful, but avoid numeric citations.
3) If Life Guidance mode: give 5–7 concept-focused steps to keep in mind (key principles, mental models, ways of seeing, short maxims from the tradition). Avoid repeating generic practices like “meditate/pray” as default; if a practice is uniquely relevant, include at most one and make it specific to the case.
4) If Life Guidance mode: add a gentle, peaceful closing line with prayer. If Doctrinal mode: close with prayer.`

  const constraintLine = language === 'en'
    ? 'Constraints:\n- Output must be in English only.\n- No medical or legal claims; keep it supportive and realistic.'
    : 'Constraints:\n- Output must be in Myanmar (Burmese) language only.\n- No medical or legal claims; keep it supportive and realistic.'

  const prompt = `User: ${displayName}
Religion: ${religion} (${religionName[language][religion]})
Question: "${question}"

${baseInstructions}

${modeInstructions}

${structureInstructions}

${constraintLine}`

  let answer: string | null = null
  const pref = (process.env.AI_PROVIDER || '').toLowerCase()
  if (pref === 'gemini') {
    answer = await askGemini(prompt)
    if (!answer) answer = await askOpenAI(prompt, language)
  } else {
    answer = await askOpenAI(prompt, language)
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
