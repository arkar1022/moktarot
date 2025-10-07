import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

const ROOT = process.cwd()
const CARDS_DIR = path.join(ROOT, 'public', 'cards')

function baseNoExt(filename) {
  return filename.replace(/\.(png|jpg|jpeg|webp)$/i, '')
}

function isImageFile(filename) {
  return /\.(png|jpg|jpeg|webp)$/i.test(filename)
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true })
}

async function fileExists(p) {
  try { await fs.access(p); return true } catch { return false }
}

async function convertToPng(srcPath, dstPath) {
  await ensureDir(path.dirname(dstPath))
  try {
    await sharp(srcPath).png().toFile(dstPath)
  } catch (e) {
    // Fallback: if the file isn't a decodable image, just copy bytes
    await fs.copyFile(srcPath, dstPath)
    console.warn(`Warn: copied without re-encode (unsupported format): ${path.basename(srcPath)}`)
  }
}

async function removeIfExists(p) {
  if (await fileExists(p)) await fs.rm(p)
}

async function run() {
  const entries = await fs.readdir(CARDS_DIR)
  const files = entries.filter(isImageFile)

  // Build index
  const set = new Set(files.map(f => f))

  // Find pairs like the-foo.* and foo.*
  const pairs = []
  for (const f of files) {
    const base = baseNoExt(f)
    if (base.startsWith('the-')) {
      const bare = base.replace(/^the-/, '')
      const hasBare = ['.png','.jpg','.jpeg','.webp'].some(ext => set.has(`${bare}${ext}`))
      if (hasBare) pairs.push({ theName: base, bareName: bare })
    }
  }

  // Process pairs: keep only the-*.png
  for (const { theName, bareName } of pairs) {
    const target = path.join(CARDS_DIR, `${theName}.png`)
    // Pick a source that exists (prefer the-*.* over bare)
    let src = null
    const candidateOrder = [
      `${theName}.png`, `${theName}.jpg`, `${theName}.jpeg`, `${theName}.webp`,
      `${bareName}.png`, `${bareName}.jpg`, `${bareName}.jpeg`, `${bareName}.webp`,
    ]
    for (const c of candidateOrder) {
      const p = path.join(CARDS_DIR, c)
      if (await fileExists(p)) { src = p; break }
    }
    if (!src) continue
    if (path.resolve(src) !== path.resolve(target)) {
      await convertToPng(src, target)
    }
    // Remove all other extensions for both names
    for (const ext of ['.png','.jpg','.jpeg','.webp']) {
      const bareP = path.join(CARDS_DIR, `${bareName}${ext}`)
      const theP = path.join(CARDS_DIR, `${theName}${ext}`)
      if (bareP !== target) await removeIfExists(bareP)
      if (theP !== target) await removeIfExists(theP)
    }
  }

  // Process remaining files: ensure .png, remove other extensions
  const after = await fs.readdir(CARDS_DIR)
  const remaining = after.filter(isImageFile)
  const processed = new Set(remaining.map(baseNoExt))

  for (const name of processed) {
    const target = path.join(CARDS_DIR, `${name}.png`)
    let haveTarget = await fileExists(target)
    if (!haveTarget) {
      // Find any existing ext to convert from
      let src = null
      for (const ext of ['.png','.jpg','.jpeg','.webp']) {
        const p = path.join(CARDS_DIR, `${name}${ext}`)
        if (await fileExists(p)) { src = p; break }
      }
      if (src) {
        if (src.endsWith('.png')) {
          // Just rename if needed
          try { await fs.rename(src, target) } catch {
            // If cross-device or exists, copy+remove
            await fs.copyFile(src, target)
          }
        } else {
          await convertToPng(src, target)
        }
      }
    }
    // Remove any non-png variants
    for (const ext of ['.jpg','.jpeg','.webp']) {
      await removeIfExists(path.join(CARDS_DIR, `${name}${ext}`))
    }
  }

  console.log('Normalization complete: only .png kept; duplicates without "the-" removed.')
}

run().catch(err => { console.error(err); process.exit(1) })
