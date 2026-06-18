import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ScanLine } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useT } from '../i18n'
import { Spinner } from '../components/ui/atoms'
import { ScanLogin } from './ScanLogin'

function GoogleG({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 800 800" fill="currentColor">
      <path d="M407.786 0C515.413 2.30444e-05 605.328 39.4198 674.421 103.643L561.92 213.487C533.129 186.467 482.638 154.135 407.786 154.135C302.372 154.135 212.903 223.673 180.567 319.786L179.829 322.116C172.295 346.251 167.725 372.022 167.725 398.626C167.725 426.085 172.596 452.662 181.011 477.465L181.009 477.466H181.011C212.904 573.579 302.372 643.114 407.786 643.114C467.136 643.114 512.315 626.727 545.976 603.252L547.216 602.377C599.499 565.185 623.079 510.397 627.472 473.921H407.786V325.988H782.052C787.807 350.791 790.467 374.709 790.467 407.484C790.467 528.843 747.059 631.157 671.765 700.696C605.768 761.817 515.414 797.252 407.786 797.252C251.878 797.252 117.231 707.78 51.6797 577.563V577.562L50.4209 575.025C24.1814 521.63 9.16023 461.845 9.16016 398.626C9.16016 334.403 24.6629 273.721 51.6797 219.685V219.684C117.231 89.4677 251.878 0 407.786 0Z" />
    </svg>
  )
}

export function Login() {
  const login = useStore((s) => s.login)
  const setScanLogin = useStore((s) => s.setScanLogin)
  const scanLoginOpen = useStore((s) => s.scanLoginOpen)
  const t = useT()
  const [loading, setLoading] = useState(false)

  const handleLogin = () => {
    if (loading) return
    setLoading(true)
    setTimeout(() => login(), 1500)
  }

  return (
    <div className="absolute inset-0 bg-surface overflow-hidden">
      <div className="absolute inset-0 flex flex-col pt-[64px] px-7 pb-10">
        {/* hero */}
        <div className="flex-1 flex flex-col items-center justify-center -mt-8">
          <motion.img
            initial={{ scale: 0.92, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            src="/cortex-wordmark.svg"
            alt="Cortex"
            className="h-9 w-auto"
          />
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="text-[16px] font-medium text-label-primary mt-4 text-center"
          >
            {t('login.tagline')}
          </motion.p>
        </div>

        {/* sign-in */}
        <div className="space-y-3">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full h-[54px] rounded-ios-lg bg-brand-primary text-white flex items-center justify-center gap-3 text-[16px] font-semibold press disabled:opacity-70 active:opacity-90"
          >
            {loading ? (
              <>
                <Spinner size={20} className="text-white" />
                <span>{t('login.signingIn')}</span>
              </>
            ) : (
              <>
                <GoogleG />
                {t('login.google')}
              </>
            )}
          </button>

          {/* scan-to-sign-in (secondary) */}
          <button
            onClick={() => setScanLogin(true)}
            disabled={loading}
            className="w-full h-[50px] rounded-ios-lg bg-transparent border border-input flex items-center justify-center gap-2.5 text-[16px] font-semibold text-label-primary press disabled:opacity-60 active:bg-ios-gray6"
          >
            <ScanLine size={20} className="text-label-secondary" />
            {t('login.scan')}
          </button>

          <p className="text-[12px] text-label-secondary text-center leading-relaxed px-4">
            {t('login.terms')
              .split(/(\{terms\}|\{privacy\})/)
              .map((part, i) => {
                if (part === '{terms}')
                  return (
                    <a key={i} href="#" onClick={(e) => e.preventDefault()} className="underline underline-offset-2 decoration-label-tertiary active:opacity-60">
                      {t('login.termsLink')}
                    </a>
                  )
                if (part === '{privacy}')
                  return (
                    <a key={i} href="#" onClick={(e) => e.preventDefault()} className="underline underline-offset-2 decoration-label-tertiary active:opacity-60">
                      {t('login.privacyLink')}
                    </a>
                  )
                return <span key={i}>{part}</span>
              })}
          </p>
        </div>
      </div>

      <AnimatePresence>{scanLoginOpen && <ScanLogin />}</AnimatePresence>
    </div>
  )
}
