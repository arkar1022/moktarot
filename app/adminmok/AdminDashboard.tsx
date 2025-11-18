"use client"
//nothing
import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { TAROT_DECK, shuffleDeck, cardImagePath, CARD_BACK_SRC } from '@/lib/tarot'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

type User = {
  id: string
  email: string | null
  phoneCode?: string | null
  phoneNumber?: string | null
  name: string
  role: 'USER' | 'ADMIN'
  createdAt: string
  dailyLimit?: number
  extraQuota?: number
}

type Reading = {
  id: string
  userId: string
  question: string
  answer: string
  language: string
  category?: 'LOVE'|'MARRIAGE'|'WORK'|'LIFESTYLE'|'SPIRITUAL'|'EDUCATION'|'HEALTH'|'MONEY' | null
  createdAt: string
  cards?: any
  user?: { id: string; email: string | null; name: string; phoneCode?: string | null; phoneNumber?: string | null }
}

const CATEGORIES = ['LOVE','MARRIAGE','WORK','LIFESTYLE','SPIRITUAL','EDUCATION','HEALTH','MONEY'] as const

type Guidance = {
  id: string
  userId: string
  religion: 'BUDDHIST'|'HINDU'|'CHRISTIAN'|'ISLAM'
  question: string
  answer: string
  createdAt: string
  user?: { id: string; email: string | null; name: string; phoneCode?: string | null; phoneNumber?: string | null }
}

type NatalTopic = {
  id: string
  title: string
  focus: string
  message: string
  keywords?: string[]
}

type NatalSummary = {
  title: string
  message: string
  keywords?: string[]
}

type NatalRecord = {
  id: string
  userId: string | null
  context: 'self' | 'other' | 'couple'
  phase: 'planets' | 'houses' | null
  language: 'en' | 'my'
  status: 'pending' | 'success' | 'error'
  errorMessage: string | null
  createdAt: string
  request: any
  response: {
    topics?: NatalTopic[]
    summary?: NatalSummary | null
  } | null
  user?: { id: string; email: string | null; name: string; phoneCode?: string | null; phoneNumber?: string | null }
}

type GoodDeedCategory = 'FAMILY'|'COMMUNITY'|'RELIGION'|'SELF_GROWTH'|'HEALTH'|'FINANCIAL'|'EDUCATION'|'ENVIRONMENT'|'KINDNESS'|'PROFESSIONAL'

type VisualMetric = 'users'|'tarot'|'guidance'|'natal-self'|'natal-other'|'natal-couple'|'zodiac'|'good-deeds'|'engagement'

type GoodDeed = {
  id: string
  userId: string
  deedDate: string
  createdAt: string
  note: string
  categories: GoodDeedCategory[]
  aiFeedback: string
  language: 'en' | 'my'
  belief: 'BUDDHIST' | 'HINDU' | 'CHRISTIAN' | 'ISLAM' | 'ATHEIST'
  points: number
  user?: { id: string; email: string | null; name: string; phoneCode?: string | null; phoneNumber?: string | null }
}

const BELIEF_OPTIONS: GoodDeed['belief'][] = ['BUDDHIST','HINDU','CHRISTIAN','ISLAM','ATHEIST']
const GOOD_DEED_CATEGORIES: GoodDeedCategory[] = ['FAMILY','COMMUNITY','RELIGION','SELF_GROWTH','HEALTH','FINANCIAL','EDUCATION','ENVIRONMENT','KINDNESS','PROFESSIONAL']
const VISUAL_METRIC_OPTIONS: { value: VisualMetric; label: string }[] = [
  { value: 'users', label: 'User registrations' },
  { value: 'tarot', label: 'Tarot readings' },
  { value: 'guidance', label: 'Spiritual guidance' },
  { value: 'natal-self', label: 'Natal (self)' },
  { value: 'natal-other', label: 'Natal (other)' },
  { value: 'natal-couple', label: 'Natal (couple)' },
  { value: 'zodiac', label: 'Zodiac views' },
  { value: 'good-deeds', label: 'Good deeds logged' },
  { value: 'engagement', label: 'All engagements' },
]

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function AdminDashboard({ users, readings, guidances, natalRecords, goodDeeds }: { users: User[]; readings: Reading[]; guidances: Guidance[]; natalRecords: NatalRecord[]; goodDeeds: GoodDeed[] }) {
  const [tab, setTab] = useState<'users'|'readings'|'guidance'|'gooddeeds'|'natal'|'zodiac'|'visual'>('users')
  const [openUserId, setOpenUserId] = useState<string | null>(null)
  const [usersState, setUsersState] = useState<User[]>(users)
  const [readingsState, setReadingsState] = useState<Reading[]>(readings)
  const [guidancesState, setGuidancesState] = useState<Guidance[]>(guidances)
  const [natalState, setNatalState] = useState<NatalRecord[]>(natalRecords)
  const [goodDeedsState] = useState<GoodDeed[]>(goodDeeds)
  const [openReading, setOpenReading] = useState<Reading | null>(null)
  const [openGuidance, setOpenGuidance] = useState<Guidance | null>(null)
  const [openNatalRecord, setOpenNatalRecord] = useState<NatalRecord | null>(null)
  const [openGoodDeed, setOpenGoodDeed] = useState<GoodDeed | null>(null)
  const now = useMemo(() => new Date(), [])
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const [visualMetric, setVisualMetric] = useState<VisualMetric>('users')
  const [viewMode, setViewMode] = useState<'year'|'month'|'day'|'hour'>('year')
  const [yearRangeStart, setYearRangeStart] = useState(currentYear - 4)
  const [yearRangeEnd, setYearRangeEnd] = useState(currentYear)
  const [monthYear, setMonthYear] = useState(currentYear)
  const [dayYear, setDayYear] = useState(currentYear)
  const [dayMonth, setDayMonth] = useState(currentMonth)
  const [specificDate, setSpecificDate] = useState(now.toISOString().slice(0, 10))
  const [analyticsBuckets, setAnalyticsBuckets] = useState<Array<{ label: string; count: number }>>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)
  const [userDetailTab, setUserDetailTab] = useState<'readings'|'guidance'>('readings')
  useEffect(()=>{ setUserDetailTab('readings') }, [openUserId])

  const analyticsRange = useMemo(() => {
    const clampMonth = (m: number) => Math.min(12, Math.max(1, m))
    if (viewMode === 'year') {
      const startYear = Math.min(yearRangeStart, yearRangeEnd)
      const endYear = Math.max(yearRangeStart, yearRangeEnd)
      return {
        group: 'year' as const,
        from: new Date(Date.UTC(startYear, 0, 1)),
        to: new Date(Date.UTC(endYear + 1, 0, 1)),
        description: `${startYear} – ${endYear}`,
      }
    }
    if (viewMode === 'month') {
      return {
        group: 'month' as const,
        from: new Date(Date.UTC(monthYear, 0, 1)),
        to: new Date(Date.UTC(monthYear + 1, 0, 1)),
        description: `Months of ${monthYear}`,
      }
    }
    if (viewMode === 'day') {
      const monthIdx = clampMonth(dayMonth) - 1
      return {
        group: 'day' as const,
        from: new Date(Date.UTC(dayYear, monthIdx, 1)),
        to: new Date(Date.UTC(dayYear, monthIdx + 1, 1)),
        description: `${MONTH_NAMES[monthIdx]} ${dayYear}`,
      }
    }
    const base = specificDate ? new Date(`${specificDate}T00:00:00Z`) : new Date()
    const fromDate = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()))
    const toDate = new Date(fromDate)
    toDate.setUTCDate(toDate.getUTCDate() + 1)
    return {
      group: 'hour' as const,
      from: fromDate,
      to: toDate,
      description: fromDate.toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' }),
    }
  }, [viewMode, yearRangeStart, yearRangeEnd, monthYear, dayYear, dayMonth, specificDate])
  

  useEffect(() => {
    let ignore = false
    async function loadAnalytics() {
      if (!analyticsRange) return
      setAnalyticsLoading(true)
      setAnalyticsError(null)
      try {
        const params = new URLSearchParams({
          metric: visualMetric,
          group: analyticsRange.group,
          from: analyticsRange.from.toISOString(),
          to: analyticsRange.to.toISOString(),
        })
        const res = await fetch(`/api/admin/analytics?${params.toString()}`, { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || 'Failed to load analytics')
        if (!ignore) setAnalyticsBuckets(data.buckets || [])
      } catch (err: any) {
        if (!ignore) setAnalyticsError(err?.message || 'Failed to load analytics')
      } finally {
        if (!ignore) setAnalyticsLoading(false)
      }
    }
    loadAnalytics()
    return () => { ignore = true }
  }, [visualMetric, analyticsRange])

  const metricLabel = useMemo(() => VISUAL_METRIC_OPTIONS.find(opt => opt.value === visualMetric)?.label || 'Metric', [visualMetric])
  const analyticsTotal = useMemo(() => analyticsBuckets.reduce((sum, bucket) => sum + bucket.count, 0), [analyticsBuckets])
  const analyticsChartData = useMemo(() => ({
    labels: analyticsBuckets.map(bucket => bucket.label),
    datasets: [
      {
        label: metricLabel,
        data: analyticsBuckets.map(bucket => bucket.count),
        borderColor: '#d4af37',
        backgroundColor: 'rgba(212,175,55,0.2)',
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#f6e27f',
        pointRadius: 4,
      }
    ]
  }), [analyticsBuckets, metricLabel])
  const analyticsChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (context: any) => `${context.parsed.y ?? context.parsed} events` } }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0, color: '#d4d4d8' },
        grid: { color: 'rgba(255,255,255,0.08)' }
      },
      x: { ticks: { color: '#a1a1aa' }, grid: { display: false } }
    }
  }), [])

  // Build lastActive map from readings
  const lastActive = useMemo(() => {
    const map: Record<string, string> = {}
    for (const r of readingsState) {
      const cur = map[r.userId]
      if (!cur || new Date(r.createdAt) > new Date(cur)) map[r.userId] = r.createdAt
    }
    for (const g of guidancesState) {
      const cur = map[g.userId]
      if (!cur || new Date(g.createdAt) > new Date(cur)) map[g.userId] = g.createdAt
    }
    for (const n of natalState) {
      if (!n.userId) continue
      const cur = map[n.userId]
      if (!cur || new Date(n.createdAt) > new Date(cur)) map[n.userId as string] = n.createdAt
    }
    return map
  }, [readingsState, guidancesState, natalState])

  /* USERS state */
  const [uQuery, setUQuery] = useState('')
  const [uSort, setUSort] = useState<'created_desc'|'created_asc'|'active_desc'|'active_asc'|'name_asc'|'name_desc'>('created_desc')
  const [uCreatedFrom, setUCreatedFrom] = useState('')
  const [uCreatedTo, setUCreatedTo] = useState('')

  const filteredUsers = useMemo(() => {
    const q = uQuery.trim().toLowerCase()
    let arr = usersState.filter(u => {
      const phone = u.phoneCode && u.phoneNumber ? `+${u.phoneCode} ${u.phoneNumber}` : ''
      const okQ = !q || (u.email?.toLowerCase() || '').includes(q) || u.name.toLowerCase().includes(q) || phone.toLowerCase().includes(q)
      const t = new Date(u.createdAt).getTime()
      const fromOk = !uCreatedFrom || t >= new Date(uCreatedFrom).getTime()
      const toOk = !uCreatedTo || t <= new Date(uCreatedTo).getTime() + 86_399_000
      return okQ && fromOk && toOk
    })
    const cmp = (a: User, b: User) => {
      switch (uSort) {
        case 'created_desc': return +new Date(b.createdAt) - +new Date(a.createdAt)
        case 'created_asc': return +new Date(a.createdAt) - +new Date(b.createdAt)
        case 'active_desc': return +new Date(lastActive[b.id] || 0) - +new Date(lastActive[a.id] || 0)
        case 'active_asc': return +new Date(lastActive[a.id] || 0) - +new Date(lastActive[b.id] || 0)
        case 'name_asc': return a.name.localeCompare(b.name)
        case 'name_desc': return b.name.localeCompare(a.name)
      }
    }
    return arr.sort(cmp)
  }, [usersState, uQuery, uSort, uCreatedFrom, uCreatedTo, lastActive])

  /* READINGS state */
  const [rQuery, setRQuery] = useState('')
  const [rSort, setRSort] = useState<'recent'|'oldest'|'longest'|'shortest'>('recent')
  const [rCats, setRCats] = useState<string[]>([])
  /* Natal records */
  const [nQuery, setNQuery] = useState('')
  const [nContextFilter, setNContextFilter] = useState<'all'|'self'|'other'|'couple'>('all')
  const [nPhaseFilter, setNPhaseFilter] = useState<'all'|'planets'|'houses'|'combined'>('all')
  const [nLangFilter, setNLangFilter] = useState<'all'|'en'|'my'>('all')
  const [nStatusFilter, setNStatusFilter] = useState<'all'|'success'|'pending'|'error'>('all')
  /* Good deeds */
  const [gdQuery, setGdQuery] = useState('')
  const [gdBeliefFilter, setGdBeliefFilter] = useState<'all'|GoodDeed['belief']>('all')
  const [gdLangFilter, setGdLangFilter] = useState<'all'|'en'|'my'>('all')
  const [gdCategoryFilter, setGdCategoryFilter] = useState<'all'|GoodDeedCategory>('all')

  const filteredReadings = useMemo(() => {
    const q = rQuery.trim().toLowerCase()
    let arr = readingsState.filter(r => {
      const phone = r.user?.phoneCode && r.user?.phoneNumber ? `+${r.user.phoneCode} ${r.user.phoneNumber}` : ''
      const text = `${r.question} ${r.user?.name || ''} ${r.user?.email || ''} ${phone}`.toLowerCase()
      const okQ = !q || text.includes(q)
      const okC = rCats.length === 0 || (r.category && rCats.includes(r.category))
      return okQ && okC
    })
    arr.sort((a, b) => {
      if (rSort === 'recent') return +new Date(b.createdAt) - +new Date(a.createdAt)
      if (rSort === 'oldest') return +new Date(a.createdAt) - +new Date(b.createdAt)
      if (rSort === 'longest') return (b.answer?.length || 0) - (a.answer?.length || 0)
      return (a.answer?.length || 0) - (b.answer?.length || 0)
    })
    return arr
  }, [readingsState, rQuery, rSort, rCats])

  const filteredNatalRecords = useMemo(() => {
    const q = nQuery.trim().toLowerCase()
    return natalState.filter(record => {
      const userText = `${record.user?.name || ''} ${record.user?.email || ''} ${
        record.user?.phoneCode && record.user?.phoneNumber ? `+${record.user.phoneCode} ${record.user.phoneNumber}` : ''
      }`.toLowerCase()
      const labelText = typeof record.request?.label === 'string' ? record.request.label.toLowerCase() : ''
      const okQuery = !q || userText.includes(q) || labelText.includes(q)
      const okContext = nContextFilter === 'all' || record.context === nContextFilter
      const okLang = nLangFilter === 'all' || record.language === nLangFilter
      const okStatus = nStatusFilter === 'all' || record.status === nStatusFilter
      const okPhase =
        nPhaseFilter === 'all'
          ? true
          : nPhaseFilter === 'combined'
            ? !record.phase || record.context === 'couple'
            : record.phase === nPhaseFilter
      return okQuery && okContext && okLang && okPhase && okStatus
    })
  }, [natalState, nQuery, nContextFilter, nLangFilter, nPhaseFilter, nStatusFilter])
  const getNatalPhaseLabel = (record: NatalRecord) => {
    if (record.context === 'couple') return 'Couple summary'
    if (!record.phase) return '—'
    return record.phase === 'planets' ? 'Planets' : 'Houses'
  }

  const filteredGoodDeeds = useMemo(() => {
    const q = gdQuery.trim().toLowerCase()
    const filtered = goodDeedsState.filter(deed => {
      const userText = `${deed.user?.name || ''} ${deed.user?.email || ''} ${
        deed.user?.phoneCode && deed.user?.phoneNumber ? `+${deed.user.phoneCode} ${deed.user.phoneNumber}` : ''
      }`.toLowerCase()
      const noteText = deed.note.toLowerCase()
      const feedbackText = deed.aiFeedback.toLowerCase()
      const okQuery = !q || userText.includes(q) || noteText.includes(q) || feedbackText.includes(q)
      const okBelief = gdBeliefFilter === 'all' || deed.belief === gdBeliefFilter
      const okLang = gdLangFilter === 'all' || deed.language === gdLangFilter
      const okCategory =
        gdCategoryFilter === 'all' ? true : deed.categories?.some(category => category === gdCategoryFilter)
      return okQuery && okBelief && okLang && okCategory
    })
    return filtered.sort((a, b) => +new Date(b.deedDate) - +new Date(a.deedDate))
  }, [goodDeedsState, gdQuery, gdBeliefFilter, gdLangFilter, gdCategoryFilter])

  async function deleteUser(id: string, name: string) {
    if (!confirm(`Delete user "${name}" and all readings? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      setUsersState(prev => prev.filter(u => u.id !== id))
      setReadingsState(prev => prev.filter(r => r.userId !== id))
      setGuidancesState(prev => prev.filter(g => g.userId !== id))
      setNatalState(prev => prev.filter(n => n.userId !== id))
      if (openUserId === id) setOpenUserId(null)
    } catch (e) {
      alert('Failed to delete user.')
    }
  }

  return (
    <div className="grid grid-cols-[220px_1fr] gap-4">
      <aside className="rounded-lg border border-mok-goldDeep/30 p-3 h-fit sticky top-4">
        <div className="mb-2 text-sm text-neutral-400">Admin</div>
        <nav className="space-y-1">
          <button onClick={() => setTab('users')} className={`w-full text-left px-3 py-2 rounded-md border ${tab==='users'?'border-mok-gold bg-black/40':'border-transparent hover:border-mok-goldDeep/30'}`}>Users</button>
          <button onClick={() => setTab('readings')} className={`w-full text-left px-3 py-2 rounded-md border ${tab==='readings'?'border-mok-gold bg-black/40':'border-transparent hover:border-mok-goldDeep/30'}`}>Readings</button>
          <button onClick={() => setTab('guidance')} className={`w-full text-left px-3 py-2 rounded-md border ${tab==='guidance'?'border-mok-gold bg-black/40':'border-transparent hover:border-mok-goldDeep/30'}`}>Guidance</button>
          <button onClick={() => setTab('gooddeeds')} className={`w-full text-left px-3 py-2 rounded-md border ${tab==='gooddeeds'?'border-mok-gold bg-black/40':'border-transparent hover:border-mok-goldDeep/30'}`}>Good Deeds</button>
          <button onClick={() => setTab('natal')} className={`w-full text-left px-3 py-2 rounded-md border ${tab==='natal'?'border-mok-gold bg-black/40':'border-transparent hover:border-mok-goldDeep/30'}`}>Natal Chart</button>
          <button onClick={() => setTab('zodiac')} className={`w-full text-left px-3 py-2 rounded-md border ${tab==='zodiac'?'border-mok-gold bg-black/40':'border-transparent hover:border-mok-goldDeep/30'}`}>Zodiac</button>
          <button onClick={() => setTab('visual')} className={`w-full text-left px-3 py-2 rounded-md border ${tab==='visual'?'border-mok-gold bg-black/40':'border-transparent hover:border-mok-goldDeep/30'}`}>Visual</button>
        </nav>
      </aside>

      <main>
        {tab === 'users' && (
          <section>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <input value={uQuery} onChange={e=>setUQuery(e.target.value)} placeholder="Search name, email or phone" className="h-9 w-64 max-w-full rounded-md bg-black/40 border border-mok-goldDeep/40 px-3 outline-none" />
              <select value={uSort} onChange={e=>setUSort(e.target.value as any)} className="h-9 rounded-md bg-black/40 border border-mok-goldDeep/40 px-2">
                <option value="created_desc">Created · New → Old</option>
                <option value="created_asc">Created · Old → New</option>
                <option value="active_desc">Last active · New → Old</option>
                <option value="active_asc">Last active · Old → New</option>
                <option value="name_asc">Name · A → Z</option>
                <option value="name_desc">Name · Z → A</option>
              </select>
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <span>Created from</span>
                <input type="date" value={uCreatedFrom} onChange={e=>setUCreatedFrom(e.target.value)} className="h-8 rounded bg-black/40 border border-mok-goldDeep/40 px-2"/>
                <span>to</span>
                <input type="date" value={uCreatedTo} onChange={e=>setUCreatedTo(e.target.value)} className="h-8 rounded bg-black/40 border border-mok-goldDeep/40 px-2"/>
              </div>
            </div>

            <div className="mb-2 text-xs text-neutral-400">
              Total users: <span className="text-mok-gold">{usersState.length}</span>
              {filteredUsers.length !== usersState.length && (
                <> · Showing: <span className="text-mok-gold">{filteredUsers.length}</span></>
              )}
            </div>
            <div className="overflow-x-auto border border-mok-goldDeep/30 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-mok-smoke/60">
                  <tr>
                    <th className="p-2 text-left w-12">No.</th>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Contact</th>
                    <th className="p-2 text-left">Role</th>
                    <th className="p-2 text-left">Created</th>
                    <th className="p-2 text-left">Last active</th>
                    <th className="p-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u, idx) => (
                    <tr key={u.id} className="border-t border-mok-goldDeep/20 hover:bg-black/30">
                      <td className="p-2 text-neutral-400">{idx + 1}</td>
                      <td className="p-2">{u.name}</td>
                      <td className="p-2">{u.email || (u.phoneCode && u.phoneNumber ? `+${u.phoneCode} ${u.phoneNumber}` : '—')}</td>
                      <td className="p-2">{u.role}</td>
                      <td className="p-2 whitespace-nowrap">{new Date(u.createdAt).toLocaleString()}</td>
                      <td className="p-2 whitespace-nowrap text-neutral-300">{lastActive[u.id] ? new Date(lastActive[u.id]).toLocaleString() : '—'}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <button onClick={()=>setOpenUserId(u.id)} className="px-2 py-1 rounded border border-mok-goldDeep/40 hover:border-mok-gold">View</button>
                          <button onClick={()=>deleteUser(u.id, u.name)} className="px-2 py-1 rounded border border-red-500/40 text-red-300 hover:bg-red-500/10">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* User detail modal */}
            {openUserId && (()=>{
              const u = usersState.find(x=>x.id===openUserId)
              if (!u) return null
              const rs = readingsState.filter(r=>r.userId===u.id)
              const gs = guidancesState.filter(g=>g.userId===u.id)
              return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/70" onClick={()=>setOpenUserId(null)} />
                  <div className="relative z-10 w-full max-w-3xl mx-4 rounded-2xl border border-mok-goldDeep/40 bg-mok-black p-4 shadow-xl max-h-[90vh] overflow-y-auto thin-scroll">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="gold-gradient font-semibold text-lg">{u.name}</div>
                        <div className="text-sm text-neutral-400">{u.email || '—'}</div>
                        {u.phoneCode && u.phoneNumber && (
                          <div className="text-sm text-neutral-400">+{u.phoneCode} {u.phoneNumber}</div>
                        )}
                      </div>
                      <button onClick={()=>setOpenUserId(null)} className="px-3 py-1 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold">Close</button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                      <div className="p-3 rounded-lg border border-mok-goldDeep/30 bg-black/30">
                        <div className="text-neutral-400">Role</div>
                        <div>{u.role}</div>
                      </div>
                      <div className="p-3 rounded-lg border border-mok-goldDeep/30 bg-black/30">
                        <div className="text-neutral-400">Created</div>
                        <div>{new Date(u.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="p-3 rounded-lg border border-mok-goldDeep/30 bg-black/30">
                        <div className="text-neutral-400">Last active</div>
                        <div>{lastActive[u.id] ? new Date(lastActive[u.id]).toLocaleString() : '—'}</div>
                      </div>
                      <div className="p-3 rounded-lg border border-mok-goldDeep/30 bg-black/30">
                        <div className="text-neutral-400">Password</div>
                        <div>ဒီစနစ်တွင် စကားဝှက်ကို မျက်နှာဖုံးတင်ထားသော hash ပဲ သိမ်းဆည်းထားပြီး မပြန်လည်မြင်နိုင်ပါ။</div>
                      </div>
                    </div>
                    <UserLimitEditor user={u} onClose={()=>setOpenUserId(null)} />
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <button onClick={()=>setUserDetailTab('readings')} className={`px-3 py-1.5 rounded-md border ${userDetailTab==='readings'?'border-mok-gold bg-black/40':'border-mok-goldDeep/40 hover:border-mok-gold'}`}>Readings ({rs.length})</button>
                        <button onClick={()=>setUserDetailTab('guidance')} className={`px-3 py-1.5 rounded-md border ${userDetailTab==='guidance'?'border-mok-gold bg-black/40':'border-mok-goldDeep/40 hover:border-mok-gold'}`}>Guidance ({gs.length})</button>
                      </div>
                      {userDetailTab==='readings' && (
                        <div className="space-y-2">
                          {rs.map(r => (
                            <button key={r.id} onClick={()=>setOpenReading(r)} className="text-left w-full p-3 rounded-lg border border-mok-goldDeep/30 bg-black/30 hover:border-mok-gold">
                              <div className="flex items-center justify-between text-xs text-neutral-400">
                                <span>{new Date(r.createdAt).toLocaleString()}</span>
                                <span className="px-2 py-0.5 rounded border border-mok-goldDeep/40">{r.category || '—'}</span>
                              </div>
                              <div className="mt-1 text-sm text-neutral-200">{r.question}</div>
                            </button>
                          ))}
                          {rs.length===0 && (
                            <div className="p-3 text-sm text-neutral-400">No readings yet</div>
                          )}
                        </div>
                      )}
                      {userDetailTab==='guidance' && (
                        <div className="space-y-2">
                          {gs.map(g => (
                            <button key={g.id} onClick={()=>setOpenGuidance(g)} className="text-left w-full p-3 rounded-lg border border-mok-goldDeep/30 bg-black/30 hover:border-mok-gold">
                              <div className="flex items-center justify-between text-xs text-neutral-400">
                                <span>{new Date(g.createdAt).toLocaleString()}</span>
                                <span className="px-2 py-0.5 rounded border border-mok-goldDeep/40">{g.religion}</span>
                              </div>
                              <div className="mt-1 text-sm text-neutral-200">{g.question}</div>
                            </button>
                          ))}
                          {gs.length===0 && (
                            <div className="p-3 text-sm text-neutral-400">No guidance yet</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}
          </section>
        )}

        {tab === 'readings' && (
          <section>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <input value={rQuery} onChange={e=>setRQuery(e.target.value)} placeholder="Search question, name, email or phone" className="h-9 w-80 max-w-full rounded-md bg-black/40 border border-mok-goldDeep/40 px-3 outline-none" />
              <select value={rSort} onChange={e=>setRSort(e.target.value as any)} className="h-9 rounded-md bg-black/40 border border-mok-goldDeep/40 px-2">
                <option value="recent">Recent first</option>
                <option value="oldest">Oldest first</option>
                <option value="longest">Longest answer</option>
                <option value="shortest">Shortest answer</option>
              </select>
              <div className="flex items-center gap-1 text-xs">
                {CATEGORIES.map(c => (
                  <label key={c} className={`px-2 py-1 rounded-md border cursor-pointer ${rCats.includes(c)?'border-mok-gold bg-black/40':'border-mok-goldDeep/30 hover:border-mok-gold/50'}`}>
                    <input type="checkbox" className="mr-1 align-middle" checked={rCats.includes(c)} onChange={(e)=>{
                      setRCats(prev => e.target.checked ? [...prev, c] : prev.filter(x=>x!==c))
                    }} />{c}
                  </label>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto border border-mok-goldDeep/30 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-mok-smoke/60">
                  <tr>
                    <th className="p-2 text-left">When</th>
                    <th className="p-2 text-left">User</th>
                    <th className="p-2 text-left">Contact</th>
                    <th className="p-2 text-left">Category</th>
                    <th className="p-2 text-left">Question</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReadings.map(r => (
                    <tr key={r.id} onClick={()=>setOpenReading(r)} className="border-t border-mok-goldDeep/20 align-top hover:bg-black/30 cursor-pointer">
                      <td className="p-2 whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</td>
                      <td className="p-2 whitespace-nowrap">{r.user?.name || '—'}</td>
                      <td className="p-2 whitespace-nowrap">{r.user?.email || (r.user?.phoneCode && r.user?.phoneNumber ? `+${r.user.phoneCode} ${r.user.phoneNumber}` : '—')}</td>
                      <td className="p-2"><span className="inline-block px-2 py-0.5 rounded border border-mok-goldDeep/40 text-xs">{r.category || '—'}</span></td>
                      <td className="p-2 max-w-[520px]"><div className="line-clamp-3 text-neutral-200">{r.question}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === 'guidance' && (
          <section>
            <div className="overflow-x-auto border border-mok-goldDeep/30 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-mok-smoke/60">
                  <tr>
                    <th className="p-2 text-left">When</th>
                    <th className="p-2 text-left">User</th>
                    <th className="p-2 text-left">Contact</th>
                    <th className="p-2 text-left">Religion</th>
                    <th className="p-2 text-left">Question</th>
                  </tr>
                </thead>
                <tbody>
                  {guidancesState.map(g => (
                    <tr key={g.id} onClick={()=>setOpenGuidance(g)} className="border-t border-mok-goldDeep/20 align-top hover:bg-black/30 cursor-pointer">
                      <td className="p-2 whitespace-nowrap">{new Date(g.createdAt).toLocaleString()}</td>
                      <td className="p-2 whitespace-nowrap">{g.user?.name || '—'}</td>
                      <td className="p-2 whitespace-nowrap">{g.user?.email || (g.user?.phoneCode && g.user?.phoneNumber ? `+${g.user.phoneCode} ${g.user.phoneNumber}` : '—')}</td>
                      <td className="p-2"><span className="inline-block px-2 py-0.5 rounded border border-mok-goldDeep/40 text-xs">{g.religion}</span></td>
                      <td className="p-2 max-w-[520px]"><div className="line-clamp-3 text-neutral-200">{g.question}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === 'gooddeeds' && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={gdQuery}
                onChange={e => setGdQuery(e.target.value)}
                placeholder="Search note, feedback or user"
                className="h-9 w-72 max-w-full rounded-md bg-black/40 border border-mok-goldDeep/40 px-3 outline-none"
              />
              <select value={gdBeliefFilter} onChange={e => setGdBeliefFilter(e.target.value as any)} className="h-9 rounded-md bg-black/40 border border-mok-goldDeep/40 px-2">
                <option value="all">All beliefs</option>
                {BELIEF_OPTIONS.map(belief => (
                  <option key={belief} value={belief}>{belief}</option>
                ))}
              </select>
              <select value={gdCategoryFilter} onChange={e => setGdCategoryFilter(e.target.value as any)} className="h-9 rounded-md bg-black/40 border border-mok-goldDeep/40 px-2">
                <option value="all">All categories</option>
                {GOOD_DEED_CATEGORIES.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <select value={gdLangFilter} onChange={e => setGdLangFilter(e.target.value as any)} className="h-9 rounded-md bg-black/40 border border-mok-goldDeep/40 px-2">
                <option value="all">All languages</option>
                <option value="my">Myanmar</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="text-xs text-neutral-400">
              Total entries: <span className="text-mok-gold">{goodDeedsState.length}</span>
              {filteredGoodDeeds.length !== goodDeedsState.length && (
                <> · Showing: <span className="text-mok-gold">{filteredGoodDeeds.length}</span></>
              )}
            </div>
            <div className="overflow-x-auto border border-mok-goldDeep/30 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-mok-smoke/60 text-xs uppercase tracking-widest">
                  <tr>
                    <th className="p-2 text-left w-12">No.</th>
                    <th className="p-2 text-left min-w-[140px]">Deed date</th>
                    <th className="p-2 text-left min-w-[160px]">User</th>
                    <th className="p-2 text-left min-w-[200px]">Good deed</th>
                    <th className="p-2 text-left min-w-[140px]">Categories</th>
                    <th className="p-2 text-left">Belief</th>
                    <th className="p-2 text-left">Language</th>
                    <th className="p-2 text-center w-20">Points</th>
                    <th className="p-2 text-left w-28">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGoodDeeds.map((deed, idx) => {
                    const user = deed.user
                    return (
                      <tr key={deed.id} className="border-t border-mok-goldDeep/20 align-top">
                        <td className="p-2 text-xs text-neutral-400">{idx + 1}</td>
                        <td className="p-2 text-sm text-neutral-300">
                          <div>{new Date(deed.deedDate).toLocaleDateString()}</div>
                          <div className="text-xs text-neutral-500">{new Date(deed.deedDate).toLocaleTimeString()}</div>
                        </td>
                        <td className="p-2 text-sm text-neutral-200">
                          <div>{user?.name || '—'}</div>
                          <div className="text-xs text-neutral-400">{user?.email || '—'}</div>
                          {user?.phoneCode && user.phoneNumber && (
                            <div className="text-xs text-neutral-400">+{user.phoneCode} {user.phoneNumber}</div>
                          )}
                        </td>
                        <td className="p-2 whitespace-pre-line text-neutral-100">{deed.note}</td>
                        <td className="p-2 text-xs text-neutral-300">{deed.categories.join(', ') || '—'}</td>
                        <td className="p-2 text-xs text-neutral-300">{deed.belief}</td>
                        <td className="p-2 text-xs text-neutral-300 uppercase">{deed.language}</td>
                        <td className="p-2 text-center font-semibold text-mok-gold">{deed.points}</td>
                        <td className="p-2">
                          <button
                            onClick={() => setOpenGoodDeed(deed)}
                            className="px-3 py-1 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold text-xs text-neutral-100"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredGoodDeeds.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-4 text-center text-sm text-neutral-400">No records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {openGoodDeed && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/70" onClick={() => setOpenGoodDeed(null)} />
                <div className="relative z-10 w-full max-w-3xl rounded-2xl border border-mok-goldDeep/40 bg-mok-black p-5 shadow-xl max-h-[90vh] overflow-y-auto thin-scroll">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-mok-gold">Good deed detail</h3>
                      <p className="text-xs text-neutral-400">
                        {new Date(openGoodDeed.deedDate).toLocaleString()} · Points:{' '}
                        <span className="text-mok-gold font-semibold">{openGoodDeed.points}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => setOpenGoodDeed(null)}
                      className="px-3 py-1 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold"
                    >
                      Close
                    </button>
                  </div>
                  <div className="space-y-3 text-sm text-neutral-200">
                    <div>
                      <div className="text-neutral-400 text-xs uppercase">User</div>
                      <div>{openGoodDeed.user?.name || '—'}</div>
                      {openGoodDeed.user?.email && <div className="text-neutral-400 text-xs">{openGoodDeed.user.email}</div>}
                    </div>
                    <div>
                      <div className="text-neutral-400 text-xs uppercase">Categories</div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {openGoodDeed.categories.map(cat => (
                          <span key={cat} className="rounded-full border border-mok-goldDeep/40 px-3 py-0.5">{cat}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral-400 text-xs uppercase">Belief / Language</div>
                      <div>{openGoodDeed.belief} · {openGoodDeed.language.toUpperCase()}</div>
                    </div>
                    <div>
                      <div className="text-neutral-400 text-xs uppercase">Good deed</div>
                      <p className="whitespace-pre-line text-neutral-100">{openGoodDeed.note}</p>
                    </div>
                    <div>
                      <div className="text-neutral-400 text-xs uppercase">AI feedback</div>
                      <p className="whitespace-pre-line text-neutral-100">{openGoodDeed.aiFeedback}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {tab === 'natal' && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={nQuery}
                onChange={e => setNQuery(e.target.value)}
                placeholder="Search user, email, phone, or label"
                className="h-9 w-72 max-w-full rounded-md bg-black/40 border border-mok-goldDeep/40 px-3 outline-none"
              />
              <select
                value={nContextFilter}
                onChange={e => setNContextFilter(e.target.value as any)}
                className="h-9 rounded-md bg-black/40 border border-mok-goldDeep/40 px-2"
              >
                <option value="all">All contexts</option>
                <option value="self">Self</option>
                <option value="other">Other</option>
                <option value="couple">Couple</option>
              </select>
              <select
                value={nPhaseFilter}
                onChange={e => setNPhaseFilter(e.target.value as any)}
                className="h-9 rounded-md bg-black/40 border border-mok-goldDeep/40 px-2"
              >
                <option value="all">Any phase</option>
                <option value="planets">Planets</option>
                <option value="houses">Houses</option>
                <option value="combined">Couple summary</option>
              </select>
              <select
                value={nLangFilter}
                onChange={e => setNLangFilter(e.target.value as any)}
                className="h-9 rounded-md bg-black/40 border border-mok-goldDeep/40 px-2"
              >
                <option value="all">All languages</option>
                <option value="my">မြန်မာ</option>
                <option value="en">English</option>
              </select>
              <select
                value={nStatusFilter}
                onChange={e => setNStatusFilter(e.target.value as any)}
                className="h-9 rounded-md bg-black/40 border border-mok-goldDeep/40 px-2"
              >
                <option value="all">Any status</option>
                <option value="success">Success</option>
                <option value="pending">Pending</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div className="text-xs text-neutral-400">
              Total records: <span className="text-mok-gold">{natalState.length}</span>
              {filteredNatalRecords.length !== natalState.length && (
                <> · Showing: <span className="text-mok-gold">{filteredNatalRecords.length}</span></>
              )}
            </div>
            <div className="overflow-x-auto border border-mok-goldDeep/30 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-mok-smoke/60">
                  <tr>
                    <th className="p-2 text-left">When</th>
                    <th className="p-2 text-left">User</th>
                    <th className="p-2 text-left">Contact</th>
                    <th className="p-2 text-left">Context</th>
                    <th className="p-2 text-left">Phase</th>
                    <th className="p-2 text-left">Language</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Label</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNatalRecords.map(record => (
                    <tr
                      key={record.id}
                      onClick={() => setOpenNatalRecord(record)}
                      className="border-t border-mok-goldDeep/20 align-top hover:bg-black/30 cursor-pointer"
                    >
                      <td className="p-2 whitespace-nowrap">{new Date(record.createdAt).toLocaleString()}</td>
                      <td className="p-2 whitespace-nowrap">{record.user?.name || '—'}</td>
                      <td className="p-2 whitespace-nowrap">
                        {record.user?.email ||
                          (record.user?.phoneCode && record.user?.phoneNumber
                            ? `+${record.user.phoneCode} ${record.user.phoneNumber}`
                            : '—')}
                      </td>
                      <td className="p-2">
                        <span className="inline-block rounded border border-mok-goldDeep/40 px-2 py-0.5 text-xs capitalize">
                          {record.context}
                        </span>
                      </td>
                      <td className="p-2 whitespace-nowrap">{getNatalPhaseLabel(record)}</td>
                      <td className="p-2 whitespace-nowrap">{record.language === 'en' ? 'English' : 'မြန်မာ'}</td>
                      <td className="p-2">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${natalStatusClass(record.status)}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="p-2">
                        <div className="line-clamp-2 text-neutral-300">
                          {typeof record.request?.label === 'string' ? record.request.label : '—'}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredNatalRecords.length === 0 && (
                    <tr>
                      <td className="p-3 text-neutral-400" colSpan={7}>
                        No natal records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === 'zodiac' && (
          <section>
            <ZodiacAdmin />
          </section>
        )}

        {tab === 'visual' && (
          <section className="space-y-4">
            <div className="rounded-3xl border border-mok-goldDeep/40 bg-black/30 p-4 space-y-4">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <label className="text-sm">
                  <div className="mb-1 text-neutral-400">Metric</div>
                  <select value={visualMetric} onChange={e=>setVisualMetric(e.target.value as VisualMetric)} className="w-full rounded-md border border-mok-goldDeep/40 bg-black/40 px-3 py-2">
                    {VISUAL_METRIC_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <div className="mb-1 text-neutral-400">View by</div>
                  <select value={viewMode} onChange={e=>setViewMode(e.target.value as any)} className="w-full rounded-md border border-mok-goldDeep/40 bg-black/40 px-3 py-2">
                    <option value="year">Years</option>
                    <option value="month">Months</option>
                    <option value="day">Days</option>
                    <option value="hour">Hours</option>
                  </select>
                </label>
                {viewMode === 'year' && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <label>
                      <div className="mb-1 text-neutral-400">Start year</div>
                      <input type="number" value={yearRangeStart} onChange={e=>setYearRangeStart(Number(e.target.value) || currentYear)} className="w-full rounded-md border border-mok-goldDeep/40 bg-black/40 px-3 py-2" />
                    </label>
                    <label>
                      <div className="mb-1 text-neutral-400">End year</div>
                      <input type="number" value={yearRangeEnd} onChange={e=>setYearRangeEnd(Number(e.target.value) || currentYear)} className="w-full rounded-md border border-mok-goldDeep/40 bg-black/40 px-3 py-2" />
                    </label>
                  </div>
                )}
                {viewMode === 'month' && (
                  <label className="text-sm">
                    <div className="mb-1 text-neutral-400">Year</div>
                    <input type="number" value={monthYear} onChange={e=>setMonthYear(Number(e.target.value) || currentYear)} className="w-full rounded-md border border-mok-goldDeep/40 bg-black/40 px-3 py-2" />
                  </label>
                )}
                {viewMode === 'day' && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <label>
                      <div className="mb-1 text-neutral-400">Year</div>
                      <input type="number" value={dayYear} onChange={e=>setDayYear(Number(e.target.value) || currentYear)} className="w-full rounded-md border border-mok-goldDeep/40 bg-black/40 px-3 py-2" />
                    </label>
                    <label>
                      <div className="mb-1 text-neutral-400">Month</div>
                      <select value={dayMonth} onChange={e=>setDayMonth(Number(e.target.value))} className="w-full rounded-md border border-mok-goldDeep/40 bg-black/40 px-3 py-2">
                        {MONTH_NAMES.map((name, idx) => (
                          <option key={name} value={idx + 1}>{name}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
                {viewMode === 'hour' && (
                  <label className="text-sm">
                    <div className="mb-1 text-neutral-400">Date</div>
                    <input type="date" value={specificDate} onChange={e=>setSpecificDate(e.target.value)} className="w-full rounded-md border border-mok-goldDeep/40 bg-black/40 px-3 py-2" />
                  </label>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Range</p>
                    <p className="text-sm text-neutral-200">{analyticsRange.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Total</p>
                    <p className="text-xl font-semibold text-mok-gold">{analyticsTotal.toLocaleString()}</p>
                  </div>
                </div>
                <div className="relative h-80">
                  {analyticsLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <div className="spinner size-8 border-2 border-mok-gold/50 border-t-transparent rounded-full" aria-label="loading" />
                    </div>
                  ) : analyticsBuckets.length ? (
                    <Line data={analyticsChartData} options={analyticsChartOptions} />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                      {analyticsError || 'No data for this range.'}
                    </div>
                  )}
                </div>
              </div>

              {analyticsError && !analyticsLoading && (
                <p className="text-sm text-red-400">{analyticsError}</p>
              )}

              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-black/40 text-xs uppercase tracking-[0.2em] text-neutral-400">
                    <tr>
                      <th className="p-2 text-left">Bucket</th>
                      <th className="p-2 text-right">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsBuckets.map((bucket, idx) => (
                      <tr key={`${bucket.label}-${idx}`} className="border-t border-white/5">
                        <td className="p-2">{bucket.label}</td>
                        <td className="p-2 text-right font-semibold text-mok-gold">{bucket.count.toLocaleString()}</td>
                      </tr>
                    ))}
                    {analyticsBuckets.length === 0 && !analyticsLoading && (
                      <tr>
                        <td colSpan={2} className="p-3 text-center text-sm text-neutral-500">No data points</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Reading detail modal */}
        {openReading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70" onClick={()=>setOpenReading(null)} />
            <div className="relative z-10 w-full max-w-3xl mx-4 rounded-2xl border border-mok-goldDeep/40 bg-mok-black p-4 shadow-xl max-h-[90vh] overflow-y-auto thin-scroll">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="gold-gradient font-semibold">Reading Detail</div>
                  <div className="text-xs text-neutral-400">{new Date(openReading.createdAt).toLocaleString()} {openReading.category ? `· ${openReading.category}` : ''}</div>
                </div>
                <button onClick={()=>setOpenReading(null)} className="px-3 py-1 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold">Close</button>
              </div>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-mok-goldDeep/30 bg-black/30">
                  <div className="text-neutral-400 text-sm mb-1">User</div>
                  <div className="text-sm">{openReading.user?.name || '—'} <span className="text-neutral-400">({openReading.user?.email || (openReading.user?.phoneCode && openReading.user?.phoneNumber ? `+${openReading.user.phoneCode} ${openReading.user.phoneNumber}` : '—')})</span></div>
                </div>
                <div className="p-3 rounded-lg border border-mok-goldDeep/30 bg-black/30">
                  <div className="text-neutral-400 text-sm mb-1">Question</div>
                  <div>{openReading.question}</div>
                </div>
                {openReading.cards && (
                  <div className="p-3 rounded-lg border border-mok-goldDeep/30 bg-black/30">
                    <div className="text-neutral-400 text-sm mb-1">Cards</div>
                    <div className="text-sm">{Array.isArray(openReading.cards) ? openReading.cards.map((c:any)=> typeof c === 'string' ? c : (c?.name||'')).filter(Boolean).join(', ') : '—'}</div>
                  </div>
                )}
                <div className="p-3 rounded-lg border border-mok-goldDeep/30 bg-black/30">
                  <div className="text-neutral-400 text-sm mb-1">Answer</div>
                  <div className="whitespace-pre-wrap leading-7">{openReading.answer}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Guidance detail modal */}
        {openGuidance && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70" onClick={()=>setOpenGuidance(null)} />
            <div className="relative z-10 w-full max-w-3xl mx-4 rounded-2xl border border-mok-goldDeep/40 bg-mok-black p-4 shadow-xl max-h-[90vh] overflow-y-auto thin-scroll">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="gold-gradient font-semibold">Guidance Detail</div>
                  <div className="text-xs text-neutral-400">{new Date(openGuidance.createdAt).toLocaleString()} · {openGuidance.religion}</div>
                </div>
                <button onClick={()=>setOpenGuidance(null)} className="px-3 py-1 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold">Close</button>
              </div>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-mok-goldDeep/30 bg-black/30">
                  <div className="text-neutral-400 text-sm mb-1">User</div>
                  <div className="text-sm">{openGuidance.user?.name || '—'} <span className="text-neutral-400">({openGuidance.user?.email || (openGuidance.user?.phoneCode && openGuidance.user?.phoneNumber ? `+${openGuidance.user.phoneCode} ${openGuidance.user.phoneNumber}` : '—')})</span></div>
                </div>
                <div className="p-3 rounded-lg border border-mok-goldDeep/30 bg-black/30">
                  <div className="text-neutral-400 text-sm mb-1">Question</div>
                  <div>{openGuidance.question}</div>
                </div>
                <div className="p-3 rounded-lg border border-mok-goldDeep/30 bg-black/30">
                  <div className="text-neutral-400 text-sm mb-1">Answer</div>
                  <div className="whitespace-pre-wrap leading-7">{openGuidance.answer}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Natal record modal */}
        {openNatalRecord && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
            <div className="absolute inset-0 bg-black/70" onClick={()=>setOpenNatalRecord(null)} />
            <div className="relative z-10 w-full max-w-4xl mx-4 rounded-2xl border border-mok-goldDeep/40 bg-mok-black p-5 shadow-xl max-h-[92vh] overflow-y-auto thin-scroll">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="gold-gradient font-semibold">Natal record</div>
                  <div className="text-xs text-neutral-400">
                    {new Date(openNatalRecord.createdAt).toLocaleString()} · {openNatalRecord.context} · {getNatalPhaseLabel(openNatalRecord)} · {openNatalRecord.language === 'en' ? 'English' : 'မြန်မာ'}
                  </div>
                </div>
                <button onClick={()=>setOpenNatalRecord(null)} className="px-3 py-1 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold">Close</button>
              </div>
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-mok-goldDeep/30 bg-black/30 p-3">
                    <div className="text-neutral-400 text-sm mb-1">User</div>
                    <div className="text-sm text-neutral-200">{openNatalRecord.user?.name || '—'}</div>
                    <div className="text-xs text-neutral-400">
                      {openNatalRecord.user?.email ||
                        (openNatalRecord.user?.phoneCode && openNatalRecord.user?.phoneNumber
                          ? `+${openNatalRecord.user.phoneCode} ${openNatalRecord.user.phoneNumber}`
                          : '—')}
                    </div>
                  </div>
                  <div className="rounded-lg border border-mok-goldDeep/30 bg-black/30 p-3">
                    <div className="text-neutral-400 text-sm mb-1">Label / Alias</div>
                    <div className="text-sm text-neutral-200">
                      {typeof openNatalRecord.request?.label === 'string' ? openNatalRecord.request.label : '—'}
                    </div>
                  </div>
                </div>

                <NatalRequestDetails record={openNatalRecord} />

                <div className="rounded-lg border border-mok-goldDeep/30 bg-black/30 p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.3em] text-mok-gold mb-2">
                    AI Topics
                  </div>
                  {openNatalRecord.response?.topics && openNatalRecord.response.topics.length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {openNatalRecord.response.topics.map(topic => (
                        <NatalTopicCard key={`${openNatalRecord.id}-${topic.id}`} topic={topic} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-500">No AI topics stored for this record.</p>
                  )}
                </div>

                <div className="rounded-lg border border-mok-goldDeep/30 bg-black/30 p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.3em] text-mok-gold mb-2">
                    Summary
                  </div>
                  {openNatalRecord.response?.summary ? (
                    <div>
                      <p className="text-sm font-semibold text-white">{openNatalRecord.response.summary.title}</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-200">
                        {openNatalRecord.response.summary.message}
                      </p>
                      {openNatalRecord.response.summary.keywords && openNatalRecord.response.summary.keywords.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-mok-gold">
                          {openNatalRecord.response.summary.keywords.map((word, idx) => (
                            <span key={`${openNatalRecord.id}-summary-${idx}`} className="rounded-full border border-mok-gold/50 px-3 py-0.5">
                              {word}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-500">No summary captured for this record.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}

function ReactsButton({ readingId }: { readingId: string }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<any[] | null>(null)
  async function load() {
    setOpen(true); setItems(null)
    try {
      const res = await fetch(`/api/admin/zodiac/${encodeURIComponent(readingId)}/reactions`)
      const data = await res.json().catch(()=>({}))
      if (res.ok) setItems(data.items || [])
    } catch {}
  }
  return (
    <>
      <button onClick={load} className="px-2 py-1 rounded border border-mok-goldDeep/40 hover:border-mok-gold text-xs">Reacts</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={()=>setOpen(false)} />
          <div className="relative z-10 w-full max-w-3xl mx-4 rounded-2xl border border-mok-goldDeep/40 bg-mok-black p-4 shadow-xl max-h-[90vh] overflow-y-auto thin-scroll">
            <div className="flex items-center justify-between mb-3">
              <div className="gold-gradient font-semibold">Reactions</div>
              <button onClick={()=>setOpen(false)} className="px-3 py-1 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold">Close</button>
            </div>
            <div className="overflow-x-auto border border-mok-goldDeep/30 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-mok-smoke/60">
                  <tr>
                    <th className="p-2 text-left">User</th>
                    <th className="p-2 text-left">Contact</th>
                    <th className="p-2 text-left">When</th>
                  </tr>
                </thead>
                <tbody>
                  {(items||[]).map((r:any) => (
                    <tr key={r.id} className="border-t border-mok-goldDeep/20 hover:bg-black/30">
                      <td className="p-2">{r.name || '—'}</td>
                      <td className="p-2">{r.email || (r.phoneCode && r.phoneNumber ? `+${r.phoneCode} ${r.phoneNumber}` : '—')}</td>
                      <td className="p-2 whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                  {(!items || items.length===0) && (
                    <tr><td className="p-3 text-neutral-400" colSpan={3}>No reactions yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ViewsModal({ reading, stats, onClose }: { reading: any, stats: any[] | null, onClose: ()=>void }) {
  const total = (stats||[]).reduce((s, v)=> s + (v.count||0), 0)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl mx-4 rounded-2xl border border-mok-goldDeep/40 bg-mok-black p-4 shadow-xl max-h-[90vh] overflow-y-auto thin-scroll">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="gold-gradient font-semibold">{reading.sign} · Views</div>
            <div className="text-xs text-neutral-400">{new Date(reading.startDate).toLocaleDateString()} – {new Date(reading.endDate).toLocaleDateString()} · Total {total} views</div>
          </div>
          <button onClick={onClose} className="px-3 py-1 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold">Close</button>
        </div>
        <div className="overflow-x-auto border border-mok-goldDeep/30 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-mok-smoke/60">
              <tr>
                <th className="p-2 text-left">User</th>
                <th className="p-2 text-left">Contact</th>
                <th className="p-2 text-left">Count</th>
                <th className="p-2 text-left">Last viewed</th>
              </tr>
            </thead>
            <tbody>
              {(stats||[]).map(v => (
                <tr key={v.id} className="border-t border-mok-goldDeep/20 hover:bg-black/30">
                  <td className="p-2">{v.name || '—'}</td>
                  <td className="p-2">{v.email || (v.phoneCode && v.phoneNumber ? `+${v.phoneCode} ${v.phoneNumber}` : '—')}</td>
                  <td className="p-2">{v.count}</td>
                  <td className="p-2 whitespace-nowrap">{new Date(v.lastViewed).toLocaleString()}</td>
                </tr>
              ))}
              {(!stats || stats.length===0) && (
                <tr><td className="p-3 text-neutral-400" colSpan={4}>No views yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function UserLimitEditor({ user, onClose }: { user: any; onClose: ()=>void }) {
  const [dailyLimit, setDailyLimit] = useState<number | ''>((user.dailyLimit ?? 3) as number)
  const [extraQuota, setExtraQuota] = useState<number | ''>((user.extraQuota ?? 0) as number)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function save() {
    try {
      setSaving(true); setMsg(null)
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyLimit: dailyLimit === '' ? undefined : Number(dailyLimit), extraQuota: extraQuota === '' ? undefined : Number(extraQuota) })
      })
      if (!res.ok) throw new Error('Failed')
      setMsg('Saved')
    } catch {
      setMsg('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-3 rounded-lg border border-mok-goldDeep/30 bg-black/30 mb-4">
      <div className="gold-gradient font-medium mb-2">Limits</div>
      <div className="grid grid-cols-2 gap-3 max-w-xl">
        <label className="text-sm">
          <div className="text-neutral-400 mb-1">Daily limit (default 3)</div>
          <input type="number" min={0} value={dailyLimit} onChange={e=>setDailyLimit(e.target.value===''? '' : Number(e.target.value))} className="h-9 w-full rounded-md bg-black/40 border border-mok-goldDeep/40 px-3" />
        </label>
        <label className="text-sm">
          <div className="text-neutral-400 mb-1">Extra questions pool</div>
          <input type="number" min={0} value={extraQuota} onChange={e=>setExtraQuota(e.target.value===''? '' : Number(e.target.value))} className="h-9 w-full rounded-md bg-black/40 border border-mok-goldDeep/40 px-3" />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button onClick={save} disabled={saving} className="px-3 py-1 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
        {msg && <span className="text-xs text-neutral-400">{msg}</span>}
      </div>
      <p className="mt-2 text-xs text-neutral-400">
        Behavior: User can ask up to daily limit per day. After hitting the daily limit, they may continue up to Extra pool; each extra question consumes 1 from the pool.
      </p>
    </div>
  )
}

function ZodiacAdmin() {
  const [sign, setSign] = useState<string>('ARIES')
  const [start, setStart] = useState<string>('')
  const [end, setEnd] = useState<string>('')
  const startRef = useRef<HTMLInputElement | null>(null)
  const endRef = useRef<HTMLInputElement | null>(null)
  const [fakeReactions, setFakeReactions] = useState<number | ''>('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deck, setDeck] = useState(TAROT_DECK)
  const [selected, setSelected] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [sections, setSections] = useState<{ my: SectionState; en: SectionState }>({
    my: { ...EMPTY_SECTION_STATE },
    en: { ...EMPTY_SECTION_STATE }
  })
  const [sectionLang, setSectionLang] = useState<'my'|'en'>('my')
  const [list, setList] = useState<any[]>([])
  const [statsFor, setStatsFor] = useState<any | null>(null)
  const [stats, setStats] = useState<any[] | null>(null)
  const [showFaces, setShowFaces] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkStart, setBulkStart] = useState('')
  const [bulkEnd, setBulkEnd] = useState('')
  const [bulkSigns, setBulkSigns] = useState<string[]>([...ZODIAC_SIGNS])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkMessage, setBulkMessage] = useState<string | null>(null)
  const bulkAllSelected = bulkSigns.length === ZODIAC_SIGNS.length
  const toggleBulkSign = (value: string) => {
    setBulkSigns(prev => prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value])
  }
  const closeBulkModal = () => {
    setBulkOpen(false)
    setBulkMessage(null)
  }

  useEffect(() => { fetchList() }, [])

  async function fetchList() {
    const res = await fetch('/api/admin/zodiac')
    const data = await res.json().catch(()=>({}))
    if (res.ok) setList(data.readings || [])
  }

  function doShuffle() {
    setSelected([])
    setDeck(shuffleDeck(3))
    setShowFaces(false)
  }
  function togglePick(i: number) {
    setSelected(prev => prev.includes(i) ? prev.filter(x=>x!==i) : (prev.length<3 ? [...prev, i] : prev))
    setShowFaces(false)
  }
  const chosen = selected.map(i=>deck[i]).filter(Boolean)
  const updateSectionField = (lang: 'my'|'en', key: SectionKey, value: string) => {
    setSections(prev => ({
      ...prev,
      [lang]: { ...prev[lang], [key]: value }
    }))
  }

  async function generate() {
    if (!sign || !start || !end || chosen.length !== 3) return
    setLoading(true)
    const cards = chosen.map(c=>c.name)
    const res = await fetch('/api/admin/zodiac/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sign, startDate: start, endDate: end, cards }) })
    const data = await res.json().catch(()=>({}))
    setLoading(false)
    if (res.ok) {
      if (data.sections && data.sections.my && data.sections.en) {
        setSections({
          my: { ...EMPTY_SECTION_STATE, ...data.sections.my },
          en: { ...EMPTY_SECTION_STATE, ...data.sections.en }
        })
      } else if (data.sections) {
        setSections({
          my: { ...EMPTY_SECTION_STATE, ...(data.sections.my || data.sections || {}) },
          en: { ...EMPTY_SECTION_STATE, ...(data.sections.en || {}) }
        })
      } else if (data.raw) {
        setSections({
          my: { ...EMPTY_SECTION_STATE, general: data.raw },
          en: { ...EMPTY_SECTION_STATE }
        })
      }
      setShowFaces(true)
    } else {
      alert(data.error || 'Failed to generate')
    }
  }

  async function save() {
    const payload = {
      sign,
      startDate: start,
      endDate: end,
      cards: chosen.map(c=>c.name),
      general: sections.my.general,
      relationship: sections.my.relationship,
      workMoney: sections.my.workMoney,
      health: sections.my.health,
      education: sections.my.education,
      warnings: sections.my.warnings,
      generalEn: sections.en.general,
      relationshipEn: sections.en.relationship,
      workMoneyEn: sections.en.workMoney,
      healthEn: sections.en.health,
      educationEn: sections.en.education,
      warningsEn: sections.en.warnings
    }
    const body = fakeReactions === '' ? payload : { ...payload, fakeReactions: Number(fakeReactions) }
    if (editingId) {
      const res = await fetch(`/api/admin/zodiac/${encodeURIComponent(editingId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json().catch(()=>({}))
      if (res.ok) {
        setList(prev => prev.map(x => x.id === editingId ? data.reading : x))
        alert('Updated')
      } else {
        alert(data.error || 'Update failed')
      }
    } else {
      const res = await fetch('/api/admin/zodiac', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json().catch(()=>({}))
      if (res.ok) {
        setList(prev => [data.reading, ...prev])
        alert('Saved')
      } else {
        alert(data.error || 'Save failed')
      }
    }
  }

  async function openStats(z: any) {
    setStatsFor(z); setStats(null)
    try {
      const res = await fetch(`/api/admin/zodiac/${encodeURIComponent(z.id)}/views`)
      const data = await res.json().catch(()=>({}))
      if (res.ok) setStats(data.views || [])
    } catch {}
  }

  function load(row: any) {
    setSign(row.sign)
    setStart(row.startDate?.slice(0,10) || '')
    setEnd(row.endDate?.slice(0,10) || '')
    setSections({
      my: {
        general: row.general || '',
        relationship: row.relationship || '',
        workMoney: row.workMoney || '',
        health: row.health || '',
        education: row.education || '',
        warnings: row.warnings || ''
      },
      en: {
        general: row.generalEn || '',
        relationship: row.relationshipEn || '',
        workMoney: row.workMoneyEn || '',
        health: row.healthEn || '',
        education: row.educationEn || '',
        warnings: row.warningsEn || ''
      }
    })
    setSectionLang('my')
    setFakeReactions(typeof row.fakeReactions === 'number' ? row.fakeReactions : '')
    setEditingId(row.id || null)
    const names: string[] = Array.isArray(row.cards) ? row.cards.map((x:any)=> typeof x==='string' ? x : x?.name) : []
    const idxs: number[] = []
    names.forEach(n => {
      const i = deck.findIndex(c => c.name.toLowerCase() === String(n||'').toLowerCase())
      if (i >= 0) idxs.push(i)
    })
    setSelected(idxs.slice(0,3))
  }

  function resetForm() {
    setSign('ARIES')
    setStart('')
    setEnd('')
    setSections({ my: { ...EMPTY_SECTION_STATE }, en: { ...EMPTY_SECTION_STATE } })
    setSectionLang('my')
    setSelected([])
    setShowFaces(false)
    setFakeReactions('')
    setEditingId(null)
  }

  async function handleBulkGenerate() {
    if (!bulkStart || !bulkEnd) {
      setBulkMessage('Please choose a start and end date.')
      return
    }
    if (!bulkSigns.length) {
      setBulkMessage('Select at least one zodiac sign.')
      return
    }
    setBulkLoading(true)
    setBulkMessage(null)
    try {
      const res = await fetch('/api/admin/zodiac/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signs: bulkSigns, startDate: bulkStart, endDate: bulkEnd })
      })
      const data = await res.json().catch(()=>({}))
      if (res.ok) {
        const newReadings = data.readings || []
        if (newReadings.length) {
          setList(prev => [...newReadings, ...prev])
        }
        const fails = data.failures?.length ? ` (failed: ${data.failures.length})` : ''
        setBulkMessage(`Generated ${newReadings.length} readings${fails}.`)
      } else {
        setBulkMessage(data.error || 'Bulk generation failed.')
      }
    } catch {
      setBulkMessage('Bulk generation failed.')
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="gold-gradient text-lg font-semibold">Zodiac</div>
        <button
          type="button"
          onClick={() => setBulkOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-mok-gold/50 px-4 py-1.5 text-xs font-semibold text-mok-gold hover:border-mok-gold"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14m-7-7h14"/>
          </svg>
          Bulk auto-generate
        </button>
      </div>
      <div className="grid md:grid-cols-[1.1fr_1fr] gap-4 items-start">
        <div className="p-3 rounded-xl border border-mok-goldDeep/30 bg-black/30">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm">
              <div className="text-neutral-400 mb-1">Sign</div>
              <select value={sign} onChange={e=>setSign(e.target.value)} className="h-10 w-full rounded-md bg-black/40 border border-mok-goldDeep/40 px-2">
                {['ARIES','TAURUS','GEMINI','CANCER','LEO','VIRGO','LIBRA','SCORPIO','SAGITTARIUS','CAPRICORN','AQUARIUS','PISCES'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm">
                <div className="text-neutral-400 mb-1">Start</div>
                <div className="relative">
                  <input
                    ref={startRef}
                    type="date"
                    value={start}
                    onChange={e=>setStart(e.target.value)}
                    className="h-10 w-full rounded-md bg-black/40 border border-mok-goldDeep/40 pl-3 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const el = startRef.current
                      if (!el) return
                      try { (el as any).showPicker?.() } catch {}
                      el.focus()
                    }}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-7 w-7 rounded-md border border-transparent hover:border-mok-goldDeep/40 text-neutral-300 hover:text-mok-gold bg-transparent"
                    aria-label="Open start date picker"
                    title="Open calendar"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <rect x="3" y="5" width="18" height="16" rx="2" ry="2"/>
                      <path d="M16 3v4M8 3v4M3 11h18"/>
                    </svg>
                  </button>
                </div>
              </label>
              <label className="text-sm">
                <div className="text-neutral-400 mb-1">End</div>
                <div className="relative">
                  <input
                    ref={endRef}
                    type="date"
                    value={end}
                    onChange={e=>setEnd(e.target.value)}
                    className="h-10 w-full rounded-md bg-black/40 border border-mok-goldDeep/40 pl-3 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const el = endRef.current
                      if (!el) return
                      try { (el as any).showPicker?.() } catch {}
                      el.focus()
                    }}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-7 w-7 rounded-md border border-transparent hover:border-mok-goldDeep/40 text-neutral-300 hover:text-mok-gold bg-transparent"
                    aria-label="Open end date picker"
                    title="Open calendar"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <rect x="3" y="5" width="18" height="16" rx="2" ry="2"/>
                      <path d="M16 3v4M8 3v4M3 11h18"/>
                    </svg>
                  </button>
                </div>
              </label>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-mok-goldLight">ရွေးချယ်မည့် ကတ်များ</div>
              <button onClick={doShuffle} className="px-3 py-1 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold">Shuffle</button>
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
              {deck.map((c, idx) => (
                <button key={c.id} type="button" onClick={()=>togglePick(idx)} className={`relative aspect-[3/5] rounded-md overflow-hidden border ${selected.includes(idx) ? 'border-mok-gold ring-2 ring-mok-gold/40' : 'border-mok-goldDeep/30 hover:border-mok-gold/50'}`}>
                  <Image src={CARD_BACK_SRC} alt="card back" fill className="object-cover" />
                </button>
              ))}
            </div>
            <div className="mt-2 text-xs text-neutral-400">Selected: {chosen.map(c=>c.name).join(', ') || '—'}</div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button onClick={generate} disabled={loading || !sign || !start || !end || chosen.length!==3} className="px-3 py-2 rounded-md bg-gold-linear text-black disabled:opacity-60">{loading ? 'Generating…' : 'Generate Answer'}</button>
            <button onClick={save} className="px-3 py-2 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold">{editingId ? 'Update' : 'Save'}</button>
            {editingId && (
              <button onClick={resetForm} type="button" className="px-3 py-2 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold/80 text-neutral-300">New</button>
            )}
          </div>

          {showFaces && chosen.length === 3 && (
            <div className="mt-4">
              <div className="text-sm text-mok-goldLight mb-2">ရွေးချယ်ရသည့် ကတ်များ</div>
              <div className="grid grid-cols-3 gap-2">
                {chosen.map((c, i) => (
                  <div key={`${c.id}-${i}`} className="relative aspect-[3/5] rounded-lg overflow-hidden border border-mok-gold/40">
                    <Image src={cardImagePath(c)} alt={c.name} fill className="object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4">
            <div className="mb-3 flex items-center gap-2 text-xs">
              <span className="text-neutral-400">Editing language:</span>
              <button
                type="button"
                onClick={() => setSectionLang('my')}
                className={`px-3 py-1 rounded-full border ${sectionLang === 'my' ? 'border-mok-gold bg-black/40 text-mok-gold' : 'border-transparent text-neutral-300 hover:border-mok-goldDeep/40'}`}
              >
                မြန်မာ
              </button>
              <button
                type="button"
                onClick={() => setSectionLang('en')}
                className={`px-3 py-1 rounded-full border ${sectionLang === 'en' ? 'border-mok-gold bg-black/40 text-mok-gold' : 'border-transparent text-neutral-300 hover:border-mok-goldDeep/40'}`}
              >
                English
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {SECTION_KEYS.map((key) => (
                <label key={key} className="text-sm">
                  <div className="text-neutral-400 mb-1">{SECTION_LABELS[key]}</div>
                  <textarea
                    rows={6}
                    value={sections[sectionLang][key]}
                    onChange={e => updateSectionField(sectionLang, key, e.target.value)}
                    className="w-full rounded-md bg-black/40 border border-mok-goldDeep/40 px-3 py-2"
                  />
                </label>
              ))}
            </div>
          </div>
          <div className="mt-3 grid sm:grid-cols-2 gap-3 max-w-lg">
            <label className="text-sm">
              <div className="text-neutral-400 mb-1">Fake reactions (display boost)</div>
              <input type="number" min={0} value={fakeReactions} onChange={e=>setFakeReactions(e.target.value===''? '' : Number(e.target.value))} className="h-10 w-full rounded-md bg-black/40 border border-mok-goldDeep/40 px-3" />
            </label>
          </div>
        </div>

        <div className="p-3 rounded-xl border border-mok-goldDeep/30 bg-black/30">
          <div className="gold-gradient font-medium mb-2">Latest</div>
          <div className="space-y-2 max-h-[72vh] overflow-y-auto thin-scroll pr-1">
            {list.map((z) => (
              <div key={z.id} className="p-3 rounded-lg border border-mok-goldDeep/30 hover:border-mok-gold/60">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span>{z.sign}</span>
                  <span>{new Date(z.createdAt).toLocaleString()}</span>
                </div>
                <div className="mt-1 text-sm">{new Date(z.startDate).toLocaleDateString()} – {new Date(z.endDate).toLocaleDateString()}</div>
                <div className="mt-1 text-xs text-neutral-400 line-clamp-2">{z.general}</div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-neutral-400">Fake: <span className="text-mok-gold">{z.fakeReactions ?? 0}</span></span>
                  <button onClick={()=>load(z)} className="px-2 py-1 rounded border border-mok-goldDeep/40 hover:border-mok-gold text-xs">Edit</button>
                  <button onClick={()=>openStats(z)} className="px-2 py-1 rounded border border-mok-goldDeep/40 hover:border-mok-gold text-xs">Views</button>
                  <ReactsButton readingId={z.id} />
                </div>
              </div>
            ))}
            {list.length===0 && <div className="text-sm text-neutral-400">No entries</div>}
          </div>
        </div>
      </div>
      {bulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={closeBulkModal} />
          <div className="relative z-10 w-full max-w-3xl mx-4 rounded-2xl border border-mok-goldDeep/40 bg-mok-black p-5 shadow-xl max-h-[90vh] overflow-y-auto thin-scroll space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="gold-gradient text-lg font-semibold">Bulk auto-generate</div>
                <p className="text-xs text-neutral-400 mt-0.5">Select signs and a date range. The system will generate Burmese + English readings with random tarot cards.</p>
              </div>
              <button onClick={closeBulkModal} className="px-3 py-1 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold text-sm">Close</button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-sm">
                <div className="text-neutral-400 mb-1">Start date</div>
                <input
                  type="date"
                  value={bulkStart}
                  onChange={e=>setBulkStart(e.target.value)}
                  className="h-10 w-full rounded-md bg-black/40 border border-mok-goldDeep/40 px-3"
                />
              </label>
              <label className="text-sm">
                <div className="text-neutral-400 mb-1">End date</div>
                <input
                  type="date"
                  value={bulkEnd}
                  onChange={e=>setBulkEnd(e.target.value)}
                  className="h-10 w-full rounded-md bg-black/40 border border-mok-goldDeep/40 px-3"
                />
              </label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2 text-sm text-neutral-400">
                <span>Select zodiac signs</span>
                <button
                  type="button"
                  onClick={() => setBulkSigns(bulkAllSelected ? [] : [...ZODIAC_SIGNS])}
                  className="text-mok-gold hover:underline"
                >
                  {bulkAllSelected ? 'Clear all' : 'Select all'}
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                {ZODIAC_SIGNS.map(sign => (
                  <label
                    key={sign}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${bulkSigns.includes(sign) ? 'border-mok-gold bg-black/40' : 'border-mok-goldDeep/30 hover:border-mok-gold/50'}`}
                  >
                    <input
                      type="checkbox"
                      className="rounded border-mok-goldDeep/40 text-mok-gold focus:ring-mok-gold"
                      checked={bulkSigns.includes(sign)}
                      onChange={() => toggleBulkSign(sign)}
                    />
                    <span className="font-semibold">{sign}</span>
                  </label>
                ))}
              </div>
            </div>

            {bulkMessage && (
              <div className="text-sm text-neutral-300 bg-black/30 border border-mok-goldDeep/30 rounded-lg p-3">
                {bulkMessage}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkGenerate}
                disabled={bulkLoading}
                className="px-3 py-2 rounded-md bg-gold-linear text-black font-semibold disabled:opacity-60"
              >
                {bulkLoading ? 'Generating…' : 'Generate readings'}
              </button>
              <button onClick={closeBulkModal} className="px-3 py-2 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {statsFor && (
        <ViewsModal reading={statsFor} stats={stats} onClose={()=>{ setStatsFor(null); setStats(null) }} />
      )}
    </div>
  )
}

function NatalRequestDetails({ record }: { record: NatalRecord }) {
  const { request } = record
  if (!request) return null
  if (record.context === 'couple') {
    const partners = Array.isArray(request.partners) ? request.partners : []
    if (!partners.length) return null
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {partners.map((partner: any, idx: number) => {
          const meta = partner?.metadata || {}
          const lat = typeof meta.latitude === 'number' ? meta.latitude.toFixed(2) : meta.latitude
          const lon = typeof meta.longitude === 'number' ? meta.longitude.toFixed(2) : meta.longitude
          const tz = formatOffsetMinutes(meta.timezoneMinutes)
          const label = partner?.label || (idx === 0 ? 'Partner A' : 'Partner B')
          return (
            <div key={`${label}-${idx}`} className="rounded-lg border border-mok-goldDeep/30 bg-black/30 p-3">
              <div className="text-neutral-400 text-xs uppercase tracking-[0.3em] mb-1">
                Partner {idx + 1}
              </div>
              <div className="text-sm font-semibold text-white">{label}</div>
              {partner?.gender && (
                <div className="text-xs text-neutral-400 capitalize mt-0.5">Gender: {partner.gender}</div>
              )}
              <ul className="mt-2 space-y-1 text-xs text-neutral-300">
                <li>
                  Birth: {meta.birthDate || '—'}
                  {meta.birthTime ? ` · ${meta.birthTime}` : ''}
                </li>
                <li>
                  Coords: {lat || '—'}{lat && lon ? ', ' : ''}{lon || ''}
                </li>
                <li>{tz}</li>
                <li>House system: {meta.houseSystem || '—'}</li>
              </ul>
            </div>
          )
        })}
      </div>
    )
  }
  const meta = request.metadata || {}
  const lat = typeof meta.latitude === 'number' ? meta.latitude.toFixed(2) : meta.latitude
  const lon = typeof meta.longitude === 'number' ? meta.longitude.toFixed(2) : meta.longitude
  const tz = formatOffsetMinutes(meta.timezoneMinutes)
  return (
    <div className="rounded-lg border border-mok-goldDeep/30 bg-black/30 p-3">
      <div className="text-neutral-400 text-sm mb-1">Birth details</div>
      <ul className="space-y-1 text-xs text-neutral-300">
        <li>
          Birth: {meta.birthDate || '—'}
          {meta.birthTime ? ` · ${meta.birthTime}` : ''}
        </li>
        <li>
          Coords: {lat || '—'}{lat && lon ? ', ' : ''}{lon || ''}
        </li>
        <li>{tz}</li>
        <li>House system: {meta.houseSystem || '—'}</li>
        {request.gender && <li>Gender: {request.gender}</li>}
      </ul>
    </div>
  )
}

function NatalTopicCard({ topic }: { topic: NatalTopic }) {
  return (
    <article className="rounded-xl border border-mok-goldDeep/30 bg-gradient-to-b from-black/60 to-black/30 p-3">
      <p className="text-[11px] uppercase tracking-[0.3em] text-mok-gold/80">{topic.focus}</p>
      <p className="mt-1 text-base font-semibold text-white">{topic.title}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-200">{topic.message}</p>
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

function formatOffsetMinutes(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'UTC±00:00'
  const sign = value >= 0 ? '+' : '-'
  const abs = Math.abs(value)
  const hours = Math.floor(abs / 60)
  const mins = abs % 60
  return `UTC${sign}${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

const natalStatusClass = (status: 'pending' | 'success' | 'error') => {
  switch (status) {
    case 'success':
      return 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
    case 'error':
      return 'border-red-500/50 text-red-200 bg-red-500/10'
    default:
      return 'border-neutral-500/50 text-neutral-200 bg-black/30'
  }
}

const ZODIAC_SIGNS = ['ARIES','TAURUS','GEMINI','CANCER','LEO','VIRGO','LIBRA','SCORPIO','SAGITTARIUS','CAPRICORN','AQUARIUS','PISCES'] as const
const SECTION_KEYS = ['general','relationship','workMoney','health','education','warnings'] as const
type SectionKey = typeof SECTION_KEYS[number]
type SectionState = Record<SectionKey, string>
const EMPTY_SECTION_STATE: SectionState = {
  general: '',
  relationship: '',
  workMoney: '',
  health: '',
  education: '',
  warnings: ''
}
const SECTION_LABELS: Record<SectionKey, string> = {
  general: 'General overview',
  relationship: 'Relationships',
  workMoney: 'Work & Money',
  health: 'Health & Wellbeing',
  education: 'Education & Growth',
  warnings: 'Warnings & Action steps'
}
