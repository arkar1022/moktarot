'use client'

import Image from 'next/image'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import NatalChartWheel, { PlanetGlyph, HouseLine } from './NatalChartWheel'
import { NATAL_LOCATIONS } from '@/lib/natal/locations'

type Lang = 'en' | 'my'
type Mode = 'self' | 'other' | 'couple'

type NatalResponse = {
  metadata: {
    birthDate: string
    birthTime: string
    timezoneMinutes: number
    latitude: number
    longitude: number
    houseSystem: string
    utcIso: string
  }
  planets: Array<{
    key: string
    glyph: string
    labelEn: string
    labelMy: string
    longitude: number
    retrograde: boolean
    sign: {
      en: string
      my: string
      degreeWithin: number
      formatted: { deg: number; min: number; sec: number }
    }
    absoluteFormatted: { deg: number; min: number; sec: number }
  }>
  houses: Array<{
    number: number
    degree: number
    sign: {
      en: string
      my: string
      degreeWithin: number
      formatted: { deg: number; min: number; sec: number }
    }
    absoluteFormatted: { deg: number; min: number; sec: number }
  }>
  ascendant?: {
    degree: number
    sign: {
      en: string
      my: string
      degreeWithin: number
      index: number
      formatted: { deg: number; min: number; sec: number }
    }
    formatted: { deg: number; min: number; sec: number }
  }
  midheaven?: {
    degree: number
    sign: {
      en: string
      my: string
      degreeWithin: number
      index: number
      formatted: { deg: number; min: number; sec: number }
    }
    formatted: { deg: number; min: number; sec: number }
  }
  warnings?: string[]
}

type ReadingTopic = {
  id: string
  title: string
  focus: string
  message: string
  keywords?: string[]
}

type ReadingSummary = {
  title: string
  message: string
  keywords?: string[]
}

type ReadingPhase = 'idle' | 'planets' | 'houses' | 'done'

type RelationshipTopic = {
  id: string
  title: string
  focus: string
  message: string
  keywords?: string[]
}

type CoupleReadingPhase = 'idle' | 'loading' | 'done'

type ModelLabel = 'model1' | 'model2'

type ReadingState = {
  planetInsights: ReadingTopic[]
  houseInsights: ReadingTopic[]
  summary: ReadingSummary | null
  status: ReadingPhase
  error: string | null
  planetModel: ModelLabel | null
  houseModel: ModelLabel | null
}

type CoupleResultState = {
  partnerA: NatalResponse
  partnerB: NatalResponse
}

type NatalRecordEntry = {
  id: string
  context: Mode
  phase: 'planets' | 'houses' | null
  language: Lang
  status: 'pending' | 'success' | 'error'
  errorMessage: string | null
  createdAt: string
  request: Record<string, any>
  response: {
    topics?: ReadingTopic[]
    summary?: ReadingSummary | null
    context?: string
    phase?: string
    model?: ModelLabel
  } | null
}

type PersonKey = 'self' | 'other'
type CoupleKey = 'partnerA' | 'partnerB'

const PARTNER_KEYS: CoupleKey[] = ['partnerA', 'partnerB']

type PersonFormState = {
  label: string
  birthDate: string
  birthTime: string
  tzOffsetMinutes: string
  latitude: string
  longitude: string
  houseSystem: string
  country: string
  state: string
  city: string
  timezoneLocked: boolean
  gender: 'female' | 'male' | 'nonbinary'
}

type CoupleFormState = PersonFormState

const LocationPickerMap = dynamic(() => import('./LocationPickerMap'), { ssr: false })

const HOUSE_OPTIONS = [
  { value: 'P', en: 'Placidus (default)', my: 'Placidus (မူလ)' },
  { value: 'K', en: 'Koch', my: 'Koch' },
  { value: 'O', en: 'Porphyry', my: 'Porphyry' },
  { value: 'W', en: 'Whole Sign', my: 'Whole Sign)' },
  { value: 'E', en: 'Equal', my: 'Equal' }
]

const NAME_PLACEHOLDER_SELF = 'Willian Kyaw'
const NAME_PLACEHOLDER_PARTNER_A = 'Julia May'
const NAME_PLACEHOLDER_PARTNER_B = 'Willian Kyaw'

const LANGUAGE_LABEL: Record<Lang, string> = {
  en: 'English',
  my: 'မြန်မာ'
}

const MODEL_LABELS: Record<ModelLabel, string> = {
  model1: 'Model 1',
  model2: 'Model 2'
}

const RECORD_STATUS_LABEL: Record<NatalRecordEntry['status'], string> = {
  success: 'Success',
  pending: 'Pending',
  error: 'Error'
}

const COPY: Record<Lang, {
  tabs: Record<Mode, { title: string; description: string }>
  title: string
  intro: string
  form: {
    name: string
    birthDate: string
    birthTime: string
    timeHint: string
    tzLabel: string
    tzHint: string
    latitude: string
    longitude: string
    house: string
    submit: string
  }
  helperTitle: string
  helperIntro: string
  helperDropdown: {
    heading: string
    country: string
    state: string
    city: string
    apply: string
    notice: string
  }
  helperMapHint: string
  tzAutoNote: string
  resultTitle: string
  planetsTitle: string
  housesTitle: string
  warningsTitle: string
  chartTitle: string
  loading: string
  empty: string
  limit: {
    title: string
    body: string
    cta: string
    close: string
  }
  reading: {
    title: string
    subtitle: string
    planetsTitle: string
    housesTitle: string
    summaryTitle: string
    empty: string
    summaryEmpty: string
    error: string
    status: {
      idle: string
      planets: string
      houses: string
      done: string
    }
  }
  relationship: {
    title: string
    subtitle: string
    topicsTitle: string
    summaryTitle: string
    status: Record<CoupleReadingPhase, string>
    genders: {
      label: string
      options: Record<CoupleFormState['gender'], string>
    }
    partnerLabels: { first: string; second: string }
  }
}> = {
  en: {
    tabs: {
      self: { title: 'For yourself', description: 'Personal blueprint, planet-by-planet reflections, and AI insight just for you.' },
      other: { title: 'For another person', description: 'Run someone else’s chart to learn their vibe, strengths, and how to communicate with them.' },
      couple: { title: 'Couple sync', description: 'Blend two charts, add genders, and let AI paint the chemistry, strengths, and growth edges.' }
    },
    title: 'Natal Chart',
    intro: 'Enter birth details to calculate planet positions, signs, and houses. Latitude/longitude use decimal degrees (east positive, west negative).',
    form: {
      name: 'Name / Label',
      birthDate: 'Birth Date',
      birthTime: 'Birth Time',
      timeHint: 'This time is interpreted in the local timezone of your selected location.',
      tzLabel: 'UTC Offset (hours)',
      tzHint: 'Example: +6.5 for UTC+06:30',
      latitude: 'Latitude (°)',
      longitude: 'Longitude (°)',
      house: 'House System',
      submit: 'Generate Chart'
    },
    helperTitle: 'Location helpers',
    helperIntro: "Don't know the coordinates? Choose from the list or tap on the map to autofill.",
    helperDropdown: {
      heading: 'Pick from list',
      country: 'Country',
      state: 'State / Region',
      city: 'City',
      apply: 'Use this location',
      notice: 'Applies coordinates and timezone {tz}.'
    },
    helperMapHint: 'Click the map to drop a pin. The fields above update automatically.',
    tzAutoNote: 'Using {tz} based on the selected location.',
    resultTitle: 'Chart Overview',
    planetsTitle: 'Planet Positions',
    housesTitle: 'House Cusps',
    warningsTitle: 'Notices',
    chartTitle: 'Wheel View',
    loading: 'Generating chart...',
    empty: 'Submit your birth information to see the chart.',
    limit: {
      title: 'Daily question limit reached',
      body: 'You already used today’s free readings. Purchase more questions on Telegram to continue.',
      cta: 'Buy more questions',
      close: 'Close'
    },
    reading: {
      title: 'AI Interpretation',
      subtitle: 'Planet insights arrive first; houses and the summary follow when ready.',
      planetsTitle: 'Planetary Storylines',
      housesTitle: 'House Focus',
      summaryTitle: 'Grand Summary',
      empty: 'Generate the chart to unlock AI guidance.',
      summaryEmpty: 'Summary will appear after the house insights load.',
      error: 'Unable to fetch the AI reading right now.',
      status: {
        idle: 'Awaiting chart',
        planets: 'Translating planets...',
        houses: 'Mapping houses & summary...',
        done: 'Completed'
      }
    },
    relationship: {
      title: 'Compatibility Compass',
      subtitle: 'Two charts, one honest map. Love, communication, and real-world action steps.',
      topicsTitle: 'Relationship Topics',
      summaryTitle: 'Unified Summary',
      status: {
        idle: 'Awaiting both charts',
        loading: 'Blending both charts...',
        done: 'Compatibility written'
      },
      genders: {
        label: 'Gender',
        options: {
          female: 'Female',
          male: 'Male',
          nonbinary: 'Non-binary'
        }
      },
      partnerLabels: { first: 'Person A', second: 'Person B' }
    }
  },
  my: {
    tabs: {
      self: { title: 'ကိုယ်တိုင်', description: 'ကိုယ်ပိုင် ဇာတာခွင်၊ ဂြိုလ်အကြောင်းအရာများကို ကြည့်ရှုနိုင်ပါတယ်။' },
      other: { title: 'အခြားသူ', description: 'အခြားလူတစ်ဦး၏ ဇာတာကို တွက်ချက်ကာ သူ့ရဲ့ အကျင့်စရိုက်၊ ကြိုက်နှစ်သက်မှု အားနည်းချက်များကို သိနိုင်ပါတယ်။' },
      couple: { title: 'စုံတွဲဇာတာ', description: 'လူနှစ်ဦးရဲ့ အချက်အလက်ကို ထည့်ပြီး အချစ်ရေး၊ အားသာချက်များ ကိုသိနိုင်ပါတယ်။' }
    },
    title: 'မွေးဇာတာ',
    intro: 'မွေးနေ့၊ မွေးချိန်၊ အချိန်ဇုန်နှင့် တည်နေရာကို ထည့်သွင်းပြီး ဂြိုလ်တည်နေရာများနှင့် အိမ်များကို တွက်ဆပါ။ လတီ၊ လောင်ဂျီကို ဒဿမဒီဂရီဖြင့် ထည့်သွင်းပါ (အရှေ့ +, အနောက် -).',
    form: {
      name: 'အမည်',
      birthDate: 'မွေးသက္ကရာဇ်',
      birthTime: 'မွေးချိန်', 
      timeHint: 'ဤချိန်သည် သင်ရွေးသတ်မှတ်ထားသော တည်နေရာ၏ မိမိဒေသအချိန်ဖြစ်သည်။',
      tzLabel: 'UTC ကွာဟချက် (နာရီ)',
      tzHint: 'ဥပမာ - +6.5 ဆိုUTC+06:30',
      latitude: 'လတီတွဒ် (ဒီဂရီ)',
      longitude: 'လောင်ဂျီတွဒ် (ဒီဂရီ)',
      house: 'အိမ်စနစ်',
      submit: 'တွက်မည်'
    },
    helperTitle: 'တည်နေရာရွေးရန် အကူအညီ',
    helperIntro: 'လတီ၊ လောင်ဂျီကို မသိသေးပါက မြို့တည်နေရာကို ရွေးချယ်ရန် (သို့) မြေပုံပေါ်တွင် တိကျရာမှတ်ပုံတင်နိုင်ပါတယ်။',
    helperDropdown: {
      heading: 'စာရင်းမှ ရွေးချယ်ရန်',
      country: 'နိုင်ငံ',
      state: 'ပြည်နယ် / တိုင်း',
      city: 'မြို့',
      apply: 'ဤတည်နေရာကို အသုံးပြုမည်',
      notice: 'လတီ၊ လောင်ဂျီနှင့် အချိန်ဇုန် {tz} ကို အလိုအလျောက် ဖြည့်သွင်းပေးမည်။'
    },
    helperMapHint: 'မြေပုံကို နှိပ်ပြီး ကြိုက်သည့်နေရာကို ရွေးချယ်ပါ။ အထက်ဖော်ပြပါ လတီ၊ လောင်ဂျီ ကွက်လပ်များကို အလိုအလျောက် ပြင်ဆင်ပေးမည်။',
    tzAutoNote: '{tz} အချိန်ဇုန်ကို ရွေးချယ်ထားသောတည်နေရာမှ အလိုအလျောက် အသုံးပြုထားသည်။',
    resultTitle: 'ဇယားသတင်းအချက်အလက်',
    planetsTitle: 'ဂြိုလ်တည်နေရာ',
    housesTitle: 'အိမ်များ',
    warningsTitle: 'အသိပေးချက်များ',
    chartTitle: 'ဇာတာခွင်',
    loading: 'တွက်နေပါသည်...',
    empty: 'မွေးသက်ဝင်ချက်များကို ထည့်သွင်းပြီး တောင်းဆိုပါ။',
    limit: {
      title: 'နေ့စဉ် ကန့်သတ်မေးခွန်း ပြည့်ပါပြီ',
      body: 'ယနေ့အတွက် မေးခွန်း ၃ ကြိမ်အား အသုံးပြုပြီးဖြစ်သည်။ Telegram မှ မေးခွန်း ဝယ်ယူကာ ဆက်လက် ဖတ်ရှုနိုင်ပါသည်။',
      cta: 'မေးခွန်း ဝယ်ယူရန်',
      close: 'ပိတ်မယ်'
    },
    reading: {
      title: 'AI ဖော်ပြချက်',
      subtitle: 'ဂြိုလ်အပိုင်းကို ဖော်ပြပြီးနောက် ဂြိုလ်အိမ်များနှင့် ကို ဆက်လက် တွက်ပေးနေသည်။',
      planetsTitle: 'ဂြိုလ်ကဏ္ဍဖော်ထုတ်ချက်',
      housesTitle: 'ဂြိုလ်အိမ်',
      summaryTitle: 'နိဂုံးချုပ်',
      empty: 'ဇာတာတွက်ပြီးမှ AI ဖော်ပြချက်ကို ကြည့်ရှုနိုင်ပါသည်။',
      summaryEmpty: 'အိမ်ဖော်ပြချက် ပြီးမှ အနှစ်ချုပ် ပေါ်လာမည်။',
      error: 'AI ဖော်ပြချက်ကို ယခု မရနိုင်ပါ။',
      status: {
        idle: 'ဇာတာမျှော်လင့်နေ',
        planets: 'ဂြိုလ်များကို ဖန်တီးနေသည်...',
        houses: 'အိမ်များနှင့် အနှုတ်ချုပ် ဆက်ရေးနေသည်...',
        done: 'ပြီးဆုံးပါပြီ'
      }
    },
    relationship: {
      title: 'အချစ်လိုက်ဖက်မှု ရှုထောင့်',
      subtitle: 'ဇာတာနှစ်ခုကို ပေါင်းစပ်ပြီး ချစ်ရေး၊ ဆက်ဆံရေးနှင့် လက်တွေ့အကြံများကို ရယူပါ။',
      topicsTitle: 'ဆက်ဆံရေးခေါင်းစဉ်များ',
      summaryTitle: 'စုစည်းသရုပ်ခွဲ',
      status: {
        idle: 'ဇာတာနှစ်ခု မပြည့်သေး',
        loading: 'ဇာတာနှစ်ခုကို ပေါင်းစပ်နေသည်...',
        done: 'လိုက်ဖက်မှု ရေးသားပြီး'
      },
      genders: {
        label: 'ကျား/မ',
        options: {
          female: 'မ',
          male: 'ယောကျ်ား',
          nonbinary: 'အမျိုးအစားမသတ်မှတ်'
        }
      },
      partnerLabels: { first: 'လူ A', second: 'လူ B' }
    }
  }
}

const PLANET_GLYPHS: Record<string, string> = {
  sun: '☉',
  moon: '☽',
  mercury: '☿',
  venus: '♀',
  mars: '♂',
  jupiter: '♃',
  saturn: '♄',
  uranus: '♅',
  neptune: '♆',
  pluto: '♇',
  chiron: '⚷',
  northNode: '☊'
}

const DEGREE_SYMBOL = String.fromCharCode(176)

const MODE_TABS: Array<{ id: Mode; icon: string }> = [
  { id: 'self', icon: '☀︎' },
  { id: 'other', icon: '☾' },
  { id: 'couple', icon: '∞' }
]

const GENDER_OPTIONS: Array<CoupleFormState['gender']> = ['female','male','nonbinary']
const PERSON_GENDER_OPTIONS: Array<PersonFormState['gender']> = ['female','male','nonbinary']
const COUPLE_SUBMIT_LABEL: Record<Lang, string> = {
  en: 'Generate Couple Reading',
  my: 'စုံတွဲတွက်မည်'
}

const DEFAULT_LOCATION = NATAL_LOCATIONS[0] || {
  country: '',
  state: '',
  city: '',
  latitude: 0,
  longitude: 0,
  tzOffsetHours: 0
}

function formatDMS({ deg, min, sec }: { deg: number; min: number; sec: number }) {
  return `${deg}${DEGREE_SYMBOL} ${String(min).padStart(2, '0')}' ${String(sec).padStart(2, '0')}`
}

function formatOffset(minutes: number) {
  const sign = minutes >= 0 ? '+' : '-'
  const abs = Math.abs(minutes)
  const hours = Math.floor(abs / 60)
  const mins = abs % 60
  return `UTC${sign}${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

function formatOffsetHours(hours: number) {
  return formatOffset(Math.round(hours * 60))
}
function formatOffsetDisplay(value: string) {
  const num = Number(value)
  return Number.isFinite(num) ? formatOffsetHours(num) : 'UTC+00:00'
}


const defaultOffsetHours = (() => {
  if (typeof window === 'undefined') return 6.5
  return -new Date().getTimezoneOffset() / 60
})()

const createPersonForm = (gender: PersonFormState['gender'] = 'female'): PersonFormState => ({
  label: '',
  birthDate: '1995-01-01',
  birthTime: '12:00',
  tzOffsetMinutes: (DEFAULT_LOCATION.tzOffsetHours || 6.5).toString(),
  latitude: DEFAULT_LOCATION.latitude.toFixed(4),
  longitude: DEFAULT_LOCATION.longitude.toFixed(4),
  houseSystem: 'P',
  country: DEFAULT_LOCATION.country,
  state: DEFAULT_LOCATION.state,
  city: DEFAULT_LOCATION.city,
  timezoneLocked: false,
  gender
})

const createCoupleForm = (label: string, gender: CoupleFormState['gender']): CoupleFormState => ({
  ...createPersonForm(gender),
  label,
  gender
})

function getStateOptions(country: string) {
  if (!country) return []
  return Array.from(new Set(
    NATAL_LOCATIONS.filter(loc => loc.country === country).map(loc => loc.state)
  )).sort()
}

function getCityOptions(country: string, state: string) {
  if (!country || !state) return []
  return Array.from(new Set(
    NATAL_LOCATIONS
      .filter(loc => loc.country === country && loc.state === state)
      .map(loc => loc.city)
  )).sort()
}

function findLocationMatch(form: PersonFormState | CoupleFormState) {
  if (!form.country || !form.state || !form.city) return null
  return NATAL_LOCATIONS.find(loc =>
    loc.country === form.country &&
    loc.state === form.state &&
    loc.city === form.city
  ) || null
}

function cascadeLocation<T extends PersonFormState>(form: T, field: 'country' | 'state' | 'city', value: string): T {
  if (field === 'country') {
    const states = getStateOptions(value)
    const nextState = states[0] || ''
    const cities = getCityOptions(value, nextState)
    const nextCity = cities[0] || ''
    return { ...form, country: value, state: nextState, city: nextCity }
  }
  if (field === 'state') {
    const cities = getCityOptions(form.country, value)
    return { ...form, state: value, city: cities[0] || '' }
  }
  return { ...form, city: value }
}

export default function NatalClient({ initialLang }: { initialLang: Lang }) {
  const [lang, setLang] = useState<Lang>(initialLang)
  const copy = useMemo(() => COPY[lang], [lang])
  const [mode, setMode] = useState<Mode>('self')
  const [personForms, setPersonForms] = useState<{ self: PersonFormState; other: PersonFormState }>(() => ({
    self: createPersonForm('nonbinary'),
    other: createPersonForm('female')
  }))
  const [coupleForms, setCoupleForms] = useState<{ partnerA: CoupleFormState; partnerB: CoupleFormState }>(() => ({
    partnerA: createCoupleForm('', 'female'),
    partnerB: createCoupleForm('', 'male')
  }))
  const [singleResults, setSingleResults] = useState<{ self: NatalResponse | null; other: NatalResponse | null }>({ self: null, other: null })
  const [singleLoading, setSingleLoading] = useState<{ self: boolean; other: boolean }>({ self: false, other: false })
  const [singleErrors, setSingleErrors] = useState<{ self: string | null; other: string | null }>({ self: null, other: null })
  const [submittedLabels, setSubmittedLabels] = useState<{ self: string; other: string }>({ self: '', other: '' })
  const [submittedGenders, setSubmittedGenders] = useState<{ self: PersonFormState['gender']; other: PersonFormState['gender'] }>({
    self: 'nonbinary',
    other: 'female'
  })
  const [readingStates, setReadingStates] = useState<{ self: ReadingState; other: ReadingState }>(() => ({
    self: { planetInsights: [], houseInsights: [], summary: null, status: 'idle', error: null, planetModel: null, houseModel: null },
    other: { planetInsights: [], houseInsights: [], summary: null, status: 'idle', error: null, planetModel: null, houseModel: null }
  }))
  const [coupleResult, setCoupleResult] = useState<CoupleResultState | null>(null)
  const [coupleLoading, setCoupleLoading] = useState(false)
  const [coupleError, setCoupleError] = useState<string | null>(null)
  const [relationshipTopics, setRelationshipTopics] = useState<RelationshipTopic[]>([])
  const [relationshipSummary, setRelationshipSummary] = useState<ReadingSummary | null>(null)
  const [relationshipStatus, setRelationshipStatus] = useState<CoupleReadingPhase>('idle')
  const [relationshipError, setRelationshipError] = useState<string | null>(null)
  const [relationshipModel, setRelationshipModel] = useState<ModelLabel | null>(null)
  const [couplePayloadMeta, setCouplePayloadMeta] = useState<{
    partnerA: { label: string; gender: CoupleFormState['gender'] }
    partnerB: { label: string; gender: CoupleFormState['gender'] }
  }>({
    partnerA: { label: '', gender: 'female' },
    partnerB: { label: '', gender: 'male' }
  })
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [recordsError, setRecordsError] = useState<string | null>(null)
  const [natalRecords, setNatalRecords] = useState<NatalRecordEntry[]>([])
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)
  const [recordsLoaded, setRecordsLoaded] = useState(false)
  const selectedRecord = useMemo(
    () => natalRecords.find(entry => entry.id === selectedRecordId) || null,
    [natalRecords, selectedRecordId]
  )
  const selectedRecordTopicsTitle = selectedRecord
    ? selectedRecord.context === 'couple'
      ? copy.relationship.topicsTitle
      : selectedRecord.phase === 'houses'
        ? copy.reading.housesTitle
        : copy.reading.planetsTitle
    : copy.reading.planetsTitle
  const [limitModal, setLimitModal] = useState(false)
  const [limitMsg, setLimitMsg] = useState('')

  useEffect(() => {
    if (limitModal && !limitMsg) {
      setLimitMsg(copy.limit.body)
    }
  }, [limitModal, limitMsg, copy.limit.body])

  const countryOptions = useMemo(() => {
    return Array.from(new Set(NATAL_LOCATIONS.map(loc => loc.country))).sort()
  }, [])

  const updatePersonFormState = (target: PersonKey, updater: (prev: PersonFormState) => PersonFormState) => {
    setPersonForms(prev => ({ ...prev, [target]: updater(prev[target]) }))
  }

  const updateCoupleFormState = (target: CoupleKey, updater: (prev: CoupleFormState) => CoupleFormState) => {
    setCoupleForms(prev => ({ ...prev, [target]: updater(prev[target]) }))
  }

  function handlePersonFieldChange(target: PersonKey, field: keyof PersonFormState, value: string) {
    updatePersonFormState(target, prev => {
      if (field === 'country' || field === 'state' || field === 'city') {
        return cascadeLocation(prev, field, value)
      }
      if (field === 'gender') {
        return { ...prev, gender: value as PersonFormState['gender'] }
      }
      if (field === 'tzOffsetMinutes' || field === 'latitude' || field === 'longitude') {
        return { ...prev, [field]: value, timezoneLocked: false }
      }
      return { ...prev, [field]: value }
    })
  }

  function handleCoupleFieldChange(target: CoupleKey, field: keyof CoupleFormState, value: string) {
    updateCoupleFormState(target, prev => {
      if (field === 'country' || field === 'state' || field === 'city') {
        return cascadeLocation(prev, field as any, value) as CoupleFormState
      }
      if (field === 'gender') {
        return { ...prev, gender: value as CoupleFormState['gender'] }
      }
      if (field === 'tzOffsetMinutes' || field === 'latitude' || field === 'longitude') {
        return { ...prev, [field]: value, timezoneLocked: false }
      }
      return { ...prev, [field]: value }
    })
  }

  function handleMapUpdate(target: PersonKey | CoupleKey, lat: number, lon: number) {
    const updater = (prev: PersonFormState | CoupleFormState) => ({
      ...prev,
      latitude: lat.toFixed(4),
      longitude: lon.toFixed(4),
      timezoneLocked: false
    })
    if (target === 'self' || target === 'other') {
      updatePersonFormState(target, prev => updater(prev) as PersonFormState)
    } else {
      updateCoupleFormState(target, prev => updater(prev) as CoupleFormState)
    }
  }

  function applyPresetLocationFor(target: PersonKey | CoupleKey) {
    const form = target === 'self' || target === 'other' ? personForms[target] : coupleForms[target]
    const preset = findLocationMatch(form)
    if (!preset) return
    const updater = (prev: PersonFormState | CoupleFormState) => ({
      ...prev,
      latitude: preset.latitude.toFixed(4),
      longitude: preset.longitude.toFixed(4),
      tzOffsetMinutes: preset.tzOffsetHours.toString(),
      timezoneLocked: true
    })
    if (target === 'self' || target === 'other') {
      updatePersonFormState(target, prev => updater(prev) as PersonFormState)
    } else {
      updateCoupleFormState(target, prev => updater(prev) as CoupleFormState)
    }
  }

  const timezoneNote = (form: PersonFormState | CoupleFormState) =>
    form.timezoneLocked
      ? copy.tzAutoNote.replace('{tz}', formatOffsetDisplay(form.tzOffsetMinutes))
      : copy.form.tzHint

  const presetNotice = (entry: ReturnType<typeof findLocationMatch>) =>
    entry ? copy.helperDropdown.notice.replace('{tz}', formatOffsetHours(entry.tzOffsetHours)) : ''

  const fetchRecords = useCallback(async () => {
    setRecordsLoading(true)
    setRecordsError(null)
    try {
      const res = await fetch('/api/natal/history?limit=200')
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || copy.reading.error)
      }
      const items: NatalRecordEntry[] = Array.isArray(data?.records) ? data.records : []
      setNatalRecords(items)
      setSelectedRecordId(prev => {
        if (prev && items.some(item => item.id === prev)) return prev
        return items[0]?.id ?? null
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.reading.error
      setRecordsError(message)
    } finally {
      setRecordsLoading(false)
    }
  }, [copy.reading.error])

  const openRecordsModal = () => {
    setShowRecordModal(true)
    if (!recordsLoaded) {
      setRecordsLoaded(true)
      fetchRecords()
    }
  }

  const closeRecordsModal = () => setShowRecordModal(false)
  const refreshRecords = () => fetchRecords()
  const openLimitModal = useCallback((message?: string) => {
    setLimitMsg(message && typeof message === 'string' ? message : copy.limit.body)
    setLimitModal(true)
  }, [copy.limit.body])
  const closeLimitModal = () => setLimitModal(false)
  const recordContextLabel = (context: Mode) => (context === 'couple' ? copy.relationship.title : copy.tabs[context].title)
  const recordPhaseLabel = (context: Mode, phase: 'planets' | 'houses' | null) => {
    if (context === 'couple') return copy.relationship.topicsTitle
    if (!phase) return copy.reading.title
    return phase === 'planets' ? copy.reading.planetsTitle : copy.reading.housesTitle
  }

  const formatRecordDate = (iso: string) => {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return iso
    return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  }
  const recordStatusClass = (status: NatalRecordEntry['status']) => {
    switch (status) {
      case 'success':
        return 'border-emerald-400/50 text-emerald-300 bg-emerald-400/10'
      case 'error':
        return 'border-red-400/50 text-red-200 bg-red-500/10'
      default:
        return 'border-neutral-500/40 text-neutral-200 bg-black/30'
    }
  }
  const languageLabel = (value: string) => LANGUAGE_LABEL[value as Lang] || value.toUpperCase()

  const renderRecordRequestMeta = (record: NatalRecordEntry | null) => {
    if (!record) return null
    if (record.context === 'couple' && Array.isArray(record.request?.partners)) {
      return (
        <div className="space-y-3">
          {record.request.partners.map((partner: any, idx: number) => {
            const meta = partner?.metadata || {}
            const lat = typeof meta.latitude === 'number' ? meta.latitude.toFixed(2) : meta.latitude
            const lon = typeof meta.longitude === 'number' ? meta.longitude.toFixed(2) : meta.longitude
            const tz = typeof meta.timezoneMinutes === 'number' ? formatOffset(meta.timezoneMinutes) : null
            const fallbackLabel = idx === 0 ? copy.relationship.partnerLabels.first : copy.relationship.partnerLabels.second
            return (
              <div key={`${partner?.label ?? idx}`} className="rounded-xl border border-mok-goldDeep/30 bg-black/30 p-3">
                <p className="text-sm font-semibold text-white">{partner?.label || fallbackLabel}</p>
                <p className="text-xs text-neutral-400 capitalize">{partner?.gender}</p>
                <ul className="mt-2 space-y-1 text-xs text-neutral-300">
                  {meta?.birthDate && (
                    <li>{meta.birthDate}{meta.birthTime ? ` · ${meta.birthTime}` : ''}</li>
                  )}
                  {(lat || lon) && (
                    <li>
                      {lat ? `lat ${lat}` : ''}{lat && lon ? ', ' : ''}{lon ? `lon ${lon}` : ''}
                    </li>
                  )}
                  {typeof meta.timezoneMinutes === 'number' && (
                    <li>{tz}</li>
                  )}
                  {meta.houseSystem && <li>House: {meta.houseSystem}</li>}
                </ul>
              </div>
            )
          })}
        </div>
      )
    }
    const meta = record.request?.metadata || {}
    const lat = typeof meta.latitude === 'number' ? meta.latitude.toFixed(2) : meta.latitude
    const lon = typeof meta.longitude === 'number' ? meta.longitude.toFixed(2) : meta.longitude
    const tz = typeof meta.timezoneMinutes === 'number' ? formatOffset(meta.timezoneMinutes) : null
    const label = record.request?.label || recordContextLabel(record.context)
    return (
      <div className="rounded-xl border border-mok-goldDeep/30 bg-black/30 p-3">
        <p className="text-sm font-semibold text-white">{label}</p>
        {record.request?.gender && (
          <p className="text-xs text-neutral-400 capitalize">{record.request.gender}</p>
        )}
        <ul className="mt-2 space-y-1 text-xs text-neutral-300">
          {meta.birthDate && (
            <li>{meta.birthDate}{meta.birthTime ? ` · ${meta.birthTime}` : ''}</li>
          )}
          {(lat || lon) && (
            <li>
              {lat ? `lat ${lat}` : ''}{lat && lon ? ', ' : ''}{lon ? `lon ${lon}` : ''}
            </li>
          )}
          {typeof meta.timezoneMinutes === 'number' && <li>{tz}</li>}
          {meta.houseSystem && <li>House: {meta.houseSystem}</li>}
        </ul>
      </div>
    )
  }

  const activePersonKey: PersonKey = mode === 'self' ? 'self' : 'other'
  const activeForm = personForms[activePersonKey]
  const activeResult = singleResults[activePersonKey]
  const activeReading = readingStates[activePersonKey]
  const activeLoading = singleLoading[activePersonKey]
  const activeError = singleErrors[activePersonKey]
  const singleStateOptions = getStateOptions(activeForm.country)
  const singleCityOptions = getCityOptions(activeForm.country, activeForm.state)
  const singleMatchedLocation = findLocationMatch(activeForm)
  const singleMapLat = Number.parseFloat(activeForm.latitude)
  const singleMapLon = Number.parseFloat(activeForm.longitude)
  const helperNoticeSingle = presetNotice(singleMatchedLocation)

  const activeChartPlanets: PlanetGlyph[] = useMemo(() => {
    if (!activeResult) return []
    return activeResult.planets.map(p => ({
      key: p.key,
      glyph: PLANET_GLYPHS[p.key] || p.glyph,
      label: lang === 'en' ? p.labelEn : p.labelMy,
      degree: p.longitude
    }))
  }, [activeResult, lang])

  const activeHouseLines: HouseLine[] = useMemo(() => {
    if (!activeResult) return []
    return activeResult.houses.map(h => ({ number: h.number, degree: h.degree }))
  }, [activeResult])

  const coupleChartData = useMemo(() => {
    if (!coupleResult) return null
    return {
      partnerA: {
        planets: coupleResult.partnerA.planets.map(p => ({
          key: p.key,
          glyph: PLANET_GLYPHS[p.key] || p.glyph,
          label: lang === 'en' ? p.labelEn : p.labelMy,
          degree: p.longitude
        })),
        houses: coupleResult.partnerA.houses.map(h => ({ number: h.number, degree: h.degree }))
      },
      partnerB: {
        planets: coupleResult.partnerB.planets.map(p => ({
          key: p.key,
          glyph: PLANET_GLYPHS[p.key] || p.glyph,
          label: lang === 'en' ? p.labelEn : p.labelMy,
          degree: p.longitude
        })),
        houses: coupleResult.partnerB.houses.map(h => ({ number: h.number, degree: h.degree }))
      }
    }
  }, [coupleResult, lang])

  useEffect(() => {
    const base = singleResults.self
    if (!base) return
    const snapshot = base
    const context: PersonKey = 'self'
    let cancelled = false
    const controller = new AbortController()
    setReadingStates(prev => ({
      ...prev,
      [context]: {
        ...prev[context],
        planetInsights: [],
        houseInsights: [],
        summary: null,
        status: 'planets',
        error: null,
        planetModel: null,
        houseModel: null
      }
    }))

    async function requestPhase(phase: 'planets' | 'houses'): Promise<{ topics: ReadingTopic[]; summary?: ReadingSummary; model?: ModelLabel } | null> {
      const res = await fetch('/api/natal/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          phase,
          metadata: snapshot.metadata,
          planets: snapshot.planets,
          houses: snapshot.houses,
          ascendant: snapshot.ascendant,
          midheaven: snapshot.midheaven,
          language: lang,
          label: submittedLabels.self,
          gender: submittedGenders.self
        }),
        signal: controller.signal
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 429) {
        if (!cancelled) openLimitModal(typeof data?.error === 'string' ? data.error : undefined)
        return null
      }
      if (!res.ok) throw new Error(data?.error || copy.reading.error)
      return data as { topics: ReadingTopic[]; summary?: ReadingSummary; model?: ModelLabel }
    }

    ;(async () => {
      try {
        const planetData = await requestPhase('planets')
        if (!planetData) {
          setReadingStates(prev => ({
            ...prev,
            [context]: { ...prev[context], status: 'idle' }
          }))
          return
        }
        if (cancelled) return
        setReadingStates(prev => ({
          ...prev,
          [context]: {
            ...prev[context],
            planetInsights: Array.isArray(planetData.topics) ? planetData.topics : [],
            planetModel: planetData?.model ?? prev[context].planetModel,
            status: 'houses'
          }
        }))
        const houseData = await requestPhase('houses')
        if (!houseData) return
        if (cancelled) return
        setReadingStates(prev => ({
          ...prev,
          [context]: {
            ...prev[context],
            houseInsights: Array.isArray(houseData.topics) ? houseData.topics : [],
            summary: houseData.summary || null,
            houseModel: houseData?.model ?? prev[context].houseModel,
            status: 'done'
          }
        }))
      } catch (err: any) {
        if (cancelled || err?.name === 'AbortError') return
        setReadingStates(prev => ({
          ...prev,
          [context]: { ...prev[context], error: err?.message || copy.reading.error, status: 'idle' }
        }))
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [singleResults.self, lang, submittedLabels.self, submittedGenders.self, copy.reading.error, openLimitModal])

  useEffect(() => {
    const base = singleResults.other
    if (!base) return
    const snapshot = base
    const context: PersonKey = 'other'
    let cancelled = false
    const controller = new AbortController()
    setReadingStates(prev => ({
      ...prev,
      [context]: {
        ...prev[context],
        planetInsights: [],
        houseInsights: [],
        summary: null,
        status: 'planets',
        error: null,
        planetModel: null,
        houseModel: null
      }
    }))

    async function requestPhase(phase: 'planets' | 'houses'): Promise<{ topics: ReadingTopic[]; summary?: ReadingSummary; model?: ModelLabel } | null> {
      const res = await fetch('/api/natal/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          phase,
          metadata: snapshot.metadata,
          planets: snapshot.planets,
          houses: snapshot.houses,
          ascendant: snapshot.ascendant,
          midheaven: snapshot.midheaven,
          language: lang,
          label: submittedLabels.other,
          gender: submittedGenders.other
        }),
        signal: controller.signal
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 429) {
        if (!cancelled) openLimitModal(typeof data?.error === 'string' ? data.error : undefined)
        return null
      }
      if (!res.ok) throw new Error(data?.error || copy.reading.error)
      return data as { topics: ReadingTopic[]; summary?: ReadingSummary; model?: ModelLabel }
    }

    ;(async () => {
      try {
        const planetData = await requestPhase('planets')
        if (!planetData) {
          setReadingStates(prev => ({
            ...prev,
            [context]: { ...prev[context], status: 'idle' }
          }))
          return
        }
        if (cancelled) return
        setReadingStates(prev => ({
          ...prev,
          [context]: {
            ...prev[context],
            planetInsights: Array.isArray(planetData.topics) ? planetData.topics : [],
            planetModel: planetData?.model ?? prev[context].planetModel,
            status: 'houses'
          }
        }))
        const houseData = await requestPhase('houses')
        if (!houseData) return
        if (cancelled) return
        setReadingStates(prev => ({
          ...prev,
          [context]: {
            ...prev[context],
            houseInsights: Array.isArray(houseData.topics) ? houseData.topics : [],
            summary: houseData.summary || null,
            houseModel: houseData?.model ?? prev[context].houseModel,
            status: 'done'
          }
        }))
      } catch (err: any) {
        if (cancelled || err?.name === 'AbortError') return
        setReadingStates(prev => ({
          ...prev,
          [context]: { ...prev[context], error: err?.message || copy.reading.error, status: 'idle' }
        }))
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [singleResults.other, lang, submittedLabels.other, submittedGenders.other, copy.reading.error, openLimitModal])

  useEffect(() => {
    if (!coupleResult) {
      setRelationshipModel(null)
      return
    }
    let cancelled = false
    setRelationshipTopics([])
    setRelationshipSummary(null)
    setRelationshipStatus('loading')
    setRelationshipError(null)
    setRelationshipModel(null)

    const partnersPayload = PARTNER_KEYS.map(key => {
      const result = coupleResult[key]
      const meta = couplePayloadMeta[key]
      const fallbackLabel = key === 'partnerA' ? copy.relationship.partnerLabels.first : copy.relationship.partnerLabels.second
      const trimmedLabel = (meta.label || '').trim()
      return {
        label: trimmedLabel || fallbackLabel,
        gender: meta.gender,
        metadata: result.metadata,
        planets: result.planets,
        houses: result.houses,
        ascendant: result.ascendant,
        midheaven: result.midheaven
      }
    })

    ;(async () => {
      try {
        const res = await fetch('/api/natal/reading', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context: 'couple',
            language: lang,
            partners: partnersPayload
          })
        })
        const data = await res.json().catch(() => ({}))
        if (res.status === 429) {
          if (!cancelled) {
            openLimitModal(typeof data?.error === 'string' ? data.error : undefined)
            setRelationshipStatus('idle')
          }
          return
        }
        if (!res.ok) throw new Error(data?.error || copy.reading.error)
        if (cancelled) return
        setRelationshipTopics(Array.isArray(data.topics) ? data.topics : [])
        setRelationshipSummary(data.summary || null)
        setRelationshipStatus('done')
        const modelValue = data?.model === 'model1' || data?.model === 'model2' ? (data.model as ModelLabel) : null
        setRelationshipModel(modelValue)
      } catch (err: any) {
        if (cancelled) return
        setRelationshipError(err?.message || copy.reading.error)
        setRelationshipStatus('idle')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [coupleResult, couplePayloadMeta, lang, copy.relationship.partnerLabels.first, copy.relationship.partnerLabels.second, copy.reading.error, openLimitModal])

  async function handleSingleSubmit(target: PersonKey) {
    const form = personForms[target]
    setSingleErrors(prev => ({ ...prev, [target]: null }))
    setSingleLoading(prev => ({ ...prev, [target]: true }))
    setSingleResults(prev => ({ ...prev, [target]: null }))
    setReadingStates(prev => ({
      ...prev,
      [target]: { planetInsights: [], houseInsights: [], summary: null, status: 'idle', error: null, planetModel: null, houseModel: null }
    }))
    const labelValue = form.label.trim()
    if (target === 'other' && !labelValue) {
      const message = lang === 'en'
        ? 'Please enter a name for this person.'
        : 'ဤပုဂ္ဂိုလ်အတွက် နာမည်ထည့်ပေးပါ။'
      setSingleErrors(prev => ({ ...prev, [target]: message }))
      setSingleLoading(prev => ({ ...prev, [target]: false }))
      return
    }
    setSubmittedLabels(prev => ({ ...prev, [target]: labelValue }))
    setSubmittedGenders(prev => ({ ...prev, [target]: form.gender }))

    try {
      const payload = {
        birthDate: form.birthDate,
        birthTime: form.birthTime,
        tzOffsetMinutes: form.tzOffsetMinutes,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        houseSystem: form.houseSystem
      }
      const res = await fetch('/api/natal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Unable to generate chart')
      }
      setSingleResults(prev => ({ ...prev, [target]: data as NatalResponse }))
    } catch (err: any) {
      setSingleErrors(prev => ({ ...prev, [target]: err?.message || 'Unexpected error' }))
    } finally {
      setSingleLoading(prev => ({ ...prev, [target]: false }))
    }
  }

  async function handleCoupleSubmit() {
    setCoupleError(null)
    setCoupleLoading(true)
    setCoupleResult(null)
    setRelationshipTopics([])
    setRelationshipSummary(null)
    setRelationshipStatus('idle')
    setRelationshipError(null)
    setRelationshipModel(null)

    const labels = {
      partnerA: coupleForms.partnerA.label.trim(),
      partnerB: coupleForms.partnerB.label.trim()
    }
    if (!labels.partnerA || !labels.partnerB) {
      const message = lang === 'en'
        ? 'Please enter a name for each partner before generating the reading.'
        : 'ဖတ်ရှုရန်မတိုင်မီ အများနှစ်ဦးစလုံး၏ နာမည်များကို ဖြည့်ပါ။'
      setCoupleError(message)
      setCoupleLoading(false)
      return
    }
    setCouplePayloadMeta({
      partnerA: { label: labels.partnerA, gender: coupleForms.partnerA.gender },
      partnerB: { label: labels.partnerB, gender: coupleForms.partnerB.gender }
    })

    try {
      const buildPayload = (form: CoupleFormState) => ({
        birthDate: form.birthDate,
        birthTime: form.birthTime,
        tzOffsetMinutes: form.tzOffsetMinutes,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        houseSystem: form.houseSystem
      })
      const [firstRes, secondRes] = await Promise.all([
        fetch('/api/natal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload(coupleForms.partnerA))
        }),
        fetch('/api/natal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload(coupleForms.partnerB))
        })
      ])
      const firstData = await firstRes.json().catch(() => ({}))
      if (!firstRes.ok) throw new Error(firstData?.error || 'Unable to generate first chart')
      const secondData = await secondRes.json().catch(() => ({}))
      if (!secondRes.ok) throw new Error(secondData?.error || 'Unable to generate second chart')
      setCoupleResult({ partnerA: firstData as NatalResponse, partnerB: secondData as NatalResponse })
    } catch (err: any) {
      setCoupleError(err?.message || 'Unexpected error')
    } finally {
      setCoupleLoading(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mode === 'couple') {
      await handleCoupleSubmit()
      return
    }
    await handleSingleSubmit(activePersonKey)
  }

  useEffect(() => {
    if (typeof document === 'undefined') return
    const html = document.documentElement
    const sync = () => {
      const nextLang = html.lang === 'en' ? 'en' : 'my'
      setLang(prev => (prev === nextLang ? prev : nextLang))
    }
    const observer = new MutationObserver(sync)
    observer.observe(html, { attributes: true, attributeFilter: ['lang'] })
    sync()
    return () => observer.disconnect()
  }, [])

  const submitLabel = mode === 'couple' ? COUPLE_SUBMIT_LABEL[lang] : copy.form.submit
  const displayLoading = mode === 'couple' ? coupleLoading : activeLoading
  const displayError = mode === 'couple' ? coupleError : activeError
  const showSingleEmptyState = mode !== 'couple' && !activeResult && !activeLoading
  const showCoupleEmptyState = mode === 'couple' && !coupleResult && !coupleLoading
  const activeTab = copy.tabs[mode]
  const singleStatusText = copy.reading.status[activeReading.status]
  const relationshipStatusText = copy.relationship.status[relationshipStatus]
  const activeModelLabel = activeReading.houseModel ?? activeReading.planetModel ?? null
  const relationshipModelLabel = relationshipModel ? MODEL_LABELS[relationshipModel] : null
  const activeChartName = (submittedLabels[activePersonKey] || '').trim()
  const showActiveChartName = mode === 'other' && Boolean(activeChartName)

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-mok-goldDeep/30 bg-black/40 p-5 shadow-lg space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">{copy.title}</p>
            <h1 className="gold-gradient text-2xl font-semibold">{copy.title}</h1>
            <p className="mt-2 text-sm text-neutral-300">{copy.intro}</p>
            <p className="mt-3 text-xs text-neutral-400">{activeTab.description}</p>
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:items-end">
            <button
              type="button"
              onClick={openRecordsModal}
              className="inline-flex items-center gap-2 self-end rounded-full border border-mok-gold/40 px-4 py-1.5 text-xs font-semibold text-mok-gold hover:border-mok-gold"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 5h14v14H5z" />
                <path d="M9 9h6" />
                <path d="M9 13h6" />
              </svg>
              Records
            </button>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {MODE_TABS.map(tab => {
                const selected = mode === tab.id
                const tabCopy = copy.tabs[tab.id]
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMode(tab.id)}
                    className={`flex w-full sm:w-[260px] items-start gap-2 rounded-2xl border px-3 py-2 text-left transition ${
                      selected ? 'border-mok-gold bg-mok-gold/10' : 'border-mok-goldDeep/40 hover:border-mok-gold/60'
                    }`}
                  >
                    <span className="text-lg text-mok-gold">{tab.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{tabCopy.title}</p>
                      <p className="text-xs text-neutral-400">{tabCopy.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {mode !== 'couple' ? (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-neutral-200">
                <span className="mb-1 block text-xs uppercase tracking-widest text-neutral-400">{copy.form.name}</span>
                <input
                  type="text"
                  value={activeForm.label}
                  placeholder={mode === 'other' ? NAME_PLACEHOLDER_SELF : NAME_PLACEHOLDER_SELF}
                  required={mode === 'other'}
                  onChange={e => handlePersonFieldChange(activePersonKey, 'label', e.target.value)}
                  className="w-full rounded-lg border border-mok-goldDeep/40 bg-black/60 px-3 py-2 focus:border-mok-gold focus:outline-none"
                />
              </label>
              {mode === 'other' && (
                <label className="text-sm text-neutral-200">
                  <span className="mb-1 block text-xs uppercase tracking-widest text-neutral-400">{copy.relationship.genders.label}</span>
                  <select
                    value={activeForm.gender}
                    onChange={e => handlePersonFieldChange(activePersonKey, 'gender', e.target.value)}
                    className="w-full rounded-lg border border-mok-goldDeep/40 bg-black/60 px-3 py-2"
                  >
                    {PERSON_GENDER_OPTIONS.map(option => (
                      <option key={option} value={option}>{copy.relationship.genders.options[option]}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className="text-sm text-neutral-200">
                <span className="mb-1 block text-xs uppercase tracking-widest text-neutral-400">{copy.form.house}</span>
                <select
                  value={activeForm.houseSystem}
                  onChange={e => handlePersonFieldChange(activePersonKey, 'houseSystem', e.target.value)}
                  className="w-full rounded-lg border border-mok-goldDeep/40 bg-black/60 px-3 py-2"
                >
                  {HOUSE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {lang === 'en' ? opt.en : opt.my}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-neutral-200">
                <span className="mb-1 block text-xs uppercase tracking-widest text-neutral-400">{copy.form.birthDate}</span>
                <input
                  type="date"
                  required
                  value={activeForm.birthDate}
                  onChange={e => handlePersonFieldChange(activePersonKey, 'birthDate', e.target.value)}
                  className="w-full rounded-lg border border-mok-goldDeep/40 bg-black/60 px-3 py-2"
                />
              </label>
              <label className="text-sm text-neutral-200">
                <span className="mb-1 block text-xs uppercase tracking-widest text-neutral-400">{copy.form.birthTime}</span>
                <input
                  type="time"
                  required
                  value={activeForm.birthTime}
                  onChange={e => handlePersonFieldChange(activePersonKey, 'birthTime', e.target.value)}
                  className="w-full rounded-lg border border-mok-goldDeep/40 bg-black/60 px-3 py-2"
                />
                <span className="mt-1 block text-xs text-neutral-500">{copy.form.timeHint}</span>
              </label>
              <label className="text-sm text-neutral-200">
                <span className="mb-1 block text-xs uppercase tracking-widest text-neutral-400">{copy.form.tzLabel}</span>
                <input
                  type="text"
                  value={activeForm.tzOffsetMinutes}
                  onChange={e => handlePersonFieldChange(activePersonKey, 'tzOffsetMinutes', e.target.value)}
                  className="w-full rounded-lg border border-mok-goldDeep/40 bg-black/60 px-3 py-2"
                  disabled={activeForm.timezoneLocked}
                />
                <span className="mt-1 block text-xs text-neutral-500">{timezoneNote(activeForm)}</span>
              </label>
              <label className="text-sm text-neutral-200">
                <span className="mb-1 block text-xs uppercase tracking-widest text-neutral-400">{copy.form.latitude}</span>
                <input
                  type="number"
                  step="0.0001"
                  value={activeForm.latitude}
                  onChange={e => handlePersonFieldChange(activePersonKey, 'latitude', e.target.value)}
                  className="w-full rounded-lg border border-mok-goldDeep/40 bg-black/60 px-3 py-2"
                />
              </label>
              <label className="text-sm text-neutral-200">
                <span className="mb-1 block text-xs uppercase tracking-widest text-neutral-400">{copy.form.longitude}</span>
                <input
                  type="number"
                  step="0.0001"
                  value={activeForm.longitude}
                  onChange={e => handlePersonFieldChange(activePersonKey, 'longitude', e.target.value)}
                  className="w-full rounded-lg border border-mok-goldDeep/40 bg-black/60 px-3 py-2"
                />
              </label>

              <div className="md:col-span-2 rounded-2xl border border-mok-goldDeep/30 bg-black/20 p-4">
                <h3 className="text-sm font-semibold text-mok-gold">{copy.helperTitle}</h3>
                <p className="text-xs text-neutral-400">{copy.helperIntro}</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">{copy.helperDropdown.heading}</p>
                    <label className="text-xs text-neutral-300">
                      <span className="mb-1 block">{copy.helperDropdown.country}</span>
                      <select value={activeForm.country} onChange={e => handlePersonFieldChange(activePersonKey, 'country', e.target.value)} className="w-full rounded-lg border border-mok-goldDeep/40 bg-black/60 px-3 py-2">
                        {countryOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-neutral-300">
                      <span className="mb-1 block">{copy.helperDropdown.state}</span>
                      <select value={activeForm.state} onChange={e => handlePersonFieldChange(activePersonKey, 'state', e.target.value)} className="w-full rounded-lg border border-mok-goldDeep/40 bg-black/60 px-3 py-2">
                        {singleStateOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-neutral-300">
                      <span className="mb-1 block">{copy.helperDropdown.city}</span>
                      <select value={activeForm.city} onChange={e => handlePersonFieldChange(activePersonKey, 'city', e.target.value)} className="w-full rounded-lg border border-mok-goldDeep/40 bg-black/60 px-3 py-2">
                        {singleCityOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => applyPresetLocationFor(activePersonKey)}
                      disabled={!singleMatchedLocation}
                      className="rounded-full bg-mok-gold px-5 py-2 text-xs font-semibold text-black disabled:opacity-60"
                    >
                      {copy.helperDropdown.apply}
                    </button>
                    {helperNoticeSingle && <p className="text-xs text-neutral-500">{helperNoticeSingle}</p>}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-neutral-400">{copy.helperMapHint}</p>
                    <LocationPickerMap
                      latitude={Number.isFinite(singleMapLat) ? singleMapLat : DEFAULT_LOCATION.latitude}
                      longitude={Number.isFinite(singleMapLon) ? singleMapLon : DEFAULT_LOCATION.longitude}
                      onChange={(lat, lon) => handleMapUpdate(activePersonKey, lat, lon)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {PARTNER_KEYS.map(key => {
                const form = coupleForms[key]
                const fallbackLabel = key === 'partnerA' ? copy.relationship.partnerLabels.first : copy.relationship.partnerLabels.second
                const placeholder = key === 'partnerA' ? NAME_PLACEHOLDER_PARTNER_A : NAME_PLACEHOLDER_PARTNER_B
                const stateOptions = getStateOptions(form.country)
                const cityOptions = getCityOptions(form.country, form.state)
                const matched = findLocationMatch(form)
                const mapLat = Number.parseFloat(form.latitude)
                const mapLon = Number.parseFloat(form.longitude)
                return (
                  <div key={key} className="rounded-2xl border border-mok-goldDeep/40 bg-black/30 p-4 space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <label className="flex-1 text-sm text-neutral-200">
                        <span className="mb-1 block text-xs uppercase tracking-widest text-neutral-400">{fallbackLabel}</span>
                        <input
                          type="text"
                          value={form.label}
                          placeholder={placeholder}
                          required
                          onChange={e => handleCoupleFieldChange(key, 'label', e.target.value)}
                          className="w-full rounded-lg border border-mok-goldDeep/40 bg-black/60 px-3 py-2"
                        />
                      </label>
                      <label className="text-xs text-neutral-300">
                        <span className="mb-1 block">{copy.relationship.genders.label}</span>
                        <select
                          value={form.gender}
                          onChange={e => handleCoupleFieldChange(key, 'gender', e.target.value)}
                          className="w-full rounded-lg border border-mok-goldDeep/40 bg-black/60 px-3 py-2"
                        >
                          {GENDER_OPTIONS.map(option => (
                            <option key={option} value={option}>{copy.relationship.genders.options[option]}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-sm text-neutral-200">
                        <span className="mb-1 block text-xs uppercase tracking-widest text-neutral-400">{copy.form.birthDate}</span>
                        <input
                          type="date"
                          required
                          value={form.birthDate}
                          onChange={e => handleCoupleFieldChange(key, 'birthDate', e.target.value)}
                          className="w-full rounded-lg border border-mok-goldDeep/40 bg-black/60 px-3 py-2"
                        />
                      </label>
                      <label className="text-sm text-neutral-200">
                        <span className="mb-1 block text-xs uppercase tracking-widest text-neutral-400">{copy.form.birthTime}</span>
                        <input
                          type="time"
                          required
                          value={form.birthTime}
                          onChange={e => handleCoupleFieldChange(key, 'birthTime', e.target.value)}
                          className="w-full rounded-lg border border-mok-goldDeep/40 bg-black/60 px-3 py-2"
                        />
                        <span className="mt-1 block text-xs text-neutral-500">{copy.form.timeHint}</span>
                      </label>
                      <label className="text-sm text-neutral-200">
                        <span className="mb-1 block text-xs uppercase tracking-widest text-neutral-400">{copy.form.tzLabel}</span>
                        <input
                          type="text"
                          value={form.tzOffsetMinutes}
                          onChange={e => handleCoupleFieldChange(key, 'tzOffsetMinutes', e.target.value)}
                          className="w-full rounded-lg border border-mok-goldDeep/40 bg-black/60 px-3 py-2"
                          disabled={form.timezoneLocked}
                        />
                        <span className="mt-1 block text-xs text-neutral-500">{timezoneNote(form)}</span>
                      </label>
                      <label className="text-sm text-neutral-200">
                        <span className="mb-1 block text-xs uppercase tracking-widest text-neutral-400">{copy.form.house}</span>
                        <select
                          value={form.houseSystem}
                          onChange={e => handleCoupleFieldChange(key, 'houseSystem', e.target.value)}
                          className="w-full rounded-lg border border-mok-goldDeep/40 bg-black/60 px-3 py-2"
                        >
                          {HOUSE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {lang === 'en' ? opt.en : opt.my}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm text-neutral-200">
                        <span className="mb-1 block text-xs uppercase tracking-widest text-neutral-400">{copy.form.latitude}</span>
                        <input
                          type="number"
                          step="0.0001"
                          value={form.latitude}
                          onChange={e => handleCoupleFieldChange(key, 'latitude', e.target.value)}
                          className="w-full rounded-lg border border-mok-goldDeep/40 bg-black/60 px-3 py-2"
                        />
                      </label>
                      <label className="text-sm text-neutral-200">
                        <span className="mb-1 block text-xs uppercase tracking-widest text-neutral-400">{copy.form.longitude}</span>
                        <input
                          type="number"
                          step="0.0001"
                          value={form.longitude}
                          onChange={e => handleCoupleFieldChange(key, 'longitude', e.target.value)}
                          className="w-full rounded-lg border border-mok-goldDeep/40 bg-black/60 px-3 py-2"
                        />
                      </label>
                    </div>
                    <div className="rounded-xl border border-mok-goldDeep/20 bg-black/20 p-3 space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">{copy.helperDropdown.heading}</p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <label className="text-xs text-neutral-300">
                          <span className="mb-1 block">{copy.helperDropdown.country}</span>
                          <select value={form.country} onChange={e => handleCoupleFieldChange(key, 'country', e.target.value)} className="w-full rounded-lg border border-mok-goldDeep/40 bg-black/60 px-2 py-2">
                            {countryOptions.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs text-neutral-300">
                          <span className="mb-1 block">{copy.helperDropdown.state}</span>
                          <select value={form.state} onChange={e => handleCoupleFieldChange(key, 'state', e.target.value)} className="w-full rounded-lg border border-mok-goldDeep/40 bg-black/60 px-2 py-2">
                            {stateOptions.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs text-neutral-300">
                          <span className="mb-1 block">{copy.helperDropdown.city}</span>
                          <select value={form.city} onChange={e => handleCoupleFieldChange(key, 'city', e.target.value)} className="w-full rounded-lg border border-mok-goldDeep/40 bg-black/60 px-2 py-2">
                            {cityOptions.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => applyPresetLocationFor(key)}
                        disabled={!matched}
                        className="rounded-full bg-mok-gold px-4 py-1 text-xs font-semibold text-black disabled:opacity-60"
                      >
                        {copy.helperDropdown.apply}
                      </button>
                      {matched && <p className="text-[11px] text-neutral-500">{presetNotice(matched)}</p>}
                      <div>
                        <p className="text-xs text-neutral-400">{copy.helperMapHint}</p>
                        <LocationPickerMap
                          latitude={Number.isFinite(mapLat) ? mapLat : DEFAULT_LOCATION.latitude}
                          longitude={Number.isFinite(mapLon) ? mapLon : DEFAULT_LOCATION.longitude}
                          onChange={(lat, lon) => handleMapUpdate(key, lat, lon)}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {displayLoading && <span className="text-xs text-neutral-400">{copy.loading}</span>}
            <button
              type="submit"
              disabled={displayLoading}
              className="rounded-full bg-mok-gold px-6 py-2 text-sm font-semibold text-black disabled:opacity-60"
            >
              {submitLabel}
            </button>
          </div>
          {displayError && <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{displayError}</p>}
        </form>
      </section>

      {mode === 'couple' ? (
        <>
          {showCoupleEmptyState && (
            <p className="text-center text-sm text-neutral-500">{copy.empty}</p>
          )}
          {coupleResult && (
            <section className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-mok-gold">{copy.relationship.title}</h2>
                <p className="text-xs text-neutral-400">{copy.relationship.subtitle}</p>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                {PARTNER_KEYS.map(key => {
                  const partnerResult = coupleResult[key]
                  const labelFallback = key === 'partnerA' ? copy.relationship.partnerLabels.first : copy.relationship.partnerLabels.second
                  const trimmedMetaLabel = (couplePayloadMeta[key]?.label || '').trim()
                  const displayLabel = trimmedMetaLabel || labelFallback
                  const chart = coupleChartData ? coupleChartData[key] : null
                  return (
                    <div key={key} className="rounded-2xl border border-mok-goldDeep/40 bg-black/40 p-4 space-y-4">
                      <div>
                        <h2 className="text-sm font-semibold text-mok-gold">{displayLabel}</h2>
                        <ul className="mt-3 space-y-1 text-xs text-neutral-300">
                          <li>{partnerResult.metadata.birthDate} · {partnerResult.metadata.birthTime}</li>
                          <li>{formatOffset(partnerResult.metadata.timezoneMinutes)} · lat {partnerResult.metadata.latitude.toFixed(4)}, lon {partnerResult.metadata.longitude.toFixed(4)}</li>
                          <li>House: {partnerResult.metadata.houseSystem}</li>
                        </ul>
                      </div>
                      <div className="flex flex-col gap-4 md:flex-row md:items-center">
                        <div className="flex-1">
                          <p className="mb-2 text-xs uppercase tracking-widest text-neutral-400">{displayLabel}</p>
                          <NatalChartWheel planets={chart?.planets ?? []} houses={chart?.houses ?? []} ascDegree={partnerResult.ascendant?.degree}
                          />
                        </div>
                        <div className="space-y-3 text-xs text-neutral-300">
                          {partnerResult.ascendant && (
                            <div>
                              <h3 className="text-sm font-semibold text-mok-gold">Ascendant</h3>
                              <p className="text-base font-semibold text-white">{lang === 'en' ? partnerResult.ascendant.sign.en : partnerResult.ascendant.sign.my}</p>
                              <p>{formatDMS(partnerResult.ascendant.formatted)}</p>
                            </div>
                          )}
                          {partnerResult.midheaven && (
                            <div>
                              <h3 className="text-sm font-semibold text-mok-gold">Midheaven</h3>
                              <p className="text-base font-semibold text-white">{lang === 'en' ? partnerResult.midheaven.sign.en : partnerResult.midheaven.sign.my}</p>
                              <p>{formatDMS(partnerResult.midheaven.formatted)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-mok-goldDeep/30 bg-black/30 p-3 overflow-x-auto">
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-mok-gold">{copy.planetsTitle}</h3>
                          <table className="w-full text-xs">
                            <thead className="text-[10px] uppercase tracking-widest text-neutral-400">
                              <tr>
                                <th className="py-1 text-left">Planet</th>
                                <th className="text-left">Sign</th>
                                <th className="text-left">Degree</th>
                              </tr>
                            </thead>
                            <tbody>
                              {partnerResult.planets.map(planet => (
                                <tr key={planet.key} className="border-t border-white/5">
                                  <td className="py-1 font-medium text-white">{lang === 'en' ? planet.labelEn : planet.labelMy}</td>
                                  <td>{lang === 'en' ? planet.sign.en : planet.sign.my}</td>
                                  <td>{formatDMS(planet.absoluteFormatted)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="rounded-2xl border border-mok-goldDeep/30 bg-black/30 p-3 overflow-x-auto">
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-mok-gold">{copy.housesTitle}</h3>
                          <table className="w-full text-xs">
                            <thead className="text-[10px] uppercase tracking-widest text-neutral-400">
                              <tr>
                                <th className="py-1 text-left">#</th>
                                <th className="text-left">Sign</th>
                                <th className="text-left">Degree</th>
                              </tr>
                            </thead>
                            <tbody>
                              {partnerResult.houses.map(house => (
                                <tr key={house.number} className="border-t border-white/5">
                                  <td className="py-1 font-semibold text-white">{house.number}</td>
                                  <td>{lang === 'en' ? house.sign.en : house.sign.my}</td>
                                  <td>{formatDMS(house.absoluteFormatted)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      {partnerResult.warnings && partnerResult.warnings.length > 0 && (
                        <div className="rounded-2xl border border-yellow-600/40 bg-yellow-500/10 p-3 text-xs text-yellow-100">
                          <h4 className="mb-1 font-semibold uppercase tracking-widest text-[10px]">{copy.warningsTitle}</h4>
                          <ul className="list-disc pl-4">
                            {partnerResult.warnings.map((warn, idx) => (
                              <li key={idx}>{warn}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="rounded-2xl border border-mok-goldDeep/30 bg-black/40 p-5 space-y-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-mok-gold">{copy.relationship.title}</h2>
                    <p className="text-xs text-neutral-400">{copy.relationship.subtitle}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-mok-gold/40 px-3 py-1 text-xs text-mok-gold">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          relationshipStatus === 'done'
                            ? 'bg-emerald-400'
                            : relationshipStatus === 'idle'
                              ? 'bg-neutral-600'
                              : 'bg-mok-gold animate-pulse'
                        }`}
                      />
                      {relationshipStatusText}
                    </span>
                    {relationshipModelLabel && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-mok-goldDeep/40 px-3 py-1 text-[11px] text-neutral-200">
                        <span className="uppercase tracking-widest text-[10px] text-neutral-500">AI Model</span>
                        <span className="font-semibold text-mok-gold">{relationshipModelLabel}</span>
                      </span>
                    )}
                  </div>
                </div>
                {relationshipError && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{relationshipError}</p>}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-mok-gold">{copy.relationship.topicsTitle}</h3>
                  {relationshipTopics.length > 0 ? (
                    <div className="grid gap-3 lg:grid-cols-2">
                      {relationshipTopics.map(topic => (
                        <InsightCard key={topic.id} topic={topic} />
                      ))}
                    </div>
                  ) : relationshipStatus === 'loading' ? (
                    <InsightSkeleton />
                  ) : (
                    <p className="text-sm text-neutral-500">{copy.relationship.subtitle}</p>
                  )}
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-mok-gold">{copy.relationship.summaryTitle}</h3>
                  {relationshipSummary ? (
                    <div className="mt-3 rounded-2xl border border-mok-goldDeep/40 bg-gradient-to-r from-black/50 to-black/20 p-4">
                      <p className="text-sm font-semibold text-white">{relationshipSummary.title}</p>
                      <p className="mt-2 whitespace-pre-line text-sm text-neutral-200">{relationshipSummary.message}</p>
                      {relationshipSummary.keywords && relationshipSummary.keywords.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-mok-gold">
                          {relationshipSummary.keywords.map((word, idx) => (
                            <span key={`${word}-${idx}`} className="rounded-full border border-mok-gold/50 px-3 py-0.5">
                              {word}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : relationshipStatus === 'loading' ? (
                    <SummarySkeleton />
                  ) : (
                    <p className="mt-2 text-sm text-neutral-500">{copy.reading.summaryEmpty}</p>
                  )}
                </div>
              </div>
            </section>
          )}
        </>
      ) : (
        <>
          {showSingleEmptyState && (
            <p className="text-center text-sm text-neutral-500">{copy.empty}</p>
          )}
          {activeResult && (
            <section className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-mok-gold">{copy.reading.title}</h2>
                <p className="text-xs text-neutral-400">{copy.reading.subtitle}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-mok-goldDeep/40 bg-black/40 p-4">
                  <h2 className="text-sm font-semibold text-mok-gold">{copy.resultTitle}</h2>
                  <ul className="mt-3 space-y-1 text-xs text-neutral-300">
                    <li>{activeResult.metadata.birthDate} · {activeResult.metadata.birthTime}</li>
                    <li>{formatOffset(activeResult.metadata.timezoneMinutes)} · lat {activeResult.metadata.latitude.toFixed(4)}, lon {activeResult.metadata.longitude.toFixed(4)}</li>
                    <li>House: {activeResult.metadata.houseSystem}</li>
                  </ul>
                </div>
                {activeResult.ascendant && (
                  <div className="rounded-2xl border border-mok-goldDeep/40 bg-black/40 p-4">
                    <h3 className="text-sm font-semibold text-mok-gold">Ascendant</h3>
                    <p className="text-lg font-semibold text-white">{lang === 'en' ? activeResult.ascendant.sign.en : activeResult.ascendant.sign.my}</p>
                    <p className="text-xs text-neutral-400">{formatDMS(activeResult.ascendant.formatted)}</p>
                  </div>
                )}
                {activeResult.midheaven && (
                  <div className="rounded-2xl border border-mok-goldDeep/40 bg-black/40 p-4">
                    <h3 className="text-sm font-semibold text-mok-gold">Midheaven</h3>
                    <p className="text-lg font-semibold text-white">{lang === 'en' ? activeResult.midheaven.sign.en : activeResult.midheaven.sign.my}</p>
                    <p className="text-xs text-neutral-400">{formatDMS(activeResult.midheaven.formatted)}</p>
                  </div>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-mok-goldDeep/30 bg-black/30 p-4">
                  <div className="mb-3 flex flex-col gap-1">
                    <h2 className="text-sm font-semibold text-mok-gold">{copy.chartTitle}</h2>
                    {showActiveChartName && (
                      <span className="text-xs uppercase tracking-widest text-neutral-400">{activeChartName}</span>
                    )}
                  </div>
                  <NatalChartWheel planets={activeChartPlanets} houses={activeHouseLines} ascDegree={activeResult.ascendant?.degree}
                  />
                </div>
                <div className="rounded-2xl border border-mok-goldDeep/30 bg-black/30 p-4 overflow-x-auto">
                  <h2 className="mb-3 text-sm font-semibold text-mok-gold">{copy.planetsTitle}</h2>
                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase tracking-widest text-neutral-400">
                      <tr>
                        <th className="py-2 text-left">Planet</th>
                        <th className="text-left">Sign</th>
                        <th className="text-left">Degree</th>
                        <th className="text-left">Rx</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeResult.planets.map(planet => (
                        <tr key={planet.key} className="border-t border-white/5 text-sm">
                          <td className="py-2 font-medium text-white">{lang === 'en' ? planet.labelEn : planet.labelMy}</td>
                          <td>{lang === 'en' ? planet.sign.en : planet.sign.my}</td>
                          <td>{formatDMS(planet.absoluteFormatted)}</td>
                          <td>{planet.retrograde ? '℞' : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl border border-mok-goldDeep/30 bg-black/30 p-4 overflow-x-auto">
                <h2 className="mb-3 text-sm font-semibold text-mok-gold">{copy.housesTitle}</h2>
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-widest text-neutral-400">
                    <tr>
                      <th className="py-2 text-left">#</th>
                      <th className="text-left">Sign</th>
                      <th className="text-left">Degree</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeResult.houses.map(house => (
                      <tr key={house.number} className="border-t border-white/5 text-sm">
                        <td className="py-2 font-semibold text-white">{house.number}</td>
                        <td>{lang === 'en' ? house.sign.en : house.sign.my}</td>
                        <td>{formatDMS(house.absoluteFormatted)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {activeResult.warnings && activeResult.warnings.length > 0 && (
                <div className="rounded-2xl border border-yellow-600/40 bg-yellow-500/10 p-4 text-sm text-yellow-100">
                  <h3 className="mb-2 font-semibold uppercase tracking-widest text-xs">{copy.warningsTitle}</h3>
                  <ul className="list-disc pl-5">
                    {activeResult.warnings.map((warn, idx) => (
                      <li key={idx}>{warn}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-2xl border border-mok-goldDeep/30 bg-black/40 p-5 space-y-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-mok-gold">{copy.reading.title}</h2>
                    <p className="text-xs text-neutral-400">{copy.reading.subtitle}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-mok-gold/40 px-3 py-1 text-xs text-mok-gold">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          activeReading.status === 'done'
                            ? 'bg-emerald-400'
                            : activeReading.status === 'idle'
                              ? 'bg-neutral-600'
                              : 'bg-mok-gold animate-pulse'
                        }`}
                      />
                      {singleStatusText}
                    </span>
                    {activeModelLabel && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-mok-goldDeep/40 px-3 py-1 text-[11px] text-neutral-200">
                        <span className="uppercase tracking-widest text-[10px] text-neutral-500">AI Model</span>
                        <span className="font-semibold text-mok-gold">{MODEL_LABELS[activeModelLabel]}</span>
                      </span>
                    )}
                  </div>
                </div>
                {activeReading.error && (
                  <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{activeReading.error}</p>
                )}
                <div className="grid gap-5">
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-mok-gold">{copy.reading.planetsTitle}</h3>
                    {activeReading.planetInsights.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {activeReading.planetInsights.map(topic => (
                          <InsightCard key={topic.id} topic={topic} />
                        ))}
                      </div>
                    ) : activeReading.status === 'planets' ? (
                      <InsightSkeleton />
                    ) : (
                      <p className="text-sm text-neutral-500">{copy.reading.empty}</p>
                    )}
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-mok-gold">{copy.reading.housesTitle}</h3>
                    {activeReading.houseInsights.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {activeReading.houseInsights.map(topic => (
                          <InsightCard key={topic.id} topic={topic} />
                        ))}
                      </div>
                    ) : activeReading.status === 'houses' ? (
                      <InsightSkeleton />
                    ) : (
                      <p className="text-sm text-neutral-500">{copy.reading.empty}</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-mok-gold">{copy.reading.summaryTitle}</h3>
                  {activeReading.summary ? (
                    <div className="mt-3 rounded-2xl border border-mok-goldDeep/40 bg-gradient-to-r from-black/50 to-black/20 p-4">
                      <p className="text-sm font-semibold text-white">{activeReading.summary.title}</p>
                      <p className="mt-2 whitespace-pre-line text-sm text-neutral-200">{activeReading.summary.message}</p>
                      {activeReading.summary.keywords && activeReading.summary.keywords.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-mok-gold">
                          {activeReading.summary.keywords.map((word, idx) => (
                            <span key={`${word}-${idx}`} className="rounded-full border border-mok-gold/50 px-3 py-0.5">
                              {word}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : activeReading.status === 'houses' ? (
                    <SummarySkeleton />
                  ) : (
                    <p className="mt-2 text-sm text-neutral-500">{copy.reading.summaryEmpty}</p>
                  )}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {limitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={closeLimitModal} />
          <div className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-mok-goldDeep/40 bg-mok-black p-6 text-center shadow-xl">
            <Image src="/thanks.png" alt="Thanks" width={200} height={200} className="mx-auto mb-3" />
            <div className="gold-gradient mb-1 text-lg font-semibold">{copy.limit.title}</div>
            <p className="mb-4 text-sm text-neutral-300">{limitMsg || copy.limit.body}</p>
            <div className="flex items-center justify-center gap-3">
              <a href="https://t.me/Mok_tarot" target="_blank" rel="noopener noreferrer" className="rounded-md bg-gold-linear px-4 py-2 text-sm font-semibold text-black">
                {copy.limit.cta}
              </a>
              <button onClick={closeLimitModal} className="rounded-md border border-mok-goldDeep/40 px-3 py-2 text-sm text-neutral-200 hover:border-mok-gold">
                {copy.limit.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRecordModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="mx-auto flex min-h-full max-w-6xl flex-col rounded-3xl border border-mok-goldDeep/40 bg-[#050302] p-4 shadow-2xl">
            <div className="flex flex-col gap-2 border-b border-white/5 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-500">Archive</p>
                <h3 className="text-xl font-semibold text-mok-gold">Saved natal records</h3>
                <p className="text-xs text-neutral-400">Review the AI guidance and chart info you generated earlier.</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={refreshRecords}
                  className="rounded-full border border-mok-gold/40 px-4 py-1.5 text-xs font-semibold text-mok-gold hover:border-mok-gold disabled:opacity-60"
                  disabled={recordsLoading}
                >
                  {recordsLoading ? 'Refreshing…' : 'Refresh'}
                </button>
                <button
                  type="button"
                  onClick={closeRecordsModal}
                  className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-neutral-200 hover:border-white/60"
                >
                  Close
                </button>
              </div>
            </div>
            {recordsError && <p className="mt-3 text-sm text-red-400">{recordsError}</p>}
            <div className="mt-4 grid flex-1 gap-4 lg:grid-cols-[260px,1fr]">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                {recordsLoading && natalRecords.length === 0 ? (
                  <p className="text-sm text-neutral-400">Loading records…</p>
                ) : natalRecords.length === 0 ? (
                  <p className="text-sm text-neutral-400">No records yet. Run a reading to see it here.</p>
                ) : (
                  <ul className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                    {natalRecords.map(record => {
                      const selected = selectedRecordId === record.id
                      return (
                        <li key={record.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedRecordId(record.id)}
                            className={`w-full rounded-2xl border px-3 py-2 text-left transition ${
                              selected ? 'border-mok-gold bg-mok-gold/10' : 'border-white/10 hover:border-mok-gold/40'
                            }`}
                          >
                            <p className="text-sm font-semibold text-white">{recordContextLabel(record.context)}</p>
                            <p className="text-xs text-neutral-400">
                              {recordPhaseLabel(record.context, record.phase)} · {languageLabel(record.language)}
                            </p>
                            <div className="mt-1 flex items-center gap-2 text-[11px]">
                              <span className={`rounded-full px-2 py-0.5 ${recordStatusClass(record.status)}`}>
                                {RECORD_STATUS_LABEL[record.status]}
                              </span>
                              <span className="text-neutral-500">{formatRecordDate(record.createdAt)}</span>
                            </div>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                {selectedRecord ? (
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                    <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] text-neutral-400">
                      <span className={`rounded-full px-3 py-1 text-[10px] ${recordStatusClass(selectedRecord.status)}`}>
                        {RECORD_STATUS_LABEL[selectedRecord.status]}
                      </span>
                      <span className="rounded-full border border-white/20 px-3 py-1 text-[10px] text-neutral-200">
                        {recordContextLabel(selectedRecord.context)}
                      </span>
                      <span className="rounded-full border border-white/20 px-3 py-1 text-[10px] text-neutral-200">
                        {recordPhaseLabel(selectedRecord.context, selectedRecord.phase)}
                      </span>
                      <span className="rounded-full border border-white/20 px-3 py-1 text-[10px] text-neutral-200">
                        {languageLabel(selectedRecord.language)}
                      </span>
                      <span className="rounded-full border border-white/20 px-3 py-1 text-[10px] text-neutral-200">
                        {formatRecordDate(selectedRecord.createdAt)}
                      </span>
                    </div>
                    {selectedRecord.status === 'error' && (
                      <p className="text-sm text-red-300">
                        {selectedRecord.errorMessage || copy.reading.error}
                      </p>
                    )}
                    {renderRecordRequestMeta(selectedRecord)}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-mok-gold">
                        {selectedRecordTopicsTitle}
                      </h4>
                      {selectedRecord.status === 'success' && Array.isArray(selectedRecord.response?.topics) && selectedRecord.response.topics.length > 0 ? (
                        <div className="grid gap-3 md:grid-cols-2">
                          {selectedRecord.response.topics.map(topic => (
                            <InsightCard key={`${selectedRecord.id}-${topic.id}`} topic={topic} />
                          ))}
                        </div>
                      ) : selectedRecord.status === 'pending' ? (
                        <p className="text-sm text-neutral-500">AI is still processing this record.</p>
                      ) : selectedRecord.status === 'error' ? (
                        <p className="text-sm text-neutral-500">AI failed to generate topics for this record.</p>
                      ) : (
                        <p className="text-sm text-neutral-500">No AI topics saved for this record.</p>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-mok-gold">{copy.reading.summaryTitle}</h4>
                      {selectedRecord.status === 'success' && selectedRecord.response?.summary ? (
                        <div className="mt-3 rounded-2xl border border-mok-goldDeep/40 bg-gradient-to-r from-black/50 to-black/20 p-4">
                          <p className="text-sm font-semibold text-white">{selectedRecord.response.summary.title}</p>
                          <p className="mt-2 whitespace-pre-line text-sm text-neutral-200">{selectedRecord.response.summary.message}</p>
                          {selectedRecord.response.summary.keywords && selectedRecord.response.summary.keywords.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-mok-gold">
                              {selectedRecord.response.summary.keywords.map((word, idx) => (
                                <span key={`${selectedRecord.id}-summary-${idx}`} className="rounded-full border border-mok-gold/50 px-3 py-0.5">
                                  {word}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : selectedRecord.status === 'pending' ? (
                        <p className="mt-2 text-sm text-neutral-500">Summary will appear once AI finishes processing.</p>
                      ) : selectedRecord.status === 'error' ? (
                        <p className="mt-2 text-sm text-neutral-500">Summary unavailable because the AI run failed.</p>
                      ) : (
                        <p className="mt-2 text-sm text-neutral-500">No summary captured for this record.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-neutral-500">
                    Select a record on the left to inspect its full details.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InsightCard({ topic }: { topic: ReadingTopic }) {
  return (
    <article className="rounded-2xl border border-mok-goldDeep/30 bg-gradient-to-b from-black/60 to-black/30 p-4 shadow-inner">
      <p className="text-[11px] uppercase tracking-[0.3em] text-mok-gold/80">{topic.focus}</p>
      <p className="mt-1 text-base font-semibold text-white">{topic.title}</p>
      <p className="mt-2 whitespace-pre-line text-sm text-neutral-200">{topic.message}</p>
      {topic.keywords && topic.keywords.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-mok-gold">
          {topic.keywords.map((keyword, idx) => (
            <span key={`${topic.id}-${idx}`} className="rounded-full border border-mok-gold/40 px-3 py-0.5">
              {keyword}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}

function InsightSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="rounded-2xl border border-white/10 bg-white/5 p-4 animate-pulse space-y-3">
          <div className="h-2.5 w-16 rounded-full bg-white/20" />
          <div className="h-3.5 w-3/4 rounded bg-white/10" />
          <div className="space-y-2">
            <div className="h-3 rounded bg-white/10" />
            <div className="h-3 w-4/5 rounded bg-white/10" />
            <div className="h-3 w-3/5 rounded bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  )
}

function SummarySkeleton() {
  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4 animate-pulse space-y-3">
      <div className="h-3 w-24 rounded bg-white/20" />
      <div className="space-y-2">
        <div className="h-3 rounded bg-white/10" />
        <div className="h-3 rounded bg-white/10" />
        <div className="h-3 w-4/5 rounded bg-white/10" />
      </div>
    </div>
  )
}
