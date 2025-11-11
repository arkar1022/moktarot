'use client'

import { useEffect, useState } from 'react'

type GoodDeed = {
  id: string
  note: string
  deedDate: string
  categories: string[]
  aiFeedback: string
  language: string
  belief?: string
  points?: number
  createdAt: string
}

type Lang = 'my' | 'en'

const BELIEFS = [
  { value: 'BUDDHIST', labelMy: 'ဗုဒ္ဓဘာသာ', labelEn: 'Buddhist' },
  { value: 'HINDU', labelMy: 'ဟိန္ဒူ', labelEn: 'Hindu' },
  { value: 'CHRISTIAN', labelMy: 'ခရစ်ယာန်', labelEn: 'Christian' },
  { value: 'ISLAM', labelMy: 'အစ္စလာမ်', labelEn: 'Islam' },
  { value: 'ATHEIST', labelMy: 'နတ်မယုံ (Atheist)', labelEn: 'Atheist' },
] as const

const COPY = {
  en: {
    title: 'Good Deeds Journal',
    dateLabel: 'Date',
    beliefLabel: 'Belief',
    submit: 'Save Deed',
    submitting: 'Saving…',
    listTitle: 'Logged deeds',
    empty: 'No deeds yet — log today’s kindness to get started.',
    coinsLabel: 'Coins',
    errorRequired: 'Please describe your good deed.',
    fetchError: 'Unable to load your deeds right now.',
    saveError: 'Unable to save right now — please try again.',
  },
  my: {
    title: 'ကောင်းမှု မှတ်တမ်း',
    dateLabel: 'နေ့ရက်',
    beliefLabel: 'ဘာသာ',
    submit: 'မှတ်တမ်းတင်မည်',
    submitting: 'သိမ်းဆည်းနေပါသည်…',
    listTitle: 'လုပ်ကောင်းမှု မှတ်တမ်းများ',
    empty: 'မှတ်တမ်း မရှိသေးပါ — ယနေ့လုပ်ကောင်းမှုကို စရေးကြည့်ပါ။',
    coinsLabel: 'ကွိုင်',
    errorRequired: 'လုပ်ကောင်းမှုကို ရေးသားပေးပါ',
    fetchError: 'လုပ်ဆောင်မှုများကို မရရှိနိုင်ပါ',
    saveError: 'သိမ်းဆည်း၍ မရပါ — ခဏကြာ၍ ပြန်ကြိုးစားပါ။',
  }
} as const

export default function GoodnessClient({ initialLang }: { initialLang: Lang }) {
  const today = new Date().toISOString().slice(0, 10)
  const [language, setLanguage] = useState<Lang>(initialLang)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(today)
  const [belief, setBelief] = useState<string>('BUDDHIST')
  const [loading, setLoading] = useState(false)
  const [entries, setEntries] = useState<GoodDeed[]>([])
  const [error, setError] = useState<string | null>(null)
  const [coins, setCoins] = useState<number>(0)
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
    let active = true
    const fetchErrorMessage = COPY[language].fetchError
    ;(async () => {
      try {
        const res = await fetch('/api/deeds', { cache: 'no-store' })
        const data = await res.json().catch(()=>({}))
        if (!active) return
        setEntries(data.deeds || [])
        setCoins(data.coins ?? 0)
      } catch (e: any) {
        if (active) setError(fetchErrorMessage)
      }
    })()
    return () => { active = false }
  }, [language])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!note.trim()) {
      setError(copy.errorRequired)
      return
    }
    setLoading(true)
    setError(null)
    try {
        const res = await fetch('/api/deeds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note, deedDate: date, language, belief })
        })
        const data = await res.json().catch(()=>({}))
        if (!res.ok) throw new Error(data?.error || copy.saveError)
        setEntries(prev => [data.deed, ...prev])
        setCoins(data.coins ?? 0)
      setNote('')
      setDate(today)
    } catch (e: any) {
      setError(e?.message || copy.saveError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="gold-gradient text-xl font-semibold">{copy.title}</h1>
        <p className="text-sm text-neutral-400">
          {language === 'en'
            ? 'The Deed Collector is your personal journal for recognizing the good you do every day. Don\'t worry about the size of the action—record any kind of deed, even small victories like controlling your anger or offering a simple compliment.'
            : '"ကောင်းမှု မှတ်တမ်း" ဆိုတာက သင်နေ့စဉ်လုပ်ခဲ့တဲ့ ကောင်းတဲ့အရာလေးတွေကို ကိုယ့်ဘာသာကိုယ် ပြန်သိမ်းထားနိုင်တဲ့ နေရာလေးပါပဲ။'}
        </p>
        <p className="text-xs text-neutral-500">
          {language === 'en'
            ? 'When you feel unuseful or low, reviewing your good deeds here provides concrete proof of your positive impact. Our system gives encouraging feedback to remind you of your value, helping you become a better person and encouraging community support. Use this record as a source of strength and inspiration!'
            : 'ဒီနေရာမှာ မှတ်တမ်းတင်ဖို့အတွက် လုပ်လိုက်တဲ့အရာက အကြီးကြီးတွေ ဖြစ်စရာမလိုပါဘူး။ ဥပမာ- "ဒီနေ့ ဒေါသထွက်တော့မလို့ပဲ၊ ဒါပေမဲ့ ကိုယ့်ကိုယ်ကိုယ် ထိန်းလိုက်နိုင်တယ်" ဆိုတာမျိုး၊ ဒါမှမဟုတ် တစ်ယောက်ယောက်ကို ချီးကျူးစကားလေး ပြောလိုက်တာမျိုးလို သေးသေးမွှားမွှား ကောင်းမှုလေးတွေ အကုန်လုံးကို မှတ်ထားလို့ရပါတယ်။ ကိုယ့်ကိုယ်ကို အသုံးမကျဘူးလို့ ခံစားရတဲ့နေ့တွေ၊ စိတ်ဓာတ်ကျတဲ့အခါမျိုးမှာ ဒီမှတ်တမ်းလေးကို ပြန်ဖွင့်ကြည့်လိုက်ပါ။ ဒါတွေအားလုံးက သင်ဘယ်လောက် တန်ဖိုးရှိတဲ့လူတစ်ယောက်လဲ၊ ကောင်းတဲ့အရာတွေ ဘယ်လောက်လုပ်ခဲ့လဲ ဆိုတာကို သက်သေပြပေးနေပါလိမ့်မယ်။ ဒီမှတ်တမ်းလေးတွေက သင့်ကို အမြဲအားပေးပြီး ပိုကောင်းတဲ့လူတစ်ယောက် ဖြစ်လာဖို့ရော၊ ပတ်ဝန်းကျင်ကို ကူညီဖို့ပါ တွန်းအားပေးနေမှာပါ။ ကိုယ့်အတွက် ခွန်အားတွေ ဒီနေရာကနေ လာယူနိုင်ပါတယ်!'}
        </p>
        <p className="text-xs text-mok-gold/80">
          {language === 'en'
            ? 'Each deed can earn up to 50 coins based on its impact—collect them to unlock more tarot readings later.'
            : 'လုပ်ခဲ့သမျှ ကောင်းမှုတစ်ခုစီသည် အများဆုံး ကွန်ပွန် ၅၀ (Coins) ရရှိနိုင်ပါသည်။'}
        </p>
        <div className="inline-flex items-center gap-2 rounded-full border border-mok-goldDeep/40 bg-black/40 px-3 py-1 text-xs text-mok-goldLight">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 7v10M9 10h6M9 14h6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{copy.coinsLabel}: <strong className="text-mok-gold">{coins}</strong></span>
        </div>
      </header>

      <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-mok-goldDeep/30 bg-black/30 p-4">
        <div className="grid gap-2">
          <label className="text-sm text-mok-goldLight">
            {language === 'en' ? 'Good deed description' : 'ကောင်းမှု အကြောင်းအရာ'}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            className="rounded-xl border border-mok-goldDeep/40 bg-[#050505] p-3 text-sm focus:border-mok-gold"
            placeholder={language === 'en' ? 'Example: I feed the stray dogs...' : 'ဥပမာ - ကျွန်တော်/ကျွန်မ လမ်းဘေးခွေးတွေကို အစာကျွေးပေးသည်...'}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm">
            <span className="text-mok-goldLight">{copy.dateLabel}</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={today}
              className="rounded-lg border border-mok-goldDeep/40 bg-[#050505] p-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-mok-goldLight">{copy.beliefLabel}</span>
            <select value={belief} onChange={(e) => setBelief(e.target.value)} className="rounded-lg border border-mok-goldDeep/40 bg-[#050505] p-2">
              {BELIEFS.map(opt => (
                <option key={opt.value} value={opt.value}>{language === 'en' ? opt.labelEn : opt.labelMy}</option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-mok-gold px-4 py-2 font-semibold text-black disabled:opacity-70"
            >
              {loading ? copy.submitting : copy.submit}
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-mok-goldLight">{copy.listTitle}</h2>
        {entries.length === 0 && (
          <p className="text-sm text-neutral-500">{copy.empty}</p>
        )}
        <div className="space-y-3">
          {entries.map(entry => (
            <article key={entry.id} className="rounded-2xl border border-mok-goldDeep/30 bg-black/40 p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                <span>{new Date(entry.deedDate).toLocaleDateString('en-CA')}</span>
                <span>·</span>
                <span>{entry.language === 'en' ? 'English' : 'မြန်မာ'}</span>
                <span>·</span>
                <span>{beliefLabel(entry.belief, language)}</span>
                {typeof entry.points === 'number' && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 text-mok-goldLight">
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 7v10M9 10h6M9 14h6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <strong>{entry.points}</strong>
                      <span className="text-[11px] uppercase tracking-wide">
                        {language === 'en' ? 'coins' : 'ကွိုင်'}
                      </span>
                    </span>
                  </>
                )}
              </div>
              <p className="text-sm leading-6 text-neutral-100 whitespace-pre-wrap">{entry.note}</p>
              {entry.categories.length > 0 && (
                <div className="flex flex-wrap gap-2 text-xs">
                  {entry.categories.map(cat => (
                    <span key={cat} className="rounded-full border border-mok-gold/40 px-3 py-1 capitalize text-mok-gold">{cat.toLowerCase()}</span>
                  ))}
                </div>
              )}
              <div className="rounded-xl border border-mok-gold/20 bg-black/30 p-3 text-sm leading-6 text-neutral-100">
                <div className="text-xs font-semibold text-mok-goldLight mb-1">{entry.language === 'en' ? 'Acknowledgement' : 'အသိအမှတ်ပြုခြင်း'}</div>
                {entry.aiFeedback}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function beliefLabel(belief?: string, lang: 'en' | 'my' = 'my') {
  const map: Record<string, { en: string; my: string }> = {
    BUDDHIST: { en: 'Buddhist', my: 'ဗုဒ္ဓဘာသာ' },
    HINDU: { en: 'Hindu', my: 'ဟိန္ဒူ' },
    CHRISTIAN: { en: 'Christian', my: 'ခရစ်ယာန်' },
    ISLAM: { en: 'Islam', my: 'အစ္စလာမ်' },
    ATHEIST: { en: 'Atheist', my: 'နတ်မယုံ' },
  }
  const key = (belief || '').toUpperCase()
  const entry = map[key]
  if (!entry) return belief || ''
  return lang === 'en' ? entry.en : entry.my
}
