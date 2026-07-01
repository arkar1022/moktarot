import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'
import { logInfo, reqMeta } from '@/lib/log'
import { isWithoutDbMode } from '@/lib/runtime'

async function askOpenAI(prompt: string, lang: 'my'|'en'): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY
  const envModel = (process.env.OPENAI_MODEL || '').trim()
  // Allow common typo like "gpt5" by falling back to supported models
  const candidates = [
    envModel && /gpt\s*5/i.test(envModel) ? 'gpt-4o' : envModel,
    'gpt-4o',
    'gpt-4',
    'gpt-4o-mini',
  ].filter(Boolean) as string[]

  if (!key) return null

  const makeBody = (model: string) => ({
    model,
    messages: [
      {
        role: 'system',
        content: [
          'You are a warm yet confident male tarot reader who speaks plainly and practically.',
          'Avoid poetic flourishes, relate each selected card to the user\'s question, then close with one overall takeaway and at least three actionable suggestions.',
          'Do not restrict the overall answer to a specific sentence count—offer as much detail as needed while staying focused.',
          'When the user compares multiple people or options, analyze the cards\' environments, numerology, suits, and archetypes to identify the strongest match, explicitly referencing genders, energies, or traits suggested by the cards.',
          'If several people are mentioned, describe the appearance, vibe, and personality cues implied by each relevant card so the user can recognize who aligns closest.',
          'When the user asks "when" or about timing, translate the cards\' numerology/astrological signals into a concrete window (e.g., within a week, by September-October, over 3 months) rather than vague wording.',
          'Always cite the specific symbols or scenes from the drawn cards to justify recommendations instead of giving generic advice.',
          lang === 'my'
            ? 'Deliver the full response in Burmese (Myanmar) with a professional male tone that feels natural to Burmese clients.'
            : 'Deliver the full response in English with the same confident tone.',
          lang === 'my'
            ? 'Leave tarot card names in English even when the body text is in Burmese.'
            : ''
        ].join(' ')
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.85,
  })

  for (const model of candidates) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify(makeBody(model))
      })
      const json = await res.json().catch(() => ({}))
      const content = json?.choices?.[0]?.message?.content
      if (res.ok && content) return content
      // try next model if this one failed / not available
    } catch {
      // ignore and try next
    }
  }

  return null
}

async function askGemini(prompt: string, lang: 'my'|'en') {
  const key = process.env.GEMINI_API_KEY
  const model = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim()
  if (!key) return null
  try {
    const localeHint = lang === 'my'
      ? 'Localization: Provide the full answer in Burmese (Myanmar) using a professional male tarot reader tone that feels natural to Burmese clients.'
      : 'Localization: Provide the full answer in English with the same confident male tone.'
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}` , {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${localeHint}\n\n${prompt}` }] }
        ],
        generationConfig: { temperature: 0.85 }
      })
    })
    const json = await res.json().catch(() => ({}))
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text
    if (res.ok && typeof text === 'string' && text.trim()) return text
  } catch {
    // ignore
  }
  return null
}

// --- Category helpers -------------------------------------------------------
async function askOpenAICategory(question: string) {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null
  const model = (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim()
  const sys = "Classify the user's tarot question into ONE category from this list only: LOVE, MARRIAGE, WORK, LIFESTYLE, SPIRITUAL, EDUCATION, HEALTH, MONEY. Respond with the category token only."
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model, temperature: 0, messages: [ { role: 'system', content: sys }, { role: 'user', content: question } ] })
    })
    const json = await res.json().catch(() => ({}))
    const content = json?.choices?.[0]?.message?.content as string | undefined
    if (res.ok && content) return content.trim().toUpperCase()
  } catch {}
  return null
}

async function askGeminiCategory(question: string) {
  const key = process.env.GEMINI_API_KEY
  const model = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim()
  if (!key) return null
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}` , {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [ { role: 'user', parts: [{ text: 'Choose one category from: LOVE, MARRIAGE, WORK, LIFESTYLE, SPIRITUAL, EDUCATION, HEALTH, MONEY. Output the token only.\n\nQuestion: ' + question }] } ],
        generationConfig: { temperature: 0 }
      })
    })
    const json = await res.json().catch(() => ({}))
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined
    if (res.ok && text) return text.trim().toUpperCase()
  } catch {}
  return null
}

function normalizeCategory(label: string | null | undefined): 'LOVE'|'MARRIAGE'|'WORK'|'LIFESTYLE'|'SPIRITUAL'|'EDUCATION'|'HEALTH'|'MONEY' | null {
  if (!label) return null
  const x = label.trim().toUpperCase()
  const map: Record<string, string> = {
    ROMANCE: 'LOVE', RELATIONSHIP: 'LOVE', RELATIONSHIPS: 'LOVE',
    CAREER: 'WORK', JOB: 'WORK', BUSINESS: 'WORK',
    MONEY: 'MONEY', FINANCE: 'MONEY', FINANCES: 'MONEY', WEALTH: 'MONEY',
    STUDY: 'EDUCATION', SCHOOL: 'EDUCATION', LEARNING: 'EDUCATION',
    SPIRITUALITY: 'SPIRITUAL', FAITH: 'SPIRITUAL', RELIGION: 'SPIRITUAL',
    HEALTH: 'HEALTH', WELLNESS: 'HEALTH',
    MARRIAGE: 'MARRIAGE', WEDDING: 'MARRIAGE',
    LIFESTYLE: 'LIFESTYLE', LIFE: 'LIFESTYLE', FAMILY: 'LIFESTYLE', FRIENDS: 'LIFESTYLE'
  }
  const allowed = new Set(['LOVE','MARRIAGE','WORK','LIFESTYLE','SPIRITUAL','EDUCATION','HEALTH','MONEY'])
  if (allowed.has(x)) return x as any
  if (map[x]) return map[x] as any
  return null
}

export async function POST(req: Request) {
  const meta = reqMeta(req)
  const withoutDbMode = isWithoutDbMode()
  const auth = withoutDbMode ? null : getAuth(req)
  if (!withoutDbMode && !auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { question, selectedCards, language = 'my', displayName: rawDisplayName } = await req.json()
  const q = (question ?? '').toString().trim()
  const userId = auth?.uid || 'guest-local'
  logInfo('TAROT_READING_REQUEST', { ...meta, userId, qlen: q.length, withoutDbMode })
  if (!q || q.length > 150 || !Array.isArray(selectedCards) || selectedCards.length !== 3) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  // Per-user daily limit + spillover from extraQuota
  let willConsumeExtra = false
  if (!withoutDbMode && auth?.role !== 'ADMIN') {
    const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { dailyLimit: true, extraQuota: true } }).catch(()=>null as any)
    const limit = dbUser?.dailyLimit ?? Number(process.env.DAILY_READING_LIMIT || 3)
    const now = new Date()
    const startUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0))
    const [tarotCount, natalCount] = await Promise.all([
      prisma.reading.count({ where: { userId, createdAt: { gte: startUTC } } }),
      prisma.natalReadingRecord.count({
        where: {
          userId,
          createdAt: { gte: startUTC },
          OR: [{ phase: null }, { phase: 'planets' }],
          status: 'success'
        }
      })
    ])
    const countToday = tarotCount + natalCount
    if (countToday >= limit) {
      // Allow if extra quota remains; consume one
      if (dbUser && (dbUser.extraQuota ?? 0) > 0) {
        willConsumeExtra = true
      } else {
        return NextResponse.json({ error: `ယနေ့အတွက် မေးခွန်း ${limit} ကြိမ် ပြည့်ပြီးပါပြီ` }, { status: 429 })
      }
    }
  }

  const cardsText = selectedCards.map((c: any) => (typeof c === 'string' ? c : c.name)).join(', ')
  const displayName = withoutDbMode
    ? (typeof rawDisplayName === 'string' ? rawDisplayName.trim() : '') || (language === 'en' ? 'Friend' : 'မိတ်ဆွေ')
    : (auth?.name?.trim() || auth?.email?.split('@')[0] || '').trim() || 'မိတ်ဆွေ'
  const basePrompt = `User name: ${displayName}
Question: "${q}"
Selected cards: ${cardsText}

Tone & Structure:
- Speak like a warm but confident male tarot reader.
- Avoid overly romantic or flowery language.
1) Summarize each selected card in relation to the question (opportunities/challenges/obstacles).
2) End with one concise overall message (main takeaway).
3) Add at least 3 practical, actionable suggestions (today/this week) and include more when it helps clarity.
4) Keep it practical and useful; avoid long poetic sentences.
- Use ${displayName}'s name once at the start, then continue the explanation.
- Do not limit the entire answer to a fixed number of sentences—elaborate as needed while staying focused.

Concrete Guidance:
- When asked to choose between people or options, decide clearly and justify it with the cards' suits, numerology, and character energies (e.g., feminine vs masculine archetypes) rather than vague statements.
- If multiple people are referenced, describe how the card imagery suggests their appearance, demeanor, or role so the user can tell who matches.
- For timing/date questions, convert the cards' numerology or seasonal/astrological symbols into a timeframe such as "within a week", "over the next month", or "between September and October".
- Cite concrete environments, symbols, or characters from the drawn cards whenever explaining guidance.`
  const localizationPrompt = language === 'my'
    ? `Localization:
- Provide the entire reading in Burmese (Myanmar) using a natural yet professional male tone suitable for Burmese clients.
- Ensure the language sounds confident and grounded while remaining respectful.
- Keep the tarot card names in English even though the explanation is Burmese.`
    : `Localization:
- Provide the entire reading in natural English using the same confident, grounded tone.`
  const prompt = `${basePrompt}

${localizationPrompt}`

  let answer: string | null = null
  let provider = (process.env.AI_PROVIDER || '').toLowerCase()
  if (language === 'en') provider = 'gemini'
  if (provider === 'gemini') {
    answer = await askGemini(prompt, language)
    if (!answer) answer = await askOpenAI(prompt, language)
  } else {
    // default to OpenAI; if unavailable or unsupported, fall back to Gemini
    answer = await askOpenAI(prompt, language)
    if (!answer) answer = await askGemini(prompt, language)
  }

  if (!answer) {
    answer = language === 'en'
      ? 'The AI service is unavailable right now. Please try again shortly.'
      : 'AI ဝန်ဆောင်မှုကို ယခု မရနိုင်သေးပါ — ခဏနေရင် ပြန်ကြိုးစားပေးပါ။'
  }

  // Determine category using available provider(s)
  let category: any = null
  const provider2 = (process.env.AI_PROVIDER || '').toLowerCase()
  if (provider2 === 'gemini') {
    category = normalizeCategory(await askGeminiCategory(q)) || normalizeCategory(await askOpenAICategory(q))
  } else {
    category = normalizeCategory(await askOpenAICategory(q)) || normalizeCategory(await askGeminiCategory(q))
  }

  let reading: any
  if (withoutDbMode) {
    reading = {
      id: `guest-${Date.now()}`,
      question: q,
      cards: selectedCards,
      answer,
      language,
      category: category || null,
      createdAt: new Date().toISOString(),
    }
  } else {
    try {
      reading = await prisma.reading.create({
        data: {
          userId,
          question: q,
          cards: selectedCards,
          answer,
          language,
          category: category || undefined,
        }
      })
    } catch (e: any) {
      // Fallback for environments where migration hasn't been applied yet
      reading = await prisma.reading.create({
        data: {
          userId,
          question: q,
          cards: selectedCards,
          answer,
          language,
        }
      })
    }
  }

  // If we needed to consume an extra quota unit, decrement now
  if (!withoutDbMode && willConsumeExtra && auth?.role !== 'ADMIN') {
    try {
      await prisma.user.update({ where: { id: userId }, data: { extraQuota: { decrement: 1 } } })
    } catch {}
  }

  return NextResponse.json({ reading })
}
