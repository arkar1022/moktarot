export type TarotCard = { id: number; name: string }

// Minimal 78-card deck (names only). You can replace with richer data/images later.
export const TAROT_DECK: TarotCard[] = [
  { id: 0, name: 'The Fool' },
  { id: 1, name: 'The Magician' },
  { id: 2, name: 'The High Priestess' },
  { id: 3, name: 'The Empress' },
  { id: 4, name: 'The Emperor' },
  { id: 5, name: 'The Hierophant' },
  { id: 6, name: 'The Lovers' },
  { id: 7, name: 'The Chariot' },
  { id: 8, name: 'Strength' },
  { id: 9, name: 'The Hermit' },
  { id: 10, name: 'Wheel of Fortune' },
  { id: 11, name: 'Justice' },
  { id: 12, name: 'The Hanged Man' },
  { id: 13, name: 'Death' },
  { id: 14, name: 'Temperance' },
  { id: 15, name: 'The Devil' },
  { id: 16, name: 'The Tower' },
  { id: 17, name: 'The Star' },
  { id: 18, name: 'The Moon' },
  { id: 19, name: 'The Sun' },
  { id: 20, name: 'Judgement' },
  { id: 21, name: 'The World' },
  // Wands (Ace, 2-10, Page, Knight, Queen, King)
  ...buildMinorSuit(22, 'Wands'),
  // Cups
  ...buildMinorSuit(36, 'Cups'),
  // Swords
  ...buildMinorSuit(50, 'Swords'),
  // Pentacles
  ...buildMinorSuit(64, 'Pentacles'),
]

export function shuffleDeck(shuffles = 1) {
  const arr = [...TAROT_DECK]
  const times = Math.min(5, Math.max(1, shuffles))
  for (let s = 0; s < times; s++) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
  }
  return arr
}

export function slugifyTarotName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function cardImagePath(card: TarotCard) {
  // Only use PNG. For Major Arcana (ids 0..21), enforce leading "the-" prefix
  // even if the name contains "of" (e.g., "Wheel of Fortune").
  const slug = slugifyTarotName(card.name)
  const isMajor = typeof card.id === 'number' && card.id >= 0 && card.id <= 21
  const finalSlug = isMajor ? (slug.startsWith('the-') ? slug : `the-${slug}`) : slug
  return `/cards/${finalSlug}.png`
}

export const CARD_BACK_SRC = '/tarot_cover.png'

function buildMinorSuit(startId: number, suit: 'Wands'|'Cups'|'Swords'|'Pentacles'): TarotCard[] {
  const out: TarotCard[] = []
  // Ace
  out.push({ id: startId + 0, name: `Ace of ${suit}` })
  // 2..10
  for (let n = 2; n <= 10; n++) out.push({ id: startId + (n-1), name: `${n} of ${suit}` })
  // Page, Knight, Queen, King (keep overall count 14)
  out.push({ id: startId + 10, name: `Page of ${suit}` })
  out.push({ id: startId + 11, name: `Knight of ${suit}` })
  out.push({ id: startId + 12, name: `Queen of ${suit}` })
  out.push({ id: startId + 13, name: `King of ${suit}` })
  return out
}
