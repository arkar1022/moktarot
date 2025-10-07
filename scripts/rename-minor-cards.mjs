import fs from 'node:fs/promises'
import path from 'node:path'

const dir = path.join(process.cwd(), 'public', 'cards')
const suits = ['wands','cups','swords','pentacles']

function exists(p){ return fs.access(p).then(()=>true).catch(()=>false) }
async function mvSafe(src, dst){ if (await exists(src)) { await fs.rename(src, dst); console.log('renamed', path.basename(src), '→', path.basename(dst)) } }

for (const s of suits) {
  // 1 -> ace
  await mvSafe(path.join(dir, `1-of-${s}.jpg`), path.join(dir, `ace-of-${s}.jpg`))
  await mvSafe(path.join(dir, `01-of-${s}.jpg`), path.join(dir, `ace-of-${s}.jpg`))
  // 11 -> page
  await mvSafe(path.join(dir, `11-of-${s}.jpg`), path.join(dir, `page-of-${s}.jpg`))
  // 12 -> knight
  await mvSafe(path.join(dir, `12-of-${s}.jpg`), path.join(dir, `knight-of-${s}.jpg`))
  // 13 -> queen
  await mvSafe(path.join(dir, `13-of-${s}.jpg`), path.join(dir, `queen-of-${s}.jpg`))
  // 14 -> king
  await mvSafe(path.join(dir, `14-of-${s}.jpg`), path.join(dir, `king-of-${s}.jpg`))
}

console.log('Minor card filenames normalized to Ace/2-10/Page/Knight/Queen/King')

