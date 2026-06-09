import { useRef, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Clock, MessageCircle, Mic, ShieldCheck, Sparkles } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useT } from '../i18n'
import { Button } from '../components/ui/atoms'
import { gradientFor } from '../lib/util'

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
        src="/cortex-logo.png"
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
  return (
    <div className="relative w-[230px] h-[220px] flex items-center justify-center">
      <motion.div
        {...float(0)}
        className="relative w-[104px] h-[104px] rounded-[28px] flex items-center justify-center shadow-ios-lg"
        style={{ background: gradientFor('brand') }}
      >
        <Sparkles size={44} className="text-white" />
      </motion.div>
      <motion.div {...float(0.5)} className="absolute top-3 -right-1 bg-surface rounded-2xl rounded-br-md shadow-ios-md px-3.5 py-2.5 text-[13px] font-medium">
        帮我整理今天的要点 ✦
      </motion.div>
      <motion.div {...float(1)} className="absolute bottom-2 -left-2 bg-surface rounded-2xl rounded-bl-md shadow-ios-md px-3.5 py-2.5 text-[13px] text-label-secondary">
        已为你汇总 3 件事…
      </motion.div>
    </div>
  )
}

function HeroThree() {
  const t = useT()
  const feats = [
    { icon: <Clock size={20} />, g: 'ocean', title: t('onb.feat.tasks'), desc: t('onb.feat.tasks.desc') },
    { icon: <Mic size={20} />, g: 'violet', title: t('onb.feat.meetings'), desc: t('onb.feat.meetings.desc') },
    { icon: <ShieldCheck size={20} />, g: 'sunset', title: t('onb.feat.approval'), desc: t('onb.feat.approval.desc') },
  ]
  return (
    <div className="w-full max-w-[300px] space-y-3">
      {feats.map((f, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 + i * 0.1 }}
          className="card flex items-center gap-3.5 px-4 py-3.5"
        >
          <div className="w-11 h-11 rounded-[13px] flex items-center justify-center text-white shrink-0" style={{ background: gradientFor(f.g) }}>
            {f.icon}
          </div>
          <div>
            <div className="text-[15px] font-semibold">{f.title}</div>
            <div className="text-[13px] text-label-secondary">{f.desc}</div>
          </div>
        </motion.div>
      ))}
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
        style={{ background: 'radial-gradient(circle,#8A6AF0,#5B7CFA 60%,transparent)' }}
      />

      {/* skip */}
      <div className="absolute top-[60px] right-5 z-10 h-9 flex items-center">
        {index < pages.length - 1 && (
          <button onClick={complete} className="text-[16px] text-label-secondary font-medium active:opacity-50 px-2">
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

        {/* dots */}
        <div className="flex items-center justify-center gap-2 mb-7">
          {pages.map((_, i) => (
            <div
              key={i}
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: i === index ? 22 : 8,
                background: i === index ? gradientFor('brand') : 'rgba(60,60,67,0.18)',
              }}
            />
          ))}
        </div>

        <div className="px-8">
          <Button full size="lg" onClick={next}>
            {index >= pages.length - 1 ? t('onb.start') : t('common.next')}
          </Button>
        </div>
      </div>
    </div>
  )
}
