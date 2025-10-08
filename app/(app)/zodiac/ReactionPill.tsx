"use client"

import { useEffect, useState } from 'react'

export default function ReactionPill({ readingId }: { readingId: string }) {
  const [count, setCount] = useState<number | null>(null)
  const [reacted, setReacted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function load() {
    try {
      const res = await fetch(`/api/zodiac/readings/${encodeURIComponent(readingId)}/reactions`, { cache: 'no-store', credentials: 'include' })
      const data = await res.json().catch(()=>({}))
      if (res.ok) { setCount(data.displayCount ?? 0); setReacted(!!data.reacted) }
    } catch {}
  }
  useEffect(() => { load() }, [readingId])

  async function react() {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/zodiac/readings/${encodeURIComponent(readingId)}/react`, { method: 'POST', credentials: 'include' })
      const data = await res.json().catch(()=>({}))
      if (res.ok) { setCount(data.displayCount ?? null); setReacted(true) }
      else if (res.status === 401) { window.location.href = '/' }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={react} disabled={loading || reacted} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${reacted?'border-mok-gold bg-black/40':'border-mok-goldDeep/40 bg-black/30 hover:border-mok-gold'} transition`}>
      <svg viewBox="0 0 24 24" className={`w-4 h-4 ${reacted?'text-mok-gold':'text-neutral-300'}`} aria-hidden="true">
        <path d="M12 21s-6.716-4.35-9.165-8.078C1.28 10.41 2.07 7.5 4.74 6.245 7.41 4.99 9.64 6.68 12 9.25c2.36-2.57 4.59-4.26 7.26-3.005 2.67 1.255 3.46 4.165 1.905 6.677C18.716 16.65 12 21 12 21z" fill="currentColor"/>
      </svg>
      <span className="text-xs text-neutral-300">နှစ်သက်</span>
      <span className="text-sm text-mok-gold font-medium">{count ?? '—'} ယောက်</span>
    </button>
  )
}
