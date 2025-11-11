import fs from 'fs'
import path from 'path'
import Image from 'next/image'
import Link from 'next/link'
import { cookies } from 'next/headers'

type Lang = 'my' | 'en'

const ZODIAC_NAMES: Record<Lang, Record<string, string>> = {
  my: {
    ARIES: 'မိဿ',
    TAURUS: 'ပြိဿ',
    GEMINI: 'မေထုန်',
    CANCER: 'ကရကဋ်',
    LEO: 'သိဟ်',
    VIRGO: 'ကန်',
    LIBRA: 'တူ',
    SCORPIO: 'ဗြိစ္ဆာ',
    SAGITTARIUS: 'ဓနု',
    CAPRICORN: 'မကာရ',
    AQUARIUS: 'ကုံ',
    PISCES: 'မိန်',
  },
  en: {
    ARIES: 'Aries',
    TAURUS: 'Taurus',
    GEMINI: 'Gemini',
    CANCER: 'Cancer',
    LEO: 'Leo',
    VIRGO: 'Virgo',
    LIBRA: 'Libra',
    SCORPIO: 'Scorpio',
    SAGITTARIUS: 'Sagittarius',
    CAPRICORN: 'Capricorn',
    AQUARIUS: 'Aquarius',
    PISCES: 'Pisces',
  }
}

const ZODIAC_DATES: Record<string, string> = {
  ARIES: 'Mar 21 – Apr 19',
  TAURUS: 'Apr 20 – May 20',
  GEMINI: 'May 21 – Jun 20',
  CANCER: 'Jun 21 – Jul 22',
  LEO: 'Jul 23 – Aug 22',
  VIRGO: 'Aug 23 – Sep 22',
  LIBRA: 'Sep 23 – Oct 22',
  SCORPIO: 'Oct 23 – Nov 21',
  SAGITTARIUS: 'Nov 22 – Dec 21',
  CAPRICORN: 'Dec 22 – Jan 19',
  AQUARIUS: 'Jan 20 – Feb 18',
  PISCES: 'Feb 19 – Mar 20',
}

export const dynamic = 'force-dynamic'

export default async function ZodiacPage() {
  const lang: Lang = cookies().get('mok_lang')?.value === 'en' ? 'en' : 'my'
  const dir = path.join(process.cwd(), 'public', 'zodiac')
  let files: string[] = []
  try {
    files = fs.readdirSync(dir).filter(f => /\.(png|jpg|jpeg|webp|svg)$/i.test(f))
  } catch {
    files = []
  }
  files.sort()

  function displayName(file: string) {
    const base = file.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()
    return base.split(/\s+/).map(w=> w ? (w[0].toUpperCase() + w.slice(1)) : '').join(' ')
  }

  return (
    <div className="space-y-6 relative">
      <Link href="/app/dashboard" aria-label="Back to dashboard" className="absolute left-0 -top-6 sm:-top-3 sm:mb-4 inline-flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 rounded-full border border-mok-goldDeep/40 bg-black/30 hover:border-mok-gold hover:bg-black/40 transition">
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-mok-gold" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
        <span className="hidden sm:inline text-xs text-neutral-300">နောက်သို့</span>
      </Link>
      <div className='sm:pt-10 pt-5'>
        <h2 className="md:mt-[30px] sm:mt-[0px] gold-gradient text-lg font-semibold">{lang === 'en' ? 'Zodiac Reading' : 'ရာသီခွင်'}</h2>
        <p className="text-xs text-neutral-400">{lang === 'en' ? 'Pick a sign to view today’s insight.' : 'ရာသီစတင်များကို ရွေးချယ်ကြည့်ရှုပါ'}</p>
      </div>
      {files.length === 0 ? (
        <p className="text-sm text-neutral-400">{lang === 'en' ? 'No zodiac icons found. Add images under public/zodiac.' : 'Icon များမတွေ့ရှိပါ။ public/zodiac ထဲတွင် ထည့်ပါ။'}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {files.map((f) => {
            const base = f.replace(/\.[^.]+$/, '')
            const code = base.toUpperCase()
            const href = `/app/zodiac/${code}`
            return (
              <Link
                key={f}
                href={href}
                className="group relative p-3 rounded-2xl border border-mok-goldDeep/40 bg-gradient-to-b from-mok-smoke/10 to-black/30 text-center transition-transform duration-300 hover:scale-[1.02] hover:border-mok-gold overflow-hidden"
              >
                <div className="pointer-events-none absolute -inset-12 opacity-0 group-hover:opacity-40 transition-opacity duration-500" style={{background: 'radial-gradient(800px 200px at top right, rgba(212,175,55,0.25), transparent 60%)'}} />
                <div className="relative mx-auto aspect-square w-28 rounded-xl border border-mok-gold/30 bg-gradient-to-b from-black/40 to-black/10 flex items-center justify-center shadow-[inset_0_0_20px_rgba(212,175,55,0.08)]">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-transparent to-mok-gold/5 opacity-60" />
                  <Image src={`/zodiac/${f}`} alt={displayName(f)} width={88} height={88} className="object-contain drop-shadow-[0_0_10px_rgba(212,175,55,0.2)]" />
                </div>
                <div className="mt-3 pb-2">
                  <div className="text-sm pb-2 leading-5 font-medium gold-gradient break-words">
                    {ZODIAC_NAMES[lang][code] || displayName(f)}
                  </div>
                  <div className="text-[11px] text-neutral-400">{ZODIAC_DATES[code] || ''}</div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
