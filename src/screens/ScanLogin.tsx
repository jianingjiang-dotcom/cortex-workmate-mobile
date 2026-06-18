import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Image as ImageIcon, X, Zap } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useT } from '../i18n'
import { Spinner } from '../components/ui/atoms'
import { cn } from '../lib/util'

type Phase = 'scanning' | 'detected' | 'authorizing'

const VIOLET = '#CC79FF'
const GREEN = '#22C55E'
const WINDOW = 248

/** Deterministic QR-like graphic — what the "camera" is pointed at. */
function FauxQR({ size = 168 }: { size?: number }) {
  const N = 25
  const cell = size / N
  const inBox = (r: number, c: number, br: number, bc: number) => r >= br && r < br + 7 && c >= bc && c < bc + 7
  const isFinderZone = (r: number, c: number) => inBox(r, c, 0, 0) || inBox(r, c, 0, N - 7) || inBox(r, c, N - 7, 0)
  const finderOn = (r: number, c: number) => {
    const local = (br: number, bc: number) => {
      const lr = r - br
      const lc = c - bc
      const ring = lr === 0 || lr === 6 || lc === 0 || lc === 6
      const center = lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4
      return ring || center
    }
    if (r < 7 && c < 7) return local(0, 0)
    if (r < 7 && c >= N - 7) return local(0, N - 7)
    if (r >= N - 7 && c < 7) return local(N - 7, 0)
    return false
  }
  const rects: React.ReactNode[] = []
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const on = isFinderZone(r, c) ? finderOn(r, c) : (r * 3 + c * 7 + ((r * c) % 5)) % 3 === 0
      if (on)
        rects.push(
          <rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell + 0.4} height={cell + 0.4} rx={cell * 0.18} />,
        )
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="#0B0B0F" aria-hidden>
      {rects}
    </svg>
  )
}

function Bracket({ corner, color }: { corner: 'tl' | 'tr' | 'bl' | 'br'; color: string }) {
  const map: Record<string, string> = {
    tl: 'top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-[16px]',
    tr: 'top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-[16px]',
    bl: 'bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-[16px]',
    br: 'bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-[16px]',
  }
  return <div className={cn('absolute w-8 h-8', map[corner])} style={{ borderColor: color, transition: 'border-color .25s' }} />
}

export function ScanLogin() {
  const t = useT()
  const login = useStore((s) => s.login)
  const setScanLogin = useStore((s) => s.setScanLogin)
  const [phase, setPhase] = useState<Phase>('scanning')
  const [flash, setFlash] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const done = useRef(false)

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  // mock detection: scan → detected → authorizing → login
  const succeed = () => {
    if (done.current) return
    done.current = true
    clearTimers()
    setPhase('detected')
    timers.current.push(setTimeout(() => setPhase('authorizing'), 750))
    timers.current.push(setTimeout(() => login(), 1650))
  }

  useEffect(() => {
    timers.current.push(setTimeout(succeed, 2400)) // auto-detect after framing
    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const close = () => {
    clearTimers()
    setScanLogin(false)
  }

  const success = phase !== 'scanning'
  const accent = success ? GREEN : VIOLET
  const status = phase === 'authorizing' ? t('login.signingIn') : success ? t('login.scan.detected') : t('login.scan.hint')

  return (
    <motion.div
      className="absolute inset-0 z-[70] flex flex-col text-white overflow-hidden"
      style={{ background: 'radial-gradient(120% 90% at 50% 18%, #1C1C24 0%, #0B0B0F 70%)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* flash glow */}
      <AnimatePresence>
        {flash && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(60% 40% at 50% 40%, rgba(255,255,255,0.16), transparent)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      {/* top bar */}
      <div className="relative flex items-center justify-between px-4 pt-[52px] pb-2">
        <button onClick={close} className="w-9 h-9 -ml-1 flex items-center justify-center rounded-full active:bg-white/10" aria-label="close scanner">
          <X size={24} />
        </button>
        <span className="text-[16px] font-semibold">{t('login.scan.title')}</span>
        <button
          onClick={() => setFlash((f) => !f)}
          className={cn('w-9 h-9 -mr-1 flex items-center justify-center rounded-full active:bg-white/10', flash && 'text-[#FFD60A]')}
          aria-label="toggle flash"
        >
          <Zap size={21} fill={flash ? '#FFD60A' : 'none'} />
        </button>
      </div>

      {/* viewfinder */}
      <div className="flex-1 flex flex-col items-center justify-center -mt-6">
        <div className="relative" style={{ width: WINDOW, height: WINDOW }}>
          {/* what the camera sees */}
          <div className="absolute inset-0 rounded-[18px] overflow-hidden bg-surface flex items-center justify-center shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
            <FauxQR size={170} />
          </div>

          {/* scanning laser */}
          {!success && (
            <motion.div
              className="absolute left-2 right-2 h-[2.5px] rounded-full"
              style={{ background: `linear-gradient(90deg, transparent, ${VIOLET}, transparent)`, boxShadow: `0 0 12px 2px ${VIOLET}` }}
              initial={{ top: 14 }}
              animate={{ top: [14, WINDOW - 16, 14] }}
              transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
            />
          )}

          {/* success veil + check */}
          <AnimatePresence>
            {success && (
              <motion.div
                className="absolute inset-0 rounded-[18px] flex items-center justify-center"
                style={{ background: 'rgba(11,11,15,0.45)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 18 }}>
                  <CheckCircle2 size={66} color={GREEN} strokeWidth={2} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <Bracket corner="tl" color={accent} />
          <Bracket corner="tr" color={accent} />
          <Bracket corner="bl" color={accent} />
          <Bracket corner="br" color={accent} />
        </div>

        {/* status */}
        <div className="h-7 mt-9 flex items-center gap-2 text-[16px] font-medium">
          {phase === 'authorizing' && <Spinner size={16} className="text-white/70" />}
          <span>{status}</span>
        </div>
        <p className="text-[14px] text-white/45 mt-2 text-center leading-relaxed max-w-[260px] px-4">{t('login.scan.tip')}</p>
      </div>

      {/* bottom action */}
      <div className="pb-12 flex justify-center">
        <button
          onClick={succeed}
          disabled={success}
          className="flex items-center gap-2 px-5 h-11 rounded-full bg-white/10 active:bg-white/[0.18] text-[16px] font-medium disabled:opacity-40"
        >
          <ImageIcon size={18} />
          {t('login.scan.album')}
        </button>
      </div>
    </motion.div>
  )
}
