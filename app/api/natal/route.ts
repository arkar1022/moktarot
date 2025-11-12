import { NextResponse } from 'next/server'
import path from 'node:path'
import { utc_to_jd, calc, houses_ex2, constants, set_ephe_path } from 'sweph'

let epheInitialized = false

const SIGN_NAMES_EN = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'] as const
const SIGN_NAMES_MY = ['မက္ကရ','ပြိဿ','မေထုန်','ကရကဋ္','သိဟ်','ကန်','တူလာ','ဗြိစ္ဆာ','ဓနု','မကာရ','ကုံ','မိန်'] as const

const PLANETS = [
  { id: constants.SE_SUN, key: 'sun', labelEn: 'Sun', labelMy: 'တနင်္ဂနွေ (Ta-Nin-Ga-Nway)', glyph: '☉' },
  { id: constants.SE_MOON, key: 'moon', labelEn: 'Moon', labelMy: 'တနင်္လာ (Ta-Nin-La)', glyph: '☽' },
  { id: constants.SE_MERCURY, key: 'mercury', labelEn: 'Mercury', labelMy: 'ဗုဒ္ဓဟူး (Boke-Da-Hoo)', glyph: '☿' },
  { id: constants.SE_VENUS, key: 'venus', labelEn: 'Venus', labelMy: 'သောကြာ (Thauk-Kya)', glyph: '♀' },
  { id: constants.SE_MARS, key: 'mars', labelEn: 'Mars', labelMy: 'အင်္ဂါ (Inga)', glyph: '♂' },
  { id: constants.SE_JUPITER, key: 'jupiter', labelEn: 'Jupiter', labelMy: 'ကြာသပတေး (Kya-Tha-Ba-Day)', glyph: '♃' },
  { id: constants.SE_SATURN, key: 'saturn', labelEn: 'Saturn', labelMy: 'စနေ (Sa-Nay)', glyph: '♄' },
  { id: constants.SE_URANUS, key: 'uranus', labelEn: 'Uranus', labelMy: 'ယူရေးနပ်စ် (Yu-Ray-Nut)', glyph: '♅' },
  { id: constants.SE_NEPTUNE, key: 'neptune', labelEn: 'Neptune', labelMy: 'နက်ပကျွန်း (Net-Pya-Kyun)', glyph: '♆' },
  { id: constants.SE_PLUTO, key: 'pluto', labelEn: 'Pluto', labelMy: 'ပလူတို (Pa-Lu-To)', glyph: '♇' },
  { id: constants.SE_CHIRON, key: 'chiron', labelEn: 'Chiron', labelMy: 'ခိုင်ရွန် (Khine-Yon)', glyph: '⚷' },
  { id: constants.SE_MEAN_NODE, key: 'northNode', labelEn: 'North Node', labelMy: 'ရာဟု (Ra-Hu)', glyph: '☊' }
] as const

const HOUSE_SYSTEMS = new Set(['P','K','O','R','C','B','M','X','H','G','T','U','F','D','J','E','V','Y','W','Q'])

function ensureEphePath() {
  if (!epheInitialized) {
    try {
      const ephePath = path.join(process.cwd(), 'public', 'ephe')
      set_ephe_path(ephePath)
    } catch (error) {
      console.warn('[NATAL][EPHE] unable to set ephemeris path', error)
    } finally {
      epheInitialized = true
    }
  }
}

function normalizeDegrees(value: number) {
  const mod = value % 360
  return mod < 0 ? mod + 360 : mod
}

function signDetails(degree: number) {
  const normalized = normalizeDegrees(degree)
  const index = Math.floor(normalized / 30)
  const within = normalized - index * 30
  return {
    index,
    sign: SIGN_NAMES_EN[index],
    signMy: SIGN_NAMES_MY[index],
    degreeWithin: within
  }
}

function parseTzOffset(value: unknown): number | null {
  const toMinutes = (hours: number) => (Math.abs(hours) <= 24 ? hours * 60 : hours)
  if (typeof value === 'number' && Number.isFinite(value)) {
    return toMinutes(value)
  }
  if (typeof value === 'string' && value.trim()) {
    const text = value.trim()
    const match = text.match(/^([+-]?)(\d{1,2})(?::?(\d{2}))?$/)
    if (match) {
      const sign = match[1] === '-' ? -1 : 1
      const hours = Number(match[2])
      const minutes = match[3] ? Number(match[3]) : 0
      if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
        return sign * (hours * 60 + minutes)
      }
    }
    const num = Number(text)
    if (!Number.isNaN(num)) return toMinutes(num)
  }
  return null
}

function toUtcComponents(dateStr: string, timeStr: string, tzOffsetMinutes: number) {
  const [year, month, day] = dateStr.split('-').map(Number)
  if (![year, month, day].every(n => Number.isFinite(n))) return null
  const [hour, minute] = timeStr.split(':').map(Number)
  if (![hour, minute].every(n => Number.isFinite(n))) return null
  const localMillis = Date.UTC(year, month - 1, day, hour, minute, 0)
  const utcMillis = localMillis - tzOffsetMinutes * 60 * 1000
  const utcDate = new Date(utcMillis)
  return {
    year: utcDate.getUTCFullYear(),
    month: utcDate.getUTCMonth() + 1,
    day: utcDate.getUTCDate(),
    hour: utcDate.getUTCHours(),
    minute: utcDate.getUTCMinutes(),
    second: utcDate.getUTCSeconds(),
    utcIso: utcDate.toISOString()
  }
}

function formatDegree(value: number) {
  const normalized = normalizeDegrees(value)
  const deg = Math.floor(normalized)
  const minFloat = (normalized - deg) * 60
  const min = Math.floor(minFloat)
  const sec = Math.round((minFloat - min) * 60)
  return { deg, min, sec }
}

export async function POST(request: Request) {
  ensureEphePath()
  let payload: any
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const { birthDate, birthTime, tzOffsetMinutes, latitude, longitude, houseSystem } = payload || {}
  if (!birthDate || !birthTime) {
    return NextResponse.json({ error: 'Birth date and time are required.' }, { status: 400 })
  }

  const tzMinutes = parseTzOffset(tzOffsetMinutes ?? 0)
  if (tzMinutes === null) {
    return NextResponse.json({ error: 'Timezone offset is invalid.' }, { status: 400 })
  }

  const lat = Number(latitude)
  const lon = Number(longitude)
  if (![lat, lon].every(n => Number.isFinite(n))) {
    return NextResponse.json({ error: 'Latitude and longitude must be numeric.' }, { status: 400 })
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: 'Latitude must be between -90 and 90, longitude between -180 and 180.' }, { status: 400 })
  }

  const utcParts = toUtcComponents(String(birthDate), String(birthTime), tzMinutes)
  if (!utcParts) {
    return NextResponse.json({ error: 'Birth date or time is invalid.' }, { status: 400 })
  }

  const { year, month, day, hour, minute, second, utcIso } = utcParts
  const jdResult = utc_to_jd(year, month, day, hour, minute, second, constants.SE_GREG_CAL)
  if (jdResult.flag !== constants.OK) {
    return NextResponse.json({ error: jdResult.error || 'Unable to convert date to Julian day.' }, { status: 400 })
  }

  const [jdEt, jdUt] = jdResult.data
  const calcFlags = constants.SEFLG_SWIEPH | constants.SEFLG_SPEED
  const warnings: string[] = []

  const planets = PLANETS.map(body => {
    const result = calc(jdEt, body.id, calcFlags)
    if (result.error) warnings.push(`${body.labelEn}: ${result.error.trim()}`)
    const [lonDeg, latDeg, distance, lonSpeed] = result.data
    const sign = signDetails(lonDeg)
    return {
      key: body.key,
      glyph: body.glyph,
      labelEn: body.labelEn,
      labelMy: body.labelMy,
      longitude: normalizeDegrees(lonDeg),
      latitude: latDeg,
      distance,
      retrograde: (lonSpeed || 0) < 0,
      sign: {
        index: sign.index,
        en: sign.sign,
        my: sign.signMy,
        degreeWithin: sign.degreeWithin,
        formatted: formatDegree(sign.degreeWithin)
      },
      absoluteFormatted: formatDegree(lonDeg)
    }
  })

  const system = typeof houseSystem === 'string' && HOUSE_SYSTEMS.has(houseSystem) ? houseSystem : 'P'
  const houseResult = houses_ex2(jdUt, 0, lat, lon, system)
  if (houseResult.error) warnings.push(houseResult.error.trim())
  const cusps = houseResult.data?.houses || []
  const points = houseResult.data?.points || []

  const houses = cusps.map((degree, index) => {
    const sign = signDetails(degree)
    return {
      number: index + 1,
      degree: normalizeDegrees(degree),
      sign: {
        index: sign.index,
        en: sign.sign,
        my: sign.signMy,
        degreeWithin: sign.degreeWithin,
        formatted: formatDegree(sign.degreeWithin)
      },
      absoluteFormatted: formatDegree(degree)
    }
  })

  const ascendant = typeof points[0] === 'number' ? signDetails(points[0]) : null
  const midheaven = typeof points[1] === 'number' ? signDetails(points[1]) : null

  return NextResponse.json({
    metadata: {
      birthDate: String(birthDate),
      birthTime: String(birthTime),
      timezoneMinutes: tzMinutes,
      latitude: lat,
      longitude: lon,
      houseSystem: system,
      utcIso,
    },
    planets,
    houses,
    ascendant: ascendant && {
      degree: normalizeDegrees(points[0]),
      sign: ascendant,
      formatted: formatDegree(points[0])
    },
    midheaven: midheaven && {
      degree: normalizeDegrees(points[1]),
      sign: midheaven,
      formatted: formatDegree(points[1])
    },
    chartPoints: {
      ascmc: points
    },
    warnings: warnings.filter(Boolean)
  })
}
