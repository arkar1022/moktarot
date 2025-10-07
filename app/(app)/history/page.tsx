'use client'

import { useEffect, useState } from 'react'

type Reading = {
  id: string
  question: string
  answer: string
  cards: string[] | { name: string }[]
  createdAt: string
}

export default function HistoryPage() {
  const [items, setItems] = useState<Reading[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/history')
      const data = await res.json()
      setItems(data.readings || [])
      setLoading(false)
    })()
  }, [])

  if (loading) return <p>Loading…</p>

  return (
    <div className="space-y-4">
      <h2 className="gold-gradient text-lg font-semibold">ယခင် ဖတ်ရှုမှတ်တမ်း</h2>
      {items.length === 0 && <p className="text-neutral-400">အချက်အလက် မရှိသေးပါ</p>}
      {items.map(r => (
        <article key={r.id} className="p-4 rounded-xl border border-mok-goldDeep/30 bg-black/40">
          <div className="text-sm text-neutral-400">{new Date(r.createdAt as any).toLocaleString()}</div>
          <div className="mt-2 font-medium">မေးခွန်း: {r.question}</div>
          <div className="mt-1 text-sm text-mok-goldLight">ကတ်များ: {(Array.isArray(r.cards)? r.cards.map((c:any)=> typeof c === 'string' ? c : c.name):[]).join(', ')}</div>
          <p className="mt-3 whitespace-pre-wrap leading-7">{r.answer}</p>
        </article>
      ))}
    </div>
  )
}

