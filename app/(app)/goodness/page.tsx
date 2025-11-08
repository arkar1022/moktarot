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
  createdAt: string
}

const BELIEFS = [
  { value: 'BUDDHIST', label: 'ဗုဒ္ဓဘာသာ' },
  { value: 'HINDU', label: 'ဟိန္ဒူ' },
  { value: 'CHRISTIAN', label: 'ခရစ်ယာန်' },
  { value: 'ISLAM', label: 'အစ္စလာမ်' },
  { value: 'ATHEIST', label: 'နတ်မယုံ (Atheist)' },
]

export default function GoodnessPage() {
  const today = new Date().toISOString().slice(0, 10)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(today)
  const [language, setLanguage] = useState<'my'|'en'>(() => (typeof document !== 'undefined' && document.documentElement.lang === 'en') ? 'en' : 'my')
  const [belief, setBelief] = useState<string>('BUDDHIST')
  const [loading, setLoading] = useState(false)
  const [entries, setEntries] = useState<GoodDeed[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch('/api/deeds', { cache: 'no-store' })
        const data = await res.json().catch(()=>({}))
        if (!active) return
        setEntries(data.deeds || [])
      } catch (e: any) {
        if (active) setError(e?.message || 'မိတ်ဆွေ့လုပ်ဆောင်မှုများကို မရရှိနိုင်ပါ')
      }
    })()
    return () => { active = false }
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!note.trim()) {
      setError('လုပ်ကောင်းမှုကို ရေးသားပေးပါ')
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
      if (!res.ok) throw new Error(data?.error || 'မအောင်မြင်သေးပါ')
      setEntries(prev => [data.deed, ...prev])
      setNote('')
      setDate(today)
    } catch (e: any) {
      setError(e?.message || 'AI ကို မခေါ်နိုင်ပါ — ခဏကြာ၍ ထပ်မံကြိုးစားပါ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="gold-gradient text-xl font-semibold">ကောင်းမှု မှတ်တမ်း</h1>
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
      </header>

      <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-mok-goldDeep/30 bg-black/30 p-4">
        <div className="grid gap-2">
          <label className="text-sm text-mok-goldLight">ကောင်းမှု အကြောင်းအရာ</label>
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
            <span className="text-mok-goldLight">နေ့ရက်</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={today}
              className="rounded-lg border border-mok-goldDeep/40 bg-[#050505] p-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-mok-goldLight">ဘာသာ</span>
            <select value={belief} onChange={(e) => setBelief(e.target.value)} className="rounded-lg border border-mok-goldDeep/40 bg-[#050505] p-2">
              {BELIEFS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-mok-gold px-4 py-2 font-semibold text-black disabled:opacity-70"
            >
              {loading ? 'သိမ်းဆည်းနေပါသည်…' : 'မှတ်တမ်းတင်မည်'}
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-mok-goldLight">လုပ်ကောင်းမှု မှတ်တမ်းများ</h2>
        {entries.length === 0 && (
          <p className="text-sm text-neutral-500">မှတ်တမ်း မရှိသေးပါ — ယနေ့လုပ်ကောင်းမှုကို စရေးကြည့်ပါ။</p>
        )}
        <div className="space-y-3">
          {entries.map(entry => (
            <article key={entry.id} className="rounded-2xl border border-mok-goldDeep/30 bg-black/40 p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                <span>{new Date(entry.deedDate).toLocaleDateString('en-CA')}</span>
                <span>·</span>
                <span>{entry.language === 'en' ? 'English' : 'မြန်မာ'}</span>
                <span>·</span>
                <span>{beliefLabel(entry.belief)}</span>
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
                {entry.aiFeedback}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function beliefLabel(belief?: string) {
  switch ((belief || '').toUpperCase()) {
    case 'BUDDHIST': return 'ဗုဒ္ဓဘာသာ';
    case 'HINDU': return 'ဟိန္ဒူ';
    case 'CHRISTIAN': return 'ခရစ်ယာန်';
    case 'ISLAM': return 'အစ္စလာမ်';
    case 'ATHEIST': return 'နတ်မယုံ';
    default: return belief || '';
  }
}
