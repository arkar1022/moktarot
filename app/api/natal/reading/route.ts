import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { logError, logInfo, reqMeta } from '@/lib/log'

type Lang = 'my' | 'en'
type Phase = 'planets' | 'houses'

type NatalMetadata = {
  birthDate: string
  birthTime: string
  timezoneMinutes: number
  latitude: number
  longitude: number
  houseSystem: string
  utcIso?: string
}

type Angle = { deg: number; min: number; sec: number }

type PlanetDescriptor = {
  id: string
  labelEn: string
  labelMy: string
  signEn: string
  signMy: string
  degree: string
  retrograde: boolean
}

type HouseDescriptor = {
  id: string
  number: number
  signEn: string
  signMy: string
  degree: string
}

type ChartPoint = {
  id: 'ascendant' | 'midheaven'
  labelEn: string
  labelMy: string
  signEn: string
  signMy: string
  degree: string
}

type ReadingTopic = {
  id: string
  title: string
  focus: string
  message: string
  keywords: string[]
}

type ReadingSummary = {
  title: string
  message: string
  keywords: string[]
}

type ReadingResponse = {
  phase: Phase
  topics: ReadingTopic[]
  summary?: ReadingSummary
  source: 'ai' | 'fallback'
}

type PromptBundle = {
  system: string
  user: string
}

const DEGREE_SYMBOL = '\u00B0'
const MAX_TOPICS = 12
const PLANET_ORDER = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto','chiron','northNode'] as const

const DEFAULT_NAME: Record<Lang, string> = {
  en: 'Friend',
  my: 'မိတ်ဆွေ'
}

const PLANET_THEMES: Record<typeof PLANET_ORDER[number], { focus: Record<Lang, string>; keywords: Record<Lang, string[]> }> = {
  sun: {
    focus: { en: 'Identity & vitality', my: 'ကိုယ်ပိုင်စိတ်ဓာတ်နှင့် အသက်အင်အား' },
    keywords: { en: ['identity','confidence'], my: ['ကိုယ်ပိုင်','ယုံကြည်ချက်'] }
  },
  moon: {
    focus: { en: 'Emotional safety', my: 'စိတ်ခံစားမှု လုံခြုံရေး' },
    keywords: { en: ['feelings','intuition'], my: ['ခံစားချက်','အတွေးထင်ဟပ်'] }
  },
  mercury: {
    focus: { en: 'Mind & communication', my: 'စိတ်နှင့် ဆက်သွယ်မှု' },
    keywords: { en: ['ideas','dialogue'], my: ['ထင်မြင်ချက်','ဆက်သွယ်မှု'] }
  },
  venus: {
    focus: { en: 'Love & magnetism', my: 'ချစ်ခြင်းနှင့် ဆွဲဆောင်မှု' },
    keywords: { en: ['love','harmony'], my: ['ချစ်ခြင်း','သဟဇာတ'] }
  },
  mars: {
    focus: { en: 'Drive & courage', my: 'အရေးတကြီးလုပ်သည့်စိတ်နှင့် သတ္တိ' },
    keywords: { en: ['drive','courage'], my: ['လှုံ့ဆော်မှု','သတ္တိ'] }
  },
  jupiter: {
    focus: { en: 'Growth & optimism', my: 'တိုးတက်မှုနှင့် မျှော်လင့်ချက်' },
    keywords: { en: ['growth','faith'], my: ['တိုးတက်','ယုံကြည်မှု'] }
  },
  saturn: {
    focus: { en: 'Discipline & structure', my: 'စည်းမျဉ်းနှင့် တည်ဆောက်မှု' },
    keywords: { en: ['duty','structure'], my: ['တာဝန်','တည်ဆောက်မှု'] }
  },
  uranus: {
    focus: { en: 'Innovation & freedom', my: 'တီထွင်မှုနှင့် လွတ်လပ်ခွင့်' },
    keywords: { en: ['change','freedom'], my: ['ပြောင်းလဲမှု','လွတ်လပ်မှု'] }
  },
  neptune: {
    focus: { en: 'Dreams & spirituality', my: 'အိပ်မက်နှင့် ဝိညာဉ်ရေးရာ' },
    keywords: { en: ['dreams','compassion'], my: ['အိပ်မက်','မျက်နှာဖြူချမ်းမှု'] }
  },
  pluto: {
    focus: { en: 'Power & rebirth', my: 'စွမ်းအားနှင့် ပြန်လည်မွေးဖွားမှု' },
    keywords: { en: ['power','rebirth'], my: ['စွမ်းအား','ပြန်လည်ထမြောက်'] }
  },
  chiron: {
    focus: { en: 'Healing & vulnerability', my: 'ကုထုံးနှင့် အလွယ်တကူထိခိုက်နိုင်မှု' },
    keywords: { en: ['healing','wisdom'], my: ['ကုထုံး','ပညာ'] }
  },
  northNode: {
    focus: { en: 'Destiny & stretch zone', my: 'ဘဝရည်မှန်းချက်နှင့် မြင်ကွင်းတိုးချဲ့မှု' },
    keywords: { en: ['destiny','progress'], my: ['ဘဝရေးရာ','တိုးတက်မှု'] }
  }
}

const HOUSE_THEMES: Record<number, { focus: Record<Lang, string>; keywords: Record<Lang, string[]> }> = {
  1: { focus: { en: 'Self & identity', my: 'ကိုယ်ပိုင်ပုံရိပ်' }, keywords: { en: ['self','appearance'], my: ['ကိုယ်ပုံရိပ်','ပြင်ပ'] } },
  2: { focus: { en: 'Resources & values', my: 'ပိုင်ဆိုင်မှုနှင့် တန်ဖိုး' }, keywords: { en: ['money','values'], my: ['ငွေကြေး','တန်ဖိုး'] } },
  3: { focus: { en: 'Communication & siblings', my: 'ဆက်သွယ်မှုနှင့် ညီအစ်ကိုမောင်နှမ' }, keywords: { en: ['speech','siblings'], my: ['စကားပြော','မောင်နှမ'] } },
  4: { focus: { en: 'Home & roots', my: 'အိမ်နှင့် မျိုးရိုးရာ' }, keywords: { en: ['home','roots'], my: ['အိမ်','မျိုးရိုး'] } },
  5: { focus: { en: 'Creativity & romance', my: 'ဖန်တီးမှုနှင့် အားလပ်ချစ်ရေး' }, keywords: { en: ['joy','romance'], my: ['ပျော်ရွှင်','ချစ်ရေး'] } },
  6: { focus: { en: 'Daily work & wellness', my: 'နေ့စဉ်လုပ်ငန်းနှင့် ကျန်းမာရေး' }, keywords: { en: ['routine','health'], my: ['နေ့စဉ်အလုပ်','က်န်းမာရေး'] } },
  7: { focus: { en: 'Partnerships & mirrors', my: 'မိတ်ဖက်နှင့် အကြမ်းဖျင်းထင်မြင်ချက်' }, keywords: { en: ['partners','marriage'], my: ['မိတ်ဖက်','အိမ်ထောင်'] } },
  8: { focus: { en: 'Shared resources & rebirth', my: 'အမျှဝေ ပိုင်ဆိုင်မှုနှင့် ပြန်လည်မွေးဖွား' }, keywords: { en: ['intimacy','rebirth'], my: ['နီးစပ်ခြင်း','ပြန်လည်မွေးဖွား'] } },
  9: { focus: { en: 'Beliefs & exploration', my: 'ယုံကြည်ချက်နှင့် ခရီးသွားမှု' }, keywords: { en: ['beliefs','travel'], my: ['ယုံကြည်ချက်','ခရီး'] } },
 10: { focus: { en: 'Career & reputation', my: 'အလုပ်အကိုင်နှင့် ကောင်းတင့်သရော်' }, keywords: { en: ['career','status'], my: ['အလုပ်အကိုင်','ဂုဏ်သိက္ခာ'] } },
 11: { focus: { en: 'Networks & aspirations', my: 'မိတ်ဆွေကွန်ယက်နှင့် အလားအလာ' }, keywords: { en: ['friends','future'], my: ['မိတ်ဆွေ','အနာဂတ်'] } },
 12: { focus: { en: 'Inner world & healing', my: 'အတွင်းဗိမာန်နှင့် ကုထုံး' }, keywords: { en: ['spirit','healing'], my: ['ဝိညာဉ်','ကုထုံး'] } }
}

function formatOffset(minutes: number) {
  const sign = minutes >= 0 ? '+' : '-'
  const abs = Math.abs(minutes)
  const hours = Math.floor(abs / 60).toString().padStart(2, '0')
  const mins = (abs % 60).toString().padStart(2, '0')
  return `UTC${sign}${hours}:${mins}`
}

function formatAngle(value?: Angle | number | null) {
  if (value && typeof value === 'object' && Number.isFinite(value.deg)) {
    const min = Math.abs(Math.round(value.min ?? 0))
    const sec = Math.abs(Math.round(value.sec ?? 0))
    return `${value.deg}${DEGREE_SYMBOL} ${String(min).padStart(2, '0')}' ${String(sec).padStart(2, '0')}"`
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const deg = Math.floor(value)
    const minutes = Math.abs(Math.round((value - deg) * 60))
    return `${deg}${DEGREE_SYMBOL} ${String(minutes).padStart(2, '0')}'`
  }
  return ''
}

function sanitizeLabel(input: unknown, lang: Lang) {
  const text = typeof input === 'string' ? input.trim() : ''
  if (!text) return DEFAULT_NAME[lang]
  return text.slice(0, 48)
}

function normalizeMetadata(raw: any): NatalMetadata | null {
  if (!raw) return null
  const birthDate = typeof raw.birthDate === 'string' ? raw.birthDate : null
  const birthTime = typeof raw.birthTime === 'string' ? raw.birthTime : null
  const timezoneMinutes = Number(raw.timezoneMinutes)
  const latitude = Number(raw.latitude)
  const longitude = Number(raw.longitude)
  const houseSystem = typeof raw.houseSystem === 'string' ? raw.houseSystem : null
  if (!birthDate || !birthTime || !houseSystem) return null
  if (![timezoneMinutes, latitude, longitude].every(Number.isFinite)) return null
  return {
    birthDate,
    birthTime,
    timezoneMinutes,
    latitude,
    longitude,
    houseSystem,
    utcIso: typeof raw.utcIso === 'string' ? raw.utcIso : undefined
  }
}

function normalizePlanets(raw: any): PlanetDescriptor[] {
  if (!Array.isArray(raw)) return []
  const map = new Map<string, PlanetDescriptor>()
  for (const entry of raw) {
    const key = typeof entry?.key === 'string' ? entry.key : null
    if (!key || !PLANET_ORDER.includes(key as any)) continue
    const labelEn = typeof entry.labelEn === 'string' ? entry.labelEn : key
    const labelMy = typeof entry.labelMy === 'string' ? entry.labelMy : labelEn
    const signEn = typeof entry?.sign?.en === 'string' ? entry.sign.en : ''
    const signMy = typeof entry?.sign?.my === 'string' ? entry.sign.my : signEn
    const degree = formatAngle(entry?.absoluteFormatted as Angle) || formatAngle(entry?.longitude)
    map.set(key, {
      id: key,
      labelEn,
      labelMy,
      signEn,
      signMy,
      degree,
      retrograde: Boolean(entry?.retrograde)
    })
  }
  return PLANET_ORDER.map(id => map.get(id)).filter(Boolean).slice(0, MAX_TOPICS) as PlanetDescriptor[]
}

function normalizeHouses(raw: any): HouseDescriptor[] {
  if (!Array.isArray(raw)) return []
  const arr: HouseDescriptor[] = []
  for (const entry of raw) {
    const number = Number(entry?.number)
    if (!Number.isFinite(number)) continue
    const signEn = typeof entry?.sign?.en === 'string' ? entry.sign.en : ''
    const signMy = typeof entry?.sign?.my === 'string' ? entry.sign.my : signEn
    const degree = formatAngle(entry?.absoluteFormatted as Angle) || formatAngle(entry?.degree)
    arr.push({
      id: `house-${number}`,
      number,
      signEn,
      signMy,
      degree
    })
  }
  return arr.sort((a, b) => a.number - b.number).slice(0, MAX_TOPICS)
}

function normalizePoint(raw: any, id: ChartPoint['id'], labelEn: string, labelMy: string): ChartPoint | null {
  if (!raw?.sign) return null
  const signEn = typeof raw.sign.en === 'string' ? raw.sign.en : ''
  const signMy = typeof raw.sign.my === 'string' ? raw.sign.my : signEn
  const degree = formatAngle(raw.formatted as Angle) || formatAngle(raw.degree)
  if (!signEn) return null
  return { id, labelEn, labelMy, signEn, signMy, degree }
}

function buildPrompt(args: {
  phase: Phase
  metadata: NatalMetadata
  planets: PlanetDescriptor[]
  houses: HouseDescriptor[]
  asc?: ChartPoint | null
  mid?: ChartPoint | null
  language: Lang
  label: string
}): PromptBundle {
  const { phase, metadata, planets, houses, asc, mid, language, label } = args
  const name = label || DEFAULT_NAME[language]
  const header = [
    `Client: ${name}`,
    `Birth: ${metadata.birthDate} ${metadata.birthTime} (${formatOffset(metadata.timezoneMinutes)})`,
    `Location: lat ${metadata.latitude.toFixed(2)}, lon ${metadata.longitude.toFixed(2)}`,
    `House system: ${metadata.houseSystem}`
  ]
  const planetLines = planets.map((planet, idx) => {
    const rx = planet.retrograde ? 'retrograde' : 'direct'
    return `${idx + 1}. id=${planet.id}; ${planet.labelEn}/${planet.labelMy}; sign=${planet.signEn}/${planet.signMy}; degree=${planet.degree}; motion=${rx}`
  })
  const houseLines = houses.map(h => `${h.number}. id=${h.id}; sign=${h.signEn}/${h.signMy}; degree=${h.degree}`)
  const points = [asc, mid].filter(Boolean).map(point => `${(point as ChartPoint).labelEn}/${(point as ChartPoint).labelMy}: ${(point as ChartPoint).signEn}/${(point as ChartPoint).signMy} at ${(point as ChartPoint).degree}`)

  const statusLine = phase === 'planets'
    ? (language === 'en'
        ? 'Describe how each planet shapes the native. Mention life areas (identity, money, relationships, etc).'
        : 'ဂြိုလ်တစ်လုံးစီ၏ သက်ရောက်မှုကို အကျဉ်းချုံး ဖော်ပြပါ။ ကိုယ်ပိုင်ရေးရာ၊ ငွေကြေး၊ ဆက်ဆံရေး စသည့် ဘဝကဏ္ဍများကို ထည့်သွင်းပါ။')
    : (language === 'en'
        ? 'Interpret each house cusp. Show how the sign/degree colors real-life focus. After the 12 houses, deliver a concise summary weaving repeating motifs plus 2-3 actionable reminders.'
        : 'အိမ်စွန်းတိုင်း၏ အဓိပ္ပါယ်ကို ဆန်းစစ်ရေးသားပါ။ ရာသီနှင့် ဒီဂရီက ဘဝရည်ရွယ်ချက်ကို ဘယ်လို သွင်ပြင်ပေးသည်ကို ရှင်းပြပါ။ အိမ် ၁၂ ခု ပြီးလျှင် ထပ်တူထပ်ရော ပုံစံများကို ပြန်ရောပြီး လက်တွေ့ဆောင်ရန် အစုလိုက်အသေးစား အကြံပြုချက် ၂-၃ ချက်ပါသော အနှုတ်ချုပ် တစ်ပိုဒ် ထည့်ပါ။')

  const formatGuide = [
    'Return JSON only with this shape:',
    phase === 'planets'
      ? `{"topics":[{"id":"","title":"","focus":"","message":"","keywords":["",""]}] }`
      : `{"topics":[{"id":"","title":"","focus":"","message":"","keywords":["",""]}],"summary":{"title":"","message":"","keywords":["",""]}}`,
    `Use these topic ids exactly: ${(phase === 'planets' ? planets : houses).map(item => item.id).join(', ')}.`,
    'Each message should be 2–3 sentences, practical and poetic but not flowery. Keywords should be <=3 short phrases.'
  ]

  const system = language === 'en'
    ? 'You are MokTarot’s seasoned Burmese astrologer. Speak in confident, warm English with a grounded male voice.'
    : 'သင်သည် MokTarot ၏ ဇာတာရှင်အဖြစ် သက်တမ်းကြာသော မြန်မာ ဂြိုလ်ချတ်ဖော်သူဖြစ်သည်။ ရိုးရိုးမြန်မာဘာသာဖြင့် ယောကျ်ားသံတစ်သံ နွေးထွေးသော်လည်း တိကျစွာ ရေးသားပါ။'

  const user = [
    statusLine,
    ...formatGuide,
    '',
    'DATA:',
    header.join(' · '),
    '',
    'Planets:',
    ...planetLines,
    '',
    phase === 'houses' ? ['Houses:', ...houseLines, '', points.length ? `Angles: ${points.join(' | ')}` : ''].join('\n') : ''
  ].filter(Boolean).join('\n')

  return { system, user }
}

async function askOpenAI(bundle: PromptBundle) {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null
  const model = (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim() || 'gpt-4o-mini'
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.85,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: bundle.system },
          { role: 'user', content: bundle.user }
        ]
      })
    })
    const json = await res.json().catch(() => ({}))
    const content = json?.choices?.[0]?.message?.content
    if (res.ok && typeof content === 'string') return content
  } catch (err) {
    logError('NATAL_READING_OPENAI', {}, err)
  }
  return null
}

async function askGemini(bundle: PromptBundle) {
  const key = process.env.GEMINI_API_KEY
  if (!key) return null
  const model = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim()
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${bundle.system}\n\n${bundle.user}\n\nRespond with JSON only.` }]
          }
        ],
        generationConfig: {
          temperature: 0.85
        }
      })
    })
    const json = await res.json().catch(() => ({}))
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text
    if (res.ok && typeof text === 'string') return text
  } catch (err) {
    logError('NATAL_READING_GEMINI', {}, err)
  }
  return null
}

function extractJson(text: string | null) {
  if (!text) return null
  const trimmed = text.trim()
  const fenced = trimmed.match(/```json([\s\S]+?)```/)
  const payload = fenced ? fenced[1] : trimmed
  try {
    return JSON.parse(payload)
  } catch {
    const start = payload.indexOf('{')
    const end = payload.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(payload.slice(start, end + 1))
      } catch {
        return null
      }
    }
  }
  return null
}

function normalizeKeywords(value: any, lang: Lang): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .slice(0, 3)
    .map(entry => entry.slice(0, lang === 'en' ? 28 : 36))
}

function buildFallbackTopic(descriptor: PlanetDescriptor | HouseDescriptor, lang: Lang): ReadingTopic {
  if ('retrograde' in descriptor) {
    const planet = descriptor as PlanetDescriptor
    const theme = PLANET_THEMES[planet.id as typeof PLANET_ORDER[number]] || PLANET_THEMES.sun
    const focus = theme.focus[lang]
    const keywords = theme.keywords[lang]
    const retro = planet.retrograde
      ? (lang === 'en' ? 'retrograde introspection' : 'ပြန်လည်သုံးသပ်မှု')
      : (lang === 'en' ? 'direct momentum' : 'တည်တံ့လှုပ်ရှားမှု')
    const title = lang === 'en'
      ? `${planet.labelEn} • ${planet.signEn}`
      : `${planet.labelMy} • ${planet.signMy}`
    const message = lang === 'en'
      ? `${planet.labelEn} in ${planet.signEn} (${planet.degree}) leans toward ${focus.toLowerCase()}. Honor the ${retro} of this placement while cultivating ${keywords[0] ?? 'balance'}.`
      : `${planet.labelMy} သည် ${planet.signMy} (${planet.degree}) တွင် ရှိနေပြီး ${focus} ကို အလေးထားစေသည်။ ယင်းဂြိုလ်၏ ${retro} ကို သတိထားကာ ${keywords[0] ?? 'ညှိနှိုင်းမှု'} ကို ဖွံ့ဖြိုးပါ။`
    return { id: planet.id, title, focus, message, keywords }
  }
  const house = descriptor as HouseDescriptor
  const theme = HOUSE_THEMES[house.number] || HOUSE_THEMES[1]
  const focus = theme.focus[lang]
  const keywords = theme.keywords[lang]
  const title = lang === 'en'
    ? `House ${house.number} • ${house.signEn}`
    : `အိမ် ${house.number} • ${house.signMy}`
  const message = lang === 'en'
    ? `House ${house.number} in ${house.signEn} (${house.degree}) highlights ${focus.toLowerCase()}. Keep ${keywords[0] ?? 'clarity'} front and center while navigating this arena.`
    : `${house.signMy} (${house.degree}) တွင် အိမ် ${house.number} ရှိနေခြင်းသည် ${focus} ကို ထင်ရှားစေသည်။ ယင်းကဏ္ဍတွင် ${keywords[0] ?? 'တင်းတိပ်ချက်'} ကို ကြည်လင်စွာ ထားရှိပါ။`
  return { id: house.id, title, focus, message, keywords }
}

function buildFallbackSummary(lang: Lang, label: string): ReadingSummary {
  return {
    title: lang === 'en' ? 'Overall thread' : 'စုစုပေါင်းသရုပ်ခွဲ',
    message: lang === 'en'
      ? `${label} carries a chart that invites steady self-awareness and gentle experimentation. Blend the disciplined houses with the daring planets, and keep one practice that grounds you whenever emotions swell.`
      : `${label} ၏ ဇာတာသည် ကိုယ်ပိုင်သတိself-awareness နှင့် စမ်းသပ်အသစ်များကို တည်ငြိမ်စွာ ဖိတ်ခေါ်နေသည်။ ကောင်းမွန်စည်းကမ်းတော်များနှင့် စိတ်အောင်တည်သော ဂြိုလ်များကို ပေါင်းစပ်ပြီး စိတ်ထွက်လွန်စဉ်တွင် သင့်ကို မြေပြင်ချသော လေ့ကျင့်မှုတစ်ခုခုကို ထိန်းသိမ်းပါ။`,
    keywords: lang === 'en' ? ['balance','awareness','integration'] : ['ညှိနှိုင်း','သတိပညာ','ပေါင်းစည်းမှု']
  }
}

function mergeTopics(raw: any, descriptors: Array<PlanetDescriptor | HouseDescriptor>, lang: Lang): ReadingTopic[] {
  const provided = Array.isArray(raw?.topics) ? raw.topics : []
  return descriptors.map((descriptor, index) => {
    const candidate = provided.find((entry: any) => typeof entry?.id === 'string' && entry.id.toLowerCase() === descriptor.id.toLowerCase()) || provided[index]
    if (candidate) {
      const focus = typeof candidate.focus === 'string' && candidate.focus.trim()
        ? candidate.focus.trim().slice(0, lang === 'en' ? 80 : 120)
        : undefined
      const title = typeof candidate.title === 'string' && candidate.title.trim()
        ? candidate.title.trim().slice(0, lang === 'en' ? 90 : 120)
        : undefined
      const message = typeof candidate.message === 'string' && candidate.message.trim()
        ? candidate.message.trim().slice(0, 700)
        : undefined
      const keywords = normalizeKeywords(candidate.keywords, lang)
      if (focus && title && message) {
        return {
          id: descriptor.id,
          focus,
          title,
          message,
          keywords
        }
      }
    }
    return buildFallbackTopic(descriptor, lang)
  })
}

function shapeResponse(args: {
  phase: Phase
  aiText: string | null
  planets: PlanetDescriptor[]
  houses: HouseDescriptor[]
  lang: Lang
  label: string
}): ReadingResponse {
  const { phase, aiText, planets, houses, lang, label } = args
  const descriptors = phase === 'planets' ? planets : houses
  const parsed = extractJson(aiText)
  const topics = mergeTopics(parsed, descriptors, lang)
  let summary: ReadingSummary | undefined
  if (phase === 'houses') {
    if (parsed?.summary && typeof parsed.summary === 'object') {
      const title = typeof parsed.summary.title === 'string' && parsed.summary.title.trim()
      const message = typeof parsed.summary.message === 'string' && parsed.summary.message.trim()
      summary = {
        title: title ? title.slice(0, lang === 'en' ? 90 : 120) : buildFallbackSummary(lang, label).title,
        message: message ? message.slice(0, 700) : buildFallbackSummary(lang, label).message,
        keywords: normalizeKeywords(parsed.summary.keywords, lang)
      }
    } else {
      summary = buildFallbackSummary(lang, label)
    }
  }
  const usedFallback = !parsed
  return {
    phase,
    topics,
    summary,
    source: usedFallback ? 'fallback' : 'ai'
  }
}

export async function POST(req: Request) {
  const meta = reqMeta(req)
  const auth = getAuth(req)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const phase: Phase = body?.phase === 'houses' ? 'houses' : 'planets'
  const language: Lang = body?.language === 'en' ? 'en' : 'my'
  const metadata = normalizeMetadata(body?.metadata)
  const planets = normalizePlanets(body?.planets)
  const houses = normalizeHouses(body?.houses)
  const asc = normalizePoint(body?.ascendant, 'ascendant', 'Ascendant', 'လာဂျ') || null
  const mid = normalizePoint(body?.midheaven, 'midheaven', 'Midheaven', 'မိတ်ထွန်း') || null
  const label = sanitizeLabel(body?.label, language)

  if (!metadata) {
    return NextResponse.json({ error: 'Metadata is required.' }, { status: 400 })
  }
  if (!planets.length) {
    return NextResponse.json({ error: 'Planet data missing.' }, { status: 400 })
  }
  if (phase === 'houses' && !houses.length) {
    return NextResponse.json({ error: 'House data missing.' }, { status: 400 })
  }

  logInfo('NATAL_AI_READING', { ...meta, userId: auth.uid, phase, language })

  const bundle = buildPrompt({ phase, metadata, planets, houses, asc, mid, language, label })
  const pref = (process.env.AI_PROVIDER || '').toLowerCase()
  let aiText: string | null = null
  if (pref === 'gemini') {
    aiText = await askGemini(bundle) ?? await askOpenAI(bundle)
  } else {
    aiText = await askOpenAI(bundle) ?? await askGemini(bundle)
  }

  const payload = shapeResponse({
    phase,
    aiText,
    planets,
    houses,
    lang: language,
    label
  })

  return NextResponse.json(payload)
}
