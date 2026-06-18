import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '../lib/util'

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 20000)
    return () => clearInterval(id)
  }, [])
  return now
}

export function StatusBar({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const now = useNow()
  const time = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`
  const color = variant === 'light' ? '#fff' : 'rgba(0,0,0,0.9)'
  return (
    <div
      className="absolute top-0 left-0 right-0 z-[60] h-[54px] flex items-end justify-between px-7 pb-2 pointer-events-none select-none"
      style={{ color }}
    >
      <div className="text-[16px] font-semibold tracking-tight tabular-nums">{time}</div>
      {/* Dynamic Island */}
      <div className="absolute left-1/2 top-[11px] -translate-x-1/2 w-[120px] h-[34px] rounded-full bg-black" />
      <div className="flex items-center gap-1.5">
        {/* cellular */}
        <svg width="18" height="11" viewBox="0 0 18 11" fill="none">
          {[0, 1, 2, 3].map((i) => (
            <rect
              key={i}
              x={i * 4.5}
              y={8 - i * 2.4}
              width="3"
              height={3 + i * 2.4}
              rx="0.8"
              fill={color}
            />
          ))}
        </svg>
        {/* wifi */}
        <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
          <path
            d="M8.5 2C11.4 2 14 3.1 15.9 4.9L8.5 12 1.1 4.9C3 3.1 5.6 2 8.5 2Z"
            fill={color}
          />
        </svg>
        {/* battery */}
        <div className="flex items-center gap-0.5">
          <div
            className="w-[24px] h-[12px] rounded-[3px] border flex items-center px-[1px]"
            style={{ borderColor: variant === 'light' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.35)' }}
          >
            <div className="h-[8px] w-[16px] rounded-[1.5px]" style={{ background: color }} />
          </div>
          <div className="w-[1.5px] h-[4px] rounded-full" style={{ background: color, opacity: 0.5 }} />
        </div>
      </div>
    </div>
  )
}

export function HomeIndicator({ light = false }: { light?: boolean }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-[22px] flex items-center justify-center pointer-events-none z-[55]">
      <div
        className="w-[134px] h-[5px] rounded-full"
        style={{ background: light ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}
      />
    </div>
  )
}

/** Desktop stage that holds a single phone, scaled to fit the viewport. */
export function PhoneFrame({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1)
  const W = 390
  const H = 844
  useEffect(() => {
    const fit = () => {
      const marginY = 36
      const marginX = 24
      const s = Math.min(1, (window.innerHeight - marginY) / H, (window.innerWidth - marginX) / W)
      setScale(s)
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden">
      {/* ambient brand glow */}
      <div
        className="absolute w-[520px] h-[520px] rounded-full blur-[120px] opacity-25 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #CC79FF 0%, #407CFF 40%, transparent 70%)' }}
      />
      <div
        className="absolute w-[420px] h-[420px] rounded-full blur-[120px] opacity-20 pointer-events-none translate-x-40 translate-y-40"
        style={{ background: 'radial-gradient(circle, #FFA03B 0%, #CC79FF 50%, transparent 70%)' }}
      />
      <div style={{ transform: `scale(${scale})` }} className="relative">
        {/* bezel */}
        <div
          className="relative bg-black shadow-[0_30px_80px_rgba(0,0,0,0.4)]"
          style={{ width: W + 24, height: H + 24, borderRadius: 66, padding: 12 }}
        >
          <div
            id="phone-screen"
            className={cn('relative overflow-hidden bg-surface')}
            style={{ width: W, height: H, borderRadius: 54 }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
