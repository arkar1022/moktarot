import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getAuth } from '@/lib/auth'
import { logError, logInfo, reqMeta } from '@/lib/log'
import { prisma } from '@/lib/prisma'
import { isWithoutDbMode } from '@/lib/runtime'

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
  model?: ModelLabel
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
  model?: ModelLabel
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

type ModelLabel = 'model1' | 'model2'

const DEGREE_SYMBOL = '\u00B0'
const MAX_TOPICS = 12
const PLANET_ORDER = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto','chiron','northNode'] as const

const DEFAULT_NAME: Record<Lang, string> = {
  en: 'Friend',
  my: 'မိတ်ဆွေ'
}

const PLANET_THEMES: Record<typeof PLANET_ORDER[number], { focus: Record<Lang, string>; keywords: Record<Lang, string[]> }> = {
  sun: {
    focus: { en: 'Identity & vitality', my: 'Identity & vitality' },
    keywords: { en: ['identity','confidence'], my: ['identity','confidence'] }
  },
  moon: {
    focus: { en: 'Emotional safety', my: 'Emotional safety' },
    keywords: { en: ['feelings','intuition'], my: ['feelings','intuition'] }
  },
  mercury: {
    focus: { en: 'Mind & communication', my: 'Mind & communication' },
    keywords: { en: ['ideas','dialogue'], my: ['ideas','dialogue'] }
  },
  venus: {
    focus: { en: 'Love & magnetism', my: 'Love & magnetism' },
    keywords: { en: ['love','harmony'], my: ['love','harmony'] }
  },
  mars: {
    focus: { en: 'Drive & courage', my: 'Drive & courage' },
    keywords: { en: ['drive','courage'], my: ['drive','courage'] }
  },
  jupiter: {
    focus: { en: 'Growth & optimism', my: 'Growth & optimism' },
    keywords: { en: ['growth','faith'], my: ['growth','faith'] }
  },
  saturn: {
    focus: { en: 'Discipline & structure', my: 'Discipline & structure' },
    keywords: { en: ['duty','structure'], my: ['duty','structure'] }
  },
  uranus: {
    focus: { en: 'Innovation & freedom', my: 'Innovation & freedom' },
    keywords: { en: ['change','freedom'], my: ['change','freedom'] }
  },
  neptune: {
    focus: { en: 'Dreams & spirituality', my: 'Dreams & spirituality' },
    keywords: { en: ['dreams','compassion'], my: ['dreams','compassion'] }
  },
  pluto: {
    focus: { en: 'Power & rebirth', my: 'Power & rebirth' },
    keywords: { en: ['power','rebirth'], my: ['power','rebirth'] }
  },
  chiron: {
    focus: { en: 'Healing & vulnerability', my: 'Healing & vulnerability' },
    keywords: { en: ['healing','wisdom'], my: ['healing','wisdom'] }
  },
  northNode: {
    focus: { en: 'Destiny & stretch zone', my: 'Destiny & stretch zone' },
    keywords: { en: ['destiny','progress'], my: ['destiny','progress'] }
  }
}

const HOUSE_THEMES: Record<number, { focus: Record<Lang, string>; keywords: Record<Lang, string[]> }> = {
  1: { focus: { en: 'Self & identity', my: 'Self & identity' }, keywords: { en: ['self','appearance'], my: ['self','appearance'] } },
  2: { focus: { en: 'Resources & values', my: 'Resources & values' }, keywords: { en: ['money','values'], my: ['money','values'] } },
  3: { focus: { en: 'Communication & siblings', my: 'Communication & siblings' }, keywords: { en: ['speech','siblings'], my: ['speech','siblings'] } },
  4: { focus: { en: 'Home & roots', my: 'Home & roots' }, keywords: { en: ['home','roots'], my: ['home','roots'] } },
  5: { focus: { en: 'Creativity & romance', my: 'Creativity & romance' }, keywords: { en: ['joy','romance'], my: ['joy','romance'] } },
  6: { focus: { en: 'Daily work & wellness', my: 'Daily work & wellness' }, keywords: { en: ['routine','health'], my: ['routine','health'] } },
  7: { focus: { en: 'Partnerships & mirrors', my: 'Partnerships & mirrors' }, keywords: { en: ['partners','marriage'], my: ['partners','marriage'] } },
  8: { focus: { en: 'Shared resources & rebirth', my: 'Shared resources & rebirth' }, keywords: { en: ['intimacy','rebirth'], my: ['intimacy','rebirth'] } },
  9: { focus: { en: 'Beliefs & exploration', my: 'Beliefs & exploration' }, keywords: { en: ['beliefs','travel'], my: ['beliefs','travel'] } },
 10: { focus: { en: 'Career & reputation', my: 'Career & reputation' }, keywords: { en: ['career','status'], my: ['career','status'] } },
 11: { focus: { en: 'Networks & aspirations', my: 'Networks & aspirations' }, keywords: { en: ['friends','future'], my: ['friends','future'] } },
 12: { focus: { en: 'Inner world & healing', my: 'Inner world & healing' }, keywords: { en: ['spirit','healing'], my: ['spirit','healing'] } }
}

const COUPLE_TOPIC_BLUEPRINTS = [
  {
    id: 'love_life',
    label: { en: 'Love life & chemistry', my: 'Love life & chemistry' },
    focus: { en: 'How romance and attraction naturally unfold', my: 'How romance and attraction naturally unfold' },
    keywords: { en: ['romance','chemistry'], my: ['romance','chemistry'] },
    hint: 'Describe intimacy style, affection needs, and how they warm up to each other.'
  },
  {
    id: 'communication',
    label: { en: 'Communication flow', my: 'Communication flow' },
    focus: { en: 'Words, listening, and mental pacing', my: 'Words, listening, and mental pacing' },
    keywords: { en: ['dialogue','listening'], my: ['dialogue','listening'] },
    hint: 'Highlight tone, speed, and tips for feeling heard.'
  },
  {
    id: 'strengths',
    label: { en: 'Shared strengths', my: 'Shared strengths' },
    focus: { en: 'The reliability and gifts they bring out in each other', my: 'The reliability and gifts they bring out in each other' },
    keywords: { en: ['strengths','gifts'], my: ['strengths','gifts'] },
    hint: 'Celebrate natural wins they should lean on.'
  },
  {
    id: 'weaknesses',
    label: { en: 'Tender spots', my: 'Tender spots' },
    focus: { en: 'Places that need gentleness or healthier boundaries', my: 'Places that need gentleness or healthier boundaries' },
    keywords: { en: ['awareness','patience'], my: ['awareness','patience'] },
    hint: 'Name habits that can bruise the bond.'
  },
  {
    id: 'threats',
    label: { en: 'Pressure points', my: 'Pressure points' },
    focus: { en: 'External or internal stressors that could derail them', my: 'External or internal stressors that could derail them' },
    keywords: { en: ['threats','pressure'], my: ['threats','pressure'] },
    hint: 'Offer proactive guarding tips.'
  },
  {
    id: 'emotional_safety',
    label: { en: 'Emotional safety', my: 'Emotional safety' },
    focus: { en: 'How they soothe, reassure, and hold space', my: 'How they soothe, reassure, and hold space' },
    keywords: { en: ['care','warmth'], my: ['care','warmth'] },
    hint: 'Explain how to keep hearts open.'
  },
  {
    id: 'growth',
    label: { en: 'Growth & vision', my: 'Growth & vision' },
    focus: { en: 'Shared dreams, learning edges, future focus', my: 'Shared dreams, learning edges, future focus' },
    keywords: { en: ['future','growth'], my: ['future','growth'] },
    hint: 'Tie to big goals or legacy.'
  },
  {
    id: 'conflict',
    label: { en: 'Conflict repair', my: 'Conflict repair' },
    focus: { en: 'How they fight, cool off, and heal ruptures', my: 'How they fight, cool off, and heal ruptures' },
    keywords: { en: ['conflict','repair'], my: ['conflict','repair'] },
    hint: 'Offer steps for fast repair.'
  },
  {
    id: 'values',
    label: { en: 'Values & lifestyle', my: 'Values & lifestyle' },
    focus: { en: 'Practical matters, money, family, routines', my: 'Practical matters, money, family, routines' },
    keywords: { en: ['values','lifestyle'], my: ['values','lifestyle'] },
    hint: 'Note alignment gaps or harmonies.'
  },
  {
    id: 'support',
    label: { en: 'Support & care', my: 'Support & care' },
    focus: { en: 'How they advocate for each other in public/private', my: 'How they advocate for each other in public/private' },
    keywords: { en: ['support','allyship'], my: ['support','allyship'] },
    hint: 'Encourage rituals of care.'
  },
  {
    id: 'adventure',
    label: { en: 'Play & adventure', my: 'Play & adventure' },
    focus: { en: 'Fun, novelty, and rituals that keep sparks alive', my: 'Fun, novelty, and rituals that keep sparks alive' },
    keywords: { en: ['play','spark'], my: ['play','spark'] },
    hint: 'Suggest ways to keep things lively.'
  }
] as const
const GENDER_TEXT: Record<Gender, { en: string; my: string }> = {
  male: { en: 'male', my: 'male' },
  female: { en: 'female', my: 'female' },
  nonbinary: { en: 'non-binary', my: 'non-binary' },
  unspecified: { en: 'unspecified', my: 'unspecified' }
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


const COUPLE_SYSTEM_PROMPT = 'You are MokTarot’s seasoned Burmese astrologer. Interpret compatibility with warmth, grounded pragmatism, and poetic clarity.'

function coupleResponseLanguageLine(language: Lang) {
  return language === 'en'
    ? 'Respond only in English with a grounded, poetic-but-practical voice.'
    : 'Respond only in Burmese (Unicode) using Myanmar script. Keep the tone warm, grounded, and practical, but make sure it sounds like a confident professional male narrator. Avoid transliteration or English fillers unless it is a name.'
}

function coupleDetailInstruction(language: Lang) {
  return language === 'en'
    ? 'Each topic message must be at least four full sentences (roughly two short paragraphs) weaving observation plus advice.'
    : 'Each topic message must be written in Burmese (Unicode), deliver at least four full sentences (roughly two short paragraphs), blend observation with advice, and maintain that confident professional male tone throughout.'
}

function coupleSummaryInstruction(language: Lang) {
  return language === 'en'
    ? 'Summary message must be at least seven sentences, clearly state whether the couple is highly compatible, workable, or misaligned (be candid—no sugar coating), spell out how the natal dynamics could damage marriage, family, finances, friendships, and health if mismanaged, describe how their future path is likely to unfold based purely on the natal analysis, and end with two actionable next steps separated by semicolons.'
    : 'Summary message must be written in Burmese (Unicode), contain at least seven sentences, clearly state whether the couple is highly compatible, workable, or misaligned (be candid—no sugar coating), ဇာတာဆိုင်ရာ မညီထွေမှုကြောင့် အိမ်ထောင်ရေး၊ မိသားစု၊ ငွေကြေး၊ မိတ်ဆွေ၊ ကျန်းမာရေး စသော ဘဝအပိုင်းအစများကို ဘယ်လိုထိခိုက်စေနိုင်သလဲကို တိတိကျကျ ရှင်းပြပြီး၊ သူတို့ရဲ့ အနာဂတ်လမ်းကြောင်းကို ဇာတာအရသာအရ တည်ကြည်စွာ ဖော်ထုတ်ကာ အဆုံးတွင် လက်တွေ့အဆင့် ၂ ခုကို semicolon ဖြင့် ခွဲပြီး ထည့်သွင်းပါ။'
}

function formatPartnerBlocks(partners: PartnerPayload[]) {
  return partners.map((partner, idx) => {
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
}

function buildCouplePrompt({ partners, language }: { partners: PartnerPayload[]; language: Lang }): PromptBundle {
  const topicIds = COUPLE_TOPIC_BLUEPRINTS.map(topic => topic.id).join(', ')
  const topicHints = COUPLE_TOPIC_BLUEPRINTS.map(topic => `${topic.id}: ${topic.hint}`).join('\n')
  const system = COUPLE_SYSTEM_PROMPT

  const responseLanguageLine = coupleResponseLanguageLine(language)
  const detailInstruction = coupleDetailInstruction(language)
  const summaryInstruction = coupleSummaryInstruction(language)

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

  const partnerBlocks = formatPartnerBlocks(partners)

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

async function generateAiText(bundle: PromptBundle, trace: Record<string, any>): Promise<{ text: string; model: ModelLabel } | null> {
  const attempts: Array<{ name: 'gemini' | 'openai'; runner: typeof askGemini | typeof askOpenAI; model: ModelLabel }> = [
    { name: 'gemini', runner: askGemini, model: 'model1' },
    { name: 'openai', runner: askOpenAI, model: 'model2' }
  ]

  for (const attempt of attempts) {
    const started = Date.now()
    const text = await attempt.runner(bundle, trace)
    const elapsedMs = Date.now() - started
    if (text) {
      logInfo('NATAL_AI_PROVIDER', { ...trace, provider: attempt.name, status: 'success', elapsedMs, model: attempt.model })
      return { text, model: attempt.model }
    }
    logInfo('NATAL_AI_PROVIDER', { ...trace, provider: attempt.name, status: 'failed', elapsedMs, model: attempt.model })
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
    ? raw.message.trim()
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
  const withoutDbMode = isWithoutDbMode()
  const auth = withoutDbMode ? null : getAuth(req)
  if (!withoutDbMode && !auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = auth?.uid || 'guest-local'

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
  if (!withoutDbMode && shouldCheckLimit) {
    const usage = await getDailyUsage(userId)
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

    logInfo('NATAL_AI_READING', { ...meta, userId, language, context, withoutDbMode })

    const recordId = withoutDbMode
      ? null
      : await createNatalRecord({
          userId,
          context,
          phase: null,
          language,
          request: { partners }
        })


    const overloadMessage = language === 'en'
      ? 'Our AI astrologer is currently overloaded because many users are requesting readings at the same time. Please give us a moment to catch up and try again later—thank you for your patience!'
      : 'ဤအချိန်တွင် လူများစွာမှ တစ်ပြိုင်တည်း အသုံးပြုနေသဖြင့် AI ဖတ်ရှုမှု ဝန်ဆောင်မှုက overload ဖြစ်နေပါသည်။ နည်းနည်းနားပြီး နောက်တစ်ကြိမ် ပြန်လည်ကြိုးစားပေးပါ၊ စောင့်ဆိုင်းမှုအတွက် ကျေးဇူးတင်ပါတယ်။'

    const bundle = buildCouplePrompt({ partners, language })
    const aiResult = await generateAiText(bundle, { ...meta, userId, language, context })
    if (!aiResult) {
      logError('NATAL_COUPLE_AI_EMPTY', { ...meta, userId, language })
      if (recordId) await markNatalRecordError(recordId, overloadMessage)
      return NextResponse.json({ error: overloadMessage }, { status: 502 })
    }

    try {
      const payload = shapeCoupleResponse({ aiText: aiResult.text, lang: language })
      const responsePayload = aiResult.model ? { ...payload, model: aiResult.model } : payload
      if (recordId) await markNatalRecordSuccess(recordId, responsePayload)
      if (!withoutDbMode && shouldCheckLimit && willConsumeExtra && auth?.role !== 'ADMIN') {
        try {
          await prisma.user.update({ where: { id: userId }, data: { extraQuota: { decrement: 1 } } })
        } catch {}
      }
      return NextResponse.json(responsePayload)
    } catch (err) {
      logError('NATAL_COUPLE_AI_PARSE', { ...meta, userId, language }, err)
      const message = err instanceof Error ? err.message : 'AI response invalid.'
      if (recordId) await markNatalRecordError(recordId, message)
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

  logInfo('NATAL_AI_READING', { ...meta, userId, phase, language, context, withoutDbMode })

  const requestPayload = {
    metadata,
    planets,
    houses,
    asc,
    mid,
    label,
    gender
  }
  const recordId = withoutDbMode
    ? null
    : await createNatalRecord({
        userId,
        context,
        phase,
        language,
        request: requestPayload
      })

  const bundle = buildPrompt({ context, phase, metadata, planets, houses, asc, mid, language, label, gender })
  const aiResult = await generateAiText(bundle, { ...meta, userId, phase, language, context })

  if (!aiResult) {
    logError('NATAL_AI_EMPTY', { ...meta, userId, phase, language, context })
    const message = language === 'en'
      ? 'Our AI astrologer is currently overloaded because many users are requesting readings at the same time. Please give us a moment to catch up and try again later—thank you for your patience!'
      : ' အသုံးပြုနေသဖြင့် AI ဖတ်ရှုမှု ဝန်ဆောင်မှုက overload ဖြစ်နေပါသည်။ နည်းနည်းနားပြီး နောက်တစ်ကြိမ် ပြန်လည်ကြိုးစားပေးပါ၊ စောင့်ဆိုင်းမှုအတွက် ကျေးဇူးတင်ပါတယ်။'
    if (recordId) await markNatalRecordError(recordId, message)
    return NextResponse.json({ error: message }, { status: 502 })
  }

  try {
    const payload = shapeResponse({
      context,
      phase,
      aiText: aiResult.text,
      planets,
      houses,
      lang: language
    })
    const responsePayload = aiResult.model ? { ...payload, model: aiResult.model } : payload
    if (recordId) await markNatalRecordSuccess(recordId, responsePayload)
    if (!withoutDbMode && shouldCheckLimit && willConsumeExtra && auth?.role !== 'ADMIN') {
      try {
        await prisma.user.update({ where: { id: userId }, data: { extraQuota: { decrement: 1 } } })
      } catch {}
    }
    return NextResponse.json(responsePayload)
  } catch (err) {
    logError('NATAL_AI_PARSE', { ...meta, userId, phase, language, context }, err)
    const message = err instanceof Error ? err.message : 'AI response invalid.'
    if (recordId) await markNatalRecordError(recordId, message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
