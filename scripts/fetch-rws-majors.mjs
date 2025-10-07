import fs from 'node:fs/promises'
import path from 'node:path'
import https from 'node:https'

const majors = [
  'Fool','Magician','High Priestess','Empress','Emperor','Hierophant','Lovers','Chariot','Strength','Hermit','Wheel of Fortune','Justice','Hanged Man','Death','Temperance','Devil','Tower','Star','Moon','Sun','Judgement','World'
]

const outDir = path.join(process.cwd(), 'public', 'cards')
await fs.mkdir(outDir, { recursive: true })

const UA = { headers: { 'User-Agent': 'MOKTarot/0.1 (+https://example.com contact admin)' } }

for (let i = 0; i < majors.length; i++) {
  const nn = String(i).padStart(2,'0')
  const title = encodeURIComponent(`File:RWS Tarot ${nn} ${majors[i]}.jpg`)
  const api = `https://commons.wikimedia.org/w/api.php?action=query&titles=${title}&prop=imageinfo&iiprop=url&format=json`
  const meta = await fetchJson(api)
  const page = meta?.query?.pages && Object.values(meta.query.pages)[0]
  const url = page?.imageinfo?.[0]?.url
  if (!url) { console.warn('No URL for', majors[i]); continue }
  const slug = majors[i].toLowerCase().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-')
  const out = path.join(outDir, `the-${slug}.jpg`)
  await download(url, out)
}

// UA declared above

async function fetchJson(url) {
  return new Promise((resolve) => {
    https.get(url, UA, (res) => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) } catch { resolve(null) }
      })
    }).on('error', () => resolve(null))
  })
}

async function download(url, out) {
  return new Promise((resolve) => {
    https.get(url, UA, (res) => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', async () => {
        try { await fs.writeFile(out, Buffer.concat(chunks)) } catch {}
        resolve(true)
      })
    }).on('error', () => resolve(false))
  })
}

console.log('Fetched RWS major arcana to public/cards')
