import type { Schedule } from './types'
import { WEEKDAYS_EN, WEEKDAYS_ZH, formatDateTime } from './time'

// Single source of truth for building a Schedule (incl. bilingual human strings) from
// the three editor modes. Both humanZh + humanEn are baked here.
// NOTE: engine.ts `parseSchedule` builds schedules independently from chat intent —
// that duplication is intentional for now (unifying is a separate refactor).
export type ScheduleInput =
  | { mode: 'recurring'; time: string; weekdays: number[] } // 7 weekdays → daily ("每天")
  | { mode: 'dates'; dates: number[] } // each a full date+time epoch, runs once
  | { mode: 'interval'; intervalMinutes: number; startAt?: number }

export function buildSchedule(input: ScheduleInput): Schedule {
  if (input.mode === 'recurring') {
    const time = input.time
    const days = input.weekdays.slice().sort((a, b) => a - b)
    if (days.length === 7) {
      return { kind: 'daily', timeOfDay: time, humanZh: `每天 ${time}`, humanEn: `Every day at ${time}` }
    }
    const safe = days.length ? days : [1]
    const zhDays = safe.map((d) => WEEKDAYS_ZH[d].replace('周', '')).join('、')
    const enDays = safe.map((d) => WEEKDAYS_EN[d]).join(', ')
    return {
      kind: 'weekly',
      weekday: safe[0], // back-compat single weekday
      weekdays: safe,
      timeOfDay: time,
      humanZh: `每周${zhDays} ${time}`,
      humanEn: `Every ${enDays} at ${time}`,
    }
  }

  if (input.mode === 'dates') {
    const dates = input.dates.slice().sort((a, b) => a - b)
    const fmt = (lang: 'zh' | 'en'): string => {
      if (!dates.length) return lang === 'zh' ? '无日期' : 'No dates'
      const sep = lang === 'zh' ? '、' : ', '
      if (dates.length <= 3) return dates.map((d) => formatDateTime(d, lang)).join(sep)
      const head = dates.slice(0, 2).map((d) => formatDateTime(d, lang)).join(sep)
      return lang === 'zh' ? `${head} 等 ${dates.length} 个时间` : `${head} +${dates.length - 2} more`
    }
    return { kind: 'dates', dates, humanZh: fmt('zh'), humanEn: fmt('en') }
  }

  // interval
  const mins = Math.max(1, input.intervalMinutes)
  const isDay = mins % 1440 === 0 && mins >= 1440
  const isHour = !isDay && mins % 60 === 0 && mins >= 60
  const n = isDay ? mins / 1440 : isHour ? mins / 60 : mins
  const everyZh = isDay ? `每 ${n} 天` : isHour ? `每 ${n} 小时` : `每 ${n} 分钟`
  const unitEn = isDay ? 'day' : isHour ? 'hour' : 'minute'
  const everyEn = `Every ${n} ${unitEn}${n > 1 ? 's' : ''}`
  return {
    kind: 'interval',
    intervalMinutes: mins,
    startAt: input.startAt,
    humanZh: input.startAt != null ? `${formatDateTime(input.startAt, 'zh')} 起，${everyZh}` : everyZh,
    humanEn: input.startAt != null ? `${everyEn} from ${formatDateTime(input.startAt, 'en')}` : everyEn,
  }
}
