#!/usr/bin/env node
/**
 * Cortex DS conformance check — a mechanical guard for the rules we kept re-catching by eye.
 *
 *   npm run ds-check                 # scan all of src/, exit 1 if any ERROR
 *   node scripts/ds-check.mjs <file> # scan a single file (used by the edit hook)
 *
 * ERRORS gate (fail the check): off-scale type — the #1 repeat offender.
 * WARNINGS are advisory (raw palette hex, stray per-icon stroke, grey-filled inputs).
 * Rules mirror cortex-design-skills/ (foundations §2 type, §7 icons; components §2 inputs).
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const EVEN = new Set([12, 14, 16, 18, 20, 24, 32]) // DS [LOCKED] type scale
const FONT_OK = new Set([10, 11]) // documented exceptions: tab label, count badges, file-type chip
const HEX_TOKEN = { CC79FF: 'brand-primary / --purple', '407CFF': 'ios-blue / --link', FFA03B: 'ios-orange / --cta' }
const HEX_DEF = [/index\.css$/, /tailwind\.config\.js$/, /lib[\\/]util\.ts$/] // files that legitimately DEFINE the palette

const errors = []
const warns = []

function scan(file) {
  const rel = relative(ROOT, file).replace(/\\/g, '/')
  const text = readFileSync(file, 'utf8')
  const isDef = HEX_DEF.some((re) => re.test(rel))

  text.split('\n').forEach((line, i) => {
    const at = (msg) => ({ rel, ln: i + 1, msg, code: line.trim().slice(0, 90) })

    // ERROR — off-scale font size
    for (const m of line.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)) {
      const n = parseFloat(m[1])
      if (!EVEN.has(n) && !FONT_OK.has(n)) errors.push(at(`off-scale font text-[${m[1]}px] → use 12/14/16/18/20/24/32`))
    }
    // WARN — raw palette hex that already has a token
    if (!isDef) {
      for (const m of line.matchAll(/#(CC79FF|407CFF|FFA03B)\b/gi)) {
        const hex = m[1].toUpperCase()
        warns.push(at(`raw hex #${hex} → use a token (${HEX_TOKEN[hex]})`))
      }
    }
    // WARN — explicit strokeWidth on a Lucide icon (DS icons are a single global 1.5; 0 = intentional
    // fill). JSX brace form only ({N}) — the "N" string form is a raw <svg>/<path>, not Lucide-governed.
    for (const m of line.matchAll(/strokeWidth=\{\s*(\d+(?:\.\d+)?)\s*\}/g)) {
      const n = parseFloat(m[1])
      if (n !== 0 && n !== 1.5) warns.push(at(`strokeWidth={${m[1]}} on a Lucide icon → DS stroke is a global 1.5; drop the prop`))
    }
  })

  // WARN — grey-filled <input>/<textarea> (DS: inputs are OUTLINED)
  for (const m of text.matchAll(/<(input|textarea)\b[^>]*?className=("|')([^"']*)\2/g)) {
    if (/\bbg-ios-gray\d\b|\bbg-fill\b/.test(m[3]) && !/\bborder-input\b/.test(m[3])) {
      warns.push({ rel, ln: text.slice(0, m.index).split('\n').length, msg: `grey-filled <${m[1]}> → DS inputs are outlined (bg-surface border border-input)`, code: m[3].slice(0, 90) })
    }
  }
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(tsx?|css)$/.test(p)) scan(p)
  }
}

const arg = process.argv[2]
if (arg) existsSync(arg) && scan(arg)
else walk(join(ROOT, 'src'))

const fmt = (l) => l.map((e) => `  ${e.rel}:${e.ln}\n    ${e.msg}\n    │ ${e.code}`).join('\n')
if (errors.length) console.error(`\n✗ DS check — ${errors.length} error(s):\n${fmt(errors)}\n`)
if (warns.length) console.error(`\n⚠ DS check — ${warns.length} warning(s):\n${fmt(warns)}\n`)
if (!errors.length && !warns.length) console.log('✓ DS check passed — no violations.')
process.exit(errors.length ? 1 : 0)
