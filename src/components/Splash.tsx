import { useEffect, useState } from 'react'

/**
 * App launch splash — Cortex logo mark centered on the brand gradient, fading out to
 * reveal the app. Deliberately framer-motion-free: an AnimatePresence exit animation
 * here races with React's own unmount (StrictMode double-invoke) and throws
 * "removeChild: node is not a child". Pure CSS opacity + a timed unmount is robust.
 */
export function Splash() {
  // 'in' (visible) → 'out' (fading) → 'gone' (unmounted)
  const [phase, setPhase] = useState<'in' | 'out' | 'gone'>('in')

  useEffect(() => {
    const toOut = setTimeout(() => setPhase('out'), 1500)
    const toGone = setTimeout(() => setPhase('gone'), 1500 + 460) // after the 450ms fade
    return () => {
      clearTimeout(toOut)
      clearTimeout(toGone)
    }
  }, [])

  if (phase === 'gone') return null

  return (
    <div
      className="absolute inset-0 z-[80] flex items-center justify-center"
      style={{
        background: 'linear-gradient(150deg, var(--blue) 0%, var(--purple) 52%, var(--orange) 100%)',
        opacity: phase === 'out' ? 0 : 1,
        transition: 'opacity 0.45s ease-in-out',
        pointerEvents: phase === 'out' ? 'none' : 'auto',
      }}
    >
      <img
        src="/cortex-mark-white.svg"
        alt="Cortex"
        className="w-[116px] h-[116px] splash-mark"
      />
      <style>{`
        @keyframes splashMarkIn {
          0%   { opacity: 0; transform: translateY(6px) scale(0.7); }
          60%  { opacity: 1; transform: translateY(0) scale(1.04); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .splash-mark { animation: splashMarkIn 0.9s cubic-bezier(0.22, 1, 0.36, 1) both; }
      `}</style>
    </div>
  )
}
