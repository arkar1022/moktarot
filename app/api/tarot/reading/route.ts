import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

async function askOpenAI(prompt: string) {
  const key = process.env.OPENAI_API_KEY
  const envModel = (process.env.OPENAI_MODEL || '').trim()
  // Allow common typo like "gpt5" by falling back to supported models
  const candidates = [
    envModel && /gpt\s*5/i.test(envModel) ? 'gpt-4o' : envModel,
    'gpt-4o',
    'gpt-4',
    'gpt-4o-mini',
  ].filter(Boolean) as string[]

  if (!key) {
    // Dev fallback: return a mocked answer
    return 'စမ်းသပ်နေမှုအတွက် အဖြေ Mock ပြန်သွားပါသည် — OPENAI_API_KEY ထည့်သွင်းပြီး ပြန်ကြိုးစားပါ။'
  }

  const makeBody = (model: string) => ({
    model,
    messages: [
      { role: 'system', content: 'မြန်မာစာကို ရိုးရှင်းသဘောကျစွာ သုံးပြီး လူကိုးကားသံတစ်သံဖြင့် ဆွေးနွေးပေးပါ။ စာပေအရသာမထုံးစံပါစေ။ သိပ္ပံနည်းကျဖြစ်သော်လည်း အနူးအညွှတ်နှင့် စိတ်ပူကြပါစေဟု မစကားကောင်းပါ। အဖြေတွင် ကတ်တစ်ကတ်စီ၏ ရည်ညွှန်းချက်များကို မေးခွန်းနှင့် ဆက်စပ်အောင် တိုတောင်းပြောပီး နောက်ဆုံးတွင် စုပေါင်းသရုပ်ဆောင်ဖော်ပြချက်နှင့် လက်တွေ့လုပ်ရမယ့် အကြံပြုချက် 2-3 ခု ထည့်ပါ။' },
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

  return 'မော်ဒယ်မရရှိနိုင်သော်လည်း — OPENAI_MODEL ကို gpt-4o (သို့) gpt-4 အဖြစ် ပြောင်းပြီး နောက်တစ်ကြိမ် ပြန်ကြိုးစားပါ။'
}

async function askGemini(prompt: string) {
  const key = process.env.GEMINI_API_KEY
  const model = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim()
  if (!key) return null
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}` , {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `မြန်မာဘာသာဖြင့် ဖြေပါ။ အမျိုးသား တာရော့ဖတ်ရှုသူ (ယောကျ်ားသံ) သဘောတရားဖြင့် တိတိကျကျ ပြောပါ။\n\n${prompt}` }] }
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
  const auth = getAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { question, selectedCards, language = 'my' } = await req.json()
  const q = (question ?? '').toString().trim()
  if (!q || q.length > 150 || !Array.isArray(selectedCards) || selectedCards.length !== 3) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  // Per-user daily limit + spillover from extraQuota
  let willConsumeExtra = false
  if (auth.role !== 'ADMIN') {
    const dbUser = await prisma.user.findUnique({ where: { id: auth.uid }, select: { dailyLimit: true, extraQuota: true } }).catch(()=>null as any)
    const limit = dbUser?.dailyLimit ?? Number(process.env.DAILY_READING_LIMIT || 3)
    const now = new Date()
    const startUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0))
    const countToday = await prisma.reading.count({
      where: { userId: auth.uid, createdAt: { gte: startUTC } }
    })
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
  const displayName = (auth.name?.trim() || auth.email?.split('@')[0] || '').trim() || 'မိတ်ဆွေ'
  const prompt = `အသုံးပြုသူအမည်: ${displayName}
မေးခွန်း: "${q}"
ရွေးချယ်ထားသော ကတ်များ: ${cardsText}

တုံ့ပြန်ရမည့် စတိုင်နှင့် ဖွဲ့စည်းပုံ (Tone & Structure):
- အမျိုးသား တာရော့ဖတ်ရှုသူတစ်ဦးလို (ယောကျ်ားသံ) နွေးထွေးသော်လည်း ခိုင်မာတိကျစွာ ပြောပါ။
- အလွန်ရည်းစားသို့မဟုတ် ပေါ့ပါးလွန်းသော စကားလုံးများကို ရှောင်ရှားပါ။
1) ကတ်တစ်ကတ်စီ၏ အဓိပ္ပါယ်ကို မေးခွန်းနှင့် တိုက်ဆိုင်အောင် အတိုချုံး ခိုင်မာဖော်ပြပါ (အခွင့်အလမ်း/ရှားပါးချက်/အတားအဆီး).
2) နောက်ဆုံးတွင် စုပေါင်းသဘောတရား (အဓိကမက်ဆေ့ချ်) ကို တစ်ပိုဒ် တိတိကျကျ ဆွဲထုတ်ပါ — စာတို/မကြာပါစေ။
3) လက်တွေ့လုပ်ဆောင်နိုင်သော အကြံပြုချက် 2–3 ချက် ထည့်ပါ (ယနေ့/တစ်ပါတ်အတွင်း လုပ်နိုင်ရန်).
4) အလွန်ကဗျာရေးသံ၊ သဒ္ဒါရှည်ရှည်များကို ရှောင်ပါ — လက်တွေ့ကျ၊ အသုံးဝင်စေရန် ဦးတည်ပါ။
- စကားအစတွင် ${displayName} အမည်ကို တစ်ကြိမ်သာ သဘောတော်တော်နဲ့ သုံးပြီး ဆက်လက်ရှင်းပြပါ။`

  let answer: string | null = null
  const provider = (process.env.AI_PROVIDER || '').toLowerCase()
  if (provider === 'gemini') {
    answer = await askGemini(prompt)
    if (!answer) answer = await askOpenAI(prompt)
  } else {
    // default to OpenAI; if missing, try Gemini
    answer = await askOpenAI(prompt)
    if (!answer || /Mock ပြန်သွားပါ/.test(answer)) {
      const g = await askGemini(prompt)
      if (g) answer = g
    }
  }

  if (!answer) {
    answer = 'သုံးစွဲသည့် AI ဝန်ဆောင်မှုမရနိုင်ပါ — OPENAI_API_KEY (သို့) GEMINI_API_KEY စစ်ဆေးပါ။'
  }

  // Determine category using available provider(s)
  let category: any = null
  const provider2 = (process.env.AI_PROVIDER || '').toLowerCase()
  if (provider2 === 'gemini') {
    category = normalizeCategory(await askGeminiCategory(q)) || normalizeCategory(await askOpenAICategory(q))
  } else {
    category = normalizeCategory(await askOpenAICategory(q)) || normalizeCategory(await askGeminiCategory(q))
  }

  let reading
  try {
    reading = await prisma.reading.create({
      data: {
        userId: auth.uid,
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
        userId: auth.uid,
        question: q,
        cards: selectedCards,
        answer,
        language,
      }
    })
  }

  // If we needed to consume an extra quota unit, decrement now
  if (willConsumeExtra && auth.role !== 'ADMIN') {
    try {
      await prisma.user.update({ where: { id: auth.uid }, data: { extraQuota: { decrement: 1 } } })
    } catch {}
  }

  return NextResponse.json({ reading })
}
