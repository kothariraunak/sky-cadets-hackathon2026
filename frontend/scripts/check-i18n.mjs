// Checks the translation files: every English key present in each language, placeholders kept,
// and every static t('…') key used in the code defined in en.json. Run: npm run check:i18n
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const dir = new URL('../src/i18n/locales/', import.meta.url).pathname
const src = new URL('../src/', import.meta.url).pathname
const en = JSON.parse(readFileSync(join(dir, 'en.json'), 'utf8'))
const ph = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
let problems = 0

const files = []
const walk = (d) => readdirSync(d, { withFileTypes: true }).forEach((e) => {
  const p = join(d, e.name)
  if (e.isDirectory()) walk(p)
  else if (/\.(jsx?|mjs)$/.test(e.name)) files.push(p)
})
walk(src)
const used = new Set()
for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(/\bt\('([a-zA-Z][\w.]*)'/g)) used.add(m[1])
const undefinedKeys = [...used].filter((k) => !(k in en))
if (undefinedKeys.length) { problems++; console.log('Used in code but missing from en.json:', undefinedKeys) }

for (const file of readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'en.json').sort()) {
  const d = JSON.parse(readFileSync(join(dir, file), 'utf8'))
  const missing = Object.keys(en).filter((k) => en[k] !== '' && !d[k])
  const broken = Object.keys(en).filter((k) => d[k] && ph(d[k]) !== ph(en[k]))
  const extra = Object.keys(d).filter((k) => !(k in en))
  console.log(`${file}: ${Object.keys(en).length - missing.length}/${Object.keys(en).length}` +
    (missing.length ? ` missing ${missing.slice(0, 8).join(', ')}` : '') +
    (broken.length ? ` placeholder mismatch ${broken.join(', ')}` : '') + (extra.length ? ` unknown ${extra.join(', ')}` : ''))
  if (missing.length || broken.length) problems++
}
process.exit(problems ? 1 : 0)
