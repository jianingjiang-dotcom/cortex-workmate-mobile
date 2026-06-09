import type { Lang, Schedule } from './types'

/** mm:ss or h:mm:ss for players / recording timers. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

/** Human duration, e.g. "12 分 30 秒" / "12m 30s". */
export function formatDuration(ms: number, lang: Lang): string {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (lang === 'zh') {
    if (h > 0) return `${h} 小时 ${m} 分`
    if (m > 0) return `${m} 分 ${s} 秒`
    return `${s} 秒`
  }
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function pad2(n: number) {
  return n.toString().padStart(2, '0')
}

/** Absolute date-time like "6月4日 09:30" / "Jun 4, 09:30". */
export function formatDateTime(ts: number, lang: Lang): string {
  const d = new Date(ts)
  const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  if (lang === 'zh') return `${d.getMonth() + 1}月${d.getDate()}日 ${time}`
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getMonth()]} ${d.getDate()}, ${time}`
}

export function formatDate(ts: number, lang: Lang): string {
  const d = new Date(ts)
  if (lang === 'zh') return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

export function formatTimeOnly(ts: number): string {
  const d = new Date(ts)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** Short date label for list section headers: "6月6日" (same year) or "2026年6月6日". */
export function formatDateShort(ts: number, lang: Lang): string {
  const d = new Date(ts)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  if (lang === 'zh') {
    return sameYear
      ? `${d.getMonth() + 1}月${d.getDate()}日`
      : `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
  }
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return sameYear ? `${months[d.getMonth()]} ${d.getDate()}` : `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

/** Notification-row time: relative within 24h ("X 分钟前"), else clock time ("HH:MM"). */
export function formatNotifTime(ts: number, lang: Lang): string {
  const diff = Date.now() - ts
  if (diff >= 0 && diff < 24 * 60 * 60 * 1000) return formatRelative(ts, lang)
  return formatTimeOnly(ts)
}

/** Bucket a timestamp into calendar-day groups for list section headers. */
export function dayBucket(ts: number): 'today' | 'yesterday' | 'earlier' {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const t0 = start.getTime()
  if (ts >= t0) return 'today'
  if (ts >= t0 - 24 * 60 * 60 * 1000) return 'yesterday'
  return 'earlier'
}

/** Relative time, bilingual. */
export function formatRelative(ts: number, lang: Lang): string {
  const now = Date.now()
  const diff = now - ts
  const min = 60 * 1000
  const hr = 60 * min
  const day = 24 * hr
  if (diff < 0) {
    // future
    const adiff = -diff
    if (adiff < min) return lang === 'zh' ? '即将' : 'soon'
    if (adiff < hr) return lang === 'zh' ? `${Math.round(adiff / min)} 分钟后` : `in ${Math.round(adiff / min)}m`
    if (adiff < day) return lang === 'zh' ? `${Math.round(adiff / hr)} 小时后` : `in ${Math.round(adiff / hr)}h`
    return formatDateTime(ts, lang)
  }
  if (diff < min) return lang === 'zh' ? '刚刚' : 'just now'
  if (diff < hr) return lang === 'zh' ? `${Math.floor(diff / min)} 分钟前` : `${Math.floor(diff / min)}m ago`
  if (diff < day) return lang === 'zh' ? `${Math.floor(diff / hr)} 小时前` : `${Math.floor(diff / hr)}h ago`
  if (diff < 2 * day) return lang === 'zh' ? '昨天' : 'yesterday'
  if (diff < 7 * day) return lang === 'zh' ? `${Math.floor(diff / day)} 天前` : `${Math.floor(diff / day)}d ago`
  return formatDateTime(ts, lang)
}

/** Compute the next run timestamp for a schedule, relative to `from`. */
export function computeNextRun(schedule: Schedule, from = Date.now()): number {
  const base = new Date(from)
  switch (schedule.kind) {
    case 'interval': {
      const mins = schedule.intervalMinutes || 30
      return from + mins * 60 * 1000
    }
    case 'daily': {
      const [h, m] = (schedule.timeOfDay || '09:00').split(':').map(Number)
      const next = new Date(base)
      next.setHours(h, m, 0, 0)
      if (next.getTime() <= from) next.setDate(next.getDate() + 1)
      return next.getTime()
    }
    case 'weekly': {
      const [h, m] = (schedule.timeOfDay || '09:00').split(':').map(Number)
      const days = schedule.weekdays?.length ? schedule.weekdays : [schedule.weekday ?? 1]
      let best = Infinity
      for (const target of days) {
        const next = new Date(base)
        next.setHours(h, m, 0, 0)
        let delta = (target - next.getDay() + 7) % 7
        if (delta === 0 && next.getTime() <= from) delta = 7
        next.setDate(next.getDate() + delta)
        best = Math.min(best, next.getTime())
      }
      return best
    }
    case 'once': {
      const [h, m] = (schedule.timeOfDay || '09:00').split(':').map(Number)
      const next = new Date(base)
      next.setHours(h, m, 0, 0)
      if (next.getTime() <= from) next.setDate(next.getDate() + 1)
      return next.getTime()
    }
    default:
      return from + 60 * 60 * 1000
  }
}

export const WEEKDAYS_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
export const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function scheduleHuman(schedule: Schedule, lang: Lang): string {
  return lang === 'zh' ? schedule.humanZh : schedule.humanEn
}
