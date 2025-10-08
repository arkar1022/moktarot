import Image from 'next/image'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TAROT_DECK, cardImagePath, TarotCard } from '@/lib/tarot'
import ReactionPill from '../ReactionPill'

export const dynamic = 'force-dynamic'

function titleCase(s: string) { return s.toLowerCase().replace(/\b\w/g, c=>c.toUpperCase()) }

function findCardByName(name: string) {
  return TAROT_DECK.find(c => c.name.toLowerCase() === String(name||'').toLowerCase())
}

function formatMD(date: Date) {
  const months = ['ဇန်နဝါရီ','ဖေဖော်ဝါရီ','မတ်','ဧပြီ','မေ','ဂျွန်','ဂျူလိုင်','ဩဂုတ်','စက်တင်ဘာ','အောက်တိုဘာ','နိုဝင်ဘာ','ဒီဇင်ဘာ']
  const m = months[date.getMonth()]
  const d = date.getDate()
  return `${m} ${d}`
}

export default async function ZodiacSignPage({ params }: { params: { sign: string } }) {
  const sign = (params.sign || '').toUpperCase()
  const ZODIAC_MM: Record<string, string> = {
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
  }
  const reading = await prisma.zodiacReading.findFirst({ where: { sign: sign as any }, orderBy: { createdAt: 'desc' } }).catch(()=>null as any)
  const iconSrc = `/zodiac/${sign.toLowerCase()}.png`
  if (!reading) {
    return <div className="space-y-4">
      <div className="flex justify-center">
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border border-mok-gold/40 bg-gradient-to-b from-black/40 to-black/10 shadow-[inset_0_0_20px_rgba(212,175,55,0.08)]">
          <Image src={iconSrc} alt={`${sign} icon`} fill className="object-contain p-2" />
        </div>
      </div>
      <div className="text-center">
        <h2 className="gold-gradient text-lg leading-6 font-semibold">{ZODIAC_MM[sign] || titleCase(sign)}</h2>
        {/* No reading available → no timeframe to show */}
      </div>
      <p className="text-sm text-neutral-400">ယခုအချိန်တွင် မရှိသေးပါ။</p>
    </div>
  }
  const cards = Array.isArray(reading.cards) ? reading.cards : []
  const maybeCards: (TarotCard | undefined)[] = (cards as any[])
    .map((n): TarotCard | undefined => findCardByName(typeof n === 'string' ? n : n?.name))
  const chosen: TarotCard[] = maybeCards.filter((x): x is TarotCard => !!x)
  const start = new Date(reading.startDate)
  const end = new Date(reading.endDate)

  // Record a view for this user against this reading
  try {
    const token = cookies().get('mok_auth')?.value
    const payload = token ? verifyToken(token) : null
    if (payload?.uid) {
      await prisma.zodiacView.upsert({
        where: { readingId_userId: { readingId: reading.id, userId: payload.uid } },
        create: { readingId: reading.id, userId: payload.uid, count: 1, lastViewed: new Date() },
        update: { count: { increment: 1 }, lastViewed: new Date() }
      })
    }
  } catch {}
  return (
    <div className="space-y-6 relative">
      <Link href="/app/zodiac" aria-label="Back to zodiac" className="absolute left-0 -top-6 sm:-top-3 inline-flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 mb-2 sm:mb-3 rounded-full border border-mok-goldDeep/40 bg-black/30 hover:border-mok-gold hover:bg-black/40 transition">
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-mok-gold" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
        <span className="hidden sm:inline text-xs text-neutral-300">နောက်သို့</span>
      </Link>
      <div className="flex flex-col items-center gap-3 max-w-2xl mx-auto">
        <div className="relative mt-6 sm:mt-0 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border border-mok-gold/40 bg-gradient-to-b from-black/40 to-black/10 shadow-[inset_0_0_20px_rgba(212,175,55,0.08)]">
          <Image src={iconSrc} alt={`${sign} icon`} fill className="object-contain p-2" />
        </div>
        <h2 className="gold-gradient text-lg leading-6 font-semibold">{ZODIAC_MM[sign] || titleCase(sign)}</h2>
        <div className="mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-mok-gold/50 bg-black/30 shadow-[0_0_20px_rgba(212,175,55,0.15)]">
          <span className="text-base sm:text-lg font-medium text-mok-gold">{formatMD(start)} မှ {formatMD(end)} ထိ</span>
        </div>
      </div>

      {/* Selected tarot cards */}
      {chosen.length > 0 && (
        <div className="max-w-5xl mx-auto">
          <div className="text-sm text-mok-goldLight mb-3 text-center">ယခုသီတင်းပတ်အတွက် တားရော့ကတ်များ</div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 justify-items-center">
            {chosen.slice(0, 8).map((c: TarotCard, i: number) => (
              <div key={`${c.id}-${i}`} className="aspect-[3/5] w-24 sm:w-36 md:w-44 lg:w-56 rounded-lg overflow-hidden border border-mok-gold/40">
                <Image src={cardImagePath(c)} alt={c.name} width={360} height={600} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reaction row under cards */}
      <div className="mt-6 flex items-center justify-center">
        <ReactionPill readingId={reading.id} />
      </div>

      {/* Reading sections */}
      <div className="grid md:grid-cols-2 gap-4">
        <SectionCard title="အထွေထွေ" text={reading.general} />
        <SectionCard title="ဆက်ဆံရေး (အချစ်၊ မိသားစု၊ လူမှုရေး)" text={reading.relationship} />
        <SectionCard title="အလုပ်အကိုင်နှင့် ငွေကြေး" text={reading.workMoney} />
        <SectionCard title="ကျန်းမာရေး" text={reading.health} />
        <SectionCard title="ပညာရေး" text={reading.education} />
        <SectionCard title="သတိပြုရန်နှင့် လုပ်ဆောင်ရန်" text={reading.warnings} />
      </div>
    </div>
  )
}

function SectionCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="p-4 rounded-2xl border border-mok-goldDeep/30 bg-gradient-to-b from-mok-smoke/10 to-black/30 shadow-[inset_0_0_20px_rgba(212,175,55,0.08)]">
      <div className="gold-gradient font-medium mb-2">{title}</div>
      <div className="text-sm leading-7 whitespace-pre-wrap text-neutral-200">{text}</div>
    </div>
  )
}
