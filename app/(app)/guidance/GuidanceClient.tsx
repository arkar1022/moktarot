'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { appendLocalGuidanceHistory, readGuestProfile } from '@/lib/browser-storage'
import { isWithoutDbMode } from '@/lib/runtime'

type Religion = 'BUDDHIST' | 'HINDU' | 'CHRISTIAN' | 'ISLAM'
type Lang = 'my' | 'en'

const RELIGIONS = {
  my: [
    { key: 'BUDDHIST' as Religion, name: 'ဗုဒ္ဓဘာသာ', img: '/religion/buddhist.png' },
    { key: 'HINDU' as Religion, name: 'ဟိန္ဒူဘာသာ', img: '/religion/hindu.png' },
    { key: 'CHRISTIAN' as Religion, name: 'ခရစ်ယာန်ဘာသာ', img: '/religion/christian.png' },
    { key: 'ISLAM' as Religion, name: 'အစ္စလာမ်ဘာသာ', img: '/religion/islam.png' },
  ],
  en: [
    { key: 'BUDDHIST' as Religion, name: 'Buddhist', img: '/religion/buddhist.png' },
    { key: 'HINDU' as Religion, name: 'Hindu', img: '/religion/hindu.png' },
    { key: 'CHRISTIAN' as Religion, name: 'Christian', img: '/religion/christian.png' },
    { key: 'ISLAM' as Religion, name: 'Islam', img: '/religion/islam.png' },
  ]
} as const

const COPY: Record<Lang, {
  title: string
  choose: string
  questionLabel: string
  askButton: string
  panelTitle: string
  panelEmpty: string
  error: string
}> = {
  my: {
    title: '၀ိညာဉ်အကြံဉာဏ်',
    choose: 'ဘာသာကို ရွေးပါ',
    questionLabel: 'မေးချင်သောမေးခွန်း (မြန်မာ)',
    askButton: 'အဖြေ ထုတ်မည်',
    panelTitle: 'လမ်းညွှန် စာတမ်း',
    panelEmpty: 'ဘာသာကို ရွေးပြီး မေးချင်တာ မေးပါ။',
    error: 'AI ကို မခေါ်နိုင်ပါ—ခဏကြာ၍ ပြန်မေးကြည့်ပါ။',
  },
  en: {
    title: 'Spiritual Guidance',
    choose: 'Choose your faith',
    questionLabel: 'Your question',
    askButton: 'Generate answer',
    panelTitle: 'Guidance transcript',
    panelEmpty: 'Select a faith and ask your question to receive guidance.',
    error: 'Unable to contact the AI — please try again shortly.',
  }
}

export default function GuidanceClient({ initialLang }: { initialLang: Lang }) {
  const withoutDbMode = isWithoutDbMode()
  const [language, setLanguage] = useState<Lang>(initialLang)
  const [selected, setSelected] = useState<Religion | null>(null)
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [guestName, setGuestName] = useState('')

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
    if (!withoutDbMode) return
    const syncGuestProfile = () => {
      setGuestName(readGuestProfile().name)
    }
    syncGuestProfile()
    window.addEventListener('guest-profile-updated', syncGuestProfile)
    return () => window.removeEventListener('guest-profile-updated', syncGuestProfile)
  }, [withoutDbMode])

  function formatAnswer(text: string) {
    const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const lines = esc.split('\n')
    const chunks: string[] = []
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) { chunks.push('<div class="h-2"></div>'); continue }
      const isBullet = /^[-*•]\s+/.test(trimmed)
      let html = trimmed.replace(/^[-*•]\s+/, '')
      html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      if (isBullet) chunks.push(`<div class="pl-3">• ${html}</div>`)
      else chunks.push(`<div>${html}</div>`)
    }
    return chunks.join('')
  }

  async function generate() {
    if (!selected || !question.trim()) return
    setLoading(true); setResult(null)
    try {
      const res = await fetch('/api/guidance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ religion: selected, question, language, displayName: guestName }) })
      const data = await res.json().catch(()=>({}))
      if (!res.ok) throw new Error(data?.error || 'Failed')
      setResult(data.guidance?.answer || '')
      if (withoutDbMode && data?.guidance) {
        appendLocalGuidanceHistory({
          id: data.guidance.id || `guest-${Date.now()}`,
          religion: data.guidance.religion || selected,
          question: data.guidance.question || question,
          answer: data.guidance.answer || '',
          createdAt: data.guidance.createdAt || new Date().toISOString(),
        })
      }
    } catch (e) {
      setResult(COPY[language].error)
    } finally {
      setLoading(false)
    }
  }

  const copy = COPY[language]
  const religions = RELIGIONS[language]

  return (
    <div className="space-y-6">
      <h2 className="gold-gradient text-lg font-semibold">{copy.title}</h2>

      <section>
        <p className="mb-2 text-sm text-neutral-400">{copy.choose}</p>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {religions.map(r => (
            <button key={r.key} onClick={()=>setSelected(r.key)} className={`p-2 sm:p-3 rounded-xl border transition bg-black/30 hover:border-mok-gold ${selected===r.key? 'border-mok-gold ring-2 ring-mok-gold/40' : 'border-mok-goldDeep/30'}`}>
              <div className="relative aspect-square rounded-lg overflow-hidden border border-mok-goldDeep/30">
                <Image src={r.img} alt={r.name} fill sizes="180px" className="object-cover" />
              </div>
              <div className="mt-2 text-center text-xs sm:text-sm">{r.name}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-[1fr_220px] items-start">
        <div>
          <label className="block mb-1 text-sm text-mok-goldLight">{copy.questionLabel}</label>
          <textarea value={question} onChange={(e)=>setQuestion(e.target.value)} rows={3} maxLength={200} className="w-full rounded-md bg-black/50 border border-mok-goldDeep/40 px-3 py-2 outline-none focus:border-mok-gold" />
          <div className="mt-1 text-right text-xs text-neutral-400">{question.length}/200</div>
        </div>
        <div className="pt-6 sm:pt-8">
          <button disabled={!selected || !question.trim() || loading} onClick={generate} className="w-full px-3 py-2 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold disabled:opacity-60">{copy.askButton}</button>
        </div>
      </section>

      <section className="p-3 rounded-xl border border-mok-goldDeep/40 bg-black/40 min-h-[120px]">
        <div className="gold-gradient font-medium mb-2">{copy.panelTitle}</div>
        {!result && loading && (
          <div className="flex items-center gap-3 text-neutral-300 text-sm">
            <div className="spinner size-5 border-2 border-mok-gold/60 border-t-transparent rounded-full" aria-label="loading" />
            <div className="flex-1 space-y-2">
              <div className="h-3 rounded shimmer" />
              <div className="h-3 w-11/12 rounded shimmer" />
              <div className="h-3 w-9/12 rounded shimmer" />
            </div>
          </div>
        )}
        {result && (
          <div className="leading-7" dangerouslySetInnerHTML={{ __html: formatAnswer(result) }} />
        )}
        {!loading && !result && (
          <p className="text-sm text-neutral-400">{copy.panelEmpty}</p>
        )}
      </section>
    </div>
  )
}
