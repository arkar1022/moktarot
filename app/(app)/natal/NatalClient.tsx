'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import NatalChartWheel, { PlanetGlyph, HouseLine } from './NatalChartWheel'
import { NATAL_LOCATIONS } from '@/lib/natal/locations'

type Lang = 'en' | 'my'

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

const LocationPickerMap = dynamic(() => import('./LocationPickerMap'), { ssr: false })

const HOUSE_OPTIONS = [
  { value: 'P', en: 'Placidus (default)', my: 'Placidus (မူလ)' },
  { value: 'K', en: 'Koch', my: 'Koch' },
  { value: 'O', en: 'Porphyry', my: 'Porphyry' },
  { value: 'W', en: 'Whole Sign', my: 'မွေးရာရာသီထောင့် (Whole Sign)' },
  { value: 'E', en: 'Equal', my: 'အလုံးစုံညီမျှ (Equal)' }
]

const COPY: Record<Lang, {
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
}> = {
  en: {
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
    }
  },
  my: {
    title: 'မွေးဇာတာ',
    intro: 'မွေးနေ့၊ မွေးချိန်၊ အချိန်ဇုန်နှင့် တည်နေရာကို ထည့်သွင်းပြီး ဂြိုလ်တည်နေရာများနှင့် အိမ်များကို တွက်ဆပါ။ လတီ၊ လောင်ဂျီကို ဒဿမဒီဂရီဖြင့် ထည့်သွင်းပါ (အရှေ့ +, အနောက် -).',
    form: {
      name: 'အမည် (မဖြည့်လည်းရ)',
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

export default function NatalClient({ initialLang }: { initialLang: Lang }) {
  const [lang, setLang] = useState<Lang>(initialLang)
  const copy = useMemo(() => COPY[lang], [lang])
  const [form, setForm] = useState({
    label: '',
    birthDate: '1995-01-01',
    birthTime: '12:00',
    tzOffsetMinutes: '6.5',
    latitude: '16.8409',
    longitude: '96.1735',
    houseSystem: 'P'
  })
  const [result, setResult] = useState<NatalResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submittedLabel, setSubmittedLabel] = useState('')
  const [planetInsights, setPlanetInsights] = useState<ReadingTopic[]>([])
  const [houseInsights, setHouseInsights] = useState<ReadingTopic[]>([])
  const [readingSummary, setReadingSummary] = useState<ReadingSummary | null>(null)
  const [readingStatus, setReadingStatus] = useState<ReadingPhase>('idle')
  const [readingError, setReadingError] = useState<string | null>(null)
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedState, setSelectedState] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [timezoneLocked, setTimezoneLocked] = useState(false)

  const countryOptions = useMemo(() => {
    return Array.from(new Set(NATAL_LOCATIONS.map(loc => loc.country))).sort()
  }, [])

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

  useEffect(() => {
    if (!selectedCountry && countryOptions.length) {
      setSelectedCountry(countryOptions[0])
    }
  }, [countryOptions, selectedCountry])

  const stateOptions = useMemo(() => {
    if (!selectedCountry) return []
    return Array.from(new Set(
      NATAL_LOCATIONS.filter(loc => loc.country === selectedCountry).map(loc => loc.state)
    )).sort()
  }, [selectedCountry])

  useEffect(() => {
    if (!selectedCountry) {
      setSelectedState('')
      setSelectedCity('')
      return
    }
    if (stateOptions.length && !stateOptions.includes(selectedState)) {
      setSelectedState(stateOptions[0])
      setSelectedCity('')
    }
  }, [selectedCountry, stateOptions, selectedState])

  const cityOptions = useMemo(() => {
    if (!selectedCountry || !selectedState) return []
    return Array.from(new Set(
      NATAL_LOCATIONS
        .filter(loc => loc.country === selectedCountry && loc.state === selectedState)
        .map(loc => loc.city)
    )).sort()
  }, [selectedCountry, selectedState])

  useEffect(() => {
    if (!selectedState) {
      setSelectedCity('')
      return
    }
    if (cityOptions.length && !cityOptions.includes(selectedCity)) {
      setSelectedCity(cityOptions[0])
    }
  }, [cityOptions, selectedState, selectedCity])

  const matchedLocation = useMemo(() => {
    if (!selectedCountry || !selectedState || !selectedCity) return null
    return NATAL_LOCATIONS.find(loc =>
      loc.country === selectedCountry &&
      loc.state === selectedState &&
      loc.city === selectedCity
    ) || null
  }, [selectedCountry, selectedState, selectedCity])

  useEffect(() => {
    if (!result) return
    const snapshot = result
    let cancelled = false
    const controller = new AbortController()
    setPlanetInsights([])
    setHouseInsights([])
    setReadingSummary(null)
    setReadingError(null)
    setReadingStatus('planets')

    async function requestReading(phase: 'planets' | 'houses') {
      const res = await fetch('/api/natal/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase,
          metadata: snapshot.metadata,
          planets: snapshot.planets,
          houses: snapshot.houses,
          ascendant: snapshot.ascendant,
          midheaven: snapshot.midheaven,
          language: lang,
          label: submittedLabel
        }),
        signal: controller.signal
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || copy.reading.error)
      return data as { topics: ReadingTopic[]; summary?: ReadingSummary }
    }

    ;(async () => {
      try {
        const planetData = await requestReading('planets')
        if (cancelled) return
        setPlanetInsights(Array.isArray(planetData.topics) ? planetData.topics : [])
        setReadingStatus('houses')
        const houseData = await requestReading('houses')
        if (cancelled) return
        setHouseInsights(Array.isArray(houseData.topics) ? houseData.topics : [])
        setReadingSummary(houseData.summary || null)
        setReadingStatus('done')
      } catch (err: any) {
        if (cancelled || err?.name === 'AbortError') return
        setReadingError(err?.message || copy.reading.error)
        setReadingStatus('idle')
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [result, lang, submittedLabel, copy.reading.error])

  function handleChange(field: string, value: string) {
    if (field === 'tzOffsetMinutes') setTimezoneLocked(false)
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function applyPresetLocation() {
    if (!matchedLocation) return
    setForm(prev => ({
      ...prev,
      latitude: matchedLocation.latitude.toFixed(4),
      longitude: matchedLocation.longitude.toFixed(4),
      tzOffsetMinutes: matchedLocation.tzOffsetHours.toString()
    }))
    setTimezoneLocked(true)
  }

  function handleMapUpdate(lat: number, lon: number) {
    setForm(prev => ({
      ...prev,
      latitude: lat.toFixed(4),
      longitude: lon.toFixed(4)
    }))
    setTimezoneLocked(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    setResult(null)
    setPlanetInsights([])
    setHouseInsights([])
    setReadingSummary(null)
    setReadingError(null)
    setReadingStatus('idle')
    const labelValue = form.label.trim()
    setSubmittedLabel(labelValue)
    try {
      const payload = {
        birthDate: form.birthDate,
        birthTime: form.birthTime,
        tzOffsetMinutes: form.tzOffsetMinutes,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        houseSystem: form.houseSystem
      }
      const response = await fetch('/api/natal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.error || 'Unable to generate chart')
      }
      const data: NatalResponse = await response.json()
      setResult(data)
    } catch (err: any) {
      setError(err?.message || 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  const chartPlanets: PlanetGlyph[] = useMemo(() => {
    if (!result) return []
    return result.planets.map(p => ({
      key: p.key,
      glyph: PLANET_GLYPHS[p.key] || p.glyph,
      label: lang === 'en' ? p.labelEn : p.labelMy,
      degree: p.longitude
    }))
  }, [result, lang])

  const houseLines: HouseLine[] = useMemo(() => {
    if (!result) return []
    return result.houses.map(h => ({ number: h.number, degree: h.degree }))
  }, [result])

  const mapLat = Number.parseFloat(form.latitude)
  const mapLon = Number.parseFloat(form.longitude)

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-mok-goldDeep/30 bg-black/40 p-5 shadow-lg">
        <h1 className="gold-gradient text-2xl font-semibold">{copy.title}</h1>
        <p className="mt-2 text-sm text-neutral-300">{copy.intro}</p>
        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="text-sm text-neutral-200">
            <span className="mb-1 block text-xs uppercase tracking-widest text-neutral-400">{copy.form.name}</span>
            <input
              type="text"
              value={form.label}
              onChange={e => handleChange('label', e.target.value)}
              className="w-full rounded-lg border border-mok-goldDeep/40 bg-black/60 px-3 py-2 focus:border-mok-gold focus:outline-none"
            />
          </label>
          <label className="text-sm text-neutral-200">
            <span className="mb-1 block text-xs uppercase tracking-widest text-neutral-400">{copy.form.house}</span>
            <select
              value={form.houseSystem}
              onChange={e => handleChange('houseSystem', e.target.value)}
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
              value={form.birthDate}
              onChange={e => handleChange('birthDate', e.target.value)}
              className="w-full rounded-lg border border-mok-goldDeep/40 bg-black/60 px-3 py-2"
            />
          </label>
          <label className="text-sm text-neutral-200">
            <span className="mb-1 block text-xs uppercase tracking-widest text-neutral-400">{copy.form.birthTime}</span>
            <input
              type="time"
              required
              value={form.birthTime}
              onChange={e => handleChange('birthTime', e.target.value)}
              className="w-full rounded-lg border border-mok-goldDeep/40 bg-black/60 px-3 py-2"
            />
            <span className="mt-1 block text-xs text-neutral-500">{copy.form.timeHint}</span>
          </label>
          <label className="text-sm text-neutral-200">
            <span className="mb-1 block text-xs uppercase tracking-widest text-neutral-400">{copy.form.tzLabel}</span>
            <input
              type="text"
              value={form.tzOffsetMinutes}
              onChange={e => handleChange('tzOffsetMinutes', e.target.value)}
              className="w-full rounded-lg border border-mok-goldDeep/40 bg-black/60 px-3 py-2 disabled:opacity-60"
              disabled={timezoneLocked}
            />
            <span className="mt-1 block text-xs text-neutral-500">{timezoneLocked ? copy.tzAutoNote.replace('{tz}', formatOffsetDisplay(form.tzOffsetMinutes)) : copy.form.tzHint}</span>
          </label>
          <label className="text-sm text-neutral-200">
            <span className="mb-1 block text-xs uppercase tracking-widest text-neutral-400">{copy.form.latitude}</span>
            <input
              type="number"
              step="0.0001"
              value={form.latitude}
              onChange={e => handleChange('latitude', e.target.value)}
              className="w-full rounded-lg border border-mok-goldDeep/40 bg-black/60 px-3 py-2"
            />
          </label>
          <label className="text-sm text-neutral-200">
            <span className="mb-1 block text-xs uppercase tracking-widest text-neutral-400">{copy.form.longitude}</span>
            <input
              type="number"
              step="0.0001"
              value={form.longitude}
              onChange={e => handleChange('longitude', e.target.value)}
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
                  <select value={selectedCountry} onChange={e => setSelectedCountry(e.target.value)} className="w-full rounded-lg border border-mok-goldDeep/40 bg-black/60 px-3 py-2">
                    {countryOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-neutral-300">
                  <span className="mb-1 block">{copy.helperDropdown.state}</span>
                  <select value={selectedState} onChange={e => setSelectedState(e.target.value)} className="w-full rounded-lg border border-mok-goldDeep/40 bg-black/60 px-3 py-2">
                    {stateOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-neutral-300">
                  <span className="mb-1 block">{copy.helperDropdown.city}</span>
                  <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} className="w-full rounded-lg border border-mok-goldDeep/40 bg-black/60 px-3 py-2">
                    {cityOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={applyPresetLocation}
                  disabled={!matchedLocation}
                  className="rounded-full bg-mok-gold px-5 py-2 text-xs font-semibold text-black disabled:opacity-60"
                >
                  {copy.helperDropdown.apply}
                </button>
                {matchedLocation && (
                  <p className="text-xs text-neutral-500">
                    {copy.helperDropdown.notice.replace('{tz}', formatOffsetHours(matchedLocation.tzOffsetHours))}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs text-neutral-400">{copy.helperMapHint}</p>
                <LocationPickerMap
                  latitude={Number.isFinite(mapLat) ? mapLat : 16.8409}
                  longitude={Number.isFinite(mapLon) ? mapLon : 96.1735}
                  onChange={handleMapUpdate}
                />
              </div>
            </div>
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-3">
            {loading && <span className="text-xs text-neutral-400">{copy.loading}</span>}
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-mok-gold px-6 py-2 text-sm font-semibold text-black disabled:opacity-60"
            >
              {copy.form.submit}
            </button>
          </div>
        </form>
        {error && <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
      </section>

      {!result && !loading && (
        <p className="text-center text-sm text-neutral-500">{copy.empty}</p>
      )}

      {result && (
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-mok-goldDeep/40 bg-black/40 p-4">
              <h2 className="text-sm font-semibold text-mok-gold">{copy.resultTitle}</h2>
              <ul className="mt-3 space-y-1 text-xs text-neutral-300">
                <li>{result.metadata.birthDate} · {result.metadata.birthTime}</li>
                <li>{formatOffset(result.metadata.timezoneMinutes)} · lat {result.metadata.latitude.toFixed(4)}, lon {result.metadata.longitude.toFixed(4)}</li>
                <li>House: {result.metadata.houseSystem}</li>
              </ul>
            </div>
            {result.ascendant && (
              <div className="rounded-2xl border border-mok-goldDeep/40 bg-black/40 p-4">
                <h3 className="text-sm font-semibold text-mok-gold">Ascendant</h3>
                <p className="text-lg font-semibold text-white">{lang === 'en' ? result.ascendant.sign.en : result.ascendant.sign.my}</p>
                <p className="text-xs text-neutral-400">{formatDMS(result.ascendant.formatted)}</p>
              </div>
            )}
            {result.midheaven && (
              <div className="rounded-2xl border border-mok-goldDeep/40 bg-black/40 p-4">
                <h3 className="text-sm font-semibold text-mok-gold">Midheaven</h3>
                <p className="text-lg font-semibold text-white">{lang === 'en' ? result.midheaven.sign.en : result.midheaven.sign.my}</p>
                <p className="text-xs text-neutral-400">{formatDMS(result.midheaven.formatted)}</p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-mok-goldDeep/30 bg-black/30 p-4">
            <h2 className="mb-3 text-sm font-semibold text-mok-gold">{copy.chartTitle}</h2>
            <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
              <NatalChartWheel planets={chartPlanets} houses={houseLines} ascDegree={result.ascendant?.degree} />
              <div className="w-full text-xs text-neutral-300">
                <p>{lang === 'en' ? 'Planets are drawn according to ecliptic longitude. 0° Aries is at the top of the wheel.' : 'ဘီးပုံတွင် ဂြိုလ်နေရာများကို အကြောင်းပြုလျှင် ၀ ဒီဂရီ မက္ကရ ကို အပေါ်တွင် ထားပေးထားသည်။'}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
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
                  {result.planets.map(planet => (
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
                  {result.houses.map(house => (
                    <tr key={house.number} className="border-t border-white/5 text-sm">
                      <td className="py-2 font-semibold text-white">{house.number}</td>
                      <td>{lang === 'en' ? house.sign.en : house.sign.my}</td>
                      <td>{formatDMS(house.absoluteFormatted)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {result.warnings && result.warnings.length > 0 && (
            <div className="rounded-2xl border border-yellow-600/40 bg-yellow-500/10 p-4 text-sm text-yellow-100">
              <h3 className="mb-2 font-semibold uppercase tracking-widest text-xs">{copy.warningsTitle}</h3>
              <ul className="list-disc pl-5">
                {result.warnings.map((warn, idx) => (
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
              <span className="inline-flex items-center gap-2 rounded-full border border-mok-gold/40 px-3 py-1 text-xs text-mok-gold">
                <span
                  className={`h-2 w-2 rounded-full ${
                    readingStatus === 'done'
                      ? 'bg-emerald-400'
                      : readingStatus === 'idle'
                        ? 'bg-neutral-600'
                        : 'bg-mok-gold animate-pulse'
                  }`}
                />
                {copy.reading.status[readingStatus]}
              </span>
            </div>
            {readingError && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{readingError}</p>
            )}
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-mok-gold">{copy.reading.planetsTitle}</h3>
                {planetInsights.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {planetInsights.map(topic => (
                      <InsightCard key={topic.id} topic={topic} />
                    ))}
                  </div>
                ) : readingStatus === 'planets' ? (
                  <InsightSkeleton />
                ) : (
                  <p className="text-sm text-neutral-500">{copy.reading.empty}</p>
                )}
              </div>
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-mok-gold">{copy.reading.housesTitle}</h3>
                {houseInsights.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {houseInsights.map(topic => (
                      <InsightCard key={topic.id} topic={topic} />
                    ))}
                  </div>
                ) : readingStatus === 'houses' ? (
                  <InsightSkeleton />
                ) : (
                  <p className="text-sm text-neutral-500">{copy.reading.empty}</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-mok-gold">{copy.reading.summaryTitle}</h3>
              {readingSummary ? (
                <div className="mt-3 rounded-2xl border border-mok-goldDeep/40 bg-gradient-to-r from-black/50 to-black/20 p-4">
                  <p className="text-sm font-semibold text-white">{readingSummary.title}</p>
                  <p className="mt-2 whitespace-pre-line text-sm text-neutral-200">{readingSummary.message}</p>
                  {readingSummary.keywords && readingSummary.keywords.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-mok-gold">
                      {readingSummary.keywords.map((word, idx) => (
                        <span key={`${word}-${idx}`} className="rounded-full border border-mok-gold/50 px-3 py-0.5">
                          {word}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : readingStatus === 'houses' ? (
                <SummarySkeleton />
              ) : (
                <p className="mt-2 text-sm text-neutral-500">{copy.reading.summaryEmpty}</p>
              )}
            </div>
          </div>
        </section>
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
