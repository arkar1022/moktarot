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

export default function HistoryPage() {
  const [tab, setTab] = useState<'tarot'|'guidance'>('tarot')
  const [readings, setReadings] = useState<Reading[]>([])
  const [guidances, setGuidances] = useState<Guidance[]>([])
  const [loading, setLoading] = useState(true)

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

  if (loading) return <p>Loading…</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={()=>setTab('tarot')} className={`px-3 py-1.5 rounded-md border ${tab==='tarot'?'border-mok-gold bg-black/40':'border-mok-goldDeep/40 hover:border-mok-gold'}`}>တာရော့ မှတ်တမ်း</button>
        <button onClick={()=>setTab('guidance')} className={`px-3 py-1.5 rounded-md border ${tab==='guidance'?'border-mok-gold bg-black/40':'border-mok-goldDeep/40 hover:border-mok-gold'}`}>၀ိညာဉ် အကြံညဏ်</button>
      </div>

      {tab === 'tarot' && (
        <section className="space-y-3">
          <h2 className="gold-gradient text-lg font-semibold">ယခင် ဖတ်ရှုမှတ်တမ်း</h2>
          {readings.length === 0 && <p className="text-neutral-400">အချက်အလက် မရှိသေးပါ</p>}
          {readings.map(r => (
            <article key={r.id} className="p-4 rounded-xl border border-mok-goldDeep/30 bg-black/40">
              <div className="text-sm text-neutral-400">{new Date(r.createdAt as any).toLocaleString()}</div>
              <div className="mt-2 font-medium">မေးခွန်း: {r.question}</div>
              <div className="mt-1 text-sm text-mok-goldLight">ကတ်များ: {(Array.isArray(r.cards)? r.cards.map((c:any)=> typeof c === 'string' ? c : c.name):[]).join(', ')}</div>
              <p className="mt-3 whitespace-pre-wrap leading-7">{r.answer}</p>
            </article>
          ))}
        </section>
      )}

      {tab === 'guidance' && (
        <section className="space-y-3">
          <h2 className="gold-gradient text-lg font-semibold">၀ိညာဉ် အကြံညဏ် မှတ်တမ်း</h2>
          {guidances.length === 0 && <p className="text-neutral-400">အချက်အလက် မရှိသေးပါ</p>}
          {guidances.map(g => (
            <article key={g.id} className="p-4 rounded-xl border border-mok-goldDeep/30 bg-black/40">
              <div className="text-sm text-neutral-400">{new Date(g.createdAt as any).toLocaleString()}</div>
              <div className="mt-2 font-medium">မေးခွန်း: {g.question}</div>
              <div className="mt-1 text-xs text-neutral-400">ဘာသာ: {g.religion}</div>
              <p className="mt-3 whitespace-pre-wrap leading-7">{g.answer}</p>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}
