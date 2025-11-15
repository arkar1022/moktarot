import { TAROT_DECK } from '@/lib/tarot'

type SectionKey = 'general' | 'relationship' | 'workMoney' | 'health' | 'education' | 'warnings'

export type SectionBundle = Record<SectionKey, string>
export type BilingualSections = { my: SectionBundle; en: SectionBundle }

const SECTION_KEYS: SectionKey[] = ['general','relationship','workMoney','health','education','warnings']

const EMPTY_SECTION = (): SectionBundle => ({
  general: '',
  relationship: '',
  workMoney: '',
  health: '',
  education: '',
  warnings: ''
})

function stripFences(input: string) {
  const trimmed = input.trim()
  const match = trimmed.match(/^```(?:json)?\n([\s\S]+?)\n```$/i)
  return match ? match[1] : trimmed
}

function tryParseJson(text: string): any | null {
  const payload = stripFences(text)
  try {
    return JSON.parse(payload)
  } catch {
    const a = payload.indexOf('{')
    const b = payload.lastIndexOf('}')
    if (a >= 0 && b > a) {
      try {
        return JSON.parse(payload.slice(a, b + 1))
      } catch {
        return null
      }
    }
    return null
  }
}

function coerceSections(data: any): BilingualSections {
  const fallback = { my: EMPTY_SECTION(), en: EMPTY_SECTION() }
  if (!data || typeof data !== 'object') return fallback
  const fill = (src: any): SectionBundle => {
    const section = EMPTY_SECTION()
    if (!src || typeof src !== 'object') return section
    for (const key of SECTION_KEYS) {
      if (typeof src[key] === 'string') section[key] = src[key].trim()
    }
    return section
  }
  const my = fill(data.my)
  const en = fill(data.en)
  return { my, en }
}

async function askGemini(prompt: string) {
  const key = process.env.GEMINI_API_KEY
  const model = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim()
  if (!key) return null
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: { temperature: 0.85 }
      })
    })
    const json = await res.json().catch(() => ({}))
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text
    if (res.ok && typeof text === 'string') return text
  } catch {
    return null
  }
  return null
}

export async function generateBilingualSections(args: { sign: string; timeframe: string; cards: string[] }) {
  const { sign, timeframe, cards } = args
  const cardList = cards.join(', ')
  const prompt = `You are MokTarot’s bilingual astrologer. Write two synchronized horoscope readings for ${sign} that cover the timeframe "${timeframe}". Use the following tarot cards as internal inspiration only (never mention them by name): ${cardList}.

Return ONLY valid JSON in this exact structure (no markdown, prose, or extra keys):
{"my":{"general":"","relationship":"","workMoney":"","health":"","education":"","warnings":""},"en":{"general":"","relationship":"","workMoney":"","health":"","education":"","warnings":""}}

Instructions:
- "my" must be natural Burmese (Unicode) with warm, grounded tone.
- "en" must be natural English with the same practical guidance.
- Each field should contain 4–6 sentences that mix insight + actionable steps.
- Anchor every paragraph in concrete symbolism from the drawn cards—reference suits, elements, numerology, positions, or visual imagery (vehicles, tools, scenery, posture) to justify the advice.
- Relationship should cover romance, family, and social harmony.
- WorkMoney covers career momentum plus finances.
- Health must mention both mental and physical well-being. Use the card symbols to pinpoint the affected body parts, senses, or activities (right hand, driving posture, urinary system, headaches, breathing, etc.) and offer gentle care tips (hydration, stretches, check-ups, rest) without making diagnoses.
- Education can include learning, upskilling, travel-for-learning, or philosophical growth.
- Warnings should call out tangible risks tied to the imagery (e.g., machinery, sharp objects, travel routes) and close with two specific action steps separated by semicolons.
- Every section must clearly differentiate the most relevant characters or settings implied by the cards instead of giving generic guidance.
- Never mention tarot cards outright. Keep things respectful, contemporary, and culturally aware.`

  const raw = await askGemini(prompt)
  if (!raw) throw new Error('AI generation failed')
  const parsed = coerceSections(tryParseJson(raw))
  // If everything is blank, fall back to dumping the raw text in Burmese general
  const hasContent = SECTION_KEYS.some(key => parsed.my[key] || parsed.en[key])
  if (!hasContent) {
    parsed.my.general = raw.trim()
  }
  return { sections: parsed, raw }
}

export function pickRandomCards(count = 3): string[] {
  const deck = [...TAROT_DECK]
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck.slice(0, count).map(card => card.name)
}

export function formatTimeframe(startDate: Date, endDate: Date) {
  const fmt = new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' })
  return `${fmt.format(startDate)} - ${fmt.format(endDate)}`
}
