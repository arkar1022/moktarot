'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { TAROT_DECK, shuffleDeck, CARD_BACK_SRC, cardImagePath } from '@/lib/tarot'

type Lang = 'my' | 'en'

const COPY: Record<Lang, {
  questionLabel: string
  shuffleLabel: string
  shuffleButton: string
  revealButton: string
  selectedCardsTitle: string
  close: string
  cardLoading: string
  readingTitle: string
  readingWait: string
  limitTitle: string
  limitBody: string
  limitCta: string
  limitClose: string
  pickCards: string
  transientError: string
  generalError: string
}> = {
  my: {
    questionLabel: 'မေးချင်သောမေးခွန်း (မြန်မာ)',
    shuffleLabel: 'ကတ်ချိုးမည် (၁ - ၅)',
    shuffleButton: 'ချိုးမယ်',
    revealButton: 'ဟောချက်ကြည့်မည်',
    selectedCardsTitle: 'ရွေးချယ်ထားသော ကတ်များ',
    close: 'ပိတ်မယ်',
    cardLoading: 'ကတ်ပုံများကို ဖွင့်ယူနေပါသည်…',
    readingTitle: 'ဖတ်ရှုချက်',
    readingWait: 'ကျေးဇူးပြု၍ ခဏစောင့်ပါ — တွက်ချက်ပေးနေပါတယ်။',
    limitTitle: 'နေ့စဉ် ကန့်သတ်မေးခွန်း ပြည့်ပါပြီ',
    limitBody: 'ယနေ့အတွက် မေးခွန်း ၃ ကြိမ် ကို အသုံးပြုပြီးဖြစ်ပါသည်။ ထပ်မံဖတ်ရှုလိုပါက Telegram မှ ဝန်ဆောင်မှုကို ဝယ်ယူနိုင်ပါသည်။',
    limitCta: 'မေးခွန်း ဝယ်ယူရန်',
    limitClose: 'ပိတ်မယ်',
    pickCards: 'သုံးကတ်ရွေးပါ',
    transientError: 'အခုအချိန်တွင် မပြောလို့ရသေးပါ — ဆက်လက်ကြိုးစားပေးပါ။',
    generalError: 'အချို့ပြဿနာရှိနေသည် — နောက်တစ်ကြိမ်ပြန်ကြိုးစားပါ။',
  },
  en: {
    questionLabel: 'Your question',
    shuffleLabel: 'Shuffle intensity (1 - 5)',
    shuffleButton: 'Shuffle',
    revealButton: 'Show reading',
    selectedCardsTitle: 'Chosen cards',
    close: 'Close',
    cardLoading: 'Loading card art…',
    readingTitle: 'Reading',
    readingWait: 'Please wait — generating your guidance.',
    limitTitle: 'Daily question limit reached',
    limitBody: 'You already used the 3 free questions for today. Purchase more readings on Telegram to continue.',
    limitCta: 'Buy more questions',
    limitClose: 'Close',
    pickCards: 'Pick three cards',
    transientError: 'Unable to respond right now — please try again soon.',
    generalError: 'Something went wrong — please try again.',
  }
}

export default function DashboardClient({ initialLang }: { initialLang: Lang }) {
  const [lang, setLang] = useState<Lang>(initialLang)
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
  const [limits, setLimits] = useState<{ remainingToday: number, extraQuota: number, dailyLimit: number, usedToday: number } | null>(null)
  const [coins, setCoins] = useState<number | null>(null)
  const [converting, setConverting] = useState(false)
  const copy = COPY[lang]

  useEffect(() => { setLang(initialLang) }, [initialLang])

  useEffect(() => {
    if (limitModal) setLimitMsg(copy.limitBody)
  }, [limitModal, copy.limitBody])

  function formatAnswer(text: string) {
    const esc = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    const lines = esc.split('\n')
    const chunks: string[] = []
    for (const line of lines) {
      const original = line
      const trimmed = original.trim()
      if (!trimmed) { chunks.push('<div class="h-2"></div>'); continue }
      const isBullet = /^\s*[\*-]\s+/.test(original)
      const isNumbered = /^\s*\d+\.\s+/.test(original)
      const content = isBullet ? trimmed.replace(/^[\*-]\s+/, '') : trimmed
      let html = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      const isTitle = !isBullet && /^<strong>[^<]+<\/strong>\s*$/.test(html)
      if (isBullet) {
        chunks.push(`<div class="pl-3">• ${html}</div>`)
      } else if (isNumbered) {
        // Add vertical spacing between numbered paragraphs like "1.", "2.", ...
        chunks.push(`<div class="mt-2">${html}</div>`)
      } else if (isTitle) {
        // Add spacing and gold color for bold title-like lines
        chunks.push(`<div class="mt-3 text-mok-gold font-semibold">${html}</div>`)
      } else {
        chunks.push(`<div>${html}</div>`)
      }
    }
    return chunks.join('')
  }

  async function fetchLimits() {
    try {
      const res = await fetch('/api/user/limits', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setLimits({
        remainingToday: data.remainingToday ?? 0,
        extraQuota: data.extraQuota ?? 0,
        dailyLimit: data.dailyLimit ?? 3,
        usedToday: data.usedToday ?? 0,
      })
    } catch {}
  }

  async function fetchCoins() {
    try {
      const res = await fetch('/api/deeds', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json().catch(()=>({}))
      setCoins(typeof data.coins === 'number' ? data.coins : 0)
    } catch {}
  }

  async function convertCoins() {
    if (converting) return
    setConverting(true)
    try {
      const res = await fetch('/api/deeds/convert', { method: 'POST' })
      const data = await res.json().catch(()=>({}))
      if (!res.ok) {
        alert(data?.error || 'Conversion failed')
      } else {
        setCoins(data.coins ?? 0)
        setLimits(prev => prev ? { ...prev, extraQuota: data.extraQuota ?? prev.extraQuota } : prev)
      }
    } catch (e: any) {
      alert(e?.message || 'Conversion failed')
    } finally {
      setConverting(false)
    }
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
    const res = await fetch('/api/tarot/reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, selectedCards: cards, language: lang })
    })
      const data = await res.json().catch(()=>({}))
      if (res.status === 429) {
        const msg = copy.limitBody
        setShowModal(false)
        setLimitMsg(msg)
        setLimitModal(true)
        return
      }
      if (!res.ok) {
        console.error('reading error', data)
        if (requestIdRef.current === reqId) setResult(copy.transientError)
      } else {
        if (requestIdRef.current === reqId) setResult(data.reading?.answer || '')
        // Refresh limits after a successful reading
        fetchLimits()
      }
    } catch (e) {
      console.error(e)
      setResult(copy.generalError)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { setDeck(shuffleDeck(3)); fetchLimits(); fetchCoins() }, [])

  const availableQuestions = useMemo(() => {
    if (!limits) return null
    return Math.max(0, limits.remainingToday + limits.extraQuota)
  }, [limits])

  const totalQuota = useMemo(() => {
    if (!limits) return null
    return limits.dailyLimit + limits.extraQuota
  }, [limits])

  // No forced selection

  // No HEAD prefetch; rely on exact filenames

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-mok-goldDeep/40 bg-gradient-to-br from-black/70 via-[#120a04] to-black/60 p-4 shadow-[0_10px_45px_rgba(0,0,0,0.45)]">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/50 border border-mok-gold/40 text-mok-gold">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 4v4m6-2-1 3m4 2-3 1m2 6h-4m-2 4-1-3m-6 3 1-3m-4-2 3-1m-2-6h4m2-4 1 3m3 4a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">Today&apos;s limit</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-semibold text-mok-gold">
                  {availableQuestions ?? '—'}
                </p>
                {totalQuota !== null && (
                  <span className="text-xs text-neutral-400 pb-1">/ {totalQuota}</span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-neutral-400">
            <span className="inline-flex items-center gap-1 rounded-full border border-mok-goldDeep/40 px-3 py-1">
              Used <strong className="text-neutral-200">{limits ? limits.usedToday : '—'}</strong>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-mok-goldDeep/40 px-3 py-1">
              Base limit <strong className="text-neutral-200">{limits ? limits.dailyLimit : '—'}</strong>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-mok-goldDeep/40 px-3 py-1">
              Bonus <strong className="text-mok-goldLight">{limits ? limits.extraQuota : '—'}</strong>
            </span>
          </div>
          <p className="mt-3 text-xs text-neutral-400">
            {availableQuestions !== null
              ? `You can still ask ${availableQuestions} question${availableQuestions === 1 ? '' : 's'} today.`
              : 'Fetching your remaining questions...'}
          </p>
        </div>
        <div className="rounded-2xl border border-mok-goldDeep/40 bg-gradient-to-br from-[#050708] via-[#0d0d0d] to-[#120b03] p-4 shadow-[0_10px_40px_rgba(0,0,0,0.4)] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">Coins</p>
              <p className="text-3xl font-semibold text-mok-gold">{coins ?? '—'}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/60 border border-mok-gold/30 text-mok-gold">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 7v10M9 10h6M9 14h6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-neutral-400">
            100 coins = 1 reading. Convert your kindness into more tarot insights.
          </p>
          <button
            onClick={convertCoins}
            disabled={!coins || coins < 100}
            className="mt-auto rounded-xl border border-mok-goldDeep/40 bg-black/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-mok-gold hover:border-mok-gold disabled:opacity-50"
          >
            Exchange 100 coins
          </button>
          {coins !== null && coins < 100 && (
            <p className="text-[11px] text-neutral-500">Need {100 - coins} more coins for the next reading.</p>
          )}
        </div>
      </section>
      <section className="grid gap-3 items-stretch sm:grid-cols-[1fr_320px]">
        <div>
          <label className="block mb-1 text-sm text-mok-goldLight">{copy.questionLabel}</label>
          <textarea
            value={question}
            onChange={(e)=>setQuestion(e.target.value)}
            rows={3}
            maxLength={150}
            className="w-full rounded-md bg-black/50 border border-mok-goldDeep/40 px-3 py-2 outline-none focus:border-mok-gold"
          />
          <div className="mt-1 text-right text-xs text-neutral-400">{question.length}/150</div>
        </div>
        <div className="flex flex-col gap-2 mt-4 sm:mt-0 sm:self-start">
          <div>
            <label className="block mb-1 text-sm text-mok-goldLight">{copy.shuffleLabel}</label>
            <div className="flex items-center gap-2">
              <input type="number" min={1} max={5} value={shuffleCount} onChange={(e)=>setShuffleCount(Number(e.target.value))} className="h-10 w-20 sm:w-28 rounded-md bg-black/50 border border-mok-goldDeep/40 px-3 outline-none" />
              <button onClick={doShuffle} className={`h-10 btn-shuffle px-4 rounded-md bg-gold-linear text-black font-medium transition ${isShuffling ? 'bouncing' : ''}`}>{copy.shuffleButton}</button>
            </div>
          </div>
          <button
            disabled={selected.length !== 3 || !question || loading}
            onClick={revealAndInterpret}
            className="relative overflow-hidden rounded-xl border border-mok-gold/60 bg-gradient-to-r from-[#fce19f] via-[#d4a94c] to-[#fce19f] px-5 py-3 text-sm font-semibold uppercase tracking-wide text-black transition hover:shadow-[0_8px_20px_rgba(250,210,120,0.4)] disabled:opacity-60 disabled:shadow-none"
          >
            <span className="relative z-10">{copy.revealButton}</span>
            <div className="absolute inset-0 rounded-xl border border-white/30 opacity-40 pointer-events-none" />
          </button>
        </div>
      </section>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={closeModalAndReset} />
          <div className="relative z-10 w-full max-w-2xl mx-4 rounded-2xl border border-mok-goldDeep/40 bg-mok-black p-4 shadow-xl max-h-[88vh] overflow-y-auto thin-scroll">
            <div className="flex items-center justify-between mb-3">
              <h3 className="gold-gradient font-semibold">{copy.selectedCardsTitle}</h3>
              <button onClick={closeModalAndReset} className="px-3 py-1 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold">{copy.close}</button>
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
                <span>{copy.cardLoading}</span>
              </div>
            )}
            <div className="mt-4 p-3 rounded-lg border border-mok-goldDeep/40 bg-black/40 min-h-[96px]">
              <div className="gold-gradient font-medium mb-1">{copy.readingTitle}</div>
              {!result && (
                <div>
                  <p className="text-sm text-neutral-300">{copy.readingWait}</p>
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
                <div className="leading-7" dangerouslySetInnerHTML={{ __html: formatAnswer(result) }} />
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
            <div className="gold-gradient font-semibold text-lg mb-1">{copy.limitTitle}</div>
            <p className="text-sm text-neutral-300 mb-4">{limitMsg || copy.limitBody}</p>
            <div className="flex items-center justify-center gap-3">
              <a href="https://t.me/Mok_tarot" target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-md bg-gold-linear text-black font-medium">{copy.limitCta}</a>
              <button onClick={closeModalAndReset} className="px-3 py-2 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold">{copy.limitClose}</button>
            </div>
          </div>
        </div>
      )}

      <section>
        <p className="mb-2 text-sm text-neutral-400">{copy.pickCards}</p>
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
