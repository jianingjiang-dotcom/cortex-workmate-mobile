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
  brand: 'linear-gradient(135deg, #5B7CFA 0%, #8A6AF0 45%, #C76AE0 70%, #FF9F5A 100%)',
  ocean: 'linear-gradient(135deg, #5B7CFA 0%, #4FC3F7 100%)',
  sunset: 'linear-gradient(135deg, #C76AE0 0%, #FF9F5A 100%)',
  violet: 'linear-gradient(135deg, #6D6AF0 0%, #B96AE8 100%)',
  mint: 'linear-gradient(135deg, #34C759 0%, #4FC3F7 100%)',
  amber: 'linear-gradient(135deg, #FF9F5A 0%, #FFCC00 100%)',
}

export function gradientFor(key: string | undefined): string {
  return GRADIENTS[key || 'brand'] || GRADIENTS.brand
}

/** Deterministic speaker colors for transcript segments. */
export const SPEAKER_COLORS = [
  { text: '#5B7CFA', bg: 'rgba(91,124,250,0.10)', dot: '#5B7CFA' },
  { text: '#C76AE0', bg: 'rgba(199,106,224,0.10)', dot: '#C76AE0' },
  { text: '#FF9500', bg: 'rgba(255,149,0,0.10)', dot: '#FF9500' },
  { text: '#34C759', bg: 'rgba(52,199,89,0.10)', dot: '#34C759' },
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
