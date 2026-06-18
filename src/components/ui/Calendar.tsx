import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLang } from '../../i18n'
import { cn } from '../../lib/util'

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DOW_ZH = ['日', '一', '二', '三', '四', '五', '六']
const DOW_EN = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
function startOfMonth(ts: number): number {
  const d = new Date(ts)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Reusable iOS-style month-grid date picker (date only — pair with a native time input).
 *  `onSelect` returns the chosen day's midnight epoch. Days before `min` are disabled. */
export function Calendar({
  value,
  min,
  onSelect,
}: {
  value?: number
  min?: number
  onSelect: (midnightEpoch: number) => void
}) {
  const lang = useLang()
  const today = startOfDay(Date.now())
  const minDay = min != null ? startOfDay(min) : today
  const [view, setView] = useState(() => startOfMonth(value ?? minDay))

  const vd = new Date(view)
  const year = vd.getFullYear()
  const month = vd.getMonth()
  const title = lang === 'zh' ? `${year}年${month + 1}月` : `${MONTHS_EN[month]} ${year}`
  const dow = lang === 'zh' ? DOW_ZH : DOW_EN

  const firstDow = new Date(year, month, 1).getDay() // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const canPrev = view > startOfMonth(minDay)
  const selectedDay = value != null ? startOfDay(value) : undefined

  return (
    <div className="px-3 pb-3 pt-1 w-full select-none">
      <div className="flex items-center justify-between px-1 h-10">
        <button
          disabled={!canPrev}
          onClick={() => setView(startOfMonth(new Date(year, month - 1, 1).getTime()))}
          className="w-9 h-9 flex items-center justify-center rounded-full text-ios-blue disabled:opacity-30 active:bg-ios-gray6"
          aria-label="previous month"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-[16px] font-semibold">{title}</div>
        <button
          onClick={() => setView(startOfMonth(new Date(year, month + 1, 1).getTime()))}
          className="w-9 h-9 flex items-center justify-center rounded-full text-ios-blue active:bg-ios-gray6"
          aria-label="next month"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 mt-1">
        {dow.map((w, i) => (
          <div key={i} className="h-8 flex items-center justify-center text-[12px] text-label-tertiary">
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d == null) return <div key={i} />
          const dayTs = new Date(year, month, d).getTime()
          const disabled = dayTs < minDay
          const isToday = dayTs === today
          const isSel = selectedDay != null && dayTs === selectedDay
          return (
            <button
              key={i}
              disabled={disabled}
              onClick={() => onSelect(dayTs)}
              className="h-10 flex items-center justify-center"
            >
              <span
                className={cn(
                  'w-9 h-9 flex items-center justify-center rounded-full text-[16px]',
                  isSel
                    ? 'bg-ios-blue text-white font-semibold'
                    : disabled
                      ? 'text-label-tertiary'
                      : isToday
                        ? 'text-ios-blue font-semibold'
                        : 'text-label-primary active:bg-ios-gray6',
                )}
              >
                {d}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
