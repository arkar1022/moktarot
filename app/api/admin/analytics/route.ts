import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const VALID_METRICS = ['users','tarot','guidance','natal-self','natal-other','natal-couple','zodiac','good-deeds','engagement'] as const
const VALID_GROUPS = ['year','month','day','hour'] as const

type VisualMetric = typeof VALID_METRICS[number]
type AnalyticsGroup = typeof VALID_GROUPS[number]
type BasicMetric = Exclude<VisualMetric, 'engagement'>

type EventPoint = { date: Date; weight: number }
type Bucket = { key: string; label: string; count: number }

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const ENGAGEMENT_COMPONENTS: BasicMetric[] = ['users','tarot','guidance','natal-self','natal-other','natal-couple','zodiac','good-deeds']

export async function GET(req: Request) {
  const auth = getAuth(req)
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const metric = searchParams.get('metric') as VisualMetric | null
  const group = searchParams.get('group') as AnalyticsGroup | null
  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')

  if (!metric || !VALID_METRICS.includes(metric)) {
    return NextResponse.json({ error: 'Invalid metric' }, { status: 400 })
  }
  if (!group || !VALID_GROUPS.includes(group)) {
    return NextResponse.json({ error: 'Invalid group' }, { status: 400 })
  }
  if (!fromParam || !toParam) {
    return NextResponse.json({ error: 'Missing range' }, { status: 400 })
  }

  const from = new Date(fromParam)
  const to = new Date(toParam)
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }
  if (from >= to) {
    return NextResponse.json({ error: 'Invalid range' }, { status: 400 })
  }

  const buckets = buildBuckets(group, from, to)
  if (!buckets.length) {
    return NextResponse.json({ buckets: [] })
  }

  try {
    const events = await fetchEvents(metric, from, to)
    if (events.length) {
      const indexByKey = new Map(buckets.map((bucket, idx) => [bucket.key, idx]))
      for (const point of events) {
        if (!point.date || !Number.isFinite(point.date.getTime())) continue
        const key = bucketKey(point.date, group)
        const idx = indexByKey.get(key)
        if (idx === undefined) continue
        buckets[idx].count += point.weight || 0
      }
    }
    return NextResponse.json({ buckets: buckets.map(({ label, count }) => ({ label, count })) })
  } catch (err) {
    console.error('Failed to load admin analytics', err)
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 })
  }
}

async function fetchEvents(metric: VisualMetric, from: Date, to: Date): Promise<EventPoint[]> {
  if (metric === 'engagement') {
    const parts = await Promise.all(ENGAGEMENT_COMPONENTS.map(subMetric => fetchBasicEvents(subMetric, from, to)))
    return parts.flat()
  }
  return fetchBasicEvents(metric, from, to)
}

async function fetchBasicEvents(metric: BasicMetric, from: Date, to: Date): Promise<EventPoint[]> {
  const range = { gte: from, lt: to }
  switch (metric) {
    case 'users': {
      const rows = await prisma.user.findMany({ where: { createdAt: range }, select: { createdAt: true } })
      return rows.map(row => ({ date: row.createdAt, weight: 1 }))
    }
    case 'tarot': {
      const rows = await prisma.reading.findMany({ where: { createdAt: range }, select: { createdAt: true } })
      return rows.map(row => ({ date: row.createdAt, weight: 1 }))
    }
    case 'guidance': {
      const rows = await prisma.guidance.findMany({ where: { createdAt: range }, select: { createdAt: true } })
      return rows.map(row => ({ date: row.createdAt, weight: 1 }))
    }
    case 'natal-self':
    case 'natal-other':
    case 'natal-couple': {
      const context = metric === 'natal-self' ? 'self' : metric === 'natal-other' ? 'other' : 'couple'
      const rows = await prisma.natalReadingRecord.findMany({ where: { createdAt: range, context }, select: { createdAt: true } })
      return rows.map(row => ({ date: row.createdAt, weight: 1 }))
    }
    case 'good-deeds': {
      const rows = await prisma.goodDeed.findMany({ where: { deedDate: range }, select: { deedDate: true } })
      return rows.map(row => ({ date: row.deedDate, weight: 1 }))
    }
    case 'zodiac': {
      const rows = await prisma.zodiacView.findMany({ where: { lastViewed: range }, select: { lastViewed: true, count: true } })
      return rows
        .filter(row => row.count > 0)
        .map(row => ({
          date: row.lastViewed,
          // Store all known views against the most recent timestamp.
          weight: row.count
        }))
    }
    default:
      return []
  }
}

function buildBuckets(group: AnalyticsGroup, from: Date, to: Date): Bucket[] {
  const buckets: Bucket[] = []
  let cursor = startOfGroup(from, group)
  const maxBuckets = 5000
  let guard = 0
  while (cursor < to && guard < maxBuckets) {
    const start = new Date(cursor)
    const key = bucketKey(start, group)
    buckets.push({ key, label: formatLabel(start, group), count: 0 })
    cursor = advanceGroup(start, group)
    guard += 1
  }
  return buckets
}

function formatLabel(date: Date, group: AnalyticsGroup) {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const day = date.getUTCDate()
  const hours = date.getUTCHours()
  switch (group) {
    case 'year':
      return `${year}`
    case 'month':
      return `${MONTH_LABELS[month]} ${year}`
    case 'day':
      return `${MONTH_LABELS[month]} ${day}`
    case 'hour':
      return `${String(hours).padStart(2, '0')}:00`
    default:
      return date.toISOString()
  }
}

function bucketKey(date: Date, group: AnalyticsGroup) {
  return startOfGroup(date, group).getTime().toString()
}

function startOfGroup(date: Date, group: AnalyticsGroup) {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const day = date.getUTCDate()
  const hour = date.getUTCHours()
  switch (group) {
    case 'year':
      return new Date(Date.UTC(year, 0, 1))
    case 'month':
      return new Date(Date.UTC(year, month, 1))
    case 'day':
      return new Date(Date.UTC(year, month, day))
    case 'hour':
    default:
      return new Date(Date.UTC(year, month, day, hour))
  }
}

function advanceGroup(date: Date, group: AnalyticsGroup) {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const day = date.getUTCDate()
  const hour = date.getUTCHours()
  switch (group) {
    case 'year':
      return new Date(Date.UTC(year + 1, 0, 1))
    case 'month':
      return new Date(Date.UTC(year, month + 1, 1))
    case 'day':
      return new Date(Date.UTC(year, month, day + 1))
    case 'hour':
    default:
      return new Date(Date.UTC(year, month, day, hour + 1))
  }
}
