import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'
import { logInfo, logError, reqMeta } from '@/lib/log'

const CATEGORY_KEYS = [
  'FAMILY',
  'COMMUNITY',
  'RELIGION',
  'SELF_GROWTH',
  'HEALTH',
  'FINANCIAL',
  'EDUCATION',
  'ENVIRONMENT',
  'KINDNESS',
  'PROFESSIONAL',
] as const

type CategoryKey = typeof CATEGORY_KEYS[number]
type BeliefKey = 'BUDDHIST' | 'HINDU' | 'CHRISTIAN' | 'ISLAM' | 'ATHEIST'

type AiResponse = {
  categories: CategoryKey[]
  feedback: string
}

export async function GET(req: Request) {
  const auth = getAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const deeds = await prisma.goodDeed.findMany({
    where: { userId: auth.uid },
    orderBy: { deedDate: 'desc' }
  })
  return NextResponse.json({ deeds })
}

export async function POST(req: Request) {
  const meta = reqMeta(req)
  const auth = getAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({} as any))
  const note = String(body?.note || '').trim()
  const deedDateInput = body?.deedDate || body?.date
  const language = (body?.language === 'en' ? 'en' : 'my')
  const belief = normalizeBelief(body?.belief)
  if (!note) return NextResponse.json({ error: 'Good deed description is required' }, { status: 400 })
  let deedDate = new Date()
  if (deedDateInput) {
    const parsed = new Date(deedDateInput)
    if (!isNaN(parsed.getTime())) deedDate = parsed
  }
  logInfo('GOOD_DEED_SUBMIT', { ...meta, userId: auth.uid, language, belief })
  const aiResult = await buildAiInsight(note, language, belief)
  const deed = await prisma.goodDeed.create({
    data: {
      userId: auth.uid,
      note,
      deedDate,
      categories: aiResult.categories as any,
      aiFeedback: aiResult.feedback,
      language,
      belief
    }
  })
  return NextResponse.json({ deed })
}

async function buildAiInsight(note: string, language: 'my' | 'en', belief: BeliefKey): Promise<AiResponse> {
  const beliefText = formatBelief(belief, language)
  const prompt = `
You are a kind mentor. Analyze the following good deed and respond in ${language === 'en' ? 'English' : 'Myanmar (Burmese)'}.

Deed: """${note}"""
Belief: ${belief}

Valid categories (return from this list only):
${CATEGORY_KEYS.join(', ')}

Return JSON ONLY:
{
  "categories": ["CATEGORY1","CATEGORY2"],
  "feedback": "Text in ${language === 'en' ? 'English' : 'Myanmar (Burmese)'} encouraging user. Include a short ${belief === 'ATHEIST' ? 'humanitarian or philosophical reflection' : 'reference or teaching from ${beliefText} (mention the scripture/teaching name, paraphrase without verse numbers)'} supporting their action. Explain positive impact for themselves and the community helped."
}

Guidelines:
- Pick at least 1 and at most 3 categories.
- Feedback must be 3–4 sentences, empathetic, concrete, no markdown.
- Reference should feel meaningful (e.g., "As the Buddha taught..." / "The Bible reminds us..." etc.).
`.trim()

  let text = await askGemini(prompt)
  if (!text) text = await askOpenAI(prompt, language)
  if (text) {
    const parsed = safeJson(text)
    if (parsed) {
      const cats = Array.isArray(parsed.categories)
        ? parsed.categories.map((c: string) => c?.toUpperCase()).filter((c: string): c is CategoryKey => CATEGORY_KEYS.includes(c as any))
        : []
      if (parsed.feedback && cats.length > 0) {
        return { categories: cats as CategoryKey[], feedback: String(parsed.feedback).trim() }
      }
    }
  }
  logError('GOOD_DEED_AI_FALLBACK', { note })
  return {
    categories: ['KINDNESS'],
    feedback: fallbackFeedback(language, belief)
  }
}

function safeJson(text: string) {
  try { return JSON.parse(text) } catch { return null }
}

function normalizeBelief(input: string | undefined): BeliefKey {
  const key = String(input || '').toUpperCase()
  if (key === 'BUDDHIST' || key === 'HINDU' || key === 'CHRISTIAN' || key === 'ISLAM' || key === 'ATHEIST') return key
  return 'ATHEIST'
}

function formatBelief(belief: BeliefKey, language: 'my'|'en') {
  const map: Record<BeliefKey, { en: string; my: string }> = {
    BUDDHIST: { en: 'Buddhist teaching', my: 'ဗုဒ္ဓဘာသာ သင်္ခန်းစာ' },
    HINDU: { en: 'Hindu scripture', my: 'ဟိန္ဒူ ဘာသာစကားအရ သင်ခန်းစာ' },
    CHRISTIAN: { en: 'Christian scripture', my: 'ခရစ်ယာန် သင်ခန်းစာ' },
    ISLAM: { en: 'Islamic scripture', my: 'အစ္စလာမ် သင်ခန်းစာ' },
    ATHEIST: { en: 'humanitarian or philosophical principle', my: 'လူသားရေး သဘောတရား' },
  }
  return map[belief][language]
}

function fallbackFeedback(language: 'my'|'en', belief: BeliefKey) {
  const map: Record<BeliefKey, { en: string; my: string }> = {
    BUDDHIST: {
      en: 'Your restraint reflects the Buddha’s teaching that generosity flows from mindful contentment. Each time you curb needless spending, you protect the resources that can support family and community. May this discipline continue to plant seeds of compassion and stability around you.',
      my: 'ငွေသုံးစွဲမှုကို ထိန်းသိမ်းသင့်တက်မှုသည် “အသက်သုံးအဆား ကင်းစင်မှ ကက်မယ့်ပညာ” ဟူသော ဗုဒ္ဓပညာကို သက်သေပြနေပါသည်။ မလိုအပ်သည့်အသုံးစရိတ်များကို ထိန်းချုပ်သည့် တစ်ချိန်ချင်းစီက မိသားစုနှင့် အသိုင်းအဝိုင်းအတွက် လုံခြုံသော အရင်းအမြစ်တည်ဆောက်ပေးနိုင်ပါသည်။ ဤသဘောထားက သင်ကြွယ်ဝသော ကျေးဇူးတရားများကို ဆက်လက် ခင်းကျင်းပေးပါစေ။'
    },
    HINDU: {
      en: 'In the Bhagavad Gita, Krishna praises the person who acts with self-discipline for the good of all. Your careful control of spending honors that dharmic wisdom and frees resources for more purposeful service. Continue shining this thoughtful light—it inspires family and community alike.',
      my: 'ဘဂဝဒ်ဂီတာတွင် “သတ္တဝါအားလုံးအကျိုးကို ထိန်းသိမ်းကြရ” ဟူသော ဂျှီတနွယ်တော်၏ ပူဇော်အပ်သည့် သင်ခန်းစာရှိပါသည်။ သင်၏ အသုံးစရိတ် ထိန်းချုပ်မှုသည် ထိုဓာတ်သိပ္ပံကို လေးစားညွှန်ပြနေပြီး သဘောတရားကျသော ကွင်းလယ်သို့ ရင်းနှီးရရှိစေပါသည်။ ယနေ့ကဲ့သို့ ပိုမိုကောင်းမွန်သော အလင်းဖွင့်မှုကို ဆက်လက် ပြင်းထန်စေပါစေ။'
    },
    CHRISTIAN: {
      en: 'Jesus reminds us that “where your treasure is, there your heart will be also.” Stewarding your finances with love allows you to bless others and keeps your heart open to God’s guidance. Keep walking this generous path—it multiplies grace for you and those you serve.',
      my: 'ယေရှုက “သင့်ဓမ္မရာဇာရာထိုက်သည့်မှာ သင့်နှလုံးသား ထွက်ပေါ်မည်” ဟု သင်္ခန်းစာပေးထားသည်။ သင်၏ ငွေကြေးကို ချစ်ခြင်း စနစ်ဖြင့် ထိန်းသိမ်းရခြင်းသည် အခြားသူများကို မေတ္တာဖြင့် ကူညီနိုင်စေပြီး ဘုရားသခင်၏ အညွှန်းအကြံကိုလည်း လက်ခံနိုင်စေပါသည်။ ယနေ့ကဲ့သို့ ချစ်ခြင်းတရားရှိသော လမ်းကြောင်းကို ဆက်လက် လျှောက်လှမ်းပါ—အလှရှင်သလွှဲက သင်နှင့် သင်ကူညီတတ်သူများကို သာယာစေပါသည်။'
    },
    ISLAM: {
      en: 'The Qur’an teaches that moderation is beloved by Allah, and every act of restraint protects the blessings entrusted to you. By avoiding waste, you preserve barakah for family and neighbors needing support. Continue this mindful spending—your example strengthens the ummah’s compassion.',
      my: 'ကူရအန်ထဲတွင် “အလွန်အကျွံ မပြုသင့်ပါ” ဟု သာလွန်ပညာ ရှိပါသည်။ သင်၏ အသုံးအဆောက် ထိန်းသိမ်းမှုသည် အလားတကာတွင် ရှိသမျှ အကောင်းအကျိုးများကို ကာကွယ်ပေးပါတယ်။ လိုအပ်သူများအတွက် ပြန်လည်ဝေမျှစေနိုင်သော ရင်းမြစ်များကို ထိန်းသိမ်းပေးသဖြင့် သင်၏ လမ်းညွှန်မှုသည် ဥမ္မာတစ်ရပ်၏ ကြင်နာမှုကို ပိုမို တည်မြဲစေပါသည်။'
    },
    ATHEIST: {
      en: 'Choosing not to waste money shows maturity and respect for every resource you hold. Each mindful choice protects your future goals and opens space to assist people in need. Keep honoring that principle—it strengthens both your character and the communities around you.',
      my: 'ငွေကြေးကို အလဟထုတ်မသုံးစွဲရန် ဆုံးဖြတ်မှုသည် သင်၏ တန်ဖိုးထားမှုတန်ခိုးကို ပြသနေပါသည်။ သိမ်မွေ့စွာ ထိန်းသိမ်းသည့်အခါတိုင်း သင့် အနာဂတ် ရည်ရွယ်ချက်များကို အထောက်အကူပြု၍ လိုအပ်သူများအား အကူအညီပေးနိုင်သော အခွင့်အလမ်းများ ရရှိစေပါသည်။ ဤသဘောထားကို ဆက်လက် ကြည်ညိုစေပါ — သင့် စရိုက်ကို ပိုမိုေပြာချင်စေသလို အသိုင်းအဝိုင်းကိုလည်း ပြင်းထန်စေပါသည်။'
    }
  }
  const entry = map[belief]
  return language === 'en' ? entry.en : entry.my
}

async function askGemini(prompt: string) {
  const key = process.env.GEMINI_API_KEY
  const model = (process.env.GEMINI_MODEL || 'gemini-2.0-flash').trim()
  if (!key) return null
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6 }
      })
    })
    const json = await res.json().catch(()=>({}))
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text
    if (res.ok && text) return text
  } catch {}
  return null
}

async function askOpenAI(prompt: string, language: 'my'|'en') {
  const key = process.env.OPENAI_API_KEY
  const model = (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim()
  if (!key) return null
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      })
    })
    const json = await res.json().catch(()=>({}))
    const text = json?.choices?.[0]?.message?.content
    if (res.ok && text) return text
  } catch {}
  return null
}
