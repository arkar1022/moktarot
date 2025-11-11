'use client'

import { useEffect, useState } from 'react'

type Reading = {
  id: string
  question: string
  answer: string
  cards: string[] | { name: string }[]
  createdAt: string
}

type Guidance = {
  id: string
  religion: 'BUDDHIST'|'HINDU'|'CHRISTIAN'|'ISLAM'
  question: string
  answer: string
  createdAt: string
}

type Lang = 'my' | 'en'

const COPY = {
  my: {
    tarotTab: 'တာရော့ မှတ်တမ်း',
    guidanceTab: '၀ိညာဉ် အကြံညဏ်',
    tarotTitle: 'ယခင် ဖတ်ရှုမှတ်တမ်း',
    guidanceTitle: '၀ိညာဉ် အကြံညဏ် မှတ်တမ်း',
    empty: 'အချက်အလက် မရှိသေးပါ',
    question: 'မေးခွန်း',
    cards: 'ကတ်များ',
    religion: 'ဘာသာ',
    loading: 'ရွေးစာရင်း ခဏစောင့်ပါ…',
  },
  en: {
    tarotTab: 'Tarot History',
    guidanceTab: 'Spiritual Guidance',
    tarotTitle: 'Previous tarot readings',
    guidanceTitle: 'Guidance history',
    empty: 'No records yet.',
    question: 'Question',
    cards: 'Cards',
    religion: 'Belief',
    loading: 'Loading history…',
  }
} as const

export default function HistoryClient({ initialLang }: { initialLang: Lang }) {
  const [language, setLanguage] = useState<Lang>(initialLang)
  const [tab, setTab] = useState<'tarot'|'guidance'>('tarot')
  const [readings, setReadings] = useState<Reading[]>([])
  const [guidances, setGuidances] = useState<Guidance[]>([])
  const [loading, setLoading] = useState(true)
  const copy = COPY[language]

  useEffect(() => {
    if (typeof document === 'undefined') return
    const html = document.documentElement
    const sync = () => {
      const lang = html.lang === 'en' ? 'en' : 'my'
      setLanguage(prev => (prev === lang ? prev : lang))
    }
    const observer = new MutationObserver(sync)
    observer.observe(html, { attributes: true, attributeFilter: ['lang'] })
    sync()
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    (async () => {
      try {
        const [rRes, gRes] = await Promise.all([
          fetch('/api/history'),
          fetch('/api/guidance/history')
        ])
        const rData = await rRes.json().catch(()=>({}))
        const gData = await gRes.json().catch(()=>({}))
        setReadings(rData.readings || [])
        setGuidances(gData.guidances || [])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <p className="text-sm text-neutral-400">{copy.loading}</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={()=>setTab('tarot')} className={`px-3 py-1.5 rounded-md border ${tab==='tarot'?'border-mok-gold bg-black/40':'border-mok-goldDeep/40 hover:border-mok-gold'}`}>{copy.tarotTab}</button>
        <button onClick={()=>setTab('guidance')} className={`px-3 py-1.5 rounded-md border ${tab==='guidance'?'border-mok-gold bg-black/40':'border-mok-goldDeep/40 hover:border-mok-gold'}`}>{copy.guidanceTab}</button>
      </div>

      {tab === 'tarot' && (
        <section className="space-y-3">
          <h2 className="gold-gradient text-lg font-semibold">{copy.tarotTitle}</h2>
          {readings.length === 0 && <p className="text-neutral-400">{copy.empty}</p>}
          {readings.map(r => (
            <article key={r.id} className="p-4 rounded-xl border border-mok-goldDeep/30 bg-black/40">
              <div className="text-sm text-neutral-400">{new Date(r.createdAt as any).toLocaleString()}</div>
              <div className="mt-2 font-medium">{copy.question}: {r.question}</div>
              <div className="mt-1 text-sm text-mok-goldLight">{copy.cards}: {(Array.isArray(r.cards)? r.cards.map((c:any)=> typeof c === 'string' ? c : c.name):[]).join(', ')}</div>
              <p className="mt-3 whitespace-pre-wrap leading-7">{r.answer}</p>
            </article>
          ))}
        </section>
      )}

      {tab === 'guidance' && (
        <section className="space-y-3">
          <h2 className="gold-gradient text-lg font-semibold">{copy.guidanceTitle}</h2>
          {guidances.length === 0 && <p className="text-neutral-400">{copy.empty}</p>}
          {guidances.map(g => (
            <article key={g.id} className="p-4 rounded-xl border border-mok-goldDeep/30 bg-black/40">
              <div className="text-sm text-neutral-400">{new Date(g.createdAt as any).toLocaleString()}</div>
              <div className="mt-2 font-medium">{copy.question}: {g.question}</div>
              <div className="mt-1 text-xs text-neutral-400">{copy.religion}: {g.religion}</div>
              <p className="mt-3 whitespace-pre-wrap leading-7">{g.answer}</p>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}
