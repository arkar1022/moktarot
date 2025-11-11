"use client"

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

type Lang = 'my' | 'en'

const LABELS: Record<Lang, string> = {
  my: 'မြန်',
  en: 'EN',
}

export default function LanguageToggle({ initialLang }: { initialLang: Lang }) {
  const [lang, setLang] = useState<Lang>(initialLang)
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function setLanguage(next: Lang) {
    if (next === lang) return
    setLang(next)
    if (typeof document !== 'undefined') {
      document.cookie = `mok_lang=${next}; path=/; max-age=31536000`
      document.documentElement.lang = next
    }
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <div className="flex items-center rounded-full border border-mok-goldDeep/40 bg-black/60 backdrop-blur px-1 py-1 text-xs shadow-lg">
      {(Object.keys(LABELS) as Lang[]).map((key) => {
        const active = lang === key
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => setLanguage(key)}
            disabled={pending}
            className={`px-3 py-1 rounded-full transition-colors ${
              active ? 'bg-mok-gold text-black font-semibold' : 'text-neutral-300 hover:text-white'
            }`}
          >
            {LABELS[key]}
          </button>
        )
      })}
    </div>
  )
}
