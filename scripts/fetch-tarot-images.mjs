import fs from 'node:fs/promises'
import path from 'node:path'
import https from 'node:https'

const outDir = path.join(process.cwd(), 'public', 'cards')
await fs.mkdir(outDir, { recursive: true })

// Source: CC0/PD Rider–Waite–Smith scans via Wikimedia Commons mirrors
// We map our slugs to known filenames. If any fail, we keep placeholder.
// Note: URLs are direct raw links hosted on Wikimedia; licenses are PD (US) for this deck.
const base = 'https://upload.wikimedia.org/wikipedia/commons'
const files = {
  'the-fool': 'd/d4/RWS_Tarot_00_Fool.jpg',
  'the-magician': 'd/de/RWS_Tarot_01_Magician.jpg',
  'the-high-priestess': '8/88/RWS_Tarot_02_High_Priestess.jpg',
  'the-empress': 'd/d2/RWS_Tarot_03_Empress.jpg',
  'the-emperor': 'c/c3/RWS_Tarot_04_Emperor.jpg',
  'the-hierophant': '8/8d/RWS_Tarot_05_Hierophant.jpg',
  'the-lovers': '3/3a/TheLovers.jpg',
  'the-chariot': 'df/d7/RWS_Tarot_07_Chariot.jpg',
  'strength': 'f/f5/RWS_Tarot_08_Strength.jpg',
  'the-hermit': '4/4d/RWS_Tarot_09_Hermit.jpg',
  'wheel-of-fortune': '3/3c/RWS_Tarot_10_Wheel_of_Fortune.jpg',
  'justice': 'e/e4/RWS_Tarot_11_Justice.jpg',
  'the-hanged-man': '2/2b/RWS_Tarot_12_Hanged_Man.jpg',
  'death': 'd/d7/RWS_Tarot_13_Death.jpg',
  'temperance': 'f/f8/RWS_Tarot_14_Temperance.jpg',
  'the-devil': '5/55/RWS_Tarot_15_Devil.jpg',
  'the-tower': '5/53/RWS_Tarot_16_Tower.jpg',
  'the-star': 'd/db/RWS_Tarot_17_Star.jpg',
  'the-moon': '7/7f/RWS_Tarot_18_Moon.jpg',
  'the-sun': '1/17/RWS_Tarot_19_Sun.jpg',
  'judgement': 'd/dd/RWS_Tarot_20_Judgement.jpg',
  'the-world': 'f/ff/RWS_Tarot_21_World.jpg',
}

// Suits: images named Ace_to_King per suit exist on Commons; map 1->ace, 11->page, 12->knight, 13->queen, 14->king
const suitMap = {
  wands: 'Wands',
  cups: 'Cups',
  swords: 'Swords',
  pentacles: 'Pentacles',
}
const rankName = (n) => {
  if (n === 1) return '01_Ace_of'
  if (n >= 2 && n <= 10) return `${String(n).padStart(2,'0')}_of`
  if (n === 11) return '11_Page_of'
  if (n === 12) return '12_Knight_of'
  if (n === 13) return '13_Queen_of'
  if (n === 14) return '14_King_of'
}

for (const [slug, file] of Object.entries(files)) {
  const url = `${base}/${file}`
  const out = path.join(outDir, `${slug}.jpg`)
  await download(url, out)
}

for (const suit of Object.keys(suitMap)) {
  for (let n = 1; n <= 14; n++) {
    const name = `${rankName(n)}_${suitMap[suit]}.jpg`
    const url = `${base}/thumb/1/11/RWS_Tarot_${name}/512px-RWS_Tarot_${name}.jpg`
    const slug = `${n}-of-${suit}`
    const out = path.join(outDir, `${slug}.jpg`)
    await download(url, out)
  }
}

async function download(url, out) {
  return new Promise((resolve) => {
    const file = fs.open(out, 'w').then(fh => fh.close())
    const req = https.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // follow redirect once
        return download(res.headers.location, out).then(resolve)
      }
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', async () => {
        try {
          const buf = Buffer.concat(chunks)
          await fs.writeFile(out, buf)
        } catch {}
        resolve(true)
      })
    })
    req.on('error', () => resolve(false))
  })
}

console.log('Downloaded tarot images to public/cards')

