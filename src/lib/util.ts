import { clsx, type ClassValue } from 'clsx'

/** Tailwind-friendly className combiner. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}

let _counter = 0
/** Unique-enough id for prototype entities. */
export function uid(prefix = ''): string {
  _counter = (_counter + 1) % 100000
  return (
    prefix +
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 7) +
    _counter.toString(36)
  )
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export function formatBytes(bytes: number, lang: 'zh' | 'en' = 'zh'): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`
}

/** Gradient presets used for avatars / brand moments. */
export const GRADIENTS: Record<string, string> = {
  // Cortex Linear — the brand gradient (logo / hero / brand moments only)
  brand: 'linear-gradient(135deg, #407CFF 0%, #CC79FF 60%, #FFA03B 100%)',
  ocean: 'linear-gradient(135deg, #407CFF 0%, #6FA0FF 100%)',
  sunset: 'linear-gradient(135deg, #CC79FF 0%, #FFA03B 100%)',
  violet: 'linear-gradient(135deg, #CC79FF 0%, #407CFF 100%)',
  mint: 'linear-gradient(135deg, #22C55E 0%, #6FA0FF 100%)',
  amber: 'linear-gradient(135deg, #FFA03B 0%, #FFCC00 100%)',
}

export function gradientFor(key: string | undefined): string {
  return GRADIENTS[key || 'brand'] || GRADIENTS.brand
}

/** Solid identity colors (DS §10: avatars are solid fills, never gradients). */
export const SOLIDS: Record<string, string> = {
  brand: '#CC79FF',
  ocean: '#407CFF',
  sunset: '#FFA03B',
  violet: '#CC79FF',
  mint: '#22C55E',
  amber: '#FFA03B',
}

export function solidFor(key: string | undefined): string {
  return SOLIDS[key || 'brand'] || SOLIDS.brand
}

/** Deterministic speaker colors for transcript segments. */
export const SPEAKER_COLORS = [
  { text: '#407CFF', bg: 'rgba(64,124,255,0.10)', dot: '#407CFF' },
  { text: '#CC79FF', bg: 'rgba(204,121,255,0.10)', dot: '#CC79FF' },
  { text: '#FFA03B', bg: 'rgba(255,160,59,0.10)', dot: '#FFA03B' },
  { text: '#22C55E', bg: 'rgba(34,197,94,0.10)', dot: '#22C55E' },
]

export function speakerColor(index: number) {
  return SPEAKER_COLORS[index % SPEAKER_COLORS.length]
}

/** Downscale an image File to a JPEG data URL (aspect-ratio preserved), so it
 *  persists in localStorage and stays lightweight. Used for chat attachments. */
export function resizeImageToDataUrl(file: File, maxDim = 1280, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      URL.revokeObjectURL(url)
      if (!ctx) return reject(new Error('no 2d context'))
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('image load failed'))
    }
    img.src = url
  })
}
