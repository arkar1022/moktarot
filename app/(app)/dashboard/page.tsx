'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { TAROT_DECK, shuffleDeck, CARD_BACK_SRC, cardImagePath } from '@/lib/tarot'

export default function DashboardPage() {
  const [question, setQuestion] = useState('')
  const [shuffleCount, setShuffleCount] = useState(1)
  const [deck, setDeck] = useState(TAROT_DECK)
  const [selected, setSelected] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [revealCount, setRevealCount] = useState(0) // 0..3 progressive reveal in modal
  const [imagesReady, setImagesReady] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [isShuffling, setIsShuffling] = useState(false)
  const [noise, setNoise] = useState<{dx:number,dy:number,rot:number}[]>([])
  const revealTimers = useRef<number[]>([])
  const requestIdRef = useRef(0)
  const [limitModal, setLimitModal] = useState(false)
  const [limitMsg, setLimitMsg] = useState<string>('')
  const [limits, setLimits] = useState<{ remainingToday: number, extraQuota: number } | null>(null)

  async function fetchLimits() {
    try {
      const res = await fetch('/api/user/limits', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setLimits({ remainingToday: data.remainingToday ?? 0, extraQuota: data.extraQuota ?? 0 })
    } catch {}
  }
  // No pre-resolution or variant handling; filenames are authoritative

  const backCards = useMemo(() => deck, [deck])

  // Force show specific trio (The Fool, Ace of Cups, Death) when enabled via env
  const forceTrio = useMemo(() => process.env.NEXT_PUBLIC_FORCE_TRIO === '1', [])
  const forcedNames = ['The Fool', 'Ace of Cups', 'Death']
  const chosenCards = useMemo(() => {
    if (forceTrio) {
      return forcedNames
        .map(n => TAROT_DECK.find(c => c.name === n))
        .filter((x): x is NonNullable<typeof x> => Boolean(x))
    }
    return selected
      .map(i => backCards[i])
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
  }, [forceTrio, selected.join(','), backCards])

  useEffect(() => {
    if (!forceTrio) return
    // Open modal; reveal sequence will handle flips
    setShowModal(true)
    setRevealCount(0)
  }, [forceTrio])

  // When modal opens, preload chosen images and only then start flipping
  useEffect(() => {
    let cancelled = false
    async function preloadAndReveal() {
      if (!showModal) return
      setImagesReady(false)
      setRevealCount(0)
      const srcs = chosenCards.map(c => cardImagePath(c))
      const loaders = srcs.map((src) => new Promise<void>((resolve) => {
        const img = new window.Image()
        img.onload = () => resolve()
        img.onerror = () => resolve() // tolerate error -> will swap to placeholder via onError
        img.src = src
      }))
      // Safety timeout so we don't hang forever on slow networks
      const timeout = new Promise<void>(res => setTimeout(res, 4000))
      await Promise.race([Promise.all(loaders).then(()=>{}), timeout])
      if (cancelled) return
      setImagesReady(true)
      startRevealSequence()
    }
    preloadAndReveal()
    return () => {
      cancelled = true
      revealTimers.current.forEach(id => clearTimeout(id))
      revealTimers.current = []
    }
  }, [showModal, chosenCards.map(c=>c.id).join(',')])

  // No candidate variants; all assets use strict naming in /public/cards as .png

  function doShuffle() {
    setShowModal(false)
    setRevealCount(0)
    setSelected([])
    setResult(null)
    // Build animation noise per card
    const n = backCards.map(() => ({
      dx: Math.round((Math.random() * 40) - 20),
      dy: Math.round((Math.random() * 20) - 10),
      rot: Math.round((Math.random() * 16) - 8),
    }))
    setNoise(n)
    setIsShuffling(true)
    // After animation, actually shuffle the deck
    setTimeout(() => {
      setDeck(shuffleDeck(shuffleCount))
      setIsShuffling(false)
    }, 720)
  }

  function togglePick(index: number) {
    if (selected.includes(index)) {
      setSelected(prev => prev.filter(i => i !== index))
    } else if (selected.length < 3) {
      setSelected(prev => [...prev, index])
    }
  }

  function startRevealSequence() {
    // Clear any previous timers
    revealTimers.current.forEach(id => clearTimeout(id))
    revealTimers.current = []
    setRevealCount(0)
    // Stagger flips: 3 cards
    const delays = [300, 900, 1500]
    delays.forEach((ms, i) => {
      const id = window.setTimeout(() => {
        setRevealCount(prev => Math.max(prev, i + 1))
      }, ms)
      revealTimers.current.push(id)
    })
  }

  function closeModalAndReset() {
    // Cancel reveal timers
    revealTimers.current.forEach(id => clearTimeout(id))
    revealTimers.current = []
    setShowModal(false)
    setImagesReady(false)
    setLimitModal(false)
    setRevealCount(0)
    setResult(null)
    setLoading(false)
    setQuestion('')
    setSelected([])
    // Shuffle the deck once the modal is closed
    // Use same shuffle intensity currently chosen
    setDeck(shuffleDeck(shuffleCount))
  }

  async function revealAndInterpret() {
    try {
      setShowModal(true)
      setRevealCount(0) // actual flip will start after images preload
      setLoading(true)
      const reqId = ++requestIdRef.current
      const cards = forceTrio
        ? forcedNames
        : selected.map(i => backCards[i].name)
      const res = await fetch('/api/tarot/reading', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, selectedCards: cards })})
      const data = await res.json().catch(()=>({}))
      if (res.status === 429) {
        const msg = (data && (data.error || data.message)) || 'ယနေ့အတွက် မေးခွန်း ၃ ကြိမ် ကို အသုံးပြုပြီးဖြစ်ပါသည်။'
        setShowModal(false)
        setLimitMsg(msg)
        setLimitModal(true)
        return
      }
      if (!res.ok) {
        console.error('reading error', data)
        if (requestIdRef.current === reqId) setResult('အခုအချိန်တွင် မပြောလို့ရသေးပါ — ဆက်လက်ကြိုးစားပေးပါ။')
      } else {
        if (requestIdRef.current === reqId) setResult(data.reading?.answer || '')
        // Refresh limits after a successful reading
        fetchLimits()
      }
    } catch (e) {
      console.error(e)
      setResult('အချို့ပြဿနာရှိနေသည် — နောက်တစ်ကြိမ်ပြန်ကြိုးစားပါ။')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { setDeck(shuffleDeck(3)); fetchLimits() }, [])

  // No forced selection

  // No HEAD prefetch; rely on exact filenames

  return (
    <div className="space-y-6">
      <section className="grid gap-3 items-stretch sm:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-3 flex items-center gap-3 text-xs text-neutral-300">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black/40 border border-mok-goldDeep/40">
              <span className="text-mok-gold">နေ့စဉ်လက်ကျန်</span>
              <strong>{limits ? limits.remainingToday : '—'}</strong>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black/40 border border-mok-goldDeep/40">
              <span className="text-mok-gold">၀ယ်ယူမှုလက်ကျန်</span>
              <strong>{limits ? limits.extraQuota : '—'}</strong>
            </span>
          </div>
          <label className="block mb-1 text-sm text-mok-goldLight">မေးချင်သောမေးခွန်း (မြန်မာ)</label>
          <textarea
            value={question}
            onChange={(e)=>setQuestion(e.target.value)}
            rows={3}
            maxLength={150}
            className="w-full rounded-md bg-black/50 border border-mok-goldDeep/40 px-3 py-2 outline-none focus:border-mok-gold"
          />
          <div className="mt-1 text-right text-xs text-neutral-400">{question.length}/150</div>
        </div>
        <div className="flex flex-col gap-2 mt-6 sm:mt-8">
          <div>
            <label className="block mb-1 text-sm text-mok-goldLight">ကတ်ချိုးမည် (၁ - ၅)</label>
            <div className="flex items-center gap-2">
              <input type="number" min={1} max={5} value={shuffleCount} onChange={(e)=>setShuffleCount(Number(e.target.value))} className="h-10 w-20 sm:w-28 rounded-md bg-black/50 border border-mok-goldDeep/40 px-3 outline-none" />
              <button onClick={doShuffle} className={`h-10 btn-shuffle px-4 rounded-md bg-gold-linear text-black font-medium transition ${isShuffling ? 'bouncing' : ''}`}>ချိုးမယ်</button>
            </div>
          </div>
          <button disabled={selected.length !== 3 || !question || loading} onClick={revealAndInterpret} className="px-3 py-2 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold disabled:opacity-60">ဟောချက်ကြည့်မည်</button>
        </div>
      </section>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={closeModalAndReset} />
          <div className="relative z-10 w-full max-w-2xl mx-4 rounded-2xl border border-mok-goldDeep/40 bg-mok-black p-4 shadow-xl max-h-[88vh] overflow-y-auto thin-scroll">
            <div className="flex items-center justify-between mb-3">
              <h3 className="gold-gradient font-semibold">ရွေးချယ်ထားသော ကတ်များ</h3>
              <button onClick={closeModalAndReset} className="px-3 py-1 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold">ပိတ်မယ်</button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {chosenCards.map((card, idx) => {
                const src = cardImagePath(card)
                return (
                  <div key={`${card.id}-${idx}`} className="text-center">
                    <div className="flip-container">
                      <div className={`flip-card ${(imagesReady && idx < revealCount) ? 'revealed' : ''} aspect-[3/5] rounded-lg overflow-hidden border border-mok-gold/40 relative`}>
                        <div className="flip-back absolute inset-0">
                          <img src={CARD_BACK_SRC} alt="back" className="w-full h-full object-cover" />
                        </div>
                        <div className="flip-face absolute inset-0">
                          <img src={src} alt={card.name} className="w-full h-full object-cover" onError={(e)=>{ (e.currentTarget as HTMLImageElement).src = '/cards/placeholder.svg' }} />
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-mok-goldLight">{card.name}</div>
                  </div>
                )
              })}
            </div>
            {!imagesReady && (
              <div className="mt-3 flex items-center gap-3 text-neutral-300 text-sm">
                <div className="spinner size-5 border-2 border-mok-gold/60 border-t-transparent rounded-full" aria-label="loading" />
                <span>ကတ်ပုံများကို ဖွင့်ယူနေပါသည်…</span>
              </div>
            )}
            <div className="mt-4 p-3 rounded-lg border border-mok-goldDeep/40 bg-black/40 min-h-[96px]">
              <div className="gold-gradient font-medium mb-1">ဖတ်ရှုချက်</div>
              {!result && (
                <div>
                  <p className="text-sm text-neutral-300">ကျေးဇူးပြု၍ ခဏစောင့်ပါ — တွက်ချက်ပေးနေပါတယ်။</p>
                  {loading && (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="spinner size-5 border-2 border-mok-gold/60 border-t-transparent rounded-full" aria-label="loading" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 rounded shimmer" />
                        <div className="h-3 w-11/12 rounded shimmer" />
                        <div className="h-3 w-9/12 rounded shimmer" />
                      </div>
                    </div>
                  )}
                </div>
              )}
              {result && (
                <p className="whitespace-pre-wrap leading-7">{result}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {limitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={closeModalAndReset} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-mok-goldDeep/40 bg-mok-black p-6 shadow-xl text-center">
            <Image src="/thanks.png" alt="Thanks" width={200} height={200} className="mx-auto mb-3" />
            <div className="gold-gradient font-semibold text-lg mb-1">နေ့စဉ် ကန့်သတ်မေးခွန်း ပြည့်ပါပြီ</div>
            <p className="text-sm text-neutral-300 mb-4">ယနေ့အတွက် မေးခွန်း ၃ ကြိမ် ကို အသုံးပြုပြီးဖြစ်ပါသည်။ ထပ်မံဖတ်ရှုလိုပါက Telegram မှ ဝန်ဆောင်မှုကို ဝယ်ယူနိုင်ပါသည်။</p>
            <div className="flex items-center justify-center gap-3">
              <a href="https://t.me/Mok_tarot" target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-md bg-gold-linear text-black font-medium">မေးခွန်း ဝယ်ယူရန်</a>
              <button onClick={closeModalAndReset} className="px-3 py-2 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold">ပိတ်မယ်</button>
            </div>
          </div>
        </div>
      )}

      <section>
        <p className="mb-2 text-sm text-neutral-400">သုံးကတ်ရွေးပါ</p>
        <div className="grid grid-cols-9 gap-1.5 sm:gap-2 md:gap-3">
          {backCards.map((card, idx) => {
            const style: React.CSSProperties = {
              ['--dx' as any]: `${noise[idx]?.dx ?? 0}px`,
              ['--dy' as any]: `${noise[idx]?.dy ?? 0}px`,
              ['--rot' as any]: `${noise[idx]?.rot ?? 0}deg`,
              ['--delay' as any]: `${(idx % 10) * 20}ms`,
            }
            return (
              <button key={card.id} onClick={() => togglePick(idx)} style={style} className={`aspect-[3/5] rounded-md border transition relative overflow-hidden ${selected.includes(idx) ? 'border-mok-gold ring-2 ring-mok-gold/60' : 'border-mok-goldDeep/30'} ${isShuffling ? 'animate-card-shuffle' : 'hover:-translate-y-0.5'} `}>
                <Image src={CARD_BACK_SRC} alt="Card back" fill sizes="100px" />
              </button>
            )
          })}
        </div>
      </section>

      {/* Result now appears inside modal below cards */}
    </div>
  )
}
