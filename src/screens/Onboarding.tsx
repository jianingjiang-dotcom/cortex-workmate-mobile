import { useRef, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Clock, MessageCircle, Mic, ShieldCheck, Sparkles } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useT } from '../i18n'
import { Button } from '../components/ui/atoms'
import { cn, gradientFor, solidFor } from '../lib/util'

const float = (delay = 0) => ({
  animate: { y: [0, -10, 0] },
  transition: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay },
})

function HeroOne() {
  return (
    <div className="relative w-[220px] h-[220px] flex items-center justify-center">
      <div
        className="absolute w-[160px] h-[160px] rounded-[44px] blur-2xl opacity-40"
        style={{ background: gradientFor('brand') }}
      />
      <motion.img
        {...float(0)}
        src="/cortex-logo.svg"
        className="relative w-[132px] h-[132px] rounded-[32px] shadow-ios-lg"
      />
      <motion.div {...float(0.6)} className="absolute -top-1 right-4 w-10 h-10 rounded-2xl glass shadow-ios flex items-center justify-center">
        <Sparkles size={20} className="text-brand-violet" />
      </motion.div>
      <motion.div {...float(1.2)} className="absolute bottom-2 -left-1 w-9 h-9 rounded-xl glass shadow-ios flex items-center justify-center">
        <MessageCircle size={18} className="text-brand-blue" />
      </motion.div>
    </div>
  )
}

function HeroTwo() {
  const t = useT()
  return (
    <div className="relative w-[260px] h-[260px] flex items-center justify-center">
      {/* soft brand glow */}
      <div
        className="absolute w-[150px] h-[150px] rounded-full blur-[44px] opacity-30"
        style={{ background: gradientFor('brand') }}
      />

      {/* AI reply — tucked BEHIND the tile (lower layer, smaller, softer) */}
      <motion.div
        {...float(1)}
        className="absolute bottom-1 -left-2 z-0 bg-surface rounded-2xl rounded-bl-md shadow-ios px-3 py-2 text-[12.5px] text-label-secondary scale-90 origin-bottom-left"
      >
        {t('onb.bubble.ai')}
      </motion.div>

      {/* central gradient tile — mid layer */}
      <motion.div
        {...float(0)}
        className="relative z-10 w-[112px] h-[112px] rounded-[30px] flex items-center justify-center shadow-ios-lg"
        style={{ background: gradientFor('brand') }}
      >
        <div className="w-[80px] h-[80px] rounded-full bg-white overflow-hidden flex items-center justify-center">
          <img src="/workmate-avatar-white.png" alt="Workmate" className="w-full h-full object-cover scale-[1.32]" />
        </div>
      </motion.div>

      {/* user message — IN FRONT, overlapping the tile (top layer, strong shadow) */}
      <motion.div
        {...float(0.5)}
        className="absolute top-1 -right-1 z-20 bg-surface rounded-2xl rounded-br-md shadow-ios-lg px-3.5 py-2.5 text-[13px] font-medium"
      >
        {t('onb.bubble.user')}
      </motion.div>
    </div>
  )
}

function HeroThree() {
  const t = useT()
  const feats = [
    { icon: <Clock size={20} />, g: 'ocean', title: t('onb.feat.tasks'), desc: t('onb.feat.tasks.desc') },
    { icon: <Mic size={20} />, g: 'mint', title: t('onb.feat.meetings'), desc: t('onb.feat.meetings.desc') },
    { icon: <ShieldCheck size={20} />, g: 'sunset', title: t('onb.feat.approval'), desc: t('onb.feat.approval.desc') },
  ]
  return (
    <div className="w-full max-w-[340px] flex flex-col gap-3">
      {feats.map((f, i) => {
        const right = i % 2 === 0 // right · left · right — staggered, not rigid
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: right ? 24 : -24 }}
            animate={{ opacity: 1, x: 0, y: [0, -6, 0] }}
            transition={{
              opacity: { delay: 0.1 + i * 0.1 },
              x: { delay: 0.1 + i * 0.1 },
              y: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 + i * 0.5 },
            }}
            className={cn('card flex items-center gap-3.5 px-4 py-3.5 w-[94%]', right ? 'self-end' : 'self-start')}
          >
            <div
              className="w-11 h-11 rounded-[13px] flex items-center justify-center shrink-0"
              style={{ background: `color-mix(in srgb, ${solidFor(f.g)} 12%, transparent)`, color: solidFor(f.g) }}
            >
              {f.icon}
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-semibold truncate">{f.title}</div>
              <div className="text-[13px] text-label-secondary truncate">{f.desc}</div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

export function Onboarding() {
  const complete = useStore((s) => s.completeOnboarding)
  const t = useT()
  const [index, setIndex] = useState(0)
  const scroller = useRef<HTMLDivElement>(null)

  const pages: { hero: ReactNode; title: string; body: string }[] = [
    { hero: <HeroOne />, title: t('onb.1.title'), body: t('onb.1.body') },
    { hero: <HeroTwo />, title: t('onb.2.title'), body: t('onb.2.body') },
    { hero: <HeroThree />, title: t('onb.3.title'), body: t('onb.3.body') },
  ]

  const onScroll = () => {
    const el = scroller.current
    if (!el) return
    setIndex(Math.round(el.scrollLeft / el.clientWidth))
  }
  const next = () => {
    const el = scroller.current
    if (!el) return
    if (index >= pages.length - 1) return complete()
    el.scrollTo({ left: (index + 1) * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className="absolute inset-0 bg-surface overflow-hidden">
      <div
        className="absolute -top-20 right-0 w-64 h-64 rounded-full blur-[100px] opacity-25 pointer-events-none"
        style={{ background: 'radial-gradient(circle,#CC79FF,#407CFF 60%,transparent)' }}
      />

      {/* skip */}
      <div className="absolute top-[60px] right-5 z-10 h-9 flex items-center">
        {index < pages.length - 1 && (
          <button onClick={complete} className="text-[14px] text-label-secondary font-semibold active:opacity-50 px-2">
            {t('common.skip')}
          </button>
        )}
      </div>

      <div className="absolute inset-0 flex flex-col pt-[100px] pb-10">
        <div
          ref={scroller}
          onScroll={onScroll}
          className="flex-1 flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
        >
          {pages.map((p, i) => (
            <div key={i} className="snap-center shrink-0 w-full h-full flex flex-col items-center justify-center px-9">
              <div className="flex-1 flex items-center justify-center">{p.hero}</div>
              <div className="text-center pb-6 min-h-[150px]">
                <h2 className="text-[26px] font-bold tracking-tight">{p.title}</h2>
                <p className="text-[15px] text-label-secondary mt-3 leading-relaxed max-w-[300px]">{p.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-8">
          <Button full size="lg" onClick={next}>
            {index >= pages.length - 1 ? t('onb.start') : t('common.next')}
          </Button>
        </div>

        {/* dots — below the CTA */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {pages.map((_, i) => (
            <div
              key={i}
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: i === index ? 22 : 8,
                background: i === index ? solidFor('brand') : 'rgba(60,60,67,0.18)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
