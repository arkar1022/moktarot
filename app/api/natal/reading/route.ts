import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getAuth } from '@/lib/auth'
import { logError, logInfo, reqMeta } from '@/lib/log'
import { prisma } from '@/lib/prisma'

type Lang = 'my' | 'en'
type Phase = 'planets' | 'houses'
type ReadingContext = 'self' | 'other' | 'couple'

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
  context: Extract<ReadingContext, 'self' | 'other'>
  phase: Phase
  topics: ReadingTopic[]
  summary?: ReadingSummary
  source: 'ai'
}

type RelationshipTopic = {
  id: string
  title: string
  focus: string
  message: string
  keywords: string[]
}

type CoupleResponse = {
  context: 'couple'
  topics: RelationshipTopic[]
  summary?: ReadingSummary
  source: 'ai'
}

type Gender = 'male' | 'female' | 'nonbinary' | 'unspecified'

type PartnerPayload = {
  label: string
  gender: Gender
  metadata: NatalMetadata
  planets: PlanetDescriptor[]
  houses: HouseDescriptor[]
  asc?: ChartPoint | null
  mid?: ChartPoint | null
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

const COUPLE_TOPIC_BLUEPRINTS = [
  {
    id: 'love_life',
    label: { en: 'Love life & chemistry', my: 'ချစ်ရေးနှင့် ဆက်ဆံမှု' },
    focus: { en: 'How romance and attraction naturally unfold', my: 'ချစ်ရေးဆက်ဆံမှု ဘယ်လို ဖြောင့်မတ်တက်နေတာ' },
    keywords: { en: ['romance','chemistry'], my: ['ချစ်ရေး','ဆက်ဆံမှု'] },
    hint: 'Describe intimacy style, affection needs, and how they warm up to each other.'
  },
  {
    id: 'communication',
    label: { en: 'Communication flow', my: 'ဆက်သွယ်ပုံစံ' },
    focus: { en: 'Words, listening, and mental pacing', my: 'စကားဆက်ခြင်း၊ နားထောင်ပေးမှုနှင့် စိတ်ပိုင်းညီညွတ်မှု' },
    keywords: { en: ['dialogue','listening'], my: ['ပြောဆိုမှု','နားထောင်မှု'] },
    hint: 'Highlight tone, speed, and tips for feeling heard.'
  },
  {
    id: 'strengths',
    label: { en: 'Shared strengths', my: 'အတူရှိသော အားသာချက်' },
    focus: { en: 'The reliability and gifts they bring out in each other', my: 'တစ်ဦးနှင့်တစ်ဦး တိုးတက်စေသော အားသာချက်များ' },
    keywords: { en: ['strengths','gifts'], my: ['အားသာချက်','ကောင်းချီး'] },
    hint: 'Celebrate natural wins they should lean on.'
  },
  {
    id: 'weaknesses',
    label: { en: 'Tender spots', my: 'အားနည်းချက်များ' },
    focus: { en: 'Places that need gentleness or healthier boundaries', my: 'နူးညံ့မှုလိုအပ်သော နေရာများ' },
    keywords: { en: ['awareness','patience'], my: ['သတိပြု','သူနာပြုမှု'] },
    hint: 'Name habits that can bruise the bond.'
  },
  {
    id: 'threats',
    label: { en: 'Pressure points', my: 'ဖိအားပေးရာနေရာ' },
    focus: { en: 'External or internal stressors that could derail them', my: 'အပြင်/အတွင်း ဖိအားပေးသူများ' },
    keywords: { en: ['threats','pressure'], my: ['ခြိမ်းခြောက်မှု','ဖိအား'] },
    hint: 'Offer proactive guarding tips.'
  },
  {
    id: 'emotional_safety',
    label: { en: 'Emotional safety', my: 'ခံစားချက် လုံခြုံရေး' },
    focus: { en: 'How they soothe, reassure, and hold space', my: 'အပြန်အလှန် မည်သို့ ပြေပေးကြသလဲ' },
    keywords: { en: ['care','warmth'], my: ['ဂရုစိုက်မှု','နွေးထွေးမှု'] },
    hint: 'Explain how to keep hearts open.'
  },
  {
    id: 'growth',
    label: { en: 'Growth & vision', my: 'တိုးတက်ရေးနှင့် အမြင်' },
    focus: { en: 'Shared dreams, learning edges, future focus', my: 'အတူတကွ အကောင်းမြင်ကွင်းများနှင့် တိုးတက်မှု' },
    keywords: { en: ['future','growth'], my: ['အနာဂတ်','တိုးတက်မှု'] },
    hint: 'Tie to big goals or legacy.'
  },
  {
    id: 'conflict',
    label: { en: 'Conflict repair', my: 'အငြင်းပြန်လည် ပြုပြင်ခြင်း' },
    focus: { en: 'How they fight, cool off, and heal ruptures', my: 'အငြင်းပွားသည့်အခါ ပြန်ကြားနားလည်ပုံ' },
    keywords: { en: ['conflict','repair'], my: ['အငြင်းပွားမှု','ပြန်လည်ပြုပြင်'] },
    hint: 'Offer steps for fast repair.'
  },
  {
    id: 'values',
    label: { en: 'Values & lifestyle', my: 'တန်ဖိုးနှင့် ဘဝပုံစံ' },
    focus: { en: 'Practical matters, money, family, routines', my: 'နေ့စဉ်ဘဝ၊ ငွေကြေး၊ မိသားစုသဘောထား' },
    keywords: { en: ['values','lifestyle'], my: ['တန်ဖိုး','ဘဝပုံစံ'] },
    hint: 'Note alignment gaps or harmonies.'
  },
  {
    id: 'support',
    label: { en: 'Support & care', my: 'အထောက်အပံ့နှင့် ဂရုစိုက်မှု' },
    focus: { en: 'How they advocate for each other in public/private', my: 'အများကြီး/အထူးနေရာတွင် တစ်ဦးကိုတစ်ဦး မည်သို့ ကူညီပေးသလဲ' },
    keywords: { en: ['support','allyship'], my: ['အထောက်အပံ့','မိတ်ဖက်မှု'] },
    hint: 'Encourage rituals of care.'
  },
  {
    id: 'adventure',
    label: { en: 'Play & adventure', my: 'ပျော်စရာနှင့် စွန့်စားမှု' },
    focus: { en: 'Fun, novelty, and rituals that keep sparks alive', my: 'ပျော်ရွှင်မှု၊ အသစ်စမ်းသပ်မှု' },
    keywords: { en: ['play','spark'], my: ['ကစားမှု','စိတ်လှုပ်ရှားမှု'] },
    hint: 'Suggest ways to keep things lively.'
  }
] as const
const GENDER_TEXT: Record<Gender, { en: string; my: string }> = {
  male: { en: 'male', my: 'ယောက်ျာ' },
  female: { en: 'female', my: 'မ' },
  nonbinary: { en: 'non-binary', my: 'အမျိုးအစားမသတ်မှတ်' },
  unspecified: { en: 'unspecified', my: 'မသတ်မှတ်' }
}

type PronounSet = { subject: string; object: string; possessive: string }

const PRONOUNS: Record<Lang, Record<Gender, PronounSet>> = {
  en: {
    male: { subject: 'he', object: 'him', possessive: 'his' },
    female: { subject: 'she', object: 'her', possessive: 'her' },
    nonbinary: { subject: 'they', object: 'them', possessive: 'their' },
    unspecified: { subject: 'they', object: 'them', possessive: 'their' }
  },
  my: {
    male: { subject: 'he', object: 'him', possessive: 'his' },
    female: { subject: 'she', object: 'her', possessive: 'her' },
    nonbinary: { subject: 'they', object: 'them', possessive: 'their' },
    unspecified: { subject: 'they', object: 'them', possessive: 'their' }
  }
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

function normalizePartner(raw: any, lang: Lang): PartnerPayload | null {
  const metadata = normalizeMetadata(raw?.metadata)
  const planets = normalizePlanets(raw?.planets)
  const houses = normalizeHouses(raw?.houses)
  if (!metadata || !planets.length || !houses.length) return null
  return {
    label: sanitizeLabel(raw?.label, lang),
    gender: normalizeGender(raw?.gender),
    metadata,
    planets,
    houses,
    asc: normalizePoint(raw?.ascendant, 'ascendant', 'Ascendant', 'လာဂျ') || null,
    mid: normalizePoint(raw?.midheaven, 'midheaven', 'Midheaven', 'မိတ်ထွန်း') || null
  }
}

function buildPrompt(args: {
  context: Extract<ReadingContext, 'self' | 'other'>
  phase: Phase
  metadata: NatalMetadata
  planets: PlanetDescriptor[]
  houses: HouseDescriptor[]
  asc?: ChartPoint | null
  mid?: ChartPoint | null
  language: Lang
  label: string
  gender?: Gender
}): PromptBundle {
  const { context, phase, metadata, planets, houses, asc, mid, language, label, gender = 'unspecified' } = args
  const name = label || DEFAULT_NAME[language]
  const header = [
    `Client: ${name}`,
    `Birth: ${metadata.birthDate} ${metadata.birthTime} (${formatOffset(metadata.timezoneMinutes)})`,
    `Location: lat ${metadata.latitude.toFixed(2)}, lon ${metadata.longitude.toFixed(2)}`,
    `House system: ${metadata.houseSystem}`
  ]
  const planetLines = planets.map((planet, idx) => {
    const rx = planet.retrograde ? 'retrograde' : 'direct'
    return `${idx + 1}. id=${planet.id}; name=${planet.labelEn}; sign=${planet.signEn}; degree=${planet.degree}; motion=${rx}`
  })
  const houseLines = houses.map(h => `${h.number}. id=${h.id}; sign=${h.signEn}; degree=${h.degree}`)
  const points = [asc, mid].filter(Boolean).map(point => `${(point as ChartPoint).labelEn}: ${(point as ChartPoint).signEn} at ${(point as ChartPoint).degree}`)

  const isOther = context === 'other'
  const pronounSet = isOther ? getPronouns(gender, language) : null
  const statusLine = phase === 'planets'
    ? (isOther
        ? 'For each planet, outline this person’s character, what they enjoy or avoid, one strength, one weakness, and finish with a tip on how to approach or communicate with them.'
        : 'Describe how each planet shapes the native. Mention life areas (identity, money, relationships, etc).')
    : (isOther
        ? 'For each house cusp, describe this person’s strengths, blind spots, relationship style, and actionable ways to support or communicate with them. After the houses, deliver a summary plus 2-3 connecting tips.'
        : 'Interpret each house cusp. Show how the sign/degree colors real-life focus. After the 12 houses, deliver a concise summary weaving repeating motifs plus 2-3 actionable reminders.')

  const responseLanguageLine = language === 'en'
    ? 'Respond in English with a grounded, poetic-but-practical voice. Each topic should run at least three complete sentences.'
    : 'Respond in natural Burmese (Unicode) with a grounded, poetic-but-practical voice. Each topic should run at least three complete sentences; avoid transliterations or code-mixed English.'

  const pronounInstruction = pronounSet
    ? `Write in third person using the pronouns "${pronounSet.subject}/${pronounSet.object}/${pronounSet.possessive}" and never address the person as "you".`
    : null

  const otherGuidance = isOther
    ? [
        'Reveal who this person is: their temperament, what they value, and how they tend to behave with others.',
        'Every topic must include at least one clear strength and one clear weakness.',
        'State what they enjoy or avoid plus a concrete tip on how to approach or communicate with them.'
      ]
    : []

  const formatGuide = [
    'Return JSON only with this shape:',
    phase === 'planets'
      ? `{"topics":[{"id":"","title":"","focus":"","message":"","keywords":["",""]}] }`
      : `{"topics":[{"id":"","title":"","focus":"","message":"","keywords":["",""]}],"summary":{"title":"","message":"","keywords":["",""]}}`,
    `Use these topic ids exactly: ${(phase === 'planets' ? planets : houses).map(item => item.id).join(', ')}.`,
    'Keep each message concise (roughly 2 short paragraphs) and practical. Keywords should be <=3 short phrases.',
    responseLanguageLine,
    ...otherGuidance,
    pronounInstruction
  ].filter(Boolean) as string[]

  const system = 'You are MokTarot’s seasoned Burmese astrologer. Keep the guidance warm, grounded, and rooted in real life.'

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

function buildCouplePrompt({ partners, language }: { partners: PartnerPayload[]; language: Lang }): PromptBundle {
  const topicIds = COUPLE_TOPIC_BLUEPRINTS.map(topic => topic.id).join(', ')
  const topicHints = COUPLE_TOPIC_BLUEPRINTS.map(topic => `${topic.id}: ${topic.hint}`).join('\n')
  const system = 'You are MokTarot’s seasoned Burmese astrologer. Interpret compatibility with warmth, grounded pragmatism, and poetic clarity.'

  const responseLanguageLine = language === 'en'
    ? 'Respond only in English with a grounded, poetic-but-practical voice.'
    : 'Respond only in natural Burmese (Unicode). Use Myanmar script, keep the tone warm, grounded, and practical, and avoid transliteration or English fillers unless it is a name.'

  const detailInstruction = language === 'en'
    ? 'Each topic message must be at least four full sentences (roughly two short paragraphs) weaving observation plus advice.'
    : 'ခေါင်းစဉ်တစ်ခုစီတွင် ဗျာဥ်းချပြီး စိတ်ခံစားချက်နှင့် လက်တွေ့ အကြံပြုချက်ပေါင်းစပ်သည့် ဝါကျပေါင်း လေးခုပေါ်မူတည်သော အပိုဒ်၂ခုခန့် ရေးပါ။'

  const summaryInstruction = language === 'en'
    ? 'Summary message must be at least three sentences and end with two actionable next steps separated by semicolons.'
    : 'အနှုတ်ချုပ်စာပိုဒ်တွင် ဝါကျသုံးခုအနည်းဆုံး ပါဝင်စေရန်နှင့် အဆုံးတွင် လက်တွေ့ဆောင်ရွက်လို့ရသည့် အဆင့်နှစ်ခုကို ဆက်စပ်အကြံပေးချက်အဖြစ် ထည့်သွင်းပါ။'

  const specificityInstruction = 'Anchor every topic in concrete chart details: cite planet/sign/house placements for each partner and mention both names whenever possible.'
  const templateWarning = 'Write original language that fits the data; never reuse template phrases such as "shared ritual" or copy the hint wording.'
  const hintUsageInstruction = 'Hints are for your reference only. Do not quote them verbatim or mirror their structure.'

  const baseInstructions = [
    'Blend both charts to explain how the duo connects, clashes, and grows.',
    'Return JSON only with this shape: {"topics":[{"id":"","title":"","focus":"","message":"","keywords":["",""]}],"summary":{"title":"","message":"","keywords":["",""]}}',
    `Use these topic ids exactly (keep order): ${topicIds}.`,
    detailInstruction,
    summaryInstruction,
    'Each topic still needs <=3 short keywords tied to tangible behavior.',
    specificityInstruction,
    templateWarning,
    responseLanguageLine,
    hintUsageInstruction,
    'Hints (for reference only; never echo them):',
    topicHints
  ]

  const partnerBlocks = partners.map((partner, idx) => {
    const header = [
      `Partner ${idx + 1}: ${partner.label} (${genderLabel(partner.gender, 'en')})`,
      `Birth: ${partner.metadata.birthDate} ${partner.metadata.birthTime} (${formatOffset(partner.metadata.timezoneMinutes)})`,
      `Location: lat ${partner.metadata.latitude.toFixed(2)}, lon ${partner.metadata.longitude.toFixed(2)}`,
      `House system: ${partner.metadata.houseSystem}`
    ]
    const planetRows = partner.planets.map((planet, planetIdx) => {
      const rx = planet.retrograde ? 'retrograde' : 'direct'
      return `${planetIdx + 1}. ${planet.labelEn}; sign=${planet.signEn}; degree=${planet.degree}; motion=${rx}`
    })
    const houseRows = partner.houses.map(house => `${house.number}. ${house.signEn}; degree=${house.degree}`)
    const angleRows = [partner.asc, partner.mid].filter(Boolean).map(point => `${(point as ChartPoint).labelEn}: ${(point as ChartPoint).signEn} @ ${(point as ChartPoint).degree}`)
    return [
      header.join(' · '),
      '',
      `Partner ${idx + 1} planets:`,
      ...planetRows,
      '',
      `Partner ${idx + 1} houses:`,
      ...houseRows,
      '',
      angleRows.length ? `Angles: ${angleRows.join(' | ')}` : ''
    ].filter(Boolean).join('\n')
  })

  const user = [
    ...baseInstructions,
    '',
    'DATA:',
    partnerBlocks.join('\n\n---\n\n')
  ].join('\n')

  return { system, user }
}

function shapeCoupleResponse(args: { aiText: string | null; lang: Lang }): CoupleResponse {
  const { aiText, lang } = args
  if (!aiText) throw new Error('AI response missing.')
  const parsed = extractJson(aiText)
  if (!parsed || typeof parsed !== 'object') throw new Error('AI response malformed.')

  if (!Array.isArray(parsed.topics)) {
    throw new Error('AI did not return couple topics.')
  }

  const topics = COUPLE_TOPIC_BLUEPRINTS.map(template => {
    const candidate = parsed.topics.find((entry: any) => typeof entry?.id === 'string' && entry.id.toLowerCase() === template.id)
    if (!candidate) {
      throw new Error(`AI topic missing: ${template.id}`)
    }
    const title = typeof candidate.title === 'string' && candidate.title.trim()
      ? candidate.title.trim().slice(0, lang === 'en' ? 90 : 120)
      : null
    const focus = typeof candidate.focus === 'string' && candidate.focus.trim()
      ? candidate.focus.trim().slice(0, lang === 'en' ? 100 : 140)
      : null
    const message = typeof candidate.message === 'string' && candidate.message.trim()
      ? candidate.message.trim().slice(0, 700)
      : null
    if (!title || !focus || !message) {
      throw new Error(`AI topic incomplete: ${template.id}`)
    }
    const keywords = normalizeKeywords(candidate.keywords, lang)
    return { id: template.id, title, focus, message, keywords }
  })

  const summary = extractSummary(parsed.summary, lang) || undefined

  return {
    context: 'couple',
    topics,
    summary,
    source: 'ai'
  }
}

async function askGemini(bundle: PromptBundle, trace: Record<string, any> = {}) {
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
    if (!res.ok) {
      logError(
        'NATAL_GEMINI_HTTP',
        { ...trace, status: res.status, statusText: res.statusText, promptFeedback: json?.promptFeedback, response: summarizeGeminiResponse(json) },
        new Error(json?.error?.message || 'Gemini HTTP error')
      )
      return null
    }
    if (typeof text !== 'string') {
      logError(
        'NATAL_GEMINI_EMPTY_TEXT',
        { ...trace, status: res.status, promptFeedback: json?.promptFeedback, response: summarizeGeminiResponse(json) },
        new Error('Gemini returned no text payload')
      )
      return null
    }
    return text
  } catch (err) {
    logError('NATAL_READING_GEMINI', trace, err)
  }
  return null
}

async function askOpenAI(bundle: PromptBundle, trace: Record<string, any> = {}) {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null
  const model = (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim()
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
          { role: 'user', content: `${bundle.user}\n\nRespond with JSON only.` }
        ]
      })
    })
    const json = await res.json().catch(() => ({}))
    const text = json?.choices?.[0]?.message?.content
    if (!res.ok) {
      logError(
        'NATAL_OPENAI_HTTP',
        { ...trace, status: res.status, response: summarizeOpenAIResponse(json) },
        new Error(json?.error?.message || 'OpenAI HTTP error')
      )
      return null
    }
    if (typeof text !== 'string' || !text.trim()) {
      logError(
        'NATAL_OPENAI_EMPTY_TEXT',
        { ...trace, status: res.status, response: summarizeOpenAIResponse(json) },
        new Error('OpenAI returned no text payload')
      )
      return null
    }
    return text
  } catch (err) {
    logError('NATAL_READING_OPENAI', trace, err)
  }
  return null
}

async function generateAiText(bundle: PromptBundle, trace: Record<string, any>) {
  const attempts: Array<{ name: 'gemini' | 'openai'; runner: typeof askGemini | typeof askOpenAI }> = [
    { name: 'gemini', runner: askGemini },
    { name: 'openai', runner: askOpenAI }
  ]

  for (const attempt of attempts) {
    const started = Date.now()
    const text = await attempt.runner(bundle, trace)
    const elapsedMs = Date.now() - started
    if (text) {
      logInfo('NATAL_AI_PROVIDER', { ...trace, provider: attempt.name, status: 'success', elapsedMs })
      return text
    }
    logInfo('NATAL_AI_PROVIDER', { ...trace, provider: attempt.name, status: 'failed', elapsedMs })
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

function normalizeGender(value: unknown): Gender {
  if (value === 'male' || value === 'female' || value === 'nonbinary') return value
  return 'unspecified'
}

function genderLabel(gender: Gender, lang: Lang) {
  return GENDER_TEXT[gender]?.[lang] || GENDER_TEXT.unspecified[lang]
}

function getPronouns(gender: Gender, lang: Lang): PronounSet {
  const map = PRONOUNS[lang] || PRONOUNS.en
  return map[gender] || map.unspecified
}

async function createNatalRecord(args: {
  userId: string
  context: ReadingContext
  phase?: Phase | null
  language: Lang
  request: any
}) {
  const { userId, context, phase, language, request } = args
  try {
    const record = await prisma.natalReadingRecord.create({
      data: {
        userId,
        context,
        phase: phase || null,
        language,
        request,
        response: Prisma.JsonNull,
        status: 'pending'
      },
      select: { id: true }
    })
    return record.id
  } catch (err) {
    logError('NATAL_RECORD_CREATE_FAIL', { userId, context, phase, language }, err)
    return null
  }
}

async function markNatalRecordSuccess(id: string | null, response: any) {
  if (!id) return
  try {
    await prisma.natalReadingRecord.update({
      where: { id },
      data: {
        response,
        status: 'success',
        errorMessage: null
      }
    })
  } catch (err) {
    logError('NATAL_RECORD_SUCCESS_FAIL', { id }, err)
  }
}

async function markNatalRecordError(id: string | null, message: string) {
  if (!id) return
  try {
    await prisma.natalReadingRecord.update({
      where: { id },
      data: {
        status: 'error',
        errorMessage: message
      }
    })
  } catch (err) {
    logError('NATAL_RECORD_ERROR_FAIL', { id }, err)
  }
}

async function getDailyUsage(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { dailyLimit: true, extraQuota: true } }).catch(() => null as any)
  const limit = user?.dailyLimit ?? Number(process.env.DAILY_READING_LIMIT || 3)
  const extraQuota = user?.extraQuota ?? 0
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
  return { limit, used: tarotCount + natalCount, extraQuota }
}

function mergeTopics(raw: any, descriptors: Array<PlanetDescriptor | HouseDescriptor>, lang: Lang): ReadingTopic[] {
  if (!Array.isArray(raw?.topics)) {
    throw new Error('AI did not return topics.')
  }
  return descriptors.map(descriptor => {
    const candidate = raw.topics.find((entry: any) => typeof entry?.id === 'string' && entry.id.toLowerCase() === descriptor.id.toLowerCase())
    if (!candidate) {
      throw new Error(`AI topic missing: ${descriptor.id}`)
    }
    const focus = typeof candidate.focus === 'string' && candidate.focus.trim()
      ? candidate.focus.trim().slice(0, lang === 'en' ? 80 : 120)
      : null
    const title = typeof candidate.title === 'string' && candidate.title.trim()
      ? candidate.title.trim().slice(0, lang === 'en' ? 90 : 120)
      : null
    const message = typeof candidate.message === 'string' && candidate.message.trim()
      ? candidate.message.trim().slice(0, 700)
      : null
    if (!focus || !title || !message) {
      throw new Error(`AI topic incomplete: ${descriptor.id}`)
    }
    const keywords = normalizeKeywords(candidate.keywords, lang)
    return {
      id: descriptor.id,
      focus,
      title,
      message,
      keywords
    }
  })
}

function extractSummary(raw: any, lang: Lang): ReadingSummary | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const title = typeof raw.title === 'string' && raw.title.trim()
    ? raw.title.trim().slice(0, lang === 'en' ? 90 : 120)
    : null
  const message = typeof raw.message === 'string' && raw.message.trim()
    ? raw.message.trim().slice(0, 700)
    : null
  if (!title || !message) {
    return null
  }
  return {
    title,
    message,
    keywords: normalizeKeywords(raw.keywords, lang)
  }
}

function summarizeGeminiResponse(payload: any) {
  if (!payload || typeof payload !== 'object') return undefined
  try {
    const json = JSON.stringify(payload)
    return json.length > 1000 ? `${json.slice(0, 1000)}…` : json
  } catch {
    return undefined
  }
}

function summarizeOpenAIResponse(payload: any) {
  if (!payload || typeof payload !== 'object') return undefined
  try {
    const json = JSON.stringify(payload)
    return json.length > 1000 ? `${json.slice(0, 1000)}…` : json
  } catch {
    return undefined
  }
}

function shapeResponse(args: {
  context: Extract<ReadingContext, 'self' | 'other'>
  phase: Phase
  aiText: string | null
  planets: PlanetDescriptor[]
  houses: HouseDescriptor[]
  lang: Lang
}): ReadingResponse {
  const { context, phase, aiText, planets, houses, lang } = args
  if (!aiText) throw new Error('AI response missing.')
  const parsed = extractJson(aiText)
  if (!parsed || typeof parsed !== 'object') throw new Error('AI response malformed.')
  const descriptors = phase === 'planets' ? planets : houses
  const topics = mergeTopics(parsed, descriptors, lang)
  let summary: ReadingSummary | undefined
  if (phase === 'houses') {
    const summaryCandidate = extractSummary(parsed.summary, lang)
    summary = summaryCandidate || undefined
  }
  return {
    context,
    phase,
    topics,
    summary,
    source: 'ai'
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

  const rawContext = typeof body?.context === 'string' ? body.context : null
  const context: ReadingContext =
    rawContext === 'other' ? 'other'
      : rawContext === 'couple' ? 'couple'
        : 'self'
  const phase: Phase = body?.phase === 'houses' ? 'houses' : 'planets'
  const language: Lang = body?.language === 'en' ? 'en' : 'my'

  const shouldCheckLimit = context === 'couple' || phase === 'planets'
  let willConsumeExtra = false
  if (shouldCheckLimit) {
    const usage = await getDailyUsage(auth.uid)
    if (usage.used >= usage.limit) {
      if (usage.extraQuota > 0) {
        willConsumeExtra = true
      } else {
        const message = language === 'en'
          ? `Daily question limit of ${usage.limit} reached. Come back tomorrow or purchase more questions on Telegram.`
          : `ယနေ့အတွက် မေးခွန်း ${usage.limit} ကြိမ် ပြည့်ပြီးပါပြီ`
        return NextResponse.json({ error: message }, { status: 429 })
      }
    }
  }

  if (context === 'couple') {
    const partnerEntries = Array.isArray(body?.partners) ? body.partners : []
    if (partnerEntries.length !== 2) {
      return NextResponse.json({ error: 'Two partner payloads are required.' }, { status: 400 })
    }
    const partners = partnerEntries
      .map((entry: any) => normalizePartner(entry, language))
      .filter((entry: PartnerPayload | null): entry is PartnerPayload => Boolean(entry))
    if (partners.length !== 2) {
      return NextResponse.json({ error: 'Partner data incomplete.' }, { status: 400 })
    }

    logInfo('NATAL_AI_READING', { ...meta, userId: auth.uid, language, context })

    const recordId = await createNatalRecord({
      userId: auth.uid,
      context,
      phase: null,
      language,
      request: { partners }
    })

    const bundle = buildCouplePrompt({ partners, language })
    const aiText = await generateAiText(bundle, { ...meta, userId: auth.uid, language, context })
    if (!aiText) {
      logError('NATAL_COUPLE_AI_EMPTY', { ...meta, userId: auth.uid, language })
      const message = language === 'en'
        ? 'Our AI astrologer is currently overloaded because many users are requesting readings at the same time. Please give us a moment to catch up and try again later—thank you for your patience!'
        : 'ဤအချိန်တွင် လူများစွာမှ တစ်ပြိုင်တည်း အသုံးပြုနေသဖြင့် AI ဖတ်ရှုမှု ဝန်ဆောင်မှုက overload ဖြစ်နေပါသည်။ နည်းနည်းနားပြီး နောက်တစ်ကြိမ် ပြန်လည်ကြိုးစားပေးပါ၊ စောင့်ဆိုင်းမှုအတွက် ကျေးဇူးတင်ပါတယ်။'
      await markNatalRecordError(recordId, message)
      return NextResponse.json({ error: message }, { status: 502 })
    }
    try {
      const payload = shapeCoupleResponse({ aiText, lang: language })
      await markNatalRecordSuccess(recordId, payload)
      if (shouldCheckLimit && willConsumeExtra && auth.role !== 'ADMIN') {
        try {
          await prisma.user.update({ where: { id: auth.uid }, data: { extraQuota: { decrement: 1 } } })
        } catch {}
      }
      return NextResponse.json(payload)
    } catch (err) {
      logError('NATAL_COUPLE_AI_PARSE', { ...meta, userId: auth.uid, language }, err)
      const message = err instanceof Error ? err.message : 'AI response invalid.'
      await markNatalRecordError(recordId, message)
      return NextResponse.json({ error: message }, { status: 502 })
    }
  }

  const metadata = normalizeMetadata(body?.metadata)
  const planets = normalizePlanets(body?.planets)
  const houses = normalizeHouses(body?.houses)
  const asc = normalizePoint(body?.ascendant, 'ascendant', 'Ascendant', 'လာဂျ') || null
  const mid = normalizePoint(body?.midheaven, 'midheaven', 'Midheaven', 'မိတ်ထွန်း') || null
  const label = sanitizeLabel(body?.label, language)
  const gender = normalizeGender(body?.gender)

  if (!metadata) {
    return NextResponse.json({ error: 'Metadata is required.' }, { status: 400 })
  }
  if (!planets.length) {
    return NextResponse.json({ error: 'Planet data missing.' }, { status: 400 })
  }
  if (phase === 'houses' && !houses.length) {
    return NextResponse.json({ error: 'House data missing.' }, { status: 400 })
  }

  logInfo('NATAL_AI_READING', { ...meta, userId: auth.uid, phase, language, context })

  const requestPayload = {
    metadata,
    planets,
    houses,
    asc,
    mid,
    label,
    gender
  }
  const recordId = await createNatalRecord({
    userId: auth.uid,
    context,
    phase,
    language,
    request: requestPayload
  })

  const bundle = buildPrompt({ context, phase, metadata, planets, houses, asc, mid, language, label, gender })
  const aiText = await generateAiText(bundle, { ...meta, userId: auth.uid, phase, language, context })

  if (!aiText) {
    logError('NATAL_AI_EMPTY', { ...meta, userId: auth.uid, phase, language, context })
    const message = language === 'en'
      ? 'Our AI astrologer is currently overloaded because many users are requesting readings at the same time. Please give us a moment to catch up and try again later—thank you for your patience!'
      : ' အသုံးပြုနေသဖြင့် AI ဖတ်ရှုမှု ဝန်ဆောင်မှုက overload ဖြစ်နေပါသည်။ နည်းနည်းနားပြီး နောက်တစ်ကြိမ် ပြန်လည်ကြိုးစားပေးပါ၊ စောင့်ဆိုင်းမှုအတွက် ကျေးဇူးတင်ပါတယ်။'
    await markNatalRecordError(recordId, message)
    return NextResponse.json({ error: message }, { status: 502 })
  }

  try {
    const payload = shapeResponse({
      context,
      phase,
      aiText,
      planets,
      houses,
      lang: language
    })
    await markNatalRecordSuccess(recordId, payload)
    if (shouldCheckLimit && willConsumeExtra && auth.role !== 'ADMIN') {
      try {
        await prisma.user.update({ where: { id: auth.uid }, data: { extraQuota: { decrement: 1 } } })
      } catch {}
    }
    return NextResponse.json(payload)
  } catch (err) {
    logError('NATAL_AI_PARSE', { ...meta, userId: auth.uid, phase, language, context }, err)
    const message = err instanceof Error ? err.message : 'AI response invalid.'
    await markNatalRecordError(recordId, message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
